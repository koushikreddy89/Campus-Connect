const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { Alumni, Post, Referral, Resource, Roadmap, Achievement, AdminPost, Placement, User, StudentPost, Like, Comment, Connection, FriendRequest, Notification, CollegeAlumniRecord, OTP, Message, GroupChat, GroupMessage, Story, SupportTicket, FAQ, FeatureRequest, Report, CollegeDomain, Session, LoginAttempt, SecurityLog, AlumniVerification } = require('./models');
const emailService = require('./emailService');
const crypto = require('crypto');
const { validatePasswordStrength, isDisposableEmail, generateCaptcha, verifyCaptcha } = require('./securityUtils');

// Cookie options definitions
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (refresh token)
};

const ACCESS_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 15 * 60 * 1000 // 15 minutes (access token)
};

// Rate limiting configurations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, error: 'Too many authentication attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: { success: false, error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(apiLimiter);

// MongoDB query injection sanitizer helper
const sanitizeMongoOperators = (obj) => {
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (key.startsWith('$')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitizeMongoOperators(obj[key]);
      }
    }
  }
  return obj;
};

const mongoSanitizeMiddleware = (req, res, next) => {
  req.body = sanitizeMongoOperators(req.body);
  req.query = sanitizeMongoOperators(req.query);
  req.params = sanitizeMongoOperators(req.params);
  next();
};

router.use(mongoSanitizeMiddleware);

const JWT_SECRET = process.env.JWT_SECRET || 'campus-connect-super-secret';
const ADMIN_EMAILS = ['admin@mit.edu', 'admin@stanford.edu', 'admin@sru.edu.in'];

// URL validation regex helper
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;

// Domain validation helper for students (DB-backed and auto-detecting)
const isApprovedCollegeDomain = async (email) => {
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase().trim();
  
  // In development, allow gmail.com to facilitate easy local testing
  if (process.env.NODE_ENV !== 'production' && domain === 'gmail.com') {
    return true;
  }

  // Reject common personal mail domains.
  const rejectedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com', 'aol.com', 'mail.com'];
  if (rejectedDomains.includes(domain)) return false;
  
  // Check the DB CollegeDomain registry
  const exists = await CollegeDomain.findOne({ domain });
  if (exists) {
    return exists.status !== 'disabled';
  }
  
  // Auto-register and approve if it's a valid college TLD suffix
  if (domain.endsWith('.edu') || domain.endsWith('.edu.in') || domain.endsWith('.ac.in')) {
    const namePart = domain.split('.')[0];
    const friendlyName = namePart.charAt(0).toUpperCase() + namePart.slice(1) + ' College';
    await CollegeDomain.create({ name: friendlyName, domain }).catch(() => {});
    return true;
  }
  
  return false;
};

// Brute force lockout helper functions
const checkLockout = async (email, ipAddress) => {
  const query = { $or: [] };
  if (email) query.$or.push({ email: email.toLowerCase().trim() });
  if (ipAddress) query.$or.push({ ipAddress });
  
  if (query.$or.length === 0) return { locked: false };
  
  const attempts = await LoginAttempt.find(query);
  for (const attempt of attempts) {
    if (attempt.lockUntil && attempt.lockUntil > new Date()) {
      const waitMinutes = Math.ceil((attempt.lockUntil.getTime() - Date.now()) / 60000);
      return { locked: true, waitMinutes, lockUntil: attempt.lockUntil };
    }
  }
  return { locked: false };
};

const recordFailedAttempt = async (email, ipAddress) => {
  const lowerEmail = email.toLowerCase().trim();
  let attempt = await LoginAttempt.findOne({ email: lowerEmail, ipAddress });
  if (!attempt) {
    attempt = new LoginAttempt({ email: lowerEmail, ipAddress, attempts: 0 });
  }
  attempt.attempts += 1;
  attempt.lastAttemptAt = new Date();
  
  if (attempt.attempts >= 5) {
    attempt.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
  }
  await attempt.save();
  return attempt;
};

const resetAttempts = async (email, ipAddress) => {
  const lowerEmail = email.toLowerCase().trim();
  await LoginAttempt.deleteMany({
    $or: [
      { email: lowerEmail },
      { ipAddress }
    ]
  });
};

// Email-Name uniqueness constraint helper (Product Requirement)
const normalizeName = (name) => {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const checkEmailNameConflict = async (email, name, userId) => {
  if (!email || !name) return null;
  const lowerEmail = email.toLowerCase().trim();
  const normInputName = normalizeName(name);

  // Search User (Student) collection
  const queryStudent = {
    $or: [
      { email: lowerEmail },
      { collegeEmail: lowerEmail },
      { personalEmail: lowerEmail }
    ]
  };
  if (userId) {
    queryStudent.userId = { $ne: userId };
  }
  const existingStudent = await User.findOne(queryStudent);

  if (existingStudent && existingStudent.name) {
    if (normalizeName(existingStudent.name) !== normInputName) {
      return existingStudent.name;
    }
  }

  // Search Alumni collection
  const queryAlumni = { email: lowerEmail };
  if (userId) {
    queryAlumni.userId = { $ne: userId };
  }
  const existingAlumni = await Alumni.findOne(queryAlumni);

  if (existingAlumni && existingAlumni.name) {
    if (normalizeName(existingAlumni.name) !== normInputName) {
      return existingAlumni.name;
    }
  }

  return null;
};

// requireAuth Middleware with Cookie & Idle Timeout & College Derivation support
const requireAuth = async (req, res, next) => {
  try {
    let token = null;
    
    // Support Auth header first, fallback to cookies
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // DB-backed session check
    let college = '';
    if (decoded.sessionId) {
      const session = await Session.findOne({ sessionId: decoded.sessionId });
      if (!session || new Date() > session.expiresAt) {
        return res.status(401).json({ success: false, error: 'Session expired or revoked. Please log in again.', isSessionInvalid: true });
      }
      
      // Inactivity limit check (30 minutes)
      const idleLimit = 30 * 60 * 1000;
      if (Date.now() - new Date(session.lastActiveAt).getTime() > idleLimit) {
        await Session.deleteOne({ sessionId: session.sessionId });
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        return res.status(401).json({ success: false, error: 'Session expired due to inactivity. Please log in again.', isSessionInvalid: true });
      }

      session.lastActiveAt = new Date();
      const currentIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      if (currentIp && session.ipAddress !== currentIp) {
        session.ipAddress = currentIp;
      }
      await session.save();
    } else if (decoded.role !== 'admin') {
      // Require session ID for non-admin accounts to ensure active session tracking
      return res.status(401).json({ success: false, error: 'Session tracking is required. Please log in again.', isSessionInvalid: true });
    }

    // Check if user or alumni is suspended and derive college
    if (decoded.role === 'student' || decoded.role === 'alumni') {
      const Model = decoded.role === 'alumni' ? Alumni : User;
      const account = await Model.findOne({ userId: decoded.userId });
      if (account) {
        if (account.isSuspended) {
          return res.status(403).json({ success: false, error: 'Your account has been suspended. Please contact support.', isSuspended: true });
        }
        college = account.college;
      }
    } else if (decoded.role === 'admin') {
      college = 'SR University'; // Admin college fallback
    }

    req.user = { ...decoded, college };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

// RBAC authorization helper middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied: Insufficient privileges.' });
    }
    next();
  };
};

// Helper to check if a block exists between two users
async function isBlockedBetween(userIdA, userIdB) {
  if (!userIdA || !userIdB) return false;
  // Check if A blocked B
  let userA = await User.findOne({ userId: userIdA }) || await Alumni.findOne({ userId: userIdA });
  if (userA && userA.blockedUsers && userA.blockedUsers.includes(userIdB)) {
    return true;
  }
  // Check if B blocked A
  let userB = await User.findOne({ userId: userIdB }) || await Alumni.findOne({ userId: userIdB });
  if (userB && userB.blockedUsers && userB.blockedUsers.includes(userIdA)) {
    return true;
  }
  return false;
}

// Helper to check if a profile is visible to a requester
async function isProfileVisible(requesterId, targetId, targetProfile) {
  if (requesterId && targetId && await isBlockedBetween(requesterId, targetId)) {
    return false;
  }
  if (requesterId === targetId) return true;
  
  const visibility = targetProfile.profileVisibility || 'Public';
  if (visibility === 'Public') return true;
  if (!requesterId) return false;
  
  if (visibility === 'College Only') {
    const exists = await User.findOne({ userId: requesterId }) || await Alumni.findOne({ userId: requesterId });
    return !!exists;
  }
  
  if (visibility === 'Connections Only') {
    const conn = await Connection.findOne({
      $or: [
        { user1: requesterId, user2: targetId },
        { user1: targetId, user2: requesterId }
      ]
    });
    return !!conn;
  }
  
  if (visibility === 'Private') {
    return false;
  }
  
  return true;
}

// Helper to check if a sender can message a recipient based on messaging permissions
async function canMessage(senderId, senderRole, recipientId) {
  if (senderId === recipientId) return true;
  const recipient = await User.findOne({ userId: recipientId }) || await Alumni.findOne({ userId: recipientId });
  if (!recipient) return true;

  const permissions = recipient.messagingPermissions || 'Everyone';
  if (permissions === 'Everyone') return true;
  if (permissions === 'Nobody') return false;
  
  if (permissions === 'Alumni Only') {
    return senderRole === 'alumni';
  }
  
  if (permissions === 'Connections Only') {
    const conn = await Connection.findOne({
      $or: [
        { user1: senderId, user2: recipientId },
        { user1: recipientId, user2: senderId }
      ]
    });
    return !!conn;
  }
  
  return true;
}

// Helper to check access and return author details + currentUserId
async function checkAlumniContentAccess(req, res, targetUserIdOrMongoId) {
  const author = await Alumni.findOne({ userId: targetUserIdOrMongoId }) || (mongoose.Types.ObjectId.isValid(targetUserIdOrMongoId) ? await Alumni.findById(targetUserIdOrMongoId) : null);
  if (!author) {
    res.status(404).json({ success: false, error: 'Alumni profile not found' });
    return null;
  }

  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
    return null;
  }

  // College isolation check
  if (req.user.role !== 'super_admin' && author.college !== req.user.college) {
    res.status(403).json({ success: false, error: 'Access denied: Profile belongs to a different college.' });
    return null;
  }

  if (!(await isProfileVisible(req.user.userId, author.userId, author))) {
    res.status(403).json({ success: false, error: 'Access denied: Profile is private or restricted.' });
    return null;
  }
  return { author, currentUserId: req.user.userId };
}

// ----------------------------------------------------
// AUTHENTICATION & SECURITY UTILITIES
// ----------------------------------------------------

// CAPTCHA Generation Endpoint
router.get('/auth/captcha', (req, res) => {
  try {
    const captcha = generateCaptcha();
    res.json({
      success: true,
      captchaId: captcha.captchaId,
      equation: captcha.equation,
      expiresAt: captcha.expiresAt,
      signature: captcha.signature
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate CAPTCHA.' });
  }
});

// Helper to create DB session and issue secure tokens/cookies
const createSessionAndTokens = async (req, res, userId, role, email) => {
  const sessionId = `session-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
  const ua = req.headers['user-agent'] || '';
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) deviceType = 'mobile';
  else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';
  
  const currentIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const session = new Session({
    sessionId,
    userId,
    role,
    userAgent: ua,
    ipAddress: currentIp,
    deviceType,
    expiresAt: sessionExpires
  });
  await session.save();

  // Log successful authentication
  await SecurityLog.create({
    userId,
    email,
    event: 'login',
    status: 'success',
    ipAddress: currentIp,
    userAgent: ua,
    details: { sessionId }
  });

  // Access and Refresh token generation
  const userPayload = { userId, email, role, sessionId };
  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '15m' }); // 15 mins access
  const refreshToken = jwt.sign({ sessionId, userId }, JWT_SECRET, { expiresIn: '7d' }); // 7 days refresh

  // Set secure cookies
  res.cookie('access_token', token, ACCESS_COOKIE_OPTIONS);
  res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);

  return { token, refreshToken, sessionId };
};

// 1. REGISTER Endpoint (Password-based signup)
router.post('/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name, role, department, batch, rollNumber } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Email, password, and role are required.' });
    }
    
    const lowerEmail = email.toLowerCase().trim();
    const currentIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    
    // Lockout check
    const lockout = await checkLockout(lowerEmail, currentIp);
    if (lockout.locked) {
      return res.status(423).json({ success: false, error: 'Too many attempts. Account temporarily locked.' });
    }

    // Disposable email prevention
    if (isDisposableEmail(lowerEmail)) {
      return res.status(400).json({ success: false, error: 'Temporary or disposable email addresses are not permitted.' });
    }

    // Domain validation based on role
    if (role === 'student') {
      if (!(await isApprovedCollegeDomain(lowerEmail))) {
        return res.status(400).json({ success: false, error: 'Please use your official college email address.' });
      }
    } else if (role === 'alumni') {
      // Alumni email lookup check in records
      if (process.env.ALUMNI_VERIFICATION_ENABLED !== 'false') {
        const record = await CollegeAlumniRecord.findOne({
          personalEmail: lowerEmail,
          rollNumber: rollNumber?.trim(),
          batch: batch?.trim()
        });
        if (!record) {
          return res.status(400).json({ success: false, error: 'Unable to verify your alumni record.' });
        }
      }
    }

    // Password strength check
    const pwdStrength = validatePasswordStrength(password);
    if (!pwdStrength.valid) {
      return res.status(400).json({ success: false, error: pwdStrength.error });
    }

    // Duplicate check - returns generic success message to prevent user enumeration
    const Model = role === 'alumni' ? Alumni : User;
    const existing = await Model.findOne({ email: lowerEmail });
    if (existing) {
      if (existing.isEmailVerified) {
        // Log event
        await SecurityLog.create({
          email: lowerEmail,
          event: 'register_attempt_duplicate',
          status: 'failure',
          ipAddress: currentIp,
          details: { role }
        });
        // Return generic response
        return res.json({ success: true, message: 'Registration successful! Please check your email for a verification code.' });
      } else {
        // Account exists but is NOT verified. Delete it so they can register afresh and receive the OTP email.
        console.log(`🗑️ [Register] Deleting unverified duplicate account for ${lowerEmail} to allow re-registration.`);
        await Model.deleteOne({ email: lowerEmail });
        // Also delete any existing stale OTP record for this email
        await OTP.deleteOne({ email: lowerEmail });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `${role}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    // Auto-detect college name
    const domain = lowerEmail.split('@')[1] || '';
    const collegeRecord = await CollegeDomain.findOne({ domain });
    const collegeName = collegeRecord ? collegeRecord.name : 'SR University';

    const newAccount = new Model({
      userId,
      email: lowerEmail,
      password: hashedPassword,
      passwordHistory: [hashedPassword],
      isEmailVerified: false,
      college: collegeName,
      name: name || 'User',
      batch: batch || '2024',
      department: department || 'General',
      role,
      fullName: name || 'User',
      batchYear: batch || '2024',
      onboardingCompleted: false,
      onboardingStep: 1
    });

    if (role === 'alumni') {
      newAccount.approvalStatus = (process.env.ALUMNI_VERIFICATION_ENABLED === 'false' ? 'approved' : 'pending');
      newAccount.rollNumber = rollNumber;
    }

    // Verification OTP generation
    const code = crypto.randomInt(100000, 1000000).toString();
    console.log(`🔑 [OTP Debug] Generated registration OTP code: [${code}] for email: [${lowerEmail}]`);
    const hashedOtp = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    // Send email first
    const emailResult = await emailService.sendOTP(lowerEmail, code, 15);
    if (!emailResult.success) {
      console.error(`❌ [Register] Email delivery failed: ${emailResult.error}`);
      return res.status(500).json({ 
        success: false, 
        error: `Failed to dispatch verification email: ${emailResult.error || 'Unknown error'}` 
      });
    }

    try {
      await newAccount.save();
      await OTP.findOneAndUpdate(
        { email: lowerEmail },
        { code: hashedOtp, otp: hashedOtp, expiresAt, role, attempts: 0, verified: false },
        { upsert: true, new: true }
      );
    } catch (dbError) {
      console.error('❌ [Register] Database save failed after successful email dispatch:', dbError);
      // Clean up if partially saved
      await Model.deleteOne({ userId });
      await OTP.deleteOne({ email: lowerEmail });
      return res.status(500).json({ success: false, error: 'Registration failed due to a database error.' });
    }

    await SecurityLog.create({
      userId,
      email: lowerEmail,
      event: 'register_initiate',
      status: 'success',
      ipAddress: currentIp,
      details: { role }
    });

    const responsePayload = { success: true, message: 'Registration successful! Please check your email for a verification code.' };
    if (process.env.NODE_ENV !== 'production') {
      responsePayload.debugOtp = code;
    }
    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Registration failed due to an internal error.' });
  }
});

// 2. VERIFY-EMAIL Endpoint
router.post('/auth/verify-email', authLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
    }

    const lowerEmail = email.toLowerCase().trim();
    const currentIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    // Lockout check
    const lockout = await checkLockout(lowerEmail, currentIp);
    if (lockout.locked) {
      return res.status(423).json({ success: false, error: 'Account temporarily locked. Please try again later.' });
    }

    const otpRecord = await OTP.findOne({ email: lowerEmail });
    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      if (otpRecord) await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
    }

    // Compare hashed code
    const hashedInput = crypto.createHash('sha256').update(code.trim()).digest('hex');
    if (otpRecord.code !== hashedInput && otpRecord.otp !== hashedInput) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      await recordFailedAttempt(lowerEmail, currentIp);

      if (otpRecord.attempts >= 5) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, error: 'Maximum attempts exceeded. Code invalidated.' });
      }
      return res.status(400).json({ success: false, error: 'Invalid verification code.' });
    }

    // Success
    await OTP.deleteOne({ _id: otpRecord._id });
    await resetAttempts(lowerEmail, currentIp);

    // Verify User/Alumni
    const isAlumni = otpRecord.role === 'alumni';
    const Model = isAlumni ? Alumni : User;
    const account = await Model.findOne({ email: lowerEmail });
    
    if (!account) {
      return res.status(404).json({ success: false, error: 'Account details not found.' });
    }

    account.isEmailVerified = true;
    await account.save();

    // Create session and issue tokens
    const { token, refreshToken } = await createSessionAndTokens(req, res, account.userId, account.role, lowerEmail);

    res.json({
      success: true,
      token,
      user: {
        id: account.userId,
        name: account.name || '',
        email: lowerEmail,
        role: account.role
      },
      profileComplete: account.onboardingCompleted === true,
      isNewUser: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verification failed.' });
  }
});

// 3. LOGIN Endpoint (Password-based login with CAPTCHA / Lockouts / MFA verification)
router.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password, captchaId, captchaAnswer, captchaExpiresAt, captchaSignature } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Invalid email or password.' });
    }
    
    const lowerEmail = email.toLowerCase().trim();
    const currentIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';

    // 1. Lockout Check
    const lockout = await checkLockout(lowerEmail, currentIp);
    if (lockout.locked) {
      return res.status(423).json({ success: false, error: `Account is temporarily locked. Try again after ${lockout.waitMinutes} minutes.` });
    }

    // 2. CAPTCHA Check (Required if failed attempts from IP or account >= 3)
    const attempts = await LoginAttempt.findOne({ $or: [{ email: lowerEmail }, { ipAddress: currentIp }] });
    const requireCaptcha = attempts && attempts.attempts >= 3;
    if (requireCaptcha) {
      if (!captchaId || captchaAnswer === undefined || !captchaSignature) {
        return res.status(422).json({ success: false, error: 'CAPTCHA required due to multiple failed attempts.', requireCaptcha: true });
      }
      const captchaValid = verifyCaptcha(captchaId, captchaAnswer, captchaExpiresAt, captchaSignature);
      if (!captchaValid) {
        await recordFailedAttempt(lowerEmail, currentIp);
        return res.status(400).json({ success: false, error: 'CAPTCHA verification failed.', requireCaptcha: true });
      }
    }

    // 3. Fetch Account
    let account = await User.findOne({ email: lowerEmail }) || await Alumni.findOne({ email: lowerEmail });
    let role = account ? account.role : null;

    // Handle admin login check
    if (!account && ADMIN_EMAILS.includes(lowerEmail)) {
      role = 'admin';
    }

    if (!account && role !== 'admin') {
      await recordFailedAttempt(lowerEmail, currentIp);
      await SecurityLog.create({
        email: lowerEmail,
        event: 'login_fail_no_user',
        status: 'failure',
        ipAddress: currentIp,
        userAgent: ua
      });
      return res.status(400).json({ success: false, error: 'Invalid email or password.' });
    }

    // Check account status
    if (account && account.isSuspended) {
      return res.status(403).json({ success: false, error: 'Your account has been suspended.' });
    }

    // 4. Verify password
    let passwordValid = false;
    if (role === 'admin') {
      // Admin accounts bypass password but strictly require Email OTP MFA
      passwordValid = true;
    } else if (account.password) {
      passwordValid = await bcrypt.compare(password, account.password);
    }

    if (!passwordValid) {
      await recordFailedAttempt(lowerEmail, currentIp);
      await SecurityLog.create({
        userId: account ? account.userId : '',
        email: lowerEmail,
        event: 'login_fail_password',
        status: 'failure',
        ipAddress: currentIp,
        userAgent: ua
      });
      return res.status(400).json({ success: false, error: 'Invalid email or password.' });
    }

    // Credentials valid: reset failed attempts
    await resetAttempts(lowerEmail, currentIp);

    // 5. MFA / OTP Verification Check
    const mfaRequired = role === 'admin' || (account && account.mfaEnabled);
    if (mfaRequired) {
      // Generate OTP and send via email
      const mfaCode = crypto.randomInt(100000, 1000000).toString();
      console.log(`🔑 [OTP Debug] Generated MFA OTP code: [${mfaCode}] for email: [${lowerEmail}]`);
      const hashedMfa = crypto.createHash('sha256').update(mfaCode).digest('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

      // Send email first
      const emailResult = await emailService.sendOTP(lowerEmail, mfaCode, 5);
      if (!emailResult.success) {
        console.error(`❌ [Login MFA] Email delivery failed: ${emailResult.error}`);
        return res.status(500).json({ 
          success: false, 
          error: `Failed to dispatch MFA verification email: ${emailResult.error || 'Unknown error'}` 
        });
      }

      await OTP.findOneAndUpdate(
        { email: lowerEmail },
        { code: hashedMfa, otp: hashedMfa, expiresAt, role: role || 'student', attempts: 0, verified: false },
        { upsert: true, new: true }
      );

      await SecurityLog.create({
        userId: account ? account.userId : 'admin-user-id',
        email: lowerEmail,
        event: 'mfa_initiated',
        status: 'success',
        ipAddress: currentIp,
        userAgent: ua
      });

      const responsePayload = {
        success: true,
        mfaRequired: true,
        email: lowerEmail,
        role: role
      };
      if (process.env.NODE_ENV !== 'production') {
        responsePayload.debugOtp = mfaCode;
      }
      return res.json(responsePayload);
    }

    // 6. Complete standard login
    const { token } = await createSessionAndTokens(req, res, account.userId, account.role, lowerEmail);

    res.json({
      success: true,
      token,
      user: {
        id: account.userId,
        name: account.name || '',
        email: lowerEmail,
        role: account.role
      },
      profileComplete: account.onboardingCompleted === true,
      isNewUser: false
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Authentication failed.' });
  }
});

// 4. MFA-VERIFY Endpoint
router.post('/auth/mfa/verify', authLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
    }

    const lowerEmail = email.toLowerCase().trim();
    const currentIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';

    // Lockout check
    const lockout = await checkLockout(lowerEmail, currentIp);
    if (lockout.locked) {
      return res.status(423).json({ success: false, error: 'Lockout active. Try again later.' });
    }

    const otpRecord = await OTP.findOne({ email: lowerEmail });
    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      if (otpRecord) await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, error: 'Invalid or expired MFA code.' });
    }

    // Compare hashed code
    const hashedInput = crypto.createHash('sha256').update(code.trim()).digest('hex');
    if (otpRecord.code !== hashedInput && otpRecord.otp !== hashedInput) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      await recordFailedAttempt(lowerEmail, currentIp);

      if (otpRecord.attempts >= 5) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, error: 'Maximum verification attempts exceeded.' });
      }
      return res.status(400).json({ success: false, error: 'Invalid code.' });
    }

    // Success
    await OTP.deleteOne({ _id: otpRecord._id });
    await resetAttempts(lowerEmail, currentIp);

    let userId = 'admin-user-id';
    let profileComplete = true;
    let finalRole = otpRecord.role;

    if (otpRecord.role !== 'admin') {
      const Model = otpRecord.role === 'alumni' ? Alumni : User;
      const account = await Model.findOne({ email: lowerEmail });
      if (!account) {
        return res.status(404).json({ success: false, error: 'Account details not found.' });
      }
      userId = account.userId;
      profileComplete = account.onboardingCompleted === true;
      finalRole = account.role;
    }

    const { token } = await createSessionAndTokens(req, res, userId, finalRole, lowerEmail);

    let name = '';
    if (finalRole === 'admin') {
      name = 'Campus Admin';
    } else {
      const Model = finalRole === 'alumni' ? Alumni : User;
      const account = await Model.findOne({ userId });
      if (account) name = account.name || '';
    }

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        name,
        email: lowerEmail,
        role: finalRole
      },
      profileComplete,
      isNewUser: false
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'MFA verification failed.' });
  }
});

// 5. REFRESH-TOKEN Endpoint (Rotation mechanism)
router.post('/auth/refresh-token', async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'No refresh token provided.' });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const session = await Session.findOne({ sessionId: decoded.sessionId, userId: decoded.userId });

    if (!session || new Date() > session.expiresAt) {
      // Invalidate all tokens on reuse detection / invalid token
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      if (session) await Session.deleteOne({ sessionId: session.sessionId });
      return res.status(401).json({ success: false, error: 'Session expired or invalid.' });
    }

    // Perform rotation
    const newSessionId = `session-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
    const newSessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Save rotated session
    session.sessionId = newSessionId;
    session.expiresAt = newSessionExpires;
    session.lastActiveAt = new Date();
    await session.save();

    const user = await User.findOne({ userId: decoded.userId }) || await Alumni.findOne({ userId: decoded.userId });
    const email = user ? user.email : (decoded.userId === 'admin-user-id' ? 'admin@mit.edu' : '');
    const role = user ? user.role : (decoded.userId === 'admin-user-id' ? 'admin' : 'student');

    const userPayload = { userId: decoded.userId, email, role, sessionId: newSessionId };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ sessionId: newSessionId, userId: decoded.userId }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('access_token', token, ACCESS_COOKIE_OPTIONS);
    res.cookie('refresh_token', newRefreshToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      token,
      user: {
        id: decoded.userId,
        name: user ? user.name : (decoded.userId === 'admin-user-id' ? 'Campus Admin' : ''),
        email,
        role
      }
    });
  } catch (error) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.status(401).json({ success: false, error: 'Session refresh failed.' });
  }
});

// 6. FORGOT-PASSWORD Endpoint (Secure token generation)
router.post('/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const lowerEmail = email.toLowerCase().trim();
    const currentIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    
    // Lookup user / alumni
    const account = await User.findOne({ email: lowerEmail }) || await Alumni.findOne({ email: lowerEmail });
    
    // Always return a generic success message to prevent account discovery/enumeration
    const genericResponse = { success: true, message: 'If your account exists, a secure password reset link has been dispatched to your email address.' };
    
    if (!account) {
      await SecurityLog.create({
        email: lowerEmail,
        event: 'password_reset_request_no_user',
        status: 'failure',
        ipAddress: currentIp
      });
      return res.json(genericResponse);
    }

    // Generate single-use reset token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    console.log(`🔑 [Reset Token Debug] Generated raw reset token: [${rawResetToken}] resetLink: [http://localhost:5173/reset-password?token=${rawResetToken}] for email: [${lowerEmail}]`);
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    // Send email with raw hex token
    const resetLink = `http://localhost:5173/reset-password?token=${rawResetToken}`;
    const emailResult = await emailService.sendEmail(
      lowerEmail,
      account.name,
      'Campus Connect Password Reset Request',
      `<p>You requested a password reset. Click the link below to change your password (expires in 15 minutes):</p><a href="${resetLink}">${resetLink}</a>`
    );

    if (!emailResult.success) {
      console.error(`❌ [Forgot Password] Email delivery failed: ${emailResult.error}`);
      return res.status(502).json({ 
        success: false, 
        error: `Failed to dispatch password reset email: ${emailResult.error || 'Unknown error'}` 
      });
    }

    // Save hashed token
    account.resetPasswordToken = hashedResetToken;
    account.resetPasswordExpires = resetExpires;
    await account.save();

    await SecurityLog.create({
      userId: account.userId,
      email: lowerEmail,
      event: 'password_reset_request_success',
      status: 'success',
      ipAddress: currentIp
    });

    const responsePayload = { ...genericResponse };
    if (process.env.NODE_ENV !== 'production') {
      responsePayload.debugResetToken = rawResetToken;
      responsePayload.debugResetLink = resetLink;
    }
    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to request password reset.' });
  }
});

// 7. RESET-PASSWORD Endpoint (With token matching & session invalidation)
router.post('/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and new password are required.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const query = {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    };

    let account = await User.findOne(query) || await Alumni.findOne(query);
    if (!account) {
      return res.status(400).json({ success: false, error: 'Invalid or expired password reset link.' });
    }

    // Password strength check
    const pwdStrength = validatePasswordStrength(password);
    if (!pwdStrength.valid) {
      return res.status(400).json({ success: false, error: pwdStrength.error });
    }

    // Password history check (compare with last 5 passwords)
    const passwordHistory = account.passwordHistory || [];
    for (const oldPassHash of passwordHistory) {
      const match = await bcrypt.compare(password, oldPassHash);
      if (match) {
        return res.status(400).json({ success: false, error: 'You cannot reuse one of your last 5 passwords.' });
      }
    }

    // Hash and update
    const hashedPwd = await bcrypt.hash(password, 10);
    account.password = hashedPwd;
    
    // Update password history
    passwordHistory.push(hashedPwd);
    if (passwordHistory.length > 5) {
      passwordHistory.shift(); // Keep last 5
    }
    account.passwordHistory = passwordHistory;

    // Clear reset tokens
    account.resetPasswordToken = undefined;
    account.resetPasswordExpires = undefined;
    await account.save();

    // CRITICAL: Invalidate all active sessions after password reset
    await Session.deleteMany({ userId: account.userId });

    // Clear client cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    // Security Log
    await SecurityLog.create({
      userId: account.userId,
      email: account.email,
      event: 'password_reset_complete',
      status: 'success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    });

    res.json({ success: true, message: 'Password reset successful. All active sessions terminated.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reset password.' });
  }
});

// 8. LOGOUT Endpoint
router.post('/auth/logout', async (req, res) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = req.cookies.access_token;
    }
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        await Session.deleteOne({ sessionId: decoded.sessionId });
        
        await SecurityLog.create({
          userId: decoded.userId,
          email: decoded.email,
          event: 'logout',
          status: 'success',
          ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
        });
      } catch (err) {}
    }
    
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Logout failed.' });
  }
});

// 9. LOGOUT-ALL Endpoint
router.post('/auth/logout-all', requireAuth, async (req, res) => {
  try {
    const { userId, email } = req.user;
    await Session.deleteMany({ userId });
    
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    await SecurityLog.create({
      userId,
      email,
      event: 'logout_all',
      status: 'success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    });

    res.json({ success: true, message: 'Logged out of all devices successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to logout from all devices.' });
  }
});

// 10. Sessions retrieval
router.get('/auth/sessions', requireAuth, async (req, res) => {
  try {
    const { userId, sessionId } = req.user;
    const list = await Session.find({ userId });
    const mapped = list.map(s => ({
      sessionId: s.sessionId,
      deviceType: s.deviceType,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      lastActiveAt: s.lastActiveAt,
      isCurrentDevice: s.sessionId === sessionId
    }));
    res.json({ success: true, sessions: mapped });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch active sessions.' });
  }
});

// 11. Revoke specific session
router.post('/auth/sessions/:sessionId/revoke', requireAuth, async (req, res) => {
  try {
    const { userId } = req.user;
    const { sessionId } = req.params;
    await Session.deleteOne({ sessionId, userId });
    res.json({ success: true, message: 'Session revoked successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to revoke session.' });
  }
});

// 12. Revoke all other sessions
router.post('/auth/sessions/revoke-all', requireAuth, async (req, res) => {
  try {
    const { userId, sessionId } = req.user;
    await Session.deleteMany({ userId, sessionId: { $ne: sessionId } });
    res.json({ success: true, message: 'All other sessions revoked successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to revoke sessions.' });
  }
});

// Debug/Diagnostic Email Endpoint
router.get('/debug/email-test', async (req, res) => {
  try {
    const toEmail = req.query.email || process.env.BREVO_SENDER_EMAIL || 'campusconnect589@gmail.com';
    console.log(`📡 [Email Diagnostics] Initiating SMTP connection check...`);
    
    const smtpCheck = await emailService.verifySMTP();
    const apiCheck = await emailService.verifyAPIKey();
    const senderCheck = await emailService.verifySender();
    
    console.log(`📡 [Email Diagnostics] SMTP verification result:`, smtpCheck);
    console.log(`📡 [Email Diagnostics] Brevo API verification result:`, apiCheck);
    
    // Attempt to send a test email
    const subject = `Campus Connect SMTP Diagnostic Test - ${new Date().toISOString()}`;
    const htmlContent = `
      <h1>Campus Connect SMTP Diagnostics</h1>
      <p>This is a diagnostic email automatically triggered to verify SMTP / Brevo API deliverability.</p>
      <hr />
      <h3>Diagnostic Report:</h3>
      <ul>
        <li><b>SMTP Host:</b> ${process.env.SMTP_HOST || 'Not Configured'}</li>
        <li><b>SMTP User:</b> ${process.env.SMTP_USER || 'Not Configured'}</li>
        <li><b>Brevo API Key:</b> ${process.env.BREVO_API_KEY ? 'Configured (Secret)' : 'Not Configured'}</li>
        <li><b>Verified Sender:</b> ${process.env.BREVO_SENDER_EMAIL || 'Not Configured'}</li>
        <li><b>SMTP Status:</b> ${smtpCheck.success ? 'Verified ✅' : 'Failed ❌ (' + smtpCheck.error + ')'}</li>
        <li><b>Brevo API Status:</b> ${apiCheck.valid ? 'Valid ✅' : 'Failed ❌ (' + apiCheck.error + ')'}</li>
      </ul>
    `;
    
    console.log(`📡 [Email Diagnostics] Dispatching test email to ${toEmail}...`);
    const sendResult = await emailService.sendEmail(toEmail, 'Diagnostic Recipient', subject, htmlContent);
    const lastStatus = emailService.getLastEmailStatus();
    
    res.json({
      success: sendResult.success,
      smtpConnection: smtpCheck,
      brevoApi: apiCheck,
      senderVerification: senderCheck,
      sendResult,
      lastEmailStatus: lastStatus
    });
  } catch (error) {
    console.error('❌ [Email Diagnostics] Diagnostic test run crashed:', error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// 13. Deprecated/Bypass verify-otp endpoint kept for verification compatibility
router.post('/auth/verify-otp', authLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and OTP code are required.' });
    }
    
    const lowerEmail = email.toLowerCase().trim();
    const currentIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    
    const lockout = await checkLockout(lowerEmail, currentIp);
    if (lockout.locked) {
      return res.status(423).json({ success: false, error: `Account locked. Try again later.` });
    }
    
    const otpRecord = await OTP.findOne({ email: lowerEmail });
    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      if (otpRecord) await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, error: 'OTP code has expired.' });
    }
    
    const hashedInput = crypto.createHash('sha256').update(code.trim()).digest('hex');
    if (otpRecord.code !== hashedInput && otpRecord.otp !== hashedInput) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      await recordFailedAttempt(lowerEmail, currentIp);
      
      if (otpRecord.attempts >= 5) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, error: 'Attempts exceeded. Account locked.' });
      }
      return res.status(400).json({ success: false, error: 'Invalid OTP code.' });
    }
    
    // Clean up
    await OTP.deleteOne({ _id: otpRecord._id });
    await resetAttempts(lowerEmail, currentIp);
    
    let isNewUser = false;
    let profileComplete = false;
    let userId = '';
    
    if (otpRecord.role === 'student') {
      let student = await User.findOne({ email: lowerEmail });
      if (!student) {
        isNewUser = true;
        userId = `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const domain = lowerEmail.split('@')[1].toLowerCase().trim();
        const collegeRecord = await CollegeDomain.findOne({ domain });
        const collegeName = collegeRecord ? collegeRecord.name : 'SR University';
        
        student = new User({
          userId,
          email: lowerEmail,
          collegeEmail: lowerEmail,
          role: 'student',
          college: collegeName,
          isEmailVerified: true
        });
        await student.save();
      } else {
        userId = student.userId;
        profileComplete = student.onboardingCompleted === true;
      }
    } else if (otpRecord.role === 'alumni') {
      const { rollNumber, batch, name, department, isTestAccount } = otpRecord.metadata || {};
      let alumni = await Alumni.findOne({ email: lowerEmail });
      const computedIsTest = (process.env.ALUMNI_VERIFICATION_ENABLED === 'false' || !!isTestAccount);
      
      if (!alumni) {
        userId = `alumni-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        alumni = new Alumni({
          userId,
          email: lowerEmail,
          name: name || 'Alumni User',
          batch: batch || '2024',
          department: department || 'Computer Science',
          approvalStatus: computedIsTest ? 'approved' : 'pending',
          role: 'alumni',
          rollNumber,
          fullName: name || 'Alumni User',
          batchYear: batch || '2024',
          isTestAccount: computedIsTest,
          isEmailVerified: true,
          onboardingCompleted: false,
          onboardingStep: 1
        });
        await alumni.save();
        isNewUser = true;
      } else {
        userId = alumni.userId;
        profileComplete = alumni.onboardingCompleted === true;
      }
    } else if (otpRecord.role === 'admin') {
      userId = 'admin-user-id';
      profileComplete = true;
    }
    
    const { token } = await createSessionAndTokens(req, res, userId, otpRecord.role, lowerEmail);
    
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
    res.status(500).json({ success: false, error: 'Internal verification failure.' });
  }
});

// Helper for onboarding profile completion metrics
function computeBackendProfileCompletion(user) {
  let completed = 0;
  const total = 14;

  const hasPhoto = (user.photos && user.photos.length > 0 && user.photos[0]) || user.profileImageUrl || user.profileImage;
  if (hasPhoto) completed++;

  if (user.name && user.name.trim() !== '') completed++;
  if (user.bio && user.bio.trim() !== '') completed++;
  const dept = user.department || user.course;
  if (dept && dept.trim() !== '') completed++;
  const batch = user.batch || user.year;
  if (batch && batch.trim() !== '') completed++;
  if (user.skills && user.skills.length > 0) completed++;
  if (user.interests && user.interests.length > 0) completed++;
  const pEmail = user.personalEmail || user.email;
  if (pEmail && pEmail.trim() !== '') completed++;
  if (user.linkedinUrl && user.linkedinUrl.trim() !== '') completed++;
  const ghUrl = user.githubUrl || user.portfolioUrl;
  if (ghUrl && ghUrl.trim() !== '') completed++;
  if (user.achievements && user.achievements.length > 0) completed++;
  const hasProjects = (user.projects && user.projects.length > 0) || (user.experience && user.experience.length > 0);
  if (hasProjects) completed++;
  const cGoals = user.careerGoals || user.story || user.careerJourney;
  if (cGoals && cGoals.trim() !== '') completed++;
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
        profileComplete = student.onboardingCompleted === true;
      }
    } else if (role === 'alumni') {
      const alumni = await Alumni.findOne({ userId });
      if (alumni) {
        const alumniObj = alumni.toObject();
        const completion = computeBackendProfileCompletion(alumniObj);
        alumniObj.profileCompletion = completion;
        userDetails = alumniObj;
        profileComplete = alumni.onboardingCompleted === true;
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
      user: {
        id: userId,
        name: userDetails.name || (role === 'admin' ? 'Campus Admin' : ''),
        email: userDetails.email,
        role: role
      },
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
router.get('/alumni', requireAuth, async (req, res) => {
  try {
    const { search, company, role, department, batch, skills, location, userId, status } = req.query;
    
    // If userId query parameter is passed, find specifically that user's profile
    if (userId) {
      const profile = await Alumni.findOne({ userId });
      if (!profile) return res.json({ success: true, data: [] });

      // College isolation check
      if (req.user.role !== 'super_admin' && profile.college !== req.user.college) {
        return res.status(403).json({ success: false, error: 'Access denied: Profile belongs to a different college.' });
      }

      if (!(await isProfileVisible(req.user.userId, profile.userId, profile))) {
        return res.status(403).json({ success: false, error: 'Access denied: Profile is private or restricted.' });
      }
      return res.json({ success: true, data: [profile] });
    }

    let query = {};
    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }

    // Blocked users filter based on auth header
    if (req.user && req.user.userId) {
      const currentUser = await User.findOne({ userId: req.user.userId }) || await Alumni.findOne({ userId: req.user.userId });
      const blockedByMe = currentUser ? (currentUser.blockedUsers || []) : [];
      const usersBlockingMe = await User.find({ blockedUsers: req.user.userId });
      const alumniBlockingMe = await Alumni.find({ blockedUsers: req.user.userId });
      const blockedIds = [
        ...blockedByMe,
        ...usersBlockingMe.map(u => u.userId),
        ...alumniBlockingMe.map(a => a.userId)
      ];
      if (blockedIds.length > 0) {
        query.userId = { $nin: blockedIds };
      }
    }
    if (status) {
      query.approvalStatus = status;
    } else {
      query.approvalStatus = 'approved';
    }
    query.profileDiscovery = { $ne: 'Hide from Search' };

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
router.get('/alumni/profile', requireAuth, async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const profile = await Alumni.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Alumni profile not found' });
    }

    // College isolation check
    if (req.user.role !== 'super_admin' && profile.college !== req.user.college) {
      return res.status(403).json({ success: false, error: 'Access denied: Profile belongs to a different college.' });
    }

    if (!(await isProfileVisible(req.user.userId, profile.userId, profile))) {
      return res.status(403).json({ success: false, error: 'Access denied: Profile is private or restricted.' });
    }

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

    if (actualEmail && name) {
      const conflict = await checkEmailNameConflict(actualEmail, name, actualUserId);
      if (conflict) {
        return res.status(400).json({ success: false, error: `This email ID already exists for ${conflict}` });
      }
    }

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

    if (actualEmail && name) {
      const conflict = await checkEmailNameConflict(actualEmail, name, actualUserId);
      if (conflict) {
        return res.status(400).json({ success: false, error: `This email ID already exists for ${conflict}` });
      }
    }

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
    const { userId, name, batch, department, company, role, story, profileImageUrl, onboardingCompleted, onboardingStep } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const existingAlumni = await Alumni.findOne({ userId });
    if (!existingAlumni) {
      return res.status(404).json({ success: false, error: 'Alumni profile not found' });
    }
    if (name) {
      const conflict = await checkEmailNameConflict(existingAlumni.email, name, userId);
      if (conflict) {
        return res.status(400).json({ success: false, error: `This email ID already exists for ${conflict}` });
      }
    }

    const updateFields = { 
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
    };

    if (onboardingCompleted !== undefined) {
      updateFields.onboardingCompleted = onboardingCompleted;
    }
    if (onboardingStep !== undefined) {
      updateFields.onboardingStep = onboardingStep;
    }

    const updated = await Alumni.findOneAndUpdate(
      { userId },
      updateFields,
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

// PUT /api/alumni/:id - Update alumni profile by mongo ID or userId
router.put('/alumni/:id', async (req, res) => {
  try {
    const { name, batch, department, company, role, story, profileImageUrl, onboardingCompleted, onboardingStep } = req.body;

    const existingAlumni = await Alumni.findOne({ userId: req.params.id }) || (mongoose.Types.ObjectId.isValid(req.params.id) ? await Alumni.findById(req.params.id) : null);
    if (!existingAlumni) {
      return res.status(404).json({ success: false, error: 'Alumni profile not found' });
    }
    if (name) {
      const conflict = await checkEmailNameConflict(existingAlumni.email, name, existingAlumni.userId);
      if (conflict) {
        return res.status(400).json({ success: false, error: `This email ID already exists for ${conflict}` });
      }
    }

    const updateFields = {
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
    };

    if (onboardingCompleted !== undefined) {
      updateFields.onboardingCompleted = onboardingCompleted;
    }
    if (onboardingStep !== undefined) {
      updateFields.onboardingStep = onboardingStep;
    }

    let updated = await Alumni.findOneAndUpdate({ userId: req.params.id }, updateFields, { new: true });
    
    if (!updated && mongoose.Types.ObjectId.isValid(req.params.id)) {
      updated = await Alumni.findByIdAndUpdate(
        req.params.id,
        updateFields,
        { new: true }
      );
    }

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Alumni profile not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/posts - Get all posts with optional type/company/search filters
router.get('/alumni/posts', requireAuth, async (req, res) => {
  try {
    const { type, company, search } = req.query;
    
    const moderationEnabled = process.env.MODERATION_ENABLED !== 'false';
    let query = {};
    if (moderationEnabled) {
      query.approvalStatus = 'approved';
    }
    
    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }
    
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
      const author = await Alumni.findOne({ userId: post.alumniId }) || (mongoose.Types.ObjectId.isValid(post.alumniId) ? await Alumni.findById(post.alumniId) : null);
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

// Alumni Feed Routes
// GET /api/alumni/feed - Get alumni feed (alumni posts/career updates only)
router.get('/alumni/feed', requireAuth, async (req, res) => {
  try {
    const { type, company, search } = req.query;
    let query = {}; // No approvalStatus requirement check to make sure posts show up immediately or fallback
    
    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }
    
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
          const authorByMongoId = mongoose.Types.ObjectId.isValid(post.alumniId) ? await Alumni.findById(post.alumniId) : null;
          if (authorByMongoId) {
            postObj.author = {
              ...authorByMongoId.toObject(),
              id: authorByMongoId._id
            };
          }
      }
      return postObj;
    }));

    res.json({ success: true, data: postsWithAuthors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/referrals - Get referrals by alumni ID
router.get('/alumni/referrals', requireAuth, async (req, res) => {
  try {
    const { alumniId } = req.query;
    if (!alumniId) {
      return res.status(400).json({ success: false, error: 'alumniId is required' });
    }
    const alumni = await Alumni.findOne({ userId: alumniId }) || (mongoose.Types.ObjectId.isValid(alumniId) ? await Alumni.findById(alumniId) : null);
    if (!alumni) {
      return res.status(404).json({ success: false, error: 'Alumni profile not found' });
    }
    if (req.user.role !== 'super_admin' && alumni.college !== req.user.college) {
      return res.status(403).json({ success: false, error: 'Access denied: Profile belongs to a different college.' });
    }

    const query = { $or: [{ alumniId }, { authorId: alumniId }] };
    const list = await Referral.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/:id - Get single alumni profile details
router.get('/alumni/:id', requireAuth, async (req, res) => {
  try {
    const profile = await Alumni.findOne({ userId: req.params.id }) || (mongoose.Types.ObjectId.isValid(req.params.id) ? await Alumni.findById(req.params.id) : null);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Alumni profile not found' });
    }

    // College isolation check
    if (req.user.role !== 'super_admin' && profile.college !== req.user.college) {
      return res.status(403).json({ success: false, error: 'Access denied: Profile belongs to a different college.' });
    }

    if (!(await isProfileVisible(req.user.userId, profile.userId, profile))) {
      return res.status(403).json({ success: false, error: 'Access denied: Profile is private or restricted.' });
    }

    profile.viewCount += 1;
    await profile.save();
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/:id/posts - Get posts shared by this alumni
router.get('/alumni/:id/posts', requireAuth, async (req, res) => {
  try {
    const access = await checkAlumniContentAccess(req, res, req.params.id);
    if (!access) return;
    const { author, currentUserId } = access;

    // Check display toggle
    if (author.showPosts === false && currentUserId !== author.userId) {
      return res.json({ success: true, data: [] });
    }

    let query = { alumniId: req.params.id };
    if (author) {
      query = { $or: [{ alumniId: author.userId }, { alumniId: author._id.toString() }] };
    }
    
    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }

    const posts = await Post.find(query).sort({ createdAt: -1 });
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
router.get('/alumni/:id/referrals', requireAuth, async (req, res) => {
  try {
    const access = await checkAlumniContentAccess(req, res, req.params.id);
    if (!access) return;
    const { author, currentUserId } = access;

    // Check display toggle
    if (author.showReferrals === false && currentUserId !== author.userId) {
      return res.json({ success: true, data: [] });
    }

    let query = { alumniId: req.params.id };
    if (author) {
      query = { $or: [{ alumniId: author.userId }, { alumniId: author._id.toString() }] };
    }
    
    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }

    const list = await Referral.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/:id/resources - Get resources shared by this alumni
router.get('/alumni/:id/resources', requireAuth, async (req, res) => {
  try {
    const access = await checkAlumniContentAccess(req, res, req.params.id);
    if (!access) return;
    
    let query = { alumniId: req.params.id };
    if (access.author) {
      query = { $or: [{ alumniId: access.author.userId }, { alumniId: access.author._id.toString() }] };
    }
    
    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }

    const list = await Resource.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/:id/roadmaps - Get roadmaps shared by this alumni
router.get('/alumni/:id/roadmaps', requireAuth, async (req, res) => {
  try {
    const access = await checkAlumniContentAccess(req, res, req.params.id);
    if (!access) return;
    
    let query = { alumniId: req.params.id };
    if (access.author) {
      query = { $or: [{ alumniId: access.author.userId }, { alumniId: access.author._id.toString() }] };
    }
    
    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }

    const list = await Roadmap.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/posts - Create an alumni post
router.post('/alumni/posts', requireAuth, async (req, res) => {
  try {
    const { content, type, imageUrls, videoUrls, tags, company, jobRole, salary, experience, applyLink } = req.body;
    const newPost = new Post({
      alumniId: req.user.userId,
      college: req.user.college,
      content,
      type: type || 'general',
      imageUrls,
      videoUrls,
      tags,
      company,
      jobRole,
      salary,
      experience,
      applyLink,
      likes: [],
      comments: [],
      shareCount: 0,
      viewCount: 0
    });
    await newPost.save();
    res.json({ success: true, data: newPost });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/referrals - Create a referral listing
router.post('/alumni/referrals', requireAuth, async (req, res) => {
  try {
    const { company, role, companyName, jobTitle, description, eligibility, deadline, applicationUrl, salary, location } = req.body;
    const alumniId = req.user.userId;
    
    // Normalize and validate URL
    if (!applicationUrl || !URL_REGEX.test(applicationUrl.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid application URL. Please provide a valid web link.' });
    }

    const finalCompany = company || companyName;
    const finalRole = role || jobTitle;

    if (!finalCompany || !finalRole) {
      return res.status(400).json({ success: false, error: 'Company and Role/Job Title are required.' });
    }

    // Retrieve Alumni info
    let authorName = 'Alumni Member';
    const alumniProfile = await Alumni.findOne({ userId: alumniId });
    if (alumniProfile) {
      authorName = alumniProfile.name || alumniProfile.fullName || 'Alumni Member';
    }

    const referral = new Referral({
      alumniId,
      authorId: alumniId,
      college: req.user.college,
      authorName,
      company: finalCompany,
      companyName: finalCompany,
      role: finalRole,
      jobTitle: finalRole,
      description: description || '',
      eligibility: eligibility || '',
      deadline: deadline || '',
      applicationUrl: applicationUrl.trim(),
      salary: salary || '',
      location: location || 'Remote',
      likes: [],
      comments: [],
      saves: [],
      shares: 0,
      views: 0,
      clicks: 0,
      applications: 0
    });

    await referral.save();

    // Create synchronized Post for feed
    const postContent = `${finalRole} at ${finalCompany}\nEligibility: ${eligibility || 'N/A'}\nDeadline: ${deadline || 'N/A'}\n\n${description || ''}`;
    const syncPost = new Post({
      alumniId,
      college: req.user.college,
      content: postContent,
      type: 'referral',
      company: finalCompany,
      jobRole: finalRole,
      applyLink: applicationUrl.trim(),
      refId: referral._id.toString()
    });

    await syncPost.save();

    res.status(201).json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/resources - Share a resource
router.post('/alumni/resources', requireAuth, async (req, res) => {
  try {
    const { title, description, link, categoryType } = req.body;
    const resrc = new Resource({
      alumniId: req.user.userId,
      college: req.user.college,
      title,
      description,
      link,
      categoryType
    });
    await resrc.save();

    // Automatically create a post of type 'resource'
    const newPost = new Post({
      alumniId: req.user.userId,
      college: req.user.college,
      type: 'resource',
      content: `New Resource Shared: ${title}. Category: ${categoryType || 'General'}. Description: ${description || ''}. Link: ${link || ''}`,
      applyLink: link || '',
      refId: resrc._id.toString()
    });
    await newPost.save();

    res.json({ success: true, data: resrc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/roadmaps - Upload a roadmap
router.post('/alumni/roadmaps', requireAuth, async (req, res) => {
  try {
    const { title, description, steps } = req.body;
    const rdm = new Roadmap({
      alumniId: req.user.userId,
      college: req.user.college,
      title,
      description,
      steps
    });
    await rdm.save();

    // Automatically create a post of type 'roadmap'
    const newPost = new Post({
      alumniId: req.user.userId,
      college: req.user.college,
      type: 'roadmap',
      content: `New Roadmap Shared: ${title}. Description: ${description || ''}`,
      refId: rdm._id.toString()
    });
    await newPost.save();

    res.json({ success: true, data: rdm });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/connect - Send connection request
router.post('/alumni/connect', requireAuth, async (req, res) => {
  try {
    const { toAlumniId } = req.body;
    const fromUserId = req.user.userId;
    const alumni = await Alumni.findOne({ userId: toAlumniId }) || (mongoose.Types.ObjectId.isValid(toAlumniId) ? await Alumni.findById(toAlumniId) : null);
    if (!alumni) return res.status(404).json({ success: false, error: 'Alumni not found' });
    
    // College isolation check
    if (req.user.role !== 'super_admin' && alumni.college !== req.user.college) {
      return res.status(403).json({ success: false, error: 'Access denied: Profile belongs to a different college.' });
    }

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
router.post('/alumni/follow', requireAuth, async (req, res) => {
  try {
    const { alumniId } = req.body;
    const userId = req.user.userId;
    const alumni = await Alumni.findOne({ userId: alumniId }) || (mongoose.Types.ObjectId.isValid(alumniId) ? await Alumni.findById(alumniId) : null);
    if (!alumni) return res.status(404).json({ success: false, error: 'Alumni not found' });
    
    // College isolation check
    if (req.user.role !== 'super_admin' && alumni.college !== req.user.college) {
      return res.status(403).json({ success: false, error: 'Access denied: Profile belongs to a different college.' });
    }

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
router.post('/alumni/save', requireAuth, async (req, res) => {
  try {
    const { targetId, type } = req.body; // type: post, roadmap, resource
    const alumniId = req.user.userId;
    const alumni = await Alumni.findOne({ userId: alumniId }) || (mongoose.Types.ObjectId.isValid(alumniId) ? await Alumni.findById(alumniId) : null);
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
    const { company, role, companyName, jobTitle, description, eligibility, deadline, applicationUrl, salary, location } = req.body;
    
    // Normalize and validate URL if provided
    if (applicationUrl && !URL_REGEX.test(applicationUrl.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid application URL. Please provide a valid web link.' });
    }

    const finalCompany = company || companyName;
    const finalRole = role || jobTitle;

    const updateFields = {
      ...req.body,
      company: finalCompany,
      companyName: finalCompany,
      role: finalRole,
      jobTitle: finalRole
    };

    if (applicationUrl) {
      updateFields.applicationUrl = applicationUrl.trim();
    }

    const updated = await Referral.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Referral not found' });
    
    // Update matching post
    const postContent = `${finalRole || updated.role} at ${finalCompany || updated.company}\nEligibility: ${eligibility || updated.eligibility || 'N/A'}\nDeadline: ${deadline || updated.deadline || 'N/A'}\n\n${description || updated.description || ''}`;
    await Post.findOneAndUpdate(
      { refId: req.params.id },
      {
        content: postContent,
        company: finalCompany || updated.company,
        jobRole: finalRole || updated.role,
        applyLink: (applicationUrl || updated.applicationUrl || '').trim()
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
    const access = await checkAlumniContentAccess(req, res, req.params.id);
    if (!access) return;
    const { author, currentUserId } = access;

    // Check display toggle
    if (author.showAchievements === false && currentUserId !== author.userId) {
      return res.json({ success: true, data: [] });
    }

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

// POST /api/admin/audience-preview - Live audience preview stats
router.post('/admin/audience-preview', requireAuth, async (req, res) => {
  try {
    const {
      years,
      departments,
      gender,
      batches,
      minCgpa,
      maxBacklogs,
      skills,
      placementType,
      colleges
    } = req.body;

    const college = req.user.college || 'SR University';

    let query = {
      role: 'student',
      isSuspended: { $ne: true }
    };

    // Filter by college selection
    if (colleges === 'Current College') {
      query.college = college;
    } else if (colleges === 'Selected Colleges') {
      query.college = college;
    }

    if (years && years.length > 0 && !years.includes('All Years')) {
      query.academicYear = { $in: years };
    }

    if (departments && departments.length > 0 && !departments.includes('All Departments')) {
      const allDepts = [];
      departments.forEach(d => {
        allDepts.push(d);
        if (d === 'CSE') {
          allDepts.push('Computer Science & Engineering', 'Computer Science and Engineering');
        }
        if (d === 'ECE') {
          allDepts.push('Electronics & Communication Engineering', 'Electronics and Communication Engineering');
        }
      });
      query.department = { $in: allDepts };
    }

    if (gender && gender !== 'Everyone') {
      query.gender = gender;
    }

    if (batches && batches.length > 0 && !batches.includes('All Batches')) {
      query.batch = { $in: batches };
    }

    if (minCgpa !== undefined && minCgpa !== null) {
      query.cgpa = { $gte: parseFloat(minCgpa) || 0 };
    }

    if (maxBacklogs !== undefined && maxBacklogs !== null && maxBacklogs !== 'No Restriction') {
      query.backlogs = { $lte: parseInt(maxBacklogs) || 0 };
    }

    const students = await User.find(query);

    const totalStudents = students.length;
    const maleCount = students.filter(s => s.gender === 'Male').length;
    const femaleCount = students.filter(s => s.gender === 'Female').length;
    const avgCgpa = students.length > 0 ? (students.reduce((acc, s) => acc + (s.cgpa || 0), 0) / students.length) : 0;
    
    // Find unique departments matching
    const uniqueDepts = [...new Set(students.map(s => s.department).filter(Boolean))];
    const uniqueBatches = [...new Set(students.map(s => s.batch).filter(Boolean))];

    return res.json({
      success: true,
      eligibleStudents: totalStudents,
      eligibleMale: maleCount,
      eligibleFemale: femaleCount,
      eligibleDepartments: uniqueDepts,
      targetBatches: uniqueBatches,
      averageCGPA: parseFloat(avgCgpa.toFixed(2))
    });
  } catch (error) {
    console.error('Error calculating audience preview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Post Routes
// POST /api/admin/posts - Create an admin post (with auto-sync to Placements)
router.post('/admin/posts', requireAuth, async (req, res) => {
  try {
    const postData = { ...req.body };
    postData.content = postData.content || postData.description || '';
    postData.createdBy = req.user.userId;
    postData.createdByName = req.user.role === 'admin' ? 'Campus Admin' : 'Campus Admin';
    postData.college = req.user.college || 'SR University';

    // If category is placement or internship, create a synced Placement document
    if (postData.category === 'placement' || postData.category === 'internship') {
      const isIntern = postData.category === 'internship';
      
      let computedPackageVal = 0;
      const pkgStr = isIntern ? postData.stipend : postData.package;
      if (pkgStr) {
        const match = String(pkgStr).match(/(\d+(\.\d+)?)/);
        if (match) computedPackageVal = parseFloat(match[1]);
      }

      const expDate = postData.expiryDate || postData.registrationDeadline || postData.lastDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const placement = new Placement({
        companyLogo: postData.companyLogo || postData.imageURL || '',
        companyName: postData.companyName || (postData.title && postData.title.includes(':') ? postData.title.split(':')[0].trim() : postData.title || ''),
        jobRole: postData.jobRole || postData.internshipRole || postData.title,
        employmentType: isIntern ? 'Internship' : (postData.employmentType || 'Full Time'),
        package: String(pkgStr || ''),
        packageVal: computedPackageVal,
        location: postData.location || postData.venue || 'Remote',
        expiryDate: new Date(expDate),
        description: postData.content || postData.description || postData.internshipDescription || '',
        eligibility: postData.eligibility || '',
        eligibleYears: postData.eligibilityAcademicYears || postData.eligibleYears || [],
        eligibleDepartments: postData.eligibilityDepartments || postData.eligibleDepartments || [],
        minimumCGPA: postData.eligibilityCGPA || postData.minimumCGPA || 0.0,
        maximumBacklogs: postData.eligibilityBacklogs || postData.maximumBacklogs || 0,
        eligibleBatches: postData.eligibilityBatch ? [postData.eligibilityBatch] : (postData.eligibleBatches || []),
        createdBy: req.user.userId,
        createdByName: postData.createdByName,
        createdByRole: 'Admin',
        status: postData.status || 'active',
        isVerified: true,
        college: postData.college,
        
        companyWebsite: postData.companyWebsite || '',
        workMode: postData.workMode || postData.internshipMode || 'Onsite',
        responsibilities: postData.responsibilities || '',
        requiredSkills: postData.skillsRequired || postData.requiredSkills || [],
        registrationLink: postData.registrationLink || postData.applyLink || '',
        assessmentDate: postData.assessmentDate ? new Date(postData.assessmentDate) : undefined,
        interviewDate: postData.interviewDate ? new Date(postData.interviewDate) : undefined,
        joiningDate: postData.joiningDate ? new Date(postData.joiningDate) : undefined,
        eligibleSpecializations: postData.eligibilitySpecializations || [],
        attachments: postData.attachments || (postData.pdfAttachment ? [postData.pdfAttachment] : []),
        isPinned: postData.isPinned || false,
        visibility: postData.visibility || 'Public'
      });

      await placement.save();
      postData.relatedId = placement._id.toString();
      
      // Asynchronously notify eligible students
      process.nextTick(async () => {
        try {
          const students = await User.find({ role: 'student', college: postData.college });
          const notifications = [];
          for (const s of students) {
            const studentCGPA = s.cgpa || 0.0;
            const studentBacklogs = s.backlogs || 0;
            const studentDept = s.department || '';
            const studentYear = s.academicYear || '';
            const studentBatch = s.batch || '';

            const yearMatch = placement.eligibleYears.length === 0 || placement.eligibleYears.includes(studentYear);
            const deptMatch = placement.eligibleDepartments.length === 0 || 
                              placement.eligibleDepartments.includes("All Departments") || 
                              getDepartmentEquivalents(studentDept).some(d => placement.eligibleDepartments.includes(d));
            const cgpaMatch = studentCGPA >= placement.minimumCGPA;
            const backlogsMatch = studentBacklogs <= placement.maximumBacklogs;
            const batchMatch = placement.eligibleBatches.length === 0 || placement.eligibleBatches.includes(studentBatch);

            if (yearMatch && deptMatch && cgpaMatch && backlogsMatch && batchMatch) {
              notifications.push({
                userId: s.userId,
                type: 'placement',
                title: isIntern ? 'New Internship Opportunity' : 'New Placement Drive',
                body: `${placement.companyName} is hiring for ${placement.jobRole}. Click to apply!`,
                read: false,
                relatedId: placement._id.toString()
              });
            }
          }
          if (notifications.length > 0) {
            await Notification.insertMany(notifications);
          }
        } catch (err) {
          console.error('[Notification Engine] Error dispatching notifications:', err.message);
        }
      });
    }

    const newPost = new AdminPost(postData);
    await newPost.save();
    res.status(201).json({ success: true, data: newPost });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/posts - Get all admin posts (excluding trash)
router.get('/admin/posts', requireAuth, async (req, res) => {
  try {
    const { college } = req.query;
    let query = { status: { $ne: 'trash' } };
    if (college) {
      query.college = new RegExp(college, 'i');
    }
    const posts = await AdminPost.find(query).sort({ isPinned: -1, createdAt: -1 });
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/posts/trash - Get soft-deleted admin posts
router.get('/admin/posts/trash', requireAuth, async (req, res) => {
  try {
    const college = req.user.college || 'SR University';
    const query = { college, status: 'trash' };
    const posts = await AdminPost.find(query).sort({ deletedAt: -1 });
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/posts/:id - Edit an admin post
router.put('/admin/posts/:id', requireAuth, async (req, res) => {
  try {
    const post = await AdminPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Broadcast not found' });
    
    const updates = req.body;
    if (updates.description !== undefined) {
      updates.content = updates.content || updates.description || '';
    }
    Object.assign(post, updates);
    await post.save();

    // If it's linked to a Placement document, update the placement too
    if (post.relatedId) {
      const placement = await Placement.findById(post.relatedId);
      if (placement) {
        const isIntern = post.category === 'internship';
        let computedPackageVal = 0;
        const pkgStr = isIntern ? post.stipend : post.package;
        if (pkgStr) {
          const match = String(pkgStr).match(/(\d+(\.\d+)?)/);
          if (match) computedPackageVal = parseFloat(match[1]);
        }

        const expDate = post.expiryDate || post.registrationDeadline || post.lastDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        Object.assign(placement, {
          companyLogo: post.companyLogo || post.imageURL || '',
          companyName: post.companyName || placement.companyName,
          jobRole: post.jobRole || post.internshipRole || post.title,
          employmentType: isIntern ? 'Internship' : (post.employmentType || placement.employmentType),
          package: String(pkgStr || ''),
          packageVal: computedPackageVal,
          location: post.location || post.venue || placement.location,
          expiryDate: new Date(expDate),
          description: post.content || post.description || post.internshipDescription || '',
          eligibility: post.eligibility || '',
          eligibleYears: post.eligibilityAcademicYears || post.eligibleYears || [],
          eligibleDepartments: post.eligibilityDepartments || post.eligibleDepartments || [],
          minimumCGPA: post.eligibilityCGPA || post.minimumCGPA || 0.0,
          maximumBacklogs: post.eligibilityBacklogs || post.maximumBacklogs || 0,
          eligibleBatches: post.eligibilityBatch ? [post.eligibilityBatch] : (post.eligibleBatches || []),
          status: post.status,
          isPinned: post.isPinned || false,
          visibility: post.visibility || 'Public',
          companyWebsite: post.companyWebsite || '',
          workMode: post.workMode || post.internshipMode || 'Onsite',
          responsibilities: post.responsibilities || '',
          requiredSkills: post.skillsRequired || post.requiredSkills || [],
          registrationLink: post.registrationLink || post.applyLink || '',
          assessmentDate: post.assessmentDate ? new Date(post.assessmentDate) : undefined,
          interviewDate: post.interviewDate ? new Date(post.interviewDate) : undefined,
          joiningDate: post.joiningDate ? new Date(post.joiningDate) : undefined,
          eligibleSpecializations: post.eligibilitySpecializations || [],
          attachments: post.attachments || (post.pdfAttachment ? [post.pdfAttachment] : [])
        });
        await placement.save();
      }
    }

    // Increment version and record editor metadata
    post.version = (post.version || 1) + 1;
    post.updatedBy = req.user.userId;
    post.lastModifiedAt = new Date();
    await post.save();

    // Asynchronously notify students of the update
    process.nextTick(async () => {
      try {
        const students = await User.find({ role: 'student', college: post.college });
        const notifications = students.map(s => ({
          userId: s.userId,
          type: post.category === 'placement' || post.category === 'internship' ? 'placement' : 'announcement',
          title: 'Broadcast Updated 📝',
          body: `The broadcast "${post.title}" has been updated. Check details!`,
          read: false,
          relatedId: post._id.toString()
        }));
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      } catch (err) {
        console.error('[Notification Engine] Error dispatching update notifications:', err.message);
      }
    });

    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/posts/:id - Soft delete an admin post
router.delete('/admin/posts/:id', requireAuth, async (req, res) => {
  try {
    const post = await AdminPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Broadcast not found' });
    
    post.status = 'trash';
    post.deletedAt = new Date();
    await post.save();

    if (post.relatedId) {
      await Placement.findByIdAndUpdate(post.relatedId, { status: 'trash', deletedAt: new Date() });
    }

    res.json({ success: true, message: 'Broadcast moved to Trash successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/posts/:id/restore - Restore soft-deleted broadcast
router.post('/admin/posts/:id/restore', requireAuth, async (req, res) => {
  try {
    const post = await AdminPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Broadcast not found' });
    
    post.status = 'active';
    post.deletedAt = undefined;
    await post.save();

    if (post.relatedId) {
      await Placement.findByIdAndUpdate(post.relatedId, { status: 'active', deletedAt: undefined });
    }

    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/posts/:id/permanent-delete - Hard delete broadcast
router.post('/admin/posts/:id/permanent-delete', requireAuth, async (req, res) => {
  try {
    const post = await AdminPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Broadcast not found' });
    
    await AdminPost.findByIdAndDelete(req.params.id);
    if (post.relatedId) {
      await Placement.findByIdAndDelete(post.relatedId);
    }

    res.json({ success: true, message: 'Permanently deleted broadcast successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/posts/:id/pin - Toggle pin status
router.post('/admin/posts/:id/pin', requireAuth, async (req, res) => {
  try {
    const post = await AdminPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Broadcast not found' });
    
    post.isPinned = !post.isPinned;
    await post.save();

    if (post.relatedId) {
      await Placement.findByIdAndUpdate(post.relatedId, { isPinned: post.isPinned });
    }

    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/posts/:id/pause - Toggle pause status
router.post('/admin/posts/:id/pause', requireAuth, async (req, res) => {
  try {
    const post = await AdminPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Broadcast not found' });
    
    post.status = post.status === 'paused' ? 'active' : 'paused';
    await post.save();

    if (post.relatedId) {
      await Placement.findByIdAndUpdate(post.relatedId, { status: post.status });
    }

    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/posts/:id/duplicate - Duplicate broadcast
router.post('/admin/posts/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const original = await AdminPost.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, error: 'Broadcast not found' });
    
    const copy = new AdminPost(original.toObject());
    copy._id = new mongoose.Types.ObjectId();
    copy.isNew = true;
    copy.title = `${copy.title} (Copy)`;
    copy.createdAt = new Date();
    copy.updatedAt = new Date();

    if (original.relatedId) {
      const origPlacement = await Placement.findById(original.relatedId);
      if (origPlacement) {
        const copyPlacement = new Placement(origPlacement.toObject());
        copyPlacement._id = new mongoose.Types.ObjectId();
        copyPlacement.isNew = true;
        copyPlacement.companyName = `${copyPlacement.companyName} (Copy)`;
        copyPlacement.createdAt = new Date();
        copyPlacement.updatedAt = new Date();
        await copyPlacement.save();
        copy.relatedId = copyPlacement._id.toString();
      }
    }

    await copy.save();
    res.json({ success: true, data: copy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/posts/:id/track - Track action views, clicks, applications
router.post('/admin/posts/:id/track', requireAuth, async (req, res) => {
  try {
    const { action } = req.body;
    const post = await AdminPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Broadcast not found' });

    if (action === 'view') post.views = (post.views || 0) + 1;
    else if (action === 'click') post.clicks = (post.clicks || 0) + 1;
    else if (action === 'apply') post.applications = (post.applications || 0) + 1;
    await post.save();

    if (post.relatedId) {
      const placement = await Placement.findById(post.relatedId);
      if (placement) {
        if (action === 'view') placement.views = (placement.views || 0) + 1;
        else if (action === 'click') placement.clicks = (placement.clicks || 0) + 1;
        else if (action === 'apply') placement.applications = (placement.applications || 0) + 1;
        await placement.save();
      }
    }

    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Student Home Routes
// GET /api/student/home-feed - Get student home feed (admin posts only) with strict eligibility
router.get('/student/home-feed', requireAuth, async (req, res) => {
  try {
    const college = req.user.college || 'SR University';
    const { category } = req.query;

    let query = {
      college: new RegExp(college, 'i'),
      status: 'active'
    };

    if (category && category !== 'all') {
      if (category === 'event') {
        query.category = { $in: ['event', 'workshop', 'hackathon', 'club', 'events', 'clubs'] };
      } else if (category === 'notice') {
        query.category = { $in: ['notice', 'circular', 'update', 'academic_notice'] };
      } else {
        query.category = category;
      }
    }

    const feed = await AdminPost.find(query).sort({ isPinned: -1, createdAt: -1 });

    if (req.user.role === 'student') {
      const student = await User.findOne({ userId: req.user.userId });
      if (!student) {
        return res.status(404).json({ success: false, error: 'Student profile not found' });
      }

      const cgpa = student.cgpa || 0.0;
      const backlogs = student.backlogs || 0;
      const dept = student.department || '';
      const year = student.academicYear || '';
      const batch = student.batch || '';

      const filteredFeed = feed.filter(ann => {
        if (ann.category === 'emergency') return true;

        if (ann.category === 'placement' || ann.category === 'internship') {
          const years = ann.eligibilityAcademicYears || [];
          const depts = ann.eligibilityDepartments || [];
          const minCGPA = ann.eligibilityCGPA || 0;
          const maxBacklogs = ann.eligibilityBacklogs || 0;
          const annBatch = ann.eligibilityBatch || '';
          const annBatches = ann.eligibilityBatches || [];
          const annGender = ann.eligibilityGender || 'Everyone';
          const collegeSelect = ann.eligibilityCollegesSelection || 'Current College';

          const yearMatch = years.length === 0 || years.includes('All Years') || years.includes(year);
          const deptMatch = depts.length === 0 || 
                            depts.includes("All Departments") || 
                            getDepartmentEquivalents(student.department || '').some(d => depts.includes(d));
          const cgpaMatch = cgpa >= minCGPA;
          const backlogsMatch = backlogs <= maxBacklogs;
          const batchMatch = (annBatches.length === 0 || annBatches.includes('All Batches') || annBatches.includes(batch)) && (!annBatch || annBatch === batch);
          const genderMatch = annGender === 'Everyone' || annGender.toLowerCase() === (student.gender || '').toLowerCase();
          const collegeMatch = collegeSelect === 'All Connected Colleges' || ann.college === student.college;

          return yearMatch && deptMatch && cgpaMatch && backlogsMatch && batchMatch && genderMatch && collegeMatch;
        }

        return true;
      });

      return res.json({ success: true, data: filteredFeed });
    }

    res.json({ success: true, data: feed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Alumni Feed Routes (Moved above single profile route to avoid route precedence masking)

// GET /api/feed - Get student social feed (student posts only)
router.get('/feed', requireAuth, async (req, res) => {
  try {
    const { category, authorId } = req.query;
    const userId = req.user.userId;
    let query = {};
    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    if (authorId) {
      query.userId = authorId;
    }

    // Only fetch type = "student_post" (or undefined/exists: false for backward compatibility)
    query.$or = [
      { type: 'student_post' },
      { type: { $exists: false } }
    ];

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
router.post('/posts', requireAuth, async (req, res) => {
  try {
    const { content, isAnonymous, category, image } = req.body;
    const userId = req.user.userId;
    if (!content) {
      return res.status(400).json({ success: false, error: 'content is required' });
    }

    const author = await User.findOne({ userId });
    const newPost = new StudentPost({
      userId,
      college: req.user.college,
      authorName: author ? author.name : 'Unknown',
      authorAvatar: author ? (author.profileImageUrl || (author.photos && author.photos[0]) || '') : '',
      isAnonymous: !!isAnonymous,
      content,
      image: image || '',
      category: category || 'general',
      type: 'student_post'
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

    const postObj = await StudentPost.findById(postId);
    if (postObj && await isBlockedBetween(userId, postObj.userId)) {
      return res.status(403).json({ success: false, error: 'Cannot comment: User is blocked.' });
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

    if (action !== 'pass' && await isBlockedBetween(fromUserId, toUserId)) {
      return res.status(403).json({ success: false, error: 'Cannot connect: User is blocked.' });
    }

    if (action !== 'pass') {
      const recipient = await User.findOne({ userId: toUserId }) || await Alumni.findOne({ userId: toUserId });
      if (recipient) {
        const permissions = recipient.messagingPermissions || 'Everyone';
        if (permissions === 'Nobody') {
          return res.status(403).json({ success: false, error: 'Cannot connect: Receiver settings restrict direct contact.' });
        }
        if (permissions === 'Alumni Only') {
          const sender = await User.findOne({ userId: fromUserId }) || await Alumni.findOne({ userId: fromUserId });
          if (sender && sender.role !== 'alumni') {
            return res.status(403).json({ success: false, error: 'Cannot connect: Receiver only accepts requests from alumni.' });
          }
        }
      }
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
router.get('/discover', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all requests initiated by me, and accepted incoming requests to exclude
    const requests = await FriendRequest.find({ fromUserId: userId });
    const incomingAccepted = await FriendRequest.find({ toUserId: userId, status: 'accepted' });

    const excludedUserIds = new Set([userId]);
    requests.forEach(r => excludedUserIds.add(r.toUserId));
    incomingAccepted.forEach(r => excludedUserIds.add(r.fromUserId));

    // Exclude users blocked by current user or who blocked current user
    const currentUser = await User.findOne({ userId }) || await Alumni.findOne({ userId });
    if (currentUser && currentUser.blockedUsers) {
      currentUser.blockedUsers.forEach(id => excludedUserIds.add(id));
    }
    const usersBlockingMe = await User.find({ blockedUsers: userId });
    const alumniBlockingMe = await Alumni.find({ blockedUsers: userId });
    usersBlockingMe.forEach(u => excludedUserIds.add(u.userId));
    alumniBlockingMe.forEach(a => excludedUserIds.add(a.userId));

    const query = {
      userId: { $nin: Array.from(excludedUserIds) },
      role: 'student',
      profileDiscovery: { $ne: 'Hide from Search' }
    };

    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }

    const students = await User.find(query);

    const studentUser = await User.findOne({ userId });
    if (studentUser) {
      const myDept = studentUser.department || '';
      const myBatch = studentUser.batch || '';
      const myInterests = studentUser.interests || [];
      const mySkills = studentUser.skills || [];
      const myClubs = studentUser.clubs || [];

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
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /notifications/:id/read - Mark notification as read
router.post('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, error: 'Notification not found' });
    
    if (notif.userId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied: Cannot modify other user\'s notification.' });
    }
    
    notif.read = true;
    await notif.save();
    res.json({ success: true, data: notif });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/student/profile - Get student profile
router.get('/student/profile', requireAuth, async (req, res) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || req.user.userId;

    const profile = await User.findOne({ userId: targetUserId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    // College isolation check
    if (req.user.role !== 'super_admin' && profile.college !== req.user.college) {
      return res.status(403).json({ success: false, error: 'Access denied: Profile belongs to a different college.' });
    }

    if (!(await isProfileVisible(req.user.userId, profile.userId, profile))) {
      return res.status(403).json({ success: false, error: 'Access denied: Profile is private or restricted.' });
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
      careerGoals,
      onboardingCompleted,
      onboardingStep,
      cgpa,
      backlogs,
      academicYear
    } = req.body;
    if (!userId || !email) {
      return res.status(400).json({ success: false, error: 'userId and email are required' });
    }

    if (name) {
      const conflictForEmail = await checkEmailNameConflict(email, name, userId);
      if (conflictForEmail) {
        return res.status(400).json({ success: false, error: `This email ID already exists for ${conflictForEmail}` });
      }
      if (personalEmail) {
        const conflictForPersonalEmail = await checkEmailNameConflict(personalEmail, name, userId);
        if (conflictForPersonalEmail) {
          return res.status(400).json({ success: false, error: `This email ID already exists for ${conflictForPersonalEmail}` });
        }
      }
    }

    const updatePayload = {
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
      careerGoals: careerGoals || '',
      cgpa: typeof cgpa === 'number' ? cgpa : (cgpa ? parseFloat(cgpa) : 0.0),
      backlogs: typeof backlogs === 'number' ? backlogs : (backlogs ? parseInt(backlogs) : 0),
      academicYear: academicYear || ''
    };

    if (onboardingCompleted !== undefined) {
      updatePayload.onboardingCompleted = onboardingCompleted;
    }
    if (onboardingStep !== undefined) {
      updatePayload.onboardingStep = onboardingStep;
    }

    const profile = await User.findOneAndUpdate(
      { userId },
      updatePayload,
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
router.get('/connections', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const connections = await Connection.find({
      $or: [{ user1: userId }, { user2: userId }]
    });

    const matches = [];
    for (const conn of connections) {
      const otherUserId = conn.user1 === userId ? conn.user2 : conn.user1;
      let otherUser = await User.findOne({ userId: otherUserId }) || await Alumni.findOne({ userId: otherUserId });
      
      if (otherUser) {
        // College isolation check
        if (req.user.role !== 'super_admin' && otherUser.college !== req.user.college) {
          continue;
        }

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
router.post('/connections/:matchId/reveal', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const conn = await Connection.findById(matchId);
    if (!conn) return res.status(404).json({ success: false, error: 'Connection match not found' });

    // Verify ownership
    if (conn.user1 !== req.user.userId && conn.user2 !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not part of this connection.' });
    }

    conn.isRevealed = true;
    await conn.save();
    res.json({ success: true, data: conn });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /chats/:matchId/messages - Fetch direct messages for a connection match
router.get('/chats/:matchId/messages', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const conn = await Connection.findById(matchId);
    if (!conn || (conn.user1 !== req.user.userId && conn.user2 !== req.user.userId)) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not part of this connection.' });
    }

    // Verify college isolation on the other user
    const otherUserId = conn.user1 === req.user.userId ? conn.user2 : conn.user1;
    const otherUser = await User.findOne({ userId: otherUserId }) || await Alumni.findOne({ userId: otherUserId });
    if (req.user.role !== 'super_admin' && (!otherUser || otherUser.college !== req.user.college)) {
      return res.status(403).json({ success: false, error: 'Access denied: Connection belongs to a different college.' });
    }

    const list = await Message.find({ matchId }).sort({ timestamp: 1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /chats/:matchId/messages - Send direct message
router.post('/chats/:matchId/messages', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { text } = req.body;
    const senderId = req.user.userId;

    const conn = await Connection.findById(matchId);
    if (!conn || (conn.user1 !== senderId && conn.user2 !== senderId)) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not part of this connection.' });
    }

    const otherUserId = conn.user1 === senderId ? conn.user2 : conn.user1;
    const otherUser = await User.findOne({ userId: otherUserId }) || await Alumni.findOne({ userId: otherUserId });
    
    // College isolation check
    if (req.user.role !== 'super_admin' && (!otherUser || otherUser.college !== req.user.college)) {
      return res.status(403).json({ success: false, error: 'Access denied: Recipient belongs to a different college.' });
    }

    if (await isBlockedBetween(senderId, otherUserId)) {
      return res.status(403).json({ success: false, error: 'Cannot send message: This user is blocked.' });
    }
    const sender = await User.findOne({ userId: senderId }) || await Alumni.findOne({ userId: senderId });
    const senderRole = sender ? sender.role : 'student';
    if (!(await canMessage(senderId, senderRole, otherUserId))) {
      return res.status(403).json({ success: false, error: 'Cannot send message: Receiver settings restrict this action.' });
    }

    const newMsg = new Message({
      matchId,
      senderId,
      college: req.user.college,
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
router.post('/chats/:matchId/messages/:messageId/react', requireAuth, async (req, res) => {
  try {
    const { matchId, messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.userId;

    const conn = await Connection.findById(matchId);
    if (!conn || (conn.user1 !== userId && conn.user2 !== userId)) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not part of this connection.' });
    }

    const msg = await Message.findById(messageId);
    if (!msg || msg.matchId !== matchId) return res.status(404).json({ success: false, error: 'Message not found' });

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
router.post('/chats/:matchId/messages/:messageId/read', requireAuth, async (req, res) => {
  try {
    const { matchId, messageId } = req.params;
    const conn = await Connection.findById(matchId);
    if (!conn || (conn.user1 !== req.user.userId && conn.user2 !== req.user.userId)) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not part of this connection.' });
    }

    const msg = await Message.findById(messageId);
    if (!msg || msg.matchId !== matchId) return res.status(404).json({ success: false, error: 'Message not found' });

    msg.read = true;
    msg.status = 'seen';
    await msg.save();
    res.json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /groups - Fetch group chats the user is in
router.get('/groups', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const query = { members: userId };
    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }
    const list = await GroupChat.find(query).sort({ updatedAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /groups - Create a group chat (Circle)
router.post('/groups', requireAuth, async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    const createdBy = req.user.userId;
    
    // Validate that all members belong to the same college
    const allMemberIds = Array.from(new Set([createdBy, ...(memberIds || [])]));
    for (const mid of allMemberIds) {
      const memberObj = await User.findOne({ userId: mid }) || await Alumni.findOne({ userId: mid });
      if (req.user.role !== 'super_admin' && (!memberObj || memberObj.college !== req.user.college)) {
        return res.status(403).json({ success: false, error: 'Access denied: All group members must belong to the same college.' });
      }
    }

    const g = new GroupChat({
      name,
      college: req.user.college,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=group-${Date.now()}`,
      members: allMemberIds,
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
router.get('/groups/:groupId/messages', requireAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await GroupChat.findById(groupId);
    if (!group || !group.members.includes(req.user.userId)) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not a member of this group.' });
    }
    
    // College isolation check
    if (req.user.role !== 'super_admin' && group.college !== req.user.college) {
      return res.status(403).json({ success: false, error: 'Access denied: Group belongs to a different college.' });
    }

    const list = await GroupMessage.find({ groupId }).sort({ timestamp: 1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /groups/:groupId/messages - Send group message
router.post('/groups/:groupId/messages', requireAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text } = req.body;
    const senderId = req.user.userId;
    
    const group = await GroupChat.findById(groupId);
    if (!group || !group.members.includes(senderId)) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not a member of this group.' });
    }

    // College isolation check
    if (req.user.role !== 'super_admin' && group.college !== req.user.college) {
      return res.status(403).json({ success: false, error: 'Access denied: Group belongs to a different college.' });
    }

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
router.get('/stories', requireAuth, async (req, res) => {
  try {
    const query = { expiresAt: { $gt: new Date() } };
    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }
    const list = await Story.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /stories - Create a story
router.post('/stories', requireAuth, async (req, res) => {
  try {
    const { image, caption, type, textContent, bgColor } = req.body;
    const userId = req.user.userId;
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
      college: req.user.college,
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

// GET /api/config - Get application configuration flags
router.get('/config', (req, res) => {
  res.json({
    success: true,
    config: {
      moderationEnabled: process.env.MODERATION_ENABLED !== 'false'
    }
  });
});

// POST /api/alumni/posts/:postId/approve - Approve an alumni post
router.post('/alumni/posts/:postId/approve', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.postId, {
      approvalStatus: 'approved',
      status: 'approved',
      isPublished: true
    }, { new: true });
    
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/posts/:postId/reject - Reject an alumni post
router.post('/alumni/posts/:postId/reject', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.postId, {
      approvalStatus: 'rejected',
      status: 'rejected',
      isPublished: false
    }, { new: true });
    
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/:alumniId/approve - Approve an alumni profile
router.post('/alumni/:alumniId/approve', async (req, res) => {
  try {
    let profile = await Alumni.findOneAndUpdate({ userId: req.params.alumniId }, {
      approvalStatus: 'approved'
    }, { new: true });
    
    if (!profile && mongoose.Types.ObjectId.isValid(req.params.alumniId)) {
      profile = await Alumni.findByIdAndUpdate(req.params.alumniId, {
        approvalStatus: 'approved'
      }, { new: true });
    }
    
    if (!profile) return res.status(404).json({ success: false, error: 'Alumni profile not found' });
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/:alumniId/reject - Reject an alumni profile
router.post('/alumni/:alumniId/reject', async (req, res) => {
  try {
    let profile = await Alumni.findOneAndUpdate({ userId: req.params.alumniId }, {
      approvalStatus: 'rejected'
    }, { new: true });
    
    if (!profile && mongoose.Types.ObjectId.isValid(req.params.alumniId)) {
      profile = await Alumni.findByIdAndUpdate(req.params.alumniId, {
        approvalStatus: 'rejected'
      }, { new: true });
    }
    
    if (!profile) return res.status(404).json({ success: false, error: 'Alumni profile not found' });
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});



// GET /api/referrals - Get all referrals
router.get('/referrals', requireAuth, async (req, res) => {
  try {
    const query = {};
    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }
    const list = await Referral.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/public/referrals - Alias/Returns public referrals
router.get('/public/referrals', requireAuth, async (req, res) => {
  try {
    const query = {};
    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }
    const list = await Referral.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/student/referrals - Returns student-view referrals, support saved=true filter
router.get('/student/referrals', requireAuth, async (req, res) => {
  try {
    const { saved } = req.query;
    let query = {};
    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }
    if (saved === 'true') {
      query.saves = req.user.userId;
    }
    const list = await Referral.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to sync a Referral to its Post document
async function syncReferralToPost(referralId) {
  try {
    const referral = await Referral.findById(referralId);
    if (!referral) return;
    const post = await Post.findOne({ refId: referralId.toString() });
    if (post) {
      post.likes = referral.likes;
      
      // Map Referral comments to Post comments schema
      post.comments = referral.comments.map(c => ({
        userId: c.userId,
        userName: c.userName,
        userAvatar: c.userAvatar || '',
        content: c.content,
        createdAt: c.createdAt
      }));
      
      await post.save();
    }
  } catch (err) {
    console.error(`Sync error: ${err.message}`);
  }
}

// POST /api/referrals/:id/like - Toggle like on referral
router.post('/referrals/:id/like', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required to toggle like' });
    }
    const referral = await Referral.findById(req.params.id);
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }
    const index = referral.likes.indexOf(userId);
    if (index === -1) {
      referral.likes.push(userId);
    } else {
      referral.likes.splice(index, 1);
    }
    await referral.save();
    await syncReferralToPost(referral._id);
    res.json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/referrals/:id/save - Toggle save on referral
router.post('/referrals/:id/save', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required to toggle save' });
    }
    const referral = await Referral.findById(req.params.id);
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }
    const index = referral.saves.indexOf(userId);
    if (index === -1) {
      referral.saves.push(userId);
    } else {
      referral.saves.splice(index, 1);
    }
    await referral.save();
    res.json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/referrals/:id/comment - Add comment to referral
router.post('/referrals/:id/comment', async (req, res) => {
  try {
    const { userId, userName, userAvatar, content } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ success: false, error: 'userId and content are required' });
    }
    const referral = await Referral.findById(req.params.id);
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }
    const authorId = referral.alumniId || referral.authorId;
    if (await isBlockedBetween(userId, authorId)) {
      return res.status(403).json({ success: false, error: 'Cannot comment: User is blocked.' });
    }
    referral.comments.push({
      userId,
      userName: userName || 'User',
      userAvatar: userAvatar || '',
      content,
      createdAt: new Date()
    });
    await referral.save();
    await syncReferralToPost(referral._id);
    res.json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/referrals/:id/comment/:commentId - Delete own comment on referral
router.delete('/referrals/:id/comment/:commentId', async (req, res) => {
  try {
    const { userId } = req.body; // To verify ownership if needed, or simply delete by ID
    const referral = await Referral.findById(req.params.id);
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }
    const comment = referral.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }
    // Optional ownership check (if userId passed, compare it)
    if (userId && comment.userId !== userId) {
      return res.status(403).json({ success: false, error: 'You are not authorized to delete this comment' });
    }
    comment.deleteOne();
    await referral.save();
    await syncReferralToPost(referral._id);
    res.json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/referrals/:id/view - Increment views
router.post('/referrals/:id/view', async (req, res) => {
  try {
    const referral = await Referral.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
    if (!referral) return res.status(404).json({ success: false, error: 'Referral not found' });
    res.json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/referrals/:id/click - Increment clicks/app link clicks
router.post('/referrals/:id/click', async (req, res) => {
  try {
    const referral = await Referral.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } }, { new: true });
    if (!referral) return res.status(404).json({ success: false, error: 'Referral not found' });
    res.json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/referrals/:id/share - Increment share count
router.post('/referrals/:id/share', async (req, res) => {
  try {
    const referral = await Referral.findByIdAndUpdate(req.params.id, { $inc: { shares: 1 } }, { new: true });
    if (!referral) return res.status(404).json({ success: false, error: 'Referral not found' });
    res.json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/referrals/:id/apply - Increment applications count
router.post('/referrals/:id/apply', async (req, res) => {
  try {
    const referral = await Referral.findByIdAndUpdate(req.params.id, { $inc: { applications: 1 } }, { new: true });
    if (!referral) return res.status(404).json({ success: false, error: 'Referral not found' });
    res.json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------
// SETTINGS, BLOCKING, AND REPORTING ENDPOINTS
// ----------------------------------------------------

// 1. GET /api/users/search - Search users/alumni for blocking
router.get('/users/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }
    const regex = new RegExp(q, 'i');
    
    // Find matching students
    const students = await User.find({
      $or: [{ name: regex }, { email: regex }],
      userId: { $ne: req.user.userId }
    }).limit(10);

    // Find matching alumni
    const alumni = await Alumni.find({
      $or: [{ name: regex }, { email: regex }],
      userId: { $ne: req.user.userId }
    }).limit(10);

    const merged = [
      ...students.map(s => ({ userId: s.userId, name: s.name, email: s.email, role: 'student', profileImageUrl: s.profileImageUrl || '' })),
      ...alumni.map(a => ({ userId: a.userId, name: a.name, email: a.email, role: 'alumni', profileImageUrl: a.profileImageUrl || '' }))
    ];

    res.json({ success: true, data: merged });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST /api/users/block - Block a user
router.post('/users/block', requireAuth, async (req, res) => {
  try {
    const { userIdToBlock } = req.body;
    if (!userIdToBlock) {
      return res.status(400).json({ success: false, error: 'userIdToBlock is required' });
    }

    const currentUserId = req.user.userId;
    const role = req.user.role;

    if (role === 'alumni') {
      await Alumni.findOneAndUpdate({ userId: currentUserId }, { $addToSet: { blockedUsers: userIdToBlock } });
    } else {
      await User.findOneAndUpdate({ userId: currentUserId }, { $addToSet: { blockedUsers: userIdToBlock } });
    }

    res.json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. POST /api/users/unblock - Unblock a user
router.post('/users/unblock', requireAuth, async (req, res) => {
  try {
    const { userIdToUnblock } = req.body;
    if (!userIdToUnblock) {
      return res.status(400).json({ success: false, error: 'userIdToUnblock is required' });
    }

    const currentUserId = req.user.userId;
    const role = req.user.role;

    if (role === 'alumni') {
      await Alumni.findOneAndUpdate({ userId: currentUserId }, { $pull: { blockedUsers: userIdToUnblock } });
    } else {
      await User.findOneAndUpdate({ userId: currentUserId }, { $pull: { blockedUsers: userIdToUnblock } });
    }

    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. POST /api/users/report - Report a user
router.post('/users/report', requireAuth, async (req, res) => {
  try {
    const { reportedUserId, type, reason, description } = req.body;
    if (!reportedUserId || !type) {
      return res.status(400).json({ success: false, error: 'reportedUserId and type are required' });
    }

    // Optional details check
    let reportedNameOrEmail = '';
    const reportedUser = await User.findOne({ userId: reportedUserId }) || await Alumni.findOne({ userId: reportedUserId });
    if (reportedUser) {
      reportedNameOrEmail = reportedUser.name || reportedUser.email || '';
    }

    const report = new Report({
      reporterId: req.user.userId,
      reportedUserId,
      reportedNameOrEmail,
      type,
      reason: reason || description || ''
    });

    await report.save();
    res.json({ success: true, message: 'Report submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. GET /api/admin/reports - Get all reports (Admin)
router.get('/admin/reports', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }

    const reports = await Report.find({}).sort({ createdAt: -1 });
    
    // Add additional details like reporter/reported name/email
    const detailedReports = await Promise.all(reports.map(async (rep) => {
      const repObj = rep.toObject();
      const reporter = await User.findOne({ userId: rep.reporterId }) || await Alumni.findOne({ userId: rep.reporterId });
      const reported = await User.findOne({ userId: rep.reportedUserId }) || await Alumni.findOne({ userId: rep.reportedUserId });
      
      repObj.reporter = reporter ? { name: reporter.name, email: reporter.email, role: reporter.role } : null;
      repObj.reported = reported ? { name: reported.name, email: reported.email, role: reported.role, isSuspended: reported.isSuspended || false } : null;
      
      return repObj;
    }));

    res.json({ success: true, data: detailedReports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. POST /api/admin/reports/:id/resolve - Resolve report and optionally take actions
router.post('/admin/reports/:id/resolve', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }

    const { action } = req.body; // 'suspend' or 'dismiss'
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    if (action === 'suspend' && report.reportedUserId) {
      // Suspend in User or Alumni
      await User.findOneAndUpdate({ userId: report.reportedUserId }, { isSuspended: true });
      await Alumni.findOneAndUpdate({ userId: report.reportedUserId }, { isSuspended: true });
    }

    await Report.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Report resolved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. GET /api/privacy-settings - Get privacy settings
router.get('/privacy-settings', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const role = req.user.role;
    let profile = null;

    if (role === 'alumni') {
      profile = await Alumni.findOne({ userId: currentUserId });
    } else {
      profile = await User.findOne({ userId: currentUserId });
    }

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    const blockedUsersDetails = await Promise.all((profile.blockedUsers || []).map(async (blockedId) => {
      const u = await User.findOne({ userId: blockedId }) || await Alumni.findOne({ userId: blockedId });
      return u ? { userId: u.userId, name: u.name, email: u.email, role: u.role || 'student', profileImageUrl: u.profileImageUrl || u.profileImage || '' } : { userId: blockedId, name: 'Unknown User', email: '', role: 'student', profileImageUrl: '' };
    }));

    const settings = {
      profileVisibility: profile.profileVisibility || 'Public',
      messagingPermissions: profile.messagingPermissions || 'Everyone',
      profileDiscovery: profile.profileDiscovery || 'Show in Search',
      showPosts: profile.showPosts !== false,
      showReferrals: profile.showReferrals !== false,
      showAchievements: profile.showAchievements !== false,
      referralAlerts: profile.referralAlerts !== false,
      messageAlerts: profile.messageAlerts !== false,
      blockedUsers: blockedUsersDetails
    };

    res.json({ success: true, privacySettings: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. PUT /api/privacy-settings - Update privacy settings
router.put('/privacy-settings', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const role = req.user.role;
    const settings = req.body;

    const updateFields = {
      profileVisibility: settings.profileVisibility,
      messagingPermissions: settings.messagingPermissions,
      profileDiscovery: settings.profileDiscovery,
      showPosts: settings.showPosts,
      showReferrals: settings.showReferrals,
      showAchievements: settings.showAchievements,
      referralAlerts: settings.referralAlerts,
      messageAlerts: settings.messageAlerts
    };

    let updated = null;
    if (role === 'alumni') {
      updated = await Alumni.findOneAndUpdate({ userId: currentUserId }, { $set: updateFields }, { new: true });
    } else {
      updated = await User.findOneAndUpdate({ userId: currentUserId }, { $set: updateFields }, { new: true });
    }

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    res.json({ success: true, message: 'Privacy settings updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. POST /api/support-tickets - Submit a support ticket
router.post('/support-tickets', requireAuth, async (req, res) => {
  try {
    const { subject, description } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ success: false, error: 'Subject and description are required' });
    }

    const currentUserId = req.user.userId;
    const role = req.user.role;
    let user = null;

    if (role === 'alumni') {
      user = await Alumni.findOne({ userId: currentUserId });
    } else {
      user = await User.findOne({ userId: currentUserId });
    }

    const ticket = new SupportTicket({
      userId: currentUserId,
      name: user ? user.name : 'Unknown User',
      email: user ? user.email : 'unknown@college.edu',
      subject,
      description,
      status: 'Open',
      replies: []
    });

    await ticket.save();
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. GET /api/support-tickets - Get tickets for current user
router.get('/support-tickets', requireAuth, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. GET /api/admin/support-tickets - Get all support tickets (Admin)
router.get('/admin/support-tickets', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }

    const tickets = await SupportTicket.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. PUT /api/admin/support-tickets/:id - Reply/Update status (Admin)
router.put('/admin/support-tickets/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }

    const { reply, status } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    if (status) {
      ticket.status = status;
    }

    if (reply) {
      ticket.replies.push({
        senderId: req.user.userId,
        senderName: 'Campus Admin',
        message: reply,
        createdAt: new Date()
      });
      // Automatically advance status if admin replies and it is still 'Open'
      if (ticket.status === 'Open') {
        ticket.status = 'In Progress';
      }
    }

    await ticket.save();
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Seeding helper for FAQs
async function seedFAQs() {
  const count = await FAQ.countDocuments();
  if (count === 0) {
    const initialFAQs = [
      { category: 'Account Issues', question: 'How do I change my profile picture?', answer: 'Navigate to your Profile Page, click the edit icon on your avatar, and upload a new image.' },
      { category: 'Account Issues', question: 'How do I update my skills?', answer: 'Go to your Profile Page, click Edit Profile, and add or remove skills in the skills section.' },
      { category: 'Login Problems', question: 'Why am I not receiving the OTP?', answer: 'Check your spam folder. Ensure you are using your official college email address. OTPs expire in 5 minutes.' },
      { category: 'Alumni Verification', question: 'How is my alumni status verified?', answer: 'We match your personal email, roll number, and batch against official college records. If they do not match, please contact administration.' },
      { category: 'Referrals', question: 'Who can apply to a referral?', answer: 'Students can view referrals and click the "Apply Now" button to submit their details directly via the application link provided by the alumni.' },
      { category: 'Messaging', question: 'Can I message someone who is not connected?', answer: 'You can only message connections you have matched with on the platform.' }
    ];
    await FAQ.insertMany(initialFAQs);
    console.log('🌱 FAQs seeded successfully!');
  }
}

// 13. GET /api/faqs - Get all FAQs with seeding
router.get('/faqs', async (req, res) => {
  try {
    await seedFAQs();
    const faqs = await FAQ.find({}).sort({ category: 1 });
    res.json({ success: true, data: faqs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 14. POST /api/feature-requests - Submit a feature request or bug report
router.post('/feature-requests', requireAuth, async (req, res) => {
  try {
    const { type, description, deviceInfo, screenshot } = req.body;
    if (!type || !description) {
      return res.status(400).json({ success: false, error: 'Type and description are required' });
    }

    const request = new FeatureRequest({
      userId: req.user.userId,
      type,
      description,
      deviceInfo: deviceInfo || {},
      screenshot: screenshot || '',
      status: 'Pending'
    });

    await request.save();
    res.json({ success: true, message: 'Submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ====================================================
// SESSION MANAGEMENT ROUTES
// ====================================================

// 1. GET /api/auth/sessions - List active sessions for user
router.get('/auth/sessions', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentSessionId = req.user.sessionId;
    
    const sessions = await Session.find({ userId }).sort({ lastActiveAt: -1 });
    
    const mappedSessions = sessions.map(sess => {
      const sessObj = sess.toObject();
      sessObj.isCurrentDevice = sess.sessionId === currentSessionId;
      return sessObj;
    });
    
    res.json({ success: true, sessions: mappedSessions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST /api/auth/sessions/:sessionId/revoke - Revoke a specific session
router.post('/auth/sessions/:sessionId/revoke', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.params;
    
    // Revoke by deleting the session
    const result = await Session.deleteOne({ sessionId, userId });
    
    // Log security event
    await SecurityLog.create({
      userId,
      email: req.user.email,
      event: 'session_revocation',
      status: result.deletedCount > 0 ? 'success' : 'failure',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      details: { revokedSessionId: sessionId }
    });

    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. POST /api/auth/sessions/revoke-all - Revoke all other sessions
router.post('/auth/sessions/revoke-all', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentSessionId = req.user.sessionId;
    
    const result = await Session.deleteMany({
      userId,
      sessionId: { $ne: currentSessionId }
    });
    
    // Log security event
    await SecurityLog.create({
      userId,
      email: req.user.email,
      event: 'all_sessions_revocation',
      status: 'success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      details: { count: result.deletedCount }
    });

    res.json({ success: true, message: `Successfully revoked ${result.deletedCount} other sessions` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ====================================================
// ADMIN MODERATION & COLLEGE DOMAIN MANAGEMENT
// ====================================================

// 1. GET /api/admin/alumni-verifications - Get pending alumni verifications
router.get('/admin/alumni-verifications', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    
    const verifications = await AlumniVerification.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: verifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST /api/admin/alumni-verifications/:id/approve - Approve alumni
router.post('/admin/alumni-verifications/:id/approve', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    
    const verification = await AlumniVerification.findById(req.params.id);
    if (!verification) {
      return res.status(404).json({ success: false, error: 'Verification record not found' });
    }
    
    verification.status = 'approved';
    verification.verifiedAt = new Date();
    verification.verifiedBy = req.user.email || 'admin';
    await verification.save();
    
    // Update alumni profile
    await Alumni.findOneAndUpdate(
      { userId: verification.userId },
      { approvalStatus: 'approved' }
    );
    
    // Log security event
    await SecurityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      event: 'alumni_approve',
      status: 'success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      details: { approvedUserId: verification.userId, approvedUserEmail: verification.email }
    });

    res.json({ success: true, message: 'Alumni verification approved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. POST /api/admin/alumni-verifications/:id/reject - Reject alumni
router.post('/admin/alumni-verifications/:id/reject', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    
    const verification = await AlumniVerification.findById(req.params.id);
    if (!verification) {
      return res.status(404).json({ success: false, error: 'Verification record not found' });
    }
    
    verification.status = 'rejected';
    verification.verifiedAt = new Date();
    verification.verifiedBy = req.user.email || 'admin';
    await verification.save();
    
    // Update alumni profile
    await Alumni.findOneAndUpdate(
      { userId: verification.userId },
      { approvalStatus: 'rejected' }
    );
    
    // Log security event
    await SecurityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      event: 'alumni_reject',
      status: 'success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      details: { rejectedUserId: verification.userId, rejectedUserEmail: verification.email }
    });

    res.json({ success: true, message: 'Alumni verification rejected' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. GET /api/admin/security-logs - Get security events audit log (Legacy/Alias)
router.get('/admin/security-logs', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    
    const logs = await SecurityLog.find({}).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/security/metrics - Get security metrics for dashboard
router.get('/admin/security/metrics', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }

    // 1. Total failed logins count
    const failedLoginsResult = await LoginAttempt.aggregate([
      { $group: { _id: null, total: { $sum: "$attempts" } } }
    ]);
    const totalFailedLogins = failedLoginsResult.length > 0 ? failedLoginsResult[0].total : 0;

    // 2. Active lockouts count
    const activeLockouts = await LoginAttempt.countDocuments({ lockUntil: { $gt: new Date() } });

    // 3. Active sessions count
    const activeSessions = await Session.countDocuments({ expiresAt: { $gt: new Date() } });

    // 4. OTP requests count in the last 24 hours
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const otpRequestsRecent = await OTP.countDocuments({ createdAt: { $gt: last24h } });

    // 5. Total users count
    const totalStudents = await User.countDocuments();
    const totalAlumni = await Alumni.countDocuments();

    // 6. Security events breakdown (last 7 days)
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const eventsBreakdown = await SecurityLog.aggregate([
      { $match: { createdAt: { $gt: last7Days } } },
      { $group: { _id: "$event", count: { $sum: 1 }, successCount: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } }, failureCount: { $sum: { $cond: [{ $eq: ["$status", "failure"] }, 1, 0] } } } }
    ]);

    // 7. Recent critical alerts (recent failures)
    const recentAlerts = await SecurityLog.find({ status: 'failure' })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        totalFailedLogins,
        activeLockouts,
        activeSessions,
        otpRequestsRecent,
        totalUsers: totalStudents + totalAlumni,
        eventsBreakdown,
        recentAlerts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/security/logs - Get paged security audit logs
router.get('/admin/security/logs', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }

    const { page = 1, limit = 50, event, status, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let query = {};
    if (event) query.event = event;
    if (status) query.status = status;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { email: searchRegex },
        { ipAddress: searchRegex },
        { event: searchRegex },
        { userAgent: searchRegex }
      ];
    }

    const total = await SecurityLog.countDocuments(query);
    const logs = await SecurityLog.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. GET /api/admin/colleges - List allowed colleges
router.get('/admin/colleges', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    
    const colleges = await CollegeDomain.find({}).sort({ name: 1 });
    res.json({ success: true, data: colleges });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. POST /api/admin/colleges - Add a new allowed college domain
router.post('/admin/colleges', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    
    const { name, domain } = req.body;
    if (!name || !domain) {
      return res.status(400).json({ success: false, error: 'College Name and Domain are required' });
    }
    
    const normalizedDomain = domain.toLowerCase().trim();
    
    const existing = await CollegeDomain.findOne({ domain: normalizedDomain });
    if (existing) {
      return res.status(400).json({ success: false, error: 'This domain registry entry already exists' });
    }
    
    const newCollege = new CollegeDomain({
      name: name.trim(),
      domain: normalizedDomain
    });
    await newCollege.save();
    
    // Log security event
    await SecurityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      event: 'add_college_domain',
      status: 'success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      details: { collegeName: name, domain: normalizedDomain }
    });

    res.json({ success: true, message: 'College domain added successfully', data: newCollege });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. PUT /api/admin/colleges/:id - Update college domain details (Admin only)
router.put('/admin/colleges/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    
    const college = await CollegeDomain.findById(req.params.id);
    if (!college) {
      return res.status(404).json({ success: false, error: 'College Domain entry not found' });
    }
    
    const { name, domain, status, logoURL, adminContact } = req.body;
    if (name) college.name = name.trim();
    if (domain) college.domain = domain.toLowerCase().trim();
    if (status) college.status = status;
    if (logoURL !== undefined) college.logoURL = logoURL;
    if (adminContact !== undefined) college.adminContact = adminContact;
    
    await college.save();
    
    // Log security event
    await SecurityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      event: 'update_college_domain',
      status: 'success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      details: { collegeId: college._id, collegeName: college.name, domain: college.domain }
    });

    res.json({ success: true, message: 'College domain updated successfully', data: college });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. DELETE /api/admin/colleges/:id - Delete a college domain entry (Admin only)
router.delete('/admin/colleges/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    
    const college = await CollegeDomain.findByIdAndDelete(req.params.id);
    if (!college) {
      return res.status(404).json({ success: false, error: 'College Domain entry not found' });
    }
    
    // Log security event
    await SecurityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      event: 'delete_college_domain',
      status: 'success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      details: { collegeName: college.name, domain: college.domain }
    });

    res.json({ success: true, message: 'College domain registry entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// PLACEMENTS SECTION - ENTERPRISE ENGINE
// ==========================================

// Helper: Get department equivalents to resolve profile course vs target audience variations
function getDepartmentEquivalents(dept) {
  if (!dept) return [];
  const normalized = dept.toLowerCase().trim();
  if (normalized.includes('computer science') || normalized === 'cse' || normalized.includes('cse')) {
    return ['Computer Science', 'CSE', 'CSE (Core)'];
  }
  if (normalized.includes('mechanical')) {
    return ['Mechanical', 'Mechanical Engineering'];
  }
  if (normalized.includes('electrical') || normalized === 'eee' || normalized.includes('eee')) {
    return ['Electrical', 'Electrical Engineering', 'EEE'];
  }
  if (normalized.includes('electronics') || normalized === 'ece' || normalized.includes('ece')) {
    return ['Electronics', 'ECE'];
  }
  if (normalized.includes('civil')) {
    return ['Civil'];
  }
  if (normalized.includes('data science') || normalized.includes('data_science')) {
    return ['Data Science', 'Data Science & AI'];
  }
  if (normalized === 'aiml' || normalized.includes('ai')) {
    return ['AIML', 'Artificial Intelligence'];
  }
  if (normalized === 'it' || normalized.includes('information technology')) {
    return ['IT', 'Information Technology'];
  }
  return [dept];
}

// Helper: Auto-archive expired placements before querying
async function archiveExpiredPlacements(college) {
  try {
    const result = await Placement.updateMany(
      { college, status: 'active', expiryDate: { $lte: new Date() } },
      { $set: { status: 'archived' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[Auto-Archive] Archived ${result.modifiedCount} expired placements for college: ${college}`);
    }
  } catch (err) {
    console.error('[Auto-Archive] Failed to archive expired placements:', err.message);
  }
}

// 1. GET /api/placements - Get eligible placements with search, filters, sorting
router.get('/placements', requireAuth, async (req, res) => {
  try {
    const college = req.user.college || 'SR University';
    
    // Auto-archive expired ones first
    await archiveExpiredPlacements(college);

    const { tab, search, filters, page = 1, limit = 20 } = req.query;
    if (!tab || (tab !== 'admin' && tab !== 'alumni')) {
      return res.status(400).json({ success: false, error: 'Query parameter tab (admin or alumni) is required' });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Core query: restrict by college and status
    const query = {
      college,
      status: 'active',
      createdByRole: tab === 'admin' ? 'Admin' : 'Alumni'
    };

    // Strict Visibility Filtering for Students
    if (req.user.role === 'student') {
      const student = await User.findOne({ userId: req.user.userId });
      if (!student) {
        return res.status(404).json({ success: false, error: 'Student profile not found' });
      }

      const cgpa = student.cgpa || 0.0;
      const backlogs = student.backlogs || 0;
      const dept = student.department || '';
      const year = student.academicYear || '';
      const batch = student.batch || '';

      query.$and = [
        // Year match: empty means open to all, or exact match
        {
          $or: [
            { eligibleYears: { $exists: false } },
            { eligibleYears: { $size: 0 } },
            { eligibleYears: year }
          ]
        },
        // Department match: empty or "All Departments" means open to all
        {
          $or: [
            { eligibleDepartments: { $exists: false } },
            { eligibleDepartments: { $size: 0 } },
            { eligibleDepartments: "All Departments" },
            { eligibleDepartments: { $in: getDepartmentEquivalents(dept) } }
          ]
        },
        // CGPA match
        {
          $or: [
            { minimumCGPA: { $exists: false } },
            { minimumCGPA: null },
            { minimumCGPA: { $lte: cgpa } }
          ]
        },
        // Backlogs match
        {
          $or: [
            { maximumBacklogs: { $exists: false } },
            { maximumBacklogs: null },
            { maximumBacklogs: { $gte: backlogs } }
          ]
        },
        // Batch match
        {
          $or: [
            { eligibleBatches: { $exists: false } },
            { eligibleBatches: { $size: 0 } },
            { eligibleBatches: batch }
          ]
        }
      ];
    }

    // Search query
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchConditions = [
        { companyName: searchRegex },
        { jobRole: searchRegex },
        { description: searchRegex },
        { location: searchRegex }
      ];
      if (tab === 'alumni') {
        searchConditions.push({ createdByName: searchRegex });
      }
      
      if (query.$and) {
        query.$and.push({ $or: searchConditions });
      } else {
        query.$or = searchConditions;
      }
    }

    // Advanced Filters
    if (filters) {
      const filterArray = filters.split(',');
      
      // Employment type filters
      const jobTypes = [];
      if (filterArray.includes('Internship')) jobTypes.push('Internship');
      if (filterArray.includes('Full Time')) jobTypes.push('Full Time');
      if (filterArray.includes('Internship + PPO')) jobTypes.push('Internship + PPO');
      if (filterArray.includes('Contract')) jobTypes.push('Contract');
      if (jobTypes.length > 0) {
        query.employmentType = { $in: jobTypes };
      }

      // Location filters
      const locConditions = [];
      if (filterArray.includes('Remote')) locConditions.push({ location: /remote/i });
      if (filterArray.includes('Hybrid')) locConditions.push({ location: /hybrid/i });
      if (filterArray.includes('Onsite')) locConditions.push({ location: /^(?!.*remote)(?!.*hybrid).*$/i }); // not remote/hybrid
      if (locConditions.length > 0) {
        if (query.$and) {
          query.$and.push({ $or: locConditions });
        } else {
          query.$or = (query.$or || []).concat(locConditions);
        }
      }

      // Referral availability
      if (filterArray.includes('Referral Available')) {
        query.referralAvailable = true;
      }
    }

    // Sorting definition
    let sortOptions = { createdAt: -1 }; // default newest
    if (filters) {
      const filterArray = filters.split(',');
      if (filterArray.includes('Closing Soon')) {
        sortOptions = { expiryDate: 1 };
      } else if (filterArray.includes('High Package')) {
        sortOptions = { packageVal: -1 };
      } else if (filterArray.includes('Newest')) {
        sortOptions = { createdAt: -1 };
      }
    }

    const total = await Placement.countDocuments(query);
    const placements = await Placement.find(query)
      .sort(sortOptions)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      success: true,
      data: placements,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. GET /api/placements/:id - Get specific placement details with eligibility check
router.get('/placements/:id', requireAuth, async (req, res) => {
  try {
    const placement = await Placement.findById(req.params.id);
    if (!placement) {
      return res.status(404).json({ success: false, error: 'Placement opportunity not found' });
    }

    // Strict eligibility check for students trying to load details
    if (req.user.role === 'student') {
      const student = await User.findOne({ userId: req.user.userId });
      if (!student) {
        return res.status(404).json({ success: false, error: 'Student profile not found' });
      }

      const cgpa = student.cgpa || 0.0;
      const backlogs = student.backlogs || 0;
      const dept = student.department || '';
      const year = student.academicYear || '';
      const batch = student.batch || '';

      const yearMatch = placement.eligibleYears.length === 0 || placement.eligibleYears.includes(year);
      const deptMatch = placement.eligibleDepartments.length === 0 || 
                        placement.eligibleDepartments.includes("All Departments") || 
                        getDepartmentEquivalents(dept).some(d => placement.eligibleDepartments.includes(d));
      const cgpaMatch = placement.minimumCGPA === undefined || placement.minimumCGPA === null || cgpa >= placement.minimumCGPA;
      const backlogsMatch = placement.maximumBacklogs === undefined || placement.maximumBacklogs === null || backlogs <= placement.maximumBacklogs;
      const batchMatch = placement.eligibleBatches.length === 0 || placement.eligibleBatches.includes(batch);

      if (!yearMatch || !deptMatch || !cgpaMatch || !backlogsMatch || !batchMatch) {
        return res.status(403).json({ success: false, error: 'Access denied: You are not eligible for this placement opportunity' });
      }
    }

    res.json({ success: true, data: placement });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/placements/preview-count - Calculate eligible students dynamically
router.post('/placements/preview-count', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'alumni') {
      return res.status(403).json({ success: false, error: 'Access denied: Unauthorized access' });
    }
    const college = req.user.college || 'SR University';
    const { eligibleYears, eligibleDepartments, minimumCGPA, maximumBacklogs, eligibleBatches } = req.body;
    
    const query = {
      role: 'student',
      college
    };

    const andConditions = [];

    if (eligibleYears && eligibleYears.length > 0) {
      andConditions.push({ academicYear: { $in: eligibleYears } });
    }
    
    if (eligibleDepartments && eligibleDepartments.length > 0 && !eligibleDepartments.includes('All Departments')) {
      const equivalents = eligibleDepartments.flatMap(d => getDepartmentEquivalents(d));
      andConditions.push({ department: { $in: equivalents } });
    }

    if (minimumCGPA !== undefined && minimumCGPA !== null && minimumCGPA > 0) {
      andConditions.push({ cgpa: { $gte: parseFloat(minimumCGPA) } });
    }

    if (maximumBacklogs !== undefined && maximumBacklogs !== null && maximumBacklogs !== 'No Restriction' && maximumBacklogs !== '') {
      andConditions.push({ backlogs: { $lte: parseInt(maximumBacklogs) } });
    }

    if (eligibleBatches && eligibleBatches.length > 0) {
      andConditions.push({ batch: { $in: eligibleBatches } });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const count = await User.countDocuments(query);
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. POST /api/placements - Create placement post (Admins & Verified Alumni)
router.post('/placements', requireAuth, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.userId;
    const college = req.user.college || 'SR University';

    if (role !== 'admin' && role !== 'alumni') {
      return res.status(403).json({ success: false, error: 'Access denied: Only Admins and Alumni can post placement opportunities' });
    }

    // If alumni, check verification status
    let createdByName = 'Campus Admin';
    if (role === 'alumni') {
      const alumni = await Alumni.findOne({ userId });
      if (!alumni || alumni.approvalStatus !== 'approved') {
        return res.status(403).json({ success: false, error: 'Access denied: Only verified alumni are allowed to create posts' });
      }
      createdByName = alumni.name;
    }

    const {
      companyName,
      companyLogo,
      jobRole,
      employmentType,
      package: packageStr,
      packageVal,
      location,
      expiryDate,
      description,
      eligibility,
      eligibleYears,
      eligibleDepartments,
      minimumCGPA,
      maximumBacklogs,
      eligibleBatches,
      eligibleSections,
      contactAlumni
    } = req.body;

    if (!companyName || !jobRole || !employmentType || !expiryDate) {
      return res.status(400).json({ success: false, error: 'CompanyName, JobRole, EmploymentType, and ExpiryDate are required' });
    }

    // Auto-calculate numeric package value for sorting
    let computedPackageVal = 0;
    if (packageVal) {
      computedPackageVal = parseFloat(packageVal);
    } else if (packageStr) {
      const match = packageStr.match(/(\d+(\.\d+)?)/);
      if (match) computedPackageVal = parseFloat(match[1]);
    }

    const placement = new Placement({
      companyName,
      companyLogo: companyLogo || '',
      jobRole,
      employmentType,
      package: packageStr || '',
      packageVal: computedPackageVal,
      location: location || 'Onsite',
      expiryDate: new Date(expiryDate),
      description: description || '',
      eligibility: eligibility || '',
      eligibleYears: eligibleYears || [],
      eligibleDepartments: eligibleDepartments || [],
      minimumCGPA: minimumCGPA ? parseFloat(minimumCGPA) : 0.0,
      maximumBacklogs: maximumBacklogs ? parseInt(maximumBacklogs) : 0,
      eligibleBatches: eligibleBatches || [],
      eligibleSections: eligibleSections || [],
      createdBy: userId,
      createdByName,
      createdByRole: role === 'admin' ? 'Admin' : 'Alumni',
      isVerified: true, // Auto-verified since posting requires correct role authorization
      referralAvailable: role === 'alumni', // Alumni post defaults to Referral Available
      contactAlumni: contactAlumni || '',
      college,
      status: 'active'
    });

    await placement.save();

    // Notify only eligible students asynchronously
    process.nextTick(async () => {
      try {
        const studentQuery = {
          role: 'student',
          college
        };

        const students = await User.find(studentQuery);
        const notificationsToInsert = [];

        for (const student of students) {
          const studentCGPA = student.cgpa || 0.0;
          const studentBacklogs = student.backlogs || 0;
          const studentDept = student.department || '';
          const studentYear = student.academicYear || '';
          const studentBatch = student.batch || '';

          const yearMatch = placement.eligibleYears.length === 0 || placement.eligibleYears.includes(studentYear);
          const deptMatch = placement.eligibleDepartments.length === 0 || 
                            placement.eligibleDepartments.includes("All Departments") || 
                            getDepartmentEquivalents(studentDept).some(d => placement.eligibleDepartments.includes(d));
          const cgpaMatch = placement.minimumCGPA === undefined || placement.minimumCGPA === null || studentCGPA >= placement.minimumCGPA;
          const backlogsMatch = placement.maximumBacklogs === undefined || placement.maximumBacklogs === null || studentBacklogs <= placement.maximumBacklogs;
          const batchMatch = placement.eligibleBatches.length === 0 || placement.eligibleBatches.includes(studentBatch);

          if (yearMatch && deptMatch && cgpaMatch && backlogsMatch && batchMatch) {
            notificationsToInsert.push({
              userId: student.userId,
              type: role === 'admin' ? 'placement' : 'referral',
              title: role === 'admin' ? 'New Placement Drive' : 'New Referral Opportunity',
              body: `${placement.companyName} is hiring for a ${placement.jobRole} (${placement.employmentType}). Click to apply!`,
              read: false,
              relatedId: placement._id.toString()
            });
          }
        }

        if (notificationsToInsert.length > 0) {
          await Notification.insertMany(notificationsToInsert);
          console.log(`[Notification Engine] Dispatched ${notificationsToInsert.length} eligible notifications for Placement ID: ${placement._id}`);
        }
      } catch (err) {
        console.error('[Notification Engine] Failed to dispatch notifications:', err.message);
      }
    });

    res.status(201).json({ success: true, data: placement });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. DELETE /api/placements/:id - Soft delete a placement opportunity (Creator/Admin only)
router.delete('/placements/:id', requireAuth, async (req, res) => {
  try {
    const placement = await Placement.findById(req.params.id);
    if (!placement) {
      return res.status(404).json({ success: false, error: 'Placement opportunity not found' });
    }

    if (req.user.role !== 'admin' && placement.createdBy !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not authorized to delete this opportunity' });
    }

    placement.status = 'trash';
    placement.deletedAt = new Date();
    await placement.save();

    // Soft delete corresponding announcement if it exists
    await AdminPost.updateMany(
      { relatedId: placement._id.toString() },
      { $set: { status: 'trash', deletedAt: new Date() } }
    );

    res.json({ success: true, message: 'Placement opportunity moved to Trash successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. PUT /api/placements/:id - Edit a placement opportunity (Creator/Admin only)
router.put('/placements/:id', requireAuth, async (req, res) => {
  try {
    const placement = await Placement.findById(req.params.id);
    if (!placement) {
      return res.status(404).json({ success: false, error: 'Placement opportunity not found' });
    }

    if (req.user.role !== 'admin' && placement.createdBy !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const updates = req.body;
    
    // Recalculate package value
    if (updates.package && !updates.packageVal) {
      let computedPackageVal = 0;
      const match = String(updates.package).match(/(\d+(\.\d+)?)/);
      if (match) computedPackageVal = parseFloat(match[1]);
      updates.packageVal = computedPackageVal;
    }

    Object.assign(placement, updates);
    await placement.save();

    // Sync with corresponding AdminPost if exists
    await AdminPost.updateMany(
      { relatedId: placement._id.toString() },
      {
        $set: {
          title: `Placement Drive: ${placement.companyName} - ${placement.jobRole}`,
          content: placement.description,
          imageURL: placement.companyLogo || '',
          isPinned: placement.isPinned || false,
          status: placement.status,
          companyName: placement.companyName,
          companyLogo: placement.companyLogo,
          jobRole: placement.jobRole,
          employmentType: placement.employmentType,
          workMode: placement.workMode,
          package: placement.package,
          eligibilityCGPA: placement.minimumCGPA,
          eligibilityBacklogs: placement.maximumBacklogs,
          eligibilityAcademicYears: placement.eligibleYears,
          eligibilityDepartments: placement.eligibleDepartments,
          registrationDeadline: placement.expiryDate,
          registrationLink: placement.registrationLink
        }
      }
    );

    res.json({ success: true, data: placement });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. POST /api/placements/:id/duplicate - Duplicate a placement opportunity
router.post('/placements/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const original = await Placement.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, error: 'Placement opportunity not found' });
    if (req.user.role !== 'admin' && original.createdBy !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const copy = new Placement(original.toObject());
    copy._id = new mongoose.Types.ObjectId();
    copy.isNew = true;
    copy.companyName = `${copy.companyName} (Copy)`;
    copy.createdAt = new Date();
    copy.updatedAt = new Date();
    await copy.save();

    // Duplicate matching AdminPost if exists
    const relatedPost = await AdminPost.findOne({ relatedId: original._id.toString() });
    if (relatedPost) {
      const copyPost = new AdminPost(relatedPost.toObject());
      copyPost._id = new mongoose.Types.ObjectId();
      copyPost.isNew = true;
      copyPost.title = `${copyPost.title} (Copy)`;
      copyPost.relatedId = copy._id.toString();
      copyPost.createdAt = new Date();
      copyPost.updatedAt = new Date();
      await copyPost.save();
    }

    res.json({ success: true, data: copy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. POST /api/placements/:id/pin - Pin/unpin a placement
router.post('/placements/:id/pin', requireAuth, async (req, res) => {
  try {
    const placement = await Placement.findById(req.params.id);
    if (!placement) return res.status(404).json({ success: false, error: 'Placement not found' });
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Only admins can pin placements' });

    placement.isPinned = !placement.isPinned;
    await placement.save();

    await AdminPost.updateMany(
      { relatedId: placement._id.toString() },
      { $set: { isPinned: placement.isPinned } }
    );

    res.json({ success: true, data: placement });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. POST /api/placements/:id/pause - Pause/resume registration
router.post('/placements/:id/pause', requireAuth, async (req, res) => {
  try {
    const placement = await Placement.findById(req.params.id);
    if (!placement) return res.status(404).json({ success: false, error: 'Placement not found' });
    if (req.user.role !== 'admin' && placement.createdBy !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    placement.status = placement.status === 'paused' ? 'active' : 'paused';
    await placement.save();

    await AdminPost.updateMany(
      { relatedId: placement._id.toString() },
      { $set: { status: placement.status } }
    );

    res.json({ success: true, data: placement });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. POST /api/placements/:id/restore - Restore from trash
router.post('/placements/:id/restore', requireAuth, async (req, res) => {
  try {
    const placement = await Placement.findById(req.params.id);
    if (!placement) return res.status(404).json({ success: false, error: 'Placement not found' });
    if (req.user.role !== 'admin' && placement.createdBy !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    placement.status = 'active';
    placement.deletedAt = undefined;
    await placement.save();

    await AdminPost.updateMany(
      { relatedId: placement._id.toString() },
      { $set: { status: 'active', deletedAt: undefined } }
    );

    res.json({ success: true, data: placement });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. POST /api/placements/:id/permanent-delete - Hard delete placement
router.post('/placements/:id/permanent-delete', requireAuth, async (req, res) => {
  try {
    const placement = await Placement.findById(req.params.id);
    if (!placement) return res.status(404).json({ success: false, error: 'Placement not found' });
    if (req.user.role !== 'admin' && placement.createdBy !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await Placement.findByIdAndDelete(req.params.id);
    await AdminPost.deleteMany({ relatedId: req.params.id });

    res.json({ success: true, message: 'Permanently deleted placement drive successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. POST /api/placements/:id/track - Track action activity (view/click/apply)
router.post('/placements/:id/track', requireAuth, async (req, res) => {
  try {
    const { action } = req.body;
    const placement = await Placement.findById(req.params.id);
    if (!placement) return res.status(404).json({ success: false, error: 'Placement not found' });

    if (action === 'view') placement.views = (placement.views || 0) + 1;
    else if (action === 'click') placement.clicks = (placement.clicks || 0) + 1;
    else if (action === 'apply') placement.applications = (placement.applications || 0) + 1;
    await placement.save();

    // Track in linked AdminPost as well if exists
    await AdminPost.updateMany(
      { relatedId: placement._id.toString() },
      {
        $inc: {
          views: action === 'view' ? 1 : 0,
          clicks: action === 'click' ? 1 : 0,
          applications: action === 'apply' ? 1 : 0
        }
      }
    );

    res.json({ success: true, data: placement });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. GET /api/placements/trash - Get all soft-deleted placements
router.get('/placements/trash', requireAuth, async (req, res) => {
  try {
    const college = req.user.college || 'SR University';
    const query = { college, status: 'trash' };
    if (req.user.role !== 'admin') {
      query.createdBy = req.user.userId;
    }
    const trashPlacements = await Placement.find(query).sort({ deletedAt: -1 });
    res.json({ success: true, data: trashPlacements });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
