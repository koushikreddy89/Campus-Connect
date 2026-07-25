import React from 'react';
import { OTPInput as FlagshipOTPInput, OTPInputProps } from './otp/OTPInput';
import { OTPVerificationCard, OTPVerificationCardProps } from './otp/OTPVerificationCard';

export { FlagshipOTPInput as OTPInput };
export type { OTPInputProps };
export { OTPVerificationCard };
export type { OTPVerificationCardProps };

export interface OTPFormProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
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

/**
 * Flagship OTPForm wrapper - drop-in backwards compatible component
 */
export const OTPForm: React.FC<OTPFormProps> = ({
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
  debugOtp,
  isMfa = false,
}) => {
  return (
    <OTPVerificationCard
      email={email}
      onVerify={onVerify}
      onResend={onResend}
      isLoading={isLoading}
      error={error}
      canResend={canResend}
      resendCountdown={resendCountdown}
      title={title}
      subtitle={subtitle}
      onBack={onBack}
      debugOtp={debugOtp}
      isMfa={isMfa}
    />
  );
};
