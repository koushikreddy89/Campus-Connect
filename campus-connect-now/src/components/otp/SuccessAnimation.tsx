import React from 'react';
import { motion } from 'framer-motion';

interface SuccessAnimationProps {
  showParticles?: boolean;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  showParticles = true,
}) => {
  // Pre-calculated particle positions for consistent spring render
  const particles = [
    { x: -50, y: -45, scale: 0.8, delay: 0 },
    { x: 55, y: -40, scale: 1, delay: 0.05 },
    { x: -60, y: 30, scale: 0.9, delay: 0.1 },
    { x: 65, y: 35, scale: 0.7, delay: 0.15 },
    { x: -20, y: -65, scale: 1.1, delay: 0.08 },
    { x: 25, y: -60, scale: 0.85, delay: 0.12 },
    { x: -35, y: 60, scale: 0.95, delay: 0.18 },
    { x: 40, y: 55, scale: 1.05, delay: 0.2 },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center py-2">
      {/* Expanding Ripple Ring */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0.8 }}
        animate={{ scale: 1.8, opacity: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut', repeat: Infinity, repeatDelay: 1 }}
        className="absolute w-24 h-24 rounded-full border-2 border-emerald-400/60 pointer-events-none"
      />

      {/* Floating Sparkle Particles */}
      {showParticles &&
        particles.map((p, idx) => (
          <motion.div
            key={idx}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: p.x,
              y: p.y,
              opacity: [0, 1, 0],
              scale: [0, p.scale, 0],
            }}
            transition={{
              duration: 1.4,
              delay: p.delay,
              ease: 'easeOut',
              repeat: Infinity,
              repeatDelay: 1.5,
            }}
            className="absolute w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] pointer-events-none"
          />
        ))}

      {/* Main Checkmark Badge */}
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
        className="relative h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.5)] border border-emerald-300/40"
      >
        <svg
          className="w-9 h-9 stroke-current text-white fill-none stroke-[3]"
          viewBox="0 0 24 24"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M20 6L9 17l-5-5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeInOut' }}
          />
        </svg>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-3 font-semibold text-emerald-400 text-sm tracking-wide"
      >
        Authentication Confirmed
      </motion.p>
    </div>
  );
};
