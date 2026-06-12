import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProfileSetupData } from '@/types';
import { userApi } from '@/services/api';

interface ProfileState {
  uid: string | null;
  profile: ProfileSetupData;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  updateProfile: (data: Partial<ProfileSetupData>) => void;
  saveProfile: () => Promise<void>;
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

      saveProfile: async () => {
        const state = get();
        
        if (state.isSaving || state.isLoading) {
          console.warn('⚠️ [Profile] Save already in progress, skipping duplicate request');
          return;
        }

        set({ isSaving: true, error: null });
        try {
          const res = await userApi.updateProfile({
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
          });

          if (res.error) {
            throw new Error(res.message || 'Failed to save profile');
          }

          console.log('✅ [Profile] Profile saved successfully to MongoDB');
          set({ isSaving: false });
        } catch (err: any) {
          console.error('❌ [Profile] Save failed:', err);
          set({ 
            isSaving: false, 
            error: err instanceof Error ? err.message : 'Failed to save profile'
          });
        }
      },

      loadProfile: async (uid: string) => {
        console.log('📥 [Profile] Loading profile for uid:', uid);
        set({ isLoading: true, error: null });
        try {
          const res = await userApi.getUserById(uid);
          if (res.success && res.data) {
            const dbProf = res.data;
            set({
              uid,
              profile: {
                name: dbProf.name || '',
                age: dbProf.age || 21,
                gender: dbProf.gender || 'other',
                bio: dbProf.bio || '',
                interests: dbProf.interests || [],
                photos: dbProf.photos || (dbProf.profileImageUrl ? [dbProf.profileImageUrl] : []),
                course: dbProf.department || dbProf.course || '',
                year: dbProf.batch || dbProf.year || '',
                personalEmail: dbProf.personalEmail || '',
                passoutYear: '',
                batch: '',
                company: '',
                jobRole: '',
                experience: '',
                skills: dbProf.skills || [],
                clubs: dbProf.clubs || [],
                achievements: dbProf.achievements || [],
                linkedinUrl: dbProf.linkedinUrl || '',
                githubUrl: dbProf.githubUrl || '',
                projects: dbProf.projects || [],
                careerGoals: dbProf.careerGoals || '',
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
