/**
 * Premium Post Header Component
 * Shows author info, timestamp, and post metadata
 */

import React from 'react';
import { motion } from 'framer-motion';
import { MoreHorizontal, Shield } from 'lucide-react';
import { FeedPost } from '@/types/feed';

interface PostHeaderProps {
  post: FeedPost;
}

export const PostHeader: React.FC<PostHeaderProps> = ({ post }) => {
  const { author, createdAt, type } = post;

  const getTimestamp = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const getPostTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      referral: 'bg-blue-500/20 text-blue-300',
      roadmap: 'bg-purple-500/20 text-purple-300',
      image: 'bg-green-500/20 text-green-300',
      video: 'bg-red-500/20 text-red-300',
      text: 'bg-gray-500/20 text-gray-300',
    };
    return colors[type] || colors.text;
  };

  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <motion.img
          src={author.avatar}
          alt={author.name}
          className="w-12 h-12 rounded-full border border-white/20 object-cover"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        />

        {/* Author info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-sm">{author.name}</h3>
            {author.verified && (
              <Shield size={14} className="text-blue-400" />
            )}
          </div>
          <p className="text-xs text-gray-400">
            {author.role} @ {author.company}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{getTimestamp(createdAt)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Post type badge */}
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPostTypeColor(type)}`}>
          {type === 'referral' ? '🎯 Referral' : type === 'roadmap' ? '🗺️ Roadmap' : type.charAt(0).toUpperCase() + type.slice(1)}
        </span>

        {/* More options */}
        <motion.button
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <MoreHorizontal size={16} className="text-gray-400" />
        </motion.button>
      </div>
    </div>
  );
};
