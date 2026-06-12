/**
 * Premium Post Media Component
 * Displays images and videos with lazy loading
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { FeedPost } from '@/types/feed';

interface PostMediaProps {
  post: FeedPost;
}

export const PostMedia: React.FC<PostMediaProps> = ({ post }) => {
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});

  if (!post.media || post.media.length === 0) {
    return null;
  }

  const renderMedia = () => {
    if (post.media!.length === 1) {
      const media = post.media![0];
      return (
        <motion.div
          className="relative w-full rounded-xl overflow-hidden bg-black/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {media.type === 'image' ? (
            <motion.img
              src={media.url}
              alt={media.caption || 'Post media'}
              className="w-full h-auto object-cover"
              onLoad={() => setImageLoaded(prev => ({ ...prev, [media.id]: true }))}
              animate={{ opacity: imageLoaded[media.id] ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            />
          ) : (
            <div className="relative bg-black aspect-video flex items-center justify-center">
              <motion.img
                src={media.thumbnail}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
                onLoad={() => setImageLoaded(prev => ({ ...prev, [media.id]: true }))}
                animate={{ opacity: imageLoaded[media.id] ? 1 : 0 }}
              />
              <motion.button
                className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-colors group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="p-3 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors"
                  whileHover={{ scale: 1.1 }}
                >
                  <Play size={32} className="text-white fill-white" />
                </motion.div>
              </motion.button>
            </div>
          )}
        </motion.div>
      );
    }

    // Multiple media - grid layout
    return (
      <motion.div
        className="grid grid-cols-2 gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, staggerChildren: 0.1 }}
      >
        {post.media!.slice(0, 4).map((media, idx) => (
          <motion.div
            key={media.id}
            className="relative rounded-lg overflow-hidden bg-black/20 aspect-square group"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            {media.type === 'image' ? (
              <motion.img
                src={media.url}
                alt={media.caption || 'Post media'}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              />
            ) : (
              <div className="relative w-full h-full bg-black flex items-center justify-center">
                <img
                  src={media.thumbnail}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                />
                <Play size={24} className="absolute text-white fill-white" />
              </div>
            )}
            {post.media!.length > 4 && idx === 3 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white font-bold text-lg">+{post.media!.length - 4}</span>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    );
  };

  return (
    <motion.div className="py-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {renderMedia()}
      {post.media[0].caption && (
        <motion.p className="text-xs text-gray-400 mt-2 italic">
          {post.media[0].caption}
        </motion.p>
      )}
    </motion.div>
  );
};
