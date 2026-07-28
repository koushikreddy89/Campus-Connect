const http = require('http');
const { StudentPost, User } = require('./models');
const mongoose = require('mongoose');

async function testPostValidation() {
  console.log('🧪 Starting StudentPost validation tests...');

  // Ensure DB connection
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusconnect');
  }

  const testUserId = 'test-validation-user-' + Date.now();

  try {
    // 1. Test image-only Mongoose document creation directly
    const imgOnlyDoc = new StudentPost({
      userId: testUserId,
      college: 'SR University',
      content: '',
      image: 'https://example.com/test-image.jpg',
      category: 'general'
    });
    await imgOnlyDoc.save();
    console.log('✅ PASS 1: Image-only post saved to MongoDB without Mongoose validation error! ID:', imgOnlyDoc._id);

    // 2. Test video-only Mongoose document creation
    const videoOnlyDoc = new StudentPost({
      userId: testUserId,
      college: 'SR University',
      content: '',
      videoUrl: 'https://example.com/test-video.mp4',
      videos: ['https://example.com/test-video.mp4'],
      category: 'general'
    });
    await videoOnlyDoc.save();
    console.log('✅ PASS 2: Video-only post saved to MongoDB without Mongoose validation error! ID:', videoOnlyDoc._id);

    // 3. Test text-only Mongoose document creation
    const textOnlyDoc = new StudentPost({
      userId: testUserId,
      college: 'SR University',
      content: 'Hello Campus Connect text only post!',
      category: 'general'
    });
    await textOnlyDoc.save();
    console.log('✅ PASS 3: Text-only post saved to MongoDB! ID:', textOnlyDoc._id);

    // Clean up test documents
    await StudentPost.deleteMany({ userId: testUserId });
    console.log('🧹 Cleaned up test documents.');

    console.log('🎉 ALL MONGOOSE VALIDATION TESTS PASSED CLEANLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ FAIL: Mongoose validation error encountered:', err.message);
    process.exit(1);
  }
}

testPostValidation();
