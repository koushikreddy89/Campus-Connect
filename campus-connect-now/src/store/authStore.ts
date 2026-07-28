import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isValidAcademicEmail } from '@/utils/validation';
import { useProfileStore } from './profileStore';
import { authApi } from '@/services/api';

type UserRole = 'student' | 'admin' | 'alumni';

interface AuthState {
  token: string | null;
  email: string | null;
  uid: string | null;
  _id: string | null;
  name: string | null;
  fullName: string | null;
  user: any | null;
  isNewUser: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isLoading: boolean;
  error: string | null;
  resetSuccess: boolean;
  role: UserRole;
  college: string | null;
  otpRequest: AbortController | null;
  activeSessions: any[];
  debugOtp: string | null;
  debugResetLink: string | null;
  sendOtp: (email: string) => Promise<void>;
  verifyAlumni: (personalEmail: string, rollNumber: string, batch: string) => Promise<boolean>;
  verifyOtp: (code: string) => Promise<void>;
  fetchActiveSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeAllOtherSessions: () => Promise<void>;
  logout: () => void;
  cancelOtpRequest: () => void;
  setProfileComplete: (v: boolean) => void;
  setCollege: (c: string) => void;
  setRole: (role: UserRole) => void;
  
  // Enterprise hardeners
  getCaptchaChallenge: () => Promise<any>;
  registerUser: (payload: any) => Promise<any>;
  verifyEmailCode: (code: string) => Promise<boolean>;
  login: (payload: any) => Promise<any>;
  verifyMfa: (code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (payload: any) => Promise<any>;
  logoutAll: () => Promise<any>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      email: null,
      uid: null,
      _id: null,
      name: null,
      fullName: null,
      user: null,
      isNewUser: false,
      isAuthenticated: false,
      isProfileComplete: false,
      isLoading: false,
      error: null,
      resetSuccess: false,
      role: 'student' as UserRole,
      college: null,
      otpRequest: null,
      activeSessions: [],
      debugOtp: null,
      debugResetLink: null,

      cancelOtpRequest: () => {
        const state = get();
        if (state.otpRequest) {
          state.otpRequest.abort();
          set({ otpRequest: null, isLoading: false });
        }
      },

      getCaptchaChallenge: async () => {
        set({ error: null });
        try {
          const res = await authApi.getCaptcha();
          if (res.success) {
            return res;
          } else {
            set({ error: res.error || 'Failed to get CAPTCHA' });
            return null;
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to load CAPTCHA challenge' });
          return null;
        }
      },

      registerUser: async (payload: any) => {
        set({ isLoading: true, error: null, debugOtp: null });
        try {
          const res = await authApi.register(payload);
          set({ isLoading: false });
          if (res.success) {
            const registeredName = payload.name || payload.fullName || null;
            set({ 
              email: payload.email.toLowerCase(), 
              name: registeredName,
              fullName: registeredName,
              debugOtp: res.debugOtp || null 
            });
            if (res.debugOtp) {
              console.log(`🔑 [OTP Debug] OTP code received from server: ${res.debugOtp}`);
            }
            return res;
          } else {
            set({ error: (typeof res.error === 'string' ? res.error : null) || res.message || 'Registration failed' });
            return res;
          }
        } catch (error: any) {
          set({ isLoading: false, error: error.message || 'Registration failed' });
          return { success: false, error: error.message };
        }
      },

      verifyEmailCode: async (code: string) => {
        const state = get();
        if (!state.email) {
          set({ error: 'Email not set' });
          return false;
        }
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.verifyEmail(state.email, code);
          if (res.success) {
            let detectedCollege = 'SR University'; // Default fallback
            if (res.email) {
              const domain = res.email.split('@')[1] || '';
              try {
                const { findCollegeByDomainJSON } = require('@/utils/collegeDetectionJSON');
                const found = await findCollegeByDomainJSON(domain);
                if (found && found.name) {
                  detectedCollege = found.name;
                }
              } catch (e) {
                console.error('Failed to auto-detect college in verifyEmailCode:', e);
              }
            }

            // Store token and mark as authenticated
            localStorage.setItem('auth_token', res.token);
            localStorage.setItem('jwt_token', res.token);

            const resolvedName = res.user?.fullName || res.user?.name || state.name || null;
            set({
              token: res.token,
              isAuthenticated: true,
              isProfileComplete: res.profileComplete || false,
              isNewUser: res.isNewUser || false,
              isLoading: false,
              role: res.role || res.user?.role || state.role,
              email: res.email || res.user?.email || state.email,
              uid: res.user?.id || res.userId || null,
              _id: res.user?._id || res.userOid || null,
              name: resolvedName,
              fullName: resolvedName,
              user: res.user || state.user || null,
              college: res.college || detectedCollege,
              error: null
            });
            return true;
          } else {
            set({ isLoading: false, error: (typeof res.error === 'string' ? res.error : null) || res.message || 'Verification failed' });
            return false;
          }
        } catch (error: any) {
          set({ isLoading: false, error: error.message || 'Verification failed' });
          return false;
        }
      },

      login: async (payload: any) => {
        const state = get();
        set({ isLoading: true, error: null, debugOtp: null });
        try {
          const res = await authApi.login(payload);
          set({ isLoading: false });
          
          if (!res.success) {
            set({ error: (typeof res.error === 'string' ? res.error : null) || res.message || 'Login failed' });
            return res;
          }

          if (res.mfaRequired) {
            set({ email: payload.email.toLowerCase(), debugOtp: res.debugOtp || null });
            if (res.debugOtp) {
              console.log(`🔑 [OTP Debug] MFA OTP code received from server: ${res.debugOtp}`);
            }
            return res; // Frontend will transition to MFA verify view
          }

          let detectedCollege = 'SR University'; // Default fallback
          if (res.email) {
            const domain = res.email.split('@')[1] || '';
            try {
              const { findCollegeByDomainJSON } = require('@/utils/collegeDetectionJSON');
              const found = await findCollegeByDomainJSON(domain);
              if (found && found.name) {
                detectedCollege = found.name;
              }
            } catch (e) {}
          }

          if (res.token) {
            localStorage.setItem('token', res.token);
            localStorage.setItem('auth_token', res.token);
            localStorage.setItem('jwt_token', res.token);
            localStorage.setItem('userId', res.user?.id || res.userId || '');
          }

          const loginName = res.user?.fullName || res.user?.name || state.name || null;
          set({
            token: res.token,
            isAuthenticated: true,
            isProfileComplete: res.profileComplete,
            isNewUser: res.isNewUser || false,
            role: res.user?.role || res.role,
            email: res.user?.email || res.email,
            uid: res.user?.id || res.userId,
            _id: res.user?._id || res.userOid || null,
            name: loginName,
            fullName: loginName,
            user: res.user || state.user || null,
            college: res.college || detectedCollege,
            error: null
          });
          return res;
        } catch (error: any) {
          set({ isLoading: false, error: error.message || 'Login failed' });
          return { success: false, error: error.message };
        }
      },

      verifyMfa: async (code: string) => {
        const state = get();
        if (!state.email) {
          set({ error: 'Email not set' });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.verifyMfa(state.email, code);
          set({ isLoading: false });
          if (res.success && res.token) {
            let detectedCollege = 'SR University'; // Default fallback
            const emailVal = res.user?.email || res.email;
            if (emailVal) {
              const domain = emailVal.split('@')[1] || '';
              try {
                const { findCollegeByDomainJSON } = require('@/utils/collegeDetectionJSON');
                const found = await findCollegeByDomainJSON(domain);
                if (found && found.name) {
                  detectedCollege = found.name;
                }
              } catch (e) {}
            }

            if (res.token) {
              localStorage.setItem('token', res.token);
              localStorage.setItem('auth_token', res.token);
              localStorage.setItem('jwt_token', res.token);
              localStorage.setItem('userId', res.user?.id || res.userId || '');
            }

            const mfaName = res.user?.fullName || res.user?.name || state.name || null;
            set({
              token: res.token,
              isAuthenticated: true,
              isProfileComplete: res.profileComplete,
              isNewUser: res.isNewUser || false,
              role: res.user?.role || res.role,
              email: emailVal,
              uid: res.user?.id || res.userId,
              _id: res.user?._id || res.userOid || null,
              name: mfaName,
              fullName: mfaName,
              user: res.user || state.user || null,
              college: res.college || detectedCollege,
              error: null
            });
          } else {
            set({ error: (typeof res.error === 'string' ? res.error : null) || res.message || 'MFA verification failed' });
          }
        } catch (error: any) {
          set({ isLoading: false, error: error.message || 'MFA verification failed' });
        }
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null, debugResetLink: null });
        try {
          const res = await authApi.forgotPassword(email);
          set({ isLoading: false });
          if (res.success) {
            set({ resetSuccess: true, debugResetLink: res.debugResetLink || null });
            if (res.debugResetLink) {
              console.log(`🔑 [Reset Token Debug] Password reset link: ${res.debugResetLink}`);
            }
          } else {
            set({ error: (typeof res.error === 'string' ? res.error : null) || res.message || 'Password reset request failed' });
          }
          return res;
        } catch (error: any) {
          set({ isLoading: false, error: error.message || 'Password reset request failed' });
          return { success: false, error: error.message };
        }
      },

      resetPassword: async (payload: any) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.resetPassword(payload);
          set({ isLoading: false });
          if (!res.success) {
            set({ error: (typeof res.error === 'string' ? res.error : null) || res.message || 'Password reset failed' });
          }
          return res;
        } catch (error: any) {
          set({ isLoading: false, error: error.message || 'Password reset failed' });
          return { success: false, error: error.message };
        }
      },

      sendOtp: async (email: string) => {
        const state = get();
        
        if (state.isLoading) {
          console.warn('⚠️ OTP request already in progress');
          return;
        }

        set({ isLoading: true, error: null });

        try {
          console.log(`📤 Sending OTP request for: ${email.toLowerCase()} (Role: ${state.role})`);

          const res = await authApi.sendOtp(email.toLowerCase(), state.role);
          if (res.error || !res.success) {
            set({ isLoading: false, error: res.error || res.message || 'Failed to send OTP' });
            return;
          }

          set({ 
            email: email.toLowerCase(), 
            isLoading: false,
            error: null
          });

        } catch (error: any) {
          console.error('❌ Unexpected error:', error);
          set({ 
            isLoading: false, 
            error: error?.message || 'An unexpected error occurred'
          });
        }
      },

      verifyAlumni: async (personalEmail: string, rollNumber: string, batch: string) => {
        if (get().isLoading) return false;
        
        set({ isLoading: true, error: null });
        try {
          console.log(`📤 Verifying alumni record for personalEmail: ${personalEmail}`);
          const res = await authApi.verifyAlumni(personalEmail.toLowerCase(), rollNumber, batch);
          
          if (res.error || !res.success) {
            set({ isLoading: false, error: res.error || res.message || 'Unable to verify alumni record.' });
            return false;
          }
          
          set({
            email: personalEmail.toLowerCase(),
            isLoading: false,
            error: null
          });
          return true;
        } catch (error: any) {
          console.error('❌ Alumni verification error:', error);
          set({
            isLoading: false,
            error: error?.message || 'Alumni verification failed.'
          });
          return false;
        }
      },

      verifyOtp: async (code: string) => {
        const state = get();
        set({ isLoading: true, error: null });
        try {
          if (!state.email) {
            set({ isLoading: false, error: 'Email not set' });
            return;
          }

          if (code.length !== 6) {
            set({ isLoading: false, error: 'OTP must be 6 digits' });
            return;
          }

          const res = await authApi.verifyOtp(state.email, code);

          if (res.error || !res.success) {
            set({ isLoading: false, error: res.error || res.message || 'OTP verification failed' });
            return;
          }

          let detectedCollege = 'SR University'; // Default fallback
          if (res.email) {
            const domain = res.email.split('@')[1] || '';
            try {
              const { findCollegeByDomainJSON } = require('@/utils/collegeDetectionJSON');
              const found = await findCollegeByDomainJSON(domain);
              if (found && found.name) {
                detectedCollege = found.name;
              }
            } catch (e) {
              console.error('Failed to auto-detect college in verifyOtp:', e);
            }
          }

          // Store token and mark as authenticated
          localStorage.setItem('auth_token', res.token);
          localStorage.setItem('jwt_token', res.token);
          
          set({
            token: res.token,
            isAuthenticated: true,
            isProfileComplete: res.profileComplete,
            isNewUser: res.isNewUser,
            isLoading: false,
            role: res.role || res.user?.role || state.role,
            email: res.email || res.user?.email || state.email,
            uid: res.user?.id || res.userId || null,
            _id: res.user?._id || res.userOid || null,
            college: detectedCollege
          });
          
          console.log('✅ OTP verified successfully in store with college:', detectedCollege);
        } catch (error: any) {
          console.error('OTP verify error:', error);
          set({ isLoading: false, error: error?.message || 'Verification failed' });
        }
      },

      fetchActiveSessions: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.getActiveSessions();
          if (res.success && res.sessions) {
            set({ activeSessions: res.sessions, isLoading: false });
          } else {
            set({ error: res.error || res.message || 'Failed to fetch active sessions', isLoading: false });
          }
        } catch (error: any) {
          set({ error: error?.message || 'Failed to fetch active sessions', isLoading: false });
        }
      },

      revokeSession: async (sessionId: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.revokeSession(sessionId);
          if (res.success) {
            const currentSessions = get().activeSessions;
            set({
              activeSessions: currentSessions.filter((s: any) => s.sessionId !== sessionId),
              isLoading: false
            });
          } else {
            set({ error: res.error || res.message || 'Failed to revoke session', isLoading: false });
          }
        } catch (error: any) {
          set({ error: error?.message || 'Failed to revoke session', isLoading: false });
        }
      },

      revokeAllOtherSessions: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.revokeAllOtherSessions();
          if (res.success) {
            const currentSessions = get().activeSessions;
            set({
              activeSessions: currentSessions.filter((s: any) => s.isCurrentDevice),
              isLoading: false
            });
          } else {
            set({ error: res.error || res.message || 'Failed to revoke other sessions', isLoading: false });
          }
        } catch (error: any) {
          set({ error: error?.message || 'Failed to revoke other sessions', isLoading: false });
        }
      },

      logout: async () => {
        console.log('🔒 [Auth] Logging out user - clearing all user data');
        
        try {
          // ✅ STEP 1: Mark as loading to prevent blank screen
          set({ isLoading: true });
          
          // ✅ STEP 2: Clear profile store FIRST
          useProfileStore.getState().resetProfile();
          console.log('✅ [Auth] Profile store cleared');

          // ✅ STEP 3: Clear localStorage to prevent data leakage
          const keysToPreserve = ['theme', 'language']; // Preserve non-sensitive settings
          Object.keys(localStorage).forEach(key => {
            if (!keysToPreserve.includes(key)) {
              localStorage.removeItem(key);
            }
          });
          // Explicitly remove tokens
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('auth_token');
          console.log('✅ [Auth] localStorage cleared');

          // ✅ STEP 4: Clear sessionStorage
          sessionStorage.clear();
          console.log('✅ [Auth] sessionStorage cleared');

          // Clear cookies via backend hit
          await authApi.logout();

          // ✅ STEP 5: Clear auth state
          set({
            token: null, 
            email: null, 
            uid: null,
            isNewUser: false,
            isAuthenticated: false, 
            isProfileComplete: false,
            error: null, 
            resetSuccess: false, 
            role: 'student', 
            college: null,
            isLoading: false,
            activeSessions: [],
            debugOtp: null,
            debugResetLink: null,
          });
          console.log('✅ [Auth] Auth state cleared');
          console.log('✅ [Auth] User data cleared successfully');
        } catch (err) {
          console.error('❌ [Auth] Logout error:', err);
          // Even if logout fails, ensure state is cleared
          set({
            token: null,
            email: null,
            uid: null,
            isAuthenticated: false,
            isLoading: false,
            activeSessions: [],
            debugOtp: null,
            debugResetLink: null,
          });
        }
      },

      logoutAll: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.logoutAll();
          useProfileStore.getState().resetProfile();
          set({
            token: null,
            email: null,
            uid: null,
            isAuthenticated: false,
            isLoading: false,
            activeSessions: [],
            debugOtp: null,
            debugResetLink: null,
          });
          return res;
        } catch (error: any) {
          set({ error: error.message || 'Logout all failed', isLoading: false });
          return { success: false, error: error.message };
        }
      },

      setProfileComplete: (v) => set({ isProfileComplete: v }),
      setCollege: (c) => set({ college: c }),
      setRole: (role: UserRole) => set({ role }),
    }),
    {
      name: 'campus-connect-auth',
      partialize: (state: any) => ({
        token: state.token,
        email: state.email,
        uid: state.uid,
        _id: state._id,
        role: state.role,
        college: state.college,
        isAuthenticated: state.isAuthenticated,
        isProfileComplete: state.isProfileComplete,
      })
    }
  )
);

if (typeof window !== 'undefined') {
  window.addEventListener('cc-session-expired', () => {
    useAuthStore.getState().logout();
  });
}
