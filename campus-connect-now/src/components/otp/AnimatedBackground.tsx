import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface AnimatedBackgroundProps {
  children?: React.ReactNode;
  interactive?: boolean;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  children,
  interactive = true,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  // Mouse position values for GPU-accelerated parallax
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springConfig = { damping: 30, stiffness: 100, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Parallax transform offsets (subtle 15px max movement)
  const bgTranslateX = useTransform(smoothX, [0, 1], [-15, 15]);
  const bgTranslateY = useTransform(smoothY, [0, 1], [-15, 15]);
  const orb1TranslateX = useTransform(smoothX, [0, 1], [25, -25]);
  const orb1TranslateY = useTransform(smoothY, [0, 1], [25, -25]);
  const orb2TranslateX = useTransform(smoothX, [0, 1], [-30, 30]);
  const orb2TranslateY = useTransform(smoothY, [0, 1], [-30, 30]);

  useEffect(() => {
    setMounted(true);
    if (!interactive || shouldReduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mouseX.set(e.clientX / innerWidth);
      mouseY.set(e.clientY / innerHeight);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive, mouseX, mouseY, shouldReduceMotion]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none">
      {/* Dynamic Ambient Lighting Layer */}
      <motion.div
        style={{
          x: shouldReduceMotion ? 0 : bgTranslateX,
          y: shouldReduceMotion ? 0 : bgTranslateY,
        }}
        className="absolute inset-0 z-0 pointer-events-none"
      >
        {/* Top-Left Aurora Blob */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  scale: [1, 1.15, 1],
                  opacity: [0.35, 0.5, 0.35],
                  rotate: [0, 15, 0],
                }
          }
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-violet-600/40 via-purple-600/30 to-indigo-700/20 blur-[130px]"
        />

        {/* Bottom-Right Deep Indigo Blob */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  scale: [1.1, 1, 1.1],
                  opacity: [0.4, 0.6, 0.4],
                  rotate: [0, -20, 0],
                }
          }
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -bottom-40 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-indigo-700/40 via-blue-600/30 to-violet-900/20 blur-[140px]"
        />

        {/* Center Floating Accent Blob */}
        <motion.div
          style={{
            x: shouldReduceMotion ? 0 : orb1TranslateX,
            y: shouldReduceMotion ? 0 : orb1TranslateY,
          }}
          animate={
            shouldReduceMotion
              ? {}
              : {
                  scale: [0.9, 1.1, 0.9],
                  opacity: [0.25, 0.45, 0.25],
                }
          }
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-gradient-to-r from-fuchsia-600/20 via-violet-500/25 to-cyan-500/20 blur-[120px]"
        />

        {/* Floating Orb 2 */}
        <motion.div
          style={{
            x: shouldReduceMotion ? 0 : orb2TranslateX,
            y: shouldReduceMotion ? 0 : orb2TranslateY,
          }}
          animate={
            shouldReduceMotion
              ? {}
              : {
                  scale: [1, 1.25, 1],
                  opacity: [0.2, 0.35, 0.2],
                }
          }
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-gradient-to-bl from-teal-500/20 via-emerald-600/15 to-violet-800/20 blur-[110px]"
        />
      </motion.div>

      {/* Radial Gradient Mesh Vignette */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-950/60 to-slate-950/95 pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]"
      />

      {/* Fine Noise Texture Overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Foreground Content */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        {children}
      </div>
    </div>
  );
};
