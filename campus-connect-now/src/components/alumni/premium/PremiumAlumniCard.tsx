/**
 * Premium Alumni Card Component
 * Displays featured alumni in a beautiful glassmorphism card
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, ExternalLink } from 'lucide-react';
import { AlumniProfile } from '@/types/alumni';

interface PremiumAlumniCardProps {
  profile: AlumniProfile;
}

function PremiumAlumniCardComponent({ profile }: PremiumAlumniCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      className="relative rounded-2xl overflow-hidden group h-full cursor-pointer"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-transparent backdrop-blur-xl border border-white/10 group-hover:border-white/20 transition-all" />

      {/* Content */}
      <div className="relative z-10 p-6 flex flex-col h-full">
        {/* Header with Avatar */}
        <div className="flex items-start justify-between mb-6">
          <motion.img
            whileHover={{ scale: 1.1 }}
            src={profile.avatar}
            alt={profile.name}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="100%" height="100%" fill="%2327272a"/><text x="50%" y="55%" font-size="24" font-family="sans-serif" font-weight="bold" fill="%23a1a1aa" dominant-baseline="middle" text-anchor="middle">CC</text></svg>';
            }}
            className="w-16 h-16 rounded-full object-cover ring-2 ring-white/20"
          />
          <motion.button
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-white/10 backdrop-blur hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
          >
            <ExternalLink className="w-4 h-4 text-white" />
          </motion.button>
        </div>

        {/* Name and Title */}
        <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">
          {profile.name}
        </h3>
        <p className="text-sm text-blue-300 font-semibold mb-3">
          {profile.designation || (profile.role && profile.role.toLowerCase() !== 'alumni' ? profile.role : 'Alumni Member')}
        </p>

        {/* Company and Location */}
        <div className="space-y-2 mb-6 flex-1">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Briefcase className="w-4 h-4 text-blue-400" />
            <span className="truncate">{profile.company}</span>
          </div>
          {profile.location && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <MapPin className="w-4 h-4 text-purple-400" />
              <span className="truncate">{profile.location}</span>
            </div>
          )}
        </div>

        {/* Batch Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-slate-300">
            Batch {profile.batch}
          </span>
        </div>
      </div>

      {/* Hover Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6 pointer-events-none"
      >
        <p className="text-sm text-white/80">
          {profile.bio || 'Accomplished professional in the network'}
        </p>
      </motion.div>
    </motion.div>
  );
}

export default memo(PremiumAlumniCardComponent);
