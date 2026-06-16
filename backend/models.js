const mongoose = require('mongoose');

// Experience sub-schema
const ExperienceSchema = new mongoose.Schema({
  company: String,
  role: String,
  duration: String,
  location: String,
  responsibilities: [String]
});

// Alumni Schema
const AlumniSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, index: true },
  name: { type: String, required: true },
  batch: { type: String, required: true },
  department: { type: String, required: true },
  company: { type: String, default: '' },
  role: { type: String, default: '' },
  salaryRange: { type: String, default: '' },
  placementType: { type: String, default: 'off-campus' },
  story: { type: String, default: '' },
  achievements: [String],
  skills: [String],
  profileImageUrl: { type: String, default: '' },
  coverImageUrl: { type: String, default: '' },
  location: { type: String, default: 'San Francisco, CA' },
  linkedinUrl: { type: String, default: '' },
  portfolioUrl: { type: String, default: '' },
  approvalStatus: { type: String, default: 'approved', index: true },
  isFeatured: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
  profileViewers: { type: [String], default: [] },
  helpedCount: { type: Number, default: 0 },
  experience: [ExperienceSchema],
  connections: [String], // Array of User IDs
  followers: [String], // Array of User IDs
  savedPosts: [String],
  savedRoadmaps: [String],
  savedResources: [String],
  // Mapped alias fields to comply with specific DB requirements
  fullName: { type: String, default: '' },
  batchYear: { type: String, default: '' },
  designation: { type: String, default: '' },
  careerJourney: { type: String, default: '' },
  profileImage: { type: String, default: '' },
  role: { type: String, default: 'alumni' },
  isPrivateProfile: { type: Boolean, default: false },
  whoCanSendRequests: { type: String, default: 'everyone' },
  emailNotifications: { type: Boolean, default: true },
  pushNotifications: { type: Boolean, default: true },
  blockedUsers: { type: [String], default: [] },
  isTestAccount: { type: Boolean, default: false },
  profileVisibility: { type: String, enum: ['Public', 'College Only', 'Connections Only', 'Private'], default: 'Public' },
  messagingPermissions: { type: String, enum: ['Everyone', 'Alumni Only', 'Connections Only', 'Nobody'], default: 'Everyone' },
  profileDiscovery: { type: String, enum: ['Show in Search', 'Hide from Search'], default: 'Show in Search' },
  showPosts: { type: Boolean, default: true },
  showReferrals: { type: Boolean, default: true },
  showAchievements: { type: Boolean, default: true },
  referralAlerts: { type: Boolean, default: true },
  messageAlerts: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  onboardingCompleted: { type: Boolean, default: false },
  onboardingStep: { type: Number, default: 1 }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Post Schema
const PostCommentSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  userAvatar: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  alumniId: { type: String, required: true }, // Refers to Alumni ID
  content: { type: String, required: true },
  type: { type: String, default: 'general' }, // job, referral, internship, tip, achievement, resource, roadmap, general
  imageUrls: [String],
  videoUrls: [String],
  tags: [String],
  company: String,
  jobRole: String,
  salary: String,
  experience: String,
  applyLink: String,
  likes: [String], // Array of user emails/IDs
  comments: [PostCommentSchema],
  shareCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  approvalStatus: { type: String, default: 'pending' },
  status: { type: String, default: 'pending' },
  isPublished: { type: Boolean, default: false },
  refId: { type: String, default: '' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Hook to automatically set approvalStatus/status/isPublished based on moderation flag
PostSchema.pre('save', function (next) {
  const moderationEnabled = process.env.MODERATION_ENABLED !== 'false';
  if (!moderationEnabled) {
    if (this.isNew) {
      this.status = 'approved';
      this.approvalStatus = 'approved';
      this.isPublished = true;
    }
  } else {
    if (this.isNew) {
      this.status = 'pending';
      this.approvalStatus = 'pending';
      this.isPublished = false;
    } else {
      this.isPublished = (this.status === 'approved' || this.approvalStatus === 'approved');
    }
  }
  next();
});

// Referral Schema
const ReferralCommentSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  userAvatar: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const ReferralSchema = new mongoose.Schema({
  alumniId: { type: String, required: true },
  authorId: { type: String }, // duplicate of alumniId for consistency
  authorName: { type: String, default: 'Alumni Member' },
  company: { type: String, required: true },
  companyName: { type: String }, // duplicate of company for consistency
  role: { type: String, required: true },
  jobTitle: { type: String }, // duplicate of role for consistency
  description: { type: String, default: '' },
  eligibility: { type: String, default: '' },
  deadline: { type: String, default: '' },
  applicationUrl: { type: String, required: true },
  likes: { type: [String], default: [] },
  comments: [ReferralCommentSchema],
  saves: { type: [String], default: [] },
  shares: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  applications: { type: Number, default: 0 },
  salary: { type: String, default: '' },
  location: { type: String, default: 'Remote' },
  applicants: [{
    userId: String,
    resumeUrl: String,
    pitch: String,
    appliedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Resource Schema
const ResourceSchema = new mongoose.Schema({
  alumniId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  link: { type: String, default: '' },
  categoryType: { type: String, default: 'pdf' } // pdf, course, doc, interview_prep
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Roadmap Schema
const RoadmapStepSchema = new mongoose.Schema({
  title: String,
  description: String,
  resources: [String]
});

const RoadmapSchema = new mongoose.Schema({
  alumniId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  steps: [RoadmapStepSchema]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Achievement Schema
const AchievementSchema = new mongoose.Schema({
  alumniId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, default: 'Promotion' }, // Promotion, Certification, Award, Publication
  date: { type: String, default: '' },
  issuer: { type: String, default: '' },
  link: { type: String, default: '' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Admin Post Schema (admin_posts)
const AdminPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  imageURL: { type: String, default: '' },
  college: { type: String, default: 'SR University' },
  createdBy: { type: String, default: 'admin' },
  createdByName: { type: String, default: 'Campus Admin' },
  isPinned: { type: Boolean, default: false }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// College Alumni Record Schema
const CollegeAlumniRecordSchema = new mongoose.Schema({
  personalEmail: { type: String, required: true },
  rollNumber: { type: String, required: true },
  batch: { type: String, required: true },
  name: { type: String, required: true },
  department: { type: String, required: true }
}, { timestamps: true });

CollegeAlumniRecordSchema.index({ personalEmail: 1, rollNumber: 1, batch: 1 });

// OTP Schema
const OTPSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  otp: { type: String }, // alias/duplicate of code
  expiresAt: { type: Date, required: true },
  role: { type: String, enum: ['student', 'alumni', 'admin'], required: true },
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ReportSchema = new mongoose.Schema({
  reporterId: { type: String, required: true },
  reportedUserId: { type: String },
  reportedNameOrEmail: { type: String, default: '' },
  type: { type: String, required: true }, // Spam, Fake Profile, Harassment, Inappropriate Content, Other
  reason: { type: String, default: '' }
}, { timestamps: true });

module.exports = {
  AdminPost: mongoose.model('AdminPost', AdminPostSchema, 'admin_posts'),
  Alumni: mongoose.model('Alumni', AlumniSchema, 'alumni_profiles'),
  Post: mongoose.model('Post', PostSchema, 'alumni_posts'),
  Referral: mongoose.model('Referral', ReferralSchema, 'referrals'),
  Resource: mongoose.model('Resource', ResourceSchema, 'resources'),
  Roadmap: mongoose.model('Roadmap', RoadmapSchema, 'roadmaps'),
  Achievement: mongoose.model('Achievement', AchievementSchema, 'achievements'),
  CollegeAlumniRecord: mongoose.model('CollegeAlumniRecord', CollegeAlumniRecordSchema, 'college_alumni_records'),
  OTP: mongoose.model('OTP', OTPSchema, 'otps'),
  Report: mongoose.model('Report', ReportSchema, 'reports'),
  
  // Student Networking collections
  User: mongoose.model('User', new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true, index: true },
    name: { type: String, default: '' },
    role: { type: String, default: 'student' },
    department: { type: String, default: '' },
    batch: { type: String, default: '' },
    skills: { type: [String], default: [] },
    bio: { type: String, default: '' },
    interests: { type: [String], default: [] },
    clubs: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    profileImageUrl: { type: String, default: '' },
    college: { type: String, default: '' },
    photos: { type: [String], default: [] },
    collegeEmail: { type: String, default: '', index: true },
    personalEmail: { type: String, default: '', index: true },
    rollNumber: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },
    githubUrl: { type: String, default: '' },
    projects: { type: [String], default: [] },
    careerGoals: { type: String, default: '' },
    viewCount: { type: Number, default: 0 },
    profileViewers: { type: [String], default: [] },
    isPrivateProfile: { type: Boolean, default: false },
    whoCanSendRequests: { type: String, default: 'everyone' },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    blockedUsers: { type: [String], default: [] },
    profileVisibility: { type: String, enum: ['Public', 'College Only', 'Connections Only', 'Private'], default: 'Public' },
    messagingPermissions: { type: String, enum: ['Everyone', 'Alumni Only', 'Connections Only', 'Nobody'], default: 'Everyone' },
    profileDiscovery: { type: String, enum: ['Show in Search', 'Hide from Search'], default: 'Show in Search' },
    showPosts: { type: Boolean, default: true },
    showReferrals: { type: Boolean, default: true },
    showAchievements: { type: Boolean, default: true },
    referralAlerts: { type: Boolean, default: true },
    messageAlerts: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },
    onboardingStep: { type: Number, default: 1 }
  }, { timestamps: true }), 'users'),

  StudentPost: mongoose.model('StudentPost', new mongoose.Schema({
    userId: { type: String, required: true },
    authorName: { type: String, default: '' },
    authorAvatar: { type: String, default: '' },
    isAnonymous: { type: Boolean, default: false },
    content: { type: String, required: true },
    image: { type: String, default: '' },
    category: { type: String, default: 'general' },
    type: { type: String, default: 'student_post' },
    viewCount: { type: Number, default: 0 }
  }, { timestamps: true }), 'posts'),

  Like: mongoose.model('Like', new mongoose.Schema({
    userId: { type: String, required: true },
    postId: { type: String, required: true }
  }, { timestamps: true }), 'likes'),

  Comment: mongoose.model('Comment', new mongoose.Schema({
    postId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, default: '' },
    userAvatar: { type: String, default: '' },
    content: { type: String, required: true }
  }, { timestamps: true }), 'comments'),

  Connection: mongoose.model('Connection', new mongoose.Schema({
    user1: { type: String, required: true },
    user2: { type: String, required: true },
    isRevealed: { type: Boolean, default: false }
  }, { timestamps: true }), 'connections'),

  FriendRequest: mongoose.model('FriendRequest', new mongoose.Schema({
    fromUserId: { type: String, required: true },
    toUserId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'passed'], default: 'pending' }
  }, { timestamps: true }), 'friendRequests'),

  Notification: mongoose.model('Notification', new mongoose.Schema({
    userId: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
    relatedId: { type: String, default: '' }
  }, { timestamps: true }), 'notifications'),

  Message: mongoose.model('Message', new mongoose.Schema({
    matchId: { type: String, required: true },
    senderId: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
    reactions: [{
      emoji: String,
      userId: String,
      timestamp: { type: Date, default: Date.now }
    }]
  }, { timestamps: true }), 'messages'),

  GroupChat: mongoose.model('GroupChat', new mongoose.Schema({
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    members: { type: [String], required: true },
    createdBy: { type: String, required: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date }
  }, { timestamps: true }), 'group_chats'),

  GroupMessage: mongoose.model('GroupMessage', new mongoose.Schema({
    groupId: { type: String, required: true },
    senderId: { type: String, required: true },
    senderName: { type: String, default: '' },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }, { timestamps: true }), 'group_messages'),

  Story: mongoose.model('Story', new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String, default: '' },
    userAvatar: { type: String, default: '' },
    image: { type: String, required: true },
    caption: { type: String, default: '' },
    type: { type: String, enum: ['image', 'text'], default: 'image' },
    textContent: { type: String, default: '' },
    bgColor: { type: String, default: '' },
    viewers: { type: [String], default: [] },
    expiresAt: { type: Date, required: true }
  }, { timestamps: true }), 'stories')
};

// New models schemas
const SupportTicketSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
  replies: [{
    senderId: String,
    senderName: String,
    message: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const FAQSchema = new mongoose.Schema({
  category: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true }
}, { timestamps: true });

const FeatureRequestSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: ['feature', 'bug'], required: true },
  description: { type: String, required: true },
  deviceInfo: { type: mongoose.Schema.Types.Mixed },
  screenshot: { type: String },
  status: { type: String, default: 'Pending' }
}, { timestamps: true });

module.exports.SupportTicket = mongoose.model('SupportTicket', SupportTicketSchema, 'support_tickets');
module.exports.FAQ = mongoose.model('FAQ', FAQSchema, 'faqs');
module.exports.FeatureRequest = mongoose.model('FeatureRequest', FeatureRequestSchema, 'feature_requests');

// New schemas for enterprise-grade authentication system
const CollegeDomainSchema = new mongoose.Schema({
  name: { type: String, required: true },
  domain: { type: String, required: true, unique: true }
}, { timestamps: true });
CollegeDomainSchema.index({ domain: 1 });

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  role: { type: String, required: true },
  userAgent: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  deviceType: { type: String, default: 'desktop' },
  location: { type: String, default: '' },
  lastActiveAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });
SessionSchema.index({ sessionId: 1 });
SessionSchema.index({ userId: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-expire sessions

const LoginAttemptSchema = new mongoose.Schema({
  email: { type: String, required: true },
  ipAddress: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  lastAttemptAt: { type: Date, default: Date.now }
}, { timestamps: true });
LoginAttemptSchema.index({ email: 1 });
LoginAttemptSchema.index({ ipAddress: 1 });

const SecurityLogSchema = new mongoose.Schema({
  userId: { type: String, default: '' },
  email: { type: String, default: '' },
  event: { type: String, required: true },
  status: { type: String, enum: ['success', 'failure'], required: true },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });
SecurityLogSchema.index({ userId: 1 });
SecurityLogSchema.index({ event: 1 });
SecurityLogSchema.index({ createdAt: 1 });

const AlumniVerificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  email: { type: String, required: true },
  name: { type: String, default: '' },
  rollNumber: { type: String, default: '' },
  batch: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  method: { type: String, default: 'email' },
  verifiedAt: { type: Date },
  verifiedBy: { type: String, default: '' }
}, { timestamps: true });
AlumniVerificationSchema.index({ userId: 1 });
AlumniVerificationSchema.index({ email: 1 });
AlumniVerificationSchema.index({ status: 1 });

module.exports.CollegeDomain = mongoose.model('CollegeDomain', CollegeDomainSchema, 'college_domains');
module.exports.Session = mongoose.model('Session', SessionSchema, 'sessions');
module.exports.LoginAttempt = mongoose.model('LoginAttempt', LoginAttemptSchema, 'login_attempts');
module.exports.SecurityLog = mongoose.model('SecurityLog', SecurityLogSchema, 'security_logs');
module.exports.AlumniVerification = mongoose.model('AlumniVerification', AlumniVerificationSchema, 'alumni_verifications');


