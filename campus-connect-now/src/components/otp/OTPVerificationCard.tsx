import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Copy, Check, ShieldCheck } from 'lucide-react';
import { AnimatedBackground } from './AnimatedBackground';
import { GlassCard } from './GlassCard';
import { AnimatedMailIndicator } from './AnimatedMailIndicator';
import { OTPInput } from './OTPInput';
import { VerifyButton } from './VerifyButton';
import { ResendTimer } from './ResendTimer';
import { SuccessAnimation } from './SuccessAnimation';
import { ErrorAnimation } from './ErrorAnimation';

export interface OTPVerificationCardProps {
  email: string;
  onVerify: (otp: string) => Promise<void> | Promise<boolean>;
  onResend: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  canResend?: boolean;
  resendCountdown?: number;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  debugOtp?: string | null;
  isMfa?: boolean;
}

export const OTPVerificationCard: React.FC<OTPVerificationCardProps> = ({
  email,
  onVerify,
  onResend,
  isLoading = false,
  error = null,
  canResend = false,
  resendCountdown = 30,
  title,
  subtitle,
  onBack,
  debugOtp = null,
  isMfa = false,
}) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedDebug, setCopiedDebug] = useState(false);
  const [currentOtp, setCurrentOtp] = useState('');

  const defaultTitle = isMfa ? 'Multi-Factor Authentication' : 'Security Verification';
  const defaultSubtitle = isMfa
    ? 'MFA is enabled on your account. Enter the 6-digit login code sent to your email.'
    : 'Enter the 6-digit security code sent to your email to verify your identity.';

  const handleComplete = async (code: string) => {
    try {
      const res = await onVerify(code);
      // If backend call resolves cleanly or returns true
      if (res !== false) {
        setIsSuccess(true);
      }
    } catch (err) {
      console.error('OTP verification error:', err);
    }
  };

  const handleCopyDebug = () => {
    if (!debugOtp) return;
    navigator.clipboard.writeText(debugOtp);
    setCopiedDebug(true);
    setTimeout(() => setCopiedDebug(false), 2000);
  };

  // Staggered Entrance Animation Variants
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.92, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 24,
        staggerChildren: 0.08,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  };

  // Shake variant on error
  const shakeVariant = error
    ? {
        x: [0, -10, 10, -8, 8, -4, 4, 0],
        transition: { duration: 0.5 },
      }
    : {};

  return (
    <AnimatedBackground>
      <motion.div
        animate={shakeVariant}
        className="w-full flex justify-center"
      >
        <GlassCard isError={!!error} isSuccess={isSuccess}>
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center w-full"
          >
            {/* Header Mail/MFA Indicator */}
            <motion.div variants={itemVariants} className="w-full">
              <AnimatedMailIndicator email={email} type={isMfa ? 'mfa' : 'email'} />
            </motion.div>

            {/* Title & Subtitle */}
            <motion.div variants={itemVariants} className="text-center mt-4 mb-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {title || defaultTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                {subtitle || defaultSubtitle}
              </p>
            </motion.div>

            {/* Success Animation or OTP Input */}
            <motion.div variants={itemVariants} className="w-full">
              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="my-6"
                  >
                    <SuccessAnimation />
                  </motion.div>
                ) : (
                  <motion.div key="input" className="w-full">
                    <OTPInput
                      length={6}
                      onComplete={handleComplete}
                      onChange={setCurrentOtp}
                      disabled={isLoading}
                      isLoading={isLoading}
                      isSuccess={isSuccess}
                      isError={!!error}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Error Message Alert */}
            <motion.div variants={itemVariants} className="w-full mb-4">
              <ErrorAnimation error={error} />
            </motion.div>

            {/* Verify CTA Button */}
            {!isSuccess && (
              <motion.div variants={itemVariants} className="w-full mb-5">
                <VerifyButton
                  onClick={() => currentOtp.length === 6 && handleComplete(currentOtp)}
                  isLoading={isLoading}
                  isSuccess={isSuccess}
                  disabled={currentOtp.length < 6 || isLoading}
                  label="Verify Security Code"
                />
              </motion.div>
            )}

            {/* Resend Countdown Timer */}
            {!isSuccess && (
              <motion.div variants={itemVariants} className="w-full mb-2">
                <ResendTimer
                  onResend={onResend}
                  canResend={canResend}
                  resendCountdown={resendCountdown}
                  disabled={isLoading}
                />
              </motion.div>
            )}

            {/* Dev Mode OTP Debug Badge */}
            {debugOtp && (
              <motion.div
                variants={itemVariants}
                className="mt-5 p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/30 backdrop-blur-md w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-violet-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-violet-300/80 block">
                      Dev Mode OTP Code
                    </span>
                    <span className="font-mono font-extrabold text-lg text-white tracking-wider">
                      {debugOtp}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyDebug}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-violet-300 hover:text-white transition-colors"
                  title="Copy Dev Code"
                >
                  {copiedDebug ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </motion.div>
            )}

            {/* Back Button Navigation */}
            {onBack && (
              <motion.div variants={itemVariants} className="mt-5">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-1 px-3 rounded-lg hover:bg-white/5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to login</span>
                </button>
              </motion.div>
            )}
          </motion.div>
        </GlassCard>
      </motion.div>
    </AnimatedBackground>
  );
};
