import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw } from 'lucide-react';

interface ResendTimerProps {
  onResend: () => Promise<void>;
  canResend?: boolean;
  resendCountdown?: number;
  disabled?: boolean;
  className?: string;
}

export const ResendTimer: React.FC<ResendTimerProps> = ({
  onResend,
  canResend = false,
  resendCountdown = 30,
  disabled = false,
  className = '',
}) => {
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(resendCountdown);

  useEffect(() => {
    if (canResend) {
      setCountdown(0);
      return;
    }
    setCountdown(resendCountdown);
  }, [canResend, resendCountdown]);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (isResending || countdown > 0 || disabled) return;
    setIsResending(true);
    try {
      await onResend();
      setCountdown(30);
    } catch (err) {
      console.error('Failed to resend OTP:', err);
    } finally {
      setIsResending(false);
    }
  };

  const isAvailable = countdown <= 0 || canResend;

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <span className="text-xs text-slate-400 font-medium mb-1.5">
        Didn't receive the verification code?
      </span>

      <AnimatePresence mode="wait">
        {isAvailable ? (
          <motion.button
            key="resend-active"
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={handleResend}
            disabled={isResending || disabled}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 font-medium text-xs sm:text-sm transition-all duration-300 shadow-lg shadow-violet-500/10"
          >
            {/* Soft Ambient Glow Pulse */}
            <span className="absolute -inset-0.5 rounded-xl bg-violet-500/20 blur-sm opacity-50 group-hover:opacity-100 transition-opacity" />

            <span className="relative z-10 flex items-center gap-2">
              {isResending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 text-violet-400 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="font-semibold text-violet-200">Resend Code</span>
                </>
              )}
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="resend-timer"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs font-medium text-slate-400"
          >
            <span>Resend available in</span>
            <div className="relative inline-block w-6 text-center font-mono font-bold text-violet-400">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={countdown}
                  initial={{ y: -8, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 8, opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="inline-block"
                >
                  {countdown}s
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
