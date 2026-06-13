const mongoose = require('mongoose');
const { Alumni, Post } = require('./models');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-connect';

async function runTest() {
  console.log('🔌 Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully.');

  // Clean test documents
  await Alumni.deleteMany({ userId: /test-mod-alumni/ });
  await Post.deleteMany({ content: /Test Auto-Approval/ });
  console.log('🧹 Cleaned existing test documents.');

  // Create a dummy alumni profile
  const alumni = new Alumni({
    userId: 'test-mod-alumni-123',
    email: 'testmod@sru.edu.in',
    name: 'Test Moderator Alumni',
    batch: '2022',
    department: 'CSE',
    approvalStatus: 'approved'
  });
  await alumni.save();
  console.log('🎓 Created test alumni profile.');

  // Test Case 1: MODERATION_ENABLED=false (Auto-Approval Mode)
  console.log('\n--- Test Case 1: MODERATION_ENABLED = false ---');
  process.env.MODERATION_ENABLED = 'false';
  
  const postAutoApprove = new Post({
    alumniId: alumni.userId,
    content: 'Test Auto-Approval Post with flag set to false',
    type: 'general'
  });
  
  await postAutoApprove.save();
  console.log('📝 Saved post in Auto-Approval Mode.');
  console.log('🔍 Post fields after save:');
  console.log(`   - status: ${postAutoApprove.status}`);
  console.log(`   - approvalStatus: ${postAutoApprove.approvalStatus}`);
  console.log(`   - isPublished: ${postAutoApprove.isPublished}`);

  // Assertions
  if (postAutoApprove.status !== 'approved') {
    throw new Error(`Assertion failed: expected status 'approved', got '${postAutoApprove.status}'`);
  }
  if (postAutoApprove.approvalStatus !== 'approved') {
    throw new Error(`Assertion failed: expected approvalStatus 'approved', got '${postAutoApprove.approvalStatus}'`);
  }
  if (postAutoApprove.isPublished !== true) {
    throw new Error(`Assertion failed: expected isPublished true, got ${postAutoApprove.isPublished}`);
  }
  console.log('✅ Test Case 1 Passed!');

  // Test Case 2: MODERATION_ENABLED=true (Normal Mode)
  console.log('\n--- Test Case 2: MODERATION_ENABLED = true ---');
  process.env.MODERATION_ENABLED = 'true';
  
  const postNormal = new Post({
    alumniId: alumni.userId,
    content: 'Test Auto-Approval Post with flag set to true',
    type: 'general'
  });
  
  await postNormal.save();
  console.log('📝 Saved post in Normal Moderation Mode.');
  console.log('🔍 Post fields after save:');
  console.log(`   - status: ${postNormal.status}`);
  console.log(`   - approvalStatus: ${postNormal.approvalStatus}`);
  console.log(`   - isPublished: ${postNormal.isPublished}`);

  // Assertions
  if (postNormal.status !== 'pending') {
    throw new Error(`Assertion failed: expected status 'pending', got '${postNormal.status}'`);
  }
  if (postNormal.approvalStatus !== 'pending') {
    throw new Error(`Assertion failed: expected approvalStatus 'pending', got '${postNormal.approvalStatus}'`);
  }
  if (postNormal.isPublished !== false) {
    throw new Error(`Assertion failed: expected isPublished false, got ${postNormal.isPublished}`);
  }
  console.log('✅ Test Case 2 Passed!');

  // Clean up
  await Alumni.deleteMany({ userId: /test-mod-alumni/ });
  await Post.deleteMany({ content: /Test Auto-Approval/ });
  console.log('\n🧹 Cleaned test documents.');

  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
  console.log('\n🎉 ALL MODERATION FLOWS VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

runTest().catch(err => {
  console.error('\n❌ Test failed with error:', err.message);
  process.exit(1);
});
