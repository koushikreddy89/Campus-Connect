/**
 * Premium Avatar Component
 * Reusable avatar with glassmorphism and animations
 */

import { memo } from 'react';
import { motion } from 'framer-motion';

interface PremiumAvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  isOnline?: boolean;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const onlineIndicatorMap = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

function PremiumAvatarComponent({
  src,
  alt,
  size = 'md',
  isOnline = false,
}: PremiumAvatarProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      className="relative"
    >
      <img
        src={src}
        alt={alt}
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="100%" height="100%" fill="%2327272a"/><text x="50%" y="55%" font-size="24" font-family="sans-serif" font-weight="bold" fill="%23a1a1aa" dominant-baseline="middle" text-anchor="middle">CC</text></svg>';
        }}
        className={`${sizeMap[size]} rounded-full object-cover ring-2 ring-white/20 hover:ring-white/40 transition-all`}
      />
      {isOnline && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`${onlineIndicatorMap[size]} absolute bottom-0 right-0 rounded-full bg-green-500 ring-2 ring-slate-900`}
        />
      )}
    </motion.div>
  );
}

export default memo(PremiumAvatarComponent);
