import React, { memo } from 'react';

export const BackgroundScene = memo(() => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
      {/* Animated radial moving light source */}
      <div 
        className="absolute w-[150%] h-[150%] -top-[25%] -left-[25%] opacity-40 mix-blend-screen animate-pulse"
        style={{
          background: 'radial-gradient(circle at 45% 45%, rgba(124,92,255,0.07) 0%, rgba(59,130,246,0.03) 35%, transparent 65%)',
          animationDuration: '12s',
          willChange: 'transform',
        }}
      />
      <div 
        className="absolute w-[130%] h-[130%] -top-[15%] -left-[15%] opacity-30 mix-blend-screen"
        style={{
          background: 'radial-gradient(circle at 55% 65%, rgba(0,229,255,0.05) 0%, rgba(124,92,255,0.02) 40%, transparent 70%)',
          willChange: 'transform',
        }}
      />

      {/* Cinematic dark radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(5,5,5,0.92)_100%)]" />

      {/* Fine-grain noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
});

BackgroundScene.displayName = 'BackgroundScene';
