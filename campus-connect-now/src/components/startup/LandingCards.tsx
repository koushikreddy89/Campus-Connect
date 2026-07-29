import React, { useRef, memo } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { GraduationCap, Trophy, Shield, ArrowRight } from 'lucide-react';

interface LandingCardsProps {
  onSelectRole: (role: 'student' | 'alumni' | 'admin') => void;
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

// Apple/Linear style card wrapper with tilt parallax
const CardWrapper = memo(({ 
  children, 
  onClick, 
  role, 
  delay 
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  role: 'student' | 'alumni' | 'admin'; 
  delay: number; 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlightOpacity = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-150, 150], [6, -6]), { damping: 22, stiffness: 100 });
  const rotateY = useSpring(useTransform(x, [-150, 150], [-6, 6]), { damping: 22, stiffness: 100 });
  const spotlightSpr = useSpring(spotlightOpacity, { damping: 20, stiffness: 120 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    mouseX.set(clientX);
    mouseY.set(clientY);
    spotlightOpacity.set(0.12);

    if (!shouldReduceMotion) {
      const centerX = clientX - rect.width / 2;
      const centerY = clientY - rect.height / 2;
      x.set(centerX);
      y.set(centerY);
    }
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    spotlightOpacity.set(0);
  };

  const activeGlowColor = {
    student: 'rgba(139, 92, 246, 0.15)',
    alumni: 'rgba(245, 158, 11, 0.15)',
    admin: 'rgba(14, 165, 233, 0.15)'
  }[role];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: "spring",
        damping: 18,
        stiffness: 80,
        delay: delay,
        duration: 0.6
      }}
      className="w-full h-full"
      style={{ willChange: 'transform, opacity' }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          rotateX: shouldReduceMotion ? 0 : rotateX,
          rotateY: shouldReduceMotion ? 0 : rotateY,
          transformStyle: "preserve-3d",
          perspective: 1000,
          willChange: 'transform'
        }}
        whileHover="hover"
        variants={{
          hover: {
            y: -6,
            transition: { duration: 0.3, ease: 'easeOut' }
          }
        }}
        whileTap={{ scale: 0.97 }}
        className={`group relative cursor-pointer rounded-[20px] p-8 bg-white/[0.03] border border-white/[0.08] backdrop-blur-[18px] transition-colors duration-300 flex flex-col justify-between min-h-[260px] select-none overflow-hidden
          ${role === 'student' ? 'hover:border-violet-500/40 hover:bg-white/[0.05] hover:shadow-[0_0_50px_-15px_rgba(139,92,246,0.18)]' : ''}
          ${role === 'alumni' ? 'hover:border-amber-500/40 hover:bg-white/[0.05] hover:shadow-[0_0_50px_-15px_rgba(245,158,11,0.18)]' : ''}
          ${role === 'admin' ? 'hover:border-sky-500/40 hover:bg-white/[0.05] hover:shadow-[0_0_50px_-15px_rgba(14,165,233,0.18)]' : ''}
        `}
      >
        {/* Spotlight Reflection Shine */}
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: useTransform(
              [mouseX, mouseY, spotlightSpr],
              ([mx, my, op]) => `radial-gradient(300px circle at ${mx}px ${my}px, rgba(255, 255, 255, ${op}), transparent 80%)`
            )
          }}
        />

        {/* Ambient border glow behind card */}
        <div 
          className="absolute -inset-[1px] rounded-[20px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[-1]"
          style={{
            background: `radial-gradient(200px circle at 50% 50%, ${activeGlowColor}, transparent 80%)`,
          }}
        />

        {children}
      </motion.div>
    </motion.div>
  );
});
CardWrapper.displayName = 'CardWrapper';

export const LandingCards = memo(({ onSelectRole }: LandingCardsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl px-4 mt-4">
      {/* Student Card */}
      <CardWrapper role="student" delay={0.2} onClick={() => onSelectRole('student')}>
        <div>
          <AnimatedIcon role="student">
            <GraduationCap className="h-6 w-6 text-violet-400" />
          </AnimatedIcon>
          <h3 
            className="font-semibold mb-2 text-white group-hover:text-violet-300 transition-colors"
            style={{ fontSize: 'clamp(1.1rem, 1.5vw, 1.25rem)' }}
          >
            Student
          </h3>
          <p 
            className="text-zinc-400 leading-relaxed"
            style={{ fontSize: 'clamp(0.85rem, 1.2vw, 0.95rem)' }}
          >
            Discover peers, share projects, participate in hackathons, and build your campus identity.
          </p>
        </div>
        <AnimatedCTA text="Enterprise Portal" role="student" />
      </CardWrapper>
 
      {/* Alumni Card */}
      <CardWrapper role="alumni" delay={0.32} onClick={() => onSelectRole('alumni')}>
        <div>
          <AnimatedIcon role="alumni">
            <Trophy className="h-6 w-6 text-amber-400" />
          </AnimatedIcon>
          <h3 
            className="font-semibold mb-2 text-white group-hover:text-amber-300 transition-colors"
            style={{ fontSize: 'clamp(1.1rem, 1.5vw, 1.25rem)' }}
          >
            Alumni
          </h3>
          <p 
            className="text-zinc-400 leading-relaxed"
            style={{ fontSize: 'clamp(0.85rem, 1.2vw, 0.95rem)' }}
          >
            Verify your graduation records to mentor, share job openings, and refer fellow students.
          </p>
        </div>
        <AnimatedCTA text="Verify Alumni Record" role="alumni" />
      </CardWrapper>
 
      {/* Admin Card */}
      <CardWrapper role="admin" delay={0.44} onClick={() => onSelectRole('admin')}>
        <div>
          <AnimatedIcon role="admin">
            <Shield className="h-6 w-6 text-sky-400" />
          </AnimatedIcon>
          <h3 
            className="font-semibold mb-2 text-white group-hover:text-sky-300 transition-colors"
            style={{ fontSize: 'clamp(1.1rem, 1.5vw, 1.25rem)' }}
          >
            Admin Portal
          </h3>
          <p 
            className="text-zinc-400 leading-relaxed"
            style={{ fontSize: 'clamp(0.85rem, 1.2vw, 0.95rem)' }}
          >
            Publish official communications, events, announcements, and placement opportunities.
          </p>
        </div>
        <AnimatedCTA text="Authorized Sign-In" role="admin" />
      </CardWrapper>
    </div>
  );
});

LandingCards.displayName = 'LandingCards';
