/**
 * Premium Post Card Component
 * Complete post card with all engagement features
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FeedPost } from '@/types/feed';
import { PostHeader } from './PostHeader';
import { PostContent } from './PostContent';
import { PostMedia } from './PostMedia';
import { PostActions } from './PostActions';
import { CommentSection } from './CommentSection';

interface PostCardProps {
  post: FeedPost;
  index?: number;
}

export const PostCard: React.FC<PostCardProps> = ({ post, index = 0 }) => {
  const [showComments, setShowComments] = useState(false);

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        delay: index * 0.1,
        ease: 'easeOut',
      },
    },
    hover: {
      boxShadow:
        '0 20px 40px rgba(255, 255, 255, 0.1), 0 0 60px rgba(59, 130, 246, 0.1)',
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.article
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-4 hover:border-white/20 transition-colors"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
    >
      {/* Header */}
      <PostHeader post={post} />

      {/* Content */}
      <PostContent post={post} />

      {/* Media */}
      <PostMedia post={post} />

      {/* Actions */}
      <PostActions
        post={post}
        onCommentToggle={() => setShowComments(!showComments)}
        showComments={showComments}
      />

      {/* Comments */}
      <CommentSection
        postId={post.id}
        isExpanded={showComments}
        commentCount={post.comments}
      />
    </motion.article>
  );
};
