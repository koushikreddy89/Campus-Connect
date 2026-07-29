import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { preferencesApi, UserPreferencesData } from '@/services/api';
import { toast } from 'sonner';

interface PreferencesState {
  preferences: UserPreferencesData;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchPreferences: () => Promise<void>;
  updateTheme: (theme: 'dark' | 'light' | 'system') => Promise<void>;
  updateLanguage: (language: 'English' | 'Hindi' | 'Telugu' | 'Tamil' | 'Kannada' | 'Malayalam') => Promise<void>;
  updateTimezone: (timezone: string) => Promise<void>;
  updateDateFormat: (dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD', timeFormat: '12h' | '24h') => Promise<void>;
  updateNotification: (sound: 'Default' | 'Chime' | 'Pop' | 'Bell' | 'Campus' | 'Silent' | 'Aurora' | 'Pulse' | 'Zen' | 'Echo' | 'Minimal', volume: number) => Promise<void>;
  updateDataSaver: (data: {
    dataSaver?: boolean;
    autoPlayVideos?: boolean;
    imageQuality?: 'Auto' | 'HD' | 'Low Quality';
    mediaCompression?: boolean;
    videoHd?: boolean;
    wifiOnlyDownloads?: boolean;
  }) => Promise<void>;
}

const DEFAULT_PREFS: UserPreferencesData = {
  theme: 'system',
  language: 'English',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  notificationSound: 'Default',
  notificationVolume: 80,
  dataSaver: false,
  autoPlayVideos: true,
  imageQuality: 'Auto',
  mediaCompression: true,
  videoHd: false,
  wifiOnlyDownloads: false
};

const getSystemTheme = () => 
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const applyTheme = (theme: 'dark' | 'light' | 'system') => {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const computedTheme = theme === 'system' ? getSystemTheme() : theme;
  if (computedTheme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
};

// Listen to system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = usePreferencesStore.getState().preferences.theme;
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_PREFS,
      isLoading: false,
      isSaving: false,
      error: null,

      fetchPreferences: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await preferencesApi.getPreferences();
          if (res.success && res.data) {
            set({ preferences: { ...DEFAULT_PREFS, ...res.data }, isLoading: false });
            applyTheme(res.data.theme || 'system');
          } else {
            throw new Error(res.error || 'Failed to fetch user preferences');
          }
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          // Fallback to applying stored local theme
          applyTheme(get().preferences.theme);
        }
      },

      updateTheme: async (theme) => {
        const previousTheme = get().preferences.theme;
        // Optimistic UI Update
        set((s) => ({ preferences: { ...s.preferences, theme } }));
        applyTheme(theme);

        try {
          const res = await preferencesApi.updateTheme(theme);
          if (!res.success) {
            throw new Error(res.error || 'API failed');
          }
          toast.success('Theme preference synced!');
        } catch (err) {
          // Rollback
          set((s) => ({ preferences: { ...s.preferences, theme: previousTheme } }));
          applyTheme(previousTheme);
          toast.error('Unable to update theme. Please try again.');
        }
      },

      updateLanguage: async (language) => {
        const previousLang = get().preferences.language;
        set((s) => ({ preferences: { ...s.preferences, language } }));
        try {
          const res = await preferencesApi.updateLanguage(language);
          if (!res.success) {
            throw new Error(res.error || 'API failed');
          }
          toast.success(`Language changed to ${language}`);
        } catch (err) {
          set((s) => ({ preferences: { ...s.preferences, language: previousLang } }));
          toast.error('Language could not be changed.');
        }
      },

      updateTimezone: async (timezone) => {
        const previousTimezone = get().preferences.timezone;
        set((s) => ({ preferences: { ...s.preferences, timezone } }));
        try {
          const res = await preferencesApi.updateTimezone(timezone);
          if (!res.success) {
            throw new Error(res.error || 'API failed');
          }
          toast.success('Time zone updated!');
        } catch (err) {
          set((s) => ({ preferences: { ...s.preferences, timezone: previousTimezone } }));
          toast.error('Unable to update timezone.');
        }
      },

      updateDateFormat: async (dateFormat, timeFormat) => {
        const previousDateFormat = get().preferences.dateFormat;
        const previousTimeFormat = get().preferences.timeFormat;
        set((s) => ({ preferences: { ...s.preferences, dateFormat, timeFormat } }));
        try {
          const res = await preferencesApi.updateDateFormat(dateFormat, timeFormat);
          if (!res.success) {
            throw new Error(res.error || 'API failed');
          }
          toast.success('Date & Time format updated!');
        } catch (err) {
          set((s) => ({ preferences: { ...s.preferences, dateFormat: previousDateFormat, timeFormat: previousTimeFormat } }));
          toast.error('Unable to update date/time formats.');
        }
      },

      updateNotification: async (sound, volume) => {
        const previousSound = get().preferences.notificationSound;
        const previousVolume = get().preferences.notificationVolume;
        set((s) => ({ preferences: { ...s.preferences, notificationSound: sound, notificationVolume: volume } }));
        try {
          const res = await preferencesApi.updateNotification(sound, volume);
          if (!res.success) {
            throw new Error(res.error || 'API failed');
          }
          toast.success('Notification settings updated!');
        } catch (err) {
          set((s) => ({ preferences: { ...s.preferences, notificationSound: previousSound, notificationVolume: previousVolume } }));
          toast.error('Unable to update notification parameters.');
        }
      },

      updateDataSaver: async (data) => {
        const previousState = { ...get().preferences };
        set((s) => ({ preferences: { ...s.preferences, ...data } }));
        try {
          const res = await preferencesApi.updateDataSaver(data);
          if (!res.success) {
            throw new Error(res.error || 'API failed');
          }
          toast.success('Data saver configurations updated!');
        } catch (err) {
          set({ preferences: previousState });
          toast.error('Unable to update data saver configurations.');
        }
      }
    }),
    {
      name: 'campus-connect-preferences',
      partialize: (state) => ({ preferences: state.preferences }),
    }
  )
);
