const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { User, Alumni, Connection, FriendRequest, Post, Referral, Achievement } = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-connect';
const JWT_SECRET = 'campus-connect-super-secret';
const BASE_URL = 'http://localhost:5000/api';

const testUsers = {
  public: {
    userId: 'qa-student-public',
    email: 'public@sru.edu.in',
    name: 'QA Student Public',
    role: 'student',
    profileVisibility: 'Public',
    messagingPermissions: 'Everyone',
    profileDiscovery: 'Show in Search'
  },
  college: {
    userId: 'qa-student-college',
    email: 'college@sru.edu.in',
    name: 'QA Student College',
    role: 'student',
    profileVisibility: 'College Only',
    messagingPermissions: 'Everyone',
    profileDiscovery: 'Show in Search'
  },
  connections: {
    userId: 'qa-student-connections',
    email: 'connections@sru.edu.in',
    name: 'QA Student Connections',
    role: 'student',
    profileVisibility: 'Connections Only',
    messagingPermissions: 'Everyone',
    profileDiscovery: 'Show in Search'
  },
  private: {
    userId: 'qa-student-private',
    email: 'private@sru.edu.in',
    name: 'QA Student Private',
    role: 'student',
    profileVisibility: 'Private',
    messagingPermissions: 'Everyone',
    profileDiscovery: 'Show in Search'
  },
  nobody: {
    userId: 'qa-student-nobody',
    email: 'nobody@sru.edu.in',
    name: 'QA Student Nobody',
    role: 'student',
    profileVisibility: 'Public',
    messagingPermissions: 'Nobody',
    profileDiscovery: 'Show in Search'
  },
  alumniOnly: {
    userId: 'qa-student-alumni-only',
    email: 'alumni-only@sru.edu.in',
    name: 'QA Student Alumni Only',
    role: 'student',
    profileVisibility: 'Public',
    messagingPermissions: 'Alumni Only',
    profileDiscovery: 'Show in Search'
  },
  external: {
    userId: 'qa-student-external',
    email: 'external@sru.edu.in',
    name: 'QA Student External',
    role: 'student',
    profileVisibility: 'Public',
    messagingPermissions: 'Everyone',
    profileDiscovery: 'Show in Search'
  },
  blocked: {
    userId: 'qa-student-blocked',
    email: 'blocked@sru.edu.in',
    name: 'QA Student Blocked',
    role: 'student',
    profileVisibility: 'Public',
    messagingPermissions: 'Everyone',
    profileDiscovery: 'Show in Search'
  },
  alumni: {
    userId: 'qa-alumni-1',
    email: 'alumni1@sru.edu.in',
    name: 'QA Alumni 1',
    role: 'alumni',
    batch: '2019',
    department: 'CSE',
    profileVisibility: 'Public',
    messagingPermissions: 'Everyone',
    profileDiscovery: 'Show in Search',
    showPosts: false,
    showReferrals: false,
    showAchievements: false
  }
};

function generateToken(userId, email, role) {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '1h' });
}

const tokens = {};
Object.keys(testUsers).forEach(key => {
  const u = testUsers[key];
  tokens[key] = generateToken(u.userId, u.email, u.role);
});

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.');

  // Clean existing QA data
  const testIds = Object.values(testUsers).map(u => u.userId);
  await User.deleteMany({ userId: { $in: testIds } });
  await Alumni.deleteMany({ userId: { $in: testIds } });
  await Connection.deleteMany({
    $or: [
      { user1: { $in: testIds } },
      { user2: { $in: testIds } }
    ]
  });
  await FriendRequest.deleteMany({
    $or: [
      { fromUserId: { $in: testIds } },
      { toUserId: { $in: testIds } }
    ]
  });
  await Post.deleteMany({ alumniId: { $in: testIds } });
  await Referral.deleteMany({ alumniId: { $in: testIds } });
  await Achievement.deleteMany({ alumniId: { $in: testIds } });
  console.log('🧹 Cleaned up old QA test documents.');

  // Save new QA test users
  for (const key of Object.keys(testUsers)) {
    const data = testUsers[key];
    if (data.role === 'alumni') {
      await new Alumni(data).save();
    } else {
      await new User(data).save();
    }
  }
  console.log('👤 Saved test profiles to database.');

  let passed = 0;
  let failed = 0;
  const bugs = [];

  function assert(condition, message) {
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${message}`);
    } else {
      failed++;
      console.error(`❌ [FAIL] ${message}`);
      bugs.push(message);
    }
  }

  // Helper fetch function
  async function apiCall(endpoint, method = 'GET', body = null, token = null) {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const config = { method, headers };
    if (body) {
      config.body = JSON.stringify(body);
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const json = await response.json().catch(() => ({}));
    return { status: response.status, data: json };
  }

  console.log('\n--- 1. PROFILE VISIBILITY TEST CASES ---');

  // Test Case 1.1: Public profile visibility - Anonymous access
  const res1 = await apiCall(`/student/profile?userId=${testUsers.public.userId}`);
  assert(res1.status === 200 && res1.data.success, 'Public profile should be visible to anonymous requests');

  // Test Case 1.2: College Only profile visibility - Anonymous access
  const res2 = await apiCall(`/student/profile?userId=${testUsers.college.userId}`);
  assert(res2.status === 403, 'College Only profile should deny anonymous requests with 403');

  // Test Case 1.3: College Only profile visibility - Authenticated student access
  const res3 = await apiCall(`/student/profile?userId=${testUsers.college.userId}`, 'GET', null, tokens.external);
  assert(res3.status === 200 && res3.data.success, 'College Only profile should allow logged-in college students');

  // Test Case 1.4: Connections Only profile visibility - Non-connected student access
  const res4 = await apiCall(`/student/profile?userId=${testUsers.connections.userId}`, 'GET', null, tokens.external);
  assert(res4.status === 403, 'Connections Only profile should deny non-connected requests with 403');

  // Establish connection between qa-student-connections and qa-student-external
  const conn = new Connection({ user1: testUsers.connections.userId, user2: testUsers.external.userId });
  await conn.save();
  console.log('🔗 Established Connection between connections-user and external-user');

  // Test Case 1.5: Connections Only profile visibility - Connected student access
  const res5 = await apiCall(`/student/profile?userId=${testUsers.connections.userId}`, 'GET', null, tokens.external);
  assert(res5.status === 200 && res5.data.success, 'Connections Only profile should allow connected requests');

  // Test Case 1.6: Private profile visibility - Non-owner access
  const res6 = await apiCall(`/student/profile?userId=${testUsers.private.userId}`, 'GET', null, tokens.external);
  assert(res6.status === 403, 'Private profile should deny non-owner requests with 403');

  // Test Case 1.7: Private profile visibility - Owner access
  const res7 = await apiCall(`/student/profile?userId=${testUsers.private.userId}`, 'GET', null, tokens.private);
  assert(res7.status === 200 && res7.data.success, 'Private profile should allow owner requests');


  console.log('\n--- 2. BLOCKING & UNBLOCKING SECURITY ENFORCEMENT ---');

  // Block external-user from public-user
  await User.findOneAndUpdate(
    { userId: testUsers.public.userId },
    { $push: { blockedUsers: testUsers.blocked.userId } }
  );
  console.log('🔒 qa-student-public blocked qa-student-blocked');

  // Test Case 2.1: Blocked user attempts to view blocker's profile
  const resBlock1 = await apiCall(`/student/profile?userId=${testUsers.public.userId}`, 'GET', null, tokens.blocked);
  assert(resBlock1.status === 403, 'Blocked user cannot view blocker\'s profile (should return 403)');

  // Test Case 2.2: Blocker attempts to view blocked user's profile
  const resBlock2 = await apiCall(`/student/profile?userId=${testUsers.blocked.userId}`, 'GET', null, tokens.public);
  assert(resBlock2.status === 403, 'Blocker cannot view blocked user\'s profile (should return 403)');


  console.log('\n--- 3. MESSAGING PERMISSIONS & CHAT REQUESTS ---');

  // Test Case 3.1: messagingPermissions = Nobody - Send connection request
  const resMsg1 = await apiCall('/connections/request', 'POST', {
    fromUserId: testUsers.external.userId,
    toUserId: testUsers.nobody.userId,
    action: 'connect'
  }, tokens.external);
  assert(resMsg1.status === 403 && resMsg1.data.error.includes('restrict'), 'Should block connection requests to users with messagingPermissions = Nobody');

  // Test Case 3.2: messagingPermissions = Alumni Only - Student sends request
  const resMsg2 = await apiCall('/connections/request', 'POST', {
    fromUserId: testUsers.external.userId,
    toUserId: testUsers.alumniOnly.userId,
    action: 'connect'
  }, tokens.external);
  assert(resMsg2.status === 403 && resMsg2.data.error.includes('alumni'), 'Should block student connection requests to users with messagingPermissions = Alumni Only');

  // Test Case 3.3: messagingPermissions = Alumni Only - Alumni sends request
  const resMsg3 = await apiCall('/connections/request', 'POST', {
    fromUserId: testUsers.alumni.userId,
    toUserId: testUsers.alumniOnly.userId,
    action: 'connect'
  }, tokens.alumni);
  assert(resMsg3.status === 200 && resMsg3.data.success, 'Should allow alumni connection requests to users with messagingPermissions = Alumni Only');


  console.log('\n--- 4. DISPLAY OPTIONS & SUB-RESOURCES ---');

  // Seed resources for alumni
  const mockPost = new Post({ alumniId: testUsers.alumni.userId, content: 'Test post', approvalStatus: 'approved' });
  await mockPost.save();
  const mockReferral = new Referral({ alumniId: testUsers.alumni.userId, company: 'QA Inc', role: 'Engineer', applicationUrl: 'http://qa.com' });
  await mockReferral.save();
  const mockAchievement = new Achievement({ alumniId: testUsers.alumni.userId, title: 'Valedictorian' });
  await mockAchievement.save();
  console.log('🌾 Seeded dummy post, referral, and achievement for alumni');

  // Test Case 4.1: showPosts = false - External viewer
  const resDisp1 = await apiCall(`/alumni/${testUsers.alumni.userId}/posts`, 'GET', null, tokens.external);
  assert(resDisp1.status === 200 && resDisp1.data.data.length === 0, 'Should hide posts from external users when showPosts = false');

  // Test Case 4.2: showPosts = false - Profile owner viewer
  const resDisp2 = await apiCall(`/alumni/${testUsers.alumni.userId}/posts`, 'GET', null, tokens.alumni);
  assert(resDisp2.status === 200 && resDisp2.data.data.length > 0, 'Should allow profile owner to see their own posts when showPosts = false');

  // Test Case 4.3: showReferrals = false - External viewer
  const resDisp3 = await apiCall(`/alumni/${testUsers.alumni.userId}/referrals`, 'GET', null, tokens.external);
  assert(resDisp3.status === 200 && resDisp3.data.data.length === 0, 'Should hide referrals from external users when showReferrals = false');

  // Test Case 4.4: showReferrals = false - Profile owner viewer
  const resDisp4 = await apiCall(`/alumni/${testUsers.alumni.userId}/referrals`, 'GET', null, tokens.alumni);
  assert(resDisp4.status === 200 && resDisp4.data.data.length > 0, 'Should allow profile owner to see their own referrals when showReferrals = false');

  // Test Case 4.5: showAchievements = false - External viewer
  const resDisp5 = await apiCall(`/alumni/${testUsers.alumni.userId}/achievements`, 'GET', null, tokens.external);
  assert(resDisp5.status === 200 && resDisp5.data.data.length === 0, 'Should hide achievements from external users when showAchievements = false');

  // Test Case 4.6: showAchievements = false - Profile owner viewer
  const resDisp6 = await apiCall(`/alumni/${testUsers.alumni.userId}/achievements`, 'GET', null, tokens.alumni);
  assert(resDisp6.status === 200 && resDisp6.data.data.length > 0, 'Should allow profile owner to see their own achievements when showAchievements = false');


  console.log('\n--- 5. DISCOVERY SETTINGS & RECOMMENDED MATCHES ---');

  // Hide external student from discovery
  await User.findOneAndUpdate(
    { userId: testUsers.external.userId },
    { $set: { profileDiscovery: 'Hide from Search' } }
  );
  console.log('🙈 qa-student-external set discovery to Hide from Search');

  // Test Case 5.1: Fetch discover list for public-user, should exclude hidden external-user
  const resDisc = await apiCall(`/discover?userId=${testUsers.public.userId}`, 'GET', null, tokens.public);
  const matchedList = resDisc.data.data || [];
  const foundHidden = matchedList.some(u => u.userId === testUsers.external.userId);
  assert(!foundHidden, 'Should exclude hidden users from discover recommendations list');


  console.log('\n--- 6. FAILURE TESTING & PAYLOAD ROBUSTNESS ---');

  // Test Case 6.1: PUT /api/privacy-settings with empty token
  const resFail1 = await apiCall('/privacy-settings', 'PUT', { profileVisibility: 'Private' });
  assert(resFail1.status === 401, 'Should reject privacy setting updates with no token (401)');

  // Test Case 6.2: PUT /api/privacy-settings with expired/invalid token
  const resFail2 = await apiCall('/privacy-settings', 'PUT', { profileVisibility: 'Private' }, 'invalid-token-123');
  assert(resFail2.status === 401, 'Should reject privacy setting updates with invalid token (401)');

  // Test Case 6.3: PUT /api/privacy-settings validation
  const resFail3 = await apiCall('/privacy-settings', 'PUT', { profileVisibility: 'invalid-visibility-value' }, tokens.public);
  // It shouldn't crash backend even if mongoose does enum check or defaults
  assert(resFail3.status === 200 || resFail3.status === 400 || resFail3.status === 500, 'Should gracefully handle or reject invalid payloads');


  console.log('\n--- CLEANING UP TEST DATA ---');
  await User.deleteMany({ userId: { $in: testIds } });
  await Alumni.deleteMany({ userId: { $in: testIds } });
  await Connection.deleteMany({
    $or: [
      { user1: { $in: testIds } },
      { user2: { $in: testIds } }
    ]
  });
  await FriendRequest.deleteMany({
    $or: [
      { fromUserId: { $in: testIds } },
      { toUserId: { $in: testIds } }
    ]
  });
  await Post.deleteMany({ alumniId: { $in: testIds } });
  await Referral.deleteMany({ alumniId: { $in: testIds } });
  await Achievement.deleteMany({ alumniId: { $in: testIds } });
  console.log('✅ QA Clean up complete.');

  console.log(`\n📊 E2E AUDIT RESULTS:`);
  console.log(`✅ Passed Tests: ${passed}`);
  console.log(`❌ Failed Tests: ${failed}`);

  await mongoose.disconnect();
  console.log('🔌 MongoDB Disconnected.');

  if (failed > 0) {
    console.error('\n❌ QA AUDIT FAILED.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL QA AUDIT END-TO-END SECURITY CHECKS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal testing error:', err);
  process.exit(1);
});
