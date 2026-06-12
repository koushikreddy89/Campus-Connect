/**
 * Alumni Post Loading Skeleton
 * Skeleton loading state for post cards
 */

import React from 'react';
import { motion } from 'framer-motion';

export const AlumniPostLoadingSkeleton: React.FC = () => {
  const shimmer = {
    initial: { backgroundPosition: '200% 0' },
    animate: {
      backgroundPosition: '-200% 0',
      transition: {
        repeat: Infinity,
        duration: 2,
        ease: 'linear',
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6"
    >
      {/* Header Skeleton */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Avatar Skeleton */}
          <motion.div
            variants={shimmer}
            initial="initial"
            animate="animate"
            className="w-12 h-12 rounded-full bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
          />

          {/* Author Info Skeleton */}
          <div className="flex-1 space-y-2">
            <motion.div
              variants={shimmer}
              initial="initial"
              animate="animate"
              className="h-4 w-32 rounded bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
            />
            <motion.div
              variants={shimmer}
              initial="initial"
              animate="animate"
              className="h-3 w-48 rounded bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
            />
          </div>
        </div>

        {/* Menu Button Skeleton */}
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="w-10 h-10 rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
        />
      </div>

      {/* Title Skeleton */}
      <motion.div
        variants={shimmer}
        initial="initial"
        animate="animate"
        className="h-5 w-48 rounded bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%] mb-4"
      />

      {/* Content Skeleton */}
      <div className="space-y-2 mb-4">
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="h-3 w-full rounded bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
        />
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="h-3 w-full rounded bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
        />
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="h-3 w-2/3 rounded bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
        />
      </div>

      {/* Images Skeleton */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="h-32 rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
        />
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="h-32 rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
        />
      </div>

      {/* Stats Skeleton */}
      <div className="flex items-center gap-4 py-4 border-t border-b border-slate-700/50 mb-4">
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="h-3 w-16 rounded bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
        />
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="h-3 w-20 rounded bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
        />
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="h-3 w-16 rounded bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
        />
      </div>

      {/* Actions Skeleton */}
      <div className="flex items-center gap-2">
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="flex-1 h-10 rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
        />
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="flex-1 h-10 rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
        />
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="flex-1 h-10 rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
        />
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="flex-1 h-10 rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 bg-[length:200%_100%]"
        />
      </div>
    </motion.div>
  );
};

export default AlumniPostLoadingSkeleton;
