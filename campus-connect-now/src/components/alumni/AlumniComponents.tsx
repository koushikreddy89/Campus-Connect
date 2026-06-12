/**
 * Alumni System - Core Components
 * Shared components for alumni features
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, MapPin, Briefcase, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { AlumniProfile, AlumniPost, AlumniVideo } from '@/types/alumni';
import { formatAlumniDesignation } from '@/utils/alumniUtils';

// ============================================
// Alumni Card Component
// ============================================

interface AlumniCardProps {
  profile: AlumniProfile;
  isBookmarked?: boolean;
  onBookmark?: (alumniId: string) => void;
  onClick?: (alumniId: string) => void;
  variant?: 'compact' | 'detailed';
}

export const AlumniCard: React.FC<AlumniCardProps> = ({
  profile,
  isBookmarked = false,
  onBookmark,
  onClick,
  variant = 'compact',
}) => {
  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmark?.(profile.id);
  };

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={() => onClick?.(profile.id)}
        className="cursor-pointer"
      >
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
          {/* Cover Image */}
          {profile.coverImageUrl && (
            <div className="h-32 bg-gradient-to-r from-primary/20 to-accent/20 overflow-hidden">
              <img
                src={profile.coverImageUrl}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-4 space-y-3">
            {/* Profile Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Avatar
                  src={profile.profileImageUrl}
                  alt={profile.name}
                  className="h-12 w-12 ring-2 ring-background -mt-6 relative z-10"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{profile.name}</h3>
                  <p className="text-xs text-muted-foreground">{profile.batch} • {profile.department}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                className="h-8 w-8 p-0"
              >
                <Bookmark
                  size={16}
                  className={isBookmarked ? 'fill-accent text-accent' : 'text-muted-foreground'}
                />
              </Button>
            </div>

            {/* Professional Info */}
            {(profile.company || profile.designation || (profile.role && profile.role.toLowerCase() !== 'alumni')) && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Briefcase size={14} />
                  <span>
                    {formatAlumniDesignation(profile)}
                  </span>
                </div>
              </div>
            )}

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {profile.skills.slice(0, 3).map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="text-xs"
                  >
                    {skill}
                  </Badge>
                ))}
                {profile.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{profile.skills.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Engagement */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>{profile.viewCount} views</span>
              {profile.isFeatured && (
                <Badge variant="default" className="text-xs">Featured</Badge>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Detailed variant
  return (
    <Card className="overflow-hidden">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar
              src={profile.profileImageUrl}
              alt={profile.name}
              className="h-20 w-20"
            />
            <div>
              <h2 className="text-2xl font-bold">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.batch} Batch</p>
              <div className="flex items-center gap-2 mt-2 text-sm">
                {profile.company && <Badge>{profile.company}</Badge>}
                {(profile.designation || (profile.role && profile.role.toLowerCase() !== 'alumni')) && (
                  <Badge variant="secondary">
                    {profile.designation || profile.role}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBookmark}
          >
            <Bookmark
              size={16}
              className={isBookmarked ? 'fill-current' : ''}
            />
          </Button>
        </div>

        {/* Bio/Story */}
        {profile.story && (
          <div>
            <h3 className="font-semibold mb-2">Career Journey</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{profile.story}</p>
          </div>
        )}

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="outline">{skill}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {profile.achievements && profile.achievements.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Achievements</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {profile.achievements.map((achievement, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span>{achievement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Links */}
        <div className="flex gap-2 pt-4 border-t">
          {profile.linkedinUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(profile.linkedinUrl, '_blank')}
            >
              <Globe size={16} className="mr-2" />
              LinkedIn
            </Button>
          )}
          {profile.portfolioUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(profile.portfolioUrl, '_blank')}
            >
              <Globe size={16} className="mr-2" />
              Portfolio
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

// ============================================
// Alumni Post Component
// ============================================

interface AlumniPostProps {
  post: AlumniPost;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  isCurrentUser?: boolean;
}

export const AlumniPostCard: React.FC<AlumniPostProps> = ({
  post,
  onLike,
  onComment,
  onDelete,
  isCurrentUser = false,
}) => {
  const handleLike = async () => {
    onLike?.(post.id);
  };

  return (
    <Card className="p-6">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4 flex-1">
          <Avatar
            src={post.author?.profileImageUrl}
            alt={post.author?.name || 'Author'}
            className="h-10 w-10"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{post.author?.name}</h3>
            <p className="text-xs text-muted-foreground">
              {post.author?.batch} • {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {isCurrentUser && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(post.id)}
          >
            Delete
          </Button>
        )}
      </div>

      {/* Post Content */}
      <p className="text-sm mb-4 leading-relaxed">{post.content}</p>

      {/* Images */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <div className={cn(
          'grid gap-2 mb-4',
          post.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
        )}>
          {post.imageUrls.slice(0, 4).map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`Post media ${idx + 1}`}
              className="rounded-lg w-full h-48 object-cover"
            />
          ))}
        </div>
      )}

      {/* Engagement Stats */}
      <div className="flex items-center gap-4 py-3 border-t border-b text-xs text-muted-foreground">
        <span>{post.likeCount} likes</span>
        <span>{post.commentCount} comments</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className="flex-1 justify-center"
        >
          <Heart
            size={16}
            className={liked ? 'fill-red-500 text-red-500' : ''}
          />
          <span className="ml-2">{liked ? 'Liked' : 'Like'}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onComment?.(post.id)}
          className="flex-1 justify-center"
        >
          <MessageCircle size={16} />
          <span className="ml-2">Comment</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-center"
        >
          <Share2 size={16} />
          <span className="ml-2">Share</span>
        </Button>
      </div>
    </Card>
  );
};

// ============================================
// Alumni Video Component
// ============================================

interface AlumniVideoProps {
  video: AlumniVideo;
  onLike?: (videoId: string) => void;
  onClick?: (videoId: string) => void;
}

export const AlumniVideoCard: React.FC<AlumniVideoProps> = ({
  video,
  onLike,
  onClick,
}) => {
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(video.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      onClick={() => onClick?.(video.id)}
      className="cursor-pointer"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-muted overflow-hidden group">
          <img
            src={video.thumbnailUrl || '/default-video-thumbnail.jpg'}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <div className="w-0 h-0 border-l-8 border-l-transparent border-r-0 border-t-5 border-t-transparent border-b-5 border-b-transparent flex items-center ml-1" />
            </div>
          </div>

          {/* Duration Badge */}
          {video.duration && (
            <Badge className="absolute bottom-3 right-3 bg-black/80">
              {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>

          {/* Author & Meta */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar
                src={video.author?.profileImageUrl}
                alt={video.author?.name || 'Author'}
                className="h-6 w-6"
              />
              <span className="truncate">{video.author?.name}</span>
            </div>
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {video.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Engagement */}
          <div className="flex items-center gap-3 pt-2 border-t text-xs text-muted-foreground">
            <button
              onClick={handleLike}
              className="flex items-center gap-1 hover:text-accent transition-colors"
            >
              <Heart
                size={14}
                className={video.currentUserLiked ? 'fill-red-500 text-red-500' : ''}
              />
              <span>{video.likeCount}</span>
            </button>
            <span className="flex items-center gap-1">
              👁️ {video.viewCount}
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// ============================================
// Alumni Grid Component
// ============================================

interface AlumniGridProps {
  items: AlumniProfile[] | AlumniVideo[];
  isLoading?: boolean;
  itemsPerRow?: number;
  onItemClick?: (itemId: string) => void;
  type?: 'profiles' | 'videos';
}

export const AlumniGrid: React.FC<AlumniGridProps> = ({
  items,
  isLoading = false,
  itemsPerRow = 3,
  onItemClick,
  type = 'profiles',
}) => {
  if (isLoading) {
    return (
      <div className={`grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-${itemsPerRow}`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-80 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No {type} found</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-${itemsPerRow}`}>
      {items.map((item) => {
        if (type === 'profiles') {
          return (
            <AlumniCard
              key={item.id}
              profile={item as AlumniProfile}
              onClick={onItemClick}
            />
          );
        } else {
          return (
            <AlumniVideoCard
              key={item.id}
              video={item as AlumniVideo}
              onClick={onItemClick}
            />
          );
        }
      })}
    </div>
  );
};

export default {
  AlumniCard,
  AlumniPostCard,
  AlumniVideoCard,
  AlumniGrid,
};
