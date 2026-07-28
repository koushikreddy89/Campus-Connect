import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoSvg from '@/assets/logo.svg';

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  trail: { x: number; y: number }[];
}

interface SplashRevealProps {
  onComplete: () => void;
}

export const SplashReveal: React.FC<SplashRevealProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Scene stages: 0 (Pure dark), 1 (Ambient particles), 2 (Volumetric light/platform), 3 (Logo assembly), 4 (Ring/Glow/Typography/Sweep), 5 (Loading finish/Complete)
  const [scene, setScene] = useState<number>(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Particle & animation references
  const particlesRef = useRef<Particle[]>([]);
  const ambientParticlesRef = useRef<{ x: number; y: number; size: number; vx: number; vy: number; alpha: number }[]>([]);
  const ringDotsRef = useRef<{ angle: number; speed: number; radius: number; size: number; color: string }[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    // Setup image loading
    const img = new Image();
    img.src = logoSvg;
    img.onload = () => {
      logoImgRef.current = img;
      setLogoLoaded(true);
    };

    // Stage timelines
    const timers: NodeJS.Timeout[] = [];
    
    if (mediaQuery.matches) {
      // Reduced motion bypasses long sequences for accessibility
      timers.push(setTimeout(() => setScene(4), 100));
      timers.push(setTimeout(() => {
        setLoadingProgress(100);
        onComplete();
      }, 1500));
      return () => timers.forEach(clearTimeout);
    }

    // SCENE 1: Darkness for 500ms, then ambient starts
    timers.push(setTimeout(() => {
      setScene(1);
    }, 500));

    // SCENE 2: The First Light / Volumetric beam + platform reveals at 1200ms
    timers.push(setTimeout(() => {
      setScene(2);
    }, 1200));

    // SCENE 3: Logo Birth (Magnetic assembly) starts at 2200ms
    timers.push(setTimeout(() => {
      setScene(3);
    }, 2200));

    // SCENE 4: Full glow, ring, typography reveal & light sweep at 3500ms
    timers.push(setTimeout(() => {
      setScene(4);
    }, 3500));

    // Fill loading indicator slowly
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Speed up at the end
        const step = prev > 80 ? 4 : 1.2;
        return Math.min(100, prev + step);
      });
    }, 50);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [onComplete]);

  // Handle transition once loading reaches 100%
  useEffect(() => {
    if (loadingProgress === 100 && scene === 4) {
      const timer = setTimeout(() => {
        setScene(5);
        // Wait for final pulse animation before triggering completion
        setTimeout(() => {
          onComplete();
        }, 800);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress, scene, onComplete]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize ambient stars
    const ambientCount = window.innerWidth < 768 ? 20 : 50;
    const ambientParticles = Array.from({ length: ambientCount }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -Math.random() * 0.25 - 0.05,
      alpha: Math.random() * 0.5 + 0.1,
    }));
    ambientParticlesRef.current = ambientParticles;

    // Initialize Ring Dots
    const ringDots = Array.from({ length: 45 }, (_, i) => ({
      angle: (i / 45) * Math.PI * 2,
      speed: (Math.random() * 0.008 + 0.004) * (Math.random() > 0.5 ? 1 : -1),
      radius: 96 + Math.random() * 8,
      size: Math.random() * 2 + 1,
      color: i % 3 === 0 ? '#7C5CFF' : i % 3 === 1 ? '#3B82F6' : '#00E5FF',
    }));
    ringDotsRef.current = ringDots;

    // Sample logo points when image is loaded
    let pointsSampled = false;
    const sampleLogoPoints = () => {
      const img = logoImgRef.current;
      if (!img || pointsSampled) return;

      const size = 128; // Size of logo on sample canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = size;
      tempCanvas.height = size;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Draw logo SVG into offscreen canvas
      tempCtx.drawImage(img, 0, 0, size, size);
      const imgData = tempCtx.getImageData(0, 0, size, size);
      const points: { x: number; y: number; color: string }[] = [];

      // Step size determines particle density
      const step = 2.5; 
      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          const idx = (Math.floor(y) * size + Math.floor(x)) * 4;
          const alpha = imgData.data[idx + 3];
          if (alpha > 80) {
            const r = imgData.data[idx];
            const g = imgData.data[idx + 1];
            const b = imgData.data[idx + 2];
            
            // Map colors to primary theme
            let themeColor = '#FFFFFF';
            if (r > 200 && g < 150) {
              themeColor = '#7C5CFF'; // Violet / Pink
            } else if (b > 200 && r < 100) {
              themeColor = '#3B82F6'; // Blue
            } else if (g > 180 && r < 100) {
              themeColor = '#00E5FF'; // Cyan
            }

            points.push({
              x: x - size / 2,
              y: y - size / 2,
              color: themeColor,
            });
          }
        }
      }

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2 - 40; // Float slightly above center

      // Create target particles
      particlesRef.current = points.map((p) => {
        // Particles fly in from random directions far away
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(window.innerWidth, window.innerHeight) * 0.8;
        const startX = centerX + Math.cos(angle) * distance + (Math.random() - 0.5) * 200;
        const startY = centerY + Math.sin(angle) * distance + (Math.random() - 0.5) * 200;

        return {
          x: startX,
          y: startY,
          targetX: centerX + p.x * 1.1, // Scale up slightly
          targetY: centerY + p.y * 1.1,
          vx: 0,
          vy: 0,
          size: Math.random() * 1.5 + 1,
          color: p.color,
          alpha: 0,
          trail: [],
        };
      });

      pointsSampled = true;
    };

    const render = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      phaseRef.current += 0.005;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2 - 40;

      // 1. Draw Ambient Particles
      if (scene >= 1) {
        ctx.fillStyle = '#FFFFFF';
        ambientParticlesRef.current.forEach((p) => {
          p.y += p.vy;
          p.x += p.vx;

          // Wrap around edges
          if (p.y < 0) {
            p.y = window.innerHeight;
            p.x = Math.random() * window.innerWidth;
          }
          if (p.x < 0 || p.x > window.innerWidth) {
            p.vx *= -1;
          }

          ctx.globalAlpha = p.alpha * (scene === 5 ? 1 - (loadingProgress / 100) : 1);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 2. Logo Particles Assembly Loop
      if (scene >= 3) {
        sampleLogoPoints();
        
        particlesRef.current.forEach((p) => {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Fly toward target using spring force
          if (dist > 0.1) {
            const force = Math.min(0.06, 1.2 / dist);
            p.vx += dx * force * 0.25;
            p.vy += dy * force * 0.25;

            // Damping / Friction
            p.vx *= 0.85;
            p.vy *= 0.85;

            p.x += p.vx;
            p.y += p.vy;

            // Fade in as they travel
            p.alpha = Math.min(1, p.alpha + 0.03);
          } else {
            p.x = p.targetX;
            p.y = p.targetY;
            p.alpha = 1;
          }

          // Render trails for flying particles
          if (dist > 30) {
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 5) p.trail.shift();

            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) {
              ctx.lineTo(p.trail[i].x, p.trail[i].y);
            }
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = p.alpha * 0.35;
            ctx.stroke();
          }

          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 3. Draw Orbiting Neural Energy Ring
      if (scene >= 4) {
        ctx.shadowBlur = 4;
        ringDotsRef.current.forEach((dot) => {
          dot.angle += dot.speed;
          
          // Orbital projection math (creates depth along Y axis)
          const rx = Math.cos(dot.angle) * dot.radius;
          const ry = Math.sin(dot.angle) * (dot.radius * 0.28); // Flatten Y to simulate tilted orbit
          
          // Rotate ring 15 degrees
          const rotatedX = rx * Math.cos(Math.PI / 12) - ry * Math.sin(Math.PI / 12);
          const rotatedY = rx * Math.sin(Math.PI / 12) + ry * Math.cos(Math.PI / 12);

          const px = centerX + rotatedX;
          const py = centerY + rotatedY;

          // Determine depth based on angle for layered drawing
          const isFront = Math.sin(dot.angle) > 0;
          ctx.globalAlpha = isFront ? 0.85 : 0.3;
          ctx.shadowColor = dot.color;
          ctx.fillStyle = dot.color;

          ctx.beginPath();
          ctx.arc(px, py, dot.size * (isFront ? 1.2 : 0.85), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.shadowBlur = 0; // Reset
      }

      ctx.globalAlpha = 1.0;
      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [scene, loadingProgress]);

  // CSS values for animations
  const pushInStyle = scene >= 2 ? {
    transform: 'scale(1.05) translate3d(0, 0, 0)',
    transition: 'transform 6.5s cubic-bezier(0.1, 0.8, 0.2, 1)',
  } : {};

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[999] bg-[#050505] flex items-center justify-center overflow-hidden transition-all duration-[800ms] ease-out select-none
        ${scene === 5 ? 'opacity-0 scale-98 pointer-events-none backdrop-blur-0' : ''}
      `}
      style={{
        perspective: '1200px',
      }}
    >
      {/* 1. Starfield / Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
      />

      {/* 2. Slow Camera Push Inner Wrapper */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={pushInStyle}>
        
        {/* Volumetric center fog/beam (Scene 2) */}
        <AnimatePresence>
          {scene >= 2 && scene < 5 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
              className="absolute w-[450px] h-[450px] pointer-events-none z-0"
              style={{
                top: 'calc(50% - 265px)',
                left: 'calc(50% - 225px)',
                background: 'radial-gradient(circle, rgba(124,92,255,0.065) 0%, rgba(59,130,246,0.02) 50%, transparent 70%)',
                filter: 'blur(30px)',
              }}
            />
          )}
        </AnimatePresence>

        {/* 3. Floating Glass Platform (Scene 2) */}
        <AnimatePresence>
          {scene >= 2 && scene < 5 && (
            <motion.div
              layoutId="logo-container"
              initial={{ opacity: 0, y: 50, rotateX: 65, rotateZ: -10 }}
              animate={{ opacity: 1, y: 0, rotateX: 62, rotateZ: -8 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{
                type: 'spring',
                stiffness: 40,
                damping: 18,
                delay: 0.2,
              }}
              className="absolute w-[220px] h-[220px] rounded-full border border-white/[0.08] backdrop-blur-[8px] z-0 flex items-center justify-center"
              style={{
                top: 'calc(50% - 150px)',
                left: 'calc(50% - 110px)',
                background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.005) 100%)',
                boxShadow: 'inset 0 0 18px rgba(255,255,255,0.03), 0 35px 60px -15px rgba(0,0,0,0.8)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Thin illuminated rim edge */}
              <div className="absolute inset-0 rounded-full border-t border-white/[0.12] pointer-events-none" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Breather Gradient Halo (Scene 4) */}
        <AnimatePresence>
          {scene >= 4 && scene < 5 && (
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                opacity: [0.38, 0.46, 0.38],
              }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: 'easeInOut',
              }}
              className="absolute w-[300px] h-[300px] rounded-full filter blur-[50px] z-0 pointer-events-none"
              style={{
                top: 'calc(50% - 190px)',
                left: 'calc(50% - 150px)',
                background: 'linear-gradient(135deg, rgba(124,92,255,0.2) 0%, rgba(59,130,246,0.15) 50%, rgba(0,229,255,0.1) 100%)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Placeholder spacer to center text below particle logo */}
        <div className="h-[120px] w-full" />

        {/* 5. Typography Reveal (Scene 6) */}
        <AnimatePresence>
          {scene >= 4 && scene < 5 && (
            <div className="z-20 text-center flex flex-col items-center mt-6">
              {/* Title Reveal */}
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-[0.25em] text-white font-sans flex items-center overflow-hidden h-[50px]">
                {"Campus Connect".split("").map((char, index) => (
                  <motion.span
                    key={index}
                    initial={{ y: 35, opacity: 0, filter: 'blur(3px)' }}
                    animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                    transition={{
                      type: 'spring',
                      stiffness: 100,
                      damping: 15,
                      delay: index * 0.035,
                    }}
                    className={char === " " ? "w-3" : "inline-block font-[900] select-none text-[#FFFFFF]"}
                    style={{ textShadow: '0 4px 20px rgba(255,255,255,0.1)' }}
                  >
                    {char}
                  </motion.span>
                ))}
              </h1>

              {/* Subtitle Reveal */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.65, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                className="text-[10px] md:text-xs tracking-[0.4em] text-[#A5A5B5] uppercase font-semibold mt-2.5 flex items-center gap-1.5"
              >
                Connect • Learn • Grow
              </motion.div>

              {/* 6. Realistic Polished Light Sweep Reflection (Scene 8) */}
              <motion.div
                initial={{ left: '-100%' }}
                animate={{ left: '150%' }}
                transition={{ duration: 0.8, delay: 1.1, ease: 'easeInOut' }}
                className="absolute w-[200px] h-[3px] bg-gradient-to-r from-transparent via-white/40 to-transparent blur-[2px] pointer-events-none z-30"
                style={{ top: 'calc(50% + 55px)' }}
              />
            </div>
          )}
        </AnimatePresence>

        {/* 7. Loading Line Indicator (Scene 9) */}
        <AnimatePresence>
          {scene >= 4 && scene < 5 && (
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="absolute flex flex-col items-center z-20"
              style={{ bottom: '90px' }}
            >
              {/* Outer line track */}
              <div className="w-[180px] h-[3px] rounded-full bg-white/[0.04] border border-white/[0.02] overflow-hidden relative">
                
                {/* Filling progress track */}
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7C5CFF] via-[#3B82F6] to-[#00E5FF] transition-all duration-[100ms] ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />

                {/* Traveling spark particle */}
                <motion.div
                  animate={{
                    left: ['0%', '100%'],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.8,
                    ease: 'easeInOut',
                  }}
                  className="absolute w-[25px] h-full bg-gradient-to-r from-transparent via-[#FFFFFF] to-transparent pointer-events-none top-0"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SplashReveal;
