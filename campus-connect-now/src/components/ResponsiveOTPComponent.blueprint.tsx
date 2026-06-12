/**
 * ============================================================================
 * RESPONSIVE OTP AUTHENTICATION COMPONENT (BLUEPRINT)
 * ============================================================================
 * 
 * Production-ready component demonstrating best practices for responsive
 * authentication UI. Can be adapted for Email, OTP, Admin Login, etc.
 * 
 * Uses AuthenticationResponsive.utilities.tsx for all responsive values
 * ============================================================================
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import {
  authTypography,
  authSpacing,
  authInputs,
  authButtons,
  authContainers,
  authIcons,
  authIconContainers,
  authAnimations,
  authAlerts,
  authLinks,
} from './AuthenticationResponsive.utilities';

interface OTPScreenProps {
  email: string;
  onVerify: (otp: string) => Promise<boolean>;
  onResend: () => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  error?: string;
}

/**
 * RESPONSIVE OTP VERIFICATION SCREEN
 * 
 * Responsive behavior:
 * - Icon: 56px→72px (scales with 15vw)
 * - Heading: 15px→24px (scales with 4vw)
 * - Inputs: 44px→52px height (touch-friendly)
 * - Spacing: 16px→20px gaps (clamp-based)
 * - Container: 90vw width, max 480px (mobile → desktop)
 */
export function OTPScreen({
  email,
  onVerify,
  onResend,
  onBack,
  isLoading = false,
  error = '',
}: OTPScreenProps) {
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Handle OTP input change
  const handleOTPChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtpValues = [...otpValues];
    newOtpValues[index] = value.slice(-1); // Keep only last digit
    setOtpValues(newOtpValues);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.querySelector(
        `input[data-otp-index="${index + 1}"]`
      ) as HTMLInputElement;
      nextInput?.focus();
    }

    setLocalError('');
  };

  // Handle backspace
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const prevInput = document.querySelector(
        `input[data-otp-index="${index - 1}"]`
      ) as HTMLInputElement;
      prevInput?.focus();
    }

    // Handle Escape to go back
    if (e.key === 'Escape') {
      onBack();
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    const otp = otpValues.join('');

    if (otp.length !== 6) {
      setLocalError('Please enter all 6 digits');
      return;
    }

    try {
      const success = await onVerify(otp);
      if (success) {
        setSuccess(true);
      } else {
        setLocalError('Invalid OTP. Please try again.');
      }
    } catch (err) {
      setLocalError('Verification failed. Please try again.');
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    try {
      await onResend();
      setOtpValues(['', '', '', '', '', '']);
      setLocalError('');
      setCanResend(false);
      setResendCountdown(60);

      // Countdown timer
      const interval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setLocalError('Failed to resend OTP');
    }
  };

  // Complete animation state
  if (success) {
    return (
      <motion.div
        {...authAnimations.slideUp}
        className={authContainers.card}
      >
        <motion.div
          animate={{ scale: [0, 1.1, 1] }}
          transition={{ duration: 0.6, type: 'spring' }}
        >
          <CheckCircle2
            className="text-green-500"
            style={{
              width: authIcons.lg,
              height: authIcons.lg,
            }}
          />
        </motion.div>

        <h2 className={authTypography.subheading}>Email Verified!</h2>
        <p className={authTypography.body}>
          You've been successfully verified. Redirecting to your account...
        </p>

        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Loader2
            className="text-primary"
            style={{
              width: authIcons.md,
              height: authIcons.md,
            }}
          />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      {...authAnimations.slideUp}
      className={authContainers.card}
    >
      {/* Responsive Icon Container */}
      <motion.div
        className={authIconContainers.lg}
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      >
        <Mail
          className="text-primary"
          style={{
            width: authIcons.hero,
            height: authIcons.hero,
          }}
        />
      </motion.div>

      {/* Heading - Responsive Typography */}
      <h2 className={authTypography.subheading}>Verify OTP</h2>

      {/* Subheading - Responsive Body Text */}
      <p className={authTypography.body}>
        Enter the 6-digit code sent to
        <br />
        <span className="font-semibold text-foreground">{email}</span>
      </p>

      {/* OTP Input Fields - Responsive Grid */}
      <div
        className={`
          w-full
          flex
          justify-center
          gap-[clamp(8px,2vw,12px)]
          mb-[clamp(16px,4vw,20px)]
        `}
      >
        {otpValues.map((value, index) => (
          <motion.input
            key={index}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 }}
            type="text"
            maxLength={1}
            inputMode="numeric"
            data-otp-index={index}
            value={value}
            onChange={(e) => handleOTPChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            placeholder="0"
            className={authInputs.otp}
            disabled={isLoading}
            ariaLabel={`OTP digit ${index + 1}`}
          />
        ))}
      </div>

      {/* Error Message - Responsive & Animated */}
      <AnimatePresence>
        {(error || localError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={authAlerts.error}
          >
            <div className="flex items-start gap-[clamp(8px,2vw,12px)]">
              <AlertCircle
                className="flex-shrink-0 mt-0.5"
                style={{
                  width: authIcons.sm,
                  height: authIcons.sm,
                }}
              />
              <span>{error || localError}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Verify Button - Responsive */}
      <motion.button
        {...authAnimations.buttonPress}
        onClick={handleVerifyOTP}
        disabled={isLoading || otpValues.some((v) => !v)}
        type="button"
        className={authButtons.primary}
        aria-label="Verify OTP code"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>Verifying...</span>
          </>
        ) : (
          'Verify OTP'
        )}
      </motion.button>

      {/* Resend Section - Responsive */}
      <div
        className={`
          w-full
          text-center
          mt-[clamp(12px,3vw,16px)]
        `}
      >
        <p className={authTypography.small}>
          Didn't receive the code?
        </p>

        {canResend ? (
          <button
            onClick={handleResendOTP}
            disabled={isLoading}
            className={authLinks.underline}
          >
            Resend OTP
          </button>
        ) : (
          <p className={authTypography.hint}>
            Resend in {resendCountdown}s
          </p>
        )}
      </div>

      {/* Divider - Responsive */}
      <div
        className={`
          w-full
          h-px
          bg-gradient-to-r
          from-transparent
          via-white/20
          to-transparent
          my-[clamp(12px,3vw,16px)]
        `}
      />

      {/* Back Button - Responsive & Touch-Friendly */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
        disabled={isLoading}
        className={`
          w-full
          flex
          items-center
          justify-center
          gap-[clamp(6px,1vw,8px)]
          text-[clamp(12px,2vw,14px)]
          font-medium
          text-muted-foreground
          hover:text-foreground
          transition-colors
          duration-200
          py-[clamp(8px,2vw,12px)]
        `}
      >
        <ArrowLeft
          style={{
            width: authIcons.sm,
            height: authIcons.sm,
          }}
        />
        Back to Email
      </motion.button>
    </motion.div>
  );
}

/**
 * ============================================================================
 * RESPONSIVE EMAIL SCREEN (Companion Component)
 * ============================================================================
 */

interface EmailScreenProps {
  email: string;
  onEmailChange: (email: string) => void;
  onSendOTP: () => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onForgotPassword: () => void;
  onBack: () => void;
  isLoading?: boolean;
  error?: string;
  isValidEmail?: boolean;
}

export function EmailScreen({
  email,
  onEmailChange,
  onSendOTP,
  onGoogleSignIn,
  onForgotPassword,
  onBack,
  isLoading = false,
  error = '',
  isValidEmail = false,
}: EmailScreenProps) {
  return (
    <motion.div
      {...authAnimations.slideUp}
      className={authContainers.card}
    >
      {/* Responsive Icon */}
      <div className={authIconContainers.lg}>
        <Mail
          className="text-primary"
          style={{
            width: authIcons.hero,
            height: authIcons.hero,
          }}
        />
      </div>

      {/* Responsive Heading */}
      <h2 className={authTypography.subheading}>
        Your College Email
      </h2>

      {/* Responsive Description */}
      <p className={authTypography.body}>
        Sign in with your college email (.edu, .edu.in, .ac.in)
      </p>

      {/* Email Input - Responsive */}
      <input
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="you@college.edu"
        className={authInputs.email}
        aria-label="College email address"
        aria-describedby="email-hint"
        disabled={isLoading}
      />

      {/* Email Validation Hint */}
      {email && !isValidEmail && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={authAlerts.error}
        >
          Only college email users are allowed
        </motion.p>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={authAlerts.error}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Send OTP Button */}
      <motion.button
        {...authAnimations.buttonPress}
        onClick={onSendOTP}
        disabled={isLoading || !email || !isValidEmail}
        className={authButtons.primary}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>Sending...</span>
          </>
        ) : (
          'Send OTP'
        )}
      </motion.button>

      {/* Divider */}
      <div className={authTypography.small}>
        <div
          className={`
            w-full
            flex
            items-center
            gap-[clamp(12px,3vw,16px)]
            my-[clamp(16px,4vw,20px)]
          `}
        >
          <div className="flex-1 h-px bg-white/10" />
          <span>or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
      </div>

      {/* Google Sign In Button */}
      <motion.button
        {...authAnimations.buttonPress}
        onClick={onGoogleSignIn}
        disabled={isLoading}
        className={authButtons.secondary}
        aria-label="Sign in with Google"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        <span>Continue with Google</span>
      </motion.button>

      {/* Forgot Password Link */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onForgotPassword}
        disabled={isLoading}
        className={`
          text-[clamp(12px,2vw,14px)]
          font-medium
          text-primary
          hover:text-primary/80
          transition-colors
          duration-200
          mt-[clamp(12px,3vw,16px)]
        `}
      >
        Forgot Password?
      </motion.button>

      {/* Back Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
        disabled={isLoading}
        className={`
          text-[clamp(12px,2vw,14px)]
          font-medium
          text-muted-foreground
          hover:text-foreground
          transition-colors
          duration-200
          mt-[clamp(8px,2vw,12px)]
        `}
      >
        Back to Role Selection
      </motion.button>
    </motion.div>
  );
}

/**
 * ============================================================================
 * USAGE EXAMPLE IN WelcomePage.tsx
 * ============================================================================
 * 
 * Replace existing Email/OTP screens with:
 * 
 * {step === 'email' && (
 *   <EmailScreen
 *     email={email}
 *     onEmailChange={setEmail}
 *     onSendOTP={handleSendOtp}
 *     onGoogleSignIn={signInWithGoogle}
 *     onForgotPassword={() => setStep('forgot')}
 *     onBack={() => setStep('roleSelect')}
 *     isLoading={isLoading}
 *     error={error}
 *     isValidEmail={isValidAcademicEmail(email)}
 *   />
 * )}
 * 
 * {step === 'otp' && (
 *   <OTPScreen
 *     email={email}
 *     onVerify={handleVerifyOtp}
 *     onResend={handleResendOtp}
 *     onBack={() => setStep('email')}
 *     isLoading={isLoading}
 *     error={error}
 *   />
 * )}
 */

/**
 * ============================================================================
 * KEY RESPONSIVE FEATURES DEMONSTRATED
 * ============================================================================
 * 
 * ✅ Icons: Scale 56px → 72px using authIcons.hero
 * ✅ Typography: Heading 15px → 24px, body 13px → 15px
 * ✅ Inputs: Height 44px → 52px, padding responsive
 * ✅ Buttons: 48px → 56px height, full-width
 * ✅ Spacing: All gaps use clamp() for smooth scaling
 * ✅ Animations: Framer Motion with spring physics
 * ✅ Accessibility: ARIA labels, keyboard support, focus states
 * ✅ States: Loading, error, success all responsive
 * ✅ Mobile-first: Optimal on 320px, scales beautifully to 1920px
 * ✅ No layout shift: Fixed heights, animated/positioned overlays
 */
