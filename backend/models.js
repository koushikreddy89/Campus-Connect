const mongoose = require('mongoose');
const crypto = require('crypto');

// Encryption keys and helpers for sensitive data
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'cc_secret_key_32_bytes_long_placeholder_12345'; // Must be 32 bytes

function encryptDeterministic(text) {
  if (!text) return '';
  try {
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    // Deriving IV deterministically from the key + text to maintain security while allowing matching
    const iv = crypto.createHash('md5').update(text).digest(); // 16 bytes IV
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (e) {
    return text;
  }
}

function decryptDeterministic(text) {
  if (!text) return '';
  if (!text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text;
  }
}

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
  password: { type: String, default: '' },
  passwordHistory: { type: [String], default: [] },
  isEmailVerified: { type: Boolean, default: false },
  mfaSecret: { type: String, default: '' },
  mfaEnabled: { type: Boolean, default: false },
  mfaType: { type: String, default: 'email' },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  college: { type: String, default: 'SR University', index: true },
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
  resonanceEnabled: { type: Boolean, default: true },
  isOnline: { type: Boolean, default: false, index: true },
  lastSeen: { type: Date, default: Date.now, index: true },
  lastActivity: { type: Date, default: Date.now },
  socketId: { type: String, default: null },
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
  college: { type: String, default: 'SR University', index: true },
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
  college: { type: String, default: 'SR University', index: true },
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
  college: { type: String, default: 'SR University', index: true },
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
  college: { type: String, default: 'SR University', index: true },
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
  isPinned: { type: Boolean, default: false },
  
  // Common Broadcast Controls
  relatedId: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'active', 'paused', 'archived', 'trash'], default: 'active' },
  publishDate: { type: Date },
  expiryDate: { type: Date },
  scheduledPublish: { type: Date },
  visibility: { type: String, enum: ['Public', 'Restricted', 'Private'], default: 'Public' },
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  applications: { type: Number, default: 0 },
  deletedAt: { type: Date },

  // Announcements
  summary: { type: String, default: '' },
  subCategory: { type: String, default: '' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  attachments: { type: [String], default: [] },

  // Placements & Internships
  companyName: { type: String, default: '' },
  companyLogo: { type: String, default: '' },
  companyWebsite: { type: String, default: '' },
  jobRole: { type: String, default: '' },
  employmentType: { type: String, default: '' },
  workMode: { type: String, default: '' },
  package: { type: String, default: '' },
  stipend: { type: String, default: '' },
  skillsRequired: { type: [String], default: [] },
  eligibilityAcademicYears: { type: [String], default: [] },
  eligibilityDepartments: { type: [String], default: [] },
  eligibilitySpecializations: { type: [String], default: [] },
  eligibilityCGPA: { type: Number, default: 0.0 },
  eligibilityBacklogs: { type: Number, default: 0 },
  eligibilityBatch: { type: String, default: '' },
  eligibilityGender: { type: String, default: 'Everyone' },
  eligibilityBatches: { type: [String], default: [] },
  eligibilityCollegesSelection: { type: String, default: 'Current College' },
  eligibilitySkills: { type: [String], default: [] },
  placementType: { type: String, default: 'Full Time' },
  registrationLink: { type: String, default: '' },
  registrationDeadline: { type: Date },
  interviewProcess: { type: String, default: '' },
  selectionRounds: { type: [String], default: [] },
  documentsRequired: { type: [String], default: [] },
  duration: { type: String, default: '' },
  isPaid: { type: Boolean, default: false },

  // College Events
  eventName: { type: String, default: '' },
  eventBanner: { type: String, default: '' },
  eventType: { type: String, default: '' },
  organizingDepartment: { type: String, default: '' },
  venue: { type: String, default: '' },
  building: { type: String, default: '' },
  hallNumber: { type: String, default: '' },
  eventDate: { type: Date },
  eventTime: { type: String, default: '' },
  maxParticipants: { type: Number, default: 0 },
  entryFee: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  contactNumber: { type: String, default: '' },

  // Circular / Notice
  circularNumber: { type: String, default: '' },
  issuedBy: { type: String, default: '' },
  subject: { type: String, default: '' },
  effectiveDate: { type: Date },
  pdfAttachment: { type: String, default: '' },
  supportingDocuments: { type: [String], default: [] },

  // Emergency Alert
  alertCategory: { type: String, default: '' },
  severity: { type: String, enum: ['Critical', 'High', 'Medium'], default: 'Medium' },
  emergencyMessage: { type: String, default: '' },
  instructions: { type: String, default: '' },
  emergencyContacts: { type: [String], default: [] },
  location: { type: String, default: '' },
  affectedBuildings: { type: [String], default: [] },
  alertStartTime: { type: Date },
  alertEndTime: { type: Date },
  sendPush: { type: Boolean, default: false },
  sendEmail: { type: Boolean, default: false },
  sendSMS: { type: Boolean, default: false },
  requireAcknowledgement: { type: Boolean, default: false },
  acknowledgedUsers: { type: [String], default: [] },
  version: { type: Number, default: 1 },
  updatedBy: { type: String, default: '' },
  lastModifiedAt: { type: Date }
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

// Placement Schema
const PlacementSchema = new mongoose.Schema({
  companyLogo: { type: String, default: '' },
  companyName: { type: String, required: true },
  jobRole: { type: String, required: true },
  employmentType: { type: String, enum: ['Internship', 'Full Time', 'Full-Time', 'Internship + PPO', 'Contract', 'Apprenticeship'], required: true },
  package: { type: String, default: '' },
  packageVal: { type: Number, default: 0 },
  location: { type: String, default: '' },
  expiryDate: { type: Date, required: true },
  description: { type: String, default: '' },
  eligibility: { type: String, default: '' },
  eligibleYears: { type: [String], default: [] },
  eligibleDepartments: { type: [String], default: [] },
  minimumCGPA: { type: Number, default: 0.0 },
  maximumBacklogs: { type: Number, default: 0 },
  eligibleBatches: { type: [String], default: [] },
  eligibleSections: { type: [String], default: [] },
  createdBy: { type: String, required: true },
  createdByRole: { type: String, enum: ['Admin', 'Alumni', 'ADMIN', 'ALUMNI'], required: true },
  status: { type: String, enum: ['active', 'paused', 'archived', 'pending', 'trash'], default: 'active' },
  isVerified: { type: Boolean, default: false },
  referralAvailable: { type: Boolean, default: false },
  contactAlumni: { type: String, default: '' },
  college: { type: String, default: 'SR University', index: true },
  
  // Dynamic fields from broadcast system integration
  companyWebsite: { type: String, default: '' },
  workMode: { type: String, enum: ['Remote', 'Onsite', 'Hybrid'], default: 'Onsite' },
  responsibilities: { type: String, default: '' },
  requiredSkills: { type: [String], default: [] },
  preferredSkills: { type: [String], default: [] },
  registrationLink: { type: String, default: '' },
  assessmentDate: { type: Date },
  interviewDate: { type: Date },
  joiningDate: { type: Date },
  eligibleSpecializations: { type: [String], default: [] },
  attachments: { type: [String], default: [] },
  isPinned: { type: Boolean, default: false },
  visibility: { type: String, enum: ['Public', 'Restricted', 'Private'], default: 'Public' },
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  applications: { type: Number, default: 0 },
  savedCount: { type: Number, default: 0 },
  deletedAt: { type: Date },

  // New requested production schema fields
  title: { type: String },
  company: { type: String },
  role: { type: String },
  minCGPA: { type: Number },
  maxBacklogs: { type: Number },
  branches: { type: [String], default: [] },
  batches: { type: [String], default: [] },
  salary: { type: String },
  registrationDeadline: { type: Date },
  driveDate: { type: Date },
  applyLink: { type: String },
  placementType: { type: String, enum: ['OFFICIAL', 'ALUMNI_REFERRAL'] }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Pre-save hook to synchronize new and old fields
PlacementSchema.pre('save', function (next) {
  // Sync title / role
  if (this.role) this.jobRole = this.role;
  else if (this.jobRole) this.role = this.jobRole;
  if (this.title) {
    if (!this.jobRole) this.jobRole = this.title;
    if (!this.role) this.role = this.title;
  } else if (this.jobRole) {
    this.title = this.jobRole;
  }

  // Sync company
  if (this.company) this.companyName = this.company;
  else if (this.companyName) this.company = this.companyName;

  // Sync salary
  if (this.salary) this.package = this.salary;
  else if (this.package) this.salary = this.package;

  // Sync deadline
  if (this.registrationDeadline) this.expiryDate = this.registrationDeadline;
  else if (this.expiryDate) this.registrationDeadline = this.expiryDate;

  // Sync driveDate
  if (this.driveDate) {
    if (!this.interviewDate) this.interviewDate = this.driveDate;
    if (!this.assessmentDate) this.assessmentDate = this.driveDate;
  } else if (this.interviewDate) {
    this.driveDate = this.interviewDate;
  }

  // Sync eligibility criteria
  if (this.minCGPA !== undefined) this.minimumCGPA = this.minCGPA;
  else if (this.minimumCGPA !== undefined) this.minCGPA = this.minimumCGPA;

  if (this.maxBacklogs !== undefined) this.maximumBacklogs = this.maxBacklogs;
  else if (this.maximumBacklogs !== undefined) this.maxBacklogs = this.maximumBacklogs;

  if (this.branches && this.branches.length > 0) this.eligibleDepartments = this.branches;
  else if (this.eligibleDepartments && this.eligibleDepartments.length > 0) this.branches = this.eligibleDepartments;

  if (this.batches && this.batches.length > 0) this.eligibleBatches = this.batches;
  else if (this.eligibleBatches && this.eligibleBatches.length > 0) this.batches = this.eligibleBatches;

  // Sync applyLink
  if (this.applyLink) this.registrationLink = this.applyLink;
  else if (this.registrationLink) this.applyLink = this.registrationLink;

  // Normalize createdByRole
  if (this.createdByRole) {
    const roleUpper = this.createdByRole.toUpperCase();
    if (roleUpper === 'ADMIN') {
      this.createdByRole = 'ADMIN';
    } else if (roleUpper === 'ALUMNI') {
      this.createdByRole = 'ALUMNI';
    }
  }

  // Normalize placementType
  if (!this.placementType) {
    if (this.createdByRole === 'ADMIN') {
      this.placementType = 'OFFICIAL';
    } else {
      this.placementType = 'ALUMNI_REFERRAL';
    }
  }

  next();
});

module.exports = {
  Placement: mongoose.model('Placement', PlacementSchema, 'placements'),
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
    password: { type: String, default: '' },
    passwordHistory: { type: [String], default: [] },
    isEmailVerified: { type: Boolean, default: false },
    mfaSecret: { type: String, default: '' },
    mfaEnabled: { type: Boolean, default: false },
    mfaType: { type: String, default: 'email' },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    name: { type: String, default: '' },
    role: { type: String, default: 'student' },
    department: { type: String, default: '' },
    batch: { type: String, default: '' },
    cgpa: { type: Number, default: 0.0 },
    backlogs: { type: Number, default: 0 },
    academicYear: { type: String, default: '' },
    skills: { type: [String], default: [] },
    bio: { type: String, default: '' },
    interests: { type: [String], default: [] },
    clubs: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    profileImageUrl: { type: String, default: '' },
    college: { type: String, default: '', index: true },
    photos: { type: [String], default: [] },
    collegeEmail: { type: String, default: '', index: true },
    personalEmail: { type: String, default: '', index: true, get: decryptDeterministic, set: encryptDeterministic },
    rollNumber: { type: String, default: '', get: decryptDeterministic, set: encryptDeterministic },
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
    resonanceEnabled: { type: Boolean, default: true },
    isOnline: { type: Boolean, default: false, index: true },
    lastSeen: { type: Date, default: Date.now, index: true },
    lastActivity: { type: Date, default: Date.now },
    socketId: { type: String, default: null },
    onboardingCompleted: { type: Boolean, default: false },
    onboardingStep: { type: Number, default: 1 }
  }, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }), 'users'),

  StudentPost: mongoose.model('StudentPost', new mongoose.Schema({
    userId: { type: String, required: true },
    college: { type: String, default: 'SR University', index: true },
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
    userId: { type: String, required: true, index: true },
    recipientId: { type: String, index: true },
    senderId: { type: String, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    message: { type: String, default: '' },
    read: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false, index: true },
    relatedId: { type: String, default: '' },
    entityId: { type: String },
    entityType: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    softDeleted: { type: Boolean, default: false, index: true }
  }, { timestamps: true }), 'notifications'),

  Message: mongoose.model('Message', new mongoose.Schema({
    matchId: { type: String, required: true, index: true },
    conversationId: { type: String, index: true },
    senderId: { type: String, required: true, index: true },
    college: { type: String, default: 'SR University', index: true },
    messageType: { type: String, enum: ['text', 'image', 'document', 'link', 'file'], default: 'text', index: true },
    text: { type: String, default: '' },
    attachments: [{
      fileName: { type: String, required: true },
      fileSize: { type: Number, required: true },
      mimeType: { type: String, required: true },
      downloadUrl: { type: String, required: true },
      thumbnailUrl: { type: String }
    }],
    documentUrl: { type: String },
    documentName: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
    url: { type: String },
    title: { type: String },
    description: { type: String },
    thumbnail: { type: String },
    imageUrl: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
    retentionMode: { type: String, enum: ['VIEW_ONCE', 'NEVER_DELETE'], default: 'NEVER_DELETE', index: true },
    viewed: { type: Boolean, default: false, index: true },
    viewedAt: { type: Date },
    deletedAt: { type: Date, index: true },
    read: { type: Boolean, default: false, index: true },
    seenAt: { type: Date },
    deliveredAt: { type: Date },
    receiverId: { type: String, index: true },
    status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent', index: true },
    resonanceState: { 
      type: String, 
      enum: ['dormant', 'bridged', 'harmonized', 'vibrant', 'resonating', 'absorbed'], 
      default: 'dormant' 
    },
    reactions: [{
      emoji: String,
      userId: String,
      timestamp: { type: Date, default: Date.now }
    }],
    isForwarded: { type: Boolean, default: false },
    forwardedFrom: { type: String },
    forwardedBy: { type: String },
    forwardedAt: { type: Date },
    forwardCount: { type: Number, default: 0 },
    pinned: { type: Boolean, default: false, index: true },
    pinnedAt: { type: Date },
    pinnedBy: { type: String, index: true },
    bookmarkedBy: { type: [String], default: [], index: true },
    deletedForUsers: { type: [String], default: [], index: true },
    deletedForEveryone: { type: Boolean, default: false, index: true },
    replyToMessageId: { type: String, default: null, index: true }
  }, { timestamps: true }), 'messages'),

  GroupChat: mongoose.model('GroupChat', new mongoose.Schema({
    name: { type: String, required: true },
    college: { type: String, default: 'SR University', index: true },
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
    messageType: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    text: { type: String, default: '' },
    attachments: [{
      fileName: { type: String, required: true },
      fileSize: { type: Number, required: true },
      mimeType: { type: String, required: true },
      downloadUrl: { type: String, required: true },
      thumbnailUrl: { type: String }
    }],
    timestamp: { type: Date, default: Date.now },
    isForwarded: { type: Boolean, default: false },
    forwardedFrom: { type: String },
    forwardedBy: { type: String },
    forwardedAt: { type: Date },
    forwardCount: { type: Number, default: 0 }
  }, { timestamps: true }), 'group_messages'),

  Story: mongoose.model('Story', new mongoose.Schema({
    userId: { type: String, required: true },
    college: { type: String, default: 'SR University', index: true },
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
  domain: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  logoURL: { type: String, default: '' },
  adminContact: { type: String, default: '' }
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
  email: { type: String, required: true, unique: true, index: true },
  loginAttempts: { type: Number, default: 0 },
  otpRequests: { type: Number, default: 0 },
  lastLogin: { type: Date },
  lastOtpRequest: { type: Date },
  lockUntil: { type: Date },
  failedAttempts: { type: Number, default: 0 },
  successfulLoginsToday: { type: Number, default: 0 },
  successfulLoginsWindowStart: { type: Date, default: Date.now },
  otpRequestsWindowStart: { type: Date, default: Date.now }
}, { timestamps: true });
LoginAttemptSchema.index({ email: 1 });

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
SecurityLogSchema.index({ email: 1 });
SecurityLogSchema.index({ status: 1 });
SecurityLogSchema.index({ 'details.sessionId': 1 });
SecurityLogSchema.index({ ipAddress: 1 });

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


