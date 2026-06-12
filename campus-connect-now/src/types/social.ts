/**
 * Alumni Social Types
 */

export interface AlumniProfile {
  _id: string;
  name: string;
  profilePic?: string;
  company?: string;
  position?: string;
  bio?: string;
  college: string;
  interests?: string[];
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
  createdAt: string;
}

export interface AlumniCard {
  _id: string;
  name: string;
  profilePic?: string;
  company?: string;
  position?: string;
  bio?: string;
  college: string;
  interests?: string[];
  followerCount: number;
  createdAt: string;
}

export interface Follow {
  _id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface SocialPost {
  _id: string;
  title: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'referral' | 'roadmap';
  imageUrl?: string;
  createdBy: {
    _id: string;
    name: string;
    profilePic?: string;
    company?: string;
    position?: string;
  };
  likes: string[];
  likeCount: number;
  comments: SocialComment[];
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface SocialComment {
  _id: string;
  userId: {
    _id: string;
    name: string;
    profilePic?: string;
  };
  text: string;
  createdAt: string;
}

export interface FeedResponse {
  posts: SocialPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface DiscoveryResponse {
  alumni: AlumniCard[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TopAlumniResponse {
  alumni: AlumniProfile[];
}
