import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { ArrowRight, ArrowLeft, Mail, Shield, GraduationCap, Loader2, Trophy, Sparkles, Eye, EyeOff, Lock, Check, X, RefreshCw } from 'lucide-react';
import { isValidAcademicEmail } from '@/utils/validation';
import { useNavigate } from 'react-router-dom';
import { OTPForm } from '@/components/OTPInput';
import { Logo } from '@/components/Logo';
import { SplashReveal } from '@/components/SplashReveal';
import { BackgroundScene } from '@/components/startup/BackgroundScene';
import { ParticleEngine } from '@/components/startup/ParticleEngine';
import { SharedLogo } from '@/components/startup/SharedLogo';
import { LandingTransition, LandingItem } from '@/components/startup/LandingTransition';
import { HeroSection } from '@/components/startup/HeroSection';

type Step = 'roleSelect' | 'auth' | 'otp' | 'mfa' | 'forgotPassword';
type AuthMode = 'login' | 'signup';

// Animated background with slow glowing orbs and drifting particles
function AmbientBackground() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      
      {/* Floating Orbs - static/no motion if prefers-reduced-motion */}
      <motion.div 
        animate={prefersReduced ? {} : { 
          scale: [1, 1.08, 1], 
          x: [0, 20, 0], 
          y: [0, -25, 0] 
        }} 
        transition={{ 
          repeat: Infinity, 
          duration: 30, 
          ease: 'easeInOut' 
        }} 
        className="absolute top-[10%] left-[15%] h-[350px] w-[350px] rounded-full bg-violet-600/5 blur-[120px]" 
      />
      <motion.div 
        animate={prefersReduced ? {} : { 
          scale: [1, 1.12, 1], 
          x: [0, -25, 0], 
          y: [0, 30, 0] 
        }} 
        transition={{ 
          repeat: Infinity, 
          duration: 35, 
          ease: 'easeInOut',
          delay: 4
        }} 
        className="absolute bottom-[20%] right-[15%] h-[450px] w-[450px] rounded-full bg-amber-500/3 blur-[140px]" 
      />
      <motion.div 
        animate={prefersReduced ? {} : { 
          scale: [1, 1.1, 1], 
          x: [0, 15, 0], 
          y: [0, 15, 0] 
        }} 
        transition={{ 
          repeat: Infinity, 
          duration: 32, 
          ease: 'easeInOut',
          delay: 8
        }} 
        className="absolute top-[40%] right-[30%] h-[300px] w-[300px] rounded-full bg-sky-500/3 blur-[100px]" 
      />
      
      {/* Tiny glowing particles (fewer on mobile) */}
      {!prefersReduced && (
        <div className="absolute inset-0 opacity-[0.25]">
          {[...Array(isMobile ? 8 : 16)].map((_, i) => {
            const size = Math.random() * 3 + 1;
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const duration = Math.random() * 20 + 20;
            const delay = Math.random() * -20;
            return (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white/40 blur-[1px]"
                style={{
                  width: size,
                  height: size,
                  left: `${left}%`,
                  top: `${top}%`,
                }}
                animate={{
                  y: [0, -100, 0],
                  x: [0, Math.random() * 30 - 15, 0],
                  opacity: [0.15, 0.7, 0.15]
                }}
                transition={{
                  duration: duration,
                  repeat: Infinity,
                  delay: delay,
                  ease: "linear"
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Staggered word animation for heading
function WordStaggerHeading({ text }: { text: string }) {
  const words = text.split(" ");
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      }
    }
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 120,
      }
    }
  };

  return (
    <motion.h1 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 mb-4"
    >
      {words.map((word, idx) => (
        <motion.span key={idx} variants={wordVariants} className="inline-block mr-3">
          {word}
        </motion.span>
      ))}
    </motion.h1>
  );
}

// Icon Wrapper animation (propagates hover from parent)
function AnimatedIcon({ children, role }: { children: React.ReactNode; role: 'student' | 'alumni' | 'admin' }) {
  const bgColors = {
    student: 'bg-violet-600/10 border-violet-500/20 group-hover:bg-violet-600/20 group-hover:border-violet-500/30',
    alumni: 'bg-amber-600/10 border-amber-500/20 group-hover:bg-amber-600/20 group-hover:border-amber-500/30',
    admin: 'bg-sky-600/10 border-sky-500/20 group-hover:bg-sky-600/20 group-hover:border-sky-500/30'
  };

  return (
    <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 border transition-all duration-300 ${bgColors[role]}`}>
      <motion.div
        className="flex items-center justify-center"
        variants={{
          hover: {
            scale: 1.15,
            rotate: 8,
            filter: "drop-shadow(0 0 6px currentColor)"
          }
        }}
        transition={{ type: "spring", stiffness: 350, damping: 15 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Link CTA arrow slide and growing underline (propagates hover from parent)
function AnimatedCTA({ text, role }: { text: string; role: 'student' | 'alumni' | 'admin' }) {
  const colors = {
    student: 'text-violet-400 group-hover:text-violet-300',
    alumni: 'text-amber-400 group-hover:text-amber-300',
    admin: 'text-sky-400 group-hover:text-sky-300'
  };

  const underlineColors = {
    student: 'bg-violet-400 group-hover:bg-violet-300',
    alumni: 'bg-amber-400 group-hover:bg-amber-300',
    admin: 'bg-sky-400 group-hover:bg-sky-300'
  };

  return (
    <div className={`inline-flex flex-col relative items-start gap-1 font-semibold text-sm mt-6 transition-colors duration-250 ${colors[role]}`}>
      <div className="flex items-center gap-2">
        <span>{text}</span>
        <motion.div
          variants={{
            hover: { x: 8 }
          }}
          transition={{ type: "spring", stiffness: 350, damping: 20 }}
        >
          <ArrowRight className="h-4 w-4" />
        </motion.div>
      </div>
      <span className="w-full h-[1px] relative overflow-hidden bg-white/5 mt-0.5">
        <motion.span 
          className={`absolute left-0 top-0 bottom-0 w-full ${underlineColors[role]}`}
          initial={{ x: "-100%" }}
          variants={{
            hover: { x: "0%" }
          }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        />
      </span>
    </div>
  );
}

// Apple/Linear style card with mouse parallax, spotlight following, floating animation, and smooth tap
function CardWrapper({ 
  children, 
  onClick, 
  role, 
  delay 
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  role: 'student' | 'alumni' | 'admin'; 
  delay: number; 
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Parallax rotation motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Spotlight position motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlightOpacity = useMotionValue(0);

  // Springs for smooth movement
  const rotateX = useSpring(useTransform(y, [-150, 150], [5, -5]), { damping: 25, stiffness: 120 });
  const rotateY = useSpring(useTransform(x, [-150, 150], [-5, 5]), { damping: 25, stiffness: 120 });
  const spotlightSpr = useSpring(spotlightOpacity, { damping: 20, stiffness: 120 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const isMobile = window.innerWidth < 768;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Position relative to card top-left
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    mouseX.set(clientX);
    mouseY.set(clientY);
    spotlightOpacity.set(0.12);
    
    if (!prefersReduced && !isMobile) {
      const centerX = clientX - width / 2;
      const centerY = clientY - height / 2;
      x.set(centerX);
      y.set(centerY);
    }
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    spotlightOpacity.set(0);
  };

  const glowColorMap = {
    student: 'rgba(139, 92, 246, 0.15)',
    alumni: 'rgba(245, 158, 11, 0.15)',
    admin: 'rgba(14, 165, 233, 0.15)'
  };
  
  const activeGlowColor = glowColorMap[role];
  
  // Continuous floating vertical motion config (reduced on mobile/prefers-reduced-motion)
  const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const floatY = (prefersReducedMotion || isMobileDevice) ? [0, 0] : (role === 'student' ? [-3, 3] : role === 'alumni' ? [-4, 2] : [-2, 4]);
  const floatDuration = role === 'student' ? 6 : role === 'alumni' ? 7 : 8;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: "spring",
        damping: 20,
        stiffness: 90,
        delay: delay 
      }}
      className="w-full h-full"
    >
      <motion.div
        animate={prefersReducedMotion ? {} : {
          y: floatY,
        }}
        transition={{
          repeat: Infinity,
          repeatType: "reverse",
          duration: floatDuration,
          ease: "easeInOut",
          delay: delay * 0.5
        }}
        className="w-full h-full"
      >
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={onClick}
          style={{
            rotateX: rotateX,
            rotateY: rotateY,
            transformStyle: "preserve-3d",
            perspective: 1000
          }}
          whileHover="hover"
          animate={{
            y: 0,
            scale: 1,
          }}
          variants={{
            hover: {
              y: -8,
              scale: 1.04,
              transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] }
            }
          }}
          whileTap={{ scale: 0.97 }}
          className={`group relative cursor-pointer rounded-[20px] p-8 bg-white/[0.03] border border-white/[0.08] backdrop-blur-[18px] transition-colors duration-300 flex flex-col justify-between min-h-[260px] select-none overflow-hidden
            ${role === 'student' ? 'hover:border-violet-500/40 hover:bg-white/[0.05] hover:shadow-[0_0_50px_-15px_rgba(139,92,246,0.18)]' : ''}
            ${role === 'alumni' ? 'hover:border-amber-500/40 hover:bg-white/[0.05] hover:shadow-[0_0_50px_-15px_rgba(245,158,11,0.18)]' : ''}
            ${role === 'admin' ? 'hover:border-sky-500/40 hover:bg-white/[0.05] hover:shadow-[0_0_50px_-15px_rgba(14,165,233,0.18)]' : ''}
          `}
        >
          {/* Spotlight Effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: useTransform(
                [mouseX, mouseY, spotlightSpr],
                ([mx, my, op]) => `radial-gradient(300px circle at ${mx}px ${my}px, rgba(255, 255, 255, ${op}), transparent 80%)`
              )
            }}
          />

          {/* Ambient Glow behind card */}
          <div 
            className="absolute -inset-[1px] rounded-[20px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[-1]"
            style={{
              background: `radial-gradient(200px circle at 50% 50%, ${activeGlowColor}, transparent 80%)`,
            }}
          />

          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

const anim = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

export type StartupPhaseType = 'boot' | 'preload' | 'splash' | 'transition' | 'landing';

export const StartupPhase = {
  BOOT: 'boot',
  PRELOAD: 'preload',
  SPLASH: 'splash',
  TRANSITION: 'transition',
  LANDING: 'landing'
} as const;

export function useStartupController(initialPhase: StartupPhaseType = StartupPhase.BOOT) {
  const [phase, setPhase] = useState<StartupPhaseType>(initialPhase);
  return { phase, setPhase };
}

export default function WelcomePage() {
  const { phase, setPhase } = useStartupController(
    typeof window !== 'undefined' && sessionStorage.getItem('cc_splash_played')
      ? StartupPhase.LANDING
      : StartupPhase.BOOT
  );
  const [loadingProgress, setLoadingProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (phase === StartupPhase.LANDING) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setPhase(StartupPhase.LANDING);
      sessionStorage.setItem('cc_splash_played', 'true');
      return;
    }

    // Preload critical assets with an absolute max timeout of 400ms (from 300ms to 700ms)
    const preloadPromise = new Promise<void>((resolve) => {
      const img = new Image();
      img.src = '/logo.svg';
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });

    const timeoutPromise = new Promise<void>((resolve) => 
      setTimeout(resolve, 400)
    );

    // Emergency Failsafe: Hard-enforced 5-second destroyer that cannot be cancelled
    // Emergency Failsafe: Hard-enforced 6-second destroyer that cannot be cancelled
    // Emergency Failsafe: Hard-enforced 7-second destroyer that cannot be cancelled
    const failsafeId = setTimeout(() => {
      setPhase(StartupPhase.LANDING);
      sessionStorage.setItem('cc_splash_played', 'true');
      console.warn("⚠️ Splash screen emergency failsafe activated!");
    }, 12000);

    const addTimer = (fn: () => void, delay: number) => {
      timersRef.current.push(setTimeout(fn, delay));
    };

    // Phase 1: 0.0s - 1.0s: BOOT (Tiny center logo / glow)
    // Phase 2: 1.0s: Transition to PRELOAD (Orbiting particles)
    addTimer(() => {
      setPhase(StartupPhase.PRELOAD);
      Promise.race([preloadPromise, timeoutPromise]).then(() => {
        console.log("✅ Static preloading completed or timed out.");
      });
    }, 1000);

    // Phase 3: 3.5s: Transition to SPLASH (Drawing & Connect)
    addTimer(() => {
      setPhase(StartupPhase.SPLASH);
    }, 3500);

    // Phase 5: 10.0s: Transition to TRANSITION (Collapsing to navbar size / Fade everything together)
    addTimer(() => {
      setPhase(StartupPhase.TRANSITION);
    }, 10000);

    // Phase 6: 10.8s: Transition to LANDING (Landing page active, cards and headers stagger in / Open home screen)
    addTimer(() => {
      setPhase(StartupPhase.LANDING);
      sessionStorage.setItem('cc_splash_played', 'true');
      clearTimeout(failsafeId);

      // Trigger background health check only AFTER landing page is visible
      import('@/services/connectionService').then(({ checkBackendHealth }) => {
        checkBackendHealth();
      });
    }, 10800);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (phase === StartupPhase.BOOT || phase === StartupPhase.PRELOAD) {
      setLoadingProgress(0);
    } else if (phase === StartupPhase.SPLASH) {
      const start = Date.now();
      const duration = 1800; // from 700ms to 2500ms
      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, (elapsed / duration) * 100);
        setLoadingProgress(pct);
        if (elapsed >= duration) clearInterval(interval);
      }, 16);
      return () => clearInterval(interval);
    } else {
      setLoadingProgress(100);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === StartupPhase.LANDING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    // Distant background stars
    const stars = Array.from({ length: 50 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.1 + 0.3,
      vx: (Math.random() - 0.5) * 0.08,
      vy: -Math.random() * 0.15 - 0.03,
      alpha: Math.random() * 0.35 + 0.1,
    }));

    // Microscopic glowing flow field particles
    const flowParticles = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: 0,
      vy: 0,
      size: Math.random() * 1.3 + 0.6,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    // 3D Orbital ring particles
    const ringParticles = Array.from({ length: 45 }, (_, i) => ({
      angle: (i / 45) * Math.PI * 2,
      radius: 115,
      size: Math.random() * 1.0 + 1.0,
      ringIndex: i % 3, // 0: flat, 1: tilted, 2: vertical
    }));

    const render = () => {
      // Clear with high alpha decay to create soft fluid trails
      ctx.fillStyle = 'rgba(5, 5, 5, 0.14)';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // 1. Draw space background stars
      ctx.fillStyle = '#FFFFFF';
      stars.forEach((s) => {
        s.y += s.vy;
        s.x += s.vx;
        if (s.y < 0) {
          s.y = window.innerHeight;
          s.x = Math.random() * window.innerWidth;
        }
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw procedural flow field particles (Spiral inward)
      if (phase === StartupPhase.PRELOAD || phase === StartupPhase.SPLASH) {
        flowParticles.forEach((p) => {
          const dx = centerX - p.x;
          const dy = centerY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 15) {
            const pullForce = 0.04 * (1 - dist / Math.max(window.innerWidth, window.innerHeight));
            const tangentX = -dy / dist;
            const tangentY = dx / dist;
            const speedMultiplier = dist < 200 ? 0.22 : 0.12;

            p.vx += (dx / dist) * pullForce + tangentX * speedMultiplier;
            p.vy += (dy / dist) * pullForce + tangentY * speedMultiplier;
          } else {
            p.x = Math.random() > 0.5 ? 0 : window.innerWidth;
            p.y = Math.random() * window.innerHeight;
            p.vx = 0;
            p.vy = 0;
          }

          p.vx *= 0.95;
          p.vy *= 0.95;
          p.x += p.vx;
          p.y += p.vy;

          // Proximity color transition: Purple -> Blue -> Cyan -> White
          let color = '#7C5CFF';
          if (dist < 80) color = '#FFFFFF';
          else if (dist < 160) color = '#00E5FF';
          else if (dist < 320) color = '#3B82F6';

          ctx.fillStyle = color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 3. Draw 3D projected orbital rings
      if (phase === StartupPhase.SPLASH) {
        ringParticles.forEach((p) => {
          const speed = p.ringIndex === 0 ? 0.005 : p.ringIndex === 1 ? -0.008 : 0.012;
          p.angle += speed;

          if (Math.random() < 0.002) {
            p.ringIndex = (p.ringIndex + 1) % 3;
          }

          let rx = Math.cos(p.angle) * p.radius;
          let ry = Math.sin(p.angle) * p.radius;
          let px = 0;
          let py = 0;
          let isFront = true;

          if (p.ringIndex === 0) {
            const tiltY = ry * 0.25;
            const rotX = rx * Math.cos(Math.PI / 18) - tiltY * Math.sin(Math.PI / 18);
            const rotY = rx * Math.sin(Math.PI / 18) + tiltY * Math.cos(Math.PI / 18);
            px = centerX + rotX;
            py = centerY + rotY;
            isFront = Math.sin(p.angle) > 0;
          } else if (p.ringIndex === 1) {
            const tiltY = ry * 0.38;
            const rotX = rx * Math.cos(-Math.PI / 6) - tiltY * Math.sin(-Math.PI / 6);
            const rotY = rx * Math.sin(-Math.PI / 6) + tiltY * Math.cos(-Math.PI / 6);
            px = centerX + rotX;
            py = centerY + rotY;
            isFront = Math.cos(p.angle) > 0;
          } else {
            const tiltY = ry * 0.16;
            const rotX = rx * Math.cos(Math.PI / 4) - tiltY * Math.sin(Math.PI / 4);
            const rotY = rx * Math.sin(Math.PI / 4) + tiltY * Math.cos(Math.PI / 4);
            px = centerX + rotX;
            py = centerY + rotY;
            isFront = Math.sin(p.angle) < 0;
          }

          ctx.globalAlpha = isFront ? 0.8 : 0.2;
          const dotColor = p.ringIndex === 0 ? '#7C5CFF' : p.ringIndex === 1 ? '#3B82F6' : '#00E5FF';
          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(px, py, p.size * (isFront ? 1.3 : 0.8), 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 4. Subtle Film Noise Grain (AAA Film Quality)
      ctx.globalAlpha = 0.025;
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 400; i++) {
        const gx = Math.random() * window.innerWidth;
        const gy = Math.random() * window.innerHeight;
        ctx.fillRect(gx, gy, 1.2, 1.2);
      }

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [phase]);

  const [step, setStep] = useState<Step>('roleSelect');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  
  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [batch, setBatch] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Captcha states
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaChallenge, setCaptchaChallenge] = useState<{
    captchaId: string;
    equation: string;
    expiresAt: number;
    signature: string;
  } | null>(null);

  // Resend OTP states
  const [canResendOTP, setCanResendOTP] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Status and messages
  const [localError, setLocalError] = useState<string | null>(null);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);

  // AuthStore selections
  const registerUser = useAuthStore(s => s.registerUser);
  const login = useAuthStore(s => s.login);
  const verifyEmailCode = useAuthStore(s => s.verifyEmailCode);
  const verifyMfa = useAuthStore(s => s.verifyMfa);
  const forgotPassword = useAuthStore(s => s.forgotPassword);
  const getCaptchaChallenge = useAuthStore(s => s.getCaptchaChallenge);
  const setRole = useAuthStore(s => s.setRole);
  const role = useAuthStore(s => s.role);
  const isLoading = useAuthStore(s => s.isLoading);
  const storeError = useAuthStore(s => s.error);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const debugOtp = useAuthStore(s => s.debugOtp);
  const debugResetLink = useAuthStore(s => s.debugResetLink);

  const navigate = useNavigate();

  // Sync store errors with local error display
  useEffect(() => {
    if (storeError) {
      setLocalError(storeError);
    }
  }, [storeError]);

  // Redirect after successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'alumni') {
        navigate('/alumni/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    }
  }, [isAuthenticated, role, navigate]);

  // Handle resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) {
      setCanResendOTP(true);
      return;
    }

    const interval = setInterval(() => {
      setResendCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCountdown]);

  // CAPTCHA loading helper
  const loadCaptcha = async () => {
    setCaptchaAnswer('');
    try {
      const challenge = await getCaptchaChallenge();
      if (challenge && challenge.success) {
        setCaptchaChallenge({
          captchaId: challenge.captchaId,
          equation: challenge.equation,
          expiresAt: challenge.expiresAt,
          signature: challenge.signature
        });
      }
    } catch (err: any) {
      setLocalError('Failed to load security CAPTCHA challenge.');
    }
  };

  // Load captcha when showCaptcha becomes true
  useEffect(() => {
    if (showCaptcha) {
      loadCaptcha();
    }
  }, [showCaptcha]);

  const handleRoleSelection = (selectedRole: 'student' | 'alumni' | 'admin') => {
    setRole(selectedRole);
    setLocalError(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setRollNumber('');
    setBatch(selectedRole === 'alumni' ? 'Class of 2024' : '2026');
    setShowCaptcha(false);
    setCaptchaChallenge(null);
    
    if (selectedRole === 'admin') {
      setAuthMode('login'); // Admins cannot sign up
    }
    setStep('auth');
  };

  // Password complexity checks
  const checkPasswordRequirements = (pass: string) => {
    return [
      { label: 'At least 8 characters long', met: pass.length >= 8 },
      { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(pass) },
      { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(pass) },
      { label: 'One digit (0-9)', met: /[0-9]/.test(pass) },
      { label: 'One special character (e.g. @, #, $, !)', met: /[^A-Za-z0-9]/.test(pass) }
    ];
  };

  const getPasswordStrengthScore = (pass: string) => {
    return checkPasswordRequirements(pass).filter(r => r.met).length;
  };

  const isPasswordValid = (pass: string) => {
    return checkPasswordRequirements(pass).every(r => r.met);
  };

  const getActiveEmail = () => {
    return email.toLowerCase().trim();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Email and password are required.');
      return;
    }

    if (showCaptcha && !captchaAnswer) {
      setLocalError('Please complete the security CAPTCHA.');
      return;
    }

    // Health check prior to authentication attempt
    try {
      const { checkBackendHealth } = await import('@/services/connectionService');
      const health = await checkBackendHealth();
      if (!health) {
        setLocalError('Backend server is offline or unreachable. Please verify server status at http://localhost:5000.');
        return;
      }
    } catch (healthErr) {
      console.warn('⚠️ Pre-login health check warning:', healthErr);
    }

    const payload: any = {
      email: email.toLowerCase().trim(),
      password,
    };

    if (showCaptcha && captchaChallenge) {
      payload.captchaId = captchaChallenge.captchaId;
      payload.captchaAnswer = parseInt(captchaAnswer);
      payload.captchaExpiresAt = captchaChallenge.expiresAt;
      payload.captchaSignature = captchaChallenge.signature;
    }

    const res = await login(payload);
    if (res.success) {
      setShowCaptcha(false);
      setCaptchaChallenge(null);
      setCaptchaAnswer('');
      if (res.mfaRequired) {
        setStep('mfa');
        setCanResendOTP(false);
        setResendCountdown(30);
      }
    } else {
      if (res.requireCaptcha) {
        setShowCaptcha(true);
        loadCaptcha();
      }
      if (res.isBackendOffline) {
        setLocalError('Backend server is currently offline or unreachable.');
      } else {
        setLocalError(res.error || res.message || 'Invalid email or password.');
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const lowerEmail = email.toLowerCase().trim();
    if (!name || !lowerEmail || !password || !confirmPassword) {
      setLocalError('All fields are required.');
      return;
    }

    if (role === 'student' && !isValidAcademicEmail(lowerEmail)) {
      setLocalError('Please use your official college email address.');
      return;
    }

    if (!isPasswordValid(password)) {
      setLocalError('Please ensure your password meets all complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (role === 'alumni' && (!rollNumber || !batch)) {
      setLocalError('Alumni records verification requires roll number and batch.');
      return;
    }

    const payload: any = {
      email: lowerEmail,
      password,
      name,
      role,
      batch: batch || '2024',
    };

    if (role === 'student') {
      payload.department = department;
    } else if (role === 'alumni') {
      payload.rollNumber = rollNumber.toUpperCase().trim();
    }

    const res = await registerUser(payload);
    if (res.success) {
      setStep('otp');
      setCanResendOTP(false);
      setResendCountdown(30);
    } else {
      setLocalError(res.error || 'Registration failed. Please contact support.');
    }
  };

  const handleVerifyEmailOtp = async (code: string) => {
    setLocalError(null);
    const success = await verifyEmailCode(code);
    if (!success) {
      setLocalError(useAuthStore.getState().error || 'Email verification failed. The code may be incorrect or expired.');
    }
  };

  const handleVerifyMfaOtp = async (code: string) => {
    setLocalError(null);
    await verifyMfa(code);
    const err = useAuthStore.getState().error;
    if (err) {
      setLocalError(err);
    }
  };

  const handleResendOtp = async () => {
    setLocalError(null);
    setCanResendOTP(false);
    setResendCountdown(30);

    if (authMode === 'signup') {
      // Re-trigger signup payload or dispatch new email verify
      const payload: any = {
        email: email.toLowerCase().trim(),
        password,
        name,
        role,
        batch: batch || '2024',
      };
      if (role === 'student') {
        payload.department = department;
      } else if (role === 'alumni') {
        payload.rollNumber = rollNumber;
      }
      await registerUser(payload);
    } else {
      // Login resend MFA
      const payload = { email: email.toLowerCase().trim(), password };
      await login(payload);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email) {
      setLocalError('Email is required.');
      return;
    }

    const res = await forgotPassword(email.toLowerCase().trim());
    if (res.success) {
      setForgotEmailSent(true);
    } else {
      setLocalError(res.error || 'Failed to dispatch password reset request.');
    }
  };

  // Password complexity criteria checkmark state
  const passwordStrengthScore = getPasswordStrengthScore(password);
  const passwordRequirements = checkPasswordRequirements(password);

  const isCenteredPhase = phase === StartupPhase.BOOT || phase === StartupPhase.PRELOAD || phase === StartupPhase.SPLASH || phase === StartupPhase.TRANSITION;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center text-white relative overflow-hidden px-4 md:px-8 font-sans select-none bg-[#09090B]">
      
      {/* Background radial gradients, fog, noise */}
      <BackgroundScene />

      {/* Capped GPU Particles */}
      <ParticleEngine phase={phase} />

      {/* Main Content Container (Max width 1440px, centered) */}
      <div className="relative z-10 w-full max-w-[1440px] min-h-[100dvh] flex flex-col items-center justify-center py-6 md:py-12">
        
        {/* If splash phases, render centered logo overlay with premium crossfade fadeout */}
        {isCenteredPhase && (
          <motion.div 
            initial={{ opacity: 1, scale: 1 }}
            animate={{ 
              opacity: phase === StartupPhase.TRANSITION ? 0 : 1,
              scale: phase === StartupPhase.TRANSITION ? 1.02 : 1
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <SharedLogo phase={phase} />
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {(phase === StartupPhase.TRANSITION || phase === StartupPhase.LANDING) && (
            <div className="w-full flex flex-col items-center justify-center">
              
              {/* STEP 1: ROLE SELECT (LANDING) */}
              {step === 'roleSelect' && phase === StartupPhase.LANDING && (
                <HeroSection onSelectRole={handleRoleSelection}>
                  <SharedLogo phase={phase} />
                </HeroSection>
              )}

              {/* AUTH STEPS (Not in HeroSection layout, but they use the standard card styling) */}
              {step !== 'roleSelect' && (
                <LandingTransition delay={0}>
                  
                  {/* Header section (Visible during Transition and Landing) */}
                  <LandingItem className="flex flex-col items-center justify-center mb-8">
                    <SharedLogo phase={phase} />
                    
                    {phase === StartupPhase.LANDING && (
                      <motion.span 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-semibold flex items-center gap-1.5 mt-4"
                      >
                        <Sparkles className="h-3 w-3 text-violet-400" /> Campus Connect Platform
                      </motion.span>
                    )}
                  </LandingItem>

          {/* STEP 2: AUTH (LOGIN & SIGNUP) */}
          {step === 'auth' && (
            <motion.div key="auth" {...anim} className="w-full max-w-[480px]">
              <div className="rounded-3xl p-8 bg-zinc-950/40 border border-zinc-900 backdrop-blur-xl shadow-2xl flex flex-col items-center">
                
                {/* Header Icon based on role */}
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 border ${
                  role === 'alumni' ? 'bg-amber-600/10 border-amber-500/20' : 
                  role === 'admin' ? 'bg-sky-600/10 border-sky-500/20' : 
                  'bg-violet-600/10 border-violet-500/20'
                }`}>
                  {role === 'alumni' ? <Trophy className="h-6 w-6 text-amber-400" /> :
                   role === 'admin' ? <Shield className="h-6 w-6 text-sky-400" /> :
                   <GraduationCap className="h-6 w-6 text-violet-400" />}
                </div>

                <h2 className="text-2xl font-bold mb-2 text-center text-white capitalize">{role} Hub</h2>
                <p className="text-zinc-400 text-xs text-center mb-6">
                  {role === 'admin' 
                    ? 'Secure authorized administrator gatekeeper access.' 
                    : `Access or join the Campus Connect enterprise platform as ${role === 'alumni' ? 'an alumnus' : 'a student'}.`}
                </p>

                {/* Login / Signup Toggle tab (students/alumni only) */}
                {role !== 'admin' && (
                  <div className="flex w-full bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/80 mb-6">
                    <button
                      onClick={() => { setAuthMode('login'); setLocalError(null); }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                        authMode === 'login' 
                          ? 'bg-zinc-800 text-white shadow-sm' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => { setAuthMode('signup'); setLocalError(null); }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                        authMode === 'signup' 
                          ? 'bg-zinc-800 text-white shadow-sm' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>
                )}

                {/* FORM */}
                <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="w-full space-y-4">
                  
                  {/* Signup Specific Fields */}
                  {authMode === 'signup' && (
                    <div className="space-y-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Full Name</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Jane Doe"
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                        />
                      </div>

                      {/* Alumni Specific details */}
                      {role === 'alumni' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Roll Number</label>
                            <input
                              type="text"
                              required
                              value={rollNumber}
                              onChange={e => setRollNumber(e.target.value)}
                              placeholder="e.g. 20B81A0501"
                              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all uppercase"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Batch</label>
                            <input
                              type="text"
                              required
                              value={batch}
                              onChange={e => setBatch(e.target.value)}
                              placeholder="e.g. Class of 2024"
                              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                            />
                          </div>
                        </div>
                      )}

                      {/* Student Specific details */}
                      {role === 'student' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Department</label>
                            <select
                              value={department}
                              onChange={e => setDepartment(e.target.value)}
                              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-white outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                            >
                              <option value="Computer Science">Computer Science</option>
                              <option value="Information Technology">Information Technology</option>
                              <option value="Electronics & Communication">Electronics & Comm</option>
                              <option value="Electrical Engineering">Electrical Eng</option>
                              <option value="Mechanical Engineering">Mechanical Eng</option>
                              <option value="Civil Engineering">Civil Eng</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Grad Year</label>
                            <input
                              type="text"
                              required
                              value={batch}
                              onChange={e => setBatch(e.target.value)}
                              placeholder="e.g. 2026"
                              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">
                      {role === 'alumni' ? 'Personal Email' : role === 'admin' ? 'Administrator Email' : 'College Email'}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={role === 'alumni' ? 'jane@gmail.com' : role === 'admin' ? 'admin@college.edu' : 'jane@college.edu'}
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Password</label>
                      {authMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => { setStep('forgotPassword'); setLocalError(null); }}
                          className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password (Signup only) */}
                  {authMode === 'signup' && (
                    <div className="space-y-1.5">
                      <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Password Strength Checklist (Signup only) */}
                  {authMode === 'signup' && password && (
                    <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/80 space-y-2.5">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-zinc-400">Password Strength:</span>
                        <span className={
                          passwordStrengthScore <= 2 ? 'text-red-400' :
                          passwordStrengthScore <= 4 ? 'text-amber-400' :
                          'text-green-400'
                        }>
                          {passwordStrengthScore <= 2 ? 'Weak' :
                           passwordStrengthScore <= 4 ? 'Medium' :
                           'Strong'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            passwordStrengthScore <= 2 ? 'bg-red-500 w-1/3' :
                            passwordStrengthScore <= 4 ? 'bg-amber-500 w-2/3' :
                            'bg-green-500 w-full'
                          }`}
                        />
                      </div>
                      <div className="space-y-1 text-xs">
                        {passwordRequirements.map((req, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            {req.met ? (
                              <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            )}
                            <span className={req.met ? 'text-zinc-300' : 'text-zinc-500'}>{req.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CAPTCHA challenge section (Login only, shown on requirement) */}
                  {authMode === 'login' && showCaptcha && captchaChallenge && (
                    <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Security verification CAPTCHA</span>
                        <button
                          type="button"
                          onClick={loadCaptcha}
                          className="text-violet-400 hover:text-violet-300 text-xs font-semibold flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" /> Refresh
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="bg-zinc-950 px-4 py-2.5 rounded-xl border border-zinc-800 font-mono text-lg text-violet-400 font-bold tracking-wider select-none">
                          {captchaChallenge.equation}
                        </div>
                        <input
                          type="number"
                          required
                          value={captchaAnswer}
                          onChange={e => setCaptchaAnswer(e.target.value)}
                          placeholder="Answer"
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-violet-500/30 transition-all text-center text-lg font-bold"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500 text-center leading-normal">
                        To protect your account, a CAPTCHA verification is required after multiple failed login attempts.
                      </p>
                    </div>
                  )}

                  {/* Error display */}
                  {localError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 py-2.5 px-3 rounded-lg"
                    >
                      {localError}
                    </motion.div>
                  )}

                  {/* SUBMIT BUTTON */}
                  <Button
                    type="submit"
                    disabled={isLoading || (authMode === 'signup' && !isPasswordValid(password))}
                    className={`w-full font-semibold py-3 h-12 rounded-xl transition-all duration-200 mt-2 text-white ${
                      role === 'alumni' ? 'bg-amber-600 hover:bg-amber-500' :
                      role === 'admin' ? 'bg-sky-600 hover:bg-sky-500' :
                      'bg-violet-600 hover:bg-violet-500'
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" /> processing...
                      </span>
                    ) : (
                      authMode === 'login' ? 'Sign In Securely' : 'Register Account'
                    )}
                  </Button>
                </form>

                {/* Back to Role Select */}
                <button
                  type="button"
                  onClick={() => setStep('roleSelect')}
                  className="mt-6 text-zinc-500 hover:text-zinc-300 font-semibold text-sm transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Change Portal
                </button>

              </div>
            </motion.div>
          )}

          {/* STEP 3: OTP VERIFICATION (EMAIL SIGNUP VERIFY) */}
          {step === 'otp' && (
            <motion.div key="otp" {...anim} className="w-full max-w-[450px]">
              <OTPForm
                email={getActiveEmail()}
                onVerify={handleVerifyEmailOtp}
                onResend={handleResendOtp}
                isLoading={isLoading}
                error={localError}
                canResend={canResendOTP}
                resendCountdown={resendCountdown}
                debugOtp={debugOtp}
                onBack={() => setStep('auth')}
              />
            </motion.div>
          )}

          {/* STEP 4: MFA OTP VERIFICATION (LOGIN MFA CHALLENGE) */}
          {step === 'mfa' && (
            <motion.div key="mfa" {...anim} className="w-full max-w-[450px]">
              <OTPForm
                email={getActiveEmail()}
                onVerify={handleVerifyMfaOtp}
                onResend={handleResendOtp}
                isLoading={isLoading}
                error={localError}
                canResend={canResendOTP}
                resendCountdown={resendCountdown}
                debugOtp={debugOtp}
                isMfa={true}
                onBack={() => setStep('auth')}
              />
            </motion.div>
          )}

          {/* STEP 5: FORGOT PASSWORD */}
          {step === 'forgotPassword' && (
            <motion.div key="forgotPassword" {...anim} className="w-full max-w-[450px]">
              <div className="rounded-3xl p-8 bg-zinc-950/40 border border-zinc-900 backdrop-blur-xl shadow-2xl flex flex-col items-center">
                
                <div className="h-12 w-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-6">
                  <Mail className="h-6 w-6 text-violet-400" />
                </div>

                <h2 className="text-2xl font-bold mb-2 text-center text-white">Recover Password</h2>
                
                {!forgotEmailSent ? (
                  <>
                    <p className="text-zinc-400 text-sm text-center mb-8">
                      Enter your account email. If the account exists, we will email a single-use secure reset link.
                    </p>

                    <form onSubmit={handleForgotPassword} className="w-full space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Account Email</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="you@college.edu"
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all text-center"
                        />
                      </div>

                      {localError && (
                        <div className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 py-2.5 px-3 rounded-lg">
                          {localError}
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 h-12 rounded-xl transition-all duration-200"
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2 justify-center">
                            <Loader2 className="h-4 w-4 animate-spin" /> Dispatching...
                          </span>
                        ) : (
                          'Send Reset Instructions'
                        )}
                      </Button>
                    </form>
                  </>
                ) : (
                  <div className="text-center w-full space-y-4">
                    <p className="text-green-400 font-semibold bg-green-500/10 border border-green-500/20 p-4 rounded-xl leading-relaxed text-sm">
                      Secure instructions dispatched! If the email matches a registered account, you will receive a secure reset link shortly.
                    </p>
                    {debugResetLink && (
                      <div className="mt-4 p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl text-left w-full space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <span className="text-zinc-400 text-[10px] uppercase tracking-widest block font-bold text-center">🔑 Dev Mode Reset Link</span>
                        <a 
                          href={debugResetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400 font-mono text-xs hover:underline break-all block text-center"
                        >
                          {debugResetLink}
                        </a>
                      </div>
                    )}
                    <p className="text-xs text-zinc-500 leading-normal">
                      The link is valid for 15 minutes and can only be used once. Please verify your spam folders if the email doesn't appear.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => { setStep('auth'); setForgotEmailSent(false); }}
                  className="mt-6 text-zinc-500 hover:text-zinc-300 font-semibold text-sm transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Login
                </button>

              </div>
            </motion.div>
          )}
            </LandingTransition>
          )}
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
