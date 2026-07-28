import React, { useState, memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HeroTitle } from './HeroTitle';
import { HeroSubtitle } from './HeroSubtitle';
import { LandingCards } from './LandingCards';
import { ParticleLayer } from './ParticleLayer';
import { LightingLayer } from './LightingLayer';

interface HeroSectionProps {
  onSelectRole: (role: 'student' | 'alumni' | 'admin') => void;
  children?: React.ReactNode;
}

export const HeroSection = memo(({ onSelectRole, children }: HeroSectionProps) => {
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) - 0.5; // -0.5 to 0.5
      const ny = (e.clientY / window.innerHeight) - 0.5;
      setCoords({ x: nx, y: ny });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Parallax offsets: Hero shifts max 6px, Logo shifts max 4px
  const heroX = coords.x * 12;
  const heroY = coords.y * 12;
  const logoX = coords.x * 8;
  const logoY = coords.y * 8;

  return (
    <motion.div 
      initial={{ scale: 1.0 }}
      animate={{ scale: 1.04 }}
      transition={{ duration: 6, ease: 'easeOut' }}
      className="relative w-full flex flex-col items-center justify-center min-h-[100dvh] overflow-hidden py-12"
    >
      {/* Lighting sweep layer */}
      <LightingLayer />

      {/* Reactive particles layer */}
      <ParticleLayer mouseX={coords.x} mouseY={coords.y} />

      {/* Parallax Hero unified block container (Aligned along a single visual axis) */}
      <motion.div
        style={{
          x: heroX,
          y: heroY,
          willChange: 'transform',
        }}
        className="w-full flex flex-col items-center justify-center z-20"
      >
        {/* 1. Brand Block (Logo + Platform Label, gap: 12px) */}
        <div className="flex flex-col items-center justify-center gap-3 select-none">
          {/* Logo */}
          <motion.div
            style={{
              x: logoX - heroX,
              y: logoY - heroY,
              willChange: 'transform',
            }}
            className="flex justify-center pointer-events-none"
          >
            {children}
          </motion.div>

          {/* Platform Label */}
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.5, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-xs uppercase tracking-[0.35em] text-zinc-500 font-bold flex items-center gap-1.5"
          >
            <span className="inline-block text-violet-400">✦</span> Campus Connect Platform
          </motion.span>
        </div>

        {/* 2. Typography Block (Heading + Subtitle, gap: 20px) (mt: 28px spacing from label) */}
        <div className="flex flex-col items-center justify-center gap-5 mt-[28px]">
          <HeroTitle />
          <HeroSubtitle />
        </div>

        {/* 3. Portals Cards Grid (mt: 64px spacing from subtitle) */}
        <div className="w-full flex justify-center mt-[64px]">
          <LandingCards onSelectRole={onSelectRole} />
        </div>
      </motion.div>
    </motion.div>
  );
});

HeroSection.displayName = 'HeroSection';
