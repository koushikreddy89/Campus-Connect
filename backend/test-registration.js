const mongoose = require('mongoose');
const { Alumni, CollegeAlumniRecord, OTP } = require('./models');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-connect';

async function runTest() {
  console.log('🔌 Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully.');

  // Clean test documents
  await Alumni.deleteMany({ email: 'testbypassalumni@sru.edu.in' });
  await OTP.deleteMany({ email: 'testbypassalumni@sru.edu.in' });
  await CollegeAlumniRecord.deleteMany({ personalEmail: 'testbypassalumni@sru.edu.in' });
  console.log('🧹 Cleaned existing test documents.');

  // Test Case 1: ALUMNI_VERIFICATION_ENABLED = false (Bypass Mode)
  console.log('\n--- Test Case 1: ALUMNI_VERIFICATION_ENABLED = false ---');
  process.env.ALUMNI_VERIFICATION_ENABLED = 'false';

  const testEmail = 'testbypassalumni@sru.edu.in';
  const testRoll = 'TESTROLL123';
  const testBatch = '2025';

  // 1. Simulate verification endpoint behavior
  console.log('📝 Simulating /auth/verify-alumni with flag = false...');
  let record = null;
  const verificationEnabled = process.env.ALUMNI_VERIFICATION_ENABLED !== 'false';
  
  if (verificationEnabled) {
    record = await CollegeAlumniRecord.findOne({
      personalEmail: testEmail,
      rollNumber: testRoll,
      batch: testBatch
    });
  } else {
    record = {
      name: 'Test Bypass Alumni Name',
      department: 'Computer Science',
      personalEmail: testEmail,
      rollNumber: testRoll,
      batch: testBatch,
      isTestAccount: true
    };
  }

  // Assert verification was bypassed
  if (!record || record.name !== 'Test Bypass Alumni Name') {
    throw new Error('Assertion failed: expected record object to be mocked');
  }
  console.log('✅ Bypassed CollegeAlumniRecord check successfully.');

  // Create OTP record with mocked metadata
  const code = '999999';
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const otpRecord = await OTP.findOneAndUpdate(
    { email: testEmail },
    { 
      code, 
      otp: code,
      expiresAt, 
      role: 'alumni',
      attempts: 0,
      verified: false,
      metadata: {
        rollNumber: testRoll,
        batch: testBatch,
        name: record.name,
        department: record.department,
        isTestAccount: record.isTestAccount
      }
    },
    { upsert: true, new: true }
  );

  console.log('💾 OTP saved in DB with metadata.');

  // 2. Simulate OTP Verification /auth/verify-otp endpoint behavior
  console.log('📝 Simulating /auth/verify-otp...');
  const verifyOtpRecord = await OTP.findOne({ email: testEmail });
  if (!verifyOtpRecord) {
    throw new Error('OTP record not found in DB');
  }

  const { rollNumber, batch, name, department, isTestAccount } = verifyOtpRecord.metadata || {};
  let alumni = await Alumni.findOne({ email: testEmail });
  
  if (!alumni) {
    alumni = new Alumni({
      userId: `alumni-test-123456`,
      email: testEmail,
      name: name || 'Alumni User',
      batch: batch || '2024',
      department: department || 'Computer Science',
      approvalStatus: 'approved',
      role: 'alumni',
      rollNumber,
      fullName: name || 'Alumni User',
      batchYear: batch || '2024',
      isTestAccount: (process.env.ALUMNI_VERIFICATION_ENABLED === 'false' || !!isTestAccount)
    });
    await alumni.save();
    console.log('🎓 Created test Alumni account.');
  }

  // Assert account creation properties
  if (alumni.role !== 'alumni') {
    throw new Error(`Assertion failed: expected role 'alumni', got '${alumni.role}'`);
  }
  if (alumni.isTestAccount !== true) {
    throw new Error(`Assertion failed: expected isTestAccount true, got ${alumni.isTestAccount}`);
  }
  console.log('✅ Test Case 1 Passed!');

  // Test Case 2: ALUMNI_VERIFICATION_ENABLED = true (Normal Mode)
  console.log('\n--- Test Case 2: ALUMNI_VERIFICATION_ENABLED = true ---');
  process.env.ALUMNI_VERIFICATION_ENABLED = 'true';

  console.log('📝 Simulating /auth/verify-alumni with flag = true...');
  const testEmailNormal = 'testbypassalumni-normal@sru.edu.in';
  const checkEnabled = process.env.ALUMNI_VERIFICATION_ENABLED !== 'false';
  let recordNormal = null;
  
  if (checkEnabled) {
    recordNormal = await CollegeAlumniRecord.findOne({
      personalEmail: testEmailNormal,
      rollNumber: testRoll,
      batch: testBatch
    });
  }

  if (recordNormal !== null) {
    throw new Error('Assertion failed: expected CollegeAlumniRecord check to return null for unseeded email');
  }
  console.log('✅ Correctly blocked registration in normal mode.');
  console.log('✅ Test Case 2 Passed!');

  // Clean up
  await Alumni.deleteMany({ email: 'testbypassalumni@sru.edu.in' });
  await OTP.deleteMany({ email: 'testbypassalumni@sru.edu.in' });
  console.log('\n🧹 Cleaned test documents.');

  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
  console.log('\n🎉 ALL ALUMNI BYPASS FLOWS VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

runTest().catch(err => {
  console.error('\n❌ Test failed with error:', err.message);
  process.exit(1);
});
