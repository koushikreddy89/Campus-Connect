import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { ArrowRight, ArrowLeft, Mail, Shield, GraduationCap, Loader2, Trophy, Sparkles } from 'lucide-react';
import { isValidAcademicEmail } from '@/utils/validation';
import { useNavigate } from 'react-router-dom';
import { OTPForm } from '@/components/OTPInput';
import { Logo } from '@/components/Logo';

type Step = 'roleSelect' | 'studentAuth' | 'alumniAuth' | 'adminAuth' | 'otp';

const anim = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

export default function WelcomePage() {
  const [step, setStep] = useState<Step>('roleSelect');
  const [email, setEmail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [batch, setBatch] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [canResendOTP, setCanResendOTP] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const sendOtp = useAuthStore(s => s.sendOtp);
  const verifyAlumni = useAuthStore(s => s.verifyAlumni);
  const verifyOtp = useAuthStore(s => s.verifyOtp);
  const setRole = useAuthStore(s => s.setRole);
  const role = useAuthStore(s => s.role);
  const isLoading = useAuthStore(s => s.isLoading);
  const error = useAuthStore(s => s.error);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  
  const navigate = useNavigate();

  // Redirect after successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      const currentRole = useAuthStore.getState().role;
      if (currentRole === 'admin') {
        navigate('/admin');
      } else if (currentRole === 'alumni') {
        navigate('/alumni/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    }
  }, [isAuthenticated, navigate]);

  // Handle resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) {
      setCanResendOTP(true);
      return;
    }

    const interval = setInterval(() => {
      setResendCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCountdown]);

  const getActiveEmail = () => {
    if (role === 'alumni') return personalEmail;
    if (role === 'admin') return adminEmail;
    return email;
  };

  const handleStudentSubmit = async () => {
    setRole('student');
    await sendOtp(email);
    if (!useAuthStore.getState().error) {
      setStep('otp');
      setCanResendOTP(false);
      setResendCountdown(30);
    }
  };

  const handleAlumniSubmit = async () => {
    setRole('alumni');
    const success = await verifyAlumni(personalEmail, rollNumber, batch);
    if (success) {
      setStep('otp');
      setCanResendOTP(false);
      setResendCountdown(30);
    }
  };

  const handleAdminSubmit = async () => {
    setRole('admin');
    await sendOtp(adminEmail);
    if (!useAuthStore.getState().error) {
      setStep('otp');
      setCanResendOTP(false);
      setResendCountdown(30);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    await verifyOtp(code);
  };

  const handleResendOtp = async () => {
    const activeEmail = getActiveEmail();
    if (role === 'alumni') {
      await verifyAlumni(personalEmail, rollNumber, batch);
    } else {
      await sendOtp(activeEmail);
    }
    setCanResendOTP(false);
    setResendCountdown(30);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#09090B] text-white relative overflow-hidden px-4 font-sans select-none">
      
      {/* Premium background radial glowing orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(255,255,255,0))]" />
      
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1], 
          x: [0, 20, 0], 
          y: [0, -20, 0] 
        }} 
        transition={{ 
          repeat: Infinity, 
          duration: 20, 
          ease: 'easeInOut' 
        }} 
        className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.15, 1], 
          x: [0, -30, 0], 
          y: [0, 30, 0] 
        }} 
        transition={{ 
          repeat: Infinity, 
          duration: 25, 
          ease: 'easeInOut',
          delay: 3
        }} 
        className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" 
      />

      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center justify-center">
        
        {/* Navigation Logo Header */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center shadow-lg backdrop-blur-md mb-4">
            <Logo variant="icon" className="h-9 w-9 text-violet-400" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-violet-400" /> Campus Connect Platform
          </span>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: ROLE SELECT (LANDING) */}
          {step === 'roleSelect' && (
            <motion.div key="roleSelect" {...anim} className="w-full flex flex-col items-center">
              
              <div className="text-center max-w-2xl mb-12">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 mb-4">
                  Welcome to Campus Connect
                </h1>
                <p className="text-zinc-400 text-lg md:text-xl font-medium">
                  Connect. Learn. Grow. Build Your Campus Network.
                </p>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-4">
                
                {/* Student Card */}
                <motion.div
                  whileHover={{ y: -6, scale: 1.01 }}
                  onClick={() => { setRole('student'); setStep('studentAuth'); }}
                  className="group relative cursor-pointer rounded-3xl p-8 bg-zinc-950/40 border border-zinc-900 backdrop-blur-xl hover:border-violet-500/50 hover:shadow-[0_0_40px_-10px_rgba(139,92,246,0.25)] transition-all duration-300 flex flex-col justify-between min-h-[260px]"
                >
                  <div>
                    <div className="h-12 w-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <GraduationCap className="h-6 w-6 text-violet-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-violet-300 transition-colors">Student</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Discover peers, share projects, participate in hackathons, and build your campus identity.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm mt-6 group-hover:translate-x-1.5 transition-transform">
                    Verify Academic Email <ArrowRight className="h-4 w-4" />
                  </div>
                </motion.div>

                {/* Alumni Card */}
                <motion.div
                  whileHover={{ y: -6, scale: 1.01 }}
                  onClick={() => { setRole('alumni'); setStep('alumniAuth'); }}
                  className="group relative cursor-pointer rounded-3xl p-8 bg-zinc-950/40 border border-zinc-900 backdrop-blur-xl hover:border-amber-500/50 hover:shadow-[0_0_40px_-10px_rgba(245,158,11,0.25)] transition-all duration-300 flex flex-col justify-between min-h-[260px]"
                >
                  <div>
                    <div className="h-12 w-12 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Trophy className="h-6 w-6 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-amber-300 transition-colors">Alumni</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Verify your graduation records to mentor, share job openings, and refer fellow students.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mt-6 group-hover:translate-x-1.5 transition-transform">
                    Verify Alumni Record <ArrowRight className="h-4 w-4" />
                  </div>
                </motion.div>

                {/* Admin Card */}
                <motion.div
                  whileHover={{ y: -6, scale: 1.01 }}
                  onClick={() => { setRole('admin'); setStep('adminAuth'); }}
                  className="group relative cursor-pointer rounded-3xl p-8 bg-zinc-950/40 border border-zinc-900 backdrop-blur-xl hover:border-sky-500/50 hover:shadow-[0_0_40px_-10px_rgba(14,165,233,0.25)] transition-all duration-300 flex flex-col justify-between min-h-[260px]"
                >
                  <div>
                    <div className="h-12 w-12 rounded-xl bg-sky-600/10 border border-sky-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Shield className="h-6 w-6 text-sky-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-sky-300 transition-colors">Admin Portal</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Publish official communications, events, announcements, and placement opportunities.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm mt-6 group-hover:translate-x-1.5 transition-transform">
                    Authorized Sign-In <ArrowRight className="h-4 w-4" />
                  </div>
                </motion.div>

              </div>
            </motion.div>
          )}

          {/* STEP 2: STUDENT AUTH */}
          {step === 'studentAuth' && (
            <motion.div key="studentAuth" {...anim} className="w-full max-w-[450px]">
              <div className="rounded-3xl p-8 bg-zinc-950/40 border border-zinc-900 backdrop-blur-xl shadow-2xl flex flex-col items-center">
                
                <div className="h-12 w-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-6">
                  <GraduationCap className="h-6 w-6 text-violet-400" />
                </div>

                <h2 className="text-2xl font-bold mb-2 text-center text-white">Student Access</h2>
                <p className="text-zinc-400 text-sm text-center mb-8">
                  Verify your enrollment using your official college email address.
                </p>

                <div className="w-full space-y-4 mb-6">
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">College Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@college.edu"
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all text-center"
                    />
                  </div>

                  {email && !isValidAcademicEmail(email) && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 py-2.5 px-3 rounded-lg"
                    >
                      Please use your official college email address.
                    </motion.div>
                  )}

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 py-2.5 px-3 rounded-lg"
                    >
                      {error}
                    </motion.div>
                  )}
                </div>

                <Button
                  onClick={handleStudentSubmit}
                  disabled={isLoading || !email || !isValidAcademicEmail(email)}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 h-12 rounded-xl transition-all duration-200"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" /> Dispatching Code...
                    </span>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>

                <button
                  onClick={() => setStep('roleSelect')}
                  className="mt-6 text-zinc-500 hover:text-zinc-300 font-semibold text-sm transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Change Role
                </button>

              </div>
            </motion.div>
          )}

          {/* STEP 3: ALUMNI AUTH */}
          {step === 'alumniAuth' && (
            <motion.div key="alumniAuth" {...anim} className="w-full max-w-[450px]">
              <div className="rounded-3xl p-8 bg-zinc-950/40 border border-zinc-900 backdrop-blur-xl shadow-2xl flex flex-col items-center">
                
                <div className="h-12 w-12 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center mb-6">
                  <Trophy className="h-6 w-6 text-amber-400" />
                </div>

                <h2 className="text-2xl font-bold mb-2 text-center text-white">Alumni Verification</h2>
                <p className="text-zinc-400 text-sm text-center mb-8">
                  Enter your graduation details to verify your alumni status.
                </p>

                <div className="w-full space-y-4 mb-6">
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Personal Email</label>
                    <input
                      type="email"
                      value={personalEmail}
                      onChange={e => setPersonalEmail(e.target.value)}
                      placeholder="your.email@gmail.com"
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all text-center"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Roll Number</label>
                    <input
                      type="text"
                      value={rollNumber}
                      onChange={e => setRollNumber(e.target.value)}
                      placeholder="e.g. 22B81A05F3"
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all text-center uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Batch / Class Of</label>
                    <input
                      type="text"
                      value={batch}
                      onChange={e => setBatch(e.target.value)}
                      placeholder="e.g. Class of 2024"
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all text-center"
                    />
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 py-2.5 px-3 rounded-lg"
                    >
                      {error}
                    </motion.div>
                  )}
                </div>

                <Button
                  onClick={handleAlumniSubmit}
                  disabled={isLoading || !personalEmail || !rollNumber || !batch}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 h-12 rounded-xl transition-all duration-200"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying Records...
                    </span>
                  ) : (
                    'Verify & Send Code'
                  )}
                </Button>

                <button
                  onClick={() => setStep('roleSelect')}
                  className="mt-6 text-zinc-500 hover:text-zinc-300 font-semibold text-sm transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Change Role
                </button>

              </div>
            </motion.div>
          )}

          {/* STEP 4: ADMIN AUTH */}
          {step === 'adminAuth' && (
            <motion.div key="adminAuth" {...anim} className="w-full max-w-[450px]">
              <div className="rounded-3xl p-8 bg-zinc-950/40 border border-zinc-900 backdrop-blur-xl shadow-2xl flex flex-col items-center">
                
                <div className="h-12 w-12 rounded-xl bg-sky-600/10 border border-sky-500/20 flex items-center justify-center mb-6">
                  <Shield className="h-6 w-6 text-sky-400" />
                </div>

                <h2 className="text-2xl font-bold mb-2 text-center text-white">Admin Login</h2>
                <p className="text-zinc-400 text-sm text-center mb-8">
                  Sign in using your authorized campus administrator credentials.
                </p>

                <div className="w-full space-y-4 mb-6">
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Admin Email</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      placeholder="admin@college.edu"
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition-all text-center"
                    />
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 py-2.5 px-3 rounded-lg"
                    >
                      {error}
                    </motion.div>
                  )}
                </div>

                <Button
                  onClick={handleAdminSubmit}
                  disabled={isLoading || !adminEmail}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 h-12 rounded-xl transition-all duration-200"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" /> Dispatching Code...
                    </span>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>

                <button
                  onClick={() => setStep('roleSelect')}
                  className="mt-6 text-zinc-500 hover:text-zinc-300 font-semibold text-sm transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Change Role
                </button>

              </div>
            </motion.div>
          )}

          {/* STEP 5: OTP VERIFICATION */}
          {step === 'otp' && (
            <motion.div key="otp" {...anim} className="w-full max-w-[450px]">
              <div className="rounded-3xl p-8 bg-zinc-950/40 border border-zinc-900 backdrop-blur-xl shadow-2xl flex flex-col items-center">
                
                <div className="h-12 w-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-6 animate-pulse">
                  <Mail className="h-6 w-6 text-violet-400" />
                </div>

                <h2 className="text-2xl font-bold mb-2 text-center text-white">Security Verification</h2>
                <p className="text-zinc-400 text-sm text-center mb-8">
                  Enter the 6-digit code sent to <span className="text-white font-semibold">{getActiveEmail()}</span>
                </p>

                <OTPForm
                  email={getActiveEmail()}
                  onVerify={handleVerifyOtp}
                  onResend={handleResendOtp}
                  isLoading={isLoading}
                  error={error}
                  canResend={canResendOTP}
                  resendCountdown={resendCountdown}
                />

                <button
                  onClick={() => {
                    if (role === 'alumni') {
                      setStep('alumniAuth');
                    } else if (role === 'admin') {
                      setStep('adminAuth');
                    } else {
                      setStep('studentAuth');
                    }
                  }}
                  className="mt-6 text-zinc-500 hover:text-zinc-300 font-semibold text-sm transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Edit
                </button>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
