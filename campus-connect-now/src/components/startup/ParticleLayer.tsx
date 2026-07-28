import React, { useEffect, useRef, memo } from 'react';

interface ParticleLayerProps {
  mouseX: number;
  mouseY: number;
}

export const ParticleLayer = memo(({ mouseX, mouseY }: ParticleLayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isTabVisible = true;

    const width = window.innerWidth;
    const maxParticles = width < 768 ? 15 : width < 1024 ? 30 : 60;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: maxParticles }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.1 + 0.3,
      vx: (Math.random() - 0.5) * 0.08,
      vy: -Math.random() * 0.15 - 0.04,
      alpha: Math.random() * 0.3 + 0.1,
    }));

    const render = () => {
      if (!isTabVisible) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      ctx.fillStyle = '#FFFFFF';
      // Shift particles based on mouse movement (parallax)
      const shiftX = mouseX * 8;
      const shiftY = mouseY * 8;

      particles.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx;
        if (p.y < 0) {
          p.y = window.innerHeight;
          p.x = Math.random() * window.innerWidth;
        }

        const renderX = (p.x + shiftX + window.innerWidth) % window.innerWidth;
        const renderY = (p.y + shiftY + window.innerHeight) % window.innerHeight;

        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(renderX, renderY, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    const handleVisibilityChange = () => {
      isTabVisible = document.visibilityState === 'visible';
      if (isTabVisible) render();
      else cancelAnimationFrame(animId);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animId);
    };
  }, [mouseX, mouseY]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 w-full h-full" />;
});

ParticleLayer.displayName = 'ParticleLayer';
