/**
 * Enhanced Alumni Feed Types
 * Extends existing Alumni types with comprehensive post system
 */

// ============================================
// Post Types
// ============================================

export type PostType = 'job' | 'referral' | 'general' | 'link' | 'internship' | 'achievement' | 'tip' | 'resource' | 'event';

export type PostVisibility = 'public' | 'private' | 'connections-only';

export type PostApprovalStatus = 'pending' | 'approved' | 'rejected';

// ============================================
// Enhanced Alumni Post Interface
// ============================================

export interface AlumniPostEnhanced {
  id: string;
  userId: string;
  collegeId: string;

  // Content
  title: string;
  content: string;
  type: PostType; // job, referral, general, link

  // Type-specific fields
  company?: string;
  jobRole?: string; // For jobs/referrals
  salary?: string;
  experience?: string; // e.g., "3-5 years"
  applyLink?: string;
  deadline?: string; // ISO timestamp
  skills?: string[];

  // Rich content
  imageUrls?: string[];
  videoUrls?: string[];

  // External links
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;

  // Metadata
  tags?: string[];
  mentions?: string[];

  // Visibility
  visibility: PostVisibility;

  // Engagement metrics
  likes: number;
  comments: number;
  reposts?: number;
  bookmarks: number;
  views: number;

  // Status
  approvalStatus: PostApprovalStatus;
  isPinned: boolean;
  isFeatured: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // For frontend display
  author?: AlumniProfile;
  currentUserLiked?: boolean;
  currentUserBookmarked?: boolean;
  isOwn?: boolean;
}

// ============================================
// Post Comment Interface
// ============================================

export interface AlumniPostComment {
  id: string;
  postId: string;
  userId: string;
  collegeId: string;

  content: string;
  imageUrls?: string[];

  // Nested replies
  replies?: AlumniPostComment[];
  replyToCommentId?: string;

  // Engagement
  likes: number;
  currentUserLiked?: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Author info
  author?: {
    id: string;
    name: string;
    profileImageUrl?: string;
    role?: string;
    company?: string;
  };
}

// ============================================
// Post Interaction Interfaces
// ============================================

export interface PostLike {
  id: string;
  userId: string;
  postId: string;
  collegeId: string;
  createdAt: string;
}

export interface PostBookmark {
  id: string;
  userId: string;
  postId: string;
  collegeId: string;
  createdAt: string;
  post?: AlumniPostEnhanced;
}

export interface PostShare {
  id: string;
  userId: string;
  postId: string;
  collegeId: string;
  sharedOn: 'linkedin' | 'twitter' | 'email' | 'copy-link';
  createdAt: string;
}

export interface PostView {
  id: string;
  userId: string;
  postId: string;
  collegeId: string;
  viewDuration?: number; // seconds
  createdAt: string;
}

// ============================================
// Feed Request/Response Types
// ============================================

export interface GetFeedParams {
  page?: number;
  limit?: number;
  type?: PostType;
  company?: string;
  skills?: string[];
  sortBy?: 'recent' | 'trending' | 'popular';
  search?: string;
  visibility?: PostVisibility;
}

export interface CreatePostInput {
  title: string;
  content: string;
  type: PostType;
  company?: string;
  jobRole?: string;
  salary?: string;
  experience?: string;
  applyLink?: string;
  deadline?: string;
  skills?: string[];
  imageUrls?: string[];
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  tags?: string[];
  visibility?: PostVisibility;
}

export interface UpdatePostInput extends Partial<CreatePostInput> {
  id: string;
}

export interface FeedResponse {
  posts: AlumniPostEnhanced[];
  total: number;
  hasMore: boolean;
  cursor?: string;
}

export interface CommentResponse {
  comment: AlumniPostComment;
  post: AlumniPostEnhanced;
}

// ============================================
// Filter and Search Types
// ============================================

export interface FeedFilterParams {
  type?: PostType;
  company?: string;
  skills?: string[];
  dateRange?: {
    from: string; // ISO date
    to: string;
  };
  visibility?: PostVisibility;
  approvalStatus?: PostApprovalStatus;
}

export interface FeedSearchParams {
  query: string;
  type?: PostType;
  company?: string;
  skills?: string[];
  page?: number;
  limit?: number;
}

// ============================================
// User Statistics
// ============================================

export interface UserPostStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalBookmarks: number;
  postsByType: Record<PostType, number>;
  totalEngagement: number;
}

export interface PostStats {
  postId: string;
  views: number;
  likes: number;
  comments: number;
  bookmarks: number;
  shares: number;
  engagementRate: number; // (likes + comments + bookmarks) / views
}

// ============================================
// API Response Types
// ============================================

export interface PostApiResponse {
  success: boolean;
  message: string;
  data: AlumniPostEnhanced;
  timestamp: string;
}

export interface FeedApiResponse {
  success: boolean;
  message: string;
  data: FeedResponse;
  timestamp: string;
}

export interface CommentApiResponse {
  success: boolean;
  message: string;
  data: CommentResponse;
  timestamp: string;
}

export interface StatsApiResponse {
  success: boolean;
  message: string;
  data: PostStats;
  timestamp: string;
}

// ============================================
// Real-time Event Types
// ============================================

export interface PostEvent {
  type: 'created' | 'updated' | 'deleted' | 'featured';
  post: AlumniPostEnhanced;
  timestamp: string;
}

export interface CommentEvent {
  type: 'created' | 'deleted';
  comment: AlumniPostComment;
  postId: string;
  timestamp: string;
}

export interface LikeEvent {
  type: 'liked' | 'unliked';
  userId: string;
  postId: string;
  likeCount: number;
  timestamp: string;
}

// ============================================
// Pagination Types
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

// ============================================
// Constants
// ============================================

export const POST_TYPE_LABELS: Record<PostType, string> = {
  job: '💼 Job Opportunity',
  referral: '🤝 Direct Referral',
  internship: '🎓 Internship Opening',
  achievement: '🏆 Milestone & Achievement',
  tip: '💡 Career Tip & Advice',
  resource: '📚 Shared Resource',
  event: '📅 Event Announcement',
  general: '📝 General Update',
  link: '🔗 External Link',
};

export const POST_TYPE_COLORS: Record<PostType, string> = {
  job: 'from-blue-600 to-blue-500',
  referral: 'from-emerald-600 to-emerald-500',
  internship: 'from-indigo-600 to-indigo-500',
  achievement: 'from-amber-500 to-orange-500',
  tip: 'from-yellow-500 to-amber-500',
  resource: 'from-pink-600 to-pink-500',
  event: 'from-cyan-600 to-cyan-500',
  general: 'from-purple-600 to-purple-500',
  link: 'from-slate-600 to-slate-500',
};

export const FEED_PAGINATION_LIMIT = 10;

export const FEED_SORT_OPTIONS = [
  { value: 'recent', label: '🕐 Most Recent' },
  { value: 'trending', label: '🔥 Trending' },
  { value: 'popular', label: '⭐ Most Popular' },
];

export const POST_VISIBILITY_OPTIONS: PostVisibility[] = ['public', 'private', 'connections-only'];

// ============================================
// Form Validation Types
// ============================================

export interface PostFormErrors {
  title?: string;
  content?: string;
  company?: string;
  jobRole?: string;
  applyLink?: string;
  deadline?: string;
}

// ============================================
// API Constants
// ============================================

export const ALUMNI_FEED_API_BASE = '/api/alumni';

export const ALUMNI_FEED_ENDPOINTS = {
  // Posts
  CREATE_POST: `${ALUMNI_FEED_API_BASE}/posts`,
  GET_FEED: `${ALUMNI_FEED_API_BASE}/posts`,
  GET_POST: (postId: string) => `${ALUMNI_FEED_API_BASE}/posts/${postId}`,
  UPDATE_POST: (postId: string) => `${ALUMNI_FEED_API_BASE}/posts/${postId}`,
  DELETE_POST: (postId: string) => `${ALUMNI_FEED_API_BASE}/posts/${postId}`,

  // Engagement
  LIKE_POST: (postId: string) => `${ALUMNI_FEED_API_BASE}/posts/${postId}/like`,
  GET_COMMENTS: (postId: string) => `${ALUMNI_FEED_API_BASE}/posts/${postId}/comments`,
  CREATE_COMMENT: (postId: string) => `${ALUMNI_FEED_API_BASE}/posts/${postId}/comments`,
  BOOKMARK_POST: (postId: string) => `${ALUMNI_FEED_API_BASE}/posts/${postId}/bookmark`,
  SHARE_POST: (postId: string) => `${ALUMNI_FEED_API_BASE}/posts/${postId}/share`,

  // User data
  GET_MY_POSTS: `${ALUMNI_FEED_API_BASE}/my-posts`,
  GET_BOOKMARKS: `${ALUMNI_FEED_API_BASE}/bookmarks`,
  GET_MY_STATS: `${ALUMNI_FEED_API_BASE}/stats`,

  // Search & Discover
  SEARCH: `${ALUMNI_FEED_API_BASE}/search`,
  TRENDING: `${ALUMNI_FEED_API_BASE}/trending`,
  BY_COMPANY: (company: string) => `${ALUMNI_FEED_API_BASE}/by-company/${company}`,
};
