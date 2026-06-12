/**
 * Alumni System - Type Definitions
 * Extends existing Campus Connect types with alumni-specific interfaces
 */

// ============================================
// Core Alumni System Types
// ============================================

export interface AlumniProfile {
  id: string;
  userId: string;
  collegeId: string;
  email: string;
  name: string;
  batch: string; // 2020, 2021, etc.
  department: string;
  
  // Professional Info
  company?: string;
  role?: string;
  designation?: string;
  salaryRange?: string; // '10-15L', '15-20L', etc.
  placementType?: 'on-campus' | 'off-campus' | 'startup' | 'higher-studies';
  
  // Personal Content
  story?: string; // Journey narrative
  achievements?: string[];
  skills?: string[];
  linkedinUrl?: string;
  portfolioUrl?: string;
  
  // Media
  profileImageUrl?: string;
  coverImageUrl?: string;
  galleryImages?: string[];
  
  // Status
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isFeatured: boolean;
  viewCount: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface AlumniPost {
  id: string;
  userId: string;
  alumniId: string;
  collegeId: string;
  
  content: string;
  imageUrls?: string[];
  videoUrls?: string[];
  
  visibility: 'public' | 'private';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  
  // Engagement
  likeCount: number;
  commentCount: number;
  shareCount?: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // For feed display
  author?: AlumniProfile;
  currentUserLiked?: boolean;
}

export interface AlumniVideo {
  id: string;
  userId: string;
  alumniId: string;
  collegeId: string;
  
  // Video Info
  title: string;
  description?: string;
  company?: string;
  role?: string;
  batch?: string;
  videoUrl: string; // YouTube or storage URL
  thumbnailUrl?: string;
  duration?: number; // in seconds
  
  // Categorization
  videoType: 'interview' | 'journey' | 'tips' | 'placement' | 'other';
  tags?: string[];
  
  // Status
  approvalStatus: 'pending' | 'approved' | 'rejected';
  viewCount: number;
  likeCount: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // For display
  author?: AlumniProfile;
  currentUserLiked?: boolean;
  currentUserViewed?: boolean;
}

export interface AlumniPostComment {
  id: string;
  userId: string;
  postId: string;
  collegeId: string;
  
  content: string;
  likesCount: number;
  
  createdAt: string;
  updatedAt: string;
  
  // For display
  author?: {
    id: string;
    name: string;
    profileImageUrl?: string;
  };
}

export interface AlumniBookmark {
  id: string;
  userId: string;
  alumniId: string;
  collegeId: string;
  
  createdAt: string;
}

export interface AlumniVideoView {
  id: string;
  userId: string;
  videoId: string;
  collegeId: string;
  
  viewDuration: number; // in seconds
  watchedPercentage: number; // 0-100
  
  createdAt: string;
}

// ============================================
// Filter & Search Types
// ============================================

export interface AlumniFilterParams {
  batch?: string[];
  department?: string[];
  company?: string[];
  placementType?: string[];
  skills?: string[];
  searchQuery?: string;
  sortBy?: 'recent' | 'popular' | 'featured';
  limit?: number;
  offset?: number;
}

export interface AlumniSearchResult {
  profiles: AlumniProfile[];
  total: number;
  hasMore: boolean;
}

export interface VideoFilterParams {
  company?: string[];
  batch?: string[];
  role?: string[];
  videoType?: string[];
  tags?: string[];
  sortBy?: 'recent' | 'views' | 'likes';
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// Form Types
// ============================================

export interface CreateAlumniProfileInput {
  name: string;
  batch: string;
  department: string;
  company?: string;
  role?: string;
  salaryRange?: string;
  placementType?: 'on-campus' | 'off-campus' | 'startup' | 'higher-studies';
  story?: string;
  achievements?: string[];
  skills?: string[];
  linkedinUrl?: string;
  portfolioUrl?: string;
  profileImageUrl?: string;
  galleryImages?: string[];
}

export interface UpdateAlumniProfileInput extends Partial<CreateAlumniProfileInput> {}

export interface CreateAlumniPostInput {
  content: string;
  imageUrls?: string[];
  videoUrls?: string[];
  visibility?: 'public' | 'private';
}

export interface CreateAlumniVideoInput {
  title: string;
  description?: string;
  company?: string;
  role?: string;
  batch?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  videoType: 'interview' | 'journey' | 'tips' | 'placement' | 'other';
  tags?: string[];
}

export interface CreateCommentInput {
  content: string;
  postId: string;
}

// ============================================
// Alumni Sub-Resource Types
// ============================================

export interface AlumniReferral {
  id: string;
  alumniId: string;
  company: string;
  role: string;
  location?: string;
  salary?: string;
  experience?: string;
  eligibility?: string;
  deadline?: string;
  applicationLink?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoadmapStep {
  title: string;
  description: string;
  resources?: string[];
}

export interface AlumniRoadmap {
  id: string;
  alumniId: string;
  title: string;
  description?: string;
  steps: RoadmapStep[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AlumniResource {
  id: string;
  alumniId: string;
  title: string;
  description?: string;
  link?: string;
  categoryType: 'pdf' | 'course' | 'doc' | 'interview_prep' | 'note';
  createdAt?: string;
  updatedAt?: string;
}

export interface AlumniAchievement {
  id: string;
  alumniId: string;
  title: string;
  description?: string;
  type: 'Promotion' | 'Certification' | 'Award' | 'Publication';
  date?: string;
  issuer?: string;
  link?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================
// Analytics Types
// ============================================

export interface AlumniAnalytics {
  totalProfiles: number;
  totalPosts: number;
  totalVideos: number;
  totalEngagement: number;
  
  topAlumni: AlumniProfile[];
  topVideos: AlumniVideo[];
  trendingSkills: Array<{ skill: string; count: number }>;
  placementStats: {
    onCampus: number;
    offCampus: number;
    startup: number;
    higherStudies: number;
  };
}

export interface UserEngagementMetrics {
  profilesViewed: number;
  postsLiked: number;
  videosWatched: number;
  bookmarksCreated: number;
  commentsLeft: number;
}

// ============================================
// Extended Auth Types
// ============================================

export interface ExtendedAuthState {
  isAlumni?: boolean;
  alumniProfileId?: string;
  alumniApprovalStatus?: 'pending' | 'approved' | 'rejected';
}

// ============================================
// Enum Helpers
// ============================================

export const BatchOptions = [
  '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'
];

export const PlacementTypeOptions = [
  { value: 'on-campus' as const, label: 'On Campus' },
  { value: 'off-campus' as const, label: 'Off Campus' },
  { value: 'startup' as const, label: 'Startup' },
  { value: 'higher-studies' as const, label: 'Higher Studies' },
];

export const VideoTypeOptions = [
  { value: 'interview' as const, label: 'Interview Experience' },
  { value: 'journey' as const, label: 'Career Journey' },
  { value: 'tips' as const, label: 'Interview Tips' },
  { value: 'placement' as const, label: 'Placement Journey' },
  { value: 'other' as const, label: 'Other' },
];

export const SalaryRangeOptions = [
  '5-10L',
  '10-15L',
  '15-20L',
  '20-25L',
  '25-30L',
  '30L+',
  'Not Disclosed',
];

// ============================================
// Constants
// ============================================

export const ALUMNI_CONTENT_LIMITS = {
  maxImageSize: 5 * 1024 * 1024, // 5MB
  maxVideoSize: 100 * 1024 * 1024, // 100MB
  maxPostLength: 2000,
  maxStoryLength: 5000,
  maxImagesPerPost: 10,
  maxVideosPerPost: 3,
  maxSkillsPerProfile: 20,
  maxAchievementsPerProfile: 15,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowedVideoTypes: ['video/mp4', 'video/mpeg'],
};

export const ALUMNI_PAGINATION = {
  profilesPerPage: 12,
  postsPerPage: 10,
  videosPerPage: 12,
  commentsPerPage: 20,
};

export const ALUMNI_CACHE_TTL = {
  profiles: 5 * 60 * 1000, // 5 minutes
  posts: 3 * 60 * 1000, // 3 minutes
  videos: 5 * 60 * 1000, // 5 minutes
  analytics: 30 * 60 * 1000, // 30 minutes
};
