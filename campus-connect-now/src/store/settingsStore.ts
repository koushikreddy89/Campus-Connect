import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsApi, UserSettingsData } from '@/services/api';
import { toast } from 'sonner';

interface SettingsState {
  settings: UserSettingsData;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<UserSettingsData>) => Promise<void>;
  updateToggleSetting: (key: keyof UserSettingsData, value: boolean) => Promise<void>;
}

const DEFAULT_SETTINGS: UserSettingsData = {
  readReceipts: true,
  activeStatus: true,
  typingIndicator: true,
  onlinePresence: true,
  autoSeen: true,
  pushNotifications: true,
  soundEffects: true,
  messagePreview: true
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      isSaving: false,
      error: null,

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await settingsApi.getSettings();
          if (res.success && res.data) {
            set({ settings: { ...DEFAULT_SETTINGS, ...res.data }, isLoading: false });
          } else {
            throw new Error(res.error || 'Failed to fetch user settings');
          }
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
        }
      },

      updateSettings: async (data) => {
        const previousSettings = { ...get().settings };
        set((s) => ({ settings: { ...s.settings, ...data } }));
        try {
          const res = await settingsApi.updateSettings(data);
          if (!res.success) {
            throw new Error(res.error || 'API failed');
          }
        } catch (err) {
          set({ settings: previousSettings });
          toast.error('Unable to sync settings. Please try again.');
        }
      },

      updateToggleSetting: async (key, value) => {
        const previousSettings = { ...get().settings };
        set((s) => ({ settings: { ...s.settings, [key]: value } }));
        try {
          const res = await settingsApi.updateSettings({ [key]: value });
          if (!res.success) {
            throw new Error(res.error || 'API failed');
          }
          toast.success('Setting updated successfully!');
        } catch (err) {
          set({ settings: previousSettings });
          toast.error('Unable to sync setting. Please try again.');
        }
      }
    }),
    {
      name: 'campus-connect-chat-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
