const mongoose = require('mongoose');
const { User, StudentPost, Like, Comment, FriendRequest, Notification, Connection, CollegeAlumniRecord } = require('./models');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/campus-connect';

async function seed() {
  console.log('🔌 Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.');

  // Clear existing student networking tables to prevent duplicates
  await User.deleteMany({ role: 'student' });
  await StudentPost.deleteMany({});
  await Like.deleteMany({});
  await Comment.deleteMany({});
  await FriendRequest.deleteMany({});
  await Notification.deleteMany({});
  await Connection.deleteMany({});
  await CollegeAlumniRecord.deleteMany({});
  console.log('🧹 Cleaned existing student data & alumni records.');

  // Seed official college alumni records
  const alumniRecords = [
    {
      personalEmail: 'alumni@gmail.com',
      rollNumber: '22B81A05F3',
      batch: 'Class of 2024',
      name: 'Koushik Reddy',
      department: 'Computer Science'
    },
    {
      personalEmail: 'johndoe@gmail.com',
      rollNumber: '20B81A0501',
      batch: 'Class of 2020',
      name: 'John Doe',
      department: 'Information Technology'
    }
  ];
  await CollegeAlumniRecord.insertMany(alumniRecords);
  console.log(`🎓 Seeded ${alumniRecords.length} official alumni records.`);

  // 1. Seed Student Users
  const students = [
    {
      userId: 'user-alice',
      email: 'alice@mit.edu',
      name: 'Alice Cooper',
      role: 'student',
      department: 'Computer Science',
      batch: 'Class of 2027',
      skills: ['React', 'TypeScript', 'Node.js', 'Next.js'],
      bio: 'Computer Science junior. Love hacking on React & Swift. Let\'s grab coffee!',
      interests: ['Coding', 'Coffee', 'Music', 'Hiking'],
      clubs: ['Coding Club', 'WebDev Association'],
      achievements: ['HackMIT 2026 Winner 🏆', 'AWS Certified Developer'],
      profileImageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      college: 'MIT',
      photos: [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop'
      ]
    },
    {
      userId: 'user-bob',
      email: 'bob@mit.edu',
      name: 'Bob Marley',
      role: 'student',
      department: 'Music Production',
      batch: 'Class of 2026',
      skills: ['Audio Engineering', 'Guitar', 'Composition'],
      bio: 'Music production major. Guitarist in the campus rock band. Looking for collabs.',
      interests: ['Music', 'Art', 'Coffee', 'Movies'],
      clubs: ['Campus Band', 'Audio Production Club'],
      achievements: ['Best Original Score at Campus Festival 🎵'],
      profileImageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
      college: 'MIT',
      photos: [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop'
      ]
    },
    {
      userId: 'user-clara',
      email: 'clara@stanford.edu',
      name: 'Clara Oswald',
      role: 'student',
      department: 'Applied Physics',
      batch: 'Class of 2028',
      skills: ['Quantum Mechanics', 'Python', 'LaTeX'],
      bio: 'Physics enthusiast. Avid time travel fan. Let\'s explore the universe!',
      interests: ['Reading', 'Hiking', 'Travel', 'Volunteering'],
      clubs: ['Physics Society', 'Debate Club'],
      achievements: ['Undergraduate Research Fellowship 🌌'],
      profileImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
      college: 'Stanford',
      photos: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop'
      ]
    },
    {
      userId: 'user-dev',
      email: 'dev@mit.edu',
      name: 'Dev Patel',
      role: 'student',
      department: 'Business Administration',
      batch: 'Class of 2025',
      skills: ['Product Management', 'Financial Modeling', 'Pitching'],
      bio: 'MBA student. Entrepreneurship is my passion. Building the future of campus social networking!',
      interests: ['Startups', 'Coffee', 'Travel', 'Fitness'],
      clubs: ['Entrepreneurship Club', 'Finance Club'],
      achievements: ['1st Place in VC Pitch Competition 🚀'],
      profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      college: 'MIT',
      photos: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop'
      ]
    }
  ];

  await User.insertMany(students);
  console.log(`👤 Seeded ${students.length} student profiles.`);

  // 2. Seed Student Posts
  const posts = [
    {
      userId: 'user-alice',
      authorName: 'Alice Cooper',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      isAnonymous: false,
      content: 'Just finished coding the layout for our campus hackathon project. Extremely excited for the presentations tomorrow! 🚀💻 Check out the github repo!',
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop',
      category: 'projects',
      viewCount: 45
    },
    {
      userId: 'user-bob',
      authorName: 'Bob Marley',
      authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      isAnonymous: false,
      content: 'Just released a new track on SoundCloud recorded entirely in the campus studio! Appreciate any feedback from fellow students. 🎵🎸',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=400&fit=crop',
      category: 'general',
      viewCount: 20
    },
    {
      userId: 'user-alice',
      authorName: 'Alice Cooper',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      isAnonymous: false,
      content: 'Thrilled to share that I have passed the AWS Certified Developer exam! Hard work pays off. 📜☁️',
      image: '',
      category: 'certifications',
      viewCount: 112
    }
  ];

  const seededPosts = await StudentPost.insertMany(posts);
  console.log(`📝 Seeded ${seededPosts.length} student posts.`);

  // 3. Add Some Comments & Likes
  const firstPost = seededPosts[0];
  const secondPost = seededPosts[1];

  // Bob likes Alice's post
  await new Like({ postId: firstPost._id.toString(), userId: 'user-bob' }).save();
  // Alice likes Bob's post
  await new Like({ postId: secondPost._id.toString(), userId: 'user-alice' }).save();

  // Bob comments on Alice's post
  await new Comment({
    postId: firstPost._id.toString(),
    userId: 'user-bob',
    userName: 'Bob Marley',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    content: "Looks awesome Alice! Can't wait to see it live."
  }).save();

  console.log('💬 Seeded likes and comments.');

  // 4. Seed notifications
  await new Notification({
    userId: 'user-alice',
    type: 'like',
    title: 'New Post Like! 👍',
    body: 'Bob Marley liked your post.',
    relatedId: firstPost._id.toString()
  }).save();

  await new Notification({
    userId: 'user-alice',
    type: 'comment',
    title: 'New Comment on Post! 💬',
    body: 'Bob Marley commented: "Looks awesome Alice! Can\'t..."',
    relatedId: firstPost._id.toString()
  }).save();

  console.log('🔔 Seeded notifications.');

  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
  console.log('🎉 Database seeding completed successfully.');
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
