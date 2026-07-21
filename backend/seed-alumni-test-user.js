const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-connect';
const { Alumni, LoginAttempt } = require('./models');

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB for seeding');

  const email = 'alumni@sru.edu.in';
  const rawPassword = 'alumni@89';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  // Clear any existing failed attempt lockouts for this email
  await LoginAttempt.deleteOne({ email });

  const account = await Alumni.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        password: hashedPassword,
        isEmailVerified: true,
        approvalStatus: 'approved',
        isSuspended: false,
        name: 'Test Alumni User',
        college: 'SR University',
        department: 'Computer Science',
        batch: '2022',
        userId: 'alumni-test-user-89',
        role: 'alumni',
        bio: 'Verified SR University Alumni for testing.',
        company: 'Campus Connect Tech',
        designation: 'Senior Software Engineer'
      }
    },
    { upsert: true, new: true }
  );

  console.log('✅ Successfully seeded/updated alumni test account:');
  console.log('   Email:', account.email);
  console.log('   Password: alumni@89');
  console.log('   Status:', account.approvalStatus);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
