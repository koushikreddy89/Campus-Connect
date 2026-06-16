import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProfileSetupData } from '@/types';
import { userApi } from '@/services/api';
import { useAuthStore } from './authStore';
import { alumniProfileService } from '@/services/alumniService';

interface ProfileState {
  uid: string | null;
  profile: ProfileSetupData;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  updateProfile: (data: Partial<ProfileSetupData>) => void;
  saveProfile: (onboardingData?: { onboardingCompleted?: boolean; onboardingStep?: number }) => Promise<void>;
  resetProfile: () => void;
  setError: (error: string | null) => void;
  loadProfile: (uid: string) => Promise<void>;
}

const DEFAULT_PROFILE: ProfileSetupData = {
  name: '',
  age: null,
  gender: '',
  bio: '',
  interests: [],
  photos: [],
  // Student fields
  course: '',
  year: '',
  personalEmail: '',
  // Alumni fields
  passoutYear: '',
  batch: '',
  company: '',
  jobRole: '',
  experience: '',
  // Profile Strength & Professional fields
  skills: [],
  clubs: [],
  achievements: [],
  linkedinUrl: '',
  githubUrl: '',
  projects: [],
  careerGoals: '',
  onboardingCompleted: false,
  onboardingStep: 1,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      uid: null,
      profile: DEFAULT_PROFILE,
      isLoading: false,
      error: null,
      isSaving: false,

      updateProfile: (data) => set((s) => ({ profile: { ...s.profile, ...data } })),

      resetProfile: () => {
        console.log('🔄 [Profile] Resetting profile store');
        set({
          uid: null,
          profile: DEFAULT_PROFILE,
          error: null,
          isLoading: false,
          isSaving: false,
        });
      },

      setError: (error) => set({ error }),

      saveProfile: async (onboardingData) => {
        const state = get();
        
        if (state.isSaving || state.isLoading) {
          console.warn('⚠️ [Profile] Save already in progress, skipping duplicate request');
          return;
        }

        set({ isSaving: true, error: null });
        try {
          const role = useAuthStore.getState().role;
          let res;

          if (role === 'alumni') {
            res = await alumniProfileService.updateProfile(
              state.uid!,
              {
                name: state.profile.name,
                batch: state.profile.batch || state.profile.passoutYear || state.profile.year || '',
                department: state.profile.course || '',
                company: state.profile.company || '',
                role: state.profile.jobRole || '',
                story: state.profile.bio || '',
                achievements: state.profile.achievements || [],
                skills: state.profile.skills || [],
                linkedinUrl: state.profile.linkedinUrl || '',
                profileImageUrl: state.profile.photos[0] || '',
                onboardingCompleted: onboardingData?.onboardingCompleted !== undefined 
                  ? onboardingData.onboardingCompleted 
                  : state.profile.onboardingCompleted,
                onboardingStep: onboardingData?.onboardingStep !== undefined 
                  ? onboardingData.onboardingStep 
                  : state.profile.onboardingStep
              },
              useAuthStore.getState().college || 'SR University'
            );
          } else {
            res = await userApi.updateProfile({
              name: state.profile.name,
              bio: state.profile.bio,
              interests: state.profile.interests,
              photos: state.profile.photos,
              course: state.profile.course, // maps to department on backend
              year: state.profile.year, // maps to batch on backend
              department: state.profile.course,
              batch: state.profile.year,
              personalEmail: state.profile.personalEmail,
              skills: state.profile.skills || [],
              clubs: state.profile.clubs || [],
              achievements: state.profile.achievements || [],
              linkedinUrl: state.profile.linkedinUrl || '',
              githubUrl: state.profile.githubUrl || '',
              projects: state.profile.projects || [],
              careerGoals: state.profile.careerGoals || '',
              onboardingCompleted: onboardingData?.onboardingCompleted !== undefined 
                ? onboardingData.onboardingCompleted 
                : state.profile.onboardingCompleted,
              onboardingStep: onboardingData?.onboardingStep !== undefined 
                ? onboardingData.onboardingStep 
                : state.profile.onboardingStep
            });
          }

          if (res && 'error' in res && res.error) {
            throw new Error(res.message || 'Failed to save profile');
          }

          console.log('✅ [Profile] Profile saved successfully to MongoDB');
          
          const updatedProfile = {
            ...state.profile,
            onboardingCompleted: onboardingData?.onboardingCompleted !== undefined 
              ? onboardingData.onboardingCompleted 
              : state.profile.onboardingCompleted,
            onboardingStep: onboardingData?.onboardingStep !== undefined 
              ? onboardingData.onboardingStep 
              : state.profile.onboardingStep
          };

          set({ profile: updatedProfile, isSaving: false });
        } catch (err: any) {
          console.error('❌ [Profile] Save failed:', err);
          set({ 
            isSaving: false, 
            error: err instanceof Error ? err.message : 'Failed to save profile'
          });
          throw err;
        }
      },

      loadProfile: async (uid: string) => {
        console.log('📥 [Profile] Loading profile for uid:', uid);
        set({ isLoading: true, error: null });
        try {
          const role = useAuthStore.getState().role;
          let dbProf = null;

          if (role === 'alumni') {
            const collegeName = useAuthStore.getState().college || 'SR University';
            dbProf = await alumniProfileService.getMyProfile(collegeName);
          } else {
            const res = await userApi.getUserById(uid);
            if (res.success && res.data) {
              dbProf = res.data;
            }
          }

          if (dbProf) {
            set({
              uid,
              profile: {
                name: dbProf.name || '',
                age: dbProf.age || 21,
                gender: dbProf.gender || 'other',
                bio: dbProf.bio || dbProf.story || '',
                interests: dbProf.interests || [],
                photos: dbProf.photos || (dbProf.profileImageUrl || dbProf.profileImage ? [dbProf.profileImageUrl || dbProf.profileImage] : []),
                course: dbProf.department || dbProf.course || '',
                year: dbProf.batch || dbProf.year || '',
                personalEmail: dbProf.personalEmail || dbProf.email || '',
                passoutYear: dbProf.batch || '',
                batch: dbProf.batch || '',
                company: dbProf.company || '',
                jobRole: dbProf.role || dbProf.jobRole || '',
                experience: dbProf.experience || '',
                skills: dbProf.skills || [],
                clubs: dbProf.clubs || [],
                achievements: dbProf.achievements || [],
                linkedinUrl: dbProf.linkedinUrl || '',
                githubUrl: dbProf.githubUrl || '',
                projects: dbProf.projects || [],
                careerGoals: dbProf.careerGoals || '',
                onboardingCompleted: dbProf.onboardingCompleted || false,
                onboardingStep: dbProf.onboardingStep || 1,
              },
              isLoading: false
            });
          } else {
            set({ uid, isLoading: false });
          }
        } catch (err: any) {
          console.error('Failed to load profile:', err);
          set({ uid, isLoading: false, error: err.message });
        }
      },
    }),
    { name: 'campus-connect-profile' }
  )
);
