/**
 * Post Card Skeleton Loader
 * Shows while posts are loading
 */

import React from 'react';
import { motion } from 'framer-motion';

export const PostCardSkeleton: React.FC = () => {
  return (
    <motion.div
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-4"
      animate={{ opacity: [0.5, 0.7, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      {/* Header skeleton */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-white/10" />
        <div className="flex-1">
          <div className="h-4 bg-white/10 rounded-full w-1/3 mb-2" />
          <div className="h-3 bg-white/10 rounded-full w-1/2" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mb-4 space-y-3">
        <div className="h-4 bg-white/10 rounded-full w-full" />
        <div className="h-4 bg-white/10 rounded-full w-5/6" />
        <div className="h-4 bg-white/10 rounded-full w-4/5" />
      </div>

      {/* Image skeleton */}
      <div className="h-64 bg-white/10 rounded-xl mb-4" />

      {/* Actions skeleton */}
      <div className="flex justify-between pt-4 border-t border-white/10">
        <div className="h-4 bg-white/10 rounded-full w-12" />
        <div className="h-4 bg-white/10 rounded-full w-12" />
        <div className="h-4 bg-white/10 rounded-full w-12" />
      </div>
    </motion.div>
  );
};

export const FeedSkeletonLoader: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
};
