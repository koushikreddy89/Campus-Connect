/**
 * Premium Comment Section Component
 * Expandable comments with add/view functionality
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Heart } from 'lucide-react';
import { Comment } from '@/types/feed';
import { usePremiumFeedStore } from '@/store/premiumFeedStore';

interface CommentSectionProps {
  postId: string;
  isExpanded: boolean;
  commentCount: number;
}

const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <motion.div
      className="flex gap-3 py-3"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
    >
      <img
        src={comment.author.avatar}
        alt={comment.author.name}
        className="w-8 h-8 rounded-full object-cover"
      />
      <div className="flex-1">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs font-medium text-white">{comment.author.name}</p>
          <p className="text-sm text-gray-300 mt-1">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <button className="hover:text-gray-200 transition-colors">Reply</button>
          <motion.button
            onClick={() => setIsLiked(!isLiked)}
            className="hover:text-gray-200 transition-colors flex items-center gap-1"
          >
            <Heart
              size={12}
              className={isLiked ? 'fill-red-400 text-red-400' : ''}
            />
            {(comment.likes || 0) > 0 && comment.likes}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  isExpanded,
  commentCount,
}) => {
  const { comments, fetchComments, addComment } = usePremiumFeedStore();
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const postComments = comments[postId] || [];

  useEffect(() => {
    if (isExpanded && postComments.length === 0) {
      fetchComments(postId);
    }
  }, [isExpanded, postId, postComments.length, fetchComments]);

  const handleAddComment = async () => {
    if (newCommentText.trim()) {
      setIsSubmitting(true);
      try {
        await addComment(postId, newCommentText);
        setNewCommentText('');
      } catch (error) {
        console.error('Failed to add comment:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          className="pt-4 border-t border-white/10"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Comments list */}
          {postComments.length > 0 ? (
            <motion.div
              className="mb-4 space-y-1 max-h-60 overflow-y-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {postComments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </motion.div>
          ) : commentCount > 0 ? (
            <p className="text-xs text-gray-400 mb-4">
              Loading {commentCount} comment{commentCount !== 1 ? 's' : ''}...
            </p>
          ) : (
            <p className="text-xs text-gray-500 mb-4">No comments yet. Be the first!</p>
          )}

          {/* Comment input */}
          <motion.div
            className="flex gap-3 pt-3 border-t border-white/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=user"
              alt="Your avatar"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex-1 flex gap-2">
              <textarea
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a comment..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 resize-none"
                rows={1}
              />
              <motion.button
                onClick={handleAddComment}
                disabled={!newCommentText.trim() || isSubmitting}
                className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Send size={16} className="text-blue-400" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
