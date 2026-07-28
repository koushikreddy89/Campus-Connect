const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { Alumni, Post, Referral, Resource, Roadmap, Achievement, AdminPost, Placement, User, StudentPost, Like, Comment, Connection, FriendRequest, Notification, CollegeAlumniRecord, OTP, Message, GroupChat, GroupMessage, Story, SupportTicket, FAQ, FeatureRequest, Report, CollegeDomain, Session, LoginAttempt, SecurityLog, AlumniVerification, GroupActivity, Bug, Follow, AnnouncementView, AnnouncementClick, UserPreferences } = require('./models');
const emailService = require('./emailService');
const crypto = require('crypto');
const { validatePasswordStrength, isDisposableEmail, generateCaptcha, verifyCaptcha } = require('./securityUtils');

// AES-256-CBC Encryption/Decryption Helpers for View Once text messages
const ENCRYPTION_KEY = Buffer.alloc(32, 'cc_secure_encryption_key_32_bytes!');
const IV_LENGTH = 16;

function encryptText(text) {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    console.error('Encryption failed:', err);
    return text;
  }
}

function decryptText(text) {
  if (!text) return '';
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return text;
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error('Decryption failed:', err);
    return text;
  }
}

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
const multer = require('multer');
const path = require('path');

// Multer setup for file/image attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB size limit
});
// Rate limiting configurations (Lightweight IP-based protection for abuse prevention)
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10000, // High request threshold (10,000 requests/hour/IP) to prevent blocking shared campus Wi-Fi
  message: { success: false, error: 'Too many requests from this network, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Exclude logout endpoint from rate limiting completely
    const isLogout = req.path === '/auth/logout' || req.path === '/api/auth/logout';
    if (isLogout) {
      console.log(`ℹ️ [Rate Limit Skip] Skipping rate limit for logout request: [${req.method} ${req.path}]`);
    }
    return isLogout;
  },
  handler: (req, res, next, options) => {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    console.warn(`⚠️ [Rate Limit Triggered] IP Limit reached! Client IP: [${clientIp}], Path: [${req.method} ${req.path}]`);
    res.status(options.statusCode).send(options.message);
  }
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
const getOrCreateAuthTracker = async (email) => {
  const lowerEmail = email.toLowerCase().trim();
  let tracker = await LoginAttempt.findOne({ email: lowerEmail });
  if (!tracker) {
    tracker = new LoginAttempt({ email: lowerEmail });
    await tracker.save();
  }
  return tracker;
};

const checkLockout = async (email) => {
  if (!email) return { locked: false };
  const lowerEmail = email.toLowerCase().trim();
  const tracker = await LoginAttempt.findOne({ email: lowerEmail });
  if (tracker && tracker.lockUntil && tracker.lockUntil > new Date()) {
    const waitMinutes = Math.ceil((tracker.lockUntil.getTime() - Date.now()) / 60000);
    return { locked: true, waitMinutes, lockUntil: tracker.lockUntil };
  }
  return { locked: false };
};

const recordFailedAttempt = async (email) => {
  const lowerEmail = email.toLowerCase().trim();
  let tracker = await LoginAttempt.findOne({ email: lowerEmail });
  if (!tracker) {
    tracker = new LoginAttempt({ email: lowerEmail });
  }
  tracker.failedAttempts += 1;
  tracker.loginAttempts += 1;
  if (tracker.failedAttempts >= 5) {
    tracker.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
  }
  await tracker.save();
  return tracker;
};

const resetAttempts = async (email) => {
  const lowerEmail = email.toLowerCase().trim();
  let tracker = await LoginAttempt.findOne({ email: lowerEmail });
  if (tracker) {
    tracker.failedAttempts = 0;
    tracker.lockUntil = null;
    
    // Rolling 24h window check for successful logins limit (max 10 logins/day)
    const rollingLimitMs = 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(tracker.successfulLoginsWindowStart).getTime() > rollingLimitMs) {
      tracker.successfulLoginsToday = 0;
      tracker.successfulLoginsWindowStart = new Date();
    }
    tracker.successfulLoginsToday += 1;
    tracker.lastLogin = new Date();
    await tracker.save();
  }
};

// Middleware: Account-level login and OTP limiters
const checkAccountLoginLimit = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next();

    const lowerEmail = email.toLowerCase().trim();
    const tracker = await getOrCreateAuthTracker(lowerEmail);

    console.log(`🔍 [Account Login Limit Check] Email: [${lowerEmail}], Failed Attempts: [${tracker.failedAttempts}], Successful Logins Today: [${tracker.successfulLoginsToday}], Lock Until: [${tracker.lockUntil}]`);

    // Lockout check
    if (tracker.lockUntil && tracker.lockUntil > new Date()) {
      const remainingMs = tracker.lockUntil.getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      console.warn(`⚠️ [Account Lockout Active] Locked account: [${lowerEmail}]. Try again in ${remainingMins} minutes.`);
      return res.status(423).json({
        success: false,
        error: `Account is temporarily locked due to failed attempts. Try again in ${remainingMins} minutes.`
      });
    }

    // Rolling 24h window check for successful logins
    const rollingLimitMs = 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(tracker.successfulLoginsWindowStart).getTime() > rollingLimitMs) {
      tracker.successfulLoginsToday = 0;
      tracker.successfulLoginsWindowStart = new Date();
      await tracker.save();
    }

    if (tracker.successfulLoginsToday >= 10) {
      const resetTime = new Date(new Date(tracker.successfulLoginsWindowStart).getTime() + rollingLimitMs);
      const remainingHrs = Math.ceil((resetTime.getTime() - Date.now()) / (3600 * 1000));
      console.warn(`⚠️ [Account Login Limit Reached] Limit reached for account: [${lowerEmail}]. Try again in ${remainingHrs} hours.`);
      return res.status(429).json({
        success: false,
        error: `Maximum 10 successful logins per 24-hour window exceeded for this account. Try again in ${remainingHrs} hours.`
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

const checkAccountOtpLimit = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next();

    const lowerEmail = email.toLowerCase().trim();
    const tracker = await getOrCreateAuthTracker(lowerEmail);

    console.log(`🔍 [Account OTP Limit Check] Email: [${lowerEmail}], OTP Requests: [${tracker.otpRequests}], Last OTP Request: [${tracker.lastOtpRequest}]`);

    // Cooldown check (60 seconds)
    if (tracker.lastOtpRequest) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(tracker.lastOtpRequest).getTime()) / 1000);
      if (elapsedSeconds < 60) {
        console.warn(`⚠️ [OTP Cooldown Triggered] Cooldown active for: [${lowerEmail}]. Wait ${60 - elapsedSeconds} seconds.`);
        return res.status(429).json({
          success: false,
          error: `Please wait ${60 - elapsedSeconds} seconds before requesting another OTP.`
        });
      }
    }

    // Rolling 1 hour window check for OTP requests
    const rollingOtpWindowMs = 60 * 60 * 1000;
    if (Date.now() - new Date(tracker.otpRequestsWindowStart).getTime() > rollingOtpWindowMs) {
      tracker.otpRequests = 0;
      tracker.otpRequestsWindowStart = new Date();
    }

    if (tracker.otpRequests >= 5) {
      const resetTime = new Date(new Date(tracker.otpRequestsWindowStart).getTime() + rollingOtpWindowMs);
      const remainingMins = Math.ceil((resetTime.getTime() - Date.now()) / 60000);
      console.warn(`⚠️ [OTP Limit Reached] Limit reached for account: [${lowerEmail}]. Try again in ${remainingMins} minutes.`);
      return res.status(429).json({
        success: false,
        error: `Maximum 5 OTP requests per hour exceeded for this account. Try again in ${remainingMins} minutes.`
      });
    }

    // Increment OTP requests count
    tracker.otpRequests += 1;
    tracker.lastOtpRequest = new Date();
    await tracker.save();

    next();
  } catch (error) {
    next(error);
  }
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
    
    // Support Auth header first, fallback to query param, then to cookies
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
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

    let userOid = '';
    // Check if user or alumni is suspended and derive college
    if (decoded.role === 'student' || decoded.role === 'alumni') {
      const Model = decoded.role === 'alumni' ? Alumni : User;
      const account = await Model.findOne({ userId: decoded.userId });
      if (account) {
        if (account.isSuspended) {
          return res.status(403).json({ success: false, error: 'Your account has been suspended. Please contact support.', isSuspended: true });
        }
        college = account.college;
        userOid = account._id.toString();
      }
    } else if (decoded.role === 'admin') {
      college = 'SR University'; // Admin college fallback
      userOid = 'admin-id';
    }

    req.user = { ...decoded, _id: userOid, college };
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
router.post('/auth/register', checkAccountOtpLimit, async (req, res) => {
  try {
    const { email, password, name, role, department, batch, rollNumber } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Email, password, and role are required.' });
    }
    
    const lowerEmail = email.toLowerCase().trim();
    const currentIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

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

    const accountName = (name && name.trim() !== '') ? name.trim() : (req.body.fullName && req.body.fullName.trim() !== '') ? req.body.fullName.trim() : 'User';

    const newAccount = new Model({
      userId,
      email: lowerEmail,
      password: hashedPassword,
      passwordHistory: [hashedPassword],
      isEmailVerified: false,
      college: collegeName,
      name: accountName,
      batch: batch || '2024',
      department: department || 'General',
      role,
      fullName: accountName,
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
router.post('/auth/verify-email', checkAccountLoginLimit, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
    }

    const lowerEmail = email.toLowerCase().trim();
    const currentIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    // Lockout check
    const lockout = await checkLockout(lowerEmail);
    if (lockout.locked) {
      return res.status(423).json({ success: false, error: `Account is temporarily locked due to failed attempts. Try again in ${lockout.waitMinutes} minutes.` });
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
      await recordFailedAttempt(lowerEmail);

      if (otpRecord.attempts >= 5) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, error: 'Maximum attempts exceeded. Code invalidated.' });
      }
      return res.status(400).json({ success: false, error: 'Invalid verification code.' });
    }

    // Success
    await OTP.deleteOne({ _id: otpRecord._id });
    await resetAttempts(lowerEmail);

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
        _id: account._id.toString(),
        name: account.fullName || account.name || '',
        fullName: account.fullName || account.name || '',
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
router.post('/auth/login', checkAccountLoginLimit, async (req, res) => {
  try {
    const { email, password, captchaId, captchaAnswer, captchaExpiresAt, captchaSignature } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Invalid email or password.' });
    }
    
    const lowerEmail = email.toLowerCase().trim();
    const currentIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';

    // 1. Lockout Check
    const lockout = await checkLockout(lowerEmail);
    if (lockout.locked) {
      return res.status(423).json({ success: false, error: `Account is temporarily locked. Try again in ${lockout.waitMinutes} minutes.` });
    }

    // 2. CAPTCHA Check (Required if failed attempts from account >= 3)
    const attempts = await LoginAttempt.findOne({ email: lowerEmail });
    const requireCaptcha = attempts && attempts.failedAttempts >= 3;
    if (requireCaptcha) {
      if (!captchaId || captchaAnswer === undefined || !captchaSignature) {
        return res.status(422).json({ success: false, error: 'CAPTCHA required due to multiple failed attempts.', requireCaptcha: true });
      }
      const captchaValid = verifyCaptcha(captchaId, captchaAnswer, captchaExpiresAt, captchaSignature);
      if (!captchaValid) {
        await recordFailedAttempt(lowerEmail);
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
      await recordFailedAttempt(lowerEmail);
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
      await recordFailedAttempt(lowerEmail);
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
    await resetAttempts(lowerEmail);

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
        _id: account._id.toString(),
        name: account.fullName || account.name || '',
        fullName: account.fullName || account.name || '',
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
router.post('/auth/mfa/verify', checkAccountLoginLimit, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
    }

    const lowerEmail = email.toLowerCase().trim();
    const currentIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';

    // Lockout check
    const lockout = await checkLockout(lowerEmail);
    if (lockout.locked) {
      return res.status(423).json({ success: false, error: `Account is temporarily locked due to failed attempts. Try again in ${lockout.waitMinutes} minutes.` });
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
      await recordFailedAttempt(lowerEmail);

      if (otpRecord.attempts >= 5) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, error: 'Maximum verification attempts exceeded.' });
      }
      return res.status(400).json({ success: false, error: 'Invalid code.' });
    }

    // Success
    await OTP.deleteOne({ _id: otpRecord._id });
    await resetAttempts(lowerEmail);

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
    let userObjectId = '';
    if (finalRole === 'admin') {
      name = 'Campus Admin';
      userObjectId = 'admin-id';
    } else {
      const Model = finalRole === 'alumni' ? Alumni : User;
      const account = await Model.findOne({ userId });
      if (account) {
        name = account.fullName || account.name || '';
        userObjectId = account._id.toString();
      }
    }

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        _id: userObjectId,
        name,
        fullName: name,
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
router.post('/auth/forgot-password', checkAccountOtpLimit, async (req, res) => {
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
router.post('/auth/reset-password', checkAccountLoginLimit, async (req, res) => {
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
router.post('/auth/verify-otp', checkAccountLoginLimit, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and OTP code are required.' });
    }
    
    const lowerEmail = email.toLowerCase().trim();
    const currentIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    
    const lockout = await checkLockout(lowerEmail);
    if (lockout.locked) {
      return res.status(423).json({ success: false, error: `Account locked. Try again in ${lockout.waitMinutes} minutes.` });
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
      await recordFailedAttempt(lowerEmail);
      
      if (otpRecord.attempts >= 5) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, error: 'Attempts exceeded. Account locked.' });
      }
      return res.status(400).json({ success: false, error: 'Invalid OTP code.' });
    }
    
    // Clean up
    await OTP.deleteOne({ _id: otpRecord._id });
    await resetAttempts(lowerEmail);
    
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
        _id: userDetails._id,
        name: userDetails.fullName || userDetails.name || (role === 'admin' ? 'Campus Admin' : ''),
        fullName: userDetails.fullName || userDetails.name || (role === 'admin' ? 'Campus Admin' : ''),
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

    const finalName = (name && name.trim() !== '') ? name.trim() : (existingAlumni.name || existingAlumni.fullName || '');

    const updateFields = { 
      name: finalName, 
      fullName: finalName,
      batch: batch !== undefined ? batch : (existingAlumni.batch || ''), 
      department: department !== undefined ? department : (existingAlumni.department || ''), 
      company: company !== undefined ? company : (existingAlumni.company || ''), 
      role: role !== undefined ? role : (existingAlumni.role || ''), 
      story: story !== undefined ? story : (existingAlumni.story || ''), 
      profileImageUrl: profileImageUrl !== undefined ? profileImageUrl : (existingAlumni.profileImageUrl || ''),
      batchYear: batch !== undefined ? batch : (existingAlumni.batch || ''),
      designation: role !== undefined ? role : (existingAlumni.role || ''),
      careerJourney: story !== undefined ? story : (existingAlumni.story || ''),
      profileImage: profileImageUrl !== undefined ? profileImageUrl : (existingAlumni.profileImageUrl || '')
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

// GET /api/alumni/posts/my & GET /api/alumni/posts/me - Get posts belonging to logged-in creator
const handleGetMyPosts = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('📊 [Dashboard API GET /posts/me] Fetching creator posts for authenticated user:', userId);

    const author = await Alumni.findOne({ userId }) || (mongoose.Types.ObjectId.isValid(userId) ? await Alumni.findById(userId) : null);
    
    let query = {
      $or: [
        { alumniId: userId },
        ...(author ? [{ alumniId: author._id.toString() }] : [])
      ]
    };

    if (req.user.role !== 'super_admin') {
      query.college = req.user.college;
    }

    const posts = await Post.find(query).sort({ createdAt: -1 });
    console.log(`✅ [Dashboard API] Found ${posts.length} posts for creator ${userId}`);

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

    res.json({
      success: true,
      totalPosts: posts.length,
      data: postsWithAuthors,
      posts: postsWithAuthors
    });
  } catch (error) {
    console.error('❌ [Dashboard API Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/alumni/posts/my', requireAuth, handleGetMyPosts);
router.get('/alumni/posts/me', requireAuth, handleGetMyPosts);

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
    const { content, text, caption, type, image, images, imageUrls, videoUrl, videos, videoUrls, tags, company, jobRole, salary, experience, applyLink } = req.body;
    console.log('📥 [Backend Controller] Creating alumni post for user:', req.user.userId, 'College:', req.user.college);
    
    const normalizedContent = (content || text || caption || '').trim();
    const normalizedImages = Array.isArray(imageUrls) ? imageUrls : (Array.isArray(images) ? images : (image ? [image] : []));
    const normalizedVideos = Array.isArray(videoUrls) ? videoUrls : (Array.isArray(videos) ? videos : (videoUrl ? [videoUrl] : []));

    if (!normalizedContent && normalizedImages.length === 0 && normalizedVideos.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please enter some text or attach an image or video to publish a post.' 
      });
    }

    const newPost = new Post({
      alumniId: req.user.userId,
      college: req.user.college,
      content: normalizedContent,
      type: type || 'general',
      imageUrls: normalizedImages,
      videoUrls: normalizedVideos,
      tags: tags || [],
      company: company || '',
      jobRole: jobRole || '',
      salary: salary || '',
      experience: experience || '',
      applyLink: applyLink || '',
      likes: [],
      comments: [],
      shareCount: 0,
      viewCount: 0
    });

    await newPost.save();
    console.log('💾 [MongoDB Insert] Post saved successfully ID:', newPost._id);

    // Attach author object
    const author = await Alumni.findOne({ userId: req.user.userId }) || await User.findOne({ userId: req.user.userId });
    const postObj = newPost.toObject();
    if (author) {
      postObj.author = {
        ...author.toObject(),
        id: author._id
      };
    }

    if (globalThis.io) {
      globalThis.io.emit('post:created', postObj);
    }

    res.status(201).json({ success: true, data: postObj, message: 'Post published successfully' });
  } catch (error) {
    console.error('❌ [Backend Controller] Failed to save post:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/posts/:id/like - Toggle like on alumni post
router.post('/alumni/posts/:id/like', requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    const post = await Post.findById(postId) || await Post.findOne({ _id: mongoose.Types.ObjectId.isValid(postId) ? postId : null });
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const likedIndex = post.likes.indexOf(userId);
    let isLiked = false;

    if (likedIndex > -1) {
      post.likes.splice(likedIndex, 1);
      isLiked = false;
    } else {
      post.likes.push(userId);
      isLiked = true;

      // Notification creation for author if liker is not author
      if (post.alumniId !== userId) {
        try {
          const senderUser = await Alumni.findOne({ userId }) || await User.findOne({ userId });
          const senderName = senderUser ? (senderUser.name || 'A user') : 'A user';
          await Notification.create({
            userId: post.alumniId,
            relatedId: userId,
            title: `${senderName} liked your post`,
            body: `Your career insight post received a new like.`,
            type: 'like',
            isRead: false
          });

          if (globalThis.io) {
            globalThis.io.to(`user_${post.alumniId}`).emit('notification:new', {
              type: 'like',
              title: `${senderName} liked your post`
            });
          }
        } catch (notifErr) {
          console.warn('⚠️ Notification creation warning:', notifErr.message);
        }
      }
    }

    await post.save();

    // Broadcast real-time update
    if (globalThis.io) {
      globalThis.io.emit('post:liked', { postId: post._id, likes: post.likes, likesCount: post.likes.length, isLiked, userId });
    }

    res.json({
      success: true,
      data: {
        postId: post._id,
        isLiked,
        likesCount: post.likes.length,
        likes: post.likes
      }
    });
  } catch (error) {
    console.error('❌ [Like API Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/posts/:id/comments - Add comment to alumni post
router.post('/alumni/posts/:id/comments', requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Comment content cannot be empty' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const senderUser = await Alumni.findOne({ userId }) || await User.findOne({ userId });
    const userName = senderUser ? (senderUser.name || 'User') : 'User';
    const userAvatar = senderUser ? (senderUser.profileImageUrl || senderUser.profileImage || '') : '';

    const newComment = {
      userId,
      userName,
      userAvatar,
      content: content.trim(),
      createdAt: new Date()
    };

    post.comments.push(newComment);
    await post.save();

    const addedComment = post.comments[post.comments.length - 1];

    // Notification for author
    if (post.alumniId !== userId) {
      try {
        await Notification.create({
          userId: post.alumniId,
          relatedId: userId,
          title: `${userName} commented on your post`,
          body: `"${content.trim().substring(0, 50)}..."`,
          type: 'comment',
          isRead: false
        });

        if (globalThis.io) {
          globalThis.io.to(`user_${post.alumniId}`).emit('notification:new', {
            type: 'comment',
            title: `${userName} commented on your post`
          });
        }
      } catch (notifErr) {}
    }

    // Broadcast real-time update
    if (globalThis.io) {
      globalThis.io.emit('post:commented', { postId: post._id, comment: addedComment, commentsCount: post.comments.length });
    }

    res.status(201).json({
      success: true,
      data: addedComment,
      commentsCount: post.comments.length
    });
  } catch (error) {
    console.error('❌ [Comment API Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alumni/posts/:id/comments - Get post comments
router.get('/alumni/posts/:id/comments', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    res.json({ success: true, data: post.comments || [], commentsCount: (post.comments || []).length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/posts/:id/share - Track post share analytics
router.post('/alumni/posts/:id/share', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    post.shareCount = (post.shareCount || 0) + 1;
    await post.save();

    if (globalThis.io) {
      globalThis.io.emit('post:shared', { postId: post._id, shareCount: post.shareCount });
    }

    res.json({ success: true, shareCount: post.shareCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alumni/posts/:id/save - Bookmark / Save alumni post
router.post('/alumni/posts/:id/save', requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    const alumni = await Alumni.findOne({ userId });
    if (!alumni) {
      return res.status(404).json({ success: false, error: 'Alumni user profile not found' });
    }

    const savedIndex = alumni.savedPosts.indexOf(postId);
    let isSaved = false;

    if (savedIndex > -1) {
      alumni.savedPosts.splice(savedIndex, 1);
      isSaved = false;
    } else {
      alumni.savedPosts.push(postId);
      isSaved = true;
    }

    await alumni.save();
    res.json({ success: true, isSaved, savedPosts: alumni.savedPosts });
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

    // If category is placement or internship, save ONLY in the Placement collection (Single Source of Truth)
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
        company: postData.companyName || (postData.title && postData.title.includes(':') ? postData.title.split(':')[0].trim() : postData.title || ''),
        jobRole: postData.jobRole || postData.internshipRole || postData.title,
        role: postData.jobRole || postData.internshipRole || postData.title,
        employmentType: isIntern ? 'Internship' : (postData.employmentType || 'Full Time'),
        salary: String(pkgStr || ''),
        packageVal: computedPackageVal,
        location: postData.location || postData.venue || 'Remote',
        expiryDate: new Date(expDate),
        registrationDeadline: new Date(expDate),
        description: postData.content || postData.description || postData.internshipDescription || '',
        eligibility: postData.eligibility || '',
        branches: postData.eligibilityDepartments || postData.eligibleDepartments || [],
        minCGPA: postData.eligibilityCGPA || postData.minimumCGPA || 0.0,
        maxBacklogs: postData.eligibilityBacklogs || postData.maximumBacklogs || 0,
        batches: postData.eligibilityBatch ? [postData.eligibilityBatch] : (postData.eligibleBatches || []),
        createdBy: req.user.userId,
        createdByName: postData.createdByName,
        createdByRole: 'ADMIN',
        placementType: 'OFFICIAL',
        status: postData.status || 'active',
        isVerified: true,
        college: postData.college,
        
        companyWebsite: postData.companyWebsite || '',
        workMode: (postData.workMode === 'On-Site' || postData.workMode === 'Onsite') ? 'Onsite' : (postData.workMode || (postData.internshipMode === 'On-Site' || postData.internshipMode === 'Onsite' ? 'Onsite' : postData.internshipMode) || 'Onsite'),
        responsibilities: postData.responsibilities || '',
        requiredSkills: postData.skillsRequired || postData.requiredSkills || [],
        applyLink: postData.registrationLink || postData.applyLink || '',
        assessmentDate: postData.assessmentDate ? new Date(postData.assessmentDate) : undefined,
        interviewDate: postData.interviewDate ? new Date(postData.interviewDate) : undefined,
        joiningDate: postData.joiningDate ? new Date(postData.joiningDate) : undefined,
        eligibleSpecializations: postData.eligibilitySpecializations || [],
        attachments: postData.attachments || (postData.pdfAttachment ? [postData.pdfAttachment] : []),
        isPinned: postData.isPinned || false,
        visibility: postData.visibility || 'Public',
        eligibleYears: postData.eligibilityAcademicYears || []
      });

      await placement.save();

      // Return formatted post to satisfy client Expectations
      const formattedPost = {
        _id: placement._id,
        id: placement._id.toString(),
        title: placement.title || `Placement Drive: ${placement.companyName} - ${placement.jobRole}`,
        content: placement.description,
        description: placement.description,
        category: postData.category,
        imageURL: placement.companyLogo || '',
        college: placement.college,
        createdBy: placement.createdBy,
        createdByName: 'Campus Admin',
        isPinned: placement.isPinned || false,
        status: placement.status,
        relatedId: placement._id.toString(),
        companyName: placement.companyName,
        companyLogo: placement.companyLogo,
        jobRole: placement.jobRole,
        employmentType: placement.employmentType,
        package: placement.package,
        registrationDeadline: placement.expiryDate,
        createdAt: placement.createdAt,
        updatedAt: placement.updatedAt
      };
      
      // Notify only eligible students asynchronously
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

            const eligibilityInfo = checkPlacementEligibility(s, placement);
            if (eligibilityInfo.eligible) {
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

      return res.status(201).json({ success: true, data: formattedPost });
    }

    const newPost = new AdminPost(postData);
    await newPost.save();
    res.status(201).json({ success: true, data: newPost });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.keys(error.errors).map(key => {
        let fieldName = key;
        if (key === 'companyName') fieldName = 'Company Name';
        else if (key === 'jobRole') fieldName = 'Job Role';
        else if (key === 'expiryDate') fieldName = 'Expiry Date';
        else if (key === 'employmentType') fieldName = 'Employment Type';
        return `${fieldName} is required.`;
      });
      return res.status(400).json({ success: false, error: messages.join(' ') });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/posts - Get all admin posts and placements combined (excluding trash)
router.get('/admin/posts', requireAuth, async (req, res) => {
  try {
    const { college } = req.query;
    let query = { status: { $ne: 'trash' } };
    if (college) {
      query.college = new RegExp(college, 'i');
    }
    const posts = await AdminPost.find(query).sort({ isPinned: -1, createdAt: -1 });
    
    // Fetch official placements
    const placementQuery = { status: { $ne: 'trash' }, placementType: 'OFFICIAL' };
    if (college) {
      placementQuery.college = new RegExp(college, 'i');
    }
    const placements = await Placement.find(placementQuery).sort({ isPinned: -1, createdAt: -1 });
    
    // Map placements to match announcement fields
    const formattedPlacements = placements.map(p => ({
      _id: p._id,
      id: p._id.toString(),
      title: p.title || `Placement Drive: ${p.companyName} - ${p.jobRole}`,
      content: p.description,
      description: p.description,
      category: p.employmentType === 'Internship' ? 'internship' : 'placement',
      imageURL: p.companyLogo || '',
      college: p.college,
      createdBy: p.createdBy,
      createdByName: 'Campus Admin',
      isPinned: p.isPinned || false,
      status: p.status,
      relatedId: p._id.toString(),
      companyName: p.companyName,
      companyLogo: p.companyLogo,
      jobRole: p.jobRole,
      employmentType: p.employmentType,
      package: p.package,
      registrationDeadline: p.expiryDate,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    const combined = [...posts, ...formattedPlacements].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json({ success: true, data: combined });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/posts/trash - Get soft-deleted admin posts and placements
router.get('/admin/posts/trash', requireAuth, async (req, res) => {
  try {
    const college = req.user.college || 'SR University';
    const query = { college, status: 'trash' };
    const posts = await AdminPost.find(query).sort({ deletedAt: -1 });
    const placements = await Placement.find({ college, status: 'trash', placementType: 'OFFICIAL' }).sort({ deletedAt: -1 });

    const formattedPlacements = placements.map(p => ({
      _id: p._id,
      id: p._id.toString(),
      title: p.title || `Placement Drive: ${p.company} - ${p.role}`,
      content: p.description,
      description: p.description,
      category: p.employmentType === 'Internship' ? 'internship' : 'placement',
      imageURL: p.companyLogo || '',
      college: p.college,
      createdBy: p.createdBy,
      createdByName: 'Campus Admin',
      isPinned: p.isPinned || false,
      status: p.status,
      relatedId: p._id.toString(),
      companyName: p.companyName,
      companyLogo: p.companyLogo,
      jobRole: p.jobRole,
      employmentType: p.employmentType,
      package: p.package,
      registrationDeadline: p.expiryDate,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      deletedAt: p.deletedAt
    }));

    const combined = [...posts, ...formattedPlacements].sort((a, b) => new Date(b.deletedAt || b.updatedAt).getTime() - new Date(a.deletedAt || a.updatedAt).getTime());
    res.json({ success: true, data: combined });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/posts/:id - Edit an admin post or placement drive
router.put('/admin/posts/:id', requireAuth, async (req, res) => {
  try {
    const updates = req.body;
    let isPlacement = false;
    let targetDoc = await Placement.findById(req.params.id);

    if (targetDoc) {
      isPlacement = true;
    } else {
      targetDoc = await AdminPost.findById(req.params.id);
    }

    if (!targetDoc) return res.status(404).json({ success: false, error: 'Broadcast or Placement not found' });

    if (isPlacement) {
      const isIntern = updates.category === 'internship';
      let computedPackageVal = 0;
      const pkgStr = isIntern ? updates.stipend : updates.package;
      if (pkgStr) {
        const match = String(pkgStr).match(/(\d+(\.\d+)?)/);
        if (match) computedPackageVal = parseFloat(match[1]);
      }

      const expDate = updates.expiryDate || updates.registrationDeadline || updates.lastDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const placementUpdates = {
        companyLogo: updates.companyLogo || updates.imageURL || targetDoc.companyLogo || '',
        company: updates.companyName || updates.company || targetDoc.company,
        role: updates.jobRole || updates.role || updates.title || targetDoc.role,
        employmentType: isIntern ? 'Internship' : (updates.employmentType || targetDoc.employmentType),
        salary: String(pkgStr || updates.salary || targetDoc.salary || ''),
        packageVal: computedPackageVal || targetDoc.packageVal,
        location: updates.location || targetDoc.location,
        registrationDeadline: new Date(expDate),
        description: updates.content || updates.description || targetDoc.description || '',
        eligibility: updates.eligibility || targetDoc.eligibility || '',
        branches: updates.eligibilityDepartments || updates.branches || targetDoc.branches || [],
        minCGPA: updates.eligibilityCGPA !== undefined ? parseFloat(updates.eligibilityCGPA) : (updates.minCGPA !== undefined ? parseFloat(updates.minCGPA) : targetDoc.minCGPA),
        maxBacklogs: updates.eligibilityBacklogs !== undefined ? parseInt(updates.eligibilityBacklogs) : (updates.maxBacklogs !== undefined ? parseInt(updates.maxBacklogs) : targetDoc.maxBacklogs),
        batches: updates.eligibleBatches || updates.batches || targetDoc.batches || [],
        status: updates.status || targetDoc.status,
        isPinned: updates.isPinned !== undefined ? updates.isPinned : targetDoc.isPinned,
        visibility: updates.visibility || targetDoc.visibility || 'Public',
        companyWebsite: updates.companyWebsite || targetDoc.companyWebsite || '',
        workMode: (updates.workMode === 'On-Site' || updates.workMode === 'Onsite') ? 'Onsite' : (updates.workMode || targetDoc.workMode || 'Onsite'),
        responsibilities: updates.responsibilities || targetDoc.responsibilities || '',
        requiredSkills: updates.skillsRequired || updates.requiredSkills || targetDoc.requiredSkills || [],
        applyLink: updates.registrationLink || updates.applyLink || targetDoc.applyLink || '',
        assessmentDate: updates.assessmentDate ? new Date(updates.assessmentDate) : targetDoc.assessmentDate,
        interviewDate: updates.interviewDate ? new Date(updates.interviewDate) : targetDoc.interviewDate,
        joiningDate: updates.joiningDate ? new Date(updates.joiningDate) : targetDoc.joiningDate,
        eligibleSpecializations: updates.eligibleSpecializations || targetDoc.eligibleSpecializations || [],
        attachments: updates.attachments || targetDoc.attachments || [],
        eligibleYears: updates.eligibilityAcademicYears || targetDoc.eligibleYears || []
      };

      Object.assign(targetDoc, placementUpdates);
      await targetDoc.save();

      const formattedPost = {
        _id: targetDoc._id,
        id: targetDoc._id.toString(),
        title: targetDoc.title || `Placement Drive: ${targetDoc.companyName} - ${targetDoc.jobRole}`,
        content: targetDoc.description,
        description: targetDoc.description,
        category: isIntern ? 'internship' : 'placement',
        imageURL: targetDoc.companyLogo || '',
        college: targetDoc.college,
        createdBy: targetDoc.createdBy,
        createdByName: 'Campus Admin',
        isPinned: targetDoc.isPinned || false,
        status: targetDoc.status,
        relatedId: targetDoc._id.toString(),
        companyName: targetDoc.companyName,
        companyLogo: targetDoc.companyLogo,
        jobRole: targetDoc.jobRole,
        employmentType: targetDoc.employmentType,
        package: targetDoc.package,
        registrationDeadline: targetDoc.expiryDate,
        createdAt: targetDoc.createdAt,
        updatedAt: targetDoc.updatedAt
      };
      return res.json({ success: true, data: formattedPost });
    }

    if (updates.description !== undefined) {
      updates.content = updates.content || updates.description || '';
    }
    Object.assign(targetDoc, updates);
    await targetDoc.save();

    res.json({ success: true, data: targetDoc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/posts/:id - Soft delete an admin post or placement
router.delete('/admin/posts/:id', requireAuth, async (req, res) => {
  try {
    let doc = await Placement.findById(req.params.id);
    let isPlacement = false;

    if (doc) {
      isPlacement = true;
    } else {
      doc = await AdminPost.findById(req.params.id);
    }

    if (!doc) return res.status(404).json({ success: false, error: 'Broadcast or Placement not found' });

    doc.status = 'trash';
    doc.deletedAt = new Date();
    await doc.save();

    res.json({ success: true, message: 'Broadcast or Placement moved to Trash successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/posts/:id/restore - Restore soft-deleted broadcast or placement
router.post('/admin/posts/:id/restore', requireAuth, async (req, res) => {
  try {
    let doc = await Placement.findById(req.params.id);
    let isPlacement = false;

    if (doc) {
      isPlacement = true;
    } else {
      doc = await AdminPost.findById(req.params.id);
    }

    if (!doc) return res.status(404).json({ success: false, error: 'Broadcast or Placement not found' });

    doc.status = 'active';
    doc.deletedAt = undefined;
    await doc.save();

    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/posts/:id/permanent-delete - Hard delete broadcast or placement
router.post('/admin/posts/:id/permanent-delete', requireAuth, async (req, res) => {
  try {
    let isPlacement = await Placement.findById(req.params.id);
    if (isPlacement) {
      await Placement.findByIdAndDelete(req.params.id);
    } else {
      await AdminPost.findByIdAndDelete(req.params.id);
    }

    res.json({ success: true, message: 'Permanently deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/posts/:id/pin - Toggle pin status
router.post('/admin/posts/:id/pin', requireAuth, async (req, res) => {
  try {
    let doc = await Placement.findById(req.params.id);
    if (doc) {
      doc.isPinned = !doc.isPinned;
      await doc.save();
      return res.json({ success: true, data: doc });
    }

    doc = await AdminPost.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Broadcast not found' });

    doc.isPinned = !doc.isPinned;
    await doc.save();

    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/posts/:id/pause - Toggle pause status
router.post('/admin/posts/:id/pause', requireAuth, async (req, res) => {
  try {
    let doc = await Placement.findById(req.params.id);
    if (doc) {
      doc.status = doc.status === 'paused' ? 'active' : 'paused';
      await doc.save();
      return res.json({ success: true, data: doc });
    }

    doc = await AdminPost.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Broadcast not found' });

    doc.status = doc.status === 'paused' ? 'active' : 'paused';
    await doc.save();

    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/posts/:id/duplicate - Duplicate broadcast or placement
router.post('/admin/posts/:id/duplicate', requireAuth, async (req, res) => {
  try {
    let origPlacement = await Placement.findById(req.params.id);
    if (origPlacement) {
      const copyPlacement = new Placement(origPlacement.toObject());
      copyPlacement._id = new mongoose.Types.ObjectId();
      copyPlacement.isNew = true;
      copyPlacement.company = `${origPlacement.company} (Copy)`;
      copyPlacement.companyName = `${origPlacement.companyName} (Copy)`;
      copyPlacement.createdAt = new Date();
      copyPlacement.updatedAt = new Date();
      await copyPlacement.save();
      return res.json({ success: true, data: copyPlacement });
    }

    const original = await AdminPost.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, error: 'Broadcast not found' });

    const copy = new AdminPost(original.toObject());
    copy._id = new mongoose.Types.ObjectId();
    copy.isNew = true;
    copy.title = `${copy.title} (Copy)`;
    copy.createdAt = new Date();
    copy.updatedAt = new Date();
    await copy.save();

    res.json({ success: true, data: copy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to calculate CTR accurately
function calculateCTR(clicks, views) {
  if (!views || views === 0) return 0.0;
  const ctr = (clicks / views) * 100;
  return Math.min(100.0, parseFloat(ctr.toFixed(1)));
}

// Helper to broadcast analytics updates in real-time
function broadcastAnalyticsUpdate(announcementId, analyticsData) {
  if (globalThis.io) {
    globalThis.io.emit('analytics:update', {
      announcementId: announcementId.toString(),
      ...analyticsData
    });
  }
}

// GET /api/analytics/:announcementId - Fetch live analytics
router.get('/analytics/:announcementId', requireAuth, async (req, res) => {
  try {
    const { announcementId } = req.params;

    let doc = await Placement.findById(announcementId);
    if (!doc) {
      doc = await AdminPost.findById(announcementId);
    }

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Broadcast not found' });
    }

    if (doc.status === 'trash') {
      return res.status(400).json({ success: false, error: 'Cannot fetch analytics for a deleted broadcast' });
    }

    const uniqueViewers = await AnnouncementView.countDocuments({ announcementId });
    const clicksCount = await AnnouncementClick.countDocuments({ announcementId });

    const lastViewDoc = await AnnouncementView.findOne({ announcementId }).sort({ createdAt: -1 });
    const lastClickDoc = await AnnouncementClick.findOne({ announcementId }).sort({ createdAt: -1 });

    const views = uniqueViewers; // unique view tracking
    const CTR = calculateCTR(clicksCount, views);

    res.json({
      success: true,
      data: {
        views,
        uniqueViewers,
        clicks: clicksCount,
        applications: clicksCount,
        ctr: CTR,
        CTR,
        lastViewed: lastViewDoc ? lastViewDoc.createdAt : doc.lastViewed || null,
        lastClicked: lastClickDoc ? lastClickDoc.createdAt : doc.lastClicked || null,
        createdAt: doc.createdAt,
        title: doc.title || doc.jobRole || 'Broadcast Announcement',
        category: doc.category || (doc.employmentType === 'Internship' ? 'internship' : 'placement')
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/analytics/view - Record a unique view
router.post('/analytics/view', requireAuth, async (req, res) => {
  try {
    const { announcementId } = req.body;
    const userId = req.user.userId;

    if (!announcementId) {
      return res.status(400).json({ success: false, error: 'announcementId is required' });
    }

    let doc = await Placement.findById(announcementId);
    if (!doc) {
      doc = await AdminPost.findById(announcementId);
    }

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Broadcast not found' });
    }

    if (doc.status === 'trash') {
      return res.status(400).json({ success: false, error: 'Cannot view a deleted broadcast' });
    }

    // Check if view already exists
    let view = await AnnouncementView.findOne({ announcementId, userId });
    if (!view) {
      // Atomic insertion to avoid race conditions
      try {
        view = await AnnouncementView.create({ announcementId, userId });
        
        // Update parent document
        doc.views = (doc.views || 0) + 1;
        doc.uniqueViewers = (doc.uniqueViewers || 0) + 1;
        doc.lastViewed = new Date();
        await doc.save();
      } catch (err) {
        // Handle duplicate key error gracefully if another request inserted it concurrently
        if (err.code !== 11000) {
          throw err;
        }
      }
    }

    // Fetch updated analytics
    const uniqueViewers = await AnnouncementView.countDocuments({ announcementId });
    const clicksCount = await AnnouncementClick.countDocuments({ announcementId });
    const lastViewDoc = await AnnouncementView.findOne({ announcementId }).sort({ createdAt: -1 });
    const lastClickDoc = await AnnouncementClick.findOne({ announcementId }).sort({ createdAt: -1 });
    const CTR = calculateCTR(clicksCount, uniqueViewers);

    const analyticsData = {
      views: uniqueViewers,
      uniqueViewers,
      clicks: clicksCount,
      applications: clicksCount,
      ctr: CTR,
      CTR,
      lastViewed: lastViewDoc ? lastViewDoc.createdAt : new Date(),
      lastClicked: lastClickDoc ? lastClickDoc.createdAt : doc.lastClicked || null,
      createdAt: doc.createdAt,
      title: doc.title || doc.jobRole || '',
      category: doc.category || (doc.employmentType === 'Internship' ? 'internship' : 'placement')
    };

    broadcastAnalyticsUpdate(announcementId, analyticsData);

    res.json({ success: true, data: analyticsData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/analytics/click - Record a non-spam click
router.post('/analytics/click', requireAuth, async (req, res) => {
  try {
    const { announcementId } = req.body;
    const userId = req.user.userId;

    if (!announcementId) {
      return res.status(400).json({ success: false, error: 'announcementId is required' });
    }

    let doc = await Placement.findById(announcementId);
    if (!doc) {
      doc = await AdminPost.findById(announcementId);
    }

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Broadcast not found' });
    }

    if (doc.status === 'trash') {
      return res.status(400).json({ success: false, error: 'Cannot click a deleted broadcast' });
    }

    // Anti-spam click check: same user clicking within last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const recentClick = await AnnouncementClick.findOne({
      announcementId,
      userId,
      createdAt: { $gte: tenSecondsAgo }
    });

    if (!recentClick) {
      await AnnouncementClick.create({ announcementId, userId });
      
      // Update parent document
      doc.clicks = (doc.clicks || 0) + 1;
      doc.applications = (doc.applications || 0) + 1;
      doc.lastClicked = new Date();
      await doc.save();
    }

    // Fetch updated analytics
    const uniqueViewers = await AnnouncementView.countDocuments({ announcementId });
    const clicksCount = await AnnouncementClick.countDocuments({ announcementId });
    const lastViewDoc = await AnnouncementView.findOne({ announcementId }).sort({ createdAt: -1 });
    const lastClickDoc = await AnnouncementClick.findOne({ announcementId }).sort({ createdAt: -1 });
    const CTR = calculateCTR(clicksCount, uniqueViewers);

    const analyticsData = {
      views: uniqueViewers,
      uniqueViewers,
      clicks: clicksCount,
      applications: clicksCount,
      ctr: CTR,
      CTR,
      lastViewed: lastViewDoc ? lastViewDoc.createdAt : doc.lastViewed || null,
      lastClicked: lastClickDoc ? lastClickDoc.createdAt : new Date(),
      createdAt: doc.createdAt,
      title: doc.title || doc.jobRole || '',
      category: doc.category || (doc.employmentType === 'Internship' ? 'internship' : 'placement')
    };

    broadcastAnalyticsUpdate(announcementId, analyticsData);

    res.json({ success: true, data: analyticsData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/posts/:id/track - Track action views, clicks, applications (Redirects to new logic)
router.post('/admin/posts/:id/track', requireAuth, async (req, res) => {
  try {
    const { action } = req.body;
    const announcementId = req.params.id;
    const userId = req.user.userId;

    if (action === 'view') {
      let view = await AnnouncementView.findOne({ announcementId, userId });
      if (!view) {
        try {
          await AnnouncementView.create({ announcementId, userId });
          let doc = await Placement.findById(announcementId) || await AdminPost.findById(announcementId);
          if (doc) {
            doc.views = (doc.views || 0) + 1;
            doc.uniqueViewers = (doc.uniqueViewers || 0) + 1;
            doc.lastViewed = new Date();
            await doc.save();
          }
        } catch (err) {
          if (err.code !== 11000) throw err;
        }
      }
    } else if (action === 'click' || action === 'apply') {
      const tenSecondsAgo = new Date(Date.now() - 10000);
      const recentClick = await AnnouncementClick.findOne({
        announcementId,
        userId,
        createdAt: { $gte: tenSecondsAgo }
      });
      if (!recentClick) {
        await AnnouncementClick.create({ announcementId, userId });
        let doc = await Placement.findById(announcementId) || await AdminPost.findById(announcementId);
        if (doc) {
          doc.clicks = (doc.clicks || 0) + 1;
          doc.applications = (doc.applications || 0) + 1;
          doc.lastClicked = new Date();
          await doc.save();
        }
      }
    }

    let doc = await Placement.findById(announcementId);
    if (!doc) doc = await AdminPost.findById(announcementId);
    if (!doc) return res.status(404).json({ success: false, error: 'Broadcast not found' });

    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Student Home Routes
// GET /api/student/home-feed - Get student home feed (admin posts & placements combined) with strict eligibility
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

    let feed = [];

    // Fetch normal admin posts (excluding placement/internship since those are in placements)
    if (!category || category === 'all' || category === 'announcement' || category === 'event' || category === 'notice') {
      const posts = await AdminPost.find({
        ...query,
        category: { $nin: ['placement', 'internship'] }
      });
      feed.push(...posts);
    }

    // Fetch placements (where placementType is OFFICIAL)
    if (!category || category === 'all' || category === 'placement' || category === 'internship') {
      const placementQuery = {
        college: new RegExp(college, 'i'),
        status: 'active',
        placementType: 'OFFICIAL'
      };

      if (category === 'placement') {
        placementQuery.employmentType = { $ne: 'Internship' };
      } else if (category === 'internship') {
        placementQuery.employmentType = 'Internship';
      }

      const placements = await Placement.find(placementQuery);

      const formattedPlacements = placements.map(p => ({
        _id: p._id,
        id: p._id.toString(),
        title: p.title || `Placement Drive: ${p.companyName} - ${p.jobRole}`,
        content: p.description,
        description: p.description,
        category: p.employmentType === 'Internship' ? 'internship' : 'placement',
        imageURL: p.companyLogo || '',
        college: p.college,
        createdBy: p.createdBy,
        createdByName: 'Campus Admin',
        isPinned: p.isPinned || false,
        status: p.status,
        relatedId: p._id.toString(),
        companyName: p.companyName,
        companyLogo: p.companyLogo,
        jobRole: p.jobRole,
        employmentType: p.employmentType,
        package: p.package,
        registrationDeadline: p.expiryDate,
        eligibilityAcademicYears: p.eligibleYears || [],
        eligibilityDepartments: p.eligibleDepartments || [],
        eligibilityCGPA: p.minimumCGPA || 0.0,
        eligibilityBacklogs: p.maximumBacklogs || 0,
        eligibilityBatches: p.eligibleBatches || [],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));

      feed.push(...formattedPlacements);
    }

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
          const eligibilityInfo = checkPlacementEligibility(student, {
            college: ann.college,
            minCGPA: ann.eligibilityCGPA,
            maxBacklogs: ann.eligibilityBacklogs,
            branches: ann.eligibilityDepartments,
            batches: ann.eligibilityBatches,
            eligibleYears: ann.eligibilityAcademicYears
          });
          return eligibilityInfo.eligible;
        }

        return true;
      });

      filteredFeed.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return res.json({ success: true, data: filteredFeed });
    }

    feed.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

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

// POST /api/posts & /api/feed/posts - Create student post
const handleCreateStudentPost = async (req, res) => {
  try {
    const { content, text, caption, isAnonymous, category, image, images, videoUrl, videos, imageUrls, videoUrls } = req.body;
    const userId = req.user ? req.user.userId : (req.body.userId || null);

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
    }

    const normalizedContent = (content || text || caption || '').trim();
    const normalizedImages = Array.isArray(images) ? images : (Array.isArray(imageUrls) ? imageUrls : (image ? [image] : []));
    const normalizedVideos = Array.isArray(videos) ? videos : (Array.isArray(videoUrls) ? videoUrls : (videoUrl ? [videoUrl] : []));

    if (!normalizedContent && normalizedImages.length === 0 && normalizedVideos.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please enter some text or attach an image or video to publish a post.' 
      });
    }

    const author = await User.findOne({ userId }) || await Alumni.findOne({ userId });
    const primaryImage = normalizedImages[0] || '';
    const primaryVideo = normalizedVideos[0] || '';

    const newPost = new StudentPost({
      userId,
      college: req.user ? req.user.college : (author ? author.college : ''),
      authorName: author ? (author.fullName || author.name) : 'Student',
      authorAvatar: author ? (author.profileImageUrl || (author.photos && author.photos[0]) || '') : '',
      isAnonymous: !!isAnonymous,
      content: normalizedContent,
      image: primaryImage,
      videoUrl: primaryVideo,
      images: normalizedImages,
      videos: normalizedVideos,
      category: category || 'general',
      type: 'student_post'
    });

    await newPost.save();

    const postObj = newPost.toObject();
    postObj.id = newPost._id.toString();
    postObj.likes = 0;
    postObj.isLiked = false;
    postObj.comments = [];
    postObj.reactions = { '❤️': [], '🔥': [], '😂': [], '👀': [], '👍': [] };

    if (globalThis.io) {
      globalThis.io.emit('post:created', postObj);
    }

    res.status(201).json({ success: true, data: postObj, message: 'Post published successfully' });
  } catch (error) {
    console.error('❌ [Create Post Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

router.post('/posts', requireAuth, handleCreateStudentPost);
router.post('/feed/posts', requireAuth, handleCreateStudentPost);

// GET /api/posts/:postId - Get complete details of a single post (student or alumni)
router.get('/posts/:postId', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const currentUserId = req.user.userId;

    let isAlumniPost = false;
    let post = await StudentPost.findById(postId);
    if (!post && mongoose.Types.ObjectId.isValid(postId)) {
      post = await Post.findById(postId);
      if (post) isAlumniPost = true;
    }

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    const postObj = post.toObject();
    postObj.id = post._id.toString();

    if (isAlumniPost) {
      const author = await Alumni.findOne({ userId: post.alumniId }) || await User.findOne({ userId: post.alumniId });
      if (author) {
        postObj.authorName = author.fullName || author.name || 'Alumni';
        postObj.authorAvatar = author.profileImageUrl || (author.photos && author.photos[0]) || '';
        postObj.author = author.toObject();
      }
      postObj.likes = post.likes?.length || 0;
      postObj.isLiked = post.likes?.includes(currentUserId) || false;

      const commentsList = post.comments || [];
      postObj.comments = commentsList.map(c => ({
        id: c._id ? c._id.toString() : c.id,
        authorId: c.userId,
        authorName: c.userName || 'User',
        authorAvatar: c.userAvatar || '',
        content: c.content,
        createdAt: c.createdAt
      }));
      postObj.reactions = { '❤️': postObj.isLiked ? [currentUserId] : [], '🔥': [], '😂': [], '👀': [], '👍': [] };
    } else {
      const author = await User.findOne({ userId: post.userId }) || await Alumni.findOne({ userId: post.userId });
      if (author && !post.isAnonymous) {
        postObj.authorName = author.name || 'Student';
        postObj.authorAvatar = author.profileImageUrl || (author.photos && author.photos[0]) || '';
        postObj.author = author.toObject();
      } else if (post.isAnonymous) {
        postObj.authorName = 'Anonymous Student';
        postObj.authorAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=anon-${post._id}`;
      }

      const likesCount = await Like.countDocuments({ postId });
      const isLiked = await Like.exists({ postId, userId: currentUserId });

      const commentsList = await Comment.find({ postId }).sort({ createdAt: 1 });

      postObj.likes = likesCount;
      postObj.isLiked = !!isLiked;
      postObj.comments = commentsList.map(c => ({
        id: c._id.toString(),
        authorId: c.userId,
        authorName: c.userName || 'Anonymous',
        authorAvatar: c.userAvatar || '',
        content: c.content,
        createdAt: c.createdAt
      }));
      postObj.reactions = { '❤️': isLiked ? [currentUserId] : [], '🔥': [], '😂': [], '👀': [], '👍': [] };
    }

    res.json({ success: true, data: postObj });
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
        await createNotification({
          recipientId: postObj.userId,
          senderId: userId,
          type: 'post_like',
          title: 'Post Liked 👍',
          message: 'Someone liked your post.',
          entityId: postId,
          entityType: 'post'
        });
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
      await createNotification({
        recipientId: postObj.userId,
        senderId: userId,
        type: 'post_comment',
        title: 'New Comment on Post! 💬',
        message: `${commenter ? commenter.name : 'Someone'} commented: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
        entityId: postId,
        entityType: 'post'
      });
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
      const sortedIds = [fromUserId, toUserId].sort();
      const conversationKey = `${sortedIds[0]}_${sortedIds[1]}`;
      let conn = await Connection.findOne({ conversationKey });
      if (!conn) {
        conn = new Connection({
          user1: fromUserId,
          user2: toUserId,
          conversationKey,
          participants: sortedIds,
          lastMessage: '',
          lastMessageAt: new Date()
        });
        await conn.save();
      }

      // Trigger notifications for both users
      const senderObj = await User.findOne({ userId: fromUserId });
      const targetObj = await User.findOne({ userId: toUserId });

      await createNotification({
        recipientId: toUserId,
        senderId: fromUserId,
        type: 'friend_accept',
        title: 'New Connection Match! 🎉',
        message: `You and ${senderObj ? senderObj.name : 'a student'} are now connected!`,
        entityId: fromUserId,
        entityType: 'user'
      });

      await createNotification({
        recipientId: fromUserId,
        senderId: toUserId,
        type: 'friend_accept',
        title: 'New Connection Match! 🎉',
        message: `You and ${targetObj ? targetObj.name : 'a student'} are now connected!`,
        entityId: toUserId,
        entityType: 'user'
      });

      return res.json({ success: true, matched: true, status: 'accepted' });
    }

    // Otherwise create pending connection request
    await FriendRequest.findOneAndUpdate(
      { fromUserId, toUserId },
      { status: 'pending' },
      { upsert: true }
    );

    const senderObj = await User.findOne({ userId: fromUserId });
    await createNotification({
      recipientId: toUserId,
      senderId: fromUserId,
      type: 'friend_request',
      title: 'New Connection Request',
      message: `${senderObj ? senderObj.name : 'A student'} wants to connect with you.`,
      entityId: fromUserId,
      entityType: 'user'
    });

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

    const sortedIds = [request.fromUserId, request.toUserId].sort();
    const conversationKey = `${sortedIds[0]}_${sortedIds[1]}`;
    let conn = await Connection.findOne({ conversationKey });
    if (!conn) {
      conn = new Connection({
        user1: request.fromUserId,
        user2: request.toUserId,
        conversationKey,
        participants: sortedIds,
        lastMessage: '',
        lastMessageAt: new Date()
      });
      await conn.save();
    }

    // Add to connections array for both users
    await User.findOneAndUpdate({ userId: request.fromUserId }, { $addToSet: { connections: request.toUserId } });
    await Alumni.findOneAndUpdate({ userId: request.fromUserId }, { $addToSet: { connections: request.toUserId } });
    await User.findOneAndUpdate({ userId: request.toUserId }, { $addToSet: { connections: request.fromUserId } });
    await Alumni.findOneAndUpdate({ userId: request.toUserId }, { $addToSet: { connections: request.fromUserId } });

    const recipientObj = await User.findOne({ userId: request.toUserId });
    await createNotification({
      recipientId: request.fromUserId,
      senderId: request.toUserId,
      type: 'friend_accept',
      title: 'Connection Accepted! 🎉',
      message: `${recipientObj ? recipientObj.name : 'A student'} accepted your connection request.`,
      entityId: request.toUserId,
      entityType: 'user'
    });

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/connections/remove - Remove a connection / unfriend
router.post('/connections/remove', requireAuth, async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.userId;
    if (!friendId) {
      return res.status(400).json({ success: false, error: 'friendId is required' });
    }

    // Pull from connections array for both users
    await User.findOneAndUpdate({ userId }, { $pull: { connections: friendId } });
    await Alumni.findOneAndUpdate({ userId }, { $pull: { connections: friendId } });
    await User.findOneAndUpdate({ userId: friendId }, { $pull: { connections: userId } });
    await Alumni.findOneAndUpdate({ userId: friendId }, { $pull: { connections: userId } });

    // Also delete any Connection document
    const sortedIds = [userId, friendId].sort();
    const conversationKey = `${sortedIds[0]}_${sortedIds[1]}`;
    await Connection.deleteOne({ conversationKey });

    // Optionally delete FriendRequest documents
    await FriendRequest.deleteMany({
      $or: [
        { fromUserId: userId, toUserId: friendId },
        { fromUserId: friendId, toUserId: userId }
      ]
    });

    res.json({ success: true, message: 'Friend removed successfully' });
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

// GET /api/student/profile & /api/student/profile/:userId - Get student profile
const handleGetStudentProfile = async (req, res) => {
  try {
    let rawId = req.params.userId || req.params.id || req.query.userId || (req.user && req.user.userId);
    if (rawId === 'me' && req.user) {
      rawId = req.user.userId;
    }

    let profile = await User.findOne({ userId: rawId }) || await Alumni.findOne({ userId: rawId });
    if (!profile && mongoose.Types.ObjectId.isValid(rawId)) {
      profile = await User.findById(rawId) || await Alumni.findById(rawId);
    }

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    // College isolation check
    if (req.user.role !== 'super_admin' && profile.college && req.user.college && profile.college !== req.user.college) {
      return res.status(403).json({ success: false, error: 'Access denied: Profile belongs to a different college.' });
    }

    if (profile.userId && !(await isProfileVisible(req.user.userId, profile.userId, profile))) {
      return res.status(403).json({ success: false, error: 'Access denied: Profile is private or restricted.' });
    }

    const profileObj = profile.toObject();
    profileObj.profileCompletion = computeBackendProfileCompletion(profileObj);
    res.json({ success: true, data: profileObj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/student/profile', requireAuth, handleGetStudentProfile);
router.get('/student/profile/:userId', requireAuth, handleGetStudentProfile);

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

    const existingUser = await User.findOne({ userId });
    const finalName = (name && name.trim() !== '') ? name.trim() : (existingUser?.name || existingUser?.fullName || '');

    const updatePayload = {
      email,
      role: 'student',
      department: department !== undefined ? department : (existingUser?.department || ''),
      batch: batch !== undefined ? batch : (existingUser?.batch || ''),
      skills: skills || existingUser?.skills || [],
      bio: bio !== undefined ? bio : (existingUser?.bio || ''),
      interests: interests || existingUser?.interests || [],
      clubs: clubs || existingUser?.clubs || [],
      achievements: achievements || existingUser?.achievements || [],
      profileImageUrl: profileImageUrl || existingUser?.profileImageUrl || '',
      college: college || existingUser?.college || '',
      photos: photos || existingUser?.photos || [],
      personalEmail: personalEmail !== undefined ? personalEmail : (existingUser?.personalEmail || ''),
      linkedinUrl: linkedinUrl !== undefined ? linkedinUrl : (existingUser?.linkedinUrl || ''),
      githubUrl: githubUrl !== undefined ? githubUrl : (existingUser?.githubUrl || ''),
      projects: projects || existingUser?.projects || [],
      careerGoals: careerGoals !== undefined ? careerGoals : (existingUser?.careerGoals || ''),
      cgpa: typeof cgpa === 'number' ? cgpa : (cgpa ? parseFloat(cgpa) : (existingUser?.cgpa || 0.0)),
      backlogs: typeof backlogs === 'number' ? backlogs : (backlogs ? parseInt(backlogs) : (existingUser?.backlogs || 0)),
      academicYear: academicYear !== undefined ? academicYear : (existingUser?.academicYear || '')
    };

    if (finalName) {
      updatePayload.name = finalName;
      updatePayload.fullName = finalName;
    }

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

// GET /users/:id/presence - Get user presence status
router.get('/users/:id/presence', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ userId: id }) || await Alumni.findOne({ userId: id });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({
      isOnline: user.isOnline || false,
      lastSeen: user.lastSeen || user.updatedAt || new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /connections - Fetch active connection matches
router.get('/connections', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const connections = await Connection.find({
      $or: [{ user1: userId }, { user2: userId }]
    }).sort({ lastMessageAt: -1, updatedAt: -1 });

    const matches = [];
    const seenUserIds = new Set();

    for (const conn of connections) {
      const otherUserId = conn.user1 === userId ? conn.user2 : conn.user1;
      
      // Prevent duplicate rendering
      if (seenUserIds.has(otherUserId)) {
        continue;
      }
      seenUserIds.add(otherUserId);

      let otherUser = await User.findOne({ userId: otherUserId }) || await Alumni.findOne({ userId: otherUserId });
      
      if (otherUser) {
        // College isolation check
        if (req.user.role !== 'super_admin' && otherUser.college !== req.user.college) {
          continue;
        }

        const unreadCount = await Message.countDocuments({
          matchId: conn._id.toString(),
          receiverId: userId,
          read: false
        });

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
            college: otherUser.college || '',
            isOnline: otherUser.isOnline || false,
            lastSeen: otherUser.lastSeen || otherUser.updatedAt || new Date()
          },
          matchedAt: conn.createdAt.toISOString(),
          unreadCount,
          isRevealed: true, // Always true to ensure real name & avatar are displayed (Never Anonymous)
          lastMessage: conn.lastMessage || '',
          lastMessageTime: conn.lastMessageAt ? conn.lastMessageAt.toISOString() : (conn.updatedAt || conn.createdAt).toISOString()
        });
      }
    }
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /connections/resolve - Resolve or create a direct connection with a friend
router.post('/connections/resolve', requireAuth, async (req, res) => {
  try {
    const fromUserId = req.user.userId;
    const { friendId } = req.body;
    if (!friendId) {
      return res.status(400).json({ success: false, error: 'friendId is required' });
    }

    const sortedIds = [fromUserId, friendId].sort();
    const conversationKey = `${sortedIds[0]}_${sortedIds[1]}`;

    let conn = await Connection.findOne({ conversationKey });
    if (!conn) {
      conn = new Connection({
        user1: fromUserId,
        user2: friendId,
        conversationKey,
        participants: sortedIds,
        lastMessage: '',
        lastMessageAt: new Date()
      });
      await conn.save();
    }

    // Now, return the resolved connection object formatted just like getMatches output
    const otherUser = await User.findOne({ userId: friendId }) || await Alumni.findOne({ userId: friendId });
    if (!otherUser) {
      return res.status(404).json({ success: false, error: 'Friend not found' });
    }

    const unreadCount = await Message.countDocuments({
      matchId: conn._id.toString(),
      receiverId: fromUserId,
      read: false
    });

    const matchData = {
      id: conn._id.toString(),
      userId: friendId,
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
        college: otherUser.college || '',
        isOnline: otherUser.isOnline || false,
        lastSeen: otherUser.lastSeen || otherUser.updatedAt || new Date()
      },
      matchedAt: conn.createdAt.toISOString(),
      unreadCount,
      isRevealed: true,
      lastMessage: conn.lastMessage || '',
      lastMessageTime: conn.lastMessageAt ? conn.lastMessageAt.toISOString() : (conn.updatedAt || conn.createdAt).toISOString()
    };

    res.json({ success: true, data: matchData });
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

    const otherUserOid = otherUserId;

    // Check if current user (the recipient fetching these messages) has resonance enabled
    const recipientUser = await User.findOne({ userId: req.user.userId }) || await Alumni.findOne({ userId: req.user.userId });
    const isResonanceEnabled = recipientUser ? recipientUser.resonanceEnabled !== false : true;

    if (isResonanceEnabled) {
      // Set incoming messages from the other user to harmonized (delivered)
      await Message.updateMany(
        { matchId, senderId: otherUserOid, status: 'sent' },
        { $set: { status: 'delivered', resonanceState: 'harmonized' } }
      );
    } else {
      // If privacy is disabled, mark messages directly as absorbed (seen) silently
      await Message.updateMany(
        { matchId, senderId: otherUserOid, read: false },
        { $set: { read: true, status: 'seen', resonanceState: 'absorbed' } }
      );
    }

    const list = await Message.find({ matchId, deletedForUsers: { $ne: req.user.userId } }).sort({ timestamp: 1 });
    const maskedList = list.map(msg => {
      if (msg.retentionMode === 'VIEW_ONCE' || msg.visibility === 'view_once') {
        const copy = msg.toObject();
        copy.visibility = 'view_once';
        if (msg.viewed) {
          copy.text = 'Opened';
          copy.attachments = [];
          copy.documentUrl = undefined;
          copy.documentName = undefined;
          copy.imageUrl = undefined;
          copy.url = undefined;
          copy.title = undefined;
          copy.description = undefined;
          copy.thumbnail = undefined;
          return copy;
        } else {
          // If not viewed yet, route the downloadUrl and imageUrl to the secure streaming endpoint!
          const secureUrl = `/api/chats/${matchId}/messages/${msg._id}/media`;
          if (copy.attachments && copy.attachments.length > 0) {
            copy.attachments[0].downloadUrl = secureUrl;
          }
          if (copy.imageUrl) copy.imageUrl = secureUrl;
          
          // Securely mask/hide the encrypted database text in message history
          copy.text = ''; 
          copy.isLocked = true;
          return copy;
        }
      }
      return msg;
    });

    res.json({ success: true, data: maskedList });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/chats/:matchId/upload - Upload file attachments
router.post('/chats/:matchId/upload', requireAuth, upload.array('files'), async (req, res) => {
  try {
    const { matchId } = req.params;
    const conn = await Connection.findById(matchId);
    if (!conn || (conn.user1 !== req.user.userId && conn.user2 !== req.user.userId)) {
      return res.status(403).json({ success: false, error: 'Access denied: Connection match invalid.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded.' });
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}/uploads`;

    const uploadedAttachments = req.files.map(file => {
      const isImage = file.mimetype.startsWith('image/');
      return {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        downloadUrl: `${baseUrl}/${file.filename}`,
        thumbnailUrl: isImage ? `${baseUrl}/${file.filename}` : undefined
      };
    });

    res.json({ success: true, data: uploadedAttachments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /chats/:matchId/messages - Send direct message
router.post('/chats/:matchId/messages', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { text, messageType, attachments, retentionMode } = req.body;
    const senderUserId = req.user.userId;

    const conn = await Connection.findById(matchId);
    if (!conn || (conn.user1 !== senderUserId && conn.user2 !== senderUserId)) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not part of this connection.' });
    }

    const otherUserId = conn.user1 === senderUserId ? conn.user2 : conn.user1;
    const otherUser = await User.findOne({ userId: otherUserId }) || await Alumni.findOne({ userId: otherUserId });
    
    // College isolation check
    if (req.user.role !== 'super_admin' && (!otherUser || otherUser.college !== req.user.college)) {
      return res.status(403).json({ success: false, error: 'Access denied: Recipient belongs to a different college.' });
    }

    if (await isBlockedBetween(senderUserId, otherUserId)) {
      return res.status(403).json({ success: false, error: 'Cannot send message: This user is blocked.' });
    }
    const sender = await User.findOne({ userId: senderUserId }) || await Alumni.findOne({ userId: senderUserId });
    const senderRole = sender ? sender.role : 'student';
    if (!(await canMessage(senderUserId, senderRole, otherUserId))) {
      return res.status(403).json({ success: false, error: 'Cannot send message: Receiver settings restrict this action.' });
    }

    let finalMessageType = messageType || 'text';
    let docUrl = undefined, docName = undefined, mType = undefined, fSize = undefined;
    let imgUrl = undefined;
    let lUrl = undefined, lTitle = undefined, lDesc = undefined, lThumb = undefined;

    if (attachments && attachments.length > 0) {
      const att = attachments[0];
      if (att.mimeType && att.mimeType.startsWith('image/')) {
        finalMessageType = 'image';
        imgUrl = att.downloadUrl;
      } else {
        finalMessageType = 'document';
        docUrl = att.downloadUrl;
        docName = att.fileName;
        mType = att.mimeType;
        fSize = att.fileSize;
      }
    } else if (text) {
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const urls = text.match(urlRegex);
      if (urls && urls.length > 0) {
        finalMessageType = 'link';
        lUrl = urls[0];
        try {
          const parsed = new URL(lUrl);
          lTitle = parsed.hostname;
        } catch (_) {
          lTitle = 'Shared Link';
        }
        lDesc = `Shared link: ${lUrl}`;
        lThumb = '';
      }
    }

    const isViewOnce = retentionMode === 'VIEW_ONCE';

    const recipientUser = await User.findOne({ userId: otherUserId }) || await Alumni.findOne({ userId: otherUserId });
    const isRecipientOnline = recipientUser ? recipientUser.isOnline : false;

    const newMsg = new Message({
      matchId,
      conversationId: matchId,
      senderId: req.user.userId,
      receiverId: otherUserId,
      college: req.user.college,
      messageType: finalMessageType,
      text: isViewOnce ? encryptText(text || '') : (text || ''),
      attachments: attachments || [],
      documentUrl: docUrl,
      documentName: docName,
      mimeType: mType,
      fileSize: fSize,
      imageUrl: imgUrl,
      url: lUrl,
      title: lTitle,
      description: lDesc,
      thumbnail: lThumb,
      timestamp: new Date(),
      read: false,
      status: isRecipientOnline ? 'delivered' : 'sent',
      deliveredAt: isRecipientOnline ? new Date() : null,
      resonanceState: 'bridged',
      reactions: [],
      retentionMode: retentionMode || 'NEVER_DELETE',
      visibility: isViewOnce ? 'view_once' : 'normal'
    });
    await newMsg.save();

    // Update connection lastMessage and lastMessageAt
    conn.lastMessage = finalMessageType === 'image' ? 'Sent an image' : (isViewOnce ? 'Sent a View Once Message' : (text || 'Sent an attachment'));
    conn.lastMessageAt = newMsg.timestamp || new Date();
    await conn.save();

    let notificationText = finalMessageType === 'image' ? 'Sent an image' : (text || 'Sent an attachment');
    if (isViewOnce) {
      if (finalMessageType === 'image') notificationText = 'Sent a View Once Photo';
      else if (finalMessageType === 'video') notificationText = 'Sent a View Once Video';
      else notificationText = 'Sent a View Once Message';
    }
    
    // Trigger real-time DM notification to the other user
    await createNotification({
      recipientId: otherUserId,
      senderId: senderUserId,
      type: 'new_message',
      title: sender ? sender.name : 'New Message',
      message: notificationText,
      entityId: matchId,
      entityType: 'chat'
    });

    const clientMsg = newMsg.toObject();
    if (isViewOnce) {
      clientMsg.text = '';
      clientMsg.isLocked = true;
      clientMsg.visibility = 'view_once';
    }

    if (global.io) {
      global.io.to(`match_${matchId}`).emit('message:received', clientMsg);
      global.io.to(`match_${matchId}`).emit('chat:media_update', {
        matchId,
        messageType: finalMessageType
      });
    }
    res.json({ success: true, data: clientMsg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /chat/:conversationId/shared/photos - Get shared photos
router.get('/chat/:conversationId/shared/photos', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conn = await Connection.findById(conversationId);
    if (!conn || (conn.user1 !== req.user.userId && conn.user2 !== req.user.userId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }
    const photos = await Message.find({
      $or: [
        { matchId: conversationId, messageType: 'image' },
        { conversationId, messageType: 'image' },
        { matchId: conversationId, 'attachments.mimeType': /^image\// }
      ]
    }).sort({ timestamp: -1 });

    const seen = new Set();
    const list = [];
    photos.forEach(msg => {
      if (msg.imageUrl) {
        if (!seen.has(msg.imageUrl)) {
          seen.add(msg.imageUrl);
          list.push({
            msgId: msg._id,
            imageUrl: msg.imageUrl,
            senderId: msg.senderId,
            createdAt: msg.timestamp || msg.createdAt
          });
        }
      }
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
          if (att.mimeType && att.mimeType.startsWith('image/')) {
            if (!seen.has(att.downloadUrl)) {
              seen.add(att.downloadUrl);
              list.push({
                msgId: msg._id,
                imageUrl: att.downloadUrl,
                senderId: msg.senderId,
                createdAt: msg.timestamp || msg.createdAt
              });
            }
          }
        });
      }
    });

    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /chat/:conversationId/shared/documents - Get shared documents
router.get('/chat/:conversationId/shared/documents', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conn = await Connection.findById(conversationId);
    if (!conn || (conn.user1 !== req.user.userId && conn.user2 !== req.user.userId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }
    const docs = await Message.find({
      $or: [
        { matchId: conversationId, messageType: 'document' },
        { conversationId, messageType: 'document' },
        { matchId: conversationId, messageType: 'file' },
        { matchId: conversationId, 'attachments.mimeType': { $not: /^image\// } }
      ]
    }).sort({ timestamp: -1 });

    const seen = new Set();
    const list = [];
    docs.forEach(msg => {
      if (msg.documentUrl) {
        if (!seen.has(msg.documentUrl)) {
          seen.add(msg.documentUrl);
          list.push({
            msgId: msg._id,
            documentUrl: msg.documentUrl,
            documentName: msg.documentName || 'Document',
            mimeType: msg.mimeType,
            fileSize: msg.fileSize,
            senderId: msg.senderId,
            createdAt: msg.timestamp || msg.createdAt
          });
        }
      }
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
          if (!att.mimeType || !att.mimeType.startsWith('image/')) {
            if (!seen.has(att.downloadUrl)) {
              seen.add(att.downloadUrl);
              list.push({
                msgId: msg._id,
                documentUrl: att.downloadUrl,
                documentName: att.fileName,
                mimeType: att.mimeType,
                fileSize: att.fileSize,
                senderId: msg.senderId,
                createdAt: msg.timestamp || msg.createdAt
              });
            }
          }
        });
      }
    });

    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /chat/:conversationId/shared/links - Get shared links
router.get('/chat/:conversationId/shared/links', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conn = await Connection.findById(conversationId);
    if (!conn || (conn.user1 !== req.user.userId && conn.user2 !== req.user.userId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }
    const links = await Message.find({
      $or: [
        { matchId: conversationId, messageType: 'link' },
        { conversationId, messageType: 'link' }
      ]
    }).sort({ timestamp: -1 });

    const seen = new Set();
    const list = [];
    links.forEach(msg => {
      const url = msg.url || msg.text;
      if (url) {
        if (!seen.has(url)) {
          seen.add(url);
          list.push(msg);
        }
      } else {
        list.push(msg);
      }
    });

    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /users/:id/presence - Get presence
router.get('/users/:id/presence', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ userId: id }) || await Alumni.findOne({ userId: id });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({
      success: true,
      data: {
        userId: user.userId,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        lastActivity: user.lastActivity
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /users/presence - Update presence
router.patch('/users/presence', requireAuth, async (req, res) => {
  try {
    const { isOnline } = req.body;
    const update = {
      isOnline: !!isOnline,
      lastActivity: new Date()
    };
    if (!isOnline) {
      update.lastSeen = new Date();
    }
    const userId = req.user.userId;
    let user = await User.findOneAndUpdate({ userId }, { $set: update }, { new: true });
    if (!user) {
      user = await Alumni.findOneAndUpdate({ userId }, { $set: update }, { new: true });
    }

    if (user && global.io) {
      const connections = await Connection.find({
        $or: [{ user1: userId }, { user2: userId }]
      });
      connections.forEach(conn => {
        global.io.to(`match_${conn._id}`).emit('presence:status', {
          userId,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen
        });
      });
    }

    res.json({ success: true, data: { isOnline: user?.isOnline, lastSeen: user?.lastSeen } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /typing/start - Typing start
router.post('/typing/start', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (global.io) {
      global.io.to(`match_${conversationId}`).emit('typing', {
        roomId: conversationId,
        userId: req.user.userId,
        isTyping: true
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /typing/stop - Typing stop
router.post('/typing/stop', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (global.io) {
      global.io.to(`match_${conversationId}`).emit('typing', {
        roomId: conversationId,
        userId: req.user.userId,
        isTyping: false
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /messages/read - Read messages
router.patch('/messages/read', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.body;
    const currentUserId = req.user.userId;
    const conn = await Connection.findById(conversationId);
    if (!conn || (conn.user1 !== currentUserId && conn.user2 !== currentUserId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const otherUserId = conn.user1 === currentUserId ? conn.user2 : conn.user1;

    await Message.updateMany(
      { 
        $or: [{ matchId: conversationId }, { conversationId }], 
        senderId: otherUserId, 
        status: { $ne: 'seen' } 
      },
      { 
        $set: { 
          read: true, 
          status: 'seen', 
          seenAt: new Date(),
          resonanceState: 'absorbed' 
        } 
      }
    );

    if (global.io) {
      global.io.to(`match_${conversationId}`).emit('message:seen', {
        conversationId,
        seenBy: currentUserId,
        seenAt: new Date()
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /chats/:matchId/messages/:messageId/media - Get secure authorized media stream
router.get('/chats/:matchId/messages/:messageId/media', requireAuth, async (req, res) => {
  try {
    const { matchId, messageId } = req.params;
    const currentUserId = req.user.userId;

    const conn = await Connection.findById(matchId);
    if (!conn || (conn.user1 !== currentUserId && conn.user2 !== currentUserId)) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not part of this connection.' });
    }

    const msg = await Message.findOne({ _id: messageId, matchId });
    if (!msg) {
      return res.status(404).json({ success: false, error: 'Message not found.' });
    }

    if (msg.retentionMode === 'VIEW_ONCE' && msg.viewed) {
      return res.status(403).json({ success: false, error: 'Access denied: This View Once message has already been viewed.' });
    }

    const att = msg.attachments?.[0];
    const rawUrl = att ? att.downloadUrl : msg.imageUrl;
    if (!rawUrl) {
      return res.status(404).json({ success: false, error: 'Media URL not configured on message.' });
    }

    const fs = require('fs');
    const path = require('path');
    const filename = rawUrl.split('/').pop();
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ View Once Media file not found on disk: ${filePath}`);
      return res.status(404).json({ success: false, error: 'Physical media file not found on storage.' });
    }

    res.setHeader('Content-Type', (att && att.mimeType) || 'image/png');
    console.log(`📡 Streaming secure View Once media to user [${currentUserId}] for message [${messageId}]`);
    
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('Streaming error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Error streaming file.' });
      }
    });
    stream.pipe(res);
  } catch (error) {
    console.error('Media stream endpoint crashed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /chats/:matchId/messages/:messageId/open - Open/view disappearing message
router.post('/chats/:matchId/messages/:messageId/open', requireAuth, async (req, res) => {
  try {
    const { matchId, messageId } = req.params;
    const currentUserId = req.user.userId;

    const conn = await Connection.findById(matchId);
    if (!conn || (conn.user1 !== currentUserId && conn.user2 !== currentUserId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const msg = await Message.findOne({ 
      _id: messageId, 
      matchId, 
      retentionMode: 'VIEW_ONCE', 
      viewed: false 
    });

    if (!msg) {
      return res.status(400).json({ success: false, error: 'Message already opened or invalid request.' });
    }

    const decrypted = msg.messageType === 'text' ? decryptText(msg.text) : '';

    // Permanently overwrite database fields on the spot
    msg.viewed = true;
    msg.viewedAt = new Date();
    msg.deletedAt = new Date();
    msg.text = 'This message disappeared.';
    msg.attachments = [];
    msg.imageUrl = null;
    msg.documentUrl = null;
    msg.url = null;
    msg.title = null;
    msg.description = null;
    msg.thumbnail = null;
    await msg.save();

    // Clean up physical disk files if any
    const fs = require('fs');
    const path = require('path');
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach(att => {
        if (att.downloadUrl) {
          try {
            const filename = att.downloadUrl.split('/').pop();
            const filePath = path.join(__dirname, 'uploads', filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`🗑️ Deleted physical file: ${filePath}`);
            }
          } catch (fileErr) {
            console.error('Failed to delete physical file:', fileErr.message);
          }
        }
      });
    }

    if (global.io) {
      global.io.to(`match_${matchId}`).emit('message:opened', {
        matchId,
        messageId,
        viewedAt: msg.viewedAt
      });
      global.io.to(`match_${matchId}`).emit('chat:media_update', {
        matchId
      });
    }

    res.json({ success: true, data: { ...msg.toObject(), text: decrypted, visibility: 'view_once' } });
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

// GET /api/messages/:id/details - Get message details (sent, delivered, seen timestamps, etc.)
router.get('/messages/:id/details', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });

    // Auth verification
    const conn = await Connection.findById(msg.matchId);
    if (!conn || (conn.user1 !== currentUserId && conn.user2 !== currentUserId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    res.json({
      success: true,
      data: {
        id: msg._id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        messageType: msg.messageType,
        retentionMode: msg.retentionMode,
        timestamp: msg.timestamp,
        seenAt: msg.seenAt,
        deliveredAt: msg.deliveredAt,
        status: msg.status,
        pinned: msg.pinned,
        fileSize: msg.fileSize || (msg.attachments?.[0]?.fileSize),
        fileName: msg.documentName || (msg.attachments?.[0]?.fileName)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/messages/:id/react - Toggle emoji reaction on a message
router.post('/messages/:id/react', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const currentUserId = req.user.userId;

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });

    const conn = await Connection.findById(msg.matchId);
    if (!conn || (conn.user1 !== currentUserId && conn.user2 !== currentUserId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const idx = msg.reactions.findIndex(r => r.userId === currentUserId && r.emoji === emoji);
    if (idx > -1) {
      msg.reactions.splice(idx, 1);
    } else {
      msg.reactions.push({ emoji, userId: currentUserId, timestamp: new Date() });
    }
    await msg.save();

    if (global.io) {
      global.io.to(`match_${msg.matchId}`).emit('message:reactions_updated', {
        messageId: id,
        reactions: msg.reactions,
        matchId: msg.matchId
      });
    }

    res.json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/messages/:id/reply - Reply to a message
router.post('/messages/:id/reply', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, messageType } = req.body;
    const currentUserId = req.user.userId;

    const parentMsg = await Message.findById(id);
    if (!parentMsg) return res.status(404).json({ success: false, error: 'Parent message not found' });

    const conn = await Connection.findById(parentMsg.matchId);
    if (!conn || (conn.user1 !== currentUserId && conn.user2 !== currentUserId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const otherUserId = conn.user1 === currentUserId ? conn.user2 : conn.user1;
    const newMsg = new Message({
      matchId: parentMsg.matchId,
      conversationId: parentMsg.matchId,
      senderId: currentUserId,
      receiverId: otherUserId,
      college: req.user.college,
      messageType: messageType || 'text',
      text: text || '',
      replyToMessageId: id,
      timestamp: new Date(),
      status: 'sent'
    });
    await newMsg.save();

    if (global.io) {
      global.io.to(`match_${parentMsg.matchId}`).emit('message:received', newMsg);
    }

    res.json({ success: true, data: newMsg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/messages/:id/pin - Toggle pin state
router.post('/messages/:id/pin', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });

    const conn = await Connection.findById(msg.matchId);
    if (!conn || (conn.user1 !== currentUserId && conn.user2 !== currentUserId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    msg.pinned = !msg.pinned;
    msg.pinnedAt = msg.pinned ? new Date() : undefined;
    msg.pinnedBy = msg.pinned ? currentUserId : undefined;
    await msg.save();

    if (global.io) {
      global.io.to(`match_${msg.matchId}`).emit('message:pinned_updated', {
        messageId: id,
        pinned: msg.pinned,
        pinnedBy: msg.pinnedBy,
        pinnedAt: msg.pinnedAt,
        matchId: msg.matchId
      });
    }

    res.json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/messages/:id/bookmark - Toggle bookmark
router.post('/messages/:id/bookmark', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });

    const conn = await Connection.findById(msg.matchId);
    if (!conn || (conn.user1 !== currentUserId && conn.user2 !== currentUserId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const idx = msg.bookmarkedBy.indexOf(currentUserId);
    if (idx > -1) {
      msg.bookmarkedBy.splice(idx, 1);
    } else {
      msg.bookmarkedBy.push(currentUserId);
    }
    await msg.save();

    res.json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/messages/:id/share - Share/forward message to target match/connection
router.post('/messages/:id/share', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetMatchId } = req.body;
    const currentUserId = req.user.userId;

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });

    // Verify source room authorization
    const connSrc = await Connection.findById(msg.matchId);
    if (!connSrc || (connSrc.user1 !== currentUserId && connSrc.user2 !== currentUserId)) {
      return res.status(403).json({ success: false, error: 'Access denied: source connection invalid.' });
    }

    // Verify target room authorization
    const connTarget = await Connection.findById(targetMatchId);
    if (!connTarget || (connTarget.user1 !== currentUserId && connTarget.user2 !== currentUserId)) {
      return res.status(403).json({ success: false, error: 'Access denied: target connection invalid.' });
    }

    const otherUserId = connTarget.user1 === currentUserId ? connTarget.user2 : connTarget.user1;
    const newMsg = new Message({
      matchId: targetMatchId,
      conversationId: targetMatchId,
      senderId: currentUserId,
      receiverId: otherUserId,
      college: req.user.college,
      messageType: msg.messageType,
      text: msg.text || '',
      attachments: msg.attachments || [],
      imageUrl: msg.imageUrl,
      documentUrl: msg.documentUrl,
      documentName: msg.documentName,
      mimeType: msg.mimeType,
      fileSize: msg.fileSize,
      url: msg.url,
      title: msg.title,
      description: msg.description,
      thumbnail: msg.thumbnail,
      isForwarded: true,
      forwardedFrom: msg.senderId,
      forwardedBy: currentUserId,
      forwardedAt: new Date(),
      status: 'sent'
    });
    await newMsg.save();

    // Update connection lastMessage and lastMessageAt
    connTarget.lastMessage = msg.messageType === 'image' ? 'Sent an image' : (msg.text || 'Sent an attachment');
    connTarget.lastMessageAt = newMsg.timestamp || new Date();
    await connTarget.save();

    if (global.io) {
      global.io.to(`match_${targetMatchId}`).emit('message:received', newMsg);
    }

    res.json({ success: true, data: newMsg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/messages/:id/me - Delete for me
router.delete('/messages/:id/me', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });

    const conn = await Connection.findById(msg.matchId);
    if (!conn || (conn.user1 !== currentUserId && conn.user2 !== currentUserId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    if (!msg.deletedForUsers.includes(currentUserId)) {
      msg.deletedForUsers.push(currentUserId);
      await msg.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/messages/:id/everyone - Delete for everyone
router.delete('/messages/:id/everyone', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });

    // Authorization: Must be sender
    if (msg.senderId !== currentUserId) {
      return res.status(403).json({ success: false, error: 'Access denied: Only the sender can delete for everyone.' });
    }

    // Time limit window: 1 hour
    const limitMs = 60 * 60 * 1000;
    if (Date.now() - new Date(msg.timestamp).getTime() > limitMs) {
      return res.status(400).json({ success: false, error: 'Deletion window (1 hour) has expired.' });
    }

    // Clear contents and mark deletedForEveryone
    msg.text = 'This message was deleted.';
    msg.attachments = [];
    msg.imageUrl = null;
    msg.documentUrl = null;
    msg.documentName = null;
    msg.mimeType = null;
    msg.fileSize = null;
    msg.url = null;
    msg.title = null;
    msg.description = null;
    msg.thumbnail = null;
    msg.deletedForEveryone = true;
    await msg.save();

    // Socket broadcast
    if (global.io) {
      global.io.to(`match_${msg.matchId}`).emit('message:deleted_everyone', {
        messageId: id,
        matchId: msg.matchId
      });
      global.io.to(`match_${msg.matchId}`).emit('chat:media_update', {
        matchId: msg.matchId
      });
    }

    res.json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /chats/forward - Forward a message to multiple targets
router.post('/chats/forward', requireAuth, async (req, res) => {
  try {
    const { targetRoomIds, messageId, caption, messageType, attachments } = req.body;
    const senderUserId = req.user.userId;

    if (!targetRoomIds || !Array.isArray(targetRoomIds) || targetRoomIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No target rooms specified.' });
    }

    const sender = await User.findOne({ userId: senderUserId }) || await Alumni.findOne({ userId: senderUserId });
    const senderName = sender ? sender.name : 'Someone';

    const results = [];

    for (const targetId of targetRoomIds) {
      // 1. Check direct connection match
      const conn = await Connection.findById(targetId);
      if (conn) {
        if (conn.user1 !== senderUserId && conn.user2 !== senderUserId) {
          continue;
        }

        const newMsg = new Message({
          matchId: targetId,
          senderId: req.user._id,
          college: req.user.college,
          messageType: messageType || 'text',
          text: caption !== undefined ? caption : '',
          attachments: attachments || [],
          timestamp: new Date(),
          read: false,
          status: 'sent',
          resonanceState: 'bridged',
          reactions: [],
          isForwarded: true,
          forwardedFrom: messageId,
          forwardedBy: req.user._id,
          forwardedAt: new Date()
        });

        await newMsg.save();
        
        if (messageId) {
          await Message.findByIdAndUpdate(messageId, { $inc: { forwardCount: 1 } });
          await GroupMessage.findByIdAndUpdate(messageId, { $inc: { forwardCount: 1 } });
        }

        results.push({ targetId, type: 'direct', message: newMsg });

        if (global.io) {
          global.io.to(`match_${targetId}`).emit('message:received', newMsg);
        }
        continue;
      }

      // 2. Check group chat
      const group = await GroupChat.findById(targetId);
      if (group) {
        if (!group.members.includes(senderUserId)) {
          continue;
        }

        const gMsg = new GroupMessage({
          circleId: targetId,
          senderId: req.user._id,
          senderName,
          messageType: messageType || 'text',
          text: caption !== undefined ? caption : '',
          attachments: attachments || [],
          timestamp: new Date(),
          isForwarded: true,
          forwardedFrom: messageId,
          forwardedBy: req.user._id,
          forwardedAt: new Date()
        });

        await gMsg.save();

        if (messageId) {
          await Message.findByIdAndUpdate(messageId, { $inc: { forwardCount: 1 } });
          await GroupMessage.findByIdAndUpdate(messageId, { $inc: { forwardCount: 1 } });
        }

        await GroupChat.findByIdAndUpdate(targetId, {
          lastMessage: caption || (messageType === 'image' ? '🖼️ Sent an image' : '📎 Sent an attachment'),
          lastMessageAt: new Date()
        });

        results.push({ targetId, type: 'group', message: gMsg });

        if (global.io) {
          global.io.to(`group_${targetId}`).emit('group_message:received', gMsg);
        }
      }
    }

    res.json({ success: true, data: results });
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

// POST /chats/:matchId/read-all - Mark all unread messages in a conversation as seen
router.post('/chats/:matchId/read-all', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const currentUserId = req.user.userId;

    const conn = await Connection.findById(matchId);
    if (!conn || (conn.user1 !== currentUserId && conn.user2 !== currentUserId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const otherUserId = conn.user1 === currentUserId ? conn.user2 : conn.user1;

    // Find all unread messages where recipient is currentUserId (represented by receiverId == currentUserId)
    const result = await Message.updateMany(
      { 
        matchId, 
        receiverId: currentUserId,
        read: false 
      },
      { 
        $set: { 
          read: true, 
          status: 'seen',
          seenAt: new Date() 
        } 
      }
    );

    // Also fallback update messages where senderId != currentUserId just in case receiverId wasn't populated in legacy messages
    const otherUserDb = await User.findOne({ userId: otherUserId }) || await Alumni.findOne({ userId: otherUserId });
    if (otherUserDb) {
      await Message.updateMany(
        {
          matchId,
          senderId: otherUserDb._id,
          read: false
        },
        {
          $set: {
            read: true,
            status: 'seen',
            seenAt: new Date(),
            receiverId: currentUserId
          }
        }
      );
    }

    if (global.io) {
      // Emit to the other user so their read receipts update instantly
      global.io.to(`match_${matchId}`).emit('message:seen', { matchId, readerId: currentUserId });
      global.io.to(`user_${otherUserId}`).emit('conversation:update', { matchId });
    }

    res.json({ success: true, count: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /chats/:matchId/messages/:messageId/resonance - Update message resonance state
router.post('/chats/:matchId/messages/:messageId/resonance', requireAuth, async (req, res) => {
  try {
    const { matchId, messageId } = req.params;
    const { state } = req.body; // 'vibrant' | 'resonating' | 'absorbed'
    
    const conn = await Connection.findById(matchId);
    if (!conn || (conn.user1 !== req.user.userId && conn.user2 !== req.user.userId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const msg = await Message.findById(messageId);
    if (!msg || msg.matchId !== matchId) return res.status(404).json({ success: false, error: 'Message not found' });

    // Enforce privacy settings
    const user = await User.findOne({ userId: req.user.userId }) || await Alumni.findOne({ userId: req.user.userId });
    const resonanceEnabled = user ? user.resonanceEnabled !== false : true;

    if (!resonanceEnabled) {
      // If user has resonance disabled, it goes straight to absorbed silently
      msg.resonanceState = 'absorbed';
      msg.read = true;
      msg.status = 'seen';
    } else {
      msg.resonanceState = state;
      if (state === 'absorbed' || state === 'resonating') {
        msg.read = true;
        msg.status = 'seen';
      }
    }

    await msg.save();
    if (global.io) {
      global.io.to(`match_${matchId}`).emit('resonance:state_changed', { messageId, resonanceState: msg.resonanceState, status: msg.status });
    }
    res.json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /chats/:matchId/focus - Broadcast/Save user channel focus state
router.post('/chats/:matchId/focus', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { isFocused } = req.body;
    
    const conn = await Connection.findById(matchId);
    if (!conn || (conn.user1 !== req.user.userId && conn.user2 !== req.user.userId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const otherUserId = conn.user1 === req.user.userId ? conn.user2 : conn.user1;
    const otherUser = await User.findOne({ userId: otherUserId }) || await Alumni.findOne({ userId: otherUserId });
    const otherUserOid = otherUser ? otherUser._id.toString() : otherUserId;

    // If focusing on a channel, we can also auto-harmonize all pending messages sent to us
    if (isFocused) {
      await Message.updateMany(
        { matchId, senderId: otherUserOid, status: 'sent' },
        { $set: { status: 'delivered', resonanceState: 'harmonized' } }
      );
    }

    if (global.io) {
      global.io.to(`match_${matchId}`).emit('resonance:focus_changed', { userId: req.user.userId, isFocused });
    }
    res.json({ success: true, isFocused });
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

    const list = await GroupMessage.find({ circleId: groupId }).sort({ timestamp: 1 });
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
      circleId: groupId,
      senderId: req.user.userId, // Save custom string userId so frontend logic can match it natively!
      senderName,
      text,
      timestamp: new Date()
    });
    await gMsg.save();

    await GroupChat.findByIdAndUpdate(groupId, {
      lastMessage: text,
      lastMessageAt: new Date()
    });

    if (global.io) {
      console.log(`📡 Emitting newCircleMessage to room circle:${groupId}:`, gMsg.text);
      global.io.to(`circle:${groupId}`).emit('newCircleMessage', gMsg);
    }

    res.json({ success: true, data: gMsg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/circles/:id - Retrieve group details
router.get('/circles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const group = await GroupChat.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }
    if (!group.members.includes(req.user.userId)) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not a member of this circle.' });
    }
    if (req.user.role !== 'super_admin' && group.college !== req.user.college) {
      return res.status(403).json({ success: false, error: 'Access denied: Group belongs to a different college.' });
    }
    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/circles/:id/members - Retrieve group members details
router.get('/circles/:id/members', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const group = await GroupChat.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }
    if (!group.members.includes(req.user.userId)) {
      return res.status(403).json({ success: false, error: 'Access denied: You are not a member.' });
    }

    const membersInfo = [];
    for (const memberId of group.members) {
      let profile = await User.findOne({ userId: memberId }).select('userId name photos department batch college isOnline lastSeen') ||
                    await Alumni.findOne({ userId: memberId }).select('userId name photos department batch college isOnline lastSeen');
      
      if (profile) {
        let role = 'member';
        if (memberId === group.createdBy) {
          role = 'owner';
        } else if (group.admins && group.admins.includes(memberId)) {
          role = 'admin';
        }
        membersInfo.push({
          id: profile.userId,
          name: profile.name,
          avatar: profile.photos?.[0] || '',
          department: profile.department || 'General',
          batch: profile.batch || 'N/A',
          college: profile.college || 'SR University',
          isOnline: profile.isOnline || false,
          lastSeen: profile.lastSeen || '',
          role
        });
      }
    }

    res.json({ success: true, data: membersInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/circles/:id/media - Get group shared media, docs, links
router.get('/circles/:id/media', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const group = await GroupChat.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }
    if (!group.members.includes(req.user.userId)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const messages = await GroupMessage.find({ circleId: id });
    const photos = [];
    const videos = [];
    const documents = [];
    const links = [];

    messages.forEach(m => {
      // Process attachments
      if (m.attachments && m.attachments.length > 0) {
        m.attachments.forEach(att => {
          const payload = {
            fileName: att.fileName,
            fileSize: att.fileSize,
            downloadUrl: att.downloadUrl,
            mimeType: att.mimeType,
            timestamp: m.timestamp
          };
          if (att.mimeType.startsWith('image/')) {
            photos.push(payload);
          } else if (att.mimeType.startsWith('video/')) {
            videos.push(payload);
          } else {
            documents.push(payload);
          }
        });
      }

      // Detect links in message text
      if (m.text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = m.text.match(urlRegex);
        if (matches) {
          matches.forEach(url => {
            links.push({
              url,
              text: m.text,
              senderName: m.senderName,
              timestamp: m.timestamp
            });
          });
        }
      }
    });

    res.json({
      success: true,
      data: { photos, videos, documents, links }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/circles/:id/activity - Fetch circle activity timeline
router.get('/circles/:id/activity', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await GroupActivity.find({ circleId: id }).sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/circles/:id - Edit group settings
router.patch('/circles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, avatar, privacy } = req.body;
    
    const group = await GroupChat.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const isOwner = group.createdBy === req.user.userId;
    const isAdmin = group.admins && group.admins.includes(req.user.userId);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied: Requires admin privileges.' });
    }

    let actorName = 'Someone';
    const user = await User.findOne({ userId: req.user.userId }) || await Alumni.findOne({ userId: req.user.userId });
    if (user) actorName = user.name;

    const updates = {};
    const activities = [];

    if (name && name !== group.name) {
      updates.name = name;
      activities.push({
        circleId: id,
        actorId: req.user.userId,
        actorName,
        action: 'name_change',
        targetName: name
      });
    }

    if (description !== undefined && description !== group.description) {
      updates.description = description;
      activities.push({
        circleId: id,
        actorId: req.user.userId,
        actorName,
        action: 'description_change',
        targetName: description
      });
    }

    if (avatar && avatar !== group.avatar) {
      updates.avatar = avatar;
      activities.push({
        circleId: id,
        actorId: req.user.userId,
        actorName,
        action: 'photo_change'
      });
    }

    if (privacy && privacy !== group.privacy) {
      updates.privacy = privacy;
    }

    const updated = await GroupChat.findByIdAndUpdate(id, updates, { new: true });
    
    if (activities.length > 0) {
      await GroupActivity.insertMany(activities);
    }

    if (global.io) {
      global.io.to(`circle:${id}`).emit('circleUpdated', { circleId: id, updates: updated });
      activities.forEach(act => {
        global.io.to(`circle:${id}`).emit('newCircleActivity', act);
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/circles/:id/members - Add members to circle
router.post('/circles/:id/members', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body; // array of userIds
    
    const group = await GroupChat.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const isOwner = group.createdBy === req.user.userId;
    const isAdmin = group.admins && group.admins.includes(req.user.userId);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    let actorName = 'Someone';
    const actorObj = await User.findOne({ userId: req.user.userId }) || await Alumni.findOne({ userId: req.user.userId });
    if (actorObj) actorName = actorObj.name;

    const newMembers = memberIds.filter(mid => !group.members.includes(mid));
    if (newMembers.length === 0) {
      return res.json({ success: true, data: group });
    }

    group.members.push(...newMembers);
    await group.save();

    const logs = [];
    for (const mid of newMembers) {
      let targetName = 'User';
      const u = await User.findOne({ userId: mid }) || await Alumni.findOne({ userId: mid });
      if (u) targetName = u.name;

      logs.push({
        circleId: id,
        actorId: req.user.userId,
        actorName,
        action: 'join',
        targetId: mid,
        targetName
      });
    }

    await GroupActivity.insertMany(logs);

    if (global.io) {
      global.io.to(`circle:${id}`).emit('membersUpdated', { circleId: id, members: group.members });
      logs.forEach(log => {
        global.io.to(`circle:${id}`).emit('newCircleActivity', log);
      });
    }

    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/circles/:id/members/:memberId - Remove member / leave group
router.delete('/circles/:id/members/:memberId', requireAuth, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const group = await GroupChat.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const isOwner = group.createdBy === req.user.userId;
    const isAdmin = group.admins && group.admins.includes(req.user.userId);
    const isSelf = memberId === req.user.userId;

    if (!isSelf && !isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied: Insufficient permissions.' });
    }

    // Owner cannot be removed
    if (memberId === group.createdBy) {
      return res.status(400).json({ success: false, error: 'Owner cannot leave or be removed. Transfer ownership first.' });
    }

    // Admin cannot remove other admin/owner
    if (!isSelf && isAdmin && !isOwner && group.admins.includes(memberId)) {
      return res.status(403).json({ success: false, error: 'Admins cannot remove other admins.' });
    }

    group.members = group.members.filter(m => m !== memberId);
    if (group.admins) {
      group.admins = group.admins.filter(a => a !== memberId);
    }
    await group.save();

    let actorName = 'Someone';
    const actorObj = await User.findOne({ userId: req.user.userId }) || await Alumni.findOne({ userId: req.user.userId });
    if (actorObj) actorName = actorObj.name;

    let targetName = 'User';
    const targetObj = await User.findOne({ userId: memberId }) || await Alumni.findOne({ userId: memberId });
    if (targetObj) targetName = targetObj.name;

    const log = new GroupActivity({
      circleId: id,
      actorId: req.user.userId,
      actorName,
      action: isSelf ? 'leave' : 'remove',
      targetId: memberId,
      targetName
    });
    await log.save();

    if (global.io) {
      global.io.to(`circle:${id}`).emit('membersUpdated', { circleId: id, members: group.members });
      global.io.to(`circle:${id}`).emit('newCircleActivity', log);
    }

    res.json({ success: true, message: 'Member removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/circles/:id/member-role - Promote or demote group members
router.patch('/circles/:id/member-role', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetUserId, action } = req.body; // action: 'promote' | 'demote'

    const group = await GroupChat.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    if (group.createdBy !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied: Requires Group Owner privileges.' });
    }

    if (!group.members.includes(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Target user is not a member of this group.' });
    }

    let actorName = 'Owner';
    const actorObj = await User.findOne({ userId: req.user.userId }) || await Alumni.findOne({ userId: req.user.userId });
    if (actorObj) actorName = actorObj.name;

    let targetName = 'Member';
    const targetObj = await User.findOne({ userId: targetUserId }) || await Alumni.findOne({ userId: targetUserId });
    if (targetObj) targetName = targetObj.name;

    if (action === 'promote') {
      if (!group.admins.includes(targetUserId)) {
        group.admins.push(targetUserId);
      }
    } else if (action === 'demote') {
      group.admins = group.admins.filter(a => a !== targetUserId);
    }

    await group.save();

    const log = new GroupActivity({
      circleId: id,
      actorId: req.user.userId,
      actorName,
      action: action === 'promote' ? 'promote' : 'demote',
      targetId: targetUserId,
      targetName
    });
    await log.save();

    if (global.io) {
      global.io.to(`circle:${id}`).emit('circleUpdated', { circleId: id, updates: group });
      global.io.to(`circle:${id}`).emit('newCircleActivity', log);
    }

    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/circles/:id/invite - Generate/regenerate group invite link
router.post('/circles/:id/invite', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const group = await GroupChat.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const isOwner = group.createdBy === req.user.userId;
    const isAdmin = group.admins && group.admins.includes(req.user.userId);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const inviteCode = crypto.randomBytes(6).toString('hex');
    group.inviteCode = inviteCode;
    await group.save();

    res.json({
      success: true,
      data: {
        inviteCode,
        inviteLink: `http://localhost:8081/circles/join/${inviteCode}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/circles/join/:inviteCode - Join via invite link
router.post('/circles/join/:inviteCode', requireAuth, async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const group = await GroupChat.findOne({ inviteCode });
    if (!group) {
      return res.status(404).json({ success: false, error: 'Invalid invite code.' });
    }

    if (group.members.includes(req.user.userId)) {
      return res.json({ success: true, message: 'Already a member of this circle.', data: group });
    }

    // College check
    if (req.user.role !== 'super_admin' && group.college !== req.user.college) {
      return res.status(403).json({ success: false, error: 'Access denied: College mismatch.' });
    }

    group.members.push(req.user.userId);
    await group.save();

    let actorName = 'Someone';
    const actorObj = await User.findOne({ userId: req.user.userId }) || await Alumni.findOne({ userId: req.user.userId });
    if (actorObj) actorName = actorObj.name;

    const log = new GroupActivity({
      circleId: group._id.toString(),
      actorId: req.user.userId,
      actorName,
      action: 'join',
      targetName: 'via Invite Link'
    });
    await log.save();

    if (global.io) {
      global.io.to(`circle:${group._id}`).emit('membersUpdated', { circleId: group._id.toString(), members: group.members });
      global.io.to(`circle:${group._id}`).emit('newCircleActivity', log);
    }

    res.json({ success: true, message: 'Successfully joined the circle.', data: group });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/circles/:id - Delete group
router.delete('/circles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const group = await GroupChat.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    if (group.createdBy !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied: Only the group owner can delete the group.' });
    }

    await GroupChat.findByIdAndDelete(id);
    await GroupMessage.deleteMany({ circleId: id });
    await GroupActivity.deleteMany({ circleId: id });

    if (global.io) {
      global.io.to(`circle:${id}`).emit('circleDeleted', { circleId: id });
    }

    res.json({ success: true, message: 'Group deleted successfully.' });
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
      await createNotification({
        recipientId: viewedUserId,
        senderId: viewerId,
        type: 'profile_viewed',
        title: 'Someone viewed your profile 👀',
        message: `${viewerObj.name} viewed your profile.`,
        entityId: viewerId,
        entityType: 'user'
      });
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

// 0. GET /api/users/:userId - Retrieve user public details & block relationship status
router.get('/users/:userId', requireAuth, async (req, res) => {
  try {
    let { userId } = req.params;
    if (userId === 'me' && req.user) {
      userId = req.user.userId;
    }
    const currentUserId = req.user.userId;
    
    let target = await User.findOne({ userId }) || (mongoose.Types.ObjectId.isValid(userId) ? await User.findOne({ _id: userId }) : null);
    let role = 'student';
    
    if (!target) {
      target = await Alumni.findOne({ userId }) || (mongoose.Types.ObjectId.isValid(userId) ? await Alumni.findOne({ _id: userId }) : null);
      role = 'alumni';
    }
    
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const currentUserProfile = req.user.role === 'alumni' 
      ? await Alumni.findOne({ userId: currentUserId }) 
      : await User.findOne({ userId: currentUserId });

    const isBlockedByMe = currentUserProfile?.blockedUsers?.includes(userId) || false;
    const isBlockingMe = target.blockedUsers?.includes(currentUserId) || false;

    if (isBlockingMe) {
      return res.status(403).json({ 
        success: false, 
        error: 'Profile unavailable', 
        blocked: true 
      });
    }

    res.json({
      success: true,
      data: {
        id: target._id.toString(),
        userId: target.userId,
        name: target.name,
        role,
        bio: target.bio || '',
        college: target.college,
        department: target.department || '',
        academicYear: target.academicYear || '',
        profileImageUrl: target.profileImageUrl || target.photos?.[0] || '',
        bannerUrl: target.coverPhoto || target.bannerUrl || '',
        skills: target.skills || [],
        interests: target.interests || [],
        isBlockedByMe,
        isBlockingMe
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
      resonanceEnabled: profile.resonanceEnabled !== false,
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
      messageAlerts: settings.messageAlerts,
      resonanceEnabled: settings.resonanceEnabled !== false
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

// 14b. Bug reporting and management routes
router.post('/bugs', requireAuth, async (req, res) => {
  try {
    const { title, description, screenshot, screenshotUrl, deviceInfo, browser, operatingSystem, applicationVersion, priority } = req.body;
    if (!description) {
      return res.status(400).json({ success: false, error: 'Description is required' });
    }
    const user = await User.findOne({ userId: req.user.userId }) || await Alumni.findOne({ userId: req.user.userId });
    
    let parsedBrowser = browser || '';
    let parsedOS = operatingSystem || '';
    if (deviceInfo) {
      if (deviceInfo.userAgent) parsedBrowser = deviceInfo.userAgent;
      if (deviceInfo.platform) parsedOS = deviceInfo.platform;
    }

    const bug = new Bug({
      title: title || (description.length > 50 ? description.substring(0, 50) + '...' : description),
      description,
      screenshotUrl: screenshotUrl || screenshot || '',
      userId: req.user.userId,
      username: user ? user.name : 'Unknown User',
      email: user ? user.email : '',
      collegeId: user ? user.college : '',
      priority: priority || 'Medium',
      status: 'Pending',
      browser: parsedBrowser,
      operatingSystem: parsedOS,
      applicationVersion: applicationVersion || '1.0.0'
    });
    await bug.save();
    res.json({ success: true, data: bug });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/bugs', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    const bugs = await Bug.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: bugs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/bugs/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    const bug = await Bug.findById(req.params.id);
    if (!bug) return res.status(404).json({ success: false, error: 'Bug not found' });
    res.json({ success: true, data: bug });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/bugs/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    const { status, priority, internalNotes, assignedTo } = req.body;
    const bug = await Bug.findById(req.params.id);
    if (!bug) return res.status(404).json({ success: false, error: 'Bug not found' });

    if (status) bug.status = status;
    if (priority) bug.priority = priority;
    if (internalNotes !== undefined) bug.internalNotes = internalNotes;
    if (assignedTo !== undefined) bug.assignedTo = assignedTo;

    await bug.save();
    res.json({ success: true, data: bug });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/bugs/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    const bug = await Bug.findByIdAndDelete(req.params.id);
    if (!bug) return res.status(404).json({ success: false, error: 'Bug not found' });
    res.json({ success: true, message: 'Bug deleted successfully' });
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

// GET /api/security/logs/search - Global search autocomplete / helper
router.get('/security/logs/search', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    const { q = '' } = req.query;
    const searchRegex = new RegExp(q, 'i');
    const query = {
      $or: [
        { email: searchRegex },
        { userId: searchRegex },
        { event: searchRegex },
        { ipAddress: searchRegex }
      ]
    };
    const logs = await SecurityLog.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/security/logs/export - Export CSV of filtered data
router.get('/security/logs/export', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }

    const { 
      email, 
      userId, 
      status, 
      event, 
      fromDate, 
      toDate, 
      search
    } = req.query;

    let query = {};
    if (email) query.email = email;
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (event) query.event = event;

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { email: searchRegex },
        { userId: searchRegex },
        { event: searchRegex },
        { ipAddress: searchRegex },
        { userAgent: searchRegex },
        { 'details.sessionId': searchRegex }
      ];
    }

    const logs = await SecurityLog.find(query).sort({ createdAt: -1 });

    const headers = [
      'Timestamp',
      'User ID',
      'Email',
      'Name',
      'Role',
      'Department',
      'Branch',
      'Batch',
      'Event',
      'Status',
      'Login Time',
      'Logout Time',
      'Session Duration',
      'IP Address',
      'Location',
      'Browser',
      'Operating System',
      'Device',
      'MFA Enabled',
      'Session ID'
    ];

    let csvContent = headers.join(',') + '\n';

    for (const log of logs) {
      let profile = null;
      if (log.userId) {
        profile = await User.findOne({ userId: log.userId });
        if (!profile) {
          profile = await Alumni.findOne({ userId: log.userId });
        }
      }

      const name = profile?.name || (log.email === 'admin@sru.edu' ? 'Campus Admin' : 'Unknown User');
      const role = profile?.role || (log.email === 'admin@sru.edu' ? 'admin' : 'unknown');
      const department = profile?.department || 'N/A';
      const branch = profile?.branch || 'N/A';
      const batch = profile?.batch || 'N/A';
      const mfaEnabled = profile?.mfaEnabled ? 'Yes' : 'No';

      const ua = log.userAgent || '';
      let os = 'Unknown OS';
      if (ua.includes('Windows')) os = 'Windows';
      else if (ua.includes('Macintosh')) os = 'MacOS';
      else if (ua.includes('Linux')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

      let browser = 'Unknown Browser';
      if (ua.includes('Chrome')) browser = 'Chrome';
      else if (ua.includes('Safari')) browser = 'Safari';
      else if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Edge')) browser = 'Edge';

      let device = 'Desktop';
      if (ua.includes('Mobi') || ua.includes('Android') || ua.includes('iPhone')) {
        device = 'Mobile';
      }

      const sessionId = log.details?.sessionId || '';
      const loginTime = log.event === 'login_success' ? log.createdAt.toISOString() : '';
      const logoutTime = log.event === 'logout' ? log.createdAt.toISOString() : '';
      const duration = ''; 

      const row = [
        log.createdAt.toISOString(),
        log.userId || '',
        log.email || '',
        `"${name.replace(/"/g, '""')}"`,
        role,
        department,
        branch,
        batch,
        log.event,
        log.status,
        loginTime,
        logoutTime,
        duration,
        log.ipAddress,
        log.details?.location || 'Remote',
        browser,
        os,
        device,
        mfaEnabled,
        sessionId
      ];

      csvContent += row.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=security_logs.csv');
    return res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/security/events - Get distinct list of logged security events
router.get('/security/events', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    const events = await SecurityLog.distinct('event');
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/security/export - Alias for export endpoint
router.get('/security/export', requireAuth, async (req, res) => {
  res.redirect('/api/security/logs/export');
});

// GET /api/security/logs/:idOrUserId - Get log details by ID, or list logs for a user
router.get('/security/logs/:idOrUserId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }
    const { idOrUserId } = req.params;

    // Check if the parameter is a valid Mongoose ObjectId
    if (mongoose.Types.ObjectId.isValid(idOrUserId)) {
      const log = await SecurityLog.findById(idOrUserId);
      if (log) {
        let profile = null;
        if (log.userId) {
          profile = await User.findOne({ userId: log.userId }) || await Alumni.findOne({ userId: log.userId });
        }
        const logObj = log.toObject();
        logObj.userProfile = profile ? {
          name: profile.name,
          role: profile.role,
          department: profile.department,
          batch: profile.batch,
          cgpa: profile.cgpa,
          backlogs: profile.backlogs,
          mfaEnabled: profile.mfaEnabled || false
        } : {
          name: log.email === 'admin@sru.edu' ? 'Campus Admin' : 'Unknown User',
          role: log.email === 'admin@sru.edu' ? 'admin' : 'unknown',
          department: 'N/A',
          batch: 'N/A',
          mfaEnabled: false
        };
        return res.json({ success: true, data: logObj });
      }
    }

    // Fallback: Query security logs by userId
    const logs = await SecurityLog.find({ userId: idOrUserId }).sort({ createdAt: -1 });
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/security/logs - Get filtered, paginated security audit logs with advanced database filters
router.get('/security/logs', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin only' });
    }

    const { 
      page = 1, 
      limit = 50, 
      email, 
      userId, 
      status, 
      event, 
      fromDate, 
      toDate, 
      sort = '-createdAt',
      search,
      role,
      department,
      branch,
      batch,
      device,
      browser,
      os,
      ipAddress,
      location,
      authMethod,
      mfaStatus,
      accountStatus
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let query = {};
    if (email) query.email = email;
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (ipAddress) query.ipAddress = new RegExp(ipAddress, 'i');

    // Mapped Event Categories (Quick Actions Preset)
    if (event) {
      const lowerEvent = event.toLowerCase();
      if (lowerEvent === 'login') {
        query.event = { $regex: /login/i };
      } else if (lowerEvent === 'logout') {
        query.event = { $regex: /logout/i };
      } else if (lowerEvent === 'mfa') {
        query.event = { $regex: /mfa/i };
      } else if (lowerEvent === 'suspicious') {
        query.$or = [{ status: 'failure' }, { event: /lock/i }, { event: /suspicious/i }];
      } else if (lowerEvent === 'lock') {
        query.event = { $regex: /lock/i };
      } else if (lowerEvent === 'register') {
        query.event = { $regex: /register/i };
      } else {
        query.event = event;
      }
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    // Parse User Agent filters
    if (device) {
      if (device.toLowerCase() === 'mobile') {
        query.userAgent = /Mobi|Android|iPhone|iPad/i;
      } else if (device.toLowerCase() === 'desktop') {
        query.userAgent = { $not: /Mobi|Android|iPhone|iPad/i };
      }
    }
    if (browser) {
      query.userAgent = new RegExp(browser, 'i');
    }
    if (os) {
      query.userAgent = new RegExp(os, 'i');
    }

    // Location filter
    if (location) {
      query['details.location'] = new RegExp(location, 'i');
    }

    // Authentication method filter
    if (authMethod) {
      const lowerMethod = authMethod.toLowerCase();
      if (lowerMethod === 'mfa') {
        query.event = { $regex: /mfa/i };
      } else if (lowerMethod === 'password') {
        query.event = { $regex: /password/i };
      } else if (lowerMethod === 'captcha') {
        query.event = { $regex: /captcha/i };
      }
    }

    // Profile attributes filtering
    let profileQuery = {};
    if (role) profileQuery.role = role;
    if (department) {
      profileQuery.$or = [
        { department: new RegExp(department, 'i') },
        { branch: new RegExp(department, 'i') }
      ];
    }
    if (branch) {
      profileQuery.branch = new RegExp(branch, 'i');
    }
    if (batch) {
      profileQuery.batch = new RegExp(batch, 'i');
    }
    if (mfaStatus) {
      profileQuery.mfaEnabled = mfaStatus === 'enabled';
    }
    if (accountStatus) {
      if (accountStatus === 'locked') {
        profileQuery.lockUntil = { $gt: new Date() };
      } else if (accountStatus === 'suspended') {
        profileQuery.isSuspended = true;
      } else if (accountStatus === 'active') {
        profileQuery.isSuspended = { $ne: true };
        profileQuery.$or = [
          { lockUntil: { $exists: false } },
          { lockUntil: { $lte: new Date() } }
        ];
      }
    }

    let matchedUserIds = null;
    const hasProfileFilters = Object.keys(profileQuery).length > 0;
    const hasProfileSearch = search && search.trim();

    if (hasProfileFilters || hasProfileSearch) {
      let userProfileQuery = { ...profileQuery };
      let alumniProfileQuery = { ...profileQuery };

      if (hasProfileSearch) {
        const searchRegex = new RegExp(search, 'i');
        const searchOr = [
          { name: searchRegex },
          { email: searchRegex },
          { userId: searchRegex }
        ];
        
        userProfileQuery.$and = userProfileQuery.$and || [];
        userProfileQuery.$and.push({ $or: searchOr });

        alumniProfileQuery.$and = alumniProfileQuery.$and || [];
        alumniProfileQuery.$and.push({ $or: searchOr });
      }

      const [matchedUsers, matchedAlumnis] = await Promise.all([
        User.find(userProfileQuery, { userId: 1 }),
        Alumni.find(alumniProfileQuery, { userId: 1 })
      ]);

      matchedUserIds = [
        ...matchedUsers.map(u => u.userId),
        ...matchedAlumnis.map(a => a.userId)
      ];

      if (matchedUserIds.length === 0) {
        matchedUserIds = ['non-existent-user-id-to-force-empty-result'];
      }
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search, 'i');
      const logOrConditions = [
        { email: searchRegex },
        { userId: searchRegex },
        { event: searchRegex },
        { ipAddress: searchRegex },
        { userAgent: searchRegex },
        { 'details.sessionId': searchRegex }
      ];

      if (matchedUserIds && matchedUserIds.length > 0) {
        logOrConditions.push({ userId: { $in: matchedUserIds } });
      }
      query.$or = logOrConditions;
    } else if (matchedUserIds !== null) {
      query.userId = { $in: matchedUserIds };
    }

    let sortOptions = {};
    if (sort) {
      if (sort.startsWith('-')) {
        sortOptions[sort.substring(1)] = -1;
      } else {
        sortOptions[sort] = 1;
      }
    } else {
      sortOptions = { createdAt: -1 };
    }

    const total = await SecurityLog.countDocuments(query);
    const logs = await SecurityLog.find(query)
      .sort(sortOptions)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const userIds = [...new Set(logs.map(log => log.userId).filter(Boolean))];
    const [users, alumni] = await Promise.all([
      User.find({ userId: { $in: userIds } }),
      Alumni.find({ userId: { $in: userIds } })
    ]);

    const profileMap = new Map();
    users.forEach(u => profileMap.set(u.userId, u));
    alumni.forEach(a => profileMap.set(a.userId, a));

    const enrichedLogs = logs.map((log) => {
      const logObj = log.toObject();
      const profile = log.userId ? profileMap.get(log.userId) : null;
      logObj.userProfile = profile ? {
        name: profile.name,
        role: profile.role,
        department: profile.department,
        batch: profile.batch,
        cgpa: profile.cgpa,
        backlogs: profile.backlogs,
        mfaEnabled: profile.mfaEnabled || false
      } : {
        name: log.email === 'admin@sru.edu' ? 'Campus Admin' : 'Unknown User',
        role: log.email === 'admin@sru.edu' ? 'admin' : 'unknown',
        department: 'N/A',
        batch: 'N/A',
        mfaEnabled: false
      };
      return logObj;
    });

    res.json({
      success: true,
      data: enrichedLogs,
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
    const result = await getPlacementsWithEligibility(req);
    res.json({
      success: true,
      data: result.placements,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/placements/official - Get official placements with eligibility check
router.get('/placements/official', requireAuth, async (req, res) => {
  try {
    const result = await getPlacementsWithEligibility(req, 'OFFICIAL');
    res.json({
      success: true,
      data: result.placements,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/placements/referrals - Get alumni referrals with eligibility check
router.get('/placements/referrals', requireAuth, async (req, res) => {
  try {
    const result = await getPlacementsWithEligibility(req, 'ALUMNI_REFERRAL');
    res.json({
      success: true,
      data: result.placements,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages
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

    let isEligible = true;
    let ineligibilityReason = '';

    if (req.user.role === 'student') {
      const student = await User.findOne({ userId: req.user.userId });
      if (!student) {
        return res.status(404).json({ success: false, error: 'Student profile not found' });
      }

      const eligibilityInfo = checkPlacementEligibility(student, placement);
      isEligible = eligibilityInfo.eligible;
      ineligibilityReason = eligibilityInfo.reason || '';
    }

    const plainObj = placement.toObject();
    plainObj.isEligible = isEligible;
    plainObj.ineligibilityReason = ineligibilityReason;

    res.json({ success: true, data: plainObj });
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

// Helper query function for eligible placements
async function getPlacementsWithEligibility(req, typeFilter = null) {
  const college = req.user.college || 'SR University';
  console.log('📡 [Backend - Placements Query] Initiating query for user:', {
    userId: req.user.userId,
    role: req.user.role,
    college: req.user.college,
    derivedCollege: college
  });
  await archiveExpiredPlacements(college);

  const { tab, search, filters, page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  // Core query: restrict by college and status
  const query = {
    college,
    status: 'active'
  };

  // Filter by placementType
  if (typeFilter) {
    query.placementType = typeFilter;
  } else if (tab) {
    query.placementType = tab === 'admin' ? 'OFFICIAL' : 'ALUMNI_REFERRAL';
  }

  // Search query
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [
      { company: searchRegex },
      { companyName: searchRegex },
      { role: searchRegex },
      { jobRole: searchRegex },
      { location: searchRegex },
      { requiredSkills: { $in: [searchRegex] } },
      { branches: { $in: [searchRegex] } },
      { eligibleDepartments: { $in: [searchRegex] } }
    ];
  }

  // Advanced Filters
  if (filters) {
    const filterArray = filters.split(',');
    
    // Check for employment type filters
    const jobTypes = [];
    if (filterArray.includes('Internship')) jobTypes.push('Internship');
    if (filterArray.includes('Full Time') || filterArray.includes('Full-Time')) {
      jobTypes.push('Full Time');
      jobTypes.push('Full-Time');
    }
    if (filterArray.includes('Internship + PPO')) jobTypes.push('Internship + PPO');
    if (filterArray.includes('Contract')) jobTypes.push('Contract');
    if (jobTypes.length > 0) {
      query.employmentType = { $in: jobTypes };
    }

    // Workplace / Location filters
    const locConditions = [];
    if (filterArray.includes('Remote')) locConditions.push({ location: /remote/i });
    if (filterArray.includes('Hybrid')) locConditions.push({ location: /hybrid/i });
    if (filterArray.includes('Onsite')) locConditions.push({ location: /^(?!.*remote)(?!.*hybrid).*$/i });
    if (locConditions.length > 0) {
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: locConditions }];
        delete query.$or;
      } else {
        query.$or = locConditions;
      }
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
    } else if (filterArray.includes('Oldest')) {
      sortOptions = { createdAt: 1 };
    }
  }

  console.log('📡 [Backend - Placements Query] Executing Mongo query:', JSON.stringify(query));
  const placements = await Placement.find(query).sort(sortOptions);
  console.log(`📡 [Backend - Placements Query] Found ${placements.length} raw placements in DB`);

  let processedPlacements = placements;
  const isStudent = req.user.role === 'student';
  let student = null;
  if (isStudent) {
    student = await User.findOne({ userId: req.user.userId });
    console.log('📡 [Backend - Placements Query] Student profile parsed:', {
      name: student?.name,
      cgpa: student?.cgpa,
      backlogs: student?.backlogs,
      dept: student?.department,
      batch: student?.batch
    });
  }

  if (isStudent && student) {
    processedPlacements = placements.map(p => {
      const eligibilityInfo = checkPlacementEligibility(student, p);
      console.log(`📡 [Backend - Eligibility Engine] Placement "${p.company} - ${p.role}" eligible=${eligibilityInfo.eligible}, reason="${eligibilityInfo.reason || ''}"`);
      const plainObj = p.toObject();
      plainObj.isEligible = eligibilityInfo.eligible;
      plainObj.ineligibilityReason = eligibilityInfo.reason || '';
      return plainObj;
    });

    if (filters && (filters.split(',').includes('Eligible Only') || filters.split(',').includes('EligibleOnly'))) {
      processedPlacements = processedPlacements.filter(p => p.isEligible);
    }
  } else {
    processedPlacements = placements.map(p => {
      const plainObj = p.toObject();
      plainObj.isEligible = true;
      plainObj.ineligibilityReason = '';
      return plainObj;
    });
  }

  const total = processedPlacements.length;
  const paginatedPlacements = processedPlacements.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return {
    placements: paginatedPlacements,
    total,
    pages: Math.ceil(total / limitNum),
    page: pageNum,
    limit: limitNum
  };
}

function checkPlacementEligibility(student, placement) {
  const cgpa = student.cgpa || 0.0;
  const backlogs = student.backlogs || 0;
  const dept = student.department || '';
  const year = student.academicYear || '';
  const batch = student.batch || '';
  const college = student.college || 'SR University';

  if (placement.college && placement.college.toLowerCase() !== college.toLowerCase()) {
    return { eligible: false, reason: `This drive is for ${placement.college} students.` };
  }

  const minCGPA = placement.minCGPA !== undefined ? placement.minCGPA : (placement.minimumCGPA !== undefined ? placement.minimumCGPA : 0.0);
  if (cgpa < minCGPA) {
    return { eligible: false, reason: `Minimum CGPA required is ${minCGPA}. Your CGPA is ${cgpa}.` };
  }

  const maxBacklogs = placement.maxBacklogs !== undefined ? placement.maxBacklogs : (placement.maximumBacklogs !== undefined ? placement.maximumBacklogs : 0);
  if (backlogs > maxBacklogs) {
    return { eligible: false, reason: `Maximum backlogs allowed is ${maxBacklogs}. You have ${backlogs} active backlogs.` };
  }

  const branches = placement.branches && placement.branches.length > 0 ? placement.branches : (placement.eligibleDepartments && placement.eligibleDepartments.length > 0 ? placement.eligibleDepartments : []);
  if (branches.length > 0 && !branches.includes("All Departments")) {
    const studentEquivalents = getDepartmentEquivalents(dept);
    const hasBranchMatch = studentEquivalents.some(d => branches.some(b => b.toLowerCase() === d.toLowerCase()));
    if (!hasBranchMatch) {
      return { eligible: false, reason: `Eligible branches are: ${branches.join(', ')}.` };
    }
  }

  const batches = placement.batches && placement.batches.length > 0 ? placement.batches : (placement.eligibleBatches && placement.eligibleBatches.length > 0 ? placement.eligibleBatches : []);
  if (batches.length > 0) {
    const hasBatchMatch = batches.some(b => b.toString() === batch.toString());
    if (!hasBatchMatch) {
      return { eligible: false, reason: `Eligible batches are: ${batches.join(', ')}.` };
    }
  }

  const years = placement.eligibleYears || [];
  if (years.length > 0 && !years.includes("All Years")) {
    const hasYearMatch = years.includes(year);
    if (!hasYearMatch) {
      return { eligible: false, reason: `Eligible academic years are: ${years.join(', ')}.` };
    }
  }

  return { eligible: true };
}

// 3. POST /api/placements - Create placement post (Admins & Verified Alumni)
router.post('/placements', requireAuth, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.userId;
    const college = req.user.college || 'SR University';

    if (role !== 'admin' && role !== 'alumni') {
      return res.status(403).json({ success: false, error: 'Access denied: Only Admins and Alumni can post placement opportunities' });
    }

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
      company,
      companyLogo,
      jobRole,
      role: roleName,
      title,
      employmentType,
      package: packageStr,
      salary,
      packageVal,
      location,
      expiryDate,
      registrationDeadline,
      driveDate,
      description,
      eligibility,
      eligibleYears,
      eligibleDepartments,
      branches,
      minimumCGPA,
      minCGPA,
      maximumBacklogs,
      maxBacklogs,
      eligibleBatches,
      batches,
      eligibleSections,
      contactAlumni,
      applyLink,
      registrationLink,
      workMode
    } = req.body;

    const finalCompany = company || companyName;
    const finalRole = roleName || jobRole || title;
    const finalDeadline = registrationDeadline || expiryDate;

    if (!finalCompany || !finalRole || !employmentType || !finalDeadline) {
      return res.status(400).json({ success: false, error: 'Company, Role, EmploymentType, and Deadline are required' });
    }

    let computedPackageVal = 0;
    if (packageVal) {
      computedPackageVal = parseFloat(packageVal);
    } else if (salary || packageStr) {
      const match = String(salary || packageStr).match(/(\d+(\.\d+)?)/);
      if (match) computedPackageVal = parseFloat(match[1]);
    }

    const placement = new Placement({
      company: finalCompany,
      role: finalRole,
      companyLogo: companyLogo || '',
      employmentType,
      salary: salary || packageStr || '',
      packageVal: computedPackageVal,
      location: location || 'Onsite',
      registrationDeadline: new Date(finalDeadline),
      driveDate: driveDate ? new Date(driveDate) : undefined,
      description: description || '',
      eligibility: eligibility || '',
      branches: branches || eligibleDepartments || [],
      minCGPA: minCGPA !== undefined ? parseFloat(minCGPA) : (minimumCGPA ? parseFloat(minimumCGPA) : 0.0),
      maxBacklogs: maxBacklogs !== undefined ? parseInt(maxBacklogs) : (maximumBacklogs ? parseInt(maximumBacklogs) : 0),
      batches: batches || eligibleBatches || [],
      eligibleSections: eligibleSections || [],
      createdBy: userId,
      createdByName,
      createdByRole: role === 'admin' ? 'ADMIN' : 'ALUMNI',
      placementType: role === 'admin' ? 'OFFICIAL' : 'ALUMNI_REFERRAL',
      isVerified: true,
      referralAvailable: role === 'alumni',
      contactAlumni: contactAlumni || '',
      applyLink: applyLink || registrationLink || '',
      college,
      status: 'active',
      workMode: workMode || 'Onsite',
      eligibleYears: eligibleYears || []
    });

    await placement.save();

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
    if (updates.salary && !updates.packageVal) {
      let computedPackageVal = 0;
      const match = String(updates.salary).match(/(\d+(\.\d+)?)/);
      if (match) computedPackageVal = parseFloat(match[1]);
      updates.packageVal = computedPackageVal;
    }

    Object.assign(placement, updates);
    await placement.save();

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
    copy.company = `${original.company} (Copy)`;
    copy.companyName = `${original.companyName} (Copy)`;
    copy.createdAt = new Date();
    copy.updatedAt = new Date();
    await copy.save();

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

    res.json({ success: true, data: placement });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// REAL-TIME NOTIFICATION SYSTEM ENDPOINTS
// ==========================================

// Helper function to create notification (real-time publish to Socket.IO)
async function createNotification({ recipientId, senderId, type, title, message, entityId, entityType, metadata = {} }) {
  try {
    const { Notification, User, Alumni } = require('./models');
    
    // Grouping support: e.g. "Rahul and 12 others liked your post."
    if (type === 'post_like' || type === 'post_comment') {
      const existing = await Notification.findOne({
        recipientId,
        type,
        entityId,
        isRead: false,
        softDeleted: false
      });
      if (existing) {
        let users = existing.metadata.users || [];
        if (senderId && !users.includes(senderId)) {
          users.push(senderId);
        }
        
        const firstSender = await User.findOne({ userId: senderId }) || await Alumni.findOne({ userId: senderId });
        const firstSenderName = firstSender ? firstSender.name : 'Someone';
        
        existing.metadata = { ...existing.metadata, users };
        if (users.length > 1) {
          existing.title = `${firstSenderName} and ${users.length - 1} others`;
          existing.message = `${type === 'post_like' ? 'liked' : 'commented on'} your post.`;
        } else {
          existing.title = firstSenderName;
          existing.message = `${type === 'post_like' ? 'liked' : 'commented on'} your post.`;
        }
        await existing.save();
        
        if (global.io) {
          global.io.to(`user_${recipientId}`).emit('notification:update', existing);
        }
        return existing;
      }
    }

    let senderName = 'System';
    let senderAvatar = '';
    if (senderId) {
      const sender = await User.findOne({ userId: senderId }) || await Alumni.findOne({ userId: senderId });
      if (sender) {
        senderName = sender.name || 'Anonymous';
        senderAvatar = sender.photos?.[0] || '';
      }
    }

    const newNotif = new Notification({
      recipientId,
      userId: recipientId,
      senderId,
      type,
      title: title || senderName,
      message: message || '',
      entityId,
      entityType,
      metadata: { ...metadata, senderName, senderAvatar, users: senderId ? [senderId] : [] }
    });

    await newNotif.save();

    if (global.io) {
      global.io.to(`user_${recipientId}`).emit('notification:new', newNotif);
    }
    return newNotif;
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

// 1. GET /api/notifications - retrieve user notifications (filtered, paginated, searchable)
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const recipientId = req.user.userId;
    const { type = 'all', search = '', page = 1, limit = 20 } = req.query;

    const query = { recipientId, softDeleted: false };

    // Filter mapping
    if (type === 'unread') {
      query.isRead = false;
    } else if (type === 'messages') {
      query.type = 'new_message';
    } else if (type === 'social') {
      query.type = { $in: ['post_like', 'post_comment', 'comment_reply', 'new_follower', 'friend_request', 'friend_accept'] };
    } else if (type === 'announcements') {
      query.type = { $in: ['admin_announcement', 'verification_approved'] };
    } else if (type === 'placements') {
      query.type = { $in: ['placement_announcement', 'alumni_referral'] };
    } else if (type === 'events') {
      query.type = 'event_invitation';
    } else if (type === 'mentions') {
      query.type = 'mention';
    }

    // Search query matches title/message
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const skipCount = (parseInt(page) - 1) * parseInt(limit);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skipCount)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. GET /api/notifications/unread-count - retrieve live unread count
router.get('/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.user.userId,
      isRead: false,
      softDeleted: false
    });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. POST /api/notifications/mark-read - mark notifications as read
router.post('/notifications/mark-read', requireAuth, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const recipientId = req.user.userId;
    const query = { recipientId, softDeleted: false };

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      query._id = { $in: notificationIds };
    }

    await Notification.updateMany(query, { isRead: true });

    if (global.io) {
      global.io.to(`user_${recipientId}`).emit('notification:read', { notificationIds });
    }

    res.json({ success: true, message: 'Notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. POST /api/notifications/delete - soft-delete notifications
router.post('/notifications/delete', requireAuth, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const recipientId = req.user.userId;
    
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ success: false, error: 'notificationIds array is required.' });
    }

    await Notification.updateMany(
      { _id: { $in: notificationIds }, recipientId },
      { softDeleted: true }
    );

    if (global.io) {
      global.io.to(`user_${recipientId}`).emit('notification:delete', { notificationIds });
    }

    res.json({ success: true, message: 'Notifications deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper to look up users by userId field or MongoDB ObjectId
const findUserByIdOrUid = async (id) => {
  if (!id) return null;
  const query = mongoose.isValidObjectId(id) ? { $or: [{ userId: id }, { _id: id }] } : { userId: id };
  return await User.findOne(query) || await Alumni.findOne(query);
};

// GET /api/users/:id/profile - Fetch complete user profile details
router.get('/users/:id/profile', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const isSelf = id === req.user.userId;

    let target = await findUserByIdOrUid(id);
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const resolvedId = target.userId;

    // Determine relationship
    const isFriend = target.connections && target.connections.includes(req.user.userId);
    const isFollowing = target.followers && target.followers.includes(req.user.userId);
    const isBlocked = target.blockedUsers && target.blockedUsers.includes(req.user.userId);

    // Calculate stats counts
    const friendsCount = target.connections ? target.connections.length : 0;
    const followersCount = target.followers ? target.followers.length : 0;
    
    const followingCount = await User.countDocuments({ followers: resolvedId }) + 
                           await Alumni.countDocuments({ followers: resolvedId });
    
    const circlesCount = await GroupChat.countDocuments({ members: resolvedId });
    
    // Count posts
    const postsCount = await Post.countDocuments({ authorId: resolvedId }) + 
                       await StudentPost.countDocuments({ userId: resolvedId });
    
    const achievementsCount = await Achievement.countDocuments({ userId: resolvedId });

    // Privacy logic
    const isPrivate = target.isPrivateProfile || target.profileVisibility === 'Private' || 
                      (target.profileVisibility === 'Connections Only' && !isFriend && !isSelf);

    const profileData = {
      id: resolvedId,
      name: target.name || target.fullName || 'Anonymous',
      username: target.email ? target.email.split('@')[0] : 'user',
      avatar: target.photos?.[0] || target.profileImage || '',
      college: target.college || 'SR University',
      department: target.department || target.designation || 'General',
      year: target.year || 'N/A',
      batch: target.batch || target.batchYear || 'N/A',
      bio: target.bio || target.careerJourney || 'Welcome to my profile!',
      isOnline: target.isOnline || false,
      lastSeen: target.lastSeen || '',
      createdAt: target.createdAt,
      isVerified: target.approvalStatus === 'approved' || target.isFeatured,
      stats: {
        friends: friendsCount,
        followers: followersCount,
        following: followingCount,
        circles: circlesCount,
        posts: postsCount,
        achievements: achievementsCount
      },
      skills: target.skills || [],
      interests: target.interests || [],
      languages: ['English', 'Telugu', 'Hindi'],
      portfolioUrl: target.portfolioUrl || '',
      githubUrl: target.githubUrl || '',
      linkedinUrl: target.linkedinUrl || '',
      email: (!isPrivate || isSelf) ? target.email : undefined,
      isPrivateProfile: isPrivate,
      relationship: {
        isFriend,
        isFollowing,
        isBlocked,
        hasBlockedYou: target.blockedUsers && target.blockedUsers.includes(req.user.userId)
      }
    };

    res.json({ success: true, data: profileData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/:id/posts - Fetch posts created by the user
router.get('/users/:id/posts', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // College isolation/privacy check
    let target = await findUserByIdOrUid(id);
    if (!target) return res.status(404).json({ success: false, error: 'User not found.' });

    const resolvedId = target.userId;
    const isFriend = target.connections && target.connections.includes(req.user.userId);
    const isSelf = resolvedId === req.user.userId;
    const isPrivate = target.isPrivateProfile || target.profileVisibility === 'Private' || 
                      (target.profileVisibility === 'Connections Only' && !isFriend && !isSelf);

    if (isPrivate && !isSelf) {
      return res.json({ success: true, data: [] });
    }

    const posts = await Post.find({ authorId: resolvedId }).sort({ createdAt: -1 });
    const studentPosts = await StudentPost.find({ userId: resolvedId }).sort({ createdAt: -1 });
    
    // Combine and format
    const allPosts = [
      ...posts.map(p => ({
        id: p._id,
        content: p.content,
        image: p.image || p.imageUrl,
        likes: p.likes || 0,
        commentsCount: p.comments ? p.comments.length : 0,
        createdAt: p.createdAt,
        type: 'general'
      })),
      ...studentPosts.map(sp => ({
        id: sp._id,
        content: sp.content,
        image: sp.image || sp.imageUrl,
        likes: sp.likes || 0,
        commentsCount: sp.comments ? sp.comments.length : 0,
        createdAt: sp.createdAt,
        type: 'student'
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, data: allPosts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/:id/media - Fetch images/videos shared by the user
router.get('/users/:id/media', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    let target = await findUserByIdOrUid(id);
    if (!target) return res.status(404).json({ success: false, error: 'User not found.' });

    const resolvedId = target.userId;
    const isFriend = target.connections && target.connections.includes(req.user.userId);
    const isSelf = resolvedId === req.user.userId;
    const isPrivate = target.isPrivateProfile || target.profileVisibility === 'Private' || 
                      (target.profileVisibility === 'Connections Only' && !isFriend && !isSelf);

    if (isPrivate && !isSelf) {
      return res.json({ success: true, data: [] });
    }

    // Grab images from posts
    const posts = await Post.find({ authorId: resolvedId, image: { $ne: null, $ne: '' } });
    const studentPosts = await StudentPost.find({ userId: resolvedId, image: { $ne: null, $ne: '' } });
    
    // Grab shared files from GroupMessage
    const groupMessages = await GroupMessage.find({ senderId: resolvedId, messageType: 'image' });

    const mediaList = [
      ...posts.map(p => ({
        id: p._id,
        url: p.image || p.imageUrl,
        type: 'image',
        createdAt: p.createdAt
      })),
      ...studentPosts.map(sp => ({
        id: sp._id,
        url: sp.image || sp.imageUrl,
        type: 'image',
        createdAt: sp.createdAt
      })),
      ...groupMessages.map(gm => ({
        id: gm._id,
        url: gm.text || (gm.attachments && gm.attachments[0]?.downloadUrl) || '',
        type: 'image',
        createdAt: gm.timestamp
      }))
    ].filter(m => m.url).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, data: mediaList });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/:id/friends - Fetch friends/connections
router.get('/users/:id/friends', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const target = await findUserByIdOrUid(id);
    if (!target) return res.status(404).json({ success: false, error: 'User not found.' });

    // Reconstruct and sync the connections array from the Connection collection for legacy users
    const activeConns = await Connection.find({
      $or: [{ user1: target.userId }, { user2: target.userId }]
    });
    
    const friendIdsSet = new Set(target.connections || []);
    for (const conn of activeConns) {
      const otherId = conn.user1 === target.userId ? conn.user2 : conn.user1;
      friendIdsSet.add(otherId);
    }
    const friendIds = Array.from(friendIdsSet);

    if (friendIds.length > (target.connections || []).length) {
      await User.findOneAndUpdate({ userId: target.userId }, { $set: { connections: friendIds } });
      await Alumni.findOneAndUpdate({ userId: target.userId }, { $set: { connections: friendIds } });
    }

    const friends = [];
    for (const fId of friendIds) {
      const u = await User.findOne({ userId: fId }).select('userId name photos department batch college isOnline') ||
                await Alumni.findOne({ userId: fId }).select('userId name photos department batch college isOnline');
      if (u) {
        friends.push({
          id: u.userId,
          name: u.name,
          avatar: u.photos?.[0] || '',
          department: u.department || 'General',
          batch: u.batch || 'N/A',
          isOnline: u.isOnline || false
        });
      }
    }

    res.json({ success: true, data: friends });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/:id/followers - Fetch followers
router.get('/users/:id/followers', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const target = await findUserByIdOrUid(id);
    if (!target) return res.status(404).json({ success: false, error: 'User not found.' });

    const followerIds = target.followers || [];
    const followers = [];
    for (const fId of followerIds) {
      const u = await User.findOne({ userId: fId }).select('userId name photos department batch college isOnline') ||
                await Alumni.findOne({ userId: fId }).select('userId name photos department batch college isOnline');
      if (u) {
        followers.push({
          id: u.userId,
          name: u.name,
          avatar: u.photos?.[0] || '',
          department: u.department || 'General',
          batch: u.batch || 'N/A',
          isOnline: u.isOnline || false
        });
      }
    }

    res.json({ success: true, data: followers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/:id/mutual - Calculate mutual friends & mutual groups
router.get('/users/:id/mutual', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const target = await findUserByIdOrUid(id);
    if (!target) return res.status(404).json({ success: false, error: 'User not found.' });

    const resolvedId = target.userId;
    const isSelf = resolvedId === req.user.userId;
    if (isSelf) return res.json({ success: true, data: { friends: [], circles: [] } });

    const me = await User.findOne({ userId: req.user.userId }) || await Alumni.findOne({ userId: req.user.userId });
    if (!me) return res.status(404).json({ success: false, error: 'Current user not found.' });

    const myFriends = new Set(me.connections || []);
    const targetFriends = target.connections || [];
    const mutualFriendIds = targetFriends.filter(fId => myFriends.has(fId));

    const mutualFriends = [];
    for (const fId of mutualFriendIds) {
      const u = await User.findOne({ userId: fId }).select('userId name photos department batch isOnline') ||
                await Alumni.findOne({ userId: fId }).select('userId name photos department batch isOnline');
      if (u) {
        mutualFriends.push({
          id: u.userId,
          name: u.name,
          avatar: u.photos?.[0] || '',
          department: u.department || 'General',
          batch: u.batch || 'N/A',
          isOnline: u.isOnline || false
        });
      }
    }

    // Mutual groups
    const myGroups = await GroupChat.find({ members: req.user.userId });
    const mutualCircles = [];
    for (const g of myGroups) {
      if (g.members.includes(resolvedId)) {
        mutualCircles.push({
          id: g._id.toString(),
          name: g.name,
          avatar: g.avatar,
          membersCount: g.members.length
        });
      }
    }

    res.json({ success: true, data: { friends: mutualFriends, circles: mutualCircles } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users/:id/follow - Toggle follow status
router.post('/api/users/:id/follow', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const target = await findUserByIdOrUid(id);
    if (!target) return res.status(404).json({ success: false, error: 'User not found.' });

    const resolvedId = target.userId;
    if (resolvedId === req.user.userId) return res.status(400).json({ success: false, error: 'Cannot follow yourself.' });

    const isFollowing = target.followers && target.followers.includes(req.user.userId);
    if (isFollowing) {
      target.followers = target.followers.filter(fId => fId !== req.user.userId);
    } else {
      if (!target.followers) target.followers = [];
      target.followers.push(req.user.userId);
    }
    await target.save();

    if (global.io) {
      global.io.to(`user_${resolvedId}`).emit('relationshipChanged', {
        userId: req.user.userId,
        isFollowing: !isFollowing
      });
    }

    res.json({ success: true, isFollowing: !isFollowing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users/:id/block - Toggle block status
router.post('/api/users/:id/block', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const target = await findUserByIdOrUid(id);
    if (!target) return res.status(404).json({ success: false, error: 'User not found.' });

    const resolvedId = target.userId;
    if (resolvedId === req.user.userId) return res.status(400).json({ success: false, error: 'Cannot block yourself.' });

    let me = await User.findOne({ userId: req.user.userId }) || await Alumni.findOne({ userId: req.user.userId });
    if (!me) return res.status(404).json({ success: false, error: 'Current user not found.' });

    const isBlocked = me.blockedUsers && me.blockedUsers.includes(resolvedId);
    if (isBlocked) {
      me.blockedUsers = me.blockedUsers.filter(bId => bId !== resolvedId);
    } else {
      if (!me.blockedUsers) me.blockedUsers = [];
      me.blockedUsers.push(resolvedId);
    }
    await me.save();

    res.json({ success: true, isBlocked: !isBlocked });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users/:id/report - Report profile
router.post('/api/users/:id/report', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const target = await findUserByIdOrUid(id);
    if (!target) return res.status(404).json({ success: false, error: 'User not found.' });

    const resolvedId = target.userId;
    const { reason, category } = req.body;

    const report = new Report({
      reporterId: req.user.userId,
      targetUserId: resolvedId,
      reason: reason || 'Inappropriate profile description or avatar.',
      category: category || 'profile',
      status: 'pending',
      timestamp: new Date()
    });
    await report.save();

    res.json({ success: true, message: 'Report submitted successfully. Thank you for keeping Campus Connect safe! 🛡️' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/circles/:circleId/invite/:userId - Invite user to circle
router.post('/circles/:circleId/invite/:userId', requireAuth, async (req, res) => {
  try {
    const { circleId, userId } = req.params;

    const group = await GroupChat.findById(circleId);
    if (!group) return res.status(404).json({ success: false, error: 'Group not found.' });

    // Try resolving target user
    const targetUser = await findUserByIdOrUid(userId);
    if (!targetUser) return res.status(404).json({ success: false, error: 'Target user not found.' });

    const resolvedUserId = targetUser.userId;

    if (group.members.includes(resolvedUserId)) {
      return res.status(400).json({ success: false, error: 'User is already a member of this circle.' });
    }

    let actorName = 'Someone';
    const actorObj = await User.findOne({ userId: req.user.userId }) || await Alumni.findOne({ userId: req.user.userId });
    if (actorObj) actorName = actorObj.name;

    // Send notification to the user
    await createNotification(
      resolvedUserId,
      null,
      req.user.userId,
      'group_invite',
      'Circle Group Invitation',
      `${actorName} invited you to join the circle: "${group.name}".`,
      `Join this circle to chat and collaborate.`,
      circleId
    );

    res.json({ success: true, message: 'Invitation sent successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// REAL-TIME PROFILE STATISTICS & DATA APIS
// ============================================

// Helper to compute mutual connections count between two users
async function computeMutualCount(user1Id, user2Id) {
  if (!user1Id || !user2Id || user1Id === user2Id) return 0;
  try {
    const [conns1, conns2] = await Promise.all([
      Connection.find({ participants: user1Id }, { participants: 1 }),
      Connection.find({ participants: user2Id }, { participants: 1 })
    ]);
    const friends1 = new Set(conns1.flatMap(c => c.participants.filter(p => p !== user1Id)));
    const friends2 = new Set(conns2.flatMap(c => c.participants.filter(p => p !== user2Id)));
    let count = 0;
    for (const f of friends1) {
      if (friends2.has(f)) count++;
    }
    return count;
  } catch (e) {
    return 0;
  }
}

// Helper to resolve User or Alumni document by string userId or ObjectId
const findUserByAnyId = async (rawId, currentUserId = null) => {
  if (!rawId) return null;
  let resolvedId = rawId;
  if (resolvedId === 'me' && currentUserId) {
    resolvedId = currentUserId;
  }
  let user = await User.findOne({ userId: resolvedId }) || await Alumni.findOne({ userId: resolvedId });
  if (!user && mongoose.Types.ObjectId.isValid(resolvedId)) {
    user = await User.findById(resolvedId) || await Alumni.findById(resolvedId);
  }
  return user;
};

// GET /api/profile/:userId/stats (and /api/profile/:id/stats, /api/users/:userId/stats, /api/users/:id/stats)
const handleGetProfileStats = async (req, res) => {
  try {
    const rawId = req.params.userId || req.params.id || req.query.userId || (req.user ? req.user.userId : null);
    const userDoc = await findUserByAnyId(rawId, req.user ? req.user.userId : null);
    if (!userDoc) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    const userId = userDoc.userId;
    const currentUserId = req.user ? req.user.userId : null;

    const [postsCount, friendsCount, followersCount, followingCount, circlesCount, mutualCount] = await Promise.all([
      StudentPost.countDocuments({ userId }),
      Connection.countDocuments({ participants: userId }),
      Follow.countDocuments({ followingId: userId }),
      Follow.countDocuments({ followerId: userId }),
      GroupChat.countDocuments({ members: userId }),
      currentUserId ? computeMutualCount(currentUserId, userId) : 0
    ]);

    const achievementsCount = Array.isArray(userDoc.achievements) ? userDoc.achievements.length : 0;
    const projectsCount = Array.isArray(userDoc.projects) ? userDoc.projects.length : 0;

    const stats = {
      posts: postsCount,
      friends: friendsCount,
      followers: followersCount,
      following: followingCount,
      circles: circlesCount,
      achievements: achievementsCount,
      projects: projectsCount,
      mutual: mutualCount
    };

    res.json({ success: true, data: { stats, profile: userDoc } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/profile/:userId/stats', requireAuth, handleGetProfileStats);
router.get('/profile/:id/stats', requireAuth, handleGetProfileStats);
router.get('/profile/:userId', requireAuth, handleGetProfileStats);
router.get('/profile/:id', requireAuth, handleGetProfileStats);
router.get('/users/:userId/profile', requireAuth, handleGetProfileStats);
router.get('/users/:id/profile', requireAuth, handleGetProfileStats);
router.get('/users/:userId/stats', requireAuth, handleGetProfileStats);
router.get('/users/:id/stats', requireAuth, handleGetProfileStats);

// GET /api/profile/:userId/posts (and /api/profile/:id/posts)
const handleGetProfilePosts = async (req, res) => {
  try {
    const rawId = req.params.userId || req.params.id || req.query.userId;
    const userDoc = await findUserByAnyId(rawId, req.user ? req.user.userId : null);
    const userId = userDoc ? userDoc.userId : rawId;

    const posts = await StudentPost.find({ userId }).sort({ createdAt: -1 });
    
    // Attach like & comment counts for each post
    const postsWithCounts = await Promise.all(posts.map(async (p) => {
      const pObj = p.toObject();
      const [likesCount, commentsCount] = await Promise.all([
        Like.countDocuments({ postId: p._id.toString() }),
        Comment.countDocuments({ postId: p._id.toString() })
      ]);
      pObj.likesCount = likesCount;
      pObj.commentsCount = commentsCount;
      return pObj;
    }));

    res.json({ success: true, data: postsWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/profile/:userId/posts', requireAuth, handleGetProfilePosts);
router.get('/profile/:id/posts', requireAuth, handleGetProfilePosts);
router.get('/users/:userId/posts', requireAuth, handleGetProfilePosts);
router.get('/users/:id/posts', requireAuth, handleGetProfilePosts);

// GET /api/profile/:userId/photos (and /api/profile/:id/photos)
const handleGetProfilePhotos = async (req, res) => {
  try {
    const rawId = req.params.userId || req.params.id || req.query.userId;
    const userDoc = await findUserByAnyId(rawId, req.user ? req.user.userId : null);
    const userId = userDoc ? userDoc.userId : rawId;
    const authorName = userDoc ? (userDoc.fullName || userDoc.name || 'User') : 'User';
    const authorAvatar = userDoc ? (userDoc.profileImageUrl || (userDoc.photos && userDoc.photos[0]) || '') : '';
    
    const postObjects = [];
    const seenPostIds = new Set();

    // 1. Fetch actual StudentPosts that contain images or videos
    const studentPosts = await StudentPost.find({
      userId,
      $or: [
        { image: { $ne: '' } },
        { images: { $exists: true, $not: { $size: 0 } } },
        { videoUrl: { $ne: '' } },
        { videos: { $exists: true, $not: { $size: 0 } } }
      ]
    }).sort({ createdAt: -1 });

    for (const p of studentPosts) {
      if (!seenPostIds.has(p._id.toString())) {
        seenPostIds.add(p._id.toString());
        
        const likesCount = await Like.countDocuments({ postId: p._id });
        const commentsList = await Comment.find({ postId: p._id }).sort({ createdAt: 1 });

        const postObj = p.toObject();
        postObj.id = p._id.toString();
        postObj.authorName = authorName;
        postObj.authorAvatar = authorAvatar;
        postObj.likes = likesCount;
        postObj.comments = commentsList.map(c => ({
          id: c._id.toString(),
          authorId: c.userId,
          authorName: c.userName || 'Anonymous',
          authorAvatar: c.userAvatar || '',
          content: c.content,
          createdAt: c.createdAt
        }));

        postObjects.push(postObj);
      }
    }

    // 2. Fetch actual Alumni Posts (Post) that contain images or videos
    const alumniPosts = await Post.find({
      alumniId: userId,
      $or: [
        { imageUrls: { $exists: true, $not: { $size: 0 } } },
        { videoUrls: { $exists: true, $not: { $size: 0 } } }
      ]
    }).sort({ createdAt: -1 });

    for (const p of alumniPosts) {
      if (!seenPostIds.has(p._id.toString())) {
        seenPostIds.add(p._id.toString());

        const postObj = p.toObject();
        postObj.id = p._id.toString();
        postObj.authorName = authorName;
        postObj.authorAvatar = authorAvatar;
        postObj.likes = p.likes?.length || 0;
        postObj.comments = (p.comments || []).map(c => ({
          id: c._id ? c._id.toString() : c.id,
          authorId: c.userId,
          authorName: c.userName || 'User',
          authorAvatar: c.userAvatar || '',
          content: c.content,
          createdAt: c.createdAt
        }));

        // Normalize field names
        postObj.images = p.imageUrls || [];
        postObj.videos = p.videoUrls || [];

        postObjects.push(postObj);
      }
    }

    // 3. Fallback/Virtual post for standalone Avatar and gallery photos if no posts exist
    if (postObjects.length === 0) {
      if (userDoc?.profileImageUrl) {
        postObjects.push({
          id: `avatar-post-${userDoc._id}`,
          userId,
          authorName,
          authorAvatar,
          content: `${authorName}'s Profile Avatar`,
          images: [userDoc.profileImageUrl],
          videos: [],
          likes: 0,
          comments: [],
          createdAt: userDoc.updatedAt || userDoc.createdAt || new Date().toISOString(),
          type: 'student_post'
        });
      }

      if (Array.isArray(userDoc?.photos)) {
        userDoc.photos.forEach((photoUrl, idx) => {
          if (photoUrl && photoUrl !== userDoc.profileImageUrl) {
            postObjects.push({
              id: `gallery-post-${idx}-${userDoc._id}`,
              userId,
              authorName,
              authorAvatar,
              content: `Photo from gallery`,
              images: [photoUrl],
              videos: [],
              likes: 0,
              comments: [],
              createdAt: userDoc.updatedAt || userDoc.createdAt || new Date().toISOString(),
              type: 'student_post'
            });
          }
        });
      }
    }

    res.json({ success: true, data: postObjects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/profile/:userId/photos', requireAuth, handleGetProfilePhotos);
router.get('/profile/:id/photos', requireAuth, handleGetProfilePhotos);
router.get('/users/:userId/media', requireAuth, handleGetProfilePhotos);
router.get('/users/:id/media', requireAuth, handleGetProfilePhotos);

// GET /api/profile/:userId/videos
const handleGetProfileVideos = async (req, res) => {
  try {
    const rawId = req.params.userId || req.params.id || req.query.userId;
    const userDoc = await findUserByAnyId(rawId, req.user ? req.user.userId : null);
    const userId = userDoc ? userDoc.userId : rawId;

    const postsWithVideos = await StudentPost.find({ 
      userId, 
      $or: [
        { videoUrl: { $exists: true, $ne: '' } },
        { image: { $regex: /\.(mp4|webm|mov)$/i } }
      ] 
    }).sort({ createdAt: -1 });

    const videoList = postsWithVideos.map(p => ({
      id: p._id.toString(),
      url: p.videoUrl || p.image,
      thumbnail: p.image,
      createdAt: p.createdAt
    }));

    res.json({ success: true, data: videoList });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/profile/:userId/videos', requireAuth, handleGetProfileVideos);
router.get('/profile/:id/videos', requireAuth, handleGetProfileVideos);

// GET /api/profile/:userId/projects
const handleGetProfileProjects = async (req, res) => {
  try {
    const rawId = req.params.userId || req.params.id || req.query.userId;
    const userDoc = await findUserByAnyId(rawId, req.user ? req.user.userId : null);
    if (!userDoc) return res.status(404).json({ success: false, error: 'User not found' });
    
    const rawProjects = userDoc.projects || [];
    const projects = rawProjects.map((p, idx) => {
      if (typeof p === 'string') {
        return { id: `proj-${idx}`, title: p, description: p };
      }
      return p;
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/profile/:userId/projects', requireAuth, handleGetProfileProjects);
router.get('/profile/:id/projects', requireAuth, handleGetProfileProjects);

// GET /api/profile/:userId/achievements
const handleGetProfileAchievements = async (req, res) => {
  try {
    const rawId = req.params.userId || req.params.id || req.query.userId;
    const userDoc = await findUserByAnyId(rawId, req.user ? req.user.userId : null);
    if (!userDoc) return res.status(404).json({ success: false, error: 'User not found' });

    const rawAchievements = userDoc.achievements || [];
    const achievements = rawAchievements.map((a, idx) => {
      if (typeof a === 'string') {
        return { id: `ach-${idx}`, title: a, description: a };
      }
      return a;
    });

    res.json({ success: true, data: achievements });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/profile/:userId/achievements', requireAuth, handleGetProfileAchievements);
router.get('/profile/:id/achievements', requireAuth, handleGetProfileAchievements);

// GET /api/profile/:userId/friends (and /api/profile/:id/friends)
const handleGetProfileFriends = async (req, res) => {
  try {
    const rawId = req.params.userId || req.params.id || req.query.userId;
    const userDoc = await findUserByAnyId(rawId, req.user ? req.user.userId : null);
    const userId = userDoc ? userDoc.userId : rawId;

    const connections = await Connection.find({ participants: userId });
    const friendIds = connections.flatMap(c => c.participants.filter(p => p !== userId));
    
    const friendDocs = await Promise.all(friendIds.map(async (fId) => {
      const fUser = await findUserByAnyId(fId);
      if (!fUser) return null;
      const mutualCount = await computeMutualCount(req.user.userId, fId);
      return {
        id: fUser.userId,
        _id: fUser._id.toString(),
        name: fUser.fullName || fUser.name,
        username: (fUser.fullName || fUser.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, ''),
        department: fUser.department || fUser.course || '',
        batch: fUser.batch || fUser.year || '',
        profileImageUrl: fUser.profileImageUrl || (fUser.photos && fUser.photos[0]) || '',
        photos: fUser.photos || [],
        skills: fUser.skills || [],
        isOnline: fUser.isOnline || false,
        mutualCount
      };
    }));

    const validFriends = friendDocs.filter(Boolean);
    res.json({ success: true, data: validFriends });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/profile/:userId/friends', requireAuth, handleGetProfileFriends);
router.get('/profile/:id/friends', requireAuth, handleGetProfileFriends);
router.get('/users/:userId/friends', requireAuth, handleGetProfileFriends);
router.get('/users/:id/friends', requireAuth, handleGetProfileFriends);

// GET /api/profile/:userId/followers (and /api/profile/:id/followers)
const handleGetProfileFollowers = async (req, res) => {
  try {
    const rawId = req.params.userId || req.params.id || req.query.userId;
    const userDoc = await findUserByAnyId(rawId, req.user ? req.user.userId : null);
    const userId = userDoc ? userDoc.userId : rawId;

    const follows = await Follow.find({ followingId: userId });
    const followerIds = follows.map(f => f.followerId);

    const followerDocs = await Promise.all(followerIds.map(async (fId) => {
      const fUser = await findUserByAnyId(fId);
      if (!fUser) return null;
      return {
        id: fUser.userId,
        _id: fUser._id.toString(),
        name: fUser.fullName || fUser.name,
        department: fUser.department || '',
        profileImageUrl: fUser.profileImageUrl || (fUser.photos && fUser.photos[0]) || '',
        isOnline: fUser.isOnline || false
      };
    }));

    res.json({ success: true, data: followerDocs.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/profile/:userId/followers', requireAuth, handleGetProfileFollowers);
router.get('/profile/:id/followers', requireAuth, handleGetProfileFollowers);
router.get('/users/:userId/followers', requireAuth, handleGetProfileFollowers);
router.get('/users/:id/followers', requireAuth, handleGetProfileFollowers);

// GET /api/profile/:userId/following
const handleGetProfileFollowing = async (req, res) => {
  try {
    const rawId = req.params.userId || req.params.id || req.query.userId;
    const userDoc = await findUserByAnyId(rawId, req.user ? req.user.userId : null);
    const userId = userDoc ? userDoc.userId : rawId;

    const follows = await Follow.find({ followerId: userId });
    const followingIds = follows.map(f => f.followingId);

    const followingDocs = await Promise.all(followingIds.map(async (fId) => {
      const fUser = await findUserByAnyId(fId);
      if (!fUser) return null;
      return {
        id: fUser.userId,
        _id: fUser._id.toString(),
        name: fUser.fullName || fUser.name,
        department: fUser.department || '',
        profileImageUrl: fUser.profileImageUrl || (fUser.photos && fUser.photos[0]) || '',
        isOnline: fUser.isOnline || false
      };
    }));

    res.json({ success: true, data: followingDocs.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/profile/:userId/following', requireAuth, handleGetProfileFollowing);
router.get('/profile/:id/following', requireAuth, handleGetProfileFollowing);

// POST /api/profile/follow - Follow user
router.post('/profile/follow', requireAuth, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user.userId;

    if (!targetUserId || targetUserId === currentUserId) {
      return res.status(400).json({ success: false, error: 'Invalid target user ID' });
    }

    let existing = await Follow.findOne({ followerId: currentUserId, followingId: targetUserId });
    if (!existing) {
      existing = new Follow({ followerId: currentUserId, followingId: targetUserId });
      await existing.save();

      // Emit socket notification
      if (global.io) {
        global.io.emit('follow:update', { followerId: currentUserId, followingId: targetUserId });
      }
    }

    res.json({ success: true, isFollowing: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/profile/unfollow - Unfollow user
router.post('/profile/unfollow', requireAuth, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user.userId;

    await Follow.deleteOne({ followerId: currentUserId, followingId: targetUserId });

    if (global.io) {
      global.io.emit('follow:update', { followerId: currentUserId, followingId: targetUserId });
    }

    res.json({ success: true, isFollowing: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PRODUCTION FILE & IMAGE UPLOAD SYSTEM
// ============================================

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${file.fieldname || 'upload'}-${uniqueSuffix}${ext}`);
  }
});

const uploadFileFilter = (req, file, cb) => {
  const allowedExts = /\.(jpeg|jpg|png|webp|gif|mp4|mov|webm|pdf|doc|docx)$/i;
  if (allowedExts.test(file.originalname)) {
    return cb(null, true);
  }
  cb(new Error('Unsupported file format. Allowed formats: JPG, JPEG, PNG, WEBP, GIF, MP4, MOV, WEBM, PDF, DOC'));
};

const multerUpload = multer({
  storage: uploadStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max limit
  fileFilter: uploadFileFilter
});

const multerUploadAny = multerUpload.any();

// Safe wrapper so Multer errors return JSON instead of Express HTML error pages
const safeMulterMiddleware = (req, res, next) => {
  multerUploadAny(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload processing failed'
      });
    }
    next();
  });
};

// Process single or multiple uploaded files or base64 data
const resolveUploadResponse = (req) => {
  const protocol = req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;

  const uploadedUrls = [];

  // 1. Files uploaded via Multer
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    req.files.forEach(f => {
      uploadedUrls.push(`${baseUrl}/uploads/${f.filename}`);
    });
  } else if (req.file) {
    uploadedUrls.push(`${baseUrl}/uploads/${req.file.filename}`);
  }

  // 2. Base64 strings sent in body
  const base64Candidate = req.body.image || req.body.file || req.body.dataUrl || req.body.avatar;
  if (base64Candidate && typeof base64Candidate === 'string' && base64Candidate.startsWith('data:')) {
    try {
      const matches = base64Candidate.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        let ext = '.jpg';
        if (mimeType.includes('png')) ext = '.png';
        else if (mimeType.includes('webp')) ext = '.webp';
        else if (mimeType.includes('gif')) ext = '.gif';
        else if (mimeType.includes('mp4')) ext = '.mp4';
        else if (mimeType.includes('webm')) ext = '.webm';

        const filename = `b64-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        const filePath = path.join(__dirname, 'uploads', filename);
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        uploadedUrls.push(`${baseUrl}/uploads/${filename}`);
      }
    } catch (e) {
      console.error('Error saving base64 upload:', e);
    }
  }

  // Fallback if URL string passed directly
  if (uploadedUrls.length === 0 && base64Candidate && typeof base64Candidate === 'string') {
    uploadedUrls.push(base64Candidate);
  }

  const primaryUrl = uploadedUrls[0] || '';
  return {
    success: true,
    url: primaryUrl,
    imageUrl: primaryUrl,
    fileUrl: primaryUrl,
    urls: uploadedUrls,
    data: {
      url: primaryUrl,
      urls: uploadedUrls
    },
    message: 'Upload successful'
  };
};

const handleUploadEndpoint = async (req, res) => {
  try {
    const result = resolveUploadResponse(req);
    if (!result.url) {
      return res.status(400).json({
        success: false,
        error: 'No valid file or image data provided'
      });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Generic Upload Routes
router.post('/upload', safeMulterMiddleware, handleUploadEndpoint);
router.post('/upload/file', safeMulterMiddleware, handleUploadEndpoint);
router.post('/upload/avatar', safeMulterMiddleware, handleUploadEndpoint);
router.post('/profile/avatar', safeMulterMiddleware, handleUploadEndpoint);
router.post('/story/upload', safeMulterMiddleware, handleUploadEndpoint);
router.post('/stories/upload', safeMulterMiddleware, handleUploadEndpoint);
router.post('/posts/upload', safeMulterMiddleware, handleUploadEndpoint);
router.post('/media/upload', safeMulterMiddleware, handleUploadEndpoint);
router.post('/chats/:chatId/upload', safeMulterMiddleware, handleUploadEndpoint);
router.post('/chat/:chatId/upload', safeMulterMiddleware, handleUploadEndpoint);

// PREFERENCES API (Production-Ready)
const getOrCreatePreferences = async (userId) => {
  let prefs = await UserPreferences.findOne({ userId });
  if (!prefs) {
    prefs = new UserPreferences({ userId });
    await prefs.save();
  }
  return prefs;
};

// GET /api/preferences
router.get('/preferences', requireAuth, async (req, res) => {
  try {
    const userId = req.userId || (req.user && req.user.userId);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is missing from request session' });
    }
    const prefs = await getOrCreatePreferences(userId);
    res.json({ success: true, data: prefs });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ success: false, error: 'Unable to retrieve preferences. Please try again.' });
  }
});

// PUT /api/preferences
router.put('/preferences', requireAuth, async (req, res) => {
  try {
    const userId = req.userId || (req.user && req.user.userId);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is missing from request session' });
    }
    const updates = req.body;
    delete updates.userId;
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    const prefs = await UserPreferences.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, runValidators: true, upsert: true }
    );
    res.json({ success: true, data: prefs });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(400).json({ success: false, error: 'Unable to update preferences. Please check input parameters.' });
  }
});

// PATCH /api/preferences/theme
router.patch('/preferences/theme', requireAuth, async (req, res) => {
  try {
    const userId = req.userId || (req.user && req.user.userId);
    const { theme } = req.body;
    if (!['dark', 'light', 'system'].includes(theme)) {
      return res.status(400).json({ success: false, error: 'Invalid theme mode specified' });
    }
    const prefs = await UserPreferences.findOneAndUpdate(
      { userId },
      { $set: { theme } },
      { new: true, runValidators: true, upsert: true }
    );
    res.json({ success: true, data: prefs });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Unable to update theme. Please try again.' });
  }
});

// PATCH /api/preferences/language
router.patch('/preferences/language', requireAuth, async (req, res) => {
  try {
    const userId = req.userId || (req.user && req.user.userId);
    const { language } = req.body;
    const allowed = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam'];
    if (!allowed.includes(language)) {
      return res.status(400).json({ success: false, error: 'Invalid language specified' });
    }
    const prefs = await UserPreferences.findOneAndUpdate(
      { userId },
      { $set: { language } },
      { new: true, runValidators: true, upsert: true }
    );
    res.json({ success: true, data: prefs });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Language could not be changed.' });
  }
});

// PATCH /api/preferences/timezone
router.patch('/preferences/timezone', requireAuth, async (req, res) => {
  try {
    const userId = req.userId || (req.user && req.user.userId);
    const { timezone } = req.body;
    if (!timezone || typeof timezone !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid timezone specified' });
    }
    const prefs = await UserPreferences.findOneAndUpdate(
      { userId },
      { $set: { timezone } },
      { new: true, runValidators: true, upsert: true }
    );
    res.json({ success: true, data: prefs });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Unable to update timezone.' });
  }
});

// PATCH /api/preferences/date-format
router.patch('/preferences/date-format', requireAuth, async (req, res) => {
  try {
    const userId = req.userId || (req.user && req.user.userId);
    const { dateFormat, timeFormat } = req.body;
    const updates = {};
    if (dateFormat) {
      if (!['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(dateFormat)) {
        return res.status(400).json({ success: false, error: 'Invalid date format' });
      }
      updates.dateFormat = dateFormat;
    }
    if (timeFormat) {
      if (!['12h', '24h'].includes(timeFormat)) {
        return res.status(400).json({ success: false, error: 'Invalid time format' });
      }
      updates.timeFormat = timeFormat;
    }
    const prefs = await UserPreferences.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, runValidators: true, upsert: true }
    );
    res.json({ success: true, data: prefs });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Unable to update date/time formats.' });
  }
});

// PATCH /api/preferences/notification
router.patch('/preferences/notification', requireAuth, async (req, res) => {
  try {
    const userId = req.userId || (req.user && req.user.userId);
    const { notificationSound, notificationVolume } = req.body;
    const updates = {};
    if (notificationSound) {
      if (!['Default', 'Chime', 'Pop', 'Bell', 'Campus', 'Silent'].includes(notificationSound)) {
        return res.status(400).json({ success: false, error: 'Invalid notification sound specified' });
      }
      updates.notificationSound = notificationSound;
    }
    if (notificationVolume !== undefined) {
      const vol = Number(notificationVolume);
      if (isNaN(vol) || vol < 0 || vol > 100) {
        return res.status(400).json({ success: false, error: 'Invalid volume level (must be 0-100)' });
      }
      updates.notificationVolume = vol;
    }
    const prefs = await UserPreferences.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, runValidators: true, upsert: true }
    );
    res.json({ success: true, data: prefs });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Unable to update notification parameters.' });
  }
});

// PATCH /api/preferences/data-saver
router.patch('/preferences/data-saver', requireAuth, async (req, res) => {
  try {
    const userId = req.userId || (req.user && req.user.userId);
    const { dataSaver, autoPlayVideos, imageQuality, mediaCompression, videoHd, wifiOnlyDownloads } = req.body;
    const updates = {};
    if (dataSaver !== undefined) updates.dataSaver = Boolean(dataSaver);
    if (autoPlayVideos !== undefined) updates.autoPlayVideos = Boolean(autoPlayVideos);
    if (mediaCompression !== undefined) updates.mediaCompression = Boolean(mediaCompression);
    if (videoHd !== undefined) updates.videoHd = Boolean(videoHd);
    if (wifiOnlyDownloads !== undefined) updates.wifiOnlyDownloads = Boolean(wifiOnlyDownloads);
    if (imageQuality) {
      if (!['Auto', 'HD', 'Low Quality'].includes(imageQuality)) {
        return res.status(400).json({ success: false, error: 'Invalid image quality setting' });
      }
      updates.imageQuality = imageQuality;
    }
    const prefs = await UserPreferences.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, runValidators: true, upsert: true }
    );
    res.json({ success: true, data: prefs });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Unable to update data saver configurations.' });
  }
});

// ==========================================
// STUDENT TO ALUMNI IDENTITY MIGRATION ENDPOINTS
// ==========================================

// 1. POST /api/auth/student/login
router.post('/auth/student/login', checkAccountLoginLimit, async (req, res) => {
  try {
    const { collegeEmail, code } = req.body;
    if (!collegeEmail) {
      return res.status(400).json({ success: false, error: 'College email is required.' });
    }
    const lowerEmail = collegeEmail.toLowerCase().trim();

    // Find user by collegeEmail or email
    const user = await User.findOne({ $or: [{ collegeEmail: lowerEmail }, { email: lowerEmail }] });
    if (!user) {
      return res.status(404).json({ success: false, error: 'No student record exists for this college email.' });
    }
    if (user.role !== 'student') {
      return res.status(403).json({ success: false, error: 'Only student accounts can use this login method.' });
    }

    if (!code) {
      // Send OTP
      const mfaCode = crypto.randomInt(100000, 1000000).toString();
      console.log(`🔑 [OTP Debug] Generated Student login OTP code: [${mfaCode}] for email: [${lowerEmail}]`);
      const hashedMfa = crypto.createHash('sha256').update(mfaCode).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      const emailResult = await emailService.sendOTP(lowerEmail, mfaCode, 15);
      if (!emailResult.success) {
        return res.status(500).json({ success: false, error: 'Failed to dispatch verification email.' });
      }

      await OTP.findOneAndUpdate(
        { email: lowerEmail },
        { code: hashedMfa, otp: hashedMfa, expiresAt, role: 'student', attempts: 0, verified: false },
        { upsert: true, new: true }
      );

      const responsePayload = { success: true, message: 'OTP sent successfully!' };
      if (process.env.NODE_ENV !== 'production') {
        responsePayload.debugOtp = mfaCode;
      }
      return res.json(responsePayload);
    } else {
      // Verify OTP
      const otpRecord = await OTP.findOne({ email: lowerEmail });
      if (!otpRecord || otpRecord.expiresAt < new Date()) {
        if (otpRecord) await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, error: 'Verification code expired.' });
      }

      const hashedInput = crypto.createHash('sha256').update(code.trim()).digest('hex');
      if (otpRecord.code !== hashedInput && otpRecord.otp !== hashedInput) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        if (otpRecord.attempts >= 5) {
          await OTP.deleteOne({ _id: otpRecord._id });
        }
        return res.status(400).json({ success: false, error: 'Invalid verification code.' });
      }

      await OTP.deleteOne({ _id: otpRecord._id });
      
      // Update verified status
      user.collegeEmailVerified = true;
      if (!user.collegeEmail) {
        user.collegeEmail = user.email;
      }
      await user.save();

      const { token } = await createSessionAndTokens(req, res, user.userId, 'student', lowerEmail);
      return res.json({ success: true, token, role: 'student', user });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 2. POST /api/auth/alumni/verify
router.post('/auth/alumni/verify', requireAuth, async (req, res) => {
  try {
    const { collegeEmail, personalEmail } = req.body;
    if (!collegeEmail || !personalEmail) {
      return res.status(400).json({ success: false, error: 'Both college email and personal email are required.' });
    }

    const lowerCollege = collegeEmail.toLowerCase().trim();
    const lowerPersonal = personalEmail.toLowerCase().trim();

    // Verify user identity by looking up the student record
    const user = await User.findOne({
      $or: [{ collegeEmail: lowerCollege }, { email: lowerCollege }]
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'No student record exists for this college email.' });
    }

    const currentRole = (user.role || '').toLowerCase().trim();
    if (currentRole === 'alumni') {
      return res.status(400).json({ success: false, error: 'This account has already been converted to Alumni.' });
    }
    if (currentRole !== 'student') {
      return res.status(400).json({ success: false, error: 'Only verified student accounts can transition to alumni.' });
    }

    const dbPersonalEmail = (user.personalEmail || '').toLowerCase().trim();
    if (dbPersonalEmail !== lowerPersonal) {
      // Personal email mismatch -> Create Admin Verification Request
      await AlumniVerification.create({
        userId: user.userId,
        email: lowerPersonal,
        name: user.name,
        rollNumber: user.rollNumber || '',
        batch: user.batch || '',
        status: 'pending',
        method: 'email'
      });

      return res.status(400).json({
        success: false,
        error: 'The personal email does not match the email linked to your student account.'
      });
    }

    // Role migration
    user.alumniVerified = true;
    user.role = 'alumni';
    user.collegeEmailVerified = true;
    user.personalEmailVerified = true;
    if (!user.collegeEmail) {
      user.collegeEmail = user.email;
    }
    await user.save();

    // Create main Alumni profile document if it doesn't exist
    const existingAlumni = await Alumni.findOne({ alumniId: user.userId });
    if (!existingAlumni) {
      await Alumni.create({
        alumniId: user.userId,
        name: user.name,
        email: lowerPersonal,
        personalEmail: lowerPersonal,
        collegeEmail: lowerCollege,
        department: user.department || 'General',
        passoutYear: user.batch || '',
        batch: user.batch || '',
        company: '',
        jobRole: '',
        experience: 0,
        bio: user.bio || '',
        skills: user.skills || [],
        interests: user.interests || []
      });
    }

    const { token } = await createSessionAndTokens(req, res, user.userId, 'alumni', lowerPersonal);
    return res.json({ success: true, token, role: 'alumni', message: 'Successfully transitioned to Alumni!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 3. POST /api/auth/alumni/login
router.post('/auth/alumni/login', checkAccountLoginLimit, async (req, res) => {
  try {
    const { personalEmail, code } = req.body;
    if (!personalEmail) {
      return res.status(400).json({ success: false, error: 'Personal email is required.' });
    }
    const lowerEmail = personalEmail.toLowerCase().trim();

    // Find user by personalEmail and ensure they are alumniVerified
    const user = await User.findOne({ personalEmail: lowerEmail, alumniVerified: true });
    if (!user) {
      return res.status(404).json({ success: false, error: 'No verified alumni record exists for this personal email.' });
    }

    if (!code) {
      // Send OTP
      const mfaCode = crypto.randomInt(100000, 1000000).toString();
      console.log(`🔑 [OTP Debug] Generated Alumni login OTP code: [${mfaCode}] for email: [${lowerEmail}]`);
      const hashedMfa = crypto.createHash('sha256').update(mfaCode).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      const emailResult = await emailService.sendOTP(lowerEmail, mfaCode, 15);
      if (!emailResult.success) {
        return res.status(500).json({ success: false, error: 'Failed to dispatch verification email.' });
      }

      await OTP.findOneAndUpdate(
        { email: lowerEmail },
        { code: hashedMfa, otp: hashedMfa, expiresAt, role: 'alumni', attempts: 0, verified: false },
        { upsert: true, new: true }
      );

      const responsePayload = { success: true, message: 'OTP sent successfully!' };
      if (process.env.NODE_ENV !== 'production') {
        responsePayload.debugOtp = mfaCode;
      }
      return res.json(responsePayload);
    } else {
      // Verify OTP
      const otpRecord = await OTP.findOne({ email: lowerEmail });
      if (!otpRecord || otpRecord.expiresAt < new Date()) {
        if (otpRecord) await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, error: 'Verification code expired.' });
      }

      const hashedInput = crypto.createHash('sha256').update(code.trim()).digest('hex');
      if (otpRecord.code !== hashedInput && otpRecord.otp !== hashedInput) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        if (otpRecord.attempts >= 5) {
          await OTP.deleteOne({ _id: otpRecord._id });
        }
        return res.status(400).json({ success: false, error: 'Invalid verification code.' });
      }

      await OTP.deleteOne({ _id: otpRecord._id });

      const { token } = await createSessionAndTokens(req, res, user.userId, 'alumni', lowerEmail);
      return res.json({ success: true, token, role: 'alumni', user });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 4. PATCH /api/profile/personal-email
router.patch('/profile/personal-email', requireAuth, async (req, res) => {
  try {
    const { personalEmail, code } = req.body;
    if (!personalEmail) {
      return res.status(400).json({ success: false, error: 'Personal email is required.' });
    }
    const lowerEmail = personalEmail.toLowerCase().trim();

    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    if (!code) {
      // Check duplicate
      const duplicateUser = await User.findOne({ personalEmail: lowerEmail });
      if (duplicateUser && duplicateUser.userId !== user.userId) {
        return res.status(400).json({ success: false, error: 'This personal email is already linked to another account.' });
      }

      // Send OTP
      const mfaCode = crypto.randomInt(100000, 1000000).toString();
      console.log(`🔑 [OTP Debug] Generated personal email change OTP code: [${mfaCode}] for email: [${lowerEmail}]`);
      const hashedMfa = crypto.createHash('sha256').update(mfaCode).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      const emailResult = await emailService.sendOTP(lowerEmail, mfaCode, 15);
      if (!emailResult.success) {
        return res.status(500).json({ success: false, error: 'Failed to dispatch verification email.' });
      }

      await OTP.findOneAndUpdate(
        { email: lowerEmail },
        { code: hashedMfa, otp: hashedMfa, expiresAt, role: req.user.role, attempts: 0, verified: false },
        { upsert: true, new: true }
      );

      const responsePayload = { success: true, message: 'OTP sent successfully!' };
      if (process.env.NODE_ENV !== 'production') {
        responsePayload.debugOtp = mfaCode;
      }
      return res.json(responsePayload);
    } else {
      // Verify OTP
      const otpRecord = await OTP.findOne({ email: lowerEmail });
      if (!otpRecord || otpRecord.expiresAt < new Date()) {
        if (otpRecord) await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, error: 'Verification code expired.' });
      }

      const hashedInput = crypto.createHash('sha256').update(code.trim()).digest('hex');
      if (otpRecord.code !== hashedInput && otpRecord.otp !== hashedInput) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        if (otpRecord.attempts >= 5) {
          await OTP.deleteOne({ _id: otpRecord._id });
        }
        return res.status(400).json({ success: false, error: 'Invalid verification code.' });
      }

      await OTP.deleteOne({ _id: otpRecord._id });

      // Save
      user.personalEmail = lowerEmail;
      user.personalEmailVerified = true;
      await user.save();

      // If they are also an Alumni, sync their alumni profile
      const alumniProf = await Alumni.findOne({ alumniId: user.userId });
      if (alumniProf) {
        alumniProf.personalEmail = lowerEmail;
        alumniProf.email = lowerEmail;
        await alumniProf.save();
      }

      return res.json({ success: true, message: 'Personal email updated successfully.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 5. GET /api/admin/alumni/pending
router.get('/admin/alumni/pending', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
    }
    const pending = await AlumniVerification.find({ status: 'pending' });
    res.json({ success: true, data: pending });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 6. POST /api/admin/alumni/approve
router.post('/admin/alumni/approve', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
    }
    const { verificationId } = req.body;
    const verification = await AlumniVerification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({ success: false, error: 'Verification request not found.' });
    }

    const user = await User.findOne({ userId: verification.userId });
    if (user) {
      user.role = 'alumni';
      user.alumniVerified = true;
      user.personalEmail = verification.email;
      user.personalEmailVerified = true;
      await user.save();

      // Create Alumni profile document if it doesn't exist
      const existingAlumni = await Alumni.findOne({ alumniId: user.userId });
      if (!existingAlumni) {
        await Alumni.create({
          alumniId: user.userId,
          name: user.name,
          email: verification.email,
          personalEmail: verification.email,
          collegeEmail: user.collegeEmail || user.email,
          department: user.department || 'General',
          batch: user.batch || '',
          company: '',
          jobRole: '',
          experience: 0,
          bio: user.bio || '',
          skills: user.skills || [],
          interests: user.interests || []
        });
      }
    }

    verification.status = 'approved';
    verification.verifiedAt = new Date();
    verification.verifiedBy = req.user.userId;
    await verification.save();

    res.json({ success: true, message: 'Alumni verification approved successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 7. POST /api/admin/alumni/reject
router.post('/admin/alumni/reject', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
    }
    const { verificationId } = req.body;
    const verification = await AlumniVerification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({ success: false, error: 'Verification request not found.' });
    }

    verification.status = 'rejected';
    verification.verifiedAt = new Date();
    verification.verifiedBy = req.user.userId;
    await verification.save();

    res.json({ success: true, message: 'Alumni verification rejected.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

module.exports.createNotification = createNotification;

module.exports = router;
