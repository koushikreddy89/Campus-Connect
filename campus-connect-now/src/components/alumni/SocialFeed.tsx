/**
 * Alumni Social Feed Component
 * Displays posts from followed alumni with like and comment functionality
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Loader2 } from 'lucide-react';
import { useSocialStore } from '@/store/socialStore';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface SocialFeedProps {
  type?: 'text' | 'image' | 'video' | 'referral' | 'roadmap';
  onPostsLoaded?: (count: number) => void;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ type, onPostsLoaded }) => {
  const navigate = useNavigate();
  const observerTarget = useRef<HTMLDivElement>(null);
  const uid = useAuthStore(s => s.uid);

  const {
    feedPosts,
    feedLoading,
    feedError,
    fetchSocialFeed,
    loadMoreFeed,
    likePost,
    unlikePost,
    addComment,
  } = useSocialStore();

  useEffect(() => {
    fetchSocialFeed(1, 20, type);
  }, [type, fetchSocialFeed]);

  useEffect(() => {
    if (onPostsLoaded) {
      onPostsLoaded(feedPosts.length);
    }
  }, [feedPosts.length, onPostsLoaded]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !feedLoading && feedPosts.length > 0) {
          loadMoreFeed();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [feedLoading, feedPosts.length, loadMoreFeed]);

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (error) {
      console.error('Failed to update like:', error);
    }
  };

  const handleComment = async (postId: string) => {
    // TODO: Open comment modal
    console.log('Comment on post:', postId);
  };

  const handleViewProfile = (createdBy: string) => {
    navigate(`/alumni/${createdBy}`);
  };

  if (feedLoading && feedPosts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (feedError && feedPosts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-center">
        <div>
          <p className="text-red-500 mb-2">{feedError}</p>
          <button
            onClick={() => fetchSocialFeed(1, 20, type)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (feedPosts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-center">
        <div>
          <p className="text-gray-500 mb-2">No posts yet. Start following alumni to see their updates!</p>
          <button
            onClick={() => navigate('/alumni/discover')}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Discover Alumni
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Posts */}
      <div className="space-y-4">
        {feedPosts.map((post, index) => (
          <motion.div
            key={post._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700"
          >
            {/* Post Header */}
            <div className="p-4 border-b border-slate-700 flex items-center gap-3">
              <Avatar
                onClick={() => handleViewProfile(post.createdBy._id)}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                <AvatarImage src={post.createdBy.profilePic} />
                <AvatarFallback>{post.createdBy.name[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p
                  className="font-semibold text-white hover:text-amber-400 cursor-pointer transition-colors"
                  onClick={() => handleViewProfile(post.createdBy._id)}
                >
                  {post.createdBy.name}
                </p>
                <p className="text-sm text-gray-400">
                  {post.createdBy.position && (
                    <>
                      {post.createdBy.position}
                      {post.createdBy.company && ' at '}
                    </>
                  )}
                  {post.createdBy.company && <span>{post.createdBy.company}</span>}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>

              {post.type && (
                <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded">
                  {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                </span>
              )}
            </div>

            {/* Post Content */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-2">{post.title}</h3>
              <p className="text-gray-300 text-sm line-clamp-4">{post.content}</p>
            </div>

            {/* Post Image */}
            {post.imageUrl && (
              <div className="max-h-96 bg-slate-700 overflow-hidden">
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Post Stats */}
            <div className="px-4 py-3 border-t border-slate-700 flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Heart size={16} className="text-red-500" />
                {post.likeCount} likes
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle size={16} className="text-blue-400" />
                {post.commentCount} comments
              </span>
            </div>

            {/* Post Actions */}
            <div className="px-4 py-3 border-t border-slate-700 flex items-center gap-2">
              <button
                onClick={() => handleLike(post._id, post.isLiked)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
                  post.isLiked
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'text-gray-400 hover:bg-slate-700'
                }`}
              >
                <Heart size={18} fill={post.isLiked ? 'currentColor' : 'none'} />
                <span className="text-sm font-medium">Like</span>
              </button>

              <button
                onClick={() => handleComment(post._id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-gray-400 hover:bg-slate-700 transition-colors"
              >
                <MessageCircle size={18} />
                <span className="text-sm font-medium">Comment</span>
              </button>

              <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-gray-400 hover:bg-slate-700 transition-colors">
                <Share2 size={18} />
                <span className="text-sm font-medium">Share</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Load More Observer */}
      <div ref={observerTarget} className="flex justify-center py-8">
        {feedLoading && <Loader2 className="w-6 h-6 animate-spin text-amber-600" />}
      </div>
    </div>
  );
};

export default SocialFeed;
