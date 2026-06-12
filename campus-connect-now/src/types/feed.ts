/**
 * Premium Alumni Feed Types
 * Comprehensive type definitions for the feed system
 */

export type PostType = 'text' | 'image' | 'video' | 'referral' | 'roadmap';

export interface PostTag {
  id: string;
  name: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'pink';
}

export interface PostMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface AlumniAuthor {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
  verified?: boolean;
  badges?: ('founder' | 'investor' | 'mentor' | 'speaker')[];
}

export interface Comment {
  id: string;
  authorId: string;
  author: AlumniAuthor;
  content: string;
  createdAt: string;
  likes?: number;
  replies?: Comment[];
}

export interface FeedPost {
  id: string;
  type: PostType;
  author: AlumniAuthor;
  content: string;
  media?: PostMedia[];
  tags: PostTag[];
  createdAt: string;
  updatedAt: string;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  isLiked?: boolean;
  isSaved?: boolean;
  commentList?: Comment[];
  
  // Referral-specific
  referralCompany?: string;
  referralPosition?: string;
  referralUrl?: string;
  
  // Roadmap-specific
  roadmapTitle?: string;
  roadmapSteps?: string[];
  roadmapProgress?: number;
}

export interface FeedResponse {
  posts: FeedPost[];
  hasMore: boolean;
  nextCursor?: string;
  total: number;
}

export interface PaginationState {
  page: number;
  limit: number;
  hasMore: boolean;
  isLoading: boolean;
  error?: string;
  nextCursor?: string;
}

export interface FeedFilter {
  postType?: PostType;
  tags?: string[];
  sortBy?: 'latest' | 'trending' | 'topLiked';
}
