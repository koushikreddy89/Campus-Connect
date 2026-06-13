const mongoose = require('mongoose');
const { StudentPost, Post, Alumni, User } = require('./models');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-connect';
const BASE_URL = 'http://127.0.0.1:5000/api';

async function runTests() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully.');

  // Identifiers for test records
  const testStudentId = 'test-seg-student-123';
  const testAlumniId = 'test-seg-alumni-123';

  // Cleanup old test records
  await User.deleteMany({ userId: testStudentId });
  await StudentPost.deleteMany({ userId: testStudentId });
  await Alumni.deleteMany({ userId: testAlumniId });
  await Post.deleteMany({ alumniId: testAlumniId });
  console.log('🧹 Cleaned up old test database records.');

  // Create a mock student profile
  const student = new User({
    userId: testStudentId,
    email: 'student@sru.edu.in',
    name: 'Samuel Student',
    role: 'student'
  });
  await student.save();
  console.log('👤 Created test student user.');

  // Create a mock alumni profile
  const alumni = new Alumni({
    userId: testAlumniId,
    email: 'alumni@sru.edu.in',
    name: 'Alice Alumni',
    batch: '2020',
    department: 'CSE',
    company: 'Netflix',
    role: 'Staff Engineer',
    approvalStatus: 'approved'
  });
  await alumni.save();
  console.log('🎓 Created test alumni user.');

  // 1. Create a student post (via API to test default type behavior)
  console.log('\n--- 1. Testing Student Post Creation ---');
  let studentPostId = '';
  try {
    const res = await fetch(`${BASE_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testStudentId,
        content: 'Hey guys! Look at my new project built with React and Tailwind!',
        category: 'projects',
        isAnonymous: false
      })
    });

    const result = await res.json();
    console.log(`Status code: ${res.status}`);
    console.log(`Response success: ${result.success}`);

    if (res.status !== 201 || !result.success) {
      throw new Error(`Expected HTTP 201 for post creation, got ${res.status}`);
    }
    studentPostId = result.data._id;
    console.log(`Created Student Post ID: ${studentPostId}`);

    // Verify type in database
    const dbPost = await StudentPost.findById(studentPostId);
    console.log(`Database post type field: "${dbPost.type}"`);
    if (dbPost.type !== 'student_post') {
      throw new Error(`Expected post type to be 'student_post', got '${dbPost.type}'`);
    }
    console.log('✅ Student post creation type validation passed.');
  } catch (err) {
    console.error('❌ Student post creation test failed:', err.message);
    process.exit(1);
  }

  // 2. Create an alumni referral (via API to create synchronized Post in alumni_posts)
  console.log('\n--- 2. Creating Alumni Referral ---');
  let referralPostId = '';
  try {
    const res = await fetch(`${BASE_URL}/alumni/referrals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alumniId: testAlumniId,
        companyName: 'Netflix',
        jobTitle: 'Software Engineer',
        eligibility: 'Graduates',
        deadline: '2026-09-30',
        applicationUrl: 'https://netflix.com/careers/999',
        description: 'Mock Referral'
      })
    });

    const result = await res.json();
    console.log(`Status code: ${res.status}`);
    console.log(`Response success: ${result.success}`);

    if (res.status !== 201 || !result.success) {
      throw new Error(`Expected HTTP 201 for referral creation, got ${res.status}`);
    }

    // Retrieve synchronized post in alumni_posts
    const dbPost = await Post.findOne({ alumniId: testAlumniId, type: 'referral' });
    if (!dbPost) {
      throw new Error('No synchronized post document found in alumni_posts.');
    }
    referralPostId = dbPost._id.toString();
    console.log(`Created Synchronized Alumni Post ID: ${referralPostId}`);
    console.log(`Alumni post type field: "${dbPost.type}"`);
    console.log('✅ Alumni post creation validation passed.');
  } catch (err) {
    console.error('❌ Alumni post creation test failed:', err.message);
    process.exit(1);
  }

  // 3. Test Student Feed GET /api/feed
  console.log('\n--- 3. Verifying Student Social Feed Segregation ---');
  try {
    const res = await fetch(`${BASE_URL}/feed?userId=${testStudentId}`);
    const result = await res.json();
    console.log(`Status code: ${res.status}`);
    console.log(`Feed posts count: ${result.data.length}`);

    // Verify student post is present
    const hasStudentPost = result.data.some(p => p.id === studentPostId || p._id === studentPostId);
    console.log(`Student post present in student feed: ${hasStudentPost}`);
    if (!hasStudentPost) {
      throw new Error('Student post was not returned in the Student Feed!');
    }

    // Verify alumni post is NOT present
    const hasAlumniPost = result.data.some(p => p.id === referralPostId || p._id === referralPostId);
    console.log(`Alumni referral post present in student feed: ${hasAlumniPost}`);
    if (hasAlumniPost) {
      throw new Error('CRITICAL BUG: Alumni referral post was leaked into the Student Feed!');
    }

    console.log('✅ Student Social Feed segregation validation passed.');
  } catch (err) {
    console.error('❌ Student Social Feed segregation test failed:', err.message);
    process.exit(1);
  }

  // 4. Test Alumni Feed GET /api/alumni/feed
  console.log('\n--- 4. Verifying Alumni Feed Retrieve ---');
  try {
    const res = await fetch(`${BASE_URL}/alumni/feed?type=referral`);
    const result = await res.json();
    console.log(`Status code: ${res.status}`);
    console.log(`Alumni feed posts count: ${result.data.length}`);

    // Verify alumni post is present in alumni feed
    const hasAlumniPost = result.data.some(p => p.id === referralPostId || p._id === referralPostId);
    console.log(`Alumni referral post present in alumni feed: ${hasAlumniPost}`);
    if (!hasAlumniPost) {
      throw new Error('Alumni post was not returned in the Alumni Feed!');
    }

    // Verify student post is NOT present in alumni feed
    const hasStudentPost = result.data.some(p => p.id === studentPostId || p._id === studentPostId);
    console.log(`Student post present in alumni feed: ${hasStudentPost}`);
    if (hasStudentPost) {
      throw new Error('Student post was leaked into the Alumni Feed!');
    }

    console.log('✅ Alumni Feed verification passed.');
  } catch (err) {
    console.error('❌ Alumni Feed verification failed:', err.message);
    process.exit(1);
  }

  // Cleanup
  await User.deleteMany({ userId: testStudentId });
  await StudentPost.deleteMany({ userId: testStudentId });
  await Alumni.deleteMany({ userId: testAlumniId });
  await Post.deleteMany({ alumniId: testAlumniId });
  await mongoose.disconnect();
  console.log('\n🧹 Database cleaned and disconnected.');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test execution crashed:', err);
  process.exit(1);
});
