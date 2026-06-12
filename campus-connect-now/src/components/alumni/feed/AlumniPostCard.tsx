/**
 * Alumni Post Card Component
 * Displays a single alumni post with engagement features
 */

import React, { memo, useCallback, useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MoreVertical, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { AlumniPostEnhanced, POST_TYPE_LABELS, POST_TYPE_COLORS } from '@/types/alumniPost';
import { alumniPostService } from '@/services/alumniPostService';
import { useAlumniPostFeedStore } from '@/store/alumniPostFeedStore';
import { toast } from 'sonner';
import { formatAlumniDesignation } from '@/utils/alumniUtils';

// ============================================
// Props
// ============================================

interface AlumniPostCardProps {
  post: AlumniPostEnhanced;
  onPostUpdate?: (postId: string, updates: any) => void;
  onDelete?: (postId: string) => void;
}

// ============================================
// Component
// ============================================

export const AlumniPostCard: React.FC<AlumniPostCardProps> = memo(
  ({ post, onPostUpdate, onDelete }) => {
    const [showComments, setShowComments] = useState(false);
    const [isCommenting, setIsCommenting] = useState(false);
    const updatePost = useAlumniPostFeedStore((s) => s.updatePost);
    const toggleBookmark = useAlumniPostFeedStore((s) => s.toggleBookmark);
    const togglePostLike = useAlumniPostFeedStore((s) => s.togglePostLike);

    // ================================
    // Handlers
    // ================================

    const handleLike = useCallback(async () => {
      try {
        togglePostLike(post.id); // Optimistic update

        const result = await alumniPostService.engagement.like(post.id);
        updatePost(post.id, {
          likes: result.likeCount,
          currentUserLiked: result.liked,
        });
        onPostUpdate?.(post.id, { likes: result.likeCount, currentUserLiked: result.liked });
      } catch (error) {
        console.error('Failed to like post:', error);
        togglePostLike(post.id); // Revert optimistic update
        toast.error('Failed to like post');
      }
    }, [post.id, togglePostLike, updatePost, onPostUpdate]);

    const handleBookmark = useCallback(async () => {
      try {
        toggleBookmark(post.id); // Optimistic update

        const result = await alumniPostService.engagement.bookmark(post.id);
        updatePost(post.id, {
          bookmarks: result.count,
          currentUserBookmarked: result.bookmarked,
        });
        onPostUpdate?.(post.id, {
          bookmarks: result.count,
          currentUserBookmarked: result.bookmarked,
        });

        toast.success(result.bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
      } catch (error) {
        console.error('Failed to bookmark post:', error);
        toggleBookmark(post.id); // Revert optimistic update
        toast.error('Failed to save post');
      }
    }, [post.id, toggleBookmark, updatePost, onPostUpdate]);

    const handleShare = useCallback(async () => {
      try {
        if (navigator.share) {
          await navigator.share({
            title: post.title,
            text: post.content.substring(0, 100),
            url: window.location.href,
          });
          await alumniPostService.engagement.share(post.id, 'native');
        } else {
          // Fallback: Copy link to clipboard
          const url = `${window.location.origin}/alumni/posts/${post.id}`;
          await navigator.clipboard.writeText(url);
          toast.success('Link copied to clipboard');
          await alumniPostService.engagement.share(post.id, 'copy-link');
        }
      } catch (error) {
        console.error('Failed to share post:', error);
      }
    }, [post.id, post.title, post.content]);

    const handleDelete = useCallback(async () => {
      if (!window.confirm('Are you sure you want to delete this post?')) return;

      try {
        await alumniPostService.posts.delete(post.id);
        onDelete?.(post.id);
        toast.success('Post deleted');
      } catch (error) {
        console.error('Failed to delete post:', error);
        toast.error('Failed to delete post');
      }
    }, [post.id, onDelete]);

    // ================================
    // Render
    // ================================

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/80 transition-colors shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            {/* Avatar */}
            <img
              src={post.author?.profileImageUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + post.userId}
              alt={post.author?.name}
              className="w-12 h-12 rounded-full border border-slate-600"
            />

            {/* Author Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">{post.author?.name || 'Alumni'}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${POST_TYPE_COLORS[post.type]} text-white`}>
                  {POST_TYPE_LABELS[post.type]}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {formatAlumniDesignation(post.author)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Menu */}
          <div className="relative group">
            <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
              <MoreVertical size={18} className="text-slate-400" />
            </button>
            <div className="hidden group-hover:block absolute right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10">
              {post.isOwn && (
                <>
                  <button className="w-full text-left px-4 py-2 hover:bg-slate-700/50 text-sm text-slate-300">
                    Edit Post
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700/50 text-sm text-red-400"
                  >
                    Delete Post
                  </button>
                </>
              )}
              <button className="w-full text-left px-4 py-2 hover:bg-slate-700/50 text-sm text-slate-300">
                Report Post
              </button>
            </div>
          </div>
        </div>

        {/* Title */}
        {post.title && (
          <h2 className="text-lg font-bold text-white mb-2">{post.title}</h2>
        )}

        {/* Content */}
        <p className="text-slate-300 text-base leading-relaxed mb-4 line-clamp-3">{post.content}</p>

        {/* Type-specific Info */}
        {post.type === 'job' && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              {post.company && (
                <div>
                  <p className="text-xs text-slate-400">Company</p>
                  <p className="text-sm font-medium text-white">{post.company}</p>
                </div>
              )}
              {post.jobRole && (
                <div>
                  <p className="text-xs text-slate-400">Role</p>
                  <p className="text-sm font-medium text-white">{post.jobRole}</p>
                </div>
              )}
              {post.salary && (
                <div>
                  <p className="text-xs text-slate-400">Salary</p>
                  <p className="text-sm font-medium text-white">{post.salary}</p>
                </div>
              )}
              {post.experience && (
                <div>
                  <p className="text-xs text-slate-400">Experience</p>
                  <p className="text-sm font-medium text-white">{post.experience}</p>
                </div>
              )}
            </div>

            {post.skills && post.skills.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-xs text-slate-400 mb-2">Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {post.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {post.applyLink && (
              <a
                href={post.applyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium rounded-lg transition-all"
              >
                <span>Apply Now</span>
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        )}

        {/* Images */}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            {post.imageUrls.slice(0, 2).map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Post image ${idx + 1}`}
                className="rounded-lg object-cover w-full h-32 hover:scale-105 transition-transform cursor-pointer"
              />
            ))}
            {post.imageUrls.length > 2 && (
              <div className="relative rounded-lg overflow-hidden h-32 bg-slate-700/50 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">+{post.imageUrls.length - 2}</span>
              </div>
            )}
          </div>
        )}

        {/* External Link */}
        {post.linkUrl && post.type === 'link' && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors group"
          >
            {post.linkImage && (
              <img
                src={post.linkImage}
                alt={post.linkTitle}
                className="w-full h-40 object-cover rounded-md mb-3"
              />
            )}
            <p className="font-semibold text-white text-sm group-hover:text-blue-400 transition-colors">
              {post.linkTitle}
            </p>
            {post.linkDescription && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{post.linkDescription}</p>
            )}
          </a>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <a
                key={tag}
                href={`#`}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                #{tag}
              </a>
            ))}
          </div>
        )}

        {/* Engagement Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-400 py-4 border-t border-b border-slate-700/50 mb-4">
          <span>{post.likes} likes</span>
          <span>{post.comments} comments</span>
          <span>{post.views} views</span>
          {post.bookmarks > 0 && <span>{post.bookmarks} bookmarks</span>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLike}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
              post.currentUserLiked
                ? 'bg-red-500/20 text-red-400'
                : 'hover:bg-slate-700/50 text-slate-400'
            }`}
          >
            <Heart
              size={18}
              fill={post.currentUserLiked ? 'currentColor' : 'none'}
            />
            <span>Like</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowComments(!showComments)}
            className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-700/50 rounded-lg transition-all text-slate-400"
          >
            <MessageCircle size={18} />
            <span>Comment</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-700/50 rounded-lg transition-all text-slate-400"
          >
            <Share2 size={18} />
            <span>Share</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleBookmark}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
              post.currentUserBookmarked
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'hover:bg-slate-700/50 text-slate-400'
            }`}
          >
            <Bookmark
              size={18}
              fill={post.currentUserBookmarked ? 'currentColor' : 'none'}
            />
            <span>Save</span>
          </motion.button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            {/* Add Comment Input */}
            <div className="flex gap-3 mb-4">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=current-user"
                alt="Your avatar"
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1">
                <textarea
                  placeholder="Write a comment..."
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none"
                  rows={2}
                />
                <button className="mt-2 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                  Post Comment
                </button>
              </div>
            </div>

            {/* Comments List Placeholder */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              <p className="text-sm text-slate-500">Loading comments...</p>
            </div>
          </div>
        )}
      </motion.div>
    );
  }
);

AlumniPostCard.displayName = 'AlumniPostCard';

export default AlumniPostCard;
