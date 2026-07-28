import React, { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface LandingTransitionProps {
  children: React.ReactNode;
  delay?: number;
}

export const LandingTransition = memo(({ children, delay = 0 }: LandingTransitionProps) => {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.12,
        delayChildren: delay,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full flex flex-col items-center justify-center"
    >
      {children}
    </motion.div>
  );
});

LandingTransition.displayName = 'LandingTransition';

export const LandingItem = memo(({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const shouldReduceMotion = useReducedMotion();

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: shouldReduceMotion ? 0 : 20,
      scale: shouldReduceMotion ? 1 : 0.97
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 90,
        damping: 15,
        mass: 1,
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className} style={{ willChange: 'transform, opacity' }}>
      {children}
    </motion.div>
  );
});

LandingItem.displayName = 'LandingItem';
