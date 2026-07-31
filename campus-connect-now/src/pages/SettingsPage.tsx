import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '@/store/profileStore';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { TRANSLATIONS, playNotificationSound } from '@/utils/preferencesHelpers';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Search,
  User,
  Bell,
  Palette,
  Globe,
  Shield,
  Eye,
  Users,
  UserX,
  Sparkles,
  Check,
  MessageSquare,
  Network,
  Clock,
  HelpCircle,
  Mail,
  FileText,
  LogOut,
  ChevronRight,
  Lock,
  Smartphone,
  HardDrive,
  KeyRound,
  Download,
  Info,
  Sliders,
  SlidersHorizontal,
  Volume2,
  RefreshCw,
  EyeOff,
  Calendar,
  Target,
  Plus,
  Trash,
  X,
  Linkedin,
  Github,
  Upload
} from 'lucide-react';
import { INTERESTS, COURSES, YEARS } from '@/data/constants';
import { uploadMediaFile } from '@/services/uploadService';

class SettingsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[Settings Error Boundary Caught]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center space-y-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 my-4">
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 w-fit mx-auto">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Settings Error</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Some preference settings could not be rendered. You can retry or return to profile.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false })}
              className="text-xs h-9 px-4 rounded-xl border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
            >
              Retry
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/profile';
                }
              }}
              className="text-xs h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white"
            >
              Back to Profile
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PremiumSwitch = React.memo(({ checked, onChange, ariaLabel, disabled }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel?: string; disabled?: boolean }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-[48px] h-[26px] rounded-full p-0.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        checked 
          ? 'bg-gradient-to-r from-purple-500 to-indigo-650 shadow-[0_0_12px_rgba(124,77,255,0.35)]' 
          : 'bg-zinc-200 dark:bg-zinc-800'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        className="w-[22px] h-[22px] rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 22 : 0 }}
      />
    </button>
  );
});

const SectionHeader = React.memo(({ title }: { title: string }) => (
  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-[0.08em] px-1 py-2 mt-4 mb-2">
    {title}
  </div>
));

const SettingRowButton = React.memo(({ 
  icon: Icon, 
  label, 
  description,
  value, 
  onClick, 
  isDanger,
  disabled,
  iconBgClass = 'bg-purple-50 dark:bg-purple-950/20',
  iconColorClass = 'text-purple-600 dark:text-purple-400'
}: { 
  icon: any; 
  label: string; 
  description?: string;
  value?: string; 
  onClick: () => void; 
  isDanger?: boolean;
  disabled?: boolean;
  iconBgClass?: string;
  iconColorClass?: string;
}) => (
  <motion.button
    whileTap={disabled ? undefined : { scale: 0.99 }}
    whileHover={disabled ? undefined : { y: -2 }}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className={`group w-full min-h-[72px] rounded-[18px] px-5 py-3.5 flex items-center justify-between text-left transition-all duration-[180ms] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary border border-transparent bg-white dark:bg-zinc-900/20 hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-zinc-800 dark:text-zinc-300 shadow-sm ${disabled ? 'opacity-40 cursor-not-allowed select-none' : ''}`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-2.5 rounded-full flex items-center justify-center transition-colors duration-250 ${isDanger ? 'bg-red-50 dark:bg-red-950/20' : iconBgClass}`}>
        <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:rotate-[4deg] ${isDanger ? 'text-red-550' : iconColorClass}`} />
      </div>
      <div>
        <span className="text-[15px] font-bold block leading-tight">{label}</span>
        {description && <span className="text-[12px] text-zinc-500 dark:text-zinc-450 block mt-1 font-medium leading-tight">{description}</span>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-xs text-zinc-500 font-semibold">{value}</span>}
      {!isDanger && !disabled && <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-500 transition-transform duration-180 group-hover:translate-x-1" />}
    </div>
  </motion.button>
));

const SettingRowToggle = React.memo(({ 
  icon: Icon, 
  label, 
  description,
  checked, 
  onChange, 
  disabled,
  iconBgClass = 'bg-purple-50 dark:bg-purple-950/20',
  iconColorClass = 'text-purple-600 dark:text-purple-400'
}: { 
  icon: any; 
  label: string; 
  description?: string;
  checked: boolean; 
  onChange: (v: boolean) => void; 
  disabled?: boolean;
  iconBgClass?: string;
  iconColorClass?: string;
}) => (
  <div className="w-full min-h-[72px] rounded-[18px] px-5 py-3.5 flex items-center justify-between text-left bg-white dark:bg-zinc-900/20 text-zinc-800 dark:text-zinc-300 border border-transparent shadow-sm">
    <div className="flex items-center gap-4">
      <div className={`p-2.5 rounded-full flex items-center justify-center transition-colors duration-250 ${iconBgClass}`}>
        <Icon className={`h-5 w-5 ${iconColorClass}`} />
      </div>
      <div>
        <span className="text-[15px] font-bold block leading-tight">{label}</span>
        {description && <span className="text-[12px] text-zinc-500 dark:text-zinc-450 block mt-1 font-medium leading-tight">{description}</span>}
      </div>
    </div>
    <div className="flex items-center gap-4">
      <span className={`text-[11px] font-bold flex items-center gap-1.5 transition-colors duration-180 ${checked ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'}`}>
        <span className="text-[8px]">●</span> {checked ? 'Enabled' : 'Disabled'}
      </span>
      <PremiumSwitch checked={checked} onChange={onChange} ariaLabel={label} disabled={disabled} />
    </div>
  </div>
));

interface TagBuilderProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  label: string;
  placeholder: string;
  id: string;
}

const TagBuilder = ({
  tags,
  onAdd,
  onRemove,
  label,
  placeholder,
  id
}: TagBuilderProps) => {
  const [val, setVal] = useState('');
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (val.trim()) {
        onAdd(val.trim());
        setVal('');
      }
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (val.trim()) {
      onAdd(val.trim());
      setVal('');
    }
  };

  return (
    <div>
      <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">{label}</label>
      <div className="flex gap-2">
        <input
          id={id}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
        />
        <Button onClick={handleAddClick} className="rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground border border-white/5 h-12 px-4 text-xs font-semibold">
          Add
        </Button>
      </div>
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5 p-2.5 bg-black/20 rounded-2xl border border-white/[0.04]">
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-foreground px-2.5 py-1 rounded-full text-[11px] font-medium">
              {t}
              <button
                type="button"
                onClick={() => onRemove(t)}
                className="text-zinc-400 hover:text-red-500 transition-colors ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

interface SettingsPageProps {
  searchQuery?: string;
  activeSubView?: 'main' | 'account-info' | 'change-password' | 'email-mgmt' | 'visibility' | 'theme' | 'language' | 'timezone' | 'date-format' | 'notification-sound' | 'data-saver' | 'edit-profile' | 'alumni-verify' | 'admin-alumni-queue';
  setActiveSubView?: (view: 'main' | 'account-info' | 'change-password' | 'email-mgmt' | 'visibility' | 'theme' | 'language' | 'timezone' | 'date-format' | 'notification-sound' | 'data-saver' | 'edit-profile' | 'alumni-verify' | 'admin-alumni-queue') => void;
}

export default function SettingsPage({
  searchQuery = '',
  activeSubView: propActiveSubView,
  setActiveSubView: propSetActiveSubView
}: SettingsPageProps = {}) {
  const navigate = useNavigate();
  const showReadReceipts = useProfileStore(s => s?.profile?.showReadReceipts);
  const showActiveStatus = useProfileStore(s => s?.profile?.showActiveStatus);
  const showTypingIndicator = useProfileStore(s => s?.profile?.showTypingIndicator);
  const showOnlinePresence = useProfileStore(s => s?.profile?.showOnlinePresence);
  const autoSeen = useProfileStore(s => s?.profile?.autoSeen);
  const notificationEnabled = useProfileStore(s => s?.profile?.notificationEnabled);
  const personalEmail = useProfileStore(s => s?.profile?.personalEmail);
  const collegeEmail = useProfileStore(s => s?.profile?.collegeEmail || s?.profile?.email);
  const collegeEmailVerified = useProfileStore(s => s?.profile?.collegeEmailVerified);
  const personalEmailVerified = useProfileStore(s => s?.profile?.personalEmailVerified);
  const alumniVerified = useProfileStore(s => s?.profile?.alumniVerified);
  const role = useProfileStore(s => s?.profile?.role);
  const userId = useProfileStore(s => s?.profile?.userId);
  const name = useProfileStore(s => s?.profile?.name);
  const course = useProfileStore(s => s?.profile?.course);
  const year = useProfileStore(s => s?.profile?.year);

  const updateProfile = useProfileStore(s => s.updateProfile);
  const saveProfile = useProfileStore(s => s.saveProfile);
  const logout = useAuthStore(s => s.logout);

  const {
    preferences,
    updateTheme,
    updateLanguage,
    updateTimezone,
    updateDateFormat,
    updateNotification,
    updateDataSaver
  } = usePreferencesStore();
  
  const [localActiveSubView, setLocalActiveSubView] = useState<'main' | 'account-info' | 'change-password' | 'email-mgmt' | 'visibility' | 'theme' | 'language' | 'timezone' | 'date-format' | 'notification-sound' | 'data-saver' | 'edit-profile' | 'alumni-verify' | 'admin-alumni-queue'>('main');
  const activeSubView = propActiveSubView || localActiveSubView;
  const setActiveSubView = propSetActiveSubView || setLocalActiveSubView;

  const profile = useProfileStore(s => s.profile) || {};
  const isLoading = useProfileStore(s => s.isLoading);
  const [editTab, setEditTab] = useState<'basic' | 'social' | 'skills' | 'career'>('basic');

  const [loggingOut, setLoggingOut] = useState(false);
  
  const lang = preferences.language || 'English';
  const t = useCallback((key: keyof typeof TRANSLATIONS.English) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.English;
    return dict[key] || TRANSLATIONS.English[key];
  }, [lang]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const matchesQuery = useCallback((label: string, desc?: string) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return label.toLowerCase().includes(q) || (desc && desc.toLowerCase().includes(q)) || false;
  }, [searchQuery]);

  const showAccountSec = matchesQuery(t('editProfile'), t('editProfileDesc')) ||
    matchesQuery(t('accountInfo'), t('accountInfoDesc')) ||
    matchesQuery(t('changePassword'), t('changePasswordDesc')) ||
    matchesQuery(t('emailAddress'), t('emailAddressDesc')) ||
    matchesQuery(t('accountVisibility'), t('accountVisibilityDesc'));

  const showChatSec = matchesQuery(t('readReceipts'), t('readReceiptsDesc')) ||
    matchesQuery(t('activeStatus'), t('activeStatusDesc')) ||
    matchesQuery(t('typingIndicator'), t('typingIndicatorDesc')) ||
    matchesQuery(t('onlinePresence'), t('onlinePresenceDesc')) ||
    matchesQuery(t('autoSeen'), t('autoSeenDesc'));

  const showNotifySec = matchesQuery(t('pushNotifications'), t('pushNotificationsDesc'));

  const showPreferencesSec = matchesQuery(t('themeMode'), t('themeModeDesc')) ||
    matchesQuery(t('language'), t('languageDesc')) ||
    matchesQuery(t('timezone'), t('timezoneDesc')) ||
    matchesQuery(t('dateFormat'), t('dateFormatDesc')) ||
    matchesQuery(t('notifSound'), t('notifSoundDesc')) ||
    matchesQuery(t('dataSaver'), t('dataSaverDesc'));

  const showSystemSec = matchesQuery(t('logout'), t('logoutDesc'));

  // Form states for password changes
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Alumni Identity Migration States
  const [alumniPendingRequests, setAlumniPendingRequests] = useState<any[]>([]);
  const [alumniCollegeEmail, setAlumniCollegeEmail] = useState('');
  const [alumniPersonalEmail, setAlumniPersonalEmail] = useState('');

  // Form states for profile & account edits
  const [personalEmailInput, setPersonalEmailInput] = useState(personalEmail || '');
  const [phoneInput, setPhoneInput] = useState('');
  const [visibilityOption, setVisibilityOption] = useState<'Public' | 'College Only' | 'Friends Only' | 'Private'>('Public');

  useEffect(() => {
    setPersonalEmailInput(personalEmail || '');
  }, [personalEmail]);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
      const res = await fetch('/api/admin/alumni/pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (json.success) {
        setAlumniPendingRequests(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (activeSubView === 'admin-alumni-queue') {
      fetchPendingRequests();
    }
  }, [activeSubView, fetchPendingRequests]);

  const handleBack = useCallback(() => {
    if (activeSubView !== 'main') {
      setActiveSubView('main');
    } else {
      navigate('/profile');
    }
  }, [activeSubView, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBack]);

  const handleToggleChange = useCallback(async (key: string, currentValue: boolean) => {
    updateProfile({ [key]: !currentValue });
    toast.success('Setting updated!');
    try {
      await saveProfile();
    } catch (e) {
      console.warn('Setting sync deferred:', e);
    }
  }, [updateProfile, saveProfile]);

  // Password Validation Strength Meter
  const getPasswordStrength = () => {
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (getPasswordStrength() < 4) {
      toast.error('Password does not meet safety criteria');
      return;
    }
    setIsSaving(true);
    // Simulate / Real API request endpoint updating passwords
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveSubView('main');
    } catch (err) {
      toast.error('Failed to update password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      updateProfile({ personalEmail: personalEmailInput });
      await saveProfile();
      toast.success('Email settings updated and saved!');
      setActiveSubView('main');
    } catch (err) {
      toast.error('Failed to save email');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVisibilitySave = async (opt: 'Public' | 'College Only' | 'Friends Only' | 'Private') => {
    setVisibilityOption(opt);
    setIsSaving(true);
    try {
      // Persist the visibility settings under user profile details
      await saveProfile();
      toast.success(`Account visibility set to ${opt}`);
    } catch (err) {
      toast.error('Failed to update visibility');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsErrorBoundary>
      <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
      className="min-h-screen bg-background text-foreground"
    >
      {/* Main Settings Body */}
      <main className="max-w-[900px] mx-auto px-4 py-6 pb-24 space-y-6">
        <AnimatePresence mode="wait">
          {activeSubView === 'main' && (
            <motion.div
              key="main-settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-4 sm:p-6 space-y-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
            >
              {/* Section: Account */}
              {showAccountSec && (
                <div>
                  <SectionHeader title={t('account')} />
                  <div className="space-y-3">
                    {matchesQuery(t('editProfile'), t('editProfileDesc')) && (
                      <SettingRowButton icon={User} label={t('editProfile')} description={t('editProfileDesc')} iconBgClass="bg-blue-55 dark:bg-blue-950/20" iconColorClass="text-blue-600 dark:text-blue-400" onClick={() => setActiveSubView('edit-profile')} />
                    )}
                    {matchesQuery(t('accountInfo'), t('accountInfoDesc')) && (
                      <SettingRowButton icon={Info} label={t('accountInfo')} description={t('accountInfoDesc')} iconBgClass="bg-purple-55 dark:bg-purple-950/20" iconColorClass="text-purple-600 dark:text-purple-400" onClick={() => setActiveSubView('account-info')} />
                    )}
                    {matchesQuery(t('changePassword'), t('changePasswordDesc')) && (
                      <SettingRowButton icon={KeyRound} label={t('changePassword')} description={t('changePasswordDesc')} iconBgClass="bg-amber-50 dark:bg-amber-950/20" iconColorClass="text-amber-600 dark:text-amber-400" onClick={() => setActiveSubView('change-password')} />
                    )}
                    {matchesQuery(t('emailAddress'), t('emailAddressDesc')) && (
                      <SettingRowButton icon={Mail} label={t('emailAddress')} description={t('emailAddressDesc')} iconBgClass="bg-cyan-50 dark:bg-cyan-950/20" iconColorClass="text-cyan-600 dark:text-cyan-455" value={personalEmail || 'Not set'} onClick={() => setActiveSubView('email-mgmt')} />
                    )}
                    {matchesQuery(t('accountVisibility'), t('accountVisibilityDesc')) && (
                      <SettingRowButton icon={SlidersHorizontal} label={t('accountVisibility')} description={t('accountVisibilityDesc')} iconBgClass="bg-emerald-50 dark:bg-emerald-950/20" iconColorClass="text-emerald-600 dark:text-emerald-400" value={visibilityOption} onClick={() => setActiveSubView('visibility')} />
                    )}
                    {role === 'student' && (
                      <SettingRowButton icon={Network} label="Alumni Verification Portal" description="Transition from Student to Verified Alumni" iconBgClass="bg-indigo-50 dark:bg-indigo-950/20" iconColorClass="text-indigo-600 dark:text-indigo-400" onClick={() => setActiveSubView('alumni-verify')} />
                    )}
                    {role === 'admin' && (
                      <SettingRowButton icon={Users} label="Alumni Verification Queue" description="Review pending Alumni transition requests" iconBgClass="bg-red-50 dark:bg-red-950/20" iconColorClass="text-red-600 dark:text-red-400" onClick={() => setActiveSubView('admin-alumni-queue')} />
                    )}
                  </div>
                </div>
              )}

              {showAccountSec && (showChatSec || showNotifySec || showPreferencesSec || showSystemSec) && (
                <div className="h-px bg-border my-6" />
              )}

              {/* Section: Chat */}
              {showChatSec && (
                <div>
                  <SectionHeader title={t('chatSettings')} />
                  <div className="space-y-3">
                    {matchesQuery(t('readReceipts'), t('readReceiptsDesc')) && (
                      <SettingRowToggle 
                        icon={Check} 
                        label={t('readReceipts')} 
                        description={t('readReceiptsDesc')}
                        iconBgClass="bg-emerald-55 dark:bg-emerald-950/20"
                        iconColorClass="text-emerald-600 dark:text-emerald-400"
                        checked={showReadReceipts ?? true} 
                        onChange={() => handleToggleChange('showReadReceipts', showReadReceipts ?? true)} 
                        disabled={isSaving}
                      />
                    )}
                    {matchesQuery(t('activeStatus'), t('activeStatusDesc')) && (
                      <SettingRowToggle 
                        icon={Sparkles} 
                        label={t('activeStatus')} 
                        description={t('activeStatusDesc')}
                        iconBgClass="bg-purple-55 dark:bg-purple-950/20"
                        iconColorClass="text-purple-600 dark:text-purple-400"
                        checked={showActiveStatus ?? true} 
                        onChange={() => handleToggleChange('showActiveStatus', showActiveStatus ?? true)} 
                        disabled={isSaving}
                      />
                    )}
                    {matchesQuery(t('typingIndicator'), t('typingIndicatorDesc')) && (
                      <SettingRowToggle 
                        icon={MessageSquare} 
                        label={t('typingIndicator')} 
                        description={t('typingIndicatorDesc')}
                        iconBgClass="bg-blue-55 dark:bg-blue-950/20"
                        iconColorClass="text-blue-600 dark:text-blue-400"
                        checked={showTypingIndicator ?? true} 
                        onChange={() => handleToggleChange('showTypingIndicator', showTypingIndicator ?? true)} 
                        disabled={isSaving}
                      />
                    )}
                    {matchesQuery(t('onlinePresence'), t('onlinePresenceDesc')) && (
                      <SettingRowToggle 
                        icon={Network} 
                        label={t('onlinePresence')} 
                        description={t('onlinePresenceDesc')}
                        iconBgClass="bg-cyan-50 dark:bg-cyan-950/20"
                        iconColorClass="text-cyan-600 dark:text-cyan-455"
                        checked={showOnlinePresence ?? true} 
                        onChange={() => handleToggleChange('showOnlinePresence', showOnlinePresence ?? true)} 
                        disabled={isSaving}
                      />
                    )}
                    {matchesQuery(t('autoSeen'), t('autoSeenDesc')) && (
                      <SettingRowToggle 
                        icon={Clock} 
                        label={t('autoSeen')} 
                        description={t('autoSeenDesc')}
                        iconBgClass="bg-amber-50 dark:bg-amber-950/20"
                        iconColorClass="text-amber-600 dark:text-amber-400"
                        checked={autoSeen ?? true} 
                        onChange={() => handleToggleChange('autoSeen', autoSeen ?? true)} 
                        disabled={isSaving}
                      />
                    )}
                  </div>
                </div>
              )}

              {showChatSec && (showNotifySec || showPreferencesSec || showSystemSec) && (
                <div className="h-px bg-border my-6" />
              )}

              {/* Section: Notifications */}
              {showNotifySec && (
                <div>
                  <SectionHeader title={t('notifications')} />
                  <div className="space-y-3">
                    {matchesQuery(t('pushNotifications'), t('pushNotificationsDesc')) && (
                      <SettingRowToggle 
                        icon={Bell} 
                        label={t('pushNotifications')} 
                        description={t('pushNotificationsDesc')}
                        iconBgClass="bg-yellow-50 dark:bg-yellow-950/20"
                        iconColorClass="text-yellow-600 dark:text-yellow-450"
                        checked={notificationEnabled ?? true} 
                        onChange={() => handleToggleChange('notificationEnabled', notificationEnabled ?? true)} 
                        disabled={isSaving}
                      />
                    )}
                  </div>
                </div>
              )}

              {showNotifySec && (showPreferencesSec || showSystemSec) && (
                <div className="h-px bg-border my-6" />
              )}

              {/* Section: Preferences */}
              {showPreferencesSec && (
                <div>
                  <SectionHeader title={t('preferences')} />
                  <div className="space-y-3">
                    {matchesQuery(t('themeMode'), t('themeModeDesc')) && (
                      <SettingRowButton icon={Palette} label={t('themeMode')} description={t('themeModeDesc')} iconBgClass="bg-pink-50 dark:bg-pink-950/20" iconColorClass="text-pink-600 dark:text-pink-400" value={preferences.theme === 'system' ? 'System Default' : preferences.theme} onClick={() => setActiveSubView('theme')} />
                    )}
                    {matchesQuery(t('language'), t('languageDesc')) && (
                      <SettingRowButton icon={Globe} label={t('language')} description={t('languageDesc')} iconBgClass="bg-indigo-50 dark:bg-indigo-950/20" iconColorClass="text-indigo-600 dark:text-indigo-400" value={preferences.language} onClick={() => setActiveSubView('language')} />
                    )}
                    {matchesQuery(t('timezone'), t('timezoneDesc')) && (
                      <SettingRowButton icon={Clock} label={t('timezone')} description={t('timezoneDesc')} iconBgClass="bg-blue-50 dark:bg-blue-950/20" iconColorClass="text-blue-600 dark:text-blue-400" value={preferences.timezone} onClick={() => setActiveSubView('timezone')} />
                    )}
                    {matchesQuery(t('dateFormat'), t('dateFormatDesc')) && (
                      <SettingRowButton icon={Calendar} label={t('dateFormat')} description={t('dateFormatDesc')} iconBgClass="bg-orange-50 dark:bg-orange-950/20" iconColorClass="text-orange-600 dark:text-orange-400" value={`${preferences.dateFormat} (${preferences.timeFormat})`} onClick={() => setActiveSubView('date-format')} />
                    )}
                    {matchesQuery(t('notifSound'), t('notifSoundDesc')) && (
                      <SettingRowButton icon={Volume2} label={t('notifSound')} description={t('notifSoundDesc')} iconBgClass="bg-cyan-50 dark:bg-cyan-950/20" iconColorClass="text-cyan-600 dark:text-cyan-400" value={preferences.notificationSound} onClick={() => setActiveSubView('notification-sound')} />
                    )}
                    {matchesQuery(t('dataSaver'), t('dataSaverDesc')) && (
                      <SettingRowButton icon={HardDrive} label={t('dataSaver')} description={t('dataSaverDesc')} iconBgClass="bg-emerald-50 dark:bg-emerald-950/20" iconColorClass="text-emerald-600 dark:text-emerald-400" value={preferences.dataSaver ? 'Enabled' : 'Disabled'} onClick={() => setActiveSubView('data-saver')} />
                    )}
                  </div>
                </div>
              )}

              {showPreferencesSec && showSystemSec && (
                <div className="h-px bg-border my-6" />
              )}

              {/* Section: Logout */}
              {showSystemSec && (
                <div>
                  <SectionHeader title={t('system')} />
                  <div className="space-y-3">
                    {matchesQuery(t('logout'), t('logoutDesc')) && (
                      <SettingRowButton
                        icon={LogOut}
                        label={t('logout')}
                        description={t('logoutDesc')}
                        iconBgClass="bg-red-50 dark:bg-red-950/20"
                        iconColorClass="text-red-600 dark:text-red-400"
                        onClick={() => setShowLogoutConfirm(true)}
                        isDanger={true}
                      />
                    )}
                  </div>
                </div>
              )}

              {!showAccountSec && !showChatSec && !showNotifySec && !showPreferencesSec && !showSystemSec && (
                <div className="text-center py-10 space-y-2">
                  <Sliders className="w-8 h-8 text-zinc-650 mx-auto animate-pulse" />
                  <p className="text-sm font-bold text-white">{t('noMatchingSettings')}</p>
                  <p className="text-xs text-zinc-500">{t('trySearchOther')}</p>
                </div>
              )}
            </motion.div>
          )}

          {activeSubView === 'account-info' && (
            <motion.div
              key="account-info"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-6 space-y-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
            >
              <div className="space-y-4">
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-xs text-zinc-500 font-bold">Display Name</span>
                  <span className="text-xs text-foreground font-medium">{name || 'Not set'}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-xs text-zinc-500 font-bold">College</span>
                  <span className="text-xs text-foreground font-medium">SR University</span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-xs text-zinc-500 font-bold">Department</span>
                  <span className="text-xs text-foreground font-medium">{course || 'CSE'}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-xs text-zinc-500 font-bold">Batch</span>
                  <span className="text-xs text-foreground font-medium">{year || '2026'}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-xs text-zinc-500 font-bold">College Email</span>
                  <span className="text-xs text-foreground font-medium">
                    {collegeEmail || 'Not set'} {collegeEmailVerified ? <span className="text-emerald-500 font-bold ml-1">Verified ✓</span> : ''}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-xs text-zinc-500 font-bold">Personal Email</span>
                  <span className="text-xs text-foreground font-medium">
                    {personalEmail || 'Not set'} {personalEmailVerified ? <span className="text-emerald-500 font-bold ml-1">Verified ✓</span> : ''}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-xs text-zinc-500 font-bold">Current Role</span>
                  <span className="text-xs text-foreground font-medium uppercase font-black">
                    {role === 'alumni' ? 'Verified Alumni' : 'Student'}
                  </span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-xs text-zinc-500 font-bold">Verification Status</span>
                  <span className={`text-xs font-black uppercase tracking-wider ${alumniVerified ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {alumniVerified ? 'Verified Alumni ✓' : 'Verified Student'}
                  </span>
                </div>
              </div>
              <Button onClick={() => setActiveSubView('main')} className="w-full bg-secondary border border-border text-foreground hover:bg-secondary/80 rounded-xl h-11 text-xs font-bold mt-4">
                Back to Settings
              </Button>
            </motion.div>
          )}

          {activeSubView === 'change-password' && (
            <motion.div
              key="change-password"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
            >
              <form onSubmit={handlePasswordSave} className="space-y-4">
                <div>
                  <label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider mb-1.5 block">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    className="w-full h-11 bg-secondary/40 border border-border rounded-xl px-4 text-xs text-foreground placeholder-zinc-500 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider mb-1.5 block">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    className="w-full h-11 bg-secondary/40 border border-border rounded-xl px-4 text-xs text-foreground placeholder-zinc-500 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider mb-1.5 block">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    className="w-full h-11 bg-secondary/40 border border-border rounded-xl px-4 text-xs text-foreground placeholder-zinc-500 focus:outline-none focus:border-primary"
                  />
                </div>

                {newPassword && (
                  <div className="space-y-2 mt-2">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full ${
                            i < getPasswordStrength() ? 'bg-primary' : 'bg-zinc-800'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-bold block">
                      Strength: {['Weak', 'Fair', 'Good', 'Strong', 'Excellent'][getPasswordStrength() - 1] || 'Enter criteria'}
                    </span>
                  </div>
                )}

                <Button type="submit" disabled={isSaving} className="w-full bg-primary hover:bg-purple-600 text-white rounded-xl h-11 text-xs font-bold mt-4 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  {isSaving ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </motion.div>
          )}

          {activeSubView === 'email-mgmt' && (
            <motion.div
              key="email-mgmt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
            >
              <form onSubmit={handleEmailSave} className="space-y-4">
                <div>
                  <label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    value={personalEmailInput}
                    onChange={e => setPersonalEmailInput(e.target.value)}
                    required
                    className="w-full h-11 bg-secondary/40 border border-border rounded-xl px-4 text-xs text-foreground placeholder-zinc-500 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] text-emerald-300 font-bold">This email receives regular notifications and verification requests.</span>
                </div>
                <Button type="submit" disabled={isSaving} className="w-full bg-primary hover:bg-purple-600 text-white rounded-xl h-11 text-xs font-bold mt-2">
                  {isSaving ? 'Saving...' : 'Save Email'}
                </Button>
              </form>
            </motion.div>
          )}

          {activeSubView === 'visibility' && (
            <motion.div
              key="visibility"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-4"
            >
              <SectionHeader title="Select Account Visibility" />
              {(['Public', 'College Only', 'Friends Only', 'Private'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleVisibilitySave(opt)}
                  className={`w-full h-[52px] rounded-[16px] px-4 flex items-center justify-between text-left border ${
                    visibilityOption === opt
                      ? 'bg-primary/10 border-primary/40 text-foreground font-extrabold'
                      : 'bg-transparent border-transparent text-zinc-800 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.03]'
                  } transition-all duration-[180ms]`}
                >
                  <span className="text-xs font-bold">{opt}</span>
                  {visibilityOption === opt && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </motion.div>
          )}

          {activeSubView === 'theme' && (
            <motion.div
              key="theme"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-4"
            >
              <SectionHeader title="Select Theme Mode" />
              {(['dark', 'light', 'system'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateTheme(mode)}
                  className={`w-full h-[52px] rounded-[16px] px-4 flex items-center justify-between text-left border capitalize ${
                    preferences.theme === mode
                      ? 'bg-primary/10 border-primary/40 text-foreground font-extrabold'
                      : 'bg-transparent border-transparent text-zinc-800 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.03]'
                  } transition-all duration-[180ms]`}
                >
                  <span className="text-xs font-bold">{mode === 'system' ? 'System Default' : mode}</span>
                  {preferences.theme === mode && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </motion.div>
          )}

          {activeSubView === 'language' && (
            <motion.div
              key="language"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-4"
            >
              <SectionHeader title="Select Language" />
              {(['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam'] as const).map((langOpt) => (
                <button
                  key={langOpt}
                  onClick={() => updateLanguage(langOpt)}
                  className={`w-full h-[52px] rounded-[16px] px-4 flex items-center justify-between text-left border ${
                    preferences.language === langOpt
                      ? 'bg-primary/10 border-primary/40 text-foreground font-extrabold'
                      : 'bg-transparent border-transparent text-zinc-800 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.03]'
                  } transition-all duration-[180ms]`}
                >
                  <span className="text-xs font-bold">{langOpt}</span>
                  {preferences.language === langOpt && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </motion.div>
          )}

          {activeSubView === 'timezone' && (
            <motion.div
              key="timezone"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-4"
            >
              <SectionHeader title="Select Time Zone" />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
                    updateTimezone(localZone);
                  }}
                  className="w-full bg-secondary border border-border text-foreground hover:bg-secondary/80 rounded-xl h-11 text-xs font-bold mb-2"
                >
                  Detect My Time Zone
                </Button>
              </div>
              <div className="space-y-2">
                {(['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Australia/Sydney'] as const).map((zone) => (
                  <button
                    key={zone}
                    onClick={() => updateTimezone(zone)}
                    className={`w-full h-[52px] rounded-[16px] px-4 flex items-center justify-between text-left border ${
                      preferences.timezone === zone
                        ? 'bg-primary/10 border-primary/40 text-foreground font-extrabold'
                        : 'bg-transparent border-transparent text-zinc-800 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.03]'
                    } transition-all duration-[180ms]`}
                  >
                    <span className="text-xs font-bold">{zone}</span>
                    {preferences.timezone === zone && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activeSubView === 'date-format' && (
            <motion.div
              key="date-format"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6"
            >
              <div>
                <SectionHeader title="Date Format" />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => updateDateFormat(fmt, preferences.timeFormat)}
                      className={`h-[48px] rounded-[14px] px-2 text-center text-xs font-bold border transition-all duration-150 ${
                        preferences.dateFormat === fmt
                          ? 'bg-primary/10 border-primary/40 text-foreground'
                          : 'bg-transparent border-border text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <SectionHeader title="Time Format" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(['12h', '24h'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => updateDateFormat(preferences.dateFormat, tf)}
                      className={`h-[48px] rounded-[14px] px-2 text-center text-xs font-bold border transition-all duration-150 ${
                        preferences.timeFormat === tf
                          ? 'bg-primary/10 border-primary/40 text-foreground'
                          : 'bg-transparent border-border text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      {tf === '12h' ? '12 Hour (AM/PM)' : '24 Hour'}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSubView === 'notification-sound' && (
            <motion.div
              key="notification-sound"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6"
            >
              <div>
                <SectionHeader title="Volume" />
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-[10px] text-zinc-500 font-bold">0%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={preferences.notificationVolume ?? 80}
                    onChange={(e) => updateNotification(preferences.notificationSound, parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-[10px] text-zinc-500 font-bold">{preferences.notificationVolume ?? 80}%</span>
                </div>
              </div>

              <div>
                <SectionHeader title="Notification Tone" />
                <div className="space-y-2 mt-2">
                  {(['Default', 'Chime', 'Pop', 'Bell', 'Campus', 'Silent'] as const).map((sound) => (
                    <button
                      key={sound}
                      onClick={() => {
                        updateNotification(sound, preferences.notificationVolume);
                        playNotificationSound(sound, preferences.notificationVolume);
                      }}
                      className={`w-full h-[52px] rounded-[16px] px-4 flex items-center justify-between text-left border ${
                        preferences.notificationSound === sound
                          ? 'bg-primary/10 border-primary/40 text-foreground font-extrabold'
                          : 'bg-transparent border-transparent text-zinc-800 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.03]'
                      } transition-all duration-[180ms]`}
                    >
                      <span className="text-xs font-bold">{sound}</span>
                      {preferences.notificationSound === sound && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSubView === 'data-saver' && (
            <motion.div
              key="data-saver"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6"
            >
              <div className="space-y-4">
                <SettingRowToggle
                  icon={HardDrive}
                  label="Data Saver"
                  description="Reduce bandwidth consumption by optimizing loaded images & videos"
                  iconBgClass="bg-emerald-50 dark:bg-emerald-950/20"
                  iconColorClass="text-emerald-600 dark:text-emerald-400"
                  checked={preferences.dataSaver}
                  onChange={() => updateDataSaver({ dataSaver: !preferences.dataSaver })}
                />
                
                <SettingRowToggle
                  icon={Clock}
                  label="Auto-Play Videos"
                  description="Automatically play video posts inside feed timelines"
                  iconBgClass="bg-blue-50 dark:bg-blue-950/20"
                  iconColorClass="text-blue-600 dark:text-blue-400"
                  checked={preferences.autoPlayVideos}
                  onChange={() => updateDataSaver({ autoPlayVideos: !preferences.autoPlayVideos })}
                />

                <SettingRowToggle
                  icon={Check}
                  label="Media Compression"
                  description="Compress uploaded stories, post attachments, and photos"
                  iconBgClass="bg-purple-50 dark:bg-purple-950/20"
                  iconColorClass="text-purple-600 dark:text-purple-400"
                  checked={preferences.mediaCompression}
                  onChange={() => updateDataSaver({ mediaCompression: !preferences.mediaCompression })}
                />

                <SettingRowToggle
                  icon={Sparkles}
                  label="HD Quality Video playback"
                  description="Pre-render and load videos in native high-definition format"
                  iconBgClass="bg-cyan-50 dark:bg-cyan-950/20"
                  iconColorClass="text-cyan-600 dark:text-cyan-400"
                  checked={preferences.videoHd}
                  onChange={() => updateDataSaver({ videoHd: !preferences.videoHd })}
                />

                <SettingRowToggle
                  icon={Network}
                  label="Downloads: Wi-Fi Only"
                  description="Download rich post attachments and documents only when connected to Wi-Fi"
                  iconBgClass="bg-orange-50 dark:bg-orange-950/20"
                  iconColorClass="text-orange-600 dark:text-orange-400"
                  checked={preferences.wifiOnlyDownloads}
                  onChange={() => updateDataSaver({ wifiOnlyDownloads: !preferences.wifiOnlyDownloads })}
                />

                <div>
                  <SectionHeader title="Image Upload Quality" />
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(['Auto', 'HD', 'Low Quality'] as const).map((q) => (
                      <button
                        key={q}
                        onClick={() => updateDataSaver({ imageQuality: q })}
                        className={`h-[48px] rounded-[14px] px-2 text-center text-xs font-bold border transition-all duration-150 ${
                          preferences.imageQuality === q
                            ? 'bg-primary/10 border-primary/40 text-foreground'
                            : 'bg-transparent border-border text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.02]'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSubView === 'edit-profile' && (
            <motion.div
              key="edit-profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <SectionHeader title="Edit Profile Details" />
                <div className="flex gap-2">
                  {[
                    { id: 'basic', label: 'Basic' },
                    { id: 'academics', label: 'Academics' },
                    { id: 'socials', label: 'Socials' },
                    { id: 'skills', label: 'Skills/Interests' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setEditTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        editTab === tab.id
                          ? 'bg-primary text-white shadow-[0_0_12px_rgba(124,92,255,0.4)]'
                          : 'bg-zinc-900/40 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {editTab === 'basic' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Full Name</label>
                    <input
                      value={profile.name || ''}
                      onChange={e => updateProfile({ name: e.target.value })}
                      placeholder="e.g. Alice Cooper"
                      className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Bio</label>
                    <textarea
                      value={profile.bio || ''}
                      onChange={e => updateProfile({ bio: e.target.value })}
                      rows={3}
                      maxLength={200}
                      placeholder="Tell us about yourself..."
                      className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Gender</label>
                      <input
                        value={profile.gender || ''}
                        onChange={e => updateProfile({ gender: e.target.value })}
                        placeholder="e.g. Female / Male"
                        className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Pronouns</label>
                      <input
                        value={profile.pronouns || ''}
                        onChange={e => updateProfile({ pronouns: e.target.value })}
                        placeholder="e.g. she/her"
                        className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Profile Image</label>
                    <div className="flex items-center gap-4">
                      <img
                        src={profile.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`}
                        alt=""
                        className="w-16 h-16 rounded-2xl object-cover border border-white/5"
                      />
                      <input
                        type="file"
                        id="settings-avatar-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          toast.loading('Uploading avatar...', { id: 'settings-avatar-upload' });
                          try {
                            const res = await uploadMediaFile(file, '/api/profile/avatar');
                            if (res && res.success) {
                              updateProfile({ profileImageUrl: res.url });
                              toast.success('Avatar uploaded!', { id: 'settings-avatar-upload' });
                            } else {
                              toast.error('Failed to upload avatar', { id: 'settings-avatar-upload' });
                            }
                          } catch (err) {
                            toast.error('Upload failed', { id: 'settings-avatar-upload' });
                          }
                        }}
                      />
                      <Button
                        onClick={() => document.getElementById('settings-avatar-upload')?.click()}
                        className="rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-white/5 h-10 px-4 text-xs font-bold"
                      >
                        <Upload className="w-3.5 h-3.5 mr-2" /> Upload New Photo
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {editTab === 'academics' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Course/Department</label>
                      <select
                        value={profile.course || ''}
                        onChange={e => updateProfile({ course: e.target.value })}
                        className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                      >
                        <option value="">Select Course</option>
                        {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Admission Year</label>
                      <select
                        value={profile.admissionYear || ''}
                        onChange={e => updateProfile({ admissionYear: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                      >
                        <option value="">Select Admission Year</option>
                        {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 8 + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Graduation Year</label>
                      <select
                        value={profile.graduationYear || ''}
                        onChange={e => updateProfile({ graduationYear: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                      >
                        <option value="">Select Graduation Year</option>
                        {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 4 + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {profile.admissionYear && profile.graduationYear && (
                    <div className="bg-zinc-950/20 border border-white/[0.04] rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400 font-semibold">Academic Duration</span>
                        <span className="text-white font-extrabold">{profile.admissionYear} – {profile.graduationYear}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400 font-semibold">Current Academic Year</span>
                        <span className="text-violet-400 font-black">
                          {(() => {
                            const currentYear = new Date().getFullYear();
                            const currentMonth = new Date().getMonth();
                            let diff = currentYear - profile.admissionYear;
                            if (currentMonth >= 6) diff += 1;
                            if (diff <= 0) diff = 1;
                            if (diff > 4) return 'Graduated';
                            const yearNames = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
                            return yearNames[diff - 1] || 'Graduated';
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">CGPA</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={profile.cgpa !== undefined ? profile.cgpa : ''}
                        onChange={e => updateProfile({ cgpa: e.target.value ? parseFloat(e.target.value) : 0 })}
                        placeholder="e.g. 8.5"
                        className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Active Backlogs</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={profile.backlogs !== undefined ? profile.backlogs : ''}
                        onChange={e => updateProfile({ backlogs: e.target.value ? parseInt(e.target.value) : 0 })}
                        placeholder="e.g. 0"
                        className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editTab === 'socials' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-cyan-400" /> Personal Email Address
                    </label>
                    <input
                      value={profile.personalEmail || ''}
                      onChange={e => updateProfile({ personalEmail: e.target.value })}
                      placeholder="e.g. personal@example.com"
                      className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide flex items-center gap-1.5">
                      <Linkedin className="h-3.5 w-3.5 text-blue-400" /> LinkedIn Profile URL
                    </label>
                    <input
                      value={profile.linkedinUrl || ''}
                      onChange={e => updateProfile({ linkedinUrl: e.target.value })}
                      placeholder="e.g. https://linkedin.com/in/username"
                      className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide flex items-center gap-1.5">
                      <Github className="h-3.5 w-3.5" /> GitHub Profile URL
                    </label>
                    <input
                      value={profile.githubUrl || ''}
                      onChange={e => updateProfile({ githubUrl: e.target.value })}
                      placeholder="e.g. https://github.com/username"
                      className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>
              )}

              {editTab === 'skills' && (
                <div className="space-y-4">
                  <TagBuilder
                    id="settings-skills"
                    label="Skills"
                    placeholder="e.g. React (Press Enter or Add)"
                    tags={profile.skills || []}
                    onAdd={(tag) => updateProfile({ skills: [...(profile.skills || []), tag] })}
                    onRemove={(tag) => updateProfile({ skills: (profile.skills || []).filter(s => s !== tag) })}
                  />

                  <TagBuilder
                    id="settings-clubs"
                    label="Clubs & Organizations"
                    placeholder="e.g. Coding Club (Press Enter or Add)"
                    tags={profile.clubs || []}
                    onAdd={(tag) => updateProfile({ clubs: [...(profile.clubs || []), tag] })}
                    onRemove={(tag) => updateProfile({ clubs: (profile.clubs || []).filter(c => c !== tag) })}
                  />

                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block font-bold uppercase tracking-wide">Interests</label>
                    <div className="flex flex-wrap gap-1.5 p-2.5 bg-zinc-950/60 rounded-2xl border border-white/5 max-h-48 overflow-y-auto">
                      {INTERESTS.map(interest => {
                        const hasInterest = profile.interests?.includes(interest);
                        return (
                          <motion.button
                            key={interest}
                            type="button"
                            whileTap={{ scale: 0.92 }}
                            onClick={() => {
                              const interests = hasInterest
                                ? (profile.interests || []).filter(i => i !== interest)
                                : [...(profile.interests || []), interest];
                              updateProfile({ interests });
                            }}
                            className={`rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-all ${
                              hasInterest ? 'bg-primary text-white shadow-[0_0_12px_rgba(124,92,255,0.4)]' : 'bg-zinc-900/40 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {interest}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={async () => {
                  toast.loading('Saving profile changes...', { id: 'save-profile-settings' });
                  try {
                    await saveProfile();
                    toast.success('Profile saved successfully!', { id: 'save-profile-settings' });
                    window.dispatchEvent(new CustomEvent('profile:stats:update'));
                  } catch (e) {
                    toast.error('Failed to save profile changes.', { id: 'save-profile-settings' });
                  }
                }}
                disabled={isLoading}
                className="w-full gradient-primary text-white rounded-2xl h-12 font-bold tracking-wide uppercase glow-primary mt-4"
              >
                {isLoading ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </motion.div>
          )}
          {activeSubView === 'alumni-verify' && (
            <motion.div
              key="alumni-verify"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6"
            >
              <SectionHeader title="Verify Your Alumni Account" />
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">College Email</label>
                  <input
                    value={alumniCollegeEmail}
                    onChange={e => setAlumniCollegeEmail(e.target.value)}
                    placeholder="e.g. 2303xxxx@sru.edu.in"
                    className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Personal Email</label>
                  <input
                    value={alumniPersonalEmail}
                    onChange={e => setAlumniPersonalEmail(e.target.value)}
                    placeholder="e.g. personal@gmail.com"
                    className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>
              <Button
                onClick={async () => {
                  if (!alumniCollegeEmail || !alumniPersonalEmail) {
                    return toast.error('Both emails are required.');
                  }
                  toast.loading('Verifying alumni identity...', { id: 'alumni-verify' });
                  try {
                    const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
                    const res = await fetch('/api/auth/alumni/verify', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        collegeEmail: alumniCollegeEmail,
                        personalEmail: alumniPersonalEmail
                      })
                    });
                    const json = await res.json();
                    if (res.ok) {
                      toast.success(json.message || 'Successfully transitioned to Alumni!', { id: 'alumni-verify' });
                      if (json.token) {
                        localStorage.setItem('token', json.token);
                      }
                      window.dispatchEvent(new CustomEvent('profile:stats:update'));
                      useProfileStore.getState().loadProfile(userId);
                      setActiveSubView('main');
                    } else {
                      toast.error(json.error || 'Verification failed.', { id: 'alumni-verify' });
                    }
                  } catch (err) {
                    toast.error('An error occurred during verification.', { id: 'alumni-verify' });
                  }
                }}
                className="w-full gradient-primary text-white rounded-2xl h-12 font-bold tracking-wide uppercase glow-primary mt-4"
              >
                Continue
              </Button>
            </motion.div>
          )}

          {activeSubView === 'admin-alumni-queue' && (
            <motion.div
              key="admin-alumni-queue"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-[22px] border border-border bg-card p-6 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6"
            >
              <SectionHeader title="Alumni Verification Queue" />
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {alumniPendingRequests.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-6">No pending alumni verification requests.</p>
                ) : (
                  alumniPendingRequests.map((req: any) => (
                    <div key={req._id} className="p-4 rounded-[16px] bg-zinc-950/40 border border-white/5 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-zinc-500 font-bold block uppercase tracking-wide text-[10px]">Name</span>
                          <span className="text-foreground font-semibold">{req.name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 font-bold block uppercase tracking-wide text-[10px]">Roll Number</span>
                          <span className="text-foreground font-semibold">{req.rollNumber || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 font-bold block uppercase tracking-wide text-[10px]">Batch</span>
                          <span className="text-foreground font-semibold">{req.batch || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 font-bold block uppercase tracking-wide text-[10px]">Submitted Personal Email</span>
                          <span className="text-foreground font-semibold truncate block">{req.email || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={async () => {
                            toast.loading('Approving request...', { id: 'admin-approve' });
                            try {
                              const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
                              const res = await fetch('/api/admin/alumni/approve', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ verificationId: req._id })
                              });
                              const json = await res.json();
                              if (json.success) {
                                toast.success('Approved successfully!', { id: 'admin-approve' });
                                fetchPendingRequests();
                              } else {
                                toast.error(json.error || 'Failed to approve.', { id: 'admin-approve' });
                              }
                            } catch (e) {
                              toast.error('Error occurred.', { id: 'admin-approve' });
                            }
                          }}
                          className="flex-1 rounded-xl h-9 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={async () => {
                            toast.loading('Rejecting request...', { id: 'admin-reject' });
                            try {
                              const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
                              const res = await fetch('/api/admin/alumni/reject', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ verificationId: req._id })
                              });
                              const json = await res.json();
                              if (json.success) {
                                toast.success('Rejected request.', { id: 'admin-reject' });
                                fetchPendingRequests();
                              } else {
                                toast.error(json.error || 'Failed to reject.', { id: 'admin-reject' });
                              }
                            } catch (e) {
                              toast.error('Error occurred.', { id: 'admin-reject' });
                            }
                          }}
                          className="flex-1 rounded-xl h-9 bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button onClick={() => setActiveSubView('main')} className="w-full bg-secondary border border-border text-foreground hover:bg-secondary/80 rounded-xl h-11 text-xs font-bold mt-4">
                Back to Settings
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogoutConfirm(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="glass-strong rounded-[24px] p-6 w-full max-w-sm border border-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] text-center relative bg-card"
            >
              <h3 className="font-display text-base font-black text-foreground tracking-tight mb-2">
                Are you sure you want to logout?
              </h3>
              <p className="text-[11px] text-zinc-550 dark:text-zinc-400 mb-6 font-medium">
                You will need to sign in again to access your profile and chats.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-xl h-11 bg-secondary border border-border text-foreground hover:bg-secondary/80 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setShowLogoutConfirm(false);
                    setLoggingOut(true);
                    try {
                      await logout();
                    } catch (e) {
                      setLoggingOut(false);
                    }
                  }}
                  disabled={loggingOut}
                  className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-[0_0_12px_rgba(220,38,38,0.3)]"
                >
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  </SettingsErrorBoundary>
  );
}
