import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { StartupPhaseType, StartupPhase } from '@/pages/WelcomePage';

interface SharedLogoProps {
  phase: StartupPhaseType;
}

export const SharedLogo = memo(({ phase }: SharedLogoProps) => {
  const isCentered = phase === StartupPhase.SPLASH || phase === StartupPhase.PRELOAD || phase === StartupPhase.BOOT;

  let targetWidth = 300;
  let targetHeight = 300;
  let targetOpacity = 1.0;
  let targetBlur = 'blur(0px)';

  if (phase === StartupPhase.BOOT) {
    targetWidth = 48;
    targetHeight = 48;
    targetOpacity = 0.5;
    targetBlur = 'blur(12px)';
  } else if (phase === StartupPhase.PRELOAD) {
    targetWidth = 300;
    targetHeight = 300;
    targetOpacity = 1.0;
    targetBlur = 'blur(0px)';
  } else if (phase === StartupPhase.SPLASH) {
    targetWidth = 300;
    targetHeight = 300;
    targetOpacity = 1.0;
    targetBlur = 'blur(0px)';
  } else {
    // TRANSITION / LANDING
    targetWidth = 84;
    targetHeight = 84;
    targetOpacity = 1.0;
    targetBlur = 'blur(0px)';
  }

  return (
    <motion.div
      layoutId="logo-container"
      initial={{ opacity: 0, width: 48, height: 48, filter: 'blur(12px)' }}
      animate={{
        opacity: targetOpacity,
        width: targetWidth,
        height: targetHeight,
        filter: targetBlur,
      }}
      transition={{
        type: 'spring',
        stiffness: 65,
        damping: 15,
        mass: 1.2,
      }}
      className="relative flex items-center justify-center pointer-events-none select-none"
      style={{
        willChange: 'transform, opacity, width, height',
      }}
    >
      {/* Volumetric radial glow behind centered logo */}
      {isCentered && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === StartupPhase.BOOT ? 0.3 : 0.85 }}
          className="absolute w-[400px] h-[400px] rounded-full pointer-events-none filter blur-3xl mix-blend-screen"
          style={{
            background: 'radial-gradient(circle, rgba(124,92,255,0.18) 0%, rgba(59,130,246,0.08) 35%, transparent 70%)',
          }}
        />
      )}

      {/* Float & weightless drift wrapper (sine wave / breathing) */}
      <motion.div
        animate={isCentered && phase !== StartupPhase.BOOT ? {
          y: [0, -3, 0],
          x: [0, 1, 0],
          rotate: [0, 0.5, 0],
          scale: [1.0, 1.03, 1.0],
        } : {}}
        transition={isCentered && phase !== StartupPhase.BOOT ? {
          y: { repeat: Infinity, duration: 7, ease: 'easeInOut' },
          x: { repeat: Infinity, duration: 7, ease: 'easeInOut' },
          rotate: { repeat: Infinity, duration: 7, ease: 'easeInOut' },
          scale: { repeat: Infinity, duration: 5, ease: 'easeInOut' },
        } : {}}
        className="w-full h-full relative z-10 flex items-center justify-center"
      >
        <Logo 
          variant="icon" 
          className="text-violet-400 drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] w-full h-full" 
        />
      </motion.div>
    </motion.div>
  );
});

SharedLogo.displayName = 'SharedLogo';
