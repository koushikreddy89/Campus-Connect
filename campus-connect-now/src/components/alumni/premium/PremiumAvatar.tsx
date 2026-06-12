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
          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64';
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
