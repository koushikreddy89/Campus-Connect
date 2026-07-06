const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { StudentPost, Post, Alumni, User, Session, Story, Connection, FriendRequest, Message, Referral } = require('./models');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-connect';
const BASE_URL = 'http://127.0.0.1:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'campus-connect-super-secret';

async function runHardeningTests() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully.');

  const mitStudentId = 'test-hard-mit-student';
  const stanStudentId = 'test-hard-stan-student';
  const mitStudent3Id = 'test-hard-mit-student-3';
  const mitAlumniId = 'test-hard-mit-alumni';
  const stanAlumniId = 'test-hard-stan-alumni';
  
  const mitSessionId = 'session-mit-student-999';
  const stanSessionId = 'session-stan-student-999';
  const mitAlumniSessionId = 'session-mit-alumni-999';

  // 1. Cleanup old test data
  await User.deleteMany({ userId: { $in: [mitStudentId, stanStudentId, mitStudent3Id] } });
  await Alumni.deleteMany({ userId: { $in: [mitAlumniId, stanAlumniId] } });
  await StudentPost.deleteMany({ userId: { $in: [mitStudentId, stanStudentId] } });
  await Post.deleteMany({ alumniId: { $in: [mitAlumniId, stanAlumniId] } });
  await Session.deleteMany({ sessionId: { $in: [mitSessionId, stanSessionId, mitAlumniSessionId] } });
  await Story.deleteMany({ userId: { $in: [mitStudentId, stanStudentId] } });
  await Connection.deleteMany({ $or: [{ user1: mitStudentId }, { user2: mitStudentId }] });
  console.log('🧹 Cleaned up old test database records.');

  // 2. Create mock accounts with colleges
  const mitStudent = new User({
    userId: mitStudentId,
    email: 'mitstudent@sru.edu.in',
    name: 'Mitch Student',
    role: 'student',
    college: 'SR University'
  });
  await mitStudent.save();

  const stanStudent = new User({
    userId: stanStudentId,
    email: 'stanstudent@stanford.edu',
    name: 'Stanley Student',
    role: 'student',
    college: 'Stanford College'
  });
  await stanStudent.save();

  const mitStudent3 = new User({
    userId: mitStudent3Id,
    email: 'mitstudent3@sru.edu.in',
    name: 'Mitch Student 3',
    role: 'student',
    college: 'SR University',
    profileDiscovery: 'Show in Search'
  });
  await mitStudent3.save();

  const mitAlumni = new Alumni({
    userId: mitAlumniId,
    email: 'mitalumni@sru.edu.in',
    name: 'Mila Alumni',
    role: 'alumni',
    college: 'SR University',
    batch: '2022',
    department: 'CSE',
    approvalStatus: 'approved'
  });
  await mitAlumni.save();

  const stanAlumni = new Alumni({
    userId: stanAlumniId,
    email: 'stanalumni@stanford.edu',
    name: 'Stanislava Alumni',
    role: 'alumni',
    college: 'Stanford College',
    batch: '2021',
    department: 'EE',
    approvalStatus: 'approved'
  });
  await stanAlumni.save();

  // 3. Create active sessions in DB
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h
  
  await Session.create([
    { sessionId: mitSessionId, userId: mitStudentId, role: 'student', expiresAt },
    { sessionId: stanSessionId, userId: stanStudentId, role: 'student', expiresAt },
    { sessionId: mitAlumniSessionId, userId: mitAlumniId, role: 'alumni', expiresAt }
  ]);
  console.log('🔑 Seeded session tables.');

  // 4. Generate JWT tokens
  const mitStudentToken = jwt.sign({ userId: mitStudentId, email: mitStudent.email, role: 'student', sessionId: mitSessionId }, JWT_SECRET);
  const stanStudentToken = jwt.sign({ userId: stanStudentId, email: stanStudent.email, role: 'student', sessionId: stanSessionId }, JWT_SECRET);
  const mitAlumniToken = jwt.sign({ userId: mitAlumniId, email: mitAlumni.email, role: 'alumni', sessionId: mitAlumniSessionId }, JWT_SECRET);

  console.log('🎫 Signed test JWT tokens.');

  // --- TEST CASE 1: Unauthenticated Block ---
  console.log('\n--- 🧪 TEST 1: Unauthenticated Requests Blocked ---');
  try {
    const res = await fetch(`${BASE_URL}/feed`);
    const result = await res.json();
    console.log(`Status code: ${res.status} (Expected: 401)`);
    console.log(`Success status: ${result.success} (Expected: false)`);
    if (res.status !== 401 || result.success !== false) {
      throw new Error('Unauthenticated requests are not blocked!');
    }
    console.log('✅ Passed: Unauthenticated request correctly blocked.');
  } catch (err) {
    console.error('❌ Fail:', err.message);
    process.exit(1);
  }

  // --- TEST CASE 2: College Social Feed Segregation ---
  console.log('\n--- 🧪 TEST 2: Student Social Feed Segregation ---');
  try {
    // Create student posts
    const p1 = new StudentPost({ userId: mitStudentId, college: 'SR University', content: 'MIT Post Content' });
    const p2 = new StudentPost({ userId: stanStudentId, college: 'Stanford College', content: 'Stanford Post Content' });
    await p1.save();
    await p2.save();

    // MIT student queries feed
    const resMIT = await fetch(`${BASE_URL}/feed`, {
      headers: { 'Authorization': `Bearer ${mitStudentToken}` }
    });
    const dataMIT = await resMIT.json();
    console.log(`MIT Student Feed count: ${dataMIT.data.length}`);
    const mitHasStanford = dataMIT.data.some(p => p.content.includes('Stanford'));
    const mitHasMIT = dataMIT.data.some(p => p.content.includes('MIT'));
    
    console.log(`MIT Feed has MIT post: ${mitHasMIT} (Expected: true)`);
    console.log(`MIT Feed has Stanford post: ${mitHasStanford} (Expected: false)`);

    if (!mitHasMIT || mitHasStanford) {
      throw new Error('College isolation failed on GET /feed for MIT Student');
    }

    // Stanford student queries feed
    const resStan = await fetch(`${BASE_URL}/feed`, {
      headers: { 'Authorization': `Bearer ${stanStudentToken}` }
    });
    const dataStan = await resStan.json();
    console.log(`Stanford Student Feed count: ${dataStan.data.length}`);
    const stanHasMIT = dataStan.data.some(p => p.content.includes('MIT'));
    const stanHasStanford = dataStan.data.some(p => p.content.includes('Stanford'));
    
    console.log(`Stanford Feed has MIT post: ${stanHasMIT} (Expected: false)`);
    console.log(`Stanford Feed has Stanford post: ${stanHasStanford} (Expected: true)`);

    if (stanHasMIT || !stanHasStanford) {
      throw new Error('College isolation failed on GET /feed for Stanford Student');
    }

    console.log('✅ Passed: Social feeds isolated by college.');
  } catch (err) {
    console.error('❌ Fail:', err.message);
    process.exit(1);
  }

  // --- TEST CASE 3: Alumni Directory Segregation ---
  console.log('\n--- 🧪 TEST 3: Alumni Directory College Segregation ---');
  try {
    // MIT student fetches alumni list
    const res = await fetch(`${BASE_URL}/alumni`, {
      headers: { 'Authorization': `Bearer ${mitStudentToken}` }
    });
    const result = await res.json();
    console.log(`MIT Student sees alumni count: ${result.data.length}`);
    const hasMitAlumni = result.data.some(a => a.userId === mitAlumniId);
    const hasStanAlumni = result.data.some(a => a.userId === stanAlumniId);

    console.log(`Has MIT Alumni: ${hasMitAlumni} (Expected: true)`);
    console.log(`Has Stanford Alumni: ${hasStanAlumni} (Expected: false)`);

    if (!hasMitAlumni || hasStanAlumni) {
      throw new Error('College isolation failed on GET /alumni directory');
    }

    // Try to access Stanford alumni details directly with MIT student token
    const resDirect = await fetch(`${BASE_URL}/alumni/${stanAlumniId}`, {
      headers: { 'Authorization': `Bearer ${mitStudentToken}` }
    });
    const directResult = await resDirect.json();
    console.log(`Direct access status: ${resDirect.status} (Expected: 403)`);
    if (resDirect.status !== 403) {
      throw new Error(`MIT student was able to query Stanford alumni details directly! Status code: ${resDirect.status}`);
    }

    console.log('✅ Passed: Alumni directory college isolation verified.');
  } catch (err) {
    console.error('❌ Fail:', err.message);
    process.exit(1);
  }

  // --- TEST CASE 4: Discover Student Pool Segregation ---
  console.log('\n--- 🧪 TEST 4: Discover Student Pool Isolation ---');
  try {
    const res = await fetch(`${BASE_URL}/discover`, {
      headers: { 'Authorization': `Bearer ${mitStudentToken}` }
    });
    const result = await res.json();
    console.log(`MIT Student discover pool count: ${result.data.length}`);
    const hasMitStudent3 = result.data.some(s => s.userId === mitStudent3Id);
    const hasStanStudent = result.data.some(s => s.userId === stanStudentId);

    console.log(`Discover pool has MIT Student 3: ${hasMitStudent3} (Expected: true)`);
    console.log(`Discover pool has Stanford Student: ${hasStanStudent} (Expected: false)`);

    if (!hasMitStudent3 || hasStanStudent) {
      throw new Error('College isolation failed on GET /discover');
    }

    console.log('✅ Passed: Discover student pool isolated successfully.');
  } catch (err) {
    console.error('❌ Fail:', err.message);
    process.exit(1);
  }

  // --- TEST CASE 5: Stories College Segregation ---
  console.log('\n--- 🧪 TEST 5: Active Stories Segregation ---');
  try {
    const storyMIT = new Story({
      userId: mitStudentId,
      college: 'SR University',
      userName: 'Mitch Student',
      image: 'https://placehold.co/600x400',
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
    });
    await storyMIT.save();

    // Query stories with Stanford student token
    const res = await fetch(`${BASE_URL}/stories`, {
      headers: { 'Authorization': `Bearer ${stanStudentToken}` }
    });
    const result = await res.json();
    const hasMitStory = result.data.some(s => s.userId === mitStudentId);
    console.log(`Stanford student sees MIT story: ${hasMitStory} (Expected: false)`);
    if (hasMitStory) {
      throw new Error('Stories college isolation failed! Stanford student saw MIT story.');
    }

    console.log('✅ Passed: Active stories isolated successfully.');
  } catch (err) {
    console.error('❌ Fail:', err.message);
    process.exit(1);
  }

  // --- TEST CASE 6: Cross-College Messaging Block ---
  console.log('\n--- 🧪 TEST 6: Cross-College Direct Messaging Block ---');
  try {
    // Attempt to create connection cross-college (simulate bad state match)
    const badConn = new Connection({ user1: mitStudentId, user2: stanStudentId });
    await badConn.save();

    // MIT student attempts to fetch messages for this connection
    const resGet = await fetch(`${BASE_URL}/chats/${badConn._id.toString()}/messages`, {
      headers: { 'Authorization': `Bearer ${mitStudentToken}` }
    });
    console.log(`Fetch cross-college chat messages status: ${resGet.status} (Expected: 403)`);

    // MIT student attempts to send message to Stanford student
    const resPost = await fetch(`${BASE_URL}/chats/${badConn._id.toString()}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mitStudentToken}`
      },
      body: JSON.stringify({ text: 'Cross college spam' })
    });
    console.log(`Send cross-college chat message status: ${resPost.status} (Expected: 403)`);

    await Connection.findByIdAndDelete(badConn._id);

    if (resGet.status !== 403 || resPost.status !== 403) {
      throw new Error('Cross-college messaging boundary was bypassed!');
    }

    console.log('✅ Passed: Cross-college messaging successfully blocked.');
  } catch (err) {
    console.error('❌ Fail:', err.message);
    process.exit(1);
  }

  // Clean up
  await User.deleteMany({ userId: { $in: [mitStudentId, stanStudentId, mitStudent3Id] } });
  await Alumni.deleteMany({ userId: { $in: [mitAlumniId, stanAlumniId] } });
  await StudentPost.deleteMany({ userId: { $in: [mitStudentId, stanStudentId] } });
  await Post.deleteMany({ alumniId: { $in: [mitAlumniId, stanAlumniId] } });
  await Session.deleteMany({ sessionId: { $in: [mitSessionId, stanSessionId, mitAlumniSessionId] } });
  await Story.deleteMany({ userId: { $in: [mitStudentId, stanStudentId] } });
  await mongoose.disconnect();
  console.log('\n🧹 Database cleaned and disconnected.');
  console.log('🎉 ALL HARDENING & ISOLATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runHardeningTests().catch(err => {
  console.error('❌ Hardening test suite crashed:', err);
  process.exit(1);
});
