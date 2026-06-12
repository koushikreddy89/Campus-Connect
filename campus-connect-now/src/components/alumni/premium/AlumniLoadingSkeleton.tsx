/**
 * Alumni Loading Skeleton Component
 * Premium skeleton loader for stories
 */

import { motion } from 'framer-motion';

export default function AlumniLoadingSkeleton() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
      className="relative rounded-3xl overflow-hidden backdrop-blur border border-white/10 p-8"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80" />

      {/* Content */}
      <div className="relative z-10 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-slate-700 to-slate-600 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded w-40 animate-pulse" />
              <div className="h-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded w-32 animate-pulse" />
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-slate-700 to-slate-600 animate-pulse" />
        </div>

        {/* Badge Skeleton */}
        <div className="w-20 h-8 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full animate-pulse" />

        {/* Content Skeleton */}
        <div className="space-y-3">
          <div className="h-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded w-full animate-pulse" />
          <div className="h-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded w-5/6 animate-pulse" />
          <div className="h-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded w-4/5 animate-pulse" />
        </div>

        {/* Image Skeleton */}
        <div className="w-full h-48 bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl animate-pulse" />

        {/* Action Buttons Skeleton */}
        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/10">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
