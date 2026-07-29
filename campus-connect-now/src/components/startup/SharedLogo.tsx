import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { StartupPhaseType, StartupPhase } from '@/pages/WelcomePage';
import { CinematicLogo } from '@/components/CinematicLogo';

interface SharedLogoProps {
  phase: StartupPhaseType;
}

export const SharedLogo = memo(({ phase }: SharedLogoProps) => {
  const isCentered = phase === StartupPhase.BOOT || phase === StartupPhase.PRELOAD || phase === StartupPhase.SPLASH || phase === StartupPhase.TRANSITION;

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
  } else if (phase === StartupPhase.SPLASH || phase === StartupPhase.TRANSITION) {
    targetWidth = 300;
    targetHeight = 300;
    targetOpacity = 1.0;
    targetBlur = 'blur(0px)';
  } else {
    // LANDING (Collapsed to navbar size on home page)
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
          animate={{ opacity: phase === StartupPhase.BOOT ? 0.35 : 0.85 }}
          className="absolute w-[450px] h-[450px] rounded-full pointer-events-none filter blur-3xl mix-blend-screen"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, rgba(34,211,238,0.08) 45%, transparent 70%)',
          }}
        />
      )}

      {/* Float & weightless drift wrapper (sine wave / breathing) */}
      <motion.div
        className="w-full h-full relative z-10 flex items-center justify-center"
      >
        {isCentered ? (
          <CinematicLogo transparent={true} />
        ) : (
          <Logo 
            variant="icon" 
            className="text-violet-400 drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] w-full h-full" 
          />
        )}
      </motion.div>
    </motion.div>
  );
});

SharedLogo.displayName = 'SharedLogo';
