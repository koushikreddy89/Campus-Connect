/**
 * Alumni Profile Card Component
 * 
 * Displays alumni profile information in card format
 * Two variants:
 * - compact: For horizontal scroll, minimal info
 * - full: For grid display, more detailed info
 */

import { AlumniProfile } from '@/types/alumni';
import { motion } from 'framer-motion';
import { ExternalLink, Briefcase, GraduationCap } from 'lucide-react';

type CardVariant = 'compact' | 'full';

interface AlumniProfileCardProps {
  profile: AlumniProfile;
  onClick?: () => void;
  variant?: CardVariant;
}

export default function AlumniProfileCard({
  profile,
  onClick,
  variant = 'full',
}: AlumniProfileCardProps) {
  const Comp = motion.div;

  if (variant === 'compact') {
    return (
      <Comp
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="cursor-pointer flex-shrink-0 w-36 glass rounded-xl p-3 text-center hover:border-primary/50 transition-colors"
      >
        {/* Avatar */}
        <img
          src={profile.profileImage}
          alt={profile.name}
          className="h-12 w-12 rounded-full mx-auto object-cover mb-2"
        />

        {/* Name */}
        <p className="text-xs font-semibold text-foreground truncate">
          {profile.name}
        </p>

        {/* Company & Role */}
        <p className="text-[10px] text-muted-foreground truncate">
          {profile.company}
        </p>

        {/* Batch */}
        <span className="text-[9px] text-muted-foreground/70 block mt-1">
          {profile.batch}
        </span>
      </Comp>
    );
  }

  // Full card variant
  return (
    <Comp
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="glass rounded-2xl overflow-hidden cursor-pointer group transition-all hover:border-primary/30"
    >
      {/* Background */}
      <div className="h-20 bg-gradient-to-r from-primary/20 to-accent/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-primary/30 blur-lg" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Avatar */}
        <div className="flex justify-center -mt-8 mb-3">
          <img
            src={profile.profileImage}
            alt={profile.name}
            className="h-20 w-20 rounded-full object-cover border-4 border-background shadow-lg"
          />
        </div>

        {/* Name & Department */}
        <div className="text-center">
          <h3 className="font-bold text-foreground text-sm lg:text-base truncate">
            {profile.name}
          </h3>
          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mt-1">
            <GraduationCap className="h-3 w-3" />
            {profile.department}
          </p>
        </div>

        {/* Batch */}
        <div className="flex justify-center">
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/15 text-primary font-medium">
            Batch {profile.batch}
          </span>
        </div>

        {/* Company & Role */}
        <div className="space-y-1.5 border-t border-border/50 pt-3">
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Company</p>
              <p className="font-semibold text-foreground text-sm truncate">
                {profile.company}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className="h-4 w-4 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-bold text-primary">JT</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Current Role</p>
              <p className="font-semibold text-foreground text-sm truncate">
                {profile.designation || (profile.role && profile.role.toLowerCase() !== 'alumni' ? profile.role : 'Alumni Member')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className="h-4 w-4 rounded bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-bold text-accent">EX</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Experience</p>
              <p className="font-semibold text-foreground text-sm">
                {profile.experience}
              </p>
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 border-t border-border/50 pt-3">
            {profile.bio}
          </p>
        )}

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t border-border/50 pt-3">
            {profile.skills.slice(0, 4).map(skill => (
              <span
                key={skill}
                className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium"
              >
                {skill}
              </span>
            ))}
            {profile.skills.length > 4 && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                +{profile.skills.length - 4}
              </span>
            )}
          </div>
        )}

        {/* View Profile Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-3 py-2 px-3 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1 group/btn"
        >
          View Profile
          <ExternalLink className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
        </motion.button>
      </div>
    </Comp>
  );
}
