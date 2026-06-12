import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export const OTPInput = ({
  length = 6,
  onComplete,
  disabled = false,
  isLoading = false
}: OTPInputProps) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(length).fill(null));

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    // Allow only single digit
    const digit = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus to next input if digit entered
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if OTP is complete
    if (newOtp.every(d => d !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        // Clear current digit
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        // Move to previous input on backspace
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const pastedOtp = pastedData.replace(/\D/g, '').split('').slice(0, length);

    if (pastedOtp.length > 0) {
      const newOtp = [...otp];
      pastedOtp.forEach((digit, index) => {
        newOtp[index] = digit;
      });
      setOtp(newOtp);

      // Focus last filled input or the one right after
      const lastFilledIndex = pastedOtp.length - 1;
      const nextIndex = Math.min(lastFilledIndex + 1, length - 1);
      inputRefs.current[nextIndex]?.focus();

      // If all digits filled, trigger complete
      if (pastedOtp.length === length) {
        onComplete(newOtp.join(''));
      }
    }
  };

  return (
    <div className="flex gap-3 justify-center mb-6">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={otp[index]}
          onChange={(e) => handleInputChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled || isLoading}
          className={`w-14 h-16 text-2xl font-bold text-center rounded-lg border-2 transition-all duration-200 ${
            otp[index]
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/30 bg-secondary'
          } focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 ${
            disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-text'
          }`}
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
};

/**
 * OTP Input with form wrapper
 */
interface OTPFormProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  canResend?: boolean;
  resendCountdown?: number;
}

export const OTPForm = ({
  email,
  onVerify,
  onResend,
  isLoading = false,
  error = null,
  canResend = false,
  resendCountdown = 0
}: OTPFormProps) => {
  const [isResending, setIsResending] = useState(false);
  const [localCountdown, setLocalCountdown] = useState(0);

  useEffect(() => {
    if (canResend) {
      setLocalCountdown(0);
      return;
    }

    if (resendCountdown > 0) {
      setLocalCountdown(resendCountdown);
    }

    if (localCountdown <= 0) return;

    const interval = setInterval(() => {
      setLocalCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [canResend, resendCountdown, localCountdown]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResend();
      setLocalCountdown(30);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <OTPInput
        length={6}
        onComplete={onVerify}
        disabled={isLoading}
        isLoading={isLoading}
      />

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Didn't receive the OTP?
        </p>
        {canResend ? (
          <button
            onClick={handleResend}
            disabled={isResending || isLoading}
            className="text-primary font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isResending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </span>
            ) : (
              'Resend OTP'
            )}
          </button>
        ) : (
          <p className="text-primary font-semibold">
            Retry in {localCountdown}s
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        OTP sent to {email}
      </p>
    </div>
  );
};
