/**
 * Premium Post Content Component
 * Shows post text, tags, and badges
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FeedPost, PostTag } from '@/types/feed';

interface PostContentProps {
  post: FeedPost;
}

export const PostContent: React.FC<PostContentProps> = ({ post }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  const getTagColor = (color?: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-500/20 text-blue-300',
      green: 'bg-green-500/20 text-green-300',
      purple: 'bg-purple-500/20 text-purple-300',
      orange: 'bg-orange-500/20 text-orange-300',
      pink: 'bg-pink-500/20 text-pink-300',
    };
    return colors[color || 'blue'];
  };

  return (
    <motion.div
      className="py-4 space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Main content */}
      {post.content && (
        <motion.p
          className="text-sm text-gray-200 leading-relaxed line-clamp-4"
          variants={itemVariants}
        >
          {post.content}
        </motion.p>
      )}

      {/* Referral badge */}
      {post.type === 'referral' && post.referralCompany && (
        <motion.div
          className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl p-3"
          variants={itemVariants}
        >
          <p className="text-xs font-medium text-blue-300 mb-1">🎯 {post.referralCompany}</p>
          <p className="text-xs text-blue-200">{post.referralPosition}</p>
        </motion.div>
      )}

      {/* Roadmap indicator */}
      {post.type === 'roadmap' && post.roadmapTitle && (
        <motion.div
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl p-3"
          variants={itemVariants}
        >
          <p className="text-xs font-medium text-purple-300 mb-2">🗺️ {post.roadmapTitle}</p>
          {post.roadmapProgress && (
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-purple-400 to-pink-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${post.roadmapProgress}%` }}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <motion.div className="flex flex-wrap gap-2 pt-2" variants={itemVariants}>
          {post.tags.map((tag: PostTag) => (
            <motion.button
              key={tag.id}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${getTagColor(tag.color)} hover:opacity-80`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              #{tag.name}
            </motion.button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};
