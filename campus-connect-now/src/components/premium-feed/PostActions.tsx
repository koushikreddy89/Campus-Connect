/**
 * Premium Post Actions Component
 * Like, comment, save, and share actions
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react';
import { FeedPost } from '@/types/feed';
import { usePremiumFeedStore } from '@/store/premiumFeedStore';

interface PostActionsProps {
  post: FeedPost;
  onCommentToggle: (postId: string) => void;
  showComments: boolean;
}

export const PostActions: React.FC<PostActionsProps> = ({
  post,
  onCommentToggle,
  showComments,
}) => {
  const { likePost, unlikePost, savePost, unsavePost } = usePremiumFeedStore();
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleLike = async () => {
    setIsLiking(true);
    try {
      if (post.isLiked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }
    } catch (error) {
      console.error('Like action failed:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (post.isSaved) {
        await unsavePost(post.id);
      } else {
        await savePost(post.id);
      }
    } catch (error) {
      console.error('Save action failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${post.author.name}'s Post`,
        text: post.content.substring(0, 100),
        url: window.location.href,
      });
    } else {
      // Fallback - copy to clipboard
      const text = `${post.author.name}: ${post.content}`;
      navigator.clipboard.writeText(text);
    }
  };

  const ActionButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    count: number;
    isActive?: boolean;
    isLoading?: boolean;
    onClick: () => void;
  }> = ({ icon, label, count, isActive = false, isLoading = false, onClick }) => (
    <motion.button
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-medium group ${
        isActive
          ? 'text-red-400 bg-red-500/10'
          : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={isLoading}
    >
      <motion.div
        animate={isActive ? { scale: [1, 1.3, 1], rotate: [0, 20, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {icon}
      </motion.div>
      <span className="hidden sm:inline">{label}</span>
      <span className={isActive ? 'text-red-400 font-bold' : 'text-gray-500'}>
        {count > 0 && count}
      </span>
    </motion.button>
  );

  return (
    <motion.div
      className="pt-4 border-t border-white/10 flex justify-between"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <ActionButton
        icon={
          <Heart
            size={18}
            className={post.isLiked ? 'fill-red-400' : ''}
          />
        }
        label="Like"
        count={post.likes}
        isActive={post.isLiked}
        isLoading={isLiking}
        onClick={handleLike}
      />

      <ActionButton
        icon={<MessageCircle size={18} />}
        label="Comment"
        count={post.comments}
        onClick={() => onCommentToggle(post.id)}
      />

      <ActionButton
        icon={
          <Bookmark
            size={18}
            className={post.isSaved ? 'fill-yellow-400' : ''}
          />
        }
        label="Save"
        count={post.saves}
        isActive={post.isSaved}
        isLoading={isSaving}
        onClick={handleSave}
      />

      <ActionButton
        icon={<Share2 size={18} />}
        label="Share"
        count={post.shares}
        onClick={handleShare}
      />
    </motion.div>
  );
};
