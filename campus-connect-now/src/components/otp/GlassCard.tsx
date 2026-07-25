import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  isError?: boolean;
  isSuccess?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  isError = false,
  isSuccess = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Mouse position relative to card center (-0.5 to 0.5)
  const rotateXRaw = useMotionValue(0);
  const rotateYRaw = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
  const rotateX = useSpring(rotateXRaw, springConfig);
  const rotateY = useSpring(rotateYRaw, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate normalized coords (-0.5 to 0.5)
    const normX = (mouseX / width) - 0.5;
    const normY = (mouseY / height) - 0.5;

    // Max 6-degree rotation tilt
    rotateXRaw.set(-normY * 8);
    rotateYRaw.set(normX * 8);
  };

  const handleMouseLeave = () => {
    rotateXRaw.set(0);
    rotateYRaw.set(0);
  };

  return (
    <div className="perspective-1000 w-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: shouldReduceMotion ? 0 : rotateX,
          rotateY: shouldReduceMotion ? 0 : rotateY,
          transformStyle: 'preserve-3d',
        }}
        className={`relative w-full rounded-3xl p-6 sm:p-8 sm:py-9 transition-colors duration-500 backdrop-blur-2xl bg-slate-950/50 border shadow-2xl overflow-hidden ${
          isSuccess
            ? 'border-emerald-500/40 shadow-[0_0_90px_rgba(16,185,129,0.25)]'
            : isError
            ? 'border-red-500/40 shadow-[0_0_90px_rgba(239,68,68,0.25)]'
            : 'border-white/10 hover:border-white/20 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8),0_0_80px_rgba(139,92,246,0.12)]'
        } ${className}`}
      >
        {/* Top Edge Light Reflection Bar */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-70 pointer-events-none" />

        {/* Ambient Top Inner Glow */}
        <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          isSuccess
            ? 'bg-emerald-500/20'
            : isError
            ? 'bg-red-500/20'
            : 'bg-violet-500/15'
        }`} />

        {/* Card Content */}
        <div className="relative z-10">{children}</div>
      </motion.div>
    </div>
  );
};
