import React, { memo } from 'react';
import { motion } from 'framer-motion';

export const LightingLayer = memo(() => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10 select-none">
      {/* Soft light sweep behind the logo */}
      <motion.div
        animate={{
          x: ['-50%', '150%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 9,
          ease: 'easeInOut',
        }}
        className="absolute w-[60%] h-full top-0 opacity-20 mix-blend-screen"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(124,92,255,0.06) 40%, rgba(0,229,255,0.04) 60%, transparent 100%)',
          willChange: 'transform',
        }}
      />
    </div>
  );
});

LightingLayer.displayName = 'LightingLayer';
