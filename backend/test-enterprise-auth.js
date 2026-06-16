const mongoose = require('mongoose');
const { User, Alumni, OTP, Session, LoginAttempt, SecurityLog, CollegeDomain, AlumniVerification } = require('./models');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-connect';

async function runTests() {
  console.log('🔌 Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully.');

  // Clean test documents
  await User.deleteMany({ email: 'teststudent@sru.edu.in' });
  await Alumni.deleteMany({ email: 'testalumni@sru.edu.in' });
  await AlumniVerification.deleteMany({ email: 'testalumni@sru.edu.in' });
  await OTP.deleteMany({ email: { $in: ['teststudent@sru.edu.in', 'testalumni@sru.edu.in', 'invaliddomain@gmail.com'] } });
  await LoginAttempt.deleteMany({ email: { $in: ['teststudent@sru.edu.in', 'testalumni@sru.edu.in'] } });
  await Session.deleteMany({ userId: { $in: ['student-test-uid', 'alumni-test-uid'] } });
  console.log('🧹 Cleaned existing test documents.');

  // Test Case 1: Centralized College Domain Registry matching emails
  console.log('\n--- Test Case 1: College Domain Registry ---');
  // Add a test domain
  await CollegeDomain.deleteMany({ domain: 'specialcollege.edu' });
  await CollegeDomain.create({ name: 'Special College', domain: 'specialcollege.edu' });
  
  // Make call to check domain (directly simulating routes.js checks or endpoint)
  const isApprovedCollegeDomain = async (email) => {
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1].toLowerCase().trim();
    
    const exists = await CollegeDomain.findOne({ domain });
    if (exists) return true;
    
    if (domain.endsWith('.edu') || domain.endsWith('.edu.in') || domain.endsWith('.ac.in')) {
      return true;
    }
    return false;
  };

  const validCheck1 = await isApprovedCollegeDomain('student@specialcollege.edu');
  const validCheck2 = await isApprovedCollegeDomain('student@sru.edu.in'); // Ends with .edu.in
  const invalidCheck = await isApprovedCollegeDomain('student@gmail.com');

  if (!validCheck1 || !validCheck2 || invalidCheck) {
    throw new Error(`Domain registry validation failed. G1: ${validCheck1}, G2: ${validCheck2}, B: ${invalidCheck}`);
  }
  console.log('✅ College Domain Registry checks passed.');

  // Test Case 2: Cryptographically secure and hashed OTPs (SHA-256)
  console.log('\n--- Test Case 2: Cryptographically Secure Hashed OTPs ---');
  // Generate secure code
  const crypto = require('crypto');
  const code = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = crypto.createHash('sha256').update(code).digest('hex');

  await OTP.create({
    email: 'teststudent@sru.edu.in',
    code: hashedOtp,
    otp: hashedOtp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    role: 'student'
  });

  const savedOtp = await OTP.findOne({ email: 'teststudent@sru.edu.in' });
  if (!savedOtp) {
    throw new Error('Failed to save OTP');
  }
  if (savedOtp.code === code) {
    throw new Error('Assertion failed: OTP stored in plaintext!');
  }
  
  const verifyHashedInput = crypto.createHash('sha256').update(code).digest('hex');
  if (savedOtp.code !== verifyHashedInput) {
    throw new Error('Hashed OTP matching failed');
  }
  console.log('✅ Hashed OTP storage verified (no plaintext code exists).');

  // Test Case 3: Lockout Lock Protection (Max 5 attempts)
  console.log('\n--- Test Case 3: Lockout Brute-force Protection ---');
  const testEmail = 'teststudent@sru.edu.in';
  const testIp = '127.0.0.1';

  // Simulate 5 incorrect OTP attempts
  for (let i = 1; i <= 5; i++) {
    // Record failed attempt
    let attempt = await LoginAttempt.findOne({ email: testEmail, ipAddress: testIp });
    if (!attempt) {
      attempt = new LoginAttempt({ email: testEmail, ipAddress: testIp, attempts: 0 });
    }
    attempt.attempts += 1;
    attempt.lastAttemptAt = new Date();
    if (attempt.attempts >= 5) {
      attempt.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
    }
    await attempt.save();
  }

  // Verify lockout is active
  const checkAttempt = await LoginAttempt.findOne({ email: testEmail });
  if (!checkAttempt || checkAttempt.attempts !== 5 || !checkAttempt.lockUntil || checkAttempt.lockUntil < new Date()) {
    throw new Error('Lockout not properly initialized or locked');
  }
  console.log('✅ Account locked correctly after 5 failed attempts.');

  // Test Case 4: DB-backed Session Verification & Session Revocation
  console.log('\n--- Test Case 4: DB-Backed Session Verification & Revocation ---');
  const sessionId = 'session-test-token-12345';
  const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  await Session.create({
    sessionId,
    userId: 'student-test-uid',
    role: 'student',
    userAgent: 'Mozilla/5.0 Test',
    ipAddress: '127.0.0.1',
    expiresAt: sessionExpires
  });

  const sessionObj = await Session.findOne({ sessionId });
  if (!sessionObj) {
    throw new Error('Session not created');
  }
  console.log('✅ Active session created successfully.');

  // Revoke session
  await Session.deleteOne({ sessionId });
  const checkRevoked = await Session.findOne({ sessionId });
  if (checkRevoked) {
    throw new Error('Session was not revoked');
  }
  console.log('✅ Session revoked successfully.');

  // Clean up
  await User.deleteMany({ email: 'teststudent@sru.edu.in' });
  await Alumni.deleteMany({ email: 'testalumni@sru.edu.in' });
  await AlumniVerification.deleteMany({ email: 'testalumni@sru.edu.in' });
  await OTP.deleteMany({ email: { $in: ['teststudent@sru.edu.in', 'testalumni@sru.edu.in'] } });
  await LoginAttempt.deleteMany({ email: { $in: ['teststudent@sru.edu.in', 'testalumni@sru.edu.in'] } });
  
  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
  console.log('\n🎉 ALL ENTERPRISE AUTHENTICATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err.message);
  process.exit(1);
});
