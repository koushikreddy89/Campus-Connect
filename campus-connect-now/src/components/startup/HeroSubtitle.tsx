import React, { memo } from 'react';
import { motion } from 'framer-motion';

export const HeroSubtitle = memo(() => {
  return (
    <motion.p
      initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
      animate={{ opacity: 0.65, y: 0, filter: 'blur(0px)' }}
      transition={{
        type: 'spring',
        stiffness: 80,
        damping: 15,
        delay: 0.55, // Follows title sequence
      }}
      className="text-zinc-400 text-base md:text-lg font-medium text-center max-w-xl select-none"
      style={{ willChange: 'transform, opacity, filter' }}
    >
      Connect • Learn • Grow • Secure Enterprise Network.
    </motion.p>
  );
});

HeroSubtitle.displayName = 'HeroSubtitle';
