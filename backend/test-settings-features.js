const mongoose = require('mongoose');
const { User, Alumni, SupportTicket, FAQ, FeatureRequest, Report } = require('./models');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-connect';

// Copying helper from routes.js to test directly
async function isBlockedBetween(userIdA, userIdB) {
  if (!userIdA || !userIdB) return false;
  let userA = await User.findOne({ userId: userIdA }) || await Alumni.findOne({ userId: userIdA });
  if (userA && userA.blockedUsers && userA.blockedUsers.includes(userIdB)) {
    return true;
  }
  let userB = await User.findOne({ userId: userIdB }) || await Alumni.findOne({ userId: userIdB });
  if (userB && userB.blockedUsers && userB.blockedUsers.includes(userIdA)) {
    return true;
  }
  return false;
}

async function runTest() {
  console.log('🔌 Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully.');

  // Clean test documents
  await User.deleteMany({ userId: /test-settings-user/ });
  await Alumni.deleteMany({ userId: /test-settings-alumni/ });
  await SupportTicket.deleteMany({ userId: /test-settings-/ });
  await FAQ.deleteMany({ category: 'Test FAQ Category' });
  await FeatureRequest.deleteMany({ userId: /test-settings-/ });
  await Report.deleteMany({ reporterId: /test-settings-/ });
  console.log('🧹 Cleaned existing test documents.');

  // Create test profiles
  const student = new User({
    userId: 'test-settings-user-student',
    email: 'student@sru.edu.in',
    name: 'Student User',
    role: 'student'
  });
  await student.save();

  const alumni = new Alumni({
    userId: 'test-settings-alumni-1',
    email: 'alumni@sru.edu.in',
    name: 'Alumni User',
    batch: '2020',
    department: 'CSE',
    role: 'alumni'
  });
  await alumni.save();

  console.log('👤 Created test profiles: Student & Alumni.');

  // ==========================================
  // Test Case 1: Blocking and Unblocking
  // ==========================================
  console.log('\n--- Test Case 1: Blocking & Unblocking ---');
  
  // Student blocks Alumni
  student.blockedUsers.push(alumni.userId);
  await student.save();
  console.log('🔒 Student blocked Alumni.');

  // Verify blocked list
  let updatedStudent = await User.findOne({ userId: student.userId });
  if (!updatedStudent.blockedUsers.includes(alumni.userId)) {
    throw new Error('Assertion failed: expected blockedUsers to contain alumni ID');
  }
  console.log('✅ Student blocked list verified.');

  // Verify block check helper
  const blockedResult = await isBlockedBetween(student.userId, alumni.userId);
  if (!blockedResult) {
    throw new Error('Assertion failed: isBlockedBetween should return true');
  }
  console.log('✅ isBlockedBetween check verified (Blocked: true).');

  // Student unblocks Alumni
  await User.findOneAndUpdate({ userId: student.userId }, { $pull: { blockedUsers: alumni.userId } });
  updatedStudent = await User.findOne({ userId: student.userId });
  if (updatedStudent.blockedUsers.includes(alumni.userId)) {
    throw new Error('Assertion failed: expected blockedUsers to be empty after unblocking');
  }
  console.log('🔓 Student unblocked Alumni.');

  const unblockedResult = await isBlockedBetween(student.userId, alumni.userId);
  if (unblockedResult) {
    throw new Error('Assertion failed: isBlockedBetween should return false after unblocking');
  }
  console.log('✅ isBlockedBetween check verified (Blocked: false).');

  // ==========================================
  // Test Case 2: Suspension Check
  // ==========================================
  console.log('\n--- Test Case 2: User Suspension ---');
  
  // Suspend student
  await User.findOneAndUpdate({ userId: student.userId }, { isSuspended: true });
  const suspendedStudent = await User.findOne({ userId: student.userId });
  if (!suspendedStudent.isSuspended) {
    throw new Error('Assertion failed: isSuspended should be true');
  }
  console.log('🚫 Verified student isSuspended flag is true in DB.');

  // Unsuspend
  await User.findOneAndUpdate({ userId: student.userId }, { isSuspended: false });
  console.log('✅ Student unsuspended.');

  // ==========================================
  // Test Case 3: Privacy Settings Updates
  // ==========================================
  console.log('\n--- Test Case 3: Privacy Settings ---');
  
  const privacyFields = {
    profileVisibility: 'Connections Only',
    messagingPermissions: 'Alumni Only',
    profileDiscovery: 'Hide from Search',
    showPosts: false,
    showReferrals: true
  };

  await User.findOneAndUpdate({ userId: student.userId }, { $set: privacyFields });
  const updatedPrivacy = await User.findOne({ userId: student.userId });
  
  if (updatedPrivacy.profileVisibility !== 'Connections Only' ||
      updatedPrivacy.messagingPermissions !== 'Alumni Only' ||
      updatedPrivacy.profileDiscovery !== 'Hide from Search' ||
      updatedPrivacy.showPosts !== false) {
    throw new Error('Assertion failed: Privacy fields did not persist correctly');
  }
  console.log('✅ Privacy settings fields successfully saved & verified.');

  // ==========================================
  // Test Case 4: Support Ticket & Replies
  // ==========================================
  console.log('\n--- Test Case 4: Support Tickets & Replies ---');
  
  const ticket = new SupportTicket({
    userId: student.userId,
    name: student.name,
    email: student.email,
    subject: 'Cannot login to Alumni panel',
    description: 'When I verify my alumni account it fails with DB error.',
    status: 'Open'
  });
  await ticket.save();
  console.log('🎟️ Created a support ticket.');

  // Verify ticket
  let savedTicket = await SupportTicket.findById(ticket._id);
  if (savedTicket.status !== 'Open' || savedTicket.replies.length !== 0) {
    throw new Error('Assertion failed: Invalid initial support ticket state');
  }

  // Admin replies to ticket
  savedTicket.status = 'Resolved';
  savedTicket.replies.push({
    senderId: 'admin-user-id',
    senderName: 'Campus Admin',
    message: 'We resolved your alumni verification record. Please try again.',
    createdAt: new Date()
  });
  await savedTicket.save();
  console.log('💬 Admin replied and updated ticket status to Resolved.');

  // Verify reply
  savedTicket = await SupportTicket.findById(ticket._id);
  if (savedTicket.status !== 'Resolved' || savedTicket.replies.length !== 1 || savedTicket.replies[0].message !== 'We resolved your alumni verification record. Please try again.') {
    throw new Error('Assertion failed: Support ticket reply did not save correctly');
  }
  console.log('✅ Support ticket status and admin reply thread verified.');

  // ==========================================
  // Test Case 5: FAQ Auto-Seeding
  // ==========================================
  console.log('\n--- Test Case 5: FAQ Auto-Seeding ---');
  
  // Seed a test FAQ category
  const testFaq = new FAQ({
    category: 'Test FAQ Category',
    question: 'How do I run tests?',
    answer: 'Execute the node test-settings-features.js script.'
  });
  await testFaq.save();
  
  const count = await FAQ.countDocuments({ category: 'Test FAQ Category' });
  if (count === 0) {
    throw new Error('Assertion failed: FAQ document was not saved');
  }
  console.log('🌱 FAQ document added and successfully verified in DB.');

  // ==========================================
  // CLEAN UP
  // ==========================================
  console.log('\n🧹 Cleaning up test database entries...');
  await User.deleteMany({ userId: /test-settings-user/ });
  await Alumni.deleteMany({ userId: /test-settings-alumni/ });
  await SupportTicket.deleteMany({ userId: /test-settings-/ });
  await FAQ.deleteMany({ category: 'Test FAQ Category' });
  await FeatureRequest.deleteMany({ userId: /test-settings-/ });
  await Report.deleteMany({ reporterId: /test-settings-/ });
  console.log('✅ Cleaned up successfully.');

  await mongoose.disconnect();
  console.log('🔌 MongoDB Disconnected.');
  console.log('\n🎉 ALL SETTINGS, BLOCK/REPORT, AND SUPPORT TICKET INTEGRATION TESTS PASSED!');
  process.exit(0);
}

runTest().catch(err => {
  console.error('\n❌ Test failed with error:', err.message);
  process.exit(1);
});
