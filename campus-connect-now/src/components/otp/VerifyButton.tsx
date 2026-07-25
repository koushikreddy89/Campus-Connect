import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

interface VerifyButtonProps {
  onClick?: () => void;
  isLoading?: boolean;
  isSuccess?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const VerifyButton: React.FC<VerifyButtonProps> = ({
  onClick,
  isLoading = false,
  isSuccess = false,
  disabled = false,
  label = 'Verify Security Code',
  className = '',
}) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading || isSuccess}
      whileHover={disabled || isLoading || isSuccess ? {} : { scale: 1.015, y: -1 }}
      whileTap={disabled || isLoading || isSuccess ? {} : { scale: 0.98 }}
      className={`relative group w-full h-13 sm:h-14 rounded-2xl font-medium text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 overflow-hidden transition-all duration-300 select-none shadow-xl ${
        isSuccess
          ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 text-white shadow-emerald-500/25 border border-emerald-400/40'
          : disabled
          ? 'bg-slate-900/60 text-slate-500 border border-slate-800/80 cursor-not-allowed shadow-none'
          : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-violet-600/30 hover:shadow-violet-500/40 border border-white/20'
      } ${className}`}
    >
      {/* Moving Shimmer Ray Layer */}
      {!disabled && !isLoading && !isSuccess && (
        <motion.div
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 2,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none"
        />
      )}

      {/* Button Ambient Glow Shadow on Hover */}
      {!disabled && !isLoading && !isSuccess && (
        <div className="absolute inset-0 bg-violet-500/20 blur-md rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}

      {/* Button Inner Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-white" />
            <span className="font-semibold tracking-wide">Verifying...</span>
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-white animate-bounce" />
            <span className="font-semibold">Verified Successfully</span>
          </>
        ) : (
          <>
            <span className="font-semibold">{label}</span>
            <ArrowRight className="h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-1" />
          </>
        )}
      </span>
    </motion.button>
  );
};
