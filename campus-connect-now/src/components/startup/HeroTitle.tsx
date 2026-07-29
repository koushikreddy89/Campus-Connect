import React, { memo } from 'react';
import { motion } from 'framer-motion';

export const HeroTitle = memo(() => {
  const line1Variants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(12px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 80,
        damping: 14,
      },
    },
  };

  const line2Variants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(12px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 80,
        damping: 14,
        delay: 0.2, // Starts 200ms after Line 1
      },
    },
  };

  return (
    <h1 
      className="font-black tracking-[-0.04em] leading-[1.0] text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 font-sans select-none w-full max-w-[900px]"
      style={{ 
        fontSize: 'clamp(2.2rem, 5vw, 4.5rem)', 
        textWrap: 'balance' 
      } as React.CSSProperties}
    >
      <motion.span
        initial="hidden"
        animate="visible"
        variants={line1Variants}
        className="block"
        style={{ willChange: 'transform, opacity, filter' }}
      >
        Welcome to
      </motion.span>
      <motion.span
        initial="hidden"
        animate="visible"
        variants={line2Variants}
        className="block mt-1"
        style={{ willChange: 'transform, opacity, filter' }}
      >
        Campus Connect
      </motion.span>
    </h1>
  );
});

HeroTitle.displayName = 'HeroTitle';
