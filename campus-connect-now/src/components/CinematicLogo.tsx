import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSoundEffect } from '@/utils/soundEngine';

interface CinematicLogoProps {
  transparent?: boolean;
  onComplete?: () => void;
}

export const CinematicLogo: React.FC<CinematicLogoProps> = ({ 
  transparent = true,
  onComplete 
}) => {
  const [stage, setStage] = useState<
    | 'idle'
    | 'glow'
    | 'particles'
    | 'orbit'
    | 'draw'
    | 'assemble'
    | 'push'
    | 'sweep'
    | 'pull'
    | 'breath'
    | 'reveal'
    | 'fade'
  >('idle');

  // Masterpiece 10s timeline synchronization matching cinematic camera timeline
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    setStage('glow');
    playSoundEffect('cinematic_pad');

    // 1.2s: Two energy particles appear (Scene 2)
    timers.push(setTimeout(() => {
      setStage('particles');
      playSoundEffect('cinematic_particle');
    }, 1200));

    // 1.5s: Construction starts - tracing path (Scene 2)
    timers.push(setTimeout(() => {
      setStage('draw');
    }, 1500));

    // 3.5s: Camera slowly pushes toward completed locked logo: scale 100% -> 118% (Scene 3)
    timers.push(setTimeout(() => {
      setStage('push');
    }, 3500));

    // 4.8s: Hold camera & trigger glass reflection sweep (Scene 4)
    timers.push(setTimeout(() => {
      setStage('sweep');
      playSoundEffect('cinematic_connect');
      playSoundEffect('cinematic_sweep');
    }, 4800));

    // 5.8s: Camera pulls back to 100% and brand text fades in underneath (Scene 5)
    timers.push(setTimeout(() => {
      setStage('pull');
      playSoundEffect('cinematic_sparkle');
    }, 5800));

    // 7.2s: Tagline fades in connect-collaborate-belong (Scene 6)
    timers.push(setTimeout(() => {
      setStage('reveal');
    }, 7200));

    // 8.5s: Hold complete composition still for exactly 1.5 seconds (Scene 7)
    timers.push(setTimeout(() => {
      setStage('breath');
    }, 8500));

    // 10.0s: Camera pulls back slightly to 92% and triggers onComplete fade out (Scene 8)
    timers.push(setTimeout(() => {
      setStage('fade');
      if (onComplete) onComplete();
    }, 10000));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Spring physics for Apple-like fluid motion
  const particleSpring = { type: 'spring', stiffness: 38, damping: 11, mass: 1 };
  const scaleSpring = { type: 'spring', stiffness: 22, damping: 9 };

  const isTracing = stage === 'draw';
  const isFilled = stage !== 'idle' && stage !== 'glow' && stage !== 'particles' && stage !== 'orbit' && stage !== 'draw';
  const showText = stage === 'pull' || stage === 'reveal' || stage === 'breath' || stage === 'fade';

  let cameraScale = 1.0;
  if (stage === 'push' || stage === 'sweep') {
    cameraScale = 1.08;
  } else if (stage === 'fade') {
    cameraScale = 0.92;
  }

  return (
    <div className={`relative flex flex-col items-center justify-center overflow-hidden transition-all duration-1000 ${
      transparent ? 'bg-transparent w-full h-full' : 'bg-[#08080B] w-full h-full min-h-[100dvh]'
    }`}>
      {/* Matte Black ambient backdrop */}
      {!transparent && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.05)_0%,rgba(34,211,238,0.02)_40%,transparent_80%)] pointer-events-none" />
          
          {/* Floating dust particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-[1.5px] h-[1.5px] rounded-full bg-white/15"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -50, 0],
                  x: [0, Math.random() * 24 - 12, 0],
                  opacity: [0, 0.35, 0],
                }}
                transition={{
                  duration: Math.random() * 12 + 18,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Main 3D Perspective Wrapper */}
      <motion.div
        style={{
          transformStyle: 'preserve-3d',
          perspective: 1000,
        }}
        animate={{
          scale: cameraScale,
          rotateX: isFilled ? 10 : 0,
          rotateY: isFilled ? -6 : 0,
          z: isFilled ? 25 : 0,
        }}
        transition={{
          scale: { type: 'spring', stiffness: 22, damping: 9 },
          default: { type: 'spring', stiffness: 20, damping: 10 }
        }}
        className="relative flex flex-col items-center justify-center"
      >
        {/* Ambient background bloom */}
        <AnimatePresence>
          {(stage === 'glow' || stage === 'particles') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.55, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 1.0 } }}
              className="absolute w-[240px] h-[240px] rounded-full bg-violet-600/8 blur-[70px]"
            />
          )}
        </AnimatePresence>

        {/* Glow Wave connection ripple */}
        <AnimatePresence>
          {stage === 'glow_wave' && (
            <motion.div
              initial={{ scale: 0.4, opacity: 1 }}
              animate={{ scale: 2.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute w-32 h-32 rounded-full border border-cyan-400/35 bg-cyan-400/[0.01] blur-[3px] pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Vector SVG Logo Component */}
        <motion.div
          animate={{
            scale: stage === 'breath' ? [1, 0.98, 1, 0.99, 1] : 1
          }}
          transition={scaleSpring}
          className="relative w-52 h-52 flex items-center justify-center"
        >
          <svg viewBox="0 0 200 200" className="w-full h-full filter drop-shadow-[0_4px_25px_rgba(124,58,237,0.35)]">
            <defs>
              {/* Premium gradients from Brand Kit */}
              <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>
              <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22D3EE" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
              <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="40%" stopColor="white" stopOpacity="0.45" />
                <stop offset="60%" stopColor="white" stopOpacity="0.45" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Orbiting particles (Scene 2 & 3) */}
            {!isFilled && !isTracing && (
              <g>
                <motion.circle
                  cx={100}
                  cy={100}
                  r={8}
                  fill="url(#purpleGradient)"
                  initial={{ cx: 40, cy: 100, opacity: 0 }}
                  animate={{
                    cx: stage === 'orbit' ? [40, 75, 100, 125, 40] : 40,
                    cy: stage === 'orbit' ? [100, 60, 100, 140, 100] : 100,
                    opacity: 1,
                  }}
                  transition={particleSpring}
                />
                <motion.circle
                  cx={100}
                  cy={100}
                  r={8}
                  fill="url(#cyanGradient)"
                  initial={{ cx: 160, cy: 100, opacity: 0 }}
                  animate={{
                    cx: stage === 'orbit' ? [160, 125, 100, 75, 160] : 160,
                    cy: stage === 'orbit' ? [100, 140, 100, 60, 100] : 100,
                    opacity: 1,
                  }}
                  transition={particleSpring}
                />
              </g>
            )}

            {/* Drawing and Final Connected Logo (Scene 4+) */}
            {(isTracing || isFilled) && (
              <g>
                {/* Purple Left Interlocking Curve */}
                <motion.path
                  d="M 95,78 A 24,24 0 1,0 95,122 C 105,122 115,108 120,100 C 115,92 105,78 95,78"
                  fill={isFilled ? 'url(#purpleGradient)' : 'none'}
                  stroke={isTracing ? 'url(#purpleGradient)' : 'none'}
                  strokeWidth={isTracing ? 6 : 0}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.0, ease: 'easeInOut' }}
                />

                {/* Cyan Right Interlocking Curve */}
                <motion.path
                  d="M 105,122 A 24,24 0 1,0 105,78 C 95,78 85,92 80,100 C 85,108 95,122 105,122"
                  fill={isFilled ? 'url(#cyanGradient)' : 'none'}
                  stroke={isTracing ? 'url(#cyanGradient)' : 'none'}
                  strokeWidth={isTracing ? 6 : 0}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.0, ease: 'easeInOut' }}
                />

                {/* Left Purple Head Dot */}
                <motion.circle
                  cx="75"
                  cy="50"
                  r="9"
                  fill="url(#purpleGradient)"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: isFilled || isTracing ? 1 : 0, scale: isFilled || isTracing ? 1 : 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                />

                {/* Right Cyan Head Dot */}
                <motion.circle
                  cx="125"
                  cy="50"
                  r="9"
                  fill="url(#cyanGradient)"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: isFilled || isTracing ? 1 : 0, scale: isFilled || isTracing ? 1 : 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                />

                {/* Realistic Reflection Sweep */}
                {stage === 'sweep' && (
                  <g style={{ mixBlendMode: 'overlay' }}>
                    <motion.rect
                      x="30"
                      y="30"
                      width="140"
                      height="140"
                      fill="url(#sweepGradient)"
                      initial={{ x: -150, rotate: 12 }}
                      animate={{ x: 150 }}
                      transition={{ duration: 1.1, ease: 'easeInOut' }}
                    />
                  </g>
                )}
              </g>
            )}
          </svg>

          {/* Idle breathing glow */}
          {isFilled && (
            <motion.div
              animate={{ opacity: [0.08, 0.28, 0.08] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-500/10 to-cyan-500/10 blur-2xl pointer-events-none"
            />
          )}
        </motion.div>

        {/* Typography Reveal */}
        <div className="h-16 mt-4 flex flex-col items-center overflow-hidden">
          <AnimatePresence>
            {showText && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1.0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center"
              >
                <h1 className="text-2xl font-black tracking-[0.25em] text-white flex items-center gap-1 font-sans">
                  CAMPUS
                  <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    CONNECT
                  </span>
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tagline Reveal */}
        <div className="h-8 flex items-center justify-center overflow-hidden">
          <AnimatePresence>
            {stage === 'reveal' && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0.6, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.25 }}
                className="text-[10px] font-semibold tracking-[0.4em] text-zinc-300 uppercase font-sans"
              >
                Connect • Collaborate • Belong
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
export default CinematicLogo;
