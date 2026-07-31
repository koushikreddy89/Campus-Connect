const mongoose = require('mongoose');
const { AdminPost, Alumni, Post, Referral, Resource, Roadmap } = require('./models');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-connect';

async function runTest() {
  console.log('🔌 Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully.');

  // Clean test documents if any exist
  await AdminPost.deleteMany({ title: /Test Admin Post/ });
  await Alumni.deleteMany({ name: /Test Alumni Name/ });
  await Post.deleteMany({ content: /Test Alumni Post Content/ });
  await Referral.deleteMany({ company: /Test Referral Company/ });
  await Resource.deleteMany({ title: /Test Resource Title/ });
  await Roadmap.deleteMany({ title: /Test Roadmap Title/ });

  console.log('🧹 Cleaned existing test documents.');

  // 1. Create Admin Post
  const adminPost = new AdminPost({
    title: 'Test Admin Post Title',
    content: 'Test Admin Post Content Description',
    category: 'placement',
    college: 'MIT'
  });
  await adminPost.save();
  console.log('📝 Created Admin Post in collection:', AdminPost.collection.name);

  // 2. Create Alumni Profile
  const alumniProfile = new Alumni({
    userId: 'test-alumni-id-123',
    email: 'testalumni@mit.edu',
    name: 'Test Alumni Name',
    batch: '2020',
    department: 'CSE',
    company: 'Google',
    role: 'Software Engineer',
    approvalStatus: 'approved'
  });
  await alumniProfile.save();
  console.log('🎓 Created Alumni Profile in collection:', Alumni.collection.name);

  // 3. Create Alumni Post
  const alumniPost = new Post({
    alumniId: alumniProfile.userId,
    content: 'Test Alumni Post Content body',
    type: 'general'
  });
  await alumniPost.save();
  console.log('💬 Created Alumni Post in collection:', Post.collection.name);

  // 4. Create Referral
  const referral = new Referral({
    alumniId: alumniProfile.userId,
    company: 'Test Referral Company',
    role: 'SWE Intern',
    applicationUrl: 'https://example.com/apply'
  });
  await referral.save();
  console.log('🤝 Created Referral in collection:', Referral.collection.name);

  // 5. Create Resource
  const resource = new Resource({
    alumniId: alumniProfile.userId,
    title: 'Test Resource Title',
    link: 'https://example.com'
  });
  await resource.save();
  console.log('📚 Created Resource in collection:', Resource.collection.name);

  // 6. Create Roadmap
  const roadmap = new Roadmap({
    alumniId: alumniProfile.userId,
    title: 'Test Roadmap Title',
    steps: [{ title: 'Step 1', description: 'Start' }]
  });
  await roadmap.save();
  console.log('🗺️ Created Roadmap in collection:', Roadmap.collection.name);

  // Let's print out all collections in the database to verify
  const collections = await mongoose.connection.db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);
  console.log('\n📊 Collections present in MongoDB:');
  console.log(collectionNames);

  // Assert correct collections are present
  const required = ['admin_posts', 'alumni_profiles', 'alumni_posts', 'referrals', 'resources', 'roadmaps'];
  let pass = true;
  for (const reqCol of required) {
    if (collectionNames.includes(reqCol)) {
      console.log(`✅ Collection "${reqCol}" exists!`);
    } else {
      console.log(`❌ Missing collection: "${reqCol}"`);
      pass = false;
    }
  }

  if (pass) {
    console.log('\n🎉 ALL CONTENT SEPARATION COLLECTIONS VERIFIED SUCCESSFULLY!');
  } else {
    console.log('\n⚠️ Some collections are missing or named incorrectly!');
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
  process.exit(pass ? 0 : 1);
}

runTest().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
