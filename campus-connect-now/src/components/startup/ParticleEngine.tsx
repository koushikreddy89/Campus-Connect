import React, { useEffect, useRef, memo } from 'react';
import { StartupPhaseType, StartupPhase } from '@/pages/WelcomePage';

interface ParticleEngineProps {
  phase: StartupPhaseType;
}

export const ParticleEngine = memo(({ phase }: ParticleEngineProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (phase === StartupPhase.LANDING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isTabVisible = true;

    // Detect device scale & capacity
    const width = window.innerWidth;
    const maxParticles = width < 768 ? 15 : width < 1024 ? 30 : 60;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    // Drifting particles (stars & flow field)
    const particles = Array.from({ length: maxParticles }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.2 + 0.4,
      vx: (Math.random() - 0.5) * 0.1,
      vy: -Math.random() * 0.2 - 0.05,
      alpha: Math.random() * 0.4 + 0.15,
    }));

    const render = () => {
      if (!isTabVisible) return; // Pause loops when tab is inactive

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      ctx.fillStyle = '#FFFFFF';
      particles.forEach((p) => {
        // Simple drift physics
        p.y += p.vy;
        p.x += p.vx;
        if (p.y < 0) {
          p.y = window.innerHeight;
          p.x = Math.random() * window.innerWidth;
        }

        // Proximity attraction force during assembly phases
        if (phase === StartupPhase.PRELOAD || phase === StartupPhase.SPLASH) {
          const dx = centerX - p.x;
          const dy = centerY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 20) {
            p.x += (dx / dist) * 0.5;
            p.y += (dy / dist) * 0.5;
          }
        }

        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(render);
    };

    render();

    // Listen to tab visibility
    const handleVisibilityChange = () => {
      isTabVisible = document.visibilityState === 'visible';
      if (isTabVisible) {
        render();
      } else {
        cancelAnimationFrame(animId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animId);
    };
  }, [phase]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 w-full h-full" />;
});

ParticleEngine.displayName = 'ParticleEngine';
