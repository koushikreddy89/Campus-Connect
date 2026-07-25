import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  onChange?: (otp: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  onComplete,
  onChange,
  disabled = false,
  isLoading = false,
  isSuccess = false,
  isError = false,
  autoFocus = true,
  className = '',
}) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(autoFocus ? 0 : null);
  const [lastTypedIndex, setLastTypedIndex] = useState<number | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(length).fill(null));

  useEffect(() => {
    if (autoFocus && !disabled && !isLoading && !isSuccess) {
      // Focus first input on mount
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled, isLoading, isSuccess]);

  const updateOtpState = (newOtp: string[]) => {
    setOtp(newOtp);
    const code = newOtp.join('');
    if (onChange) onChange(code);

    if (newOtp.every((digit) => digit !== '')) {
      onComplete(code);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    if (disabled || isLoading || isSuccess) return;

    // Filter non-digit characters
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue && value !== '') return;

    const digit = cleanValue.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;

    if (digit) {
      setLastTypedIndex(index);
      setTimeout(() => setLastTypedIndex(null), 220);
    }

    updateOtpState(newOtp);

    // Auto-focus next field
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || isLoading || isSuccess) return;

    if (e.key === 'Backspace') {
      if (otp[index]) {
        // Clear current digit
        const newOtp = [...otp];
        newOtp[index] = '';
        updateOtpState(newOtp);
      } else if (index > 0) {
        // Clear previous digit and move focus back
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        updateOtpState(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled || isLoading || isSuccess) return;
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').split('').slice(0, length);

    if (digits.length > 0) {
      const newOtp = [...otp];
      digits.forEach((digit, idx) => {
        newOtp[idx] = digit;
      });
      updateOtpState(newOtp);

      const focusIdx = Math.min(digits.length, length - 1);
      inputRefs.current[focusIdx]?.focus();
    }
  };

  return (
    <div className={`flex items-center justify-between gap-1.5 sm:gap-2.5 w-full my-6 select-none ${className}`}>
      {Array.from({ length }).map((_, index) => {
        const digit = otp[index];
        const isFocused = focusedIndex === index && !disabled && !isLoading && !isSuccess;
        const isJustTyped = lastTypedIndex === index;

        return (
          <div key={index} className="relative flex-1 aspect-[4/5] max-w-[58px] min-w-[42px]">
            {/* Typing Center Ripple Burst */}
            <AnimatePresence>
              {isJustTyped && (
                <motion.div
                  initial={{ scale: 0.2, opacity: 0.9 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-2xl bg-violet-400/40 pointer-events-none z-20"
                />
              )}
            </AnimatePresence>

            {/* Glowing Focus Aura */}
            <div
              className={`absolute -inset-1 rounded-2xl blur-sm transition-all duration-300 pointer-events-none ${
                isSuccess
                  ? 'bg-emerald-500/40 opacity-100'
                  : isError
                  ? 'bg-red-500/40 opacity-100'
                  : isFocused
                  ? 'bg-violet-500/40 opacity-100'
                  : digit
                  ? 'bg-indigo-500/20 opacity-70'
                  : 'opacity-0'
              }`}
            />

            {/* OTP Input Box Container */}
            <motion.div
              animate={{
                scale: isJustTyped ? 1.12 : isFocused ? 1.05 : 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 22,
              }}
              className={`relative h-full w-full rounded-2xl backdrop-blur-xl transition-all duration-300 border flex items-center justify-center overflow-hidden ${
                isSuccess
                  ? 'bg-emerald-500/10 border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : isError
                  ? 'bg-red-500/10 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                  : isFocused
                  ? 'bg-white/[0.08] border-violet-400 shadow-[0_0_25px_rgba(139,92,246,0.35)]'
                  : digit
                  ? 'bg-white/[0.05] border-indigo-400/40'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20'
              }`}
            >
              {/* Native Input Element */}
              <input
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                disabled={disabled || isLoading || isSuccess}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(null)}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                aria-label={`OTP digit ${index + 1} of ${length}`}
                className="absolute inset-0 w-full h-full text-center text-xl sm:text-2xl font-bold font-mono text-transparent bg-transparent caret-transparent focus:outline-none z-10 cursor-pointer disabled:cursor-not-allowed"
              />

              {/* Rendered Digit Content with Spring Physics */}
              <AnimatePresence mode="popLayout">
                {digit ? (
                  <motion.span
                    key={`digit-${digit}`}
                    initial={{ y: 12, opacity: 0, scale: 0.5 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -12, opacity: 0, scale: 0.5 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                    className={`font-mono text-xl sm:text-2xl font-extrabold pointer-events-none select-none ${
                      isSuccess
                        ? 'text-emerald-300'
                        : isError
                        ? 'text-red-300'
                        : 'text-white'
                    }`}
                  >
                    {digit}
                  </motion.span>
                ) : (
                  isFocused && (
                    /* Animated Custom Caret Cursor */
                    <motion.div
                      key="caret"
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-0.5 h-6 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa] pointer-events-none"
                    />
                  )
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
};
