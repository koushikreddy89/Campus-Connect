const mongoose = require('mongoose');
const { Alumni, Post, Referral } = require('./models');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-connect';
const BASE_URL = 'http://127.0.0.1:5000/api';

async function runTests() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully.');

  // Cleanup existing test records
  const testAlumniId = 'test-ref-alumni-id-999';
  const testStudentId = 'test-student-id-999';
  await Alumni.deleteMany({ userId: testAlumniId });
  await Post.deleteMany({ alumniId: testAlumniId });
  await Referral.deleteMany({ alumniId: testAlumniId });
  console.log('🧹 Cleaned up old test database records.');

  // Create a test alumni profile
  const alumni = new Alumni({
    userId: testAlumniId,
    email: 'referralalumni@sru.edu.in',
    name: 'Jane Doe Referral Alumni',
    batch: '2021',
    department: 'CSE',
    company: 'Google',
    role: 'Senior Engineer',
    approvalStatus: 'approved'
  });
  await alumni.save();
  console.log('🎓 Created test alumni profile.');

  // 1. Test invalid URL creation
  console.log('\n--- 1. Testing invalid URL validation ---');
  try {
    const res = await fetch(`${BASE_URL}/alumni/referrals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alumniId: testAlumniId,
        companyName: 'Google',
        jobTitle: 'Software Intern',
        eligibility: 'B.Tech CSE/IT',
        deadline: '2026-12-31',
        applicationUrl: 'not_a_valid_url'
      })
    });
    
    const result = await res.json();
    console.log(`Status code: ${res.status}`);
    console.log(`Response error: ${result.error}`);

    if (res.status !== 400 || result.success !== false) {
      throw new Error(`Expected HTTP 400 with success: false for invalid URL, got ${res.status}`);
    }
    console.log('✅ Invalid URL test passed.');
  } catch (err) {
    console.error('❌ Invalid URL test failed:', err.message);
    process.exit(1);
  }

  // 2. Test valid URL creation
  console.log('\n--- 2. Testing valid URL creation ---');
  let referralId = '';
  try {
    const res = await fetch(`${BASE_URL}/alumni/referrals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alumniId: testAlumniId,
        companyName: 'Google',
        jobTitle: 'Software Intern',
        eligibility: 'B.Tech CSE/IT',
        deadline: '2026-12-31',
        applicationUrl: 'https://careers.google.com/jobs/123456',
        description: 'Prepare data structures and algorithms.'
      })
    });

    const result = await res.json();
    console.log(`Status code: ${res.status}`);
    console.log(`Response success: ${result.success}`);
    
    if (res.status !== 201 || !result.success) {
      throw new Error(`Expected HTTP 201 for valid creation, got ${res.status}`);
    }
    referralId = result.data._id;
    console.log(`Created Referral ID: ${referralId}`);
    console.log('✅ Valid URL creation test passed.');
  } catch (err) {
    console.error('❌ Valid URL creation test failed:', err.message);
    process.exit(1);
  }

  // 3. Verify synchronized Post document
  console.log('\n--- 3. Verifying synchronized Post document ---');
  try {
    const post = await Post.findOne({ refId: referralId });
    if (!post) {
      throw new Error('No synchronized post document found in DB.');
    }
    console.log('Found post document:');
    console.log(`  - Type: ${post.type}`);
    console.log(`  - Company: ${post.company}`);
    console.log(`  - Job Role: ${post.jobRole}`);
    console.log(`  - Apply Link: ${post.applyLink}`);

    if (post.type !== 'referral' || post.company !== 'Google' || post.jobRole !== 'Software Intern') {
      throw new Error('Synchronized post details do not match!');
    }
    console.log('✅ Synchronized Post verification test passed.');
  } catch (err) {
    console.error('❌ Synchronized Post verification failed:', err.message);
    process.exit(1);
  }

  // 4. Test GET endpoints
  console.log('\n--- 4. Testing GET endpoints ---');
  try {
    const res1 = await fetch(`${BASE_URL}/referrals`);
    const r1 = await res1.json();
    console.log(`GET /api/referrals: success = ${r1.success}, count = ${r1.data.length}`);

    const res2 = await fetch(`${BASE_URL}/alumni/referrals?alumniId=${testAlumniId}`);
    const r2 = await res2.json();
    console.log(`GET /api/alumni/referrals: success = ${r2.success}, count = ${r2.data.length}`);

    const res3 = await fetch(`${BASE_URL}/student/referrals`);
    const r3 = await res3.json();
    console.log(`GET /api/student/referrals: success = ${r3.success}, count = ${r3.data.length}`);

    if (!r1.success || !r2.success || !r3.success) {
      throw new Error('One of the GET endpoints returned success = false');
    }
    console.log('✅ GET endpoints test passed.');
  } catch (err) {
    console.error('❌ GET endpoints test failed:', err.message);
    process.exit(1);
  }

  // 5. Test interaction endpoints
  console.log('\n--- 5. Testing Interaction Endpoints ---');
  try {
    // Like toggle
    console.log('Liking referral...');
    const likeRes = await fetch(`${BASE_URL}/referrals/${referralId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testStudentId })
    });
    const likeData = await likeRes.json();
    console.log(`Likes after like:`, likeData.data.likes);
    if (!likeData.data.likes.includes(testStudentId)) {
      throw new Error('Student ID not in likes array after like!');
    }

    // Sync validation for like
    const likedPost = await Post.findOne({ refId: referralId });
    if (!likedPost.likes.includes(testStudentId)) {
      throw new Error('Liked state not synced to feed Post!');
    }
    console.log('Like state synced successfully to feed Post.');

    // Save toggle
    console.log('Saving referral...');
    const saveRes = await fetch(`${BASE_URL}/referrals/${referralId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testStudentId })
    });
    const saveData = await saveRes.json();
    console.log(`Saves after save:`, saveData.data.saves);
    if (!saveData.data.saves.includes(testStudentId)) {
      throw new Error('Student ID not in saves array after save!');
    }

    // Query student saved referrals filter
    const savedFilterRes = await fetch(`${BASE_URL}/student/referrals?saved=true&userId=${testStudentId}`);
    const savedFilterData = await savedFilterRes.json();
    console.log(`Saves filter count:`, savedFilterData.data.length);
    if (savedFilterData.data.length === 0) {
      throw new Error('Saves filter did not return saved referrals!');
    }

    // Comment Addition
    console.log('Adding comment...');
    const commentRes = await fetch(`${BASE_URL}/referrals/${referralId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testStudentId,
        userName: 'Test Student',
        userAvatar: 'https://avatar.png',
        content: 'Awesome referral, thank you!'
      })
    });
    const commentData = await commentRes.json();
    const createdComment = commentData.data.comments[0];
    console.log(`Created Comment ID:`, createdComment._id);

    // Sync validation for comment
    const commentedPost = await Post.findOne({ refId: referralId });
    if (commentedPost.comments.length === 0 || commentedPost.comments[0].content !== 'Awesome referral, thank you!') {
      throw new Error('Comment not synced to feed Post!');
    }
    console.log('Comment synced successfully to feed Post.');

    // Comment Deletion
    console.log('Deleting comment...');
    const deleteRes = await fetch(`${BASE_URL}/referrals/${referralId}/comment/${createdComment._id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testStudentId })
    });
    const deleteData = await deleteRes.json();
    console.log(`Comments count after delete:`, deleteData.data.comments.length);
    if (deleteData.data.comments.length !== 0) {
      throw new Error('Comment was not deleted!');
    }

    // Sync validation for delete comment
    const deletedCommentPost = await Post.findOne({ refId: referralId });
    if (deletedCommentPost.comments.length !== 0) {
      throw new Error('Comment deletion not synced to feed Post!');
    }
    console.log('Comment deletion synced successfully to feed Post.');

    console.log('✅ Interaction endpoints test passed.');
  } catch (err) {
    console.error('❌ Interaction endpoints test failed:', err.message);
    process.exit(1);
  }

  // 6. Test analytics endpoints
  console.log('\n--- 6. Testing Analytics Endpoints ---');
  try {
    const endpoints = ['view', 'click', 'share', 'apply'];
    for (const endpoint of endpoints) {
      console.log(`Incrementing ${endpoint}...`);
      const res = await fetch(`${BASE_URL}/referrals/${referralId}/${endpoint}`, {
        method: 'POST'
      });
      const data = await res.json();
      const field = endpoint === 'view' ? 'views' : endpoint === 'click' ? 'clicks' : endpoint === 'share' ? 'shares' : 'applications';
      console.log(`  - ${field} count:`, data.data[field]);
      if (data.data[field] !== 1) {
        throw new Error(`Expected ${field} count to be 1, got ${data.data[field]}`);
      }
    }
    console.log('✅ Analytics endpoints test passed.');
  } catch (err) {
    console.error('❌ Analytics endpoints test failed:', err.message);
    process.exit(1);
  }

  // Cleanup
  await Alumni.deleteMany({ userId: testAlumniId });
  await Post.deleteMany({ alumniId: testAlumniId });
  await Referral.deleteMany({ alumniId: testAlumniId });
  await mongoose.disconnect();
  console.log('\n🧹 Database cleaned and disconnected.');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test execution crashed:', err);
  process.exit(1);
});
