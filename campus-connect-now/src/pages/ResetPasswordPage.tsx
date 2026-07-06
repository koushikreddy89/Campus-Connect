import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, Loader2, KeyRound, Eye, EyeOff, Check, X } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetPassword = useAuthStore(s => s.resetPassword);
  const isLoading = useAuthStore(s => s.isLoading);
  const storeError = useAuthStore(s => s.error);

  useEffect(() => {
    if (storeError) {
      setLocalError(storeError);
    }
  }, [storeError]);

  // Check if token exists
  useEffect(() => {
    if (!token) {
      setLocalError('Invalid or missing password recovery token.');
    }
  }, [token]);

  // Password complexity checks
  const checkPasswordRequirements = (pass: string) => {
    return [
      { label: 'At least 8 characters long', met: pass.length >= 8 },
      { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(pass) },
      { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(pass) },
      { label: 'One digit (0-9)', met: /[0-9]/.test(pass) },
      { label: 'One special character (e.g. @, #, $, !)', met: /[^A-Za-z0-9]/.test(pass) }
    ];
  };

  const getPasswordStrengthScore = (pass: string) => {
    return checkPasswordRequirements(pass).filter(r => r.met).length;
  };

  const isPasswordValid = (pass: string) => {
    return checkPasswordRequirements(pass).every(r => r.met);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!token) {
      setLocalError('Invalid or missing recovery token.');
      return;
    }

    if (!password || !confirmPassword) {
      setLocalError('All fields are required.');
      return;
    }

    if (!isPasswordValid(password)) {
      setLocalError('Please ensure the password meets all complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    const res = await resetPassword({ token, password });
    if (res.success) {
      setSuccessMessage('Password reset successful. All active sessions have been terminated.');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } else {
      setLocalError(res.error || 'Failed to reset password. The link may have expired.');
    }
  };

  const passwordStrengthScore = getPasswordStrengthScore(password);
  const passwordRequirements = checkPasswordRequirements(password);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#09090B] text-white relative overflow-hidden px-4 font-sans select-none">
      
      {/* Background Orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(255,255,255,0))]" />
      
      <div className="relative z-10 w-full max-w-[480px]">
        
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center shadow-lg backdrop-blur-md mb-4">
            <Logo variant="icon" className="h-9 w-9 text-violet-400" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-semibold">
            Campus Connect Platform
          </span>
        </div>

        <div className="rounded-3xl p-8 bg-zinc-950/40 border border-zinc-900 backdrop-blur-xl shadow-2xl flex flex-col items-center">
          
          <div className="h-12 w-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-6">
            <KeyRound className="h-6 w-6 text-violet-400" />
          </div>

          <h2 className="text-2xl font-bold mb-2 text-center text-white">Reset Password</h2>
          <p className="text-zinc-400 text-xs text-center mb-6">
            Define a strong new password to protect your account.
          </p>

          {successMessage ? (
            <div className="text-center w-full space-y-4">
              <div className="text-green-400 font-semibold bg-green-500/10 border border-green-500/20 p-4 rounded-xl leading-relaxed text-sm">
                {successMessage}
              </div>
              <p className="text-xs text-zinc-500">
                Redirecting you to the landing page in a few seconds...
              </p>
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 h-12 rounded-xl"
              >
                Go to Sign In Now
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              
              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={!token || isLoading}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    disabled={!token || isLoading}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Password strength checks */}
              {password && (
                <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/80 space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-zinc-400">Password Strength:</span>
                    <span className={
                      passwordStrengthScore <= 2 ? 'text-red-400' :
                      passwordStrengthScore <= 4 ? 'text-amber-400' :
                      'text-green-400'
                    }>
                      {passwordStrengthScore <= 2 ? 'Weak' :
                       passwordStrengthScore <= 4 ? 'Medium' :
                       'Strong'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        passwordStrengthScore <= 2 ? 'bg-red-500 w-1/3' :
                        passwordStrengthScore <= 4 ? 'bg-amber-500 w-2/3' :
                        'bg-green-500 w-full'
                      }`}
                    />
                  </div>
                  <div className="space-y-1 text-xs">
                    {passwordRequirements.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        {req.met ? (
                          <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        )}
                        <span className={req.met ? 'text-zinc-300' : 'text-zinc-500'}>{req.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {localError && (
                <div className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 py-2.5 px-3 rounded-lg">
                  {localError}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading || !token || !isPasswordValid(password)}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 h-12 rounded-xl transition-all duration-200 mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" /> resetting...
                  </span>
                ) : (
                  'Reset Password & Sign In'
                )}
              </Button>
            </form>
          )}

          <button
            onClick={() => navigate('/')}
            className="mt-6 text-zinc-500 hover:text-zinc-300 font-semibold text-sm transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Welcome Page
          </button>

        </div>

      </div>
    </div>
  );
}
