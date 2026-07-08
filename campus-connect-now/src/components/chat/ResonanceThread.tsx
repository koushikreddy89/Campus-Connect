import React from 'react';
import { motion } from 'framer-motion';

export type ResonanceState = 'dormant' | 'bridged' | 'harmonized' | 'vibrant' | 'resonating' | 'absorbed';

interface ResonanceThreadProps {
  state: ResonanceState;
  isSender: boolean;
  highContrast?: boolean;
}

export const ResonanceThread: React.FC<ResonanceThreadProps> = ({
  state,
  isSender,
  highContrast = false,
}) => {
  // Only show resonance status indicators for messages sent by the current user (sender)
  if (!isSender) return null;

  // Spring physics for organic tension feel
  const springTransition = {
    type: 'spring',
    stiffness: 160,
    damping: 20,
    mass: 0.8,
  };

  // State-specific layout configuration
  return (
    <div className="relative w-full mt-1 flex items-center justify-end h-2 select-none">
      {/* Container for Resonance Line / Beads */}
      <div className="relative w-16 flex items-center justify-end h-full">
        {/* 1. Dormant: A single floating beacon particle */}
        {state === 'dormant' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.6 }}
            transition={springTransition}
            className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500"
            title="Dormant (Sending)"
          />
        )}

        {/* 2. Bridged: A slightly larger pulsing node waiting to connect */}
        {state === 'bridged' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0.4 }}
            animate={{ 
              scale: [0.8, 1.2, 0.8],
              opacity: [0.4, 0.8, 0.4] 
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shadow-[0_0_8px_rgba(129,140,248,0.5)]"
            title="Bridged (Sent)"
          />
        )}

        {/* 3. Harmonized: Stretches out into a sleek, clean line */}
        {state === 'harmonized' && (
          <motion.div
            initial={{ scaleX: 0.05, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 0.7 }}
            transition={springTransition}
            className="origin-right h-[1.5px] w-full bg-slate-300 dark:bg-zinc-600 rounded-full"
            title="Harmonized (Delivered)"
          />
        )}

        {/* 4. Vibrant: Recipient opens chat. The thread glows. */}
        {state === 'vibrant' && (
          <div className="relative w-full flex items-center justify-end">
            <motion.div
              initial={{ scaleX: 0.8, opacity: 0.5 }}
              animate={{ scaleX: 1, opacity: 0.9 }}
              transition={springTransition}
              className="origin-right h-[2px] w-full bg-indigo-500 dark:bg-indigo-400 rounded-full shadow-[0_0_4px_rgba(99,102,241,0.5)]"
              title="Vibrant (Opened)"
            />
            {/* Soft Ambient Aura */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -right-2 w-12 h-4 rounded-full bg-indigo-500/10 dark:bg-indigo-400/20 blur-[4px] pointer-events-none"
            />
          </div>
        )}

        {/* 5. Resonating: Recipient actively reading. Rhythmic breathing glow. */}
        {state === 'resonating' && (
          <div className="relative w-full flex items-center justify-end">
            {/* The base thread */}
            <motion.div
              className={`origin-right w-full bg-gradient-to-l from-indigo-500 to-indigo-300 dark:from-indigo-400 dark:to-indigo-600 rounded-full ${
                highContrast ? 'h-[3px] border-b border-white' : 'h-[2px]'
              }`}
              title="Resonating (Reading)"
            />
            
            {/* The breathing aura glow */}
            <motion.div
              animate={{
                scaleY: [1, 1.4, 1],
                scaleX: [1, 1.1, 1],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -right-4 w-16 h-5 rounded-full bg-gradient-to-r from-indigo-500/20 to-teal-400/10 dark:from-indigo-400/30 dark:to-teal-500/10 blur-[6px] pointer-events-none"
            />
          </div>
        )}

        {/* 6. Absorbed: Recipient left conversation. Aura fades to a static, low-contrast dashed line. */}
        {state === 'absorbed' && (
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0.4 }}
            className={`h-[1px] w-full border-t bg-transparent ${
              highContrast ? 'border-dashed border-slate-600 dark:border-zinc-400' : 'border-dotted border-slate-400 dark:border-zinc-600'
            }`}
            title="Absorbed (Read)"
          />
        )}
      </div>
    </div>
  );
};
