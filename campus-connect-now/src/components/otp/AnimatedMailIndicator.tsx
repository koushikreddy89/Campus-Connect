import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';

interface AnimatedMailIndicatorProps {
  email: string;
  type?: 'email' | 'mfa';
  className?: string;
}

/**
 * Mask email address elegantly: koushik@gmail.com -> kous****@gmail.com
 */
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email || '';
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart}***@${domain}`;
  }
  const visibleStart = localPart.slice(0, 4);
  return `${visibleStart}****@${domain}`;
};

export const AnimatedMailIndicator: React.FC<AnimatedMailIndicatorProps> = ({
  email,
  type = 'email',
  className = '',
}) => {
  const maskedEmail = maskEmail(email);

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Icon Badge with Pulse Effect */}
      <div className="relative mb-5 flex items-center justify-center">
        {/* Ambient Ring Pulse */}
        <motion.div
          animate={{
            scale: [1, 1.35, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`absolute inset-0 rounded-2xl ${
            type === 'mfa' ? 'bg-indigo-500/30' : 'bg-violet-500/30'
          }`}
        />

        {/* Glass Icon Container */}
        <div className={`relative h-14 w-14 rounded-2xl backdrop-blur-xl border flex items-center justify-center shadow-lg transition-all duration-300 ${
          type === 'mfa'
            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-indigo-500/10'
            : 'bg-violet-500/10 border-violet-500/30 text-violet-400 shadow-violet-500/10'
        }`}>
          {type === 'mfa' ? (
            <Lock className="h-7 w-7" />
          ) : (
            <Mail className="h-7 w-7" />
          )}
        </div>
      </div>

      {/* Email Indicator Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-mono font-medium text-slate-300 tracking-wide select-all">
          {maskedEmail}
        </span>
      </div>
    </div>
  );
};
