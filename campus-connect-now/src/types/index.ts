export interface User {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'non-binary' | 'other';
  bio: string;
  interests: string[];
  photos: string[];
  college: string;
  email?: string;
  distance?: number;
  isAnonymous?: boolean;
  anonymousName?: string;
  course?: string;
  year?: string;
  isOnline?: boolean;
  lastSeen?: string;
  profileViewers?: string[];
  lastActive?: string;
  
  // Profile Strength & Professional fields
  personalEmail?: string;
  skills?: string[];
  clubs?: string[];
  achievements?: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  projects?: string[];
  careerGoals?: string;
  profileCompletion?: number;
}

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  fromUser: User;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Match {
  id: string;
  userId: string;
  user: User;
  matchedAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isRevealed: boolean;
}

export type ReactionEmoji = '❤️' | '🔥' | '😂' | '👀' | '👍';

export interface Reaction {
  emoji: ReactionEmoji;
  userId: string;
  timestamp: string;
}

export interface Attachment {
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
  thumbnailUrl?: string;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  messageType?: 'text' | 'image' | 'file';
  text: string;
  attachments?: Attachment[];
  timestamp: string;
  read: boolean;
  status?: 'sent' | 'delivered' | 'seen';
  resonanceState?: 'dormant' | 'bridged' | 'harmonized' | 'vibrant' | 'resonating' | 'absorbed';
  reactions?: Reaction[];
  stableKey?: string;
}

export type PostCategory = 'general' | 'events' | 'clubs' | 'announcements';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  isAnonymous: boolean;
  content: string;
  image?: string;
  likes: number;
  isLiked: boolean;
  comments: Comment[];
  createdAt: string;
  category: PostCategory;
  reactions?: Record<ReactionEmoji, string[]>;
  viewCount?: number;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export type StoryType = 'image' | 'text';

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  image: string;
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewed: boolean;
  type?: StoryType;
  textContent?: string;
  bgColor?: string;
  viewers?: string[];
}

export interface GroupChat {
  id: string;
  name: string;
  avatar: string;
  members: string[];
  createdBy: string;
  createdAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  reactions?: Reaction[];
}

export interface Notification {
  id: string;
  type: 'match' | 'message' | 'like' | 'comment' | 'request' | 'view';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
}

export interface ProfileSetupData {
  name: string;
  age: number | null;
  gender: string;
  bio: string;
  interests: string[];
  photos: string[];
  // Student fields
  course?: string;
  year?: string;
  personalEmail?: string;
  academicYear?: string;
  cgpa?: number;
  backlogs?: number;
  // Alumni fields
  passoutYear?: string;
  batch?: string;
  company?: string;
  jobRole?: string;
  experience?: string;
  role?: 'student' | 'alumni'; // User role
  collegeEmail?: string;
  collegeEmailVerified?: boolean;
  personalEmailVerified?: boolean;
  alumniVerified?: boolean;

  // Profile Strength & Professional fields
  skills?: string[];
  clubs?: string[];
  achievements?: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  projects?: string[];
  careerGoals?: string;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  showActiveStatus?: boolean;
  showReadReceipts?: boolean;
  showTypingIndicator?: boolean;
  showOnlinePresence?: boolean;
  autoSeen?: boolean;
  notificationEnabled?: boolean;
  appearance?: 'dark' | 'light' | 'system';
  language?: string;
}

/**
 * Alumni-specific types
 */
export type AlumniPostType = 'post' | 'job' | 'referral' | 'experience';

export interface AlumniProfile {
  id: string;
  uid: string;
  name: string;
  batch: string; // e.g., "2016-2020"
  department: string; // course/branch
  company: string;
  role: string; // job title
  experience: string; // e.g., "3-5 years"
  profileImage: string;
  bio: string;
  skills: string[];
  collegeId: string;
  email: string;
  joinedAt: string;
  updateAt: string;
}

export interface AlumniPost {
  id: string;
  alumniId: string;
  alumniName: string;
  alumniAvatar: string;
  batch: string;
  company: string;
  role: string;
  content: string;
  type: AlumniPostType; // post, job, referral, experience
  images?: string[];
  video?: string;
  tags: string[]; // 'Hiring', 'Referral', 'Experience', etc
  collegeId: string;
  createdAt: string;
  updatedAt: string;
  likes: number;
  isLiked: boolean;
  comments: AlumniComment[];
  viewCount: number;
}

export interface AlumniComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}
