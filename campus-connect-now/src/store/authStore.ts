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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      email: null,
      uid: null,
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

      cancelOtpRequest: () => {
        const state = get();
        if (state.otpRequest) {
          state.otpRequest.abort();
          set({ otpRequest: null, isLoading: false });
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
            role: res.role || state.role,
            email: res.email || state.email,
            uid: res.userId,
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
          });
        }
      },

      setProfileComplete: (v) => set({ isProfileComplete: v }),
      setCollege: (c) => set({ college: c }),
      setRole: (role: UserRole) => set({ role }),
    }),
    { name: 'campus-connect-auth' }
  )
);
