import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { alumniProfileService } from '@/services/alumniService';
import { useProfileViewerStore } from '@/store/profileViewerStore';
import { BottomTabBar } from '@/components/BottomTabBar';
import { Button } from '@/components/ui/button';
import { INTERESTS, COURSES, YEARS } from '@/data/constants';
import { 
  LogOut, 
  Shield, 
  UserX, 
  ChevronRight, 
  Edit2, 
  Camera, 
  BadgeCheck, 
  HelpCircle, 
  Eye, 
  Sparkles, 
  Check, 
  X, 
  Linkedin, 
  Github, 
  Award, 
  Briefcase, 
  Target, 
  Trophy, 
  GraduationCap, 
  Mail, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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
      <label className="text-xs text-muted-foreground mb-1.5 block font-medium">{label}</label>
      <div className="flex gap-2">
        <input
          id={id}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-secondary/80 rounded-2xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
        />
        <Button onClick={handleAddClick} variant="outline" className="rounded-2xl border-white/[0.08] hover:bg-secondary h-11 px-4 text-xs font-semibold">
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
                className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
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

export default function ProfilePage() {
  const navigate = useNavigate();
  const profile = useProfileStore(s => s.profile);
  const updateProfile = useProfileStore(s => s.updateProfile);
  const saveProfile = useProfileStore(s => s.saveProfile);
  const isLoading = useProfileStore(s => s.isLoading);
  const uid = useAuthStore(s => s.uid);
  const email = useAuthStore(s => s.email);
  const logout = useAuthStore(s => s.logout);
  const viewers = useProfileViewerStore(s => s.viewers);
  const viewersLoading = useProfileViewerStore(s => s.isLoading);
  const fetchViewers = useProfileViewerStore(s => s.fetchViewers);
  const loadProfile = useProfileStore(s => s.loadProfile);

  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState<'basic' | 'social' | 'skills' | 'career'>('basic');
  
  const [showBlock, setShowBlock] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savedReferrals, setSavedReferrals] = useState<any[]>([]);

  // Block & Report variables
  const [modalTab, setModalTab] = useState<'block' | 'report'>('block');
  const [blockSearch, setBlockSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [blockedUsersList, setBlockedUsersList] = useState<any[]>([]);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDescription, setReportDescription] = useState('');
  const [selectedReportUser, setSelectedReportUser] = useState<any>(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  const loadSavedReferrals = async () => {
    try {
      if (uid) {
        const list = await alumniProfileService.getStudentReferrals({ saved: true, userId: uid });
        setSavedReferrals(list);
      }
    } catch (err) {
      console.error('Failed to load saved referrals:', err);
    }
  };

  // Sync profile from backend on mount
  useEffect(() => {
    if (uid) {
      loadProfile(uid);
      loadSavedReferrals();
    }
  }, [uid, loadProfile]);

  // Fetch profile viewers on mount
  useEffect(() => {
    fetchViewers(10);
  }, [fetchViewers]);

  // Handle ESC key to close Block Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowBlock(false);
      }
    };
    if (showBlock) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showBlock]);

  const handleSave = async () => {
    await saveProfile();
    setEditing(false);
    toast.success('Profile saved successfully!');
  };

  // User Search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (blockSearch.trim()) {
        setSearchLoading(true);
        try {
          const res = await fetch(`http://localhost:5000/api/users/search?q=${encodeURIComponent(blockSearch)}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          const json = await res.json();
          if (json.success) {
            setSearchResults(json.data);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [blockSearch]);

  // Fetch Blocked users list
  const fetchBlockedUsers = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/privacy-settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const json = await res.json();
      if (json.success && json.privacySettings) {
        setBlockedUsersList(json.privacySettings.blockedUsers || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (showBlock) {
      fetchBlockedUsers();
    }
  }, [showBlock]);

  const handleBlockUser = async (userIdToBlock: string) => {
    try {
      const res = await fetch('http://localhost:5000/api/users/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userIdToBlock })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('User blocked successfully');
        fetchBlockedUsers();
        setBlockSearch('');
      } else {
        toast.error(json.error || 'Failed to block user');
      }
    } catch (e) {
      toast.error('Failed to block user');
    }
  };

  const handleUnblockUser = async (userIdToUnblock: string) => {
    try {
      const res = await fetch('http://localhost:5000/api/users/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userIdToUnblock })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('User unblocked successfully');
        fetchBlockedUsers();
      } else {
        toast.error(json.error || 'Failed to unblock user');
      }
    } catch (e) {
      toast.error('Failed to unblock user');
    }
  };

  const handleSendReport = async () => {
    if (!selectedReportUser) {
      toast.error('Please select a user to report');
      return;
    }
    setSubmittingReport(true);
    try {
      const res = await fetch('http://localhost:5000/api/users/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reportedUserId: selectedReportUser.userId,
          type: reportReason,
          reason: reportDescription
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Report submitted successfully');
        setSelectedReportUser(null);
        setReportDescription('');
        setShowBlock(false);
      } else {
        toast.error(json.error || 'Failed to submit report');
      }
    } catch (e) {
      toast.error('Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  const isVerified = !!email;

  // Real-Time Profile Strength Items Configuration
  const checkItems = useMemo(() => {
    return [
      { id: 'photos', name: 'Profile Picture', checked: !!(profile.photos && profile.photos.length > 0 && profile.photos[0]), actionText: 'Add Profile Picture', tab: 'basic' as const },
      { id: 'name', name: 'Full Name', checked: !!(profile.name && profile.name.trim() !== ''), actionText: 'Add Full Name', tab: 'basic' as const },
      { id: 'bio', name: 'Bio/About', checked: !!(profile.bio && profile.bio.trim() !== ''), actionText: 'Add Bio/About', tab: 'basic' as const },
      { id: 'course', name: 'Department', checked: !!(profile.course && profile.course.trim() !== ''), actionText: 'Add Department / Course', tab: 'basic' as const },
      { id: 'year', name: 'Batch', checked: !!(profile.year && profile.year.trim() !== ''), actionText: 'Add Batch / Year', tab: 'basic' as const },
      { id: 'personalEmail', name: 'Personal Email', checked: !!(profile.personalEmail && profile.personalEmail.trim() !== ''), actionText: 'Add Personal Email', tab: 'basic' as const },
      { id: 'linkedinUrl', name: 'LinkedIn Profile', checked: !!(profile.linkedinUrl && profile.linkedinUrl.trim() !== ''), actionText: 'Add LinkedIn Profile', tab: 'social' as const },
      { id: 'githubUrl', name: 'GitHub Profile', checked: !!(profile.githubUrl && profile.githubUrl.trim() !== ''), actionText: 'Add GitHub Profile', tab: 'social' as const },
      { id: 'skills', name: 'Skills', checked: !!(profile.skills && profile.skills.length > 0), actionText: 'Add Skills', tab: 'skills' as const },
      { id: 'interests', name: 'Interests', checked: !!(profile.interests && profile.interests.length > 0), actionText: 'Add Interests', tab: 'skills' as const },
      { id: 'clubs', name: 'Clubs & Orgs', checked: !!(profile.clubs && profile.clubs.length > 0), actionText: 'Add Clubs & Orgs', tab: 'skills' as const },
      { id: 'projects', name: 'Projects', checked: !!(profile.projects && profile.projects.length > 0), actionText: 'Add Projects', tab: 'career' as const },
      { id: 'achievements', name: 'Achievements', checked: !!(profile.achievements && profile.achievements.length > 0), actionText: 'Add Achievements', tab: 'career' as const },
      { id: 'careerGoals', name: 'Career Goals', checked: !!(profile.careerGoals && profile.careerGoals.trim() !== ''), actionText: 'Add Career Goals', tab: 'career' as const },
    ];
  }, [profile]);

  const completedCount = useMemo(() => checkItems.filter(item => item.checked).length, [checkItems]);
  const totalCount = checkItems.length;
  const profileCompletion = useMemo(() => Math.round((completedCount / totalCount) * 100), [completedCount, totalCount]);

  const levelInfo = useMemo(() => {
    if (profileCompletion <= 30) {
      return { name: 'Beginner Profile', color: 'from-rose-500 to-orange-500', glow: 'shadow-rose-500/20', textColor: 'text-orange-400' };
    }
    if (profileCompletion <= 60) {
      return { name: 'Growing Profile', color: 'from-amber-500 to-yellow-500', glow: 'shadow-amber-500/20', textColor: 'text-amber-400' };
    }
    if (profileCompletion <= 85) {
      return { name: 'Strong Profile', color: 'from-indigo-500 to-purple-500', glow: 'shadow-indigo-500/20', textColor: 'text-indigo-400' };
    }
    if (profileCompletion <= 99) {
      return { name: 'Outstanding Profile', color: 'from-purple-500 to-fuchsia-500', glow: 'shadow-purple-500/20', textColor: 'text-fuchsia-400' };
    }
    return { name: 'Complete Profile ✓', color: 'from-emerald-500 to-teal-500', glow: 'shadow-emerald-500/20', textColor: 'text-emerald-400' };
  }, [profileCompletion]);

  const missingItems = useMemo(() => checkItems.filter(item => !item.checked), [checkItems]);

  const handleMissingItemClick = (tabName: 'basic' | 'social' | 'skills' | 'career', fieldId: string) => {
    setEditing(true);
    setEditTab(tabName);
    setTimeout(() => {
      const el = document.getElementById(`field-${fieldId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 150);
  };

  const progressCircleCircumference = 2 * Math.PI * 40; // 251.3
  const strokeDashoffset = progressCircleCircumference - (progressCircleCircumference * profileCompletion) / 100;

  return (
    <div className="min-h-screen bg-background pb-20 page-transition">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-foreground">Profile</h1>
        <motion.button 
          whileTap={{ scale: 0.9 }} 
          onClick={() => setEditing(!editing)} 
          className="p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
          title={editing ? "View Profile" : "Edit Profile"}
        >
          <Edit2 className={`h-5 w-5 transition-colors ${editing ? 'text-primary' : 'text-muted-foreground'}`} />
        </motion.button>
      </motion.div>

      <div className="px-5">
        {/* Avatar & Name Panel */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-5">
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl border-2 border-primary/30 overflow-hidden bg-secondary/30">
              <img
                src={profile.photos[0] || 'https://api.dicebear.com/7.x/avataaars/svg?seed=me'}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <button 
              onClick={() => document.getElementById('avatar-upload')?.click()}
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg gradient-primary flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-transform"
            >
              <Camera className="h-3.5 w-3.5 text-primary-foreground" />
            </button>
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const result = reader.result as string;
                  const photos = profile.photos.length > 0 ? [result, ...profile.photos.slice(1)] : [result];
                  updateProfile({ photos });
                  toast.success('Avatar image updated. Save changes to store permanently!');
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-display text-lg font-bold text-foreground truncate">{profile.name || 'Set Name'}</h2>
              {isVerified && <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />}
            </div>
            {profile.course && <p className="text-xs text-primary font-medium truncate">{profile.course}{profile.year ? ` · ${profile.year}` : ''}</p>}
            {email && <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1"><Mail className="h-3 w-3" /> {email}</p>}
            
            {/* Social profiles row */}
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.linkedinUrl && (
                <a 
                  href={profile.linkedinUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-semibold text-blue-400 hover:bg-blue-500/15 transition-colors"
                >
                  <Linkedin className="w-3 h-3" /> LinkedIn
                </a>
              )}
              {profile.githubUrl && (
                <a 
                  href={profile.githubUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-foreground/10 border border-foreground/20 text-[10px] font-semibold text-foreground hover:bg-foreground/15 transition-colors"
                >
                  <Github className="w-3 h-3" /> GitHub
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* Profile Strength Card */}
        <div className="glass-card p-5 mb-5 border border-white/[0.08] bg-slate-900/40 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Circle Progress ring */}
            <div className="relative h-24 w-24 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  className="stroke-muted-foreground/10"
                  strokeWidth="6"
                  fill="transparent"
                />
                <motion.circle
                  cx="48"
                  cy="48"
                  r="40"
                  className="stroke-primary"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={progressCircleCircumference}
                  initial={{ strokeDashoffset: progressCircleCircumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  strokeLinecap="round"
                  style={{
                    stroke: `url(#progressGradient-${profileCompletion})`
                  }}
                />
                <defs>
                  <linearGradient id={`progressGradient-${profileCompletion}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    {profileCompletion <= 30 ? (
                      <>
                        <stop offset="0%" stopColor="#f43f5e" />
                        <stop offset="100%" stopColor="#f97316" />
                      </>
                    ) : profileCompletion <= 60 ? (
                      <>
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#eab308" />
                      </>
                    ) : profileCompletion <= 85 ? (
                      <>
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </>
                    ) : profileCompletion <= 99 ? (
                      <>
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#d946ef" />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </>
                    )}
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-display font-extrabold text-foreground">{profileCompletion}%</span>
                <span className="text-[7px] text-muted-foreground uppercase tracking-widest font-extrabold">Strength</span>
              </div>
            </div>

            {/* Profile Level details */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <span className="text-sm font-bold text-foreground">Profile Strength</span>
                <span className={`inline-block mx-auto sm:mx-0 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r ${levelInfo.color} text-white shadow-sm ${levelInfo.glow}`}>
                  {levelInfo.name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {profileCompletion === 100 ? (
                  "Your profile is fully completed! Enjoy maximum visibility and credibility across the Campus Connect ecosystem."
                ) : (
                  `Complete ${missingItems.length} more section${missingItems.length > 1 ? 's' : ''} to strengthen your profile and improve visibility across Campus Connect.`
                )}
              </p>
            </div>
          </div>

          {/* Missing Suggestions */}
          {missingItems.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Improve Your Profile
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {missingItems.slice(0, 4).map(item => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleMissingItemClick(item.tab, item.id)}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-secondary/30 hover:bg-secondary/60 border border-white/[0.04] hover:border-primary/20 transition-all text-left group"
                  >
                    <span className="text-xs text-foreground font-medium group-hover:text-primary transition-colors flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/40 group-hover:bg-primary" />
                      {item.actionText}
                    </span>
                    <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors font-bold">+</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl"
            >
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  Complete Profile ✓
                </p>
                <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                  Congratulations! Your profile is 100% complete and fully verified. You are completely optimized for discovery, referrals, and networking.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Profile viewers */}
        <div className="glass-card p-4 mb-5 border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-primary" />
              Who viewed your profile
            </p>
          </div>
          {viewersLoading ? (
            <p className="text-[11px] text-muted-foreground">Loading...</p>
          ) : viewers && viewers.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {viewers.map((viewer) => (
                <motion.div
                  key={viewer._id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                  <img
                    src={viewer.viewerId?.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewer.viewerId?.email}`}
                    alt={viewer.viewerId?.name}
                    className="h-9 w-9 rounded-full border border-primary/20 object-cover"
                    title={viewer.viewerId?.name}
                  />
                  <span className="text-[9px] text-muted-foreground text-center truncate max-w-[50px]">{viewer.viewerId?.name?.split(' ')[0]}</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">No one has viewed your profile yet</p>
          )}
        </div>

        {/* Animate edit form vs view details */}
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.div 
              key="edit" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="space-y-4"
            >
              {/* Tabs list */}
              <div className="flex gap-2 border-b border-border/15 pb-2 mb-4 overflow-x-auto hide-scrollbar flex-shrink-0">
                {[
                  { id: 'basic', label: 'Basic Info' },
                  { id: 'social', label: 'Social & Links' },
                  { id: 'skills', label: 'Skills & Clubs' },
                  { id: 'career', label: 'Career & Projects' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEditTab(t.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      editTab === t.id ? 'gradient-primary text-primary-foreground glow-primary' : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Edit Basic Info Tab */}
              {editTab === 'basic' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Full Name</label>
                    <input 
                      id="field-name"
                      value={profile.name || ''} 
                      onChange={e => updateProfile({ name: e.target.value })} 
                      placeholder="e.g. Alice Cooper"
                      className="w-full bg-secondary/80 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Personal Email</label>
                    <input 
                      id="field-personalEmail"
                      value={profile.personalEmail || ''} 
                      onChange={e => updateProfile({ personalEmail: e.target.value })} 
                      placeholder="e.g. alice@example.com"
                      className="w-full bg-secondary/80 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Department</label>
                      <select 
                        id="field-course"
                        value={profile.course || ''} 
                        onChange={e => updateProfile({ course: e.target.value })} 
                        className="w-full bg-secondary/80 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow appearance-none"
                      >
                        <option value="">Select Course</option>
                        {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Batch</label>
                      <select 
                        id="field-year"
                        value={profile.year || ''} 
                        onChange={e => updateProfile({ year: e.target.value })} 
                        className="w-full bg-secondary/80 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow appearance-none"
                      >
                        <option value="">Select Year</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Academic Year</label>
                    <select 
                      id="field-academicYear"
                      value={profile.academicYear || ''} 
                      onChange={e => updateProfile({ academicYear: e.target.value })} 
                      className="w-full bg-secondary/80 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow appearance-none"
                    >
                      <option value="">Select Academic Year</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block font-medium">CGPA</label>
                      <input 
                        id="field-cgpa"
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={profile.cgpa !== undefined ? profile.cgpa : ''} 
                        onChange={e => updateProfile({ cgpa: e.target.value ? parseFloat(e.target.value) : 0 })} 
                        placeholder="e.g. 8.5"
                        className="w-full bg-secondary/80 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Active Backlogs</label>
                      <input 
                        id="field-backlogs"
                        type="number"
                        min="0"
                        max="50"
                        value={profile.backlogs !== undefined ? profile.backlogs : ''} 
                        onChange={e => updateProfile({ backlogs: e.target.value ? parseInt(e.target.value) : 0 })} 
                        placeholder="e.g. 0"
                        className="w-full bg-secondary/80 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Bio</label>
                    <textarea 
                      id="field-bio"
                      value={profile.bio || ''} 
                      onChange={e => updateProfile({ bio: e.target.value })} 
                      rows={3} 
                      maxLength={200} 
                      placeholder="Tell us about yourself, your interests, or what you study..."
                      className="w-full bg-secondary/80 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-shadow" 
                    />
                  </div>
                </div>
              )}

              {/* Edit Social & Links Tab */}
              {editTab === 'social' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium flex items-center gap-1.5">
                      <Linkedin className="h-3.5 w-3.5 text-blue-400" />
                      LinkedIn Profile URL
                    </label>
                    <input 
                      id="field-linkedinUrl"
                      value={profile.linkedinUrl || ''} 
                      onChange={e => updateProfile({ linkedinUrl: e.target.value })} 
                      placeholder="e.g. https://linkedin.com/in/username"
                      className="w-full bg-secondary/80 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium flex items-center gap-1.5">
                      <Github className="h-3.5 w-3.5" />
                      GitHub Profile URL
                    </label>
                    <input 
                      id="field-githubUrl"
                      value={profile.githubUrl || ''} 
                      onChange={e => updateProfile({ githubUrl: e.target.value })} 
                      placeholder="e.g. https://github.com/username"
                      className="w-full bg-secondary/80 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" 
                    />
                  </div>
                </div>
              )}

              {/* Edit Skills & Clubs Tab */}
              {editTab === 'skills' && (
                <div className="space-y-4">
                  <TagBuilder
                    id="field-skills"
                    label="Skills"
                    placeholder="e.g. React (Press Enter or Add)"
                    tags={profile.skills || []}
                    onAdd={(tag) => updateProfile({ skills: [...(profile.skills || []), tag] })}
                    onRemove={(tag) => updateProfile({ skills: (profile.skills || []).filter(s => s !== tag) })}
                  />

                  <TagBuilder
                    id="field-clubs"
                    label="Clubs & Organizations"
                    placeholder="e.g. Coding Club (Press Enter or Add)"
                    tags={profile.clubs || []}
                    onAdd={(tag) => updateProfile({ clubs: [...(profile.clubs || []), tag] })}
                    onRemove={(tag) => updateProfile({ clubs: (profile.clubs || []).filter(c => c !== tag) })}
                  />

                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block font-medium">Interests</label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-black/20 rounded-2xl border border-white/[0.04] max-h-48 overflow-y-auto">
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
                            className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                              hasInterest ? 'gradient-primary text-primary-foreground glow-primary' : 'bg-secondary/80 text-muted-foreground hover:text-foreground'
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

              {/* Edit Career & Projects Tab */}
              {editTab === 'career' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-primary" />
                      Career Goals
                    </label>
                    <textarea 
                      id="field-careerGoals"
                      value={profile.careerGoals || ''} 
                      onChange={e => updateProfile({ careerGoals: e.target.value })} 
                      rows={3} 
                      placeholder="What are your career objectives? (e.g. Seeking full-time roles in Frontend engineering, interested in AI startups...)"
                      className="w-full bg-secondary/80 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-shadow" 
                    />
                  </div>

                  <TagBuilder
                    id="field-projects"
                    label="Projects"
                    placeholder="e.g. Portfolio Website (Press Enter or Add)"
                    tags={profile.projects || []}
                    onAdd={(tag) => updateProfile({ projects: [...(profile.projects || []), tag] })}
                    onRemove={(tag) => updateProfile({ projects: (profile.projects || []).filter(p => p !== tag) })}
                  />

                  <TagBuilder
                    id="field-achievements"
                    label="Achievements & Awards"
                    placeholder="e.g. HackMIT Finalist (Press Enter or Add)"
                    tags={profile.achievements || []}
                    onAdd={(tag) => updateProfile({ achievements: [...(profile.achievements || []), tag] })}
                    onRemove={(tag) => updateProfile({ achievements: (profile.achievements || []).filter(a => a !== tag) })}
                  />
                </div>
              )}

              {/* Save changes button */}
              <Button onClick={handleSave} disabled={isLoading} className="w-full gradient-primary rounded-2xl h-12 font-semibold glow-primary mt-6">
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              key="view" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="space-y-4"
            >
              {/* Academic Metrics Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-5 flex flex-col justify-between shadow-lg">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Academic CGPA</span>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-3xl font-black text-[#16C784] tracking-tight">{profile.cgpa || '0.0'}</span>
                    <span className="text-xs text-slate-400 font-semibold">/ 10.0</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div className="bg-[#16C784] h-full rounded-full transition-all duration-500" style={{ width: `${(profile.cgpa || 0) * 10}%` }} />
                  </div>
                </div>

                <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-5 flex flex-col justify-between shadow-lg">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Active Backlogs</span>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className={`text-3xl font-black tracking-tight ${profile.backlogs > 0 ? 'text-[#F04438]' : 'text-slate-200'}`}>
                      {profile.backlogs !== undefined ? profile.backlogs : '0'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Pending</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${profile.backlogs > 0 ? 'bg-[#F04438]' : 'bg-white/10'}`} style={{ width: profile.backlogs > 0 ? '50%' : '0%' }} />
                  </div>
                </div>
              </div>

              {profile.bio && (
                <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-5 shadow-lg space-y-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-[#6D5EF5]" /> About Me
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}

              {profile.careerGoals && (
                <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-5 shadow-lg space-y-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-[#6D5EF5]" /> Career Objectives
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">{profile.careerGoals}</p>
                </div>
              )}

              {profile.skills && profile.skills.length > 0 && (
                <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-5 shadow-lg space-y-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-[#6D5EF5]" /> Target Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map(s => (
                      <span key={s} className="text-[10px] px-3 py-1.5 rounded-xl bg-[#6D5EF5]/10 text-[#6D5EF5] border border-[#6D5EF5]/20 font-bold uppercase tracking-wide">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {profile.interests && profile.interests.length > 0 && (
                <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-5 shadow-lg space-y-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#6D5EF5]" /> Areas of Interest
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.interests.map(i => (
                      <span key={i} className="text-[10px] px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold uppercase tracking-wide">{i}</span>
                    ))}
                  </div>
                </div>
              )}

              {profile.projects && profile.projects.length > 0 && (
                <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-5 shadow-lg space-y-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-[#6D5EF5]" /> Academic Projects
                  </p>
                  <div className="space-y-2">
                    {profile.projects.map((proj, index) => (
                      <div key={index} className="flex gap-2.5 items-center bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-2xl">
                        <span className="h-2 w-2 rounded-full bg-[#6D5EF5]" />
                        <span className="text-xs text-slate-200 font-bold">{proj}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profile.achievements && profile.achievements.length > 0 && (
                <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-5 shadow-lg space-y-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-[#6D5EF5]" /> Accomplishments & Awards
                  </p>
                  <div className="space-y-2">
                    {profile.achievements.map((ach, index) => (
                      <div key={index} className="flex gap-2.5 items-center bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-2xl">
                        <span className="h-2 w-2 rounded-full bg-[#16C784]" />
                        <span className="text-xs text-slate-200 font-bold">{ach}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profile.clubs && profile.clubs.length > 0 && (
                <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-5 shadow-lg space-y-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-[#6D5EF5]" /> Clubs & Societies
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.clubs.map(c => (
                      <span key={c} className="text-[10px] px-3 py-1.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 font-bold uppercase tracking-wide">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved Referrals Section */}
              {savedReferrals && savedReferrals.length > 0 && (
                <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-5 shadow-lg space-y-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-[#6D5EF5]" /> Bookmarked Referrals
                  </p>
                  <div className="space-y-3">
                    {savedReferrals.map((ref) => (
                      <div key={ref.id || ref._id} className="flex flex-col bg-white/[0.02] p-4 rounded-2xl border border-white/[0.04] relative group">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-black text-white">{ref.jobTitle || ref.role}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">{ref.companyName || ref.company} • {ref.location || 'Remote'}</p>
                          </div>
                          {(ref.applicationUrl || ref.applicationLink) && (
                            <button
                              onClick={() => {
                                alumniProfileService.trackReferralClick(ref.id || ref._id).catch(console.error);
                                alumniProfileService.trackReferralApply(ref.id || ref._id).catch(console.error);
                                window.open(ref.applicationUrl || ref.applicationLink, '_blank');
                              }}
                              className="inline-flex items-center gap-1 text-[10px] text-[#6D5EF5] hover:underline font-black uppercase tracking-wider"
                            >
                              Apply Now
                            </button>
                          )}
                        </div>
                        {ref.description && (
                          <p className="text-xs text-slate-400 mt-2 line-clamp-2">{ref.description}</p>
                        )}
                        <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-white/[0.04] text-[10px] text-slate-500">
                          <span className="font-medium">Shared by {ref.authorName}</span>
                          <button
                            onClick={async () => {
                              try {
                                if (!uid) return;
                                await alumniProfileService.saveReferral(ref.id || ref._id, uid);
                                setSavedReferrals(prev => prev.filter(r => (r.id || r._id) !== (ref.id || ref._id)));
                                toast.success('Removed from saved referrals');
                              } catch (err) {
                                toast.error('Failed to unsave');
                              }
                            }}
                            className="text-[#F04438] hover:text-[#F04438]/80 font-bold uppercase tracking-wider"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings options */}
        <div className="mt-8 space-y-2">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-3">Settings</p>
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowBlock(true)} className="w-full glass-card p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center"><UserX className="h-4 w-4 text-accent" /></div>
            <span className="text-sm text-foreground flex-1 text-left font-medium">Block / Report</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate('/settings/privacy')} className="w-full glass-card p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="h-4 w-4 text-primary" /></div>
            <span className="text-sm text-foreground flex-1 text-left font-medium">Privacy & Safety</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate('/support')} className="w-full glass-card p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center"><HelpCircle className="h-4 w-4 text-muted-foreground" /></div>
            <span className="text-sm text-foreground flex-1 text-left font-medium">Help & Support</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.98 }} 
            onClick={async () => {
              setLoggingOut(true);
              try {
                await logout();
              } catch (err) {
                console.error('Logout failed:', err);
                setLoggingOut(false);
              }
            }}
            disabled={loggingOut}
            className="w-full glass-card p-4 flex items-center gap-3 disabled:opacity-50"
          >
            <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <LogOut className="h-4 w-4 text-accent" />
            </div>
            <span className="text-sm text-accent flex-1 text-left font-semibold">
              {loggingOut ? 'Logging out...' : 'Logout'}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Block Modal */}
      <AnimatePresence>
        {showBlock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md px-4 py-6"
            onClick={() => {
              setShowBlock(false);
              setSelectedReportUser(null);
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-modal-title"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={e => e.stopPropagation()}
              className="glass-strong rounded-[24px] p-6 sm:p-8 w-[92%] sm:w-[80%] md:w-[480px] max-w-[500px] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] hover:border-red-500/20 transition-all duration-300 relative"
            >
              {/* Tab Selector */}
              <div className="flex border-b border-white/10 mb-5">
                <button
                  onClick={() => setModalTab('block')}
                  className={`flex-1 pb-3 text-sm font-semibold transition-all ${
                    modalTab === 'block'
                      ? 'text-red-500 border-b-2 border-red-500'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🚫 Block User
                </button>
                <button
                  onClick={() => setModalTab('report')}
                  className={`flex-1 pb-3 text-sm font-semibold transition-all ${
                    modalTab === 'report'
                      ? 'text-red-500 border-b-2 border-red-500'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  ⚠️ Report User
                </button>
              </div>

              {modalTab === 'block' ? (
                // BLOCK TAB
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Blocking someone hides them from search results, stops direct messaging, prevents them from viewing your profile, and stops interaction.
                  </p>
                  
                  <div className="relative">
                    <input
                      autoFocus
                      value={blockSearch}
                      onChange={e => setBlockSearch(e.target.value)}
                      placeholder="Search users by name or email..."
                      className="w-full bg-secondary/60 border border-white/5 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/40 transition-all shadow-inner"
                    />
                    {searchLoading && (
                      <span className="absolute right-4 top-3 text-xs text-muted-foreground">Searching...</span>
                    )}
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto bg-black/30 border border-white/5 rounded-2xl p-2 space-y-1">
                      {searchResults.map(u => (
                        <div key={u.userId} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-all">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground">{u.name}</span>
                            <span className="text-[10px] text-muted-foreground">{u.email} ({u.role})</span>
                          </div>
                          <Button
                            onClick={() => handleBlockUser(u.userId)}
                            className="bg-red-600 hover:bg-red-500 text-white rounded-lg h-7 px-3 text-[10px] font-bold"
                          >
                            Block
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Blocked accounts list */}
                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Currently Blocked:</p>
                    {blockedUsersList.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">No blocked users.</p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                        {blockedUsersList.map(b => (
                          <div key={b.userId} className="flex items-center justify-between p-2 bg-red-500/5 border border-red-500/10 rounded-xl">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-red-400">{b.name}</span>
                              <span className="text-[10px] text-muted-foreground/70">{b.email}</span>
                            </div>
                            <button
                              onClick={() => handleUnblockUser(b.userId)}
                              className="text-[10px] text-red-400 hover:underline font-bold"
                            >
                              Unblock
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowBlock(false)}
                      className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-foreground h-10 text-xs font-bold transition-all px-6"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                // REPORT TAB
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Report users violating community guidelines. Administrators will investigate reports and suspend accounts if guidelines are breached.
                  </p>

                  {!selectedReportUser ? (
                    <div className="space-y-2">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase">1. Find User to Report</label>
                      <div className="relative">
                        <input
                          autoFocus
                          value={blockSearch}
                          onChange={e => setBlockSearch(e.target.value)}
                          placeholder="Search user to report..."
                          className="w-full bg-secondary/60 border border-white/5 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/40 transition-all shadow-inner"
                        />
                        {searchLoading && (
                          <span className="absolute right-4 top-3 text-xs text-muted-foreground">Searching...</span>
                        )}
                      </div>

                      {searchResults.length > 0 && (
                        <div className="max-h-40 overflow-y-auto bg-black/30 border border-white/5 rounded-2xl p-2 space-y-1">
                          {searchResults.map(u => (
                            <div
                              key={u.userId}
                              onClick={() => {
                                setSelectedReportUser(u);
                                setBlockSearch('');
                              }}
                              className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-all"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-foreground">{u.name}</span>
                                <span className="text-[10px] text-muted-foreground">{u.email}</span>
                              </div>
                              <span className="text-[10px] text-accent font-semibold">Select</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-secondary/40 border border-white/5 rounded-xl">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">Reporting: {selectedReportUser.name}</span>
                          <span className="text-[10px] text-muted-foreground">{selectedReportUser.email}</span>
                        </div>
                        <button
                          onClick={() => setSelectedReportUser(null)}
                          className="text-[10px] text-muted-foreground hover:text-foreground font-bold"
                        >
                          Change
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-muted-foreground font-bold uppercase block">2. Category</label>
                        <select
                          value={reportReason}
                          onChange={e => setReportReason(e.target.value)}
                          className="w-full bg-secondary border border-white/10 rounded-2xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-accent/40 focus:border-accent/40 outline-none"
                        >
                          <option value="Spam">Spam</option>
                          <option value="Harassment">Harassment</option>
                          <option value="Fake Profile">Fake Profile</option>
                          <option value="Inappropriate Content">Inappropriate Content</option>
                          <option value="Scam/Fraud">Scam/Fraud</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-muted-foreground font-bold uppercase block">3. Description</label>
                        <textarea
                          value={reportDescription}
                          onChange={e => setReportDescription(e.target.value)}
                          placeholder="Provide details about the issue..."
                          rows={3}
                          className="w-full bg-secondary/60 border border-white/5 rounded-2xl p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/40 transition-all shadow-inner"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedReportUser(null);
                            setShowBlock(false);
                          }}
                          className="flex-1 rounded-xl border-white/10 bg-white/5 text-foreground h-11 text-xs font-bold transition-all"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSendReport}
                          disabled={submittingReport}
                          className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 text-white h-11 text-xs font-bold transition-all shadow-lg"
                        >
                          {submittingReport ? 'Submitting...' : 'Submit Report'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomTabBar />
    </div>
  );
}
