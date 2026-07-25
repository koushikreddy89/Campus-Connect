import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, XCircle } from 'lucide-react';

interface ErrorAnimationProps {
  error: string | null;
  className?: string;
}

export const ErrorAnimation: React.FC<ErrorAnimationProps> = ({
  error,
  className = '',
}) => {
  useEffect(() => {
    if (error && typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch {
        // Haptic feedback fallback
      }
    }
  }, [error]);

  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`w-full rounded-xl p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 backdrop-blur-xl shadow-lg shadow-red-500/10 flex items-center justify-center gap-2.5 text-xs sm:text-sm font-medium ${className}`}
        >
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 animate-pulse" />
          <span className="text-center">{error}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
