const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Alumni, Post, Referral, Resource, Roadmap, Achievement, AdminPost, User, StudentPost, Like, Comment, Connection, FriendRequest, Notification, CollegeAlumniRecord, OTP, Message, GroupChat, GroupMessage, Story } = require('./models');
const emailService = require('./emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'campus-connect-super-secret';
const ADMIN_EMAILS = ['admin@mit.edu', 'admin@stanford.edu', 'admin@sru.edu.in'];

// Domain validation helper for students
const isApprovedCollegeDomain = (email) => {
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase();
  
  // Reject common personal mail domains.
  const rejectedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com', 'aol.com', 'mail.com'];
  if (rejectedDomains.includes(domain)) return false;
  
  // Ensure the domain ends with .edu, .edu.in, or .ac.in
  return domain.endsWith('.edu') || domain.endsWith('.edu.in') || domain.endsWith('.ac.in');
};

// requireAuth Middleware
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------

// 1. Send OTP (Student & Admin)
router.post('/auth/send-otp', async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    
    const lowerEmail = email.toLowerCase().trim();
    
    // Domain validation based on role
    if (role === 'student') {
      if (!isApprovedCollegeDomain(lowerEmail)) {
        return res.status(400).json({ success: false, error: 'Please use your official college email address.' });
      }
    } else if (role === 'admin') {
      if (!ADMIN_EMAILS.includes(lowerEmail)) {
        return res.status(400).json({ success: false, error: 'Not authorized as admin' });
      }
    }
    
    // Rate limiting (60 seconds)
    const existingOtp = await OTP.findOne({ email: lowerEmail });
    if (existingOtp && (Date.now() - new Date(existingOtp.updatedAt).getTime() < 60000)) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - new Date(existingOtp.updatedAt).getTime())) / 1000);
      return res.status(429).json({ success: false, error: `Please wait ${waitSeconds} seconds before requesting a new OTP.` });
    }
    
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration
    console.log(`🔑 [OTP Flow] OTP Generated: ${code} for ${lowerEmail}`);
    
    await OTP.findOneAndUpdate(
      { email: lowerEmail },
      { code, otp: code, expiresAt, role: role || 'student', attempts: 0, verified: false },
      { upsert: true, new: true }
    );
    console.log('💾 [OTP Flow] OTP Saved successfully to MongoDB');
    
    console.log(`✉️ [OTP Flow] Brevo Request Sent to ${lowerEmail}`);
    
    // Dispatch via Email Service
    const dispatchResult = await emailService.sendOTP(lowerEmail, code, 5);
    if (dispatchResult && dispatchResult.success) {
      if (dispatchResult.mock) {
        console.log(`✉️ [OTP Flow] Email Delivered (Mock dispatch) to ${lowerEmail}`);
      } else {
        console.log(`✅ [OTP Flow] Email Delivered successfully via Brevo. Message ID: ${dispatchResult.messageId}`);
      }
      res.json({ success: true, message: 'OTP sent successfully' });
    } else {
      const errorMsg = dispatchResult?.error || 'Unknown email service error';
      console.error(`❌ [OTP Flow] Email Failed to send to ${lowerEmail}:`, errorMsg);
      res.status(500).json({ success: false, error: `Failed to deliver email: ${errorMsg}` });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Pre-verify Alumni & Send OTP
router.post('/auth/verify-alumni', async (req, res) => {
  try {
    const { personalEmail, rollNumber, batch } = req.body;
    if (!personalEmail || !rollNumber || !batch) {
      return res.status(400).json({ success: false, error: 'Personal Email, Roll Number, and Batch are required' });
    }
    
    const lowerEmail = personalEmail.toLowerCase().trim();
    const cleanRollNumber = rollNumber.trim();
    const cleanBatch = batch.trim();
    
    // Rate limiting (60 seconds)
    const existingOtp = await OTP.findOne({ email: lowerEmail });
    if (existingOtp && (Date.now() - new Date(existingOtp.updatedAt).getTime() < 60000)) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - new Date(existingOtp.updatedAt).getTime())) / 1000);
      return res.status(429).json({ success: false, error: `Please wait ${waitSeconds} seconds before requesting a new OTP.` });
    }
    
    // Query Official College Alumni Record Database
    const record = await CollegeAlumniRecord.findOne({
      personalEmail: lowerEmail,
      rollNumber: cleanRollNumber,
      batch: cleanBatch
    });
    
    if (!record) {
      return res.status(400).json({ success: false, error: 'Unable to verify your alumni record. Please contact administration.' });
    }
    
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    console.log(`🔑 [OTP Flow] OTP Generated: ${code} for Alumni ${lowerEmail}`);
    
    await OTP.findOneAndUpdate(
      { email: lowerEmail },
      { 
        code, 
        otp: code,
        expiresAt, 
        role: 'alumni',
        attempts: 0,
        verified: false,
        metadata: {
          rollNumber: cleanRollNumber,
          batch: cleanBatch,
          name: record.name,
          department: record.department
        }
      },
      { upsert: true, new: true }
    );
    console.log('💾 [OTP Flow] OTP Saved successfully to MongoDB');
    
    console.log(`✉️ [OTP Flow] Brevo Request Sent to ${lowerEmail}`);
    
    // Dispatch via Email Service
    const dispatchResult = await emailService.sendOTP(lowerEmail, code, 5);
    if (dispatchResult && dispatchResult.success) {
      if (dispatchResult.mock) {
        console.log(`✉️ [OTP Flow] Email Delivered (Mock dispatch) to ${lowerEmail}`);
      } else {
        console.log(`✅ [OTP Flow] Email Delivered successfully via Brevo. Message ID: ${dispatchResult.messageId}`);
      }
      res.json({ success: true, message: 'Alumni verified. OTP sent.' });
    } else {
      const errorMsg = dispatchResult?.error || 'Unknown email service error';
      console.error(`❌ [OTP Flow] Email Failed to send to ${lowerEmail}:`, errorMsg);
      res.status(500).json({ success: false, error: `Failed to deliver email: ${errorMsg}` });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Verify OTP & Issue Session Token
router.post('/auth/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and OTP code are required' });
    }
    
    const lowerEmail = email.toLowerCase().trim();
    
    const otpRecord = await OTP.findOne({ email: lowerEmail });
    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'No OTP requested for this email or it has expired.' });
    }
    
    // Lockout check
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, error: 'Maximum verification attempts exceeded. Please request a new OTP.' });
    }
    
    // Expiration check
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, error: 'OTP code has expired. Please request a new one.' });
    }
    
    // Code validation
    if (otpRecord.code !== code.trim() && otpRecord.otp !== code.trim()) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      if (otpRecord.attempts >= 5) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, error: 'Maximum verification attempts exceeded. This OTP is now invalid. Please request a new one.' });
      }
      
      const remaining = 5 - otpRecord.attempts;
      return res.status(400).json({ success: false, error: `Invalid OTP code. ${remaining} attempts remaining.` });
    }
    
    await OTP.deleteOne({ _id: otpRecord._id });
    
    let userPayload = {
      email: lowerEmail,
      role: otpRecord.role
    };
    
    let isNewUser = false;
    let profileComplete = false;
    let userId = '';
    
    if (otpRecord.role === 'student') {
      let student = await User.findOne({ email: lowerEmail });
      
      if (!student) {
        isNewUser = true;
        userId = `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        student = new User({
          userId,
          email: lowerEmail,
          collegeEmail: lowerEmail,
          role: 'student',
          college: 'SR University'
        });
        await student.save();
      } else {
        userId = student.userId;
        profileComplete = !!student.name;
      }
      userPayload.userId = userId;
      
    } else if (otpRecord.role === 'alumni') {
      const { rollNumber, batch, name, department } = otpRecord.metadata || {};
      let alumni = await Alumni.findOne({ email: lowerEmail });
      
      if (!alumni) {
        userId = `alumni-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        alumni = new Alumni({
          userId,
          email: lowerEmail,
          name: name || 'Alumni User',
          batch: batch || '2024',
          department: department || 'Computer Science',
          approvalStatus: 'approved',
          role: 'alumni',
          rollNumber,
          fullName: name || 'Alumni User',
          batchYear: batch || '2024'
        });
        await alumni.save();
        isNewUser = true;
        profileComplete = true;
      } else {
        userId = alumni.userId;
        profileComplete = true;
      }
      userPayload.userId = userId;
      
    } else if (otpRecord.role === 'admin') {
      userId = 'admin-user-id';
      userPayload.userId = userId;
      profileComplete = true;
    }
    
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      success: true,
      token,
      userId,
      email: lowerEmail,
      role: otpRecord.role,
      profileComplete,
      isNewUser
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function computeBackendProfileCompletion(user) {
  let completed = 0;
  const total = 14;

  // 1. Profile image
  const hasPhoto = (user.photos && user.photos.length > 0 && user.photos[0]) || user.profileImageUrl || user.profileImage;
  if (hasPhoto) completed++;

  // 2. Name
  if (user.name && user.name.trim() !== '') completed++;

  // 3. Bio
  if (user.bio && user.bio.trim() !== '') completed++;

  // 4. Department
  const dept = user.department || user.course;
  if (dept && dept.trim() !== '') completed++;

  // 5. Batch
  const batch = user.batch || user.year;
  if (batch && batch.trim() !== '') completed++;

  // 6. Skills
  if (user.skills && user.skills.length > 0) completed++;

  // 7. Interests
  if (user.interests && user.interests.length > 0) completed++;

  // 8. Personal Email
  const pEmail = user.personalEmail || user.email;
  if (pEmail && pEmail.trim() !== '') completed++;

  // 9. LinkedIn Profile
  if (user.linkedinUrl && user.linkedinUrl.trim() !== '') completed++;

  // 10. GitHub Profile
  const ghUrl = user.githubUrl || user.portfolioUrl;
  if (ghUrl && ghUrl.trim() !== '') completed++;

  // 11. Achievements
  if (user.achievements && user.achievements.length > 0) completed++;

  // 12. Projects
  const hasProjects = (user.projects && user.projects.length > 0) || (user.experience && user.experience.length > 0);
  if (hasProjects) completed++;

  // 13. Career Goals
  const cGoals = user.careerGoals || user.story || user.careerJourney;
  if (cGoals && cGoals.trim() !== '') completed++;

  // 14. Additional Sections (clubs or similar)
  if (user.clubs && user.clubs.length > 0) completed++;

  return Math.round((completed / total) * 100);
}

// 4. Session Validation
router.get('/auth/session', requireAuth, async (req, res) => {
  try {
    const { userId, role, email } = req.user;
    let userDetails = null;
    let profileComplete = false;
    
    if (role === 'student') {
      const student = await User.findOne({ userId });
      if (student) {
        const studentObj = student.toObject();
        const completion = computeBackendProfileCompletion(studentObj);
        studentObj.profileCompletion = completion;
        userDetails = studentObj;
        profileComplete = completion === 100;
      }
    } else if (role === 'alumni') {
      const alumni = await Alumni.findOne({ userId });
      if (alumni) {
        const alumniObj = alumni.toObject();
        const completion = computeBackendProfileCompletion(alumniObj);
        alumniObj.profileCompletion = completion;
        userDetails = alumniObj;
        profileComplete = completion === 100;
      }
    } else if (role === 'admin') {
      userDetails = {
        userId,
        email,
        role: 'admin',
        name: 'Campus Admin',
        profileCompletion: 100
      };
      profileComplete = true;
    }
    
    if (!userDetails) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      user: userDetails,
      role,
      profileComplete
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/debug/brevo-status - Diagnostic check endpoint
router.get('/debug/brevo-status', async (req, res) => {
  try {
    const keyCheck = await emailService.verifyAPIKey();
    const senderCheck = await emailService.verifySender();
    
    res.json({
      success: true,
      brevoConnected: keyCheck.valid,
      apiKeyValid: keyCheck.valid,
      senderVerified: senderCheck.verified,
      details: {
        configuredSender: process.env.BREVO_SENDER_EMAIL || 'info@campusconnect.com',
        configuredSenderName: process.env.BREVO_SENDER_NAME || 'Campus Connect',
        hasApiKey: !!process.env.BREVO_API_KEY,
        apiKeyError: keyCheck.error || null,
        senderError: senderCheck.error || null
      },
      lastEmailStatus: emailService.getLastEmailStatus()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// GET /api/alumni - Get list of verified alumni with search/filter (or get by userId)
router.get('/alumni', async (req, res) => {
  try {
    const { search, company, role, department, batch, skills, location, userId } = req.query;
    
    // If userId query parameter is passed, find specifically that user's profile
    if (userId) {
      const profile = await Alumni.findOne({ userId });
      return res.json({ success: true, data: profile ? [profile] : [] });
    }

    let query = { approvalStatus: 'approved' };

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { company: regex },
        { role: regex },
        { skills: regex }
      ];
    }

    if (company) query.company = new RegExp(company, 'i');
    if (role) query.role = new RegExp(role, 'i');
    if (department) query.department = new RegExp(department, 'i');
    if (batch) query.batch = batch;
    if (location) query.location = new RegExp(location, 'i');
    if (skills) {
      const skillsList = skills.split(',').map(s => s.trim());
      query.skills = { $all: skillsList.map(s => new RegExp(s, 'i')) };
    }

    const list = await Alumni.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/profile - Get profile by userId
router.get('/alumni/profile', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const profile = await Alumni.findOne({ userId });
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/profile - Create a new alumni profile
router.post('/alumni/profile', async (req, res) => {
  try {
    const { name, batch, department, company, role, story, profileImageUrl, userId, email } = req.body;
    
    // Support random fallback values if frontend doesn't provide them
    const actualUserId = userId || `mock-user-${Date.now()}`;
    const actualEmail = email || `alumni-${Date.now()}@college.edu`;

    // Check if profile already exists
    let existing = await Alumni.findOne({ userId: actualUserId });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Alumni profile already exists for this user' });
    }

    const newProfile = new Alumni({
      userId: actualUserId,
      email: actualEmail,
      name,
      batch,
      department,
      company: company || '',
      role: role || '',
      story: story || '',
      profileImageUrl: profileImageUrl || '',
      approvalStatus: 'approved',
      // Explicitly populate requested DB fields
      fullName: name,
      batchYear: batch,
      designation: role || '',
      careerJourney: story || '',
      profileImage: profileImageUrl || '',
      role: 'alumni'
    });

    await newProfile.save();
    res.json({ success: true, data: newProfile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni - Create a new alumni profile (alias)
router.post('/alumni', async (req, res) => {
  try {
    const { name, batch, department, company, role, story, profileImageUrl, userId, email } = req.body;
    
    const actualUserId = userId || `mock-user-${Date.now()}`;
    const actualEmail = email || `alumni-${Date.now()}@college.edu`;

    let existing = await Alumni.findOne({ userId: actualUserId });
    if (existing) {
      existing.name = name;
      existing.batch = batch;
      existing.department = department;
      existing.company = company || '';
      existing.role = role || '';
      existing.story = story || '';
      existing.profileImageUrl = profileImageUrl || '';
      // Map requested properties
      existing.fullName = name;
      existing.batchYear = batch;
      existing.designation = role || '';
      existing.careerJourney = story || '';
      existing.profileImage = profileImageUrl || '';
      await existing.save();
      return res.json({ success: true, data: existing });
    }

    const newProfile = new Alumni({
      userId: actualUserId,
      email: actualEmail,
      name,
      batch,
      department,
      company: company || '',
      role: role || '',
      story: story || '',
      profileImageUrl: profileImageUrl || '',
      approvalStatus: 'approved',
      // Explicitly populate requested DB fields
      fullName: name,
      batchYear: batch,
      designation: role || '',
      careerJourney: story || '',
      profileImage: profileImageUrl || '',
      role: 'alumni'
    });

    await newProfile.save();
    res.json({ success: true, data: newProfile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/alumni/profile - Update alumni profile by userId
router.put('/alumni/profile', async (req, res) => {
  try {
    const { userId, name, batch, department, company, role, story, profileImageUrl } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const updated = await Alumni.findOneAndUpdate(
      { userId },
      { 
        name, 
        batch, 
        department, 
        company: company || '', 
        role: role || '', 
        story: story || '', 
        profileImageUrl: profileImageUrl || '',
        fullName: name,
        batchYear: batch,
        designation: role || '',
        careerJourney: story || '',
        profileImage: profileImageUrl || ''
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Alumni profile not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/alumni/:id - Update alumni profile by mongo ID
router.put('/alumni/:id', async (req, res) => {
  try {
    const { name, batch, department, company, role, story, profileImageUrl } = req.body;
    const updated = await Alumni.findByIdAndUpdate(
      req.params.id,
      {
        name, 
        batch, 
        department, 
        company: company || '', 
        role: role || '', 
        story: story || '', 
        profileImageUrl: profileImageUrl || '',
        fullName: name,
        batchYear: batch,
        designation: role || '',
        careerJourney: story || '',
        profileImage: profileImageUrl || ''
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Alumni profile not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/posts - Get all posts with optional type/company/search filters
router.get('/alumni/posts', async (req, res) => {
  try {
    const { type, company, search } = req.query;
    let query = { approvalStatus: 'approved' };
    
    if (type && type !== 'all') {
      query.type = type;
    }
    if (company) {
      query.company = new RegExp(company, 'i');
    }
    if (search) {
      query.content = new RegExp(search, 'i');
    }

    const list = await Post.find(query).sort({ createdAt: -1 });
    
    const postsWithAuthors = await Promise.all(list.map(async (post) => {
      const author = await Alumni.findById(post.alumniId);
      const postObj = post.toObject();
      if (author) {
        postObj.author = {
          ...author.toObject(),
          id: author._id
        };
      }
      return postObj;
    }));

    res.json({ success: true, data: postsWithAuthors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/:id - Get single alumni profile details
router.get('/alumni/:id', async (req, res) => {
  try {
    const profile = await Alumni.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Alumni profile not found' });
    }
    profile.viewCount += 1;
    await profile.save();
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/:id/posts - Get posts shared by this alumni
router.get('/alumni/:id/posts', async (req, res) => {
  try {
    const posts = await Post.find({ alumniId: req.params.id }).sort({ createdAt: -1 });
    const author = await Alumni.findById(req.params.id);
    const postsWithAuthors = posts.map(post => {
      const postObj = post.toObject();
      if (author) {
        postObj.author = {
          ...author.toObject(),
          id: author._id
        };
      }
      return postObj;
    });
    res.json({ success: true, data: postsWithAuthors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/:id/referrals - Get referrals shared by this alumni
router.get('/alumni/:id/referrals', async (req, res) => {
  try {
    const list = await Referral.find({ alumniId: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/:id/resources - Get resources shared by this alumni
router.get('/alumni/:id/resources', async (req, res) => {
  try {
    const list = await Resource.find({ alumniId: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/:id/roadmaps - Get roadmaps shared by this alumni
router.get('/alumni/:id/roadmaps', async (req, res) => {
  try {
    const list = await Roadmap.find({ alumniId: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/posts - Create an alumni post
router.post('/alumni/posts', async (req, res) => {
  try {
    const newPost = new Post(req.body);
    await newPost.save();
    res.json({ success: true, data: newPost });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/referrals - Create a referral listing
router.post('/alumni/referrals', async (req, res) => {
  try {
    const ref = new Referral(req.body);
    await ref.save();
    
    // Automatically create a post of type 'referral'
    const newPost = new Post({
      alumniId: req.body.alumniId,
      type: 'referral',
      content: `New Referral Opportunity: ${req.body.role} at ${req.body.company}. Eligibility: ${req.body.eligibility || 'Open'}. Deadline: ${req.body.deadline || 'N/A'}`,
      company: req.body.company,
      jobRole: req.body.role,
      applyLink: req.body.applicationLink || '',
      refId: ref._id.toString()
    });
    await newPost.save();

    res.json({ success: true, data: ref });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/resources - Share a resource
router.post('/alumni/resources', async (req, res) => {
  try {
    const resrc = new Resource(req.body);
    await resrc.save();

    // Automatically create a post of type 'resource'
    const newPost = new Post({
      alumniId: req.body.alumniId,
      type: 'resource',
      content: `New Resource Shared: ${req.body.title}. Category: ${req.body.categoryType || 'General'}. Description: ${req.body.description || ''}. Link: ${req.body.link || ''}`,
      applyLink: req.body.link || '',
      refId: resrc._id.toString()
    });
    await newPost.save();

    res.json({ success: true, data: resrc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/roadmaps - Upload a roadmap
router.post('/alumni/roadmaps', async (req, res) => {
  try {
    const rdm = new Roadmap(req.body);
    await rdm.save();

    // Automatically create a post of type 'roadmap'
    const newPost = new Post({
      alumniId: req.body.alumniId,
      type: 'roadmap',
      content: `New Roadmap Shared: ${req.body.title}. Description: ${req.body.description || ''}`,
      refId: rdm._id.toString()
    });
    await newPost.save();

    res.json({ success: true, data: rdm });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/connect - Send connection request
router.post('/alumni/connect', async (req, res) => {
  try {
    const { fromUserId, toAlumniId } = req.body;
    const alumni = await Alumni.findById(toAlumniId);
    if (!alumni) return res.status(404).json({ success: false, error: 'Alumni not found' });
    
    if (!alumni.connections.includes(fromUserId)) {
      alumni.connections.push(fromUserId);
      alumni.helpedCount += 1;
      await alumni.save();
    }
    res.json({ success: true, data: alumni });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/follow - Follow/unfollow an alumni
router.post('/alumni/follow', async (req, res) => {
  try {
    const { userId, alumniId } = req.body;
    const alumni = await Alumni.findById(alumniId);
    if (!alumni) return res.status(404).json({ success: false, error: 'Alumni not found' });
    
    const idx = alumni.followers.indexOf(userId);
    if (idx > -1) {
      alumni.followers.splice(idx, 1);
    } else {
      alumni.followers.push(userId);
    }
    await alumni.save();
    res.json({ success: true, data: alumni });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/save - Bookmark a post/roadmap/resource
router.post('/alumni/save', async (req, res) => {
  try {
    const { alumniId, targetId, type } = req.body; // type: post, roadmap, resource
    const alumni = await Alumni.findById(alumniId);
    if (!alumni) return res.status(404).json({ success: false, error: 'Alumni not found' });

    if (type === 'post') {
      const idx = alumni.savedPosts.indexOf(targetId);
      if (idx > -1) alumni.savedPosts.splice(idx, 1);
      else alumni.savedPosts.push(targetId);
    } else if (type === 'roadmap') {
      const idx = alumni.savedRoadmaps.indexOf(targetId);
      if (idx > -1) alumni.savedRoadmaps.splice(idx, 1);
      else alumni.savedRoadmaps.push(targetId);
    } else if (type === 'resource') {
      const idx = alumni.savedResources.indexOf(targetId);
      if (idx > -1) alumni.savedResources.splice(idx, 1);
      else alumni.savedResources.push(targetId);
    }
    await alumni.save();
    res.json({ success: true, data: alumni });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/message - Send messaging request
router.post('/alumni/message', async (req, res) => {
  try {
    res.json({ success: true, message: 'Message request submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/alumni/posts/:id
router.put('/alumni/posts/:id', async (req, res) => {
  try {
    const updated = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Post not found' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/alumni/posts/:id
router.delete('/alumni/posts/:id', async (req, res) => {
  try {
    const deleted = await Post.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Post not found' });
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/alumni/referrals/:id
router.put('/alumni/referrals/:id', async (req, res) => {
  try {
    const updated = await Referral.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Referral not found' });
    
    // Update matching post
    await Post.findOneAndUpdate(
      { refId: req.params.id },
      {
        content: `New Referral Opportunity: ${req.body.role} at ${req.body.company}. Eligibility: ${req.body.eligibility || 'Open'}. Deadline: ${req.body.deadline || 'N/A'}`,
        company: req.body.company,
        jobRole: req.body.role,
        applyLink: req.body.applicationLink
      }
    );
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/alumni/referrals/:id
router.delete('/alumni/referrals/:id', async (req, res) => {
  try {
    const deleted = await Referral.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Referral not found' });
    
    // Delete matching post
    await Post.findOneAndDelete({ refId: req.params.id });
    res.json({ success: true, message: 'Referral deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/alumni/resources/:id
router.put('/alumni/resources/:id', async (req, res) => {
  try {
    const updated = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Resource not found' });
    
    // Update matching post
    await Post.findOneAndUpdate(
      { refId: req.params.id },
      {
        content: `New Resource Shared: ${req.body.title}. Category: ${req.body.categoryType || 'General'}. Description: ${req.body.description || ''}. Link: ${req.body.link || ''}`,
        applyLink: req.body.link
      }
    );
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/alumni/resources/:id
router.delete('/alumni/resources/:id', async (req, res) => {
  try {
    const deleted = await Resource.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Resource not found' });
    
    // Delete matching post
    await Post.findOneAndDelete({ refId: req.params.id });
    res.json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/alumni/roadmaps/:id
router.put('/alumni/roadmaps/:id', async (req, res) => {
  try {
    const updated = await Roadmap.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Roadmap not found' });
    
    // Update matching post
    await Post.findOneAndUpdate(
      { refId: req.params.id },
      {
        content: `New Roadmap Shared: ${req.body.title}. Description: ${req.body.description || ''}`
      }
    );
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/alumni/roadmaps/:id
router.delete('/alumni/roadmaps/:id', async (req, res) => {
  try {
    const deleted = await Roadmap.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Roadmap not found' });
    
    // Delete matching post
    await Post.findOneAndDelete({ refId: req.params.id });
    res.json({ success: true, message: 'Roadmap deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/:id/achievements
router.get('/alumni/:id/achievements', async (req, res) => {
  try {
    const achievements = await Achievement.find({ alumniId: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: achievements });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/achievements
router.post('/alumni/achievements', async (req, res) => {
  try {
    const newAchievement = new Achievement(req.body);
    await newAchievement.save();
    
    // Automatically create a post of type 'achievement'
    const newPost = new Post({
      alumniId: req.body.alumniId,
      type: 'achievement',
      content: `New Achievement Posted: ${req.body.title} (${req.body.type || 'Milestone'}). ${req.body.description || ''}`,
      refId: newAchievement._id.toString()
    });
    await newPost.save();
    
    res.json({ success: true, data: newAchievement });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/alumni/achievements/:id
router.put('/alumni/achievements/:id', async (req, res) => {
  try {
    const updated = await Achievement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Achievement not found' });
    
    // Update matching post
    await Post.findOneAndUpdate(
      { refId: req.params.id },
      {
        content: `New Achievement Posted: ${req.body.title} (${req.body.type || 'Milestone'}). ${req.body.description || ''}`
      }
    );
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Post Routes
// POST /api/admin/posts - Create an admin post
router.post('/admin/posts', async (req, res) => {
  try {
    const newPost = new AdminPost(req.body);
    await newPost.save();
    res.status(201).json({ success: true, data: newPost });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/posts - Get all admin posts
router.get('/admin/posts', async (req, res) => {
  try {
    const { college } = req.query;
    let query = {};
    if (college) {
      query.college = new RegExp(college, 'i');
    }
    const posts = await AdminPost.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/posts/:id - Delete an admin post
router.delete('/admin/posts/:id', async (req, res) => {
  try {
    const deleted = await AdminPost.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Announcement not found' });
    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Student Home Routes
// GET /api/student/home-feed - Get student home feed (admin posts only)
router.get('/student/home-feed', async (req, res) => {
  try {
    const { college, category } = req.query;
    let query = {};
    if (college) {
      query.college = new RegExp(college, 'i');
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    const feed = await AdminPost.find(query).sort({ isPinned: -1, createdAt: -1 });
    res.json({ success: true, data: feed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Alumni Feed Routes
// GET /api/alumni/feed - Get alumni feed (alumni posts/career updates only)
router.get('/alumni/feed', async (req, res) => {
  try {
    const { type, company, search } = req.query;
    let query = {}; // No approvalStatus requirement check to make sure posts show up immediately or fallback
    
    if (type && type !== 'all') {
      query.type = type;
    }
    if (company) {
      query.company = new RegExp(company, 'i');
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { content: regex },
        { company: regex },
        { jobRole: regex }
      ];
    }

    const list = await Post.find(query).sort({ createdAt: -1 });
    
    const postsWithAuthors = await Promise.all(list.map(async (post) => {
      const author = await Alumni.findOne({ userId: post.alumniId });
      const postObj = post.toObject();
      if (author) {
        postObj.author = {
          ...author.toObject(),
          id: author._id
        };
      } else {
        // Find by mongo ID if userId lookup fails
        try {
          const authorByMongoId = await Alumni.findById(post.alumniId);
          if (authorByMongoId) {
            postObj.author = {
              ...authorByMongoId.toObject(),
              id: authorByMongoId._id
            };
          }
        } catch (e) {
          // ignore
        }
      }
      return postObj;
    }));

    res.json({ success: true, data: postsWithAuthors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Student Social & Professional Feed Routes
// GET /api/feed - Get student social feed (student posts only)
router.get('/feed', async (req, res) => {
  try {
    const { category, userId, authorId } = req.query;
    let query = {};
    if (category && category !== 'all') {
      query.category = category;
    }
    if (authorId) {
      query.userId = authorId;
    }

    const posts = await StudentPost.find(query).sort({ createdAt: -1 });
    const authorIds = posts.map(p => p.userId);
    const authors = await User.find({ userId: { $in: authorIds } });
    const authorsMap = authors.reduce((acc, u) => {
      acc[u.userId] = u;
      return acc;
    }, {});

    const feedWithDetails = await Promise.all(posts.map(async (p) => {
      const postObj = p.toObject();
      const author = authorsMap[p.userId];

      if (author && !p.isAnonymous) {
        postObj.authorName = author.name || p.authorName || 'Student';
        postObj.authorAvatar = author.profileImageUrl || (author.photos && author.photos[0]) || p.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.userId}`;
      } else if (!author && !p.isAnonymous) {
        postObj.authorName = p.authorName || 'Student';
        postObj.authorAvatar = p.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`;
      } else if (p.isAnonymous) {
        postObj.authorName = 'Anonymous Student';
        postObj.authorAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=anon-${p._id}`;
      }

      // Likes count & check if requesting user has liked
      const likesCount = await Like.countDocuments({ postId: p._id.toString() });
      let isLiked = false;
      if (userId) {
        isLiked = await Like.exists({ postId: p._id.toString(), userId });
      }

      // Comments list
      const commentsList = await Comment.find({ postId: p._id.toString() }).sort({ createdAt: 1 });

      postObj.id = p._id.toString();
      postObj.likes = likesCount;
      postObj.isLiked = !!isLiked;
      postObj.comments = commentsList.map(c => ({
        id: c._id.toString(),
        authorId: c.userId,
        authorName: c.userName || 'Anonymous',
        authorAvatar: c.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`,
        content: c.content,
        createdAt: c.createdAt
      }));
      postObj.reactions = { '❤️': isLiked ? [userId] : [], '🔥': [], '😂': [], '👀': [], '👍': [] };

      return postObj;
    }));

    res.json({ success: true, data: feedWithDetails });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/posts - Create student post
router.post('/posts', async (req, res) => {
  try {
    const { content, isAnonymous, category, image, userId } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ success: false, error: 'userId and content are required' });
    }

    const author = await User.findOne({ userId });
    const newPost = new StudentPost({
      userId,
      authorName: author ? author.name : 'Unknown',
      authorAvatar: author ? (author.profileImageUrl || (author.photos && author.photos[0]) || '') : '',
      isAnonymous: !!isAnonymous,
      content,
      image: image || '',
      category: category || 'general'
    });

    await newPost.save();
    res.status(201).json({ success: true, data: newPost });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/posts/:postId/like - Toggle post like
router.post('/posts/:postId/like', async (req, res) => {
  try {
    const { userId } = req.body;
    const { postId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const existingLike = await Like.findOne({ postId, userId });
    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id });
      res.json({ success: true, liked: false });
    } else {
      const newLike = new Like({ postId, userId });
      await newLike.save();

      // Trigger notification to the post owner if it's someone else
      const postObj = await StudentPost.findById(postId);
      if (postObj && postObj.userId !== userId) {
        const liker = await User.findOne({ userId });
        const notif = new Notification({
          userId: postObj.userId,
          type: 'like',
          title: 'New Post Like! 👍',
          body: `${liker ? liker.name : 'Someone'} liked your post.`,
          relatedId: postId
        });
        await notif.save();
      }

      res.json({ success: true, liked: true });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/posts/:postId/comment - Comment on student post
router.post('/posts/:postId/comment', async (req, res) => {
  try {
    const { userId, content } = req.body;
    const { postId } = req.params;

    if (!userId || !content) {
      return res.status(400).json({ success: false, error: 'userId and content are required' });
    }

    const commenter = await User.findOne({ userId });
    const newComment = new Comment({
      postId,
      userId,
      userName: commenter ? commenter.name : 'Anonymous Student',
      userAvatar: commenter ? (commenter.profileImageUrl || (commenter.photos && commenter.photos[0]) || '') : '',
      content
    });

    await newComment.save();

    // Trigger notification to the post owner if it's someone else
    const postObj = await StudentPost.findById(postId);
    if (postObj && postObj.userId !== userId) {
      const notif = new Notification({
        userId: postObj.userId,
        type: 'comment',
        title: 'New Comment on Post! 💬',
        body: `${commenter ? commenter.name : 'Someone'} commented: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
        relatedId: postId
      });
      await notif.save();
    }

    res.json({ success: true, data: newComment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/connections/request - Send request (or pass)
router.post('/connections/request', async (req, res) => {
  try {
    const { fromUserId, toUserId, action } = req.body;
    if (!fromUserId || !toUserId || !action) {
      return res.status(400).json({ success: false, error: 'fromUserId, toUserId, and action are required' });
    }

    if (action === 'pass') {
      const request = await FriendRequest.findOneAndUpdate(
        { fromUserId, toUserId },
        { status: 'passed' },
        { upsert: true, new: true }
      );
      return res.json({ success: true, status: 'passed' });
    }

    // Check if there is already a reciprocal request (leads to match/connection)
    const reciprocal = await FriendRequest.findOne({ fromUserId: toUserId, toUserId: fromUserId, status: 'pending' });
    if (reciprocal) {
      reciprocal.status = 'accepted';
      await reciprocal.save();

      await FriendRequest.findOneAndUpdate(
        { fromUserId, toUserId },
        { status: 'accepted' },
        { upsert: true }
      );

      // Create dual links or single connection doc
      const conn = new Connection({ user1: fromUserId, user2: toUserId });
      await conn.save();

      // Trigger notifications for both users
      const senderObj = await User.findOne({ userId: fromUserId });
      const targetObj = await User.findOne({ userId: toUserId });

      const notifForTarget = new Notification({
        userId: toUserId,
        type: 'accept',
        title: 'New Connection Match! 🎉',
        body: `You and ${senderObj ? senderObj.name : 'a student'} are now connected!`,
        relatedId: fromUserId
      });
      await notifForTarget.save();

      const notifForSender = new Notification({
        userId: fromUserId,
        type: 'accept',
        title: 'New Connection Match! 🎉',
        body: `You and ${targetObj ? targetObj.name : 'a student'} are now connected!`,
        relatedId: toUserId
      });
      await notifForSender.save();

      return res.json({ success: true, matched: true, status: 'accepted' });
    }

    // Otherwise create pending connection request
    await FriendRequest.findOneAndUpdate(
      { fromUserId, toUserId },
      { status: 'pending' },
      { upsert: true }
    );

    const senderObj = await User.findOne({ userId: fromUserId });
    const notif = new Notification({
      userId: toUserId,
      type: 'request',
      title: 'New Connection Request',
      body: `${senderObj ? senderObj.name : 'A student'} wants to connect with you.`,
      relatedId: fromUserId
    });
    await notif.save();

    return res.json({ success: true, matched: false, status: 'pending' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/connections/accept - Accept request manually
router.post('/connections/accept', async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ success: false, error: 'requestId is required' });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    request.status = 'accepted';
    await request.save();

    const conn = new Connection({ user1: request.fromUserId, user2: request.toUserId });
    await conn.save();

    const recipientObj = await User.findOne({ userId: request.toUserId });
    const notif = new Notification({
      userId: request.fromUserId,
      type: 'accept',
      title: 'Connection Accepted! 🎉',
      body: `${recipientObj ? recipientObj.name : 'A student'} accepted your connection request.`,
      relatedId: request.toUserId
    });
    await notif.save();

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/discover - Get pool of students to discover sorted by weighted recommendation score
router.get('/discover', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    // Get all requests initiated by me, and accepted incoming requests to exclude
    const requests = await FriendRequest.find({ fromUserId: userId });
    const incomingAccepted = await FriendRequest.find({ toUserId: userId, status: 'accepted' });

    const excludedUserIds = new Set([userId]);
    requests.forEach(r => excludedUserIds.add(r.toUserId));
    incomingAccepted.forEach(r => excludedUserIds.add(r.fromUserId));

    const students = await User.find({
      userId: { $nin: Array.from(excludedUserIds) },
      role: 'student'
    });

    const currentUser = await User.findOne({ userId });
    if (currentUser) {
      const myDept = currentUser.department || '';
      const myBatch = currentUser.batch || '';
      const myInterests = currentUser.interests || [];
      const mySkills = currentUser.skills || [];
      const myClubs = currentUser.clubs || [];

      students.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        // Department Match (+10 points)
        if (a.department && a.department === myDept) scoreA += 10;
        if (b.department && b.department === myDept) scoreB += 10;

        // Batch Match (+5 points)
        if (a.batch && a.batch === myBatch) scoreA += 5;
        if (b.batch && b.batch === myBatch) scoreB += 5;

        // Shared Interests (+3 points per shared interest)
        const sharedInterestsA = (a.interests || []).filter(i => myInterests.includes(i)).length;
        const sharedInterestsB = (b.interests || []).filter(i => myInterests.includes(i)).length;
        scoreA += sharedInterestsA * 3;
        scoreB += sharedInterestsB * 3;

        // Shared Skills (+3 points per shared skill)
        const sharedSkillsA = (a.skills || []).filter(s => mySkills.includes(s)).length;
        const sharedSkillsB = (b.skills || []).filter(s => mySkills.includes(s)).length;
        scoreA += sharedSkillsA * 3;
        scoreB += sharedSkillsB * 3;

        // Shared Clubs (+5 points per shared club)
        const sharedClubsA = (a.clubs || []).filter(c => myClubs.includes(c)).length;
        const sharedClubsB = (b.clubs || []).filter(c => myClubs.includes(c)).length;
        scoreA += sharedClubsA * 5;
        scoreB += sharedClubsB * 5;

        return scoreB - scoreA; // Sort descending (highest affinity first)
      });
    }

    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/notifications - Get student's notifications
router.get('/notifications', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const list = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /notifications/:id/read - Mark notification as read
router.post('/notifications/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!notif) return res.status(404).json({ success: false, error: 'Notification not found' });
    res.json({ success: true, data: notif });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/student/profile - Get student profile
router.get('/student/profile', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const profile = await User.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    const profileObj = profile.toObject();
    profileObj.profileCompletion = computeBackendProfileCompletion(profileObj);
    res.json({ success: true, data: profileObj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/student/profile - Create or update student profile
router.post('/student/profile', async (req, res) => {
  try {
    const { 
      userId, 
      email, 
      name, 
      department, 
      batch, 
      skills, 
      bio, 
      interests, 
      clubs, 
      achievements, 
      profileImageUrl, 
      college, 
      photos, 
      personalEmail,
      linkedinUrl,
      githubUrl,
      projects,
      careerGoals
    } = req.body;
    if (!userId || !email) {
      return res.status(400).json({ success: false, error: 'userId and email are required' });
    }

    const profile = await User.findOneAndUpdate(
      { userId },
      {
        email,
        name: name || '',
        role: 'student',
        department: department || '',
        batch: batch || '',
        skills: skills || [],
        bio: bio || '',
        interests: interests || [],
        clubs: clubs || [],
        achievements: achievements || [],
        profileImageUrl: profileImageUrl || '',
        college: college || '',
        photos: photos || [],
        personalEmail: personalEmail || '',
        linkedinUrl: linkedinUrl || '',
        githubUrl: githubUrl || '',
        projects: projects || [],
        careerGoals: careerGoals || ''
      },
      { upsert: true, new: true }
    );

    const profileObj = profile.toObject();
    profileObj.profileCompletion = computeBackendProfileCompletion(profileObj);
    res.json({ success: true, data: profileObj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /connections - Fetch active connection matches
router.get('/connections', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const connections = await Connection.find({
      $or: [{ user1: userId }, { user2: userId }]
    });

    const matches = [];
    for (const conn of connections) {
      const otherUserId = conn.user1 === userId ? conn.user2 : conn.user1;
      let otherUser = await User.findOne({ userId: otherUserId });
      if (!otherUser) {
        otherUser = await Alumni.findOne({ userId: otherUserId });
      }
      if (otherUser) {
        matches.push({
          id: conn._id.toString(),
          userId: otherUserId,
          user: {
            id: otherUser.userId,
            name: otherUser.name || 'Anonymous Student',
            email: otherUser.email,
            role: otherUser.role || 'student',
            department: otherUser.department || '',
            batch: otherUser.batch || '',
            skills: otherUser.skills || [],
            bio: otherUser.bio || otherUser.story || '',
            interests: otherUser.interests || [],
            clubs: otherUser.clubs || [],
            achievements: otherUser.achievements || [],
            profileImageUrl: otherUser.profileImageUrl || otherUser.profileImage || '',
            photos: otherUser.photos || (otherUser.profileImageUrl ? [otherUser.profileImageUrl] : []),
            college: otherUser.college || ''
          },
          matchedAt: conn.createdAt.toISOString(),
          unreadCount: 0,
          isRevealed: conn.isRevealed
        });
      }
    }
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /connections/:matchId/reveal - Reveal identity for a connection
router.post('/connections/:matchId/reveal', async (req, res) => {
  try {
    const { matchId } = req.params;
    const conn = await Connection.findByIdAndUpdate(matchId, { isRevealed: true }, { new: true });
    if (!conn) return res.status(404).json({ success: false, error: 'Connection match not found' });
    res.json({ success: true, data: conn });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /chats/:matchId/messages - Fetch direct messages for a connection match
router.get('/chats/:matchId/messages', async (req, res) => {
  try {
    const { matchId } = req.params;
    const list = await Message.find({ matchId }).sort({ timestamp: 1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /chats/:matchId/messages - Send direct message
router.post('/chats/:matchId/messages', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { senderId, text } = req.body;
    const newMsg = new Message({
      matchId,
      senderId,
      text,
      timestamp: new Date(),
      read: false,
      status: 'sent',
      reactions: []
    });
    await newMsg.save();
    res.json({ success: true, data: newMsg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /chats/:matchId/messages/:messageId/react - React to direct message
router.post('/chats/:matchId/messages/:messageId/react', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji, userId } = req.body;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });

    const idx = msg.reactions.findIndex(r => r.userId === userId && r.emoji === emoji);
    if (idx > -1) {
      msg.reactions.splice(idx, 1);
    } else {
      msg.reactions.push({ emoji, userId, timestamp: new Date() });
    }
    await msg.save();
    res.json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /chats/:matchId/messages/:messageId/read - Mark direct message as read
router.post('/chats/:matchId/messages/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const msg = await Message.findByIdAndUpdate(messageId, { read: true, status: 'seen' }, { new: true });
    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });
    res.json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /groups - Fetch group chats the user is in
router.get('/groups', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const list = await GroupChat.find({ members: userId }).sort({ updatedAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /groups - Create a group chat (Circle)
router.post('/groups', async (req, res) => {
  try {
    const { name, memberIds, createdBy } = req.body;
    const g = new GroupChat({
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=group-${Date.now()}`,
      members: Array.from(new Set([createdBy, ...memberIds])),
      createdBy,
      lastMessage: 'Circle created! 👋',
      lastMessageAt: new Date()
    });
    await g.save();
    res.json({ success: true, data: g });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /groups/:groupId/messages - Fetch group messages
router.get('/groups/:groupId/messages', async (req, res) => {
  try {
    const { groupId } = req.params;
    const list = await GroupMessage.find({ groupId }).sort({ timestamp: 1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /groups/:groupId/messages - Send group message
router.post('/groups/:groupId/messages', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { senderId, text } = req.body;
    
    let senderName = 'Someone';
    const user = await User.findOne({ userId: senderId });
    if (user) senderName = user.name;
    else {
      const alumni = await Alumni.findOne({ userId: senderId });
      if (alumni) senderName = alumni.name;
    }

    const gMsg = new GroupMessage({
      groupId,
      senderId,
      senderName,
      text,
      timestamp: new Date()
    });
    await gMsg.save();

    await GroupChat.findByIdAndUpdate(groupId, {
      lastMessage: text,
      lastMessageAt: new Date()
    });

    res.json({ success: true, data: gMsg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /stories - Fetch active stories
router.get('/stories', async (req, res) => {
  try {
    const list = await Story.find({ expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /stories - Create a story
router.post('/stories', async (req, res) => {
  try {
    const { userId, image, caption, type, textContent, bgColor } = req.body;
    let userName = 'Someone';
    let userAvatar = '';
    const userObj = await User.findOne({ userId });
    if (userObj) {
      userName = userObj.name;
      userAvatar = userObj.profileImageUrl || '';
    } else {
      const alumniObj = await Alumni.findOne({ userId });
      if (alumniObj) {
        userName = alumniObj.name;
        userAvatar = alumniObj.profileImageUrl || '';
      }
    }

    const s = new Story({
      userId,
      userName,
      userAvatar,
      image,
      caption,
      type: type || 'image',
      textContent,
      bgColor,
      viewers: [],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    await s.save();
    res.json({ success: true, data: s });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /stories/:storyId/view - View story
router.post('/stories/:storyId/view', async (req, res) => {
  try {
    const { storyId } = req.params;
    const { userId } = req.body;
    const s = await Story.findById(storyId);
    if (!s) return res.status(404).json({ success: false, error: 'Story not found' });

    if (!s.viewers.includes(userId)) {
      s.viewers.push(userId);
      await s.save();
    }
    res.json({ success: true, data: s });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /student/profile/view - Record profile view
router.post('/student/profile/view', async (req, res) => {
  try {
    const { viewerId, viewedUserId } = req.body;
    if (!viewerId || !viewedUserId) {
      return res.status(400).json({ success: false, error: 'viewerId and viewedUserId are required' });
    }

    let user = await User.findOne({ userId: viewedUserId });
    if (user) {
      if (!user.profileViewers) user.profileViewers = [];
      if (!user.profileViewers.includes(viewerId)) {
        user.profileViewers.push(viewerId);
      }
      user.viewCount = (user.viewCount || 0) + 1;
      await user.save();
    } else {
      let alumni = await Alumni.findOne({ userId: viewedUserId });
      if (alumni) {
        if (!alumni.profileViewers) alumni.profileViewers = [];
        if (!alumni.profileViewers.includes(viewerId)) {
          alumni.profileViewers.push(viewerId);
        }
        alumni.viewCount = (alumni.viewCount || 0) + 1;
        await alumni.save();
      }
    }

    const viewerObj = await User.findOne({ userId: viewerId }) || await Alumni.findOne({ userId: viewerId });
    if (viewerObj) {
      const notif = new Notification({
        userId: viewedUserId,
        type: 'view',
        title: 'Someone viewed your profile 👀',
        body: `${viewerObj.name} viewed your profile.`,
        relatedId: viewerId
      });
      await notif.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /student/profile/viewers - Fetch profile viewers
router.get('/student/profile/viewers', async (req, res) => {
  try {
    const { userId, limit } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    let profile = await User.findOne({ userId });
    if (!profile) {
      profile = await Alumni.findOne({ userId });
    }

    if (!profile) {
      return res.json({ success: true, data: { viewers: [] } });
    }

    const viewerIds = profile.profileViewers || [];
    const viewers = [];
    const maxLimit = parseInt(limit) || 10;
    
    for (const vId of viewerIds.slice(0, maxLimit)) {
      let vUser = await User.findOne({ userId: vId });
      if (!vUser) {
        vUser = await Alumni.findOne({ userId: vId });
      }
      if (vUser) {
        viewers.push({
          _id: vUser._id || vUser.userId,
          viewerId: {
            _id: vUser.userId,
            name: vUser.name,
            profilePic: vUser.profileImageUrl || vUser.profileImage || '',
            email: vUser.email,
            college: vUser.college
          },
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }
    }
    res.json({ success: true, data: { viewers } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /student/profile/viewers/clear - Clear profile viewers list
router.post('/student/profile/viewers/clear', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    let user = await User.findOne({ userId });
    if (user) {
      user.profileViewers = [];
      await user.save();
    } else {
      let alumni = await Alumni.findOne({ userId });
      if (alumni) {
        alumni.profileViewers = [];
        await alumni.save();
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /alumni/achievements/:id - Delete achievement
router.delete('/alumni/achievements/:id', async (req, res) => {
  try {
    const deleted = await Achievement.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Achievement not found' });
    await Post.findOneAndDelete({ refId: req.params.id });
    res.json({ success: true, message: 'Achievement deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /analytics/metrics - Fetch analytics statistics dynamically
router.get('/analytics/metrics', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    let profile = await User.findOne({ userId });
    if (!profile) {
      profile = await Alumni.findOne({ userId });
    }

    const totalViews = profile ? (profile.viewCount || 0) : 0;
    const connectionsCount = await Connection.countDocuments({
      $or: [{ user1: userId }, { user2: userId }]
    });

    let referralsCount = 0;
    if (profile && profile.role === 'alumni') {
      referralsCount = await Referral.countDocuments({ alumniId: userId });
    } else {
      referralsCount = await Referral.countDocuments({
        'applicants.userId': userId
      });
    }

    const savedResourcesCount = profile && profile.savedResources ? profile.savedResources.length : 0;

    res.json({
      success: true,
      data: {
        totalViews,
        connections: connectionsCount,
        referrals: referralsCount,
        savedResources: savedResourcesCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
