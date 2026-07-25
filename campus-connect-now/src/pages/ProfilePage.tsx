import { useState, useMemo, useEffect, useCallback, memo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { getValidName } from '@/utils/validation';
import { useMatchStore } from '@/store/matchStore';
import { alumniProfileService } from '@/services/alumniService';
import { useProfileViewerStore } from '@/store/profileViewerStore';
import { matchApi } from '@/services/api';
import { BottomTabBar } from '@/components/BottomTabBar';
import { ImageViewer } from '@/components/common/ImageViewer';
import { PostDetailModal } from '@/components/common/PostDetailModal';
import { usePostDetailStore } from '@/store/postDetailStore';
import { socketService } from '@/services/socketService';
import { uploadMediaFile } from '@/services/uploadService';
import { Button } from '@/components/ui/button';
import { INTERESTS, COURSES, YEARS } from '@/data/constants';
import { getApiUrl } from '@/services/connectionService';
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
  AlertCircle,
  Newspaper,
  Users,
  UserCheck,
  UserPlus,
  MessageSquare,
  Network,
  Phone,
  Video,
  MoreVertical,
  Share2,
  Trash2,
  ShieldOff,
  AlertTriangle,
  Link2,
  Copy,
  CheckCircle2,
  UserMinus,
  Plus,
  Search,
  User
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

interface FriendCardProps {
  friend: any;
  idx: number;
  navigate: any;
  mutualCounts: Record<string, number>;
  setSelectedMutualFriends: (friends: any[]) => void;
  handleRemoveFriend: (id: string) => void;
  handleBlockUser: (id: string) => void;
  chatWithUser: (id: string) => void;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
}

const FriendCard = memo(({
  friend,
  idx,
  navigate,
  mutualCounts,
  setSelectedMutualFriends,
  handleRemoveFriend,
  handleBlockUser,
  chatWithUser,
  activeMenuId,
  setActiveMenuId
}: FriendCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.no-nav')) {
      return;
    }
    navigate(`/profile/${friend.id}`);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      navigate(`/profile/${friend.id}`);
    } else if (e.key === 'Escape') {
      setActiveMenuId(null);
    }
  };

  const longPressTimeout = useRef<any>(null);
  const handleTouchStart = () => {
    longPressTimeout.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(60);
      setIsHovered(true);
      toast.info(`Quick actions active for ${friend.name}`);
    }, 600);
  };
  const handleTouchEnd = () => {
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      whileHover={{ 
        y: -4,
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)",
        borderColor: "rgba(139, 92, 246, 0.25)"
      }}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setActiveMenuId(null);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      role="button"
      aria-label={`Friend card for ${friend.name}. Click to view profile.`}
      className="group relative glass-card p-4 border border-white/[0.08] bg-zinc-950/20 rounded-2xl flex flex-col justify-between transition-colors duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
    >
      <div className="absolute top-3 right-3 z-20 no-nav">
        <div className="relative inline-block text-left">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuId(activeMenuId === friend.id ? null : friend.id);
            }}
            className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-all active:scale-95"
            aria-haspopup="true"
            aria-expanded={activeMenuId === friend.id}
            aria-label="More options menu"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          
          <AnimatePresence>
            {activeMenuId === friend.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 w-36 bg-zinc-950 border border-white/10 rounded-xl py-1 mt-1 shadow-xl z-50 pointer-events-auto"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(`${window.location.origin}/profile/${friend.id}`);
                    toast.success('Profile URL copied to clipboard');
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-zinc-350 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Share2 className="w-3 h-3" /> Share Profile
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(`${window.location.origin}/profile/${friend.id}`);
                    toast.success('Profile link copied! 📋');
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-zinc-350 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Link2 className="w-3 h-3" /> Copy Profile Link
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.info(`Reported ${friend.name} successfully.`);
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-amber-500 hover:bg-amber-500/10 transition-colors flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3 h-3" /> Report User
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFriend(friend.id);
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-amber-450 hover:bg-amber-500/10 transition-colors flex items-center gap-1.5"
                >
                  <UserMinus className="w-3 h-3" /> Remove Friend
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBlockUser(friend.id);
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
                >
                  <UserX className="w-3 h-3" /> Block User
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-shrink-0">
          <motion.img
            src={friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`}
            alt=""
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.3 }}
            className="h-14 w-14 rounded-2xl object-cover border border-white/10 group-hover:border-violet-500/30"
          />
          {friend.isOnline ? (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#09090b] shadow-glow" />
          ) : (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-zinc-650 border-2 border-[#09090b]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs sm:text-sm font-black text-white hover:text-violet-400 transition-colors truncate flex items-center gap-1">
            {friend.name}
            {friend.isOnline && (
              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 rounded font-bold uppercase tracking-widest scale-90">Active</span>
            )}
          </h4>
          <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium">{friend.department} • Batch {friend.batch}</p>
          <p className="text-[9px] text-zinc-555 truncate mt-1">SR University</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 relative min-h-[40px]">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {[1, 2, 3].map(i => (
              <img
                key={i}
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=mutual${i * idx}`}
                className="h-4.5 w-4.5 rounded-full border border-[#09090b] object-cover"
                alt=""
              />
            ))}
          </div>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
                const headers = { 'Authorization': `Bearer ${token}` };
                const res = await fetch(`${getApiUrl()}/api/users/${friend.id}/mutual`, { headers });
                const json = await res.json();
                if (json.success && json.data) {
                  setSelectedMutualFriends(json.data.friends || []);
                }
              } catch (err) {
                toast.error("Failed to load mutual connections");
              }
            }}
            className="text-[9px] text-zinc-450 hover:text-violet-400 transition-colors font-bold no-nav"
          >
            +{mutualCounts[friend.id] || 0} Mutual
          </button>
        </div>

        <AnimatePresence>
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 bottom-0 flex gap-1.5 no-nav bg-zinc-950/80 backdrop-blur-md px-2 py-1 rounded-xl border border-white/[0.04] shadow-lg shadow-black/50"
            >
              <div className="relative group/btn">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    chatWithUser(friend.id);
                  }}
                  className="h-7 w-7 rounded-full bg-zinc-900 border border-white/10 hover:bg-violet-600 hover:text-white text-zinc-350 transition-all flex items-center justify-center hover:scale-110 active:scale-95"
                >
                  <MessageSquare className="w-3 h-3" />
                </button>
                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-950 border border-white/15 text-[8px] font-bold text-white rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
                  Message
                </span>
              </div>

              <div className="relative group/btn">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.info(`Initiating voice call to ${friend.name}...`);
                  }}
                  className="h-7 w-7 rounded-full bg-zinc-900 border border-white/10 hover:bg-violet-600 hover:text-white text-zinc-350 transition-all flex items-center justify-center hover:scale-110 active:scale-95"
                >
                  <Phone className="w-3 h-3" />
                </button>
                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-950 border border-white/15 text-[8px] font-bold text-white rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
                  Voice Call
                </span>
              </div>

              <div className="relative group/btn">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.info(`Initiating video call to ${friend.name}...`);
                  }}
                  className="h-7 w-7 rounded-full bg-zinc-900 border border-white/10 hover:bg-violet-600 hover:text-white text-zinc-350 transition-all flex items-center justify-center hover:scale-110 active:scale-95"
                >
                  <Video className="w-3 h-3" />
                </button>
                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-950 border border-white/15 text-[8px] font-bold text-white rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
                  Video Call
                </span>
              </div>

              <div className="relative group/btn">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${friend.id}`);
                  }}
                  className="h-7 w-7 rounded-full bg-zinc-900 border border-white/10 hover:bg-violet-600 hover:text-white text-zinc-350 transition-all flex items-center justify-center hover:scale-110 active:scale-95"
                >
                  <User className="w-3 h-3" />
                </button>
                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-950 border border-white/15 text-[8px] font-bold text-white rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
                  View Profile
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

FriendCard.displayName = 'FriendCard';

export default function ProfilePage({ targetUserId: propTargetUserId }: { targetUserId?: string } = {}) {
  const navigate = useNavigate();
  const params = useParams<{ userId?: string }>();
  const profile = useProfileStore(s => s.profile);
  const updateProfile = useProfileStore(s => s.updateProfile);
  const saveProfile = useProfileStore(s => s.saveProfile);
  const isLoading = useProfileStore(s => s.isLoading);
  const currentUserId = useAuthStore(s => s._id) || useAuthStore(s => s.uid);
  const targetUserId = propTargetUserId || params.userId;
  const uid = targetUserId || currentUserId;
  const isOwnProfile: boolean = Boolean(
    !targetUserId || 
    targetUserId === currentUserId || 
    (profile?.userId && profile.userId === currentUserId) ||
    (profile?._id && profile._id === currentUserId)
  );
  const email = useAuthStore(s => s.email);
  const logout = useAuthStore(s => s.logout);
  const viewers = useProfileViewerStore(s => s.viewers);
  const viewersLoading = useProfileViewerStore(s => s.isLoading);
  const fetchViewers = useProfileViewerStore(s => s.fetchViewers);
  const loadProfile = useProfileStore(s => s.loadProfile);

  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState<'basic' | 'social' | 'skills' | 'career'>('basic');
  const [profileStats, setProfileStats] = useState<any>(null);
  const [profileMedia, setProfileMedia] = useState<any[]>([]);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [profileFriends, setProfileFriends] = useState<any[]>([]);
  const [profileFollowers, setProfileFollowers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'about' | 'photos' | 'videos' | 'projects' | 'achievements' | 'friends'>('about');

  // Friends Page Redesign states
  const [friendsSubTab, setFriendsSubTab] = useState<'all' | 'requests' | 'suggestions' | 'mutual' | 'recent' | 'online' | 'blocked'>('all');
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  const [friendsFilterDept, setFriendsFilterDept] = useState('all');
  const [friendsFilterBatch, setFriendsFilterBatch] = useState('all');
  const [friendsFilterOnlineOnly, setFriendsFilterOnlineOnly] = useState(false);
  const [friendsSortBy, setFriendsSortBy] = useState<'name' | 'recent' | 'mutual'>('name');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMutualFriends, setSelectedMutualFriends] = useState<any[] | null>(null);
  const [activeFriendMenuId, setActiveFriendMenuId] = useState<string | null>(null);

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

  const [mutualCounts, setMutualCounts] = useState<Record<string, number>>({});

  const fetchMutualCount = async (friendId: string) => {
    if (mutualCounts[friendId] !== undefined) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${getApiUrl()}/api/users/${friendId}/mutual`, { headers });
      const json = await res.json();
      if (json.success && json.data) {
        setMutualCounts(prev => ({ ...prev, [friendId]: json.data.friends?.length || 0 }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      const res = await matchApi.removeConnection(friendId);
      if (res && res.success) {
        toast.success("Friend removed successfully");
        fetchStats(); // re-fetch connections
      } else {
        toast.error(res.error || "Failed to remove friend");
      }
    } catch (e) {
      toast.error("Failed to remove friend");
    }
  };

  // Dynamic Departments from current connections pool
  const dynamicDepartments = useMemo(() => {
    const depts = new Set<string>();
    profileFriends.forEach(f => { if (f.department) depts.add(f.department); });
    suggestions.forEach(s => { if (s.department) depts.add(s.department); });
    return Array.from(depts);
  }, [profileFriends, suggestions]);

  // Dynamic Batches from current connections pool
  const dynamicBatches = useMemo(() => {
    const batches = new Set<string>();
    profileFriends.forEach(f => { if (f.batch) batches.add(String(f.batch)); });
    suggestions.forEach(s => { if (s.batch) batches.add(String(s.batch)); });
    return Array.from(batches).sort();
  }, [profileFriends, suggestions]);

  // Filtered lists for Friends tab redesign
  const filteredFriends = useMemo(() => {
    return profileFriends.filter(friend => {
      const query = friendsSearchQuery.toLowerCase();
      const matchesSearch = 
        friend.name.toLowerCase().includes(query) ||
        (friend.department || '').toLowerCase().includes(query) ||
        (friend.username || '').toLowerCase().includes(query) ||
        (friend.skills || []).some((s: string) => s.toLowerCase().includes(query)) ||
        (friend.interests || []).some((i: string) => i.toLowerCase().includes(query));
      
      const matchesDept = friendsFilterDept === 'all' || friend.department === friendsFilterDept;
      const matchesBatch = friendsFilterBatch === 'all' || String(friend.batch).includes(friendsFilterBatch);
      const matchesOnline = !friendsFilterOnlineOnly || friend.isOnline;
      return matchesSearch && matchesDept && matchesBatch && matchesOnline;
    }).sort((a, b) => {
      if (friendsSortBy === 'name') return a.name.localeCompare(b.name);
      if (friendsSortBy === 'recent') return (b.joinedAt || 0) - (a.joinedAt || 0); // fallback or sorted joined date
      if (friendsSortBy === 'mutual') return (mutualCounts[b.id] || 0) - (mutualCounts[a.id] || 0);
      if (friendsSortBy === 'active') return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
      return 0;
    });
  }, [profileFriends, friendsSearchQuery, friendsFilterDept, friendsFilterBatch, friendsFilterOnlineOnly, friendsSortBy, mutualCounts]);

  const filteredRequests = useMemo(() => {
    return pendingRequests.filter(req => 
      (req.fromUser?.name || '').toLowerCase().includes(friendsSearchQuery.toLowerCase())
    );
  }, [pendingRequests, friendsSearchQuery]);

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(sug => 
      (sug.name || '').toLowerCase().includes(friendsSearchQuery.toLowerCase()) ||
      (sug.department || '').toLowerCase().includes(friendsSearchQuery.toLowerCase())
    );
  }, [suggestions, friendsSearchQuery]);

  const filteredBlocked = useMemo(() => {
    return blockedUsersList.filter(u => 
      (u.name || '').toLowerCase().includes(friendsSearchQuery.toLowerCase())
    );
  }, [blockedUsersList, friendsSearchQuery]);

  const displayCount = useMemo(() => {
    if (friendsSubTab === 'all' || friendsSubTab === 'recent') return filteredFriends.length;
    if (friendsSubTab === 'requests') return filteredRequests.length;
    if (friendsSubTab === 'suggestions') return filteredSuggestions.length;
    if (friendsSubTab === 'online') return filteredFriends.filter(f => f.isOnline).length;
    if (friendsSubTab === 'blocked') return filteredBlocked.length;
    if (friendsSubTab === 'mutual') return filteredFriends.filter(f => (mutualCounts[f.id] || 0) > 0).length;
    return 0;
  }, [friendsSubTab, filteredFriends, filteredRequests, filteredSuggestions, blockedUsersList, mutualCounts]);

  const chatWithUser = async (friendId: string) => {
    try {
      toast.loading('Opening messaging channel...', { id: 'chat-nav' });
      const res = await matchApi.resolveConnection(friendId);
      if (res && res.success && res.data) {
        const matchData = res.data;
        const currentMatches = useMatchStore.getState().matches;
        if (!currentMatches.find(m => m.id === matchData.id)) {
          useMatchStore.getState().setMatches([matchData, ...currentMatches]);
        }
        toast.success('Connected!', { id: 'chat-nav' });
        navigate(`/chat/${matchData.id}`);
      } else {
        toast.error(res?.error || 'Failed to establish messaging channel.', { id: 'chat-nav' });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to resolve conversation.', { id: 'chat-nav' });
    }
  };

  const fetchStats = useCallback(async () => {
    if (!uid) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const statsRes = await fetch(`${getApiUrl()}/api/profile/${uid}/stats`, { headers });
      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        if (statsJson.success && statsJson.data?.stats) {
          setProfileStats(statsJson.data.stats);
        }
      }

      // Fetch media
      const mediaRes = await fetch(`${getApiUrl()}/api/profile/${uid}/photos`, { headers });
      if (mediaRes.ok) {
        const mediaJson = await mediaRes.json();
        if (mediaJson.success) setProfileMedia(mediaJson.data || []);
      }

      // Fetch friends
      const friendsRes = await fetch(`${getApiUrl()}/api/profile/${uid}/friends`, { headers });
      if (friendsRes.ok) {
        const friendsJson = await friendsRes.json();
        if (friendsJson.success) setProfileFriends(friendsJson.data || []);
      }

      // Fetch followers
      const followersRes = await fetch(`${getApiUrl()}/api/profile/${uid}/followers`, { headers });
      if (followersRes.ok) {
        const followersJson = await followersRes.json();
        if (followersJson.success) setProfileFollowers(followersJson.data || []);
      }
    } catch (e) {
      console.error("Failed to load user profile stats/data:", e);
    }
  }, [uid]);
  


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

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const res = await matchApi.getSwipePool();
      if (res && res.success) {
        setSuggestions(res.data || []);
      }
    } catch (e) {
      console.error('Error fetching suggestions:', e);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const fetchConnectionRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await matchApi.getConnectionRequests();
      if (res && res.success) {
        setPendingRequests(res.data || []);
      }
    } catch (e) {
      console.error('Error fetching connection requests:', e);
    } finally {
      setRequestsLoading(false);
    }
  };

  // Sync profile from backend on mount & listen to real-time events
  useEffect(() => {
    if (!uid) return;
    loadProfile(uid);
    loadSavedReferrals();
    fetchStats();
    fetchSuggestions();
    fetchConnectionRequests();

    const handleRealtimeRefresh = () => {
      fetchStats();
      loadProfile(uid);
      fetchConnectionRequests();
    };

    window.addEventListener('profile:stats:update', handleRealtimeRefresh);
    window.addEventListener('post:created', handleRealtimeRefresh);
    window.addEventListener('post:deleted', handleRealtimeRefresh);
    window.addEventListener('connection:update', handleRealtimeRefresh);
    window.addEventListener('follow:update', handleRealtimeRefresh);
    window.addEventListener('profile:updated', handleRealtimeRefresh);

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('follow:update', handleRealtimeRefresh);
      socket.on('presence:status', handleRealtimeRefresh);
      socket.on('connection:update', handleRealtimeRefresh);
      socket.on('post:created', handleRealtimeRefresh);
      socket.on('post:deleted', handleRealtimeRefresh);
    }

    return () => {
      window.removeEventListener('profile:stats:update', handleRealtimeRefresh);
      window.removeEventListener('post:created', handleRealtimeRefresh);
      window.removeEventListener('post:deleted', handleRealtimeRefresh);
      window.removeEventListener('connection:update', handleRealtimeRefresh);
      window.removeEventListener('follow:update', handleRealtimeRefresh);
      window.removeEventListener('profile:updated', handleRealtimeRefresh);

      if (socket) {
        socket.off('follow:update', handleRealtimeRefresh);
        socket.off('presence:status', handleRealtimeRefresh);
        socket.off('connection:update', handleRealtimeRefresh);
        socket.off('post:created', handleRealtimeRefresh);
        socket.off('post:deleted', handleRealtimeRefresh);
      }
    };
  }, [uid, loadProfile, fetchStats]);

  // Fetch profile viewers on mount
  useEffect(() => {
    fetchViewers(10);
  }, [fetchViewers]);

  // Fetch mutual friends count for connections and recommendations
  useEffect(() => {
    if (profileFriends.length > 0) {
      profileFriends.forEach(f => {
        fetchMutualCount(f.id);
      });
    }
  }, [profileFriends]);

  useEffect(() => {
    if (suggestions.length > 0) {
      suggestions.forEach(s => {
        fetchMutualCount(s.userId);
      });
    }
  }, [suggestions]);

  // Load blocked users when Blocked tab is selected
  useEffect(() => {
    if (friendsSubTab === 'blocked') {
      fetchBlockedUsers();
    }
  }, [friendsSubTab]);

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
    fetchStats();
    window.dispatchEvent(new CustomEvent('profile:stats:update'));
  };

  // User Search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (blockSearch.trim()) {
        setSearchLoading(true);
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
          const res = await fetch(`${getApiUrl()}/api/users/search?q=${encodeURIComponent(blockSearch)}`, {
            headers: {
              'Authorization': `Bearer ${token}`
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
      const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
      const res = await fetch(`${getApiUrl()}/api/privacy-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
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
      const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
      const res = await fetch(`${getApiUrl()}/api/users/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
      const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
      const res = await fetch(`${getApiUrl()}/api/users/unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
  const authState = useAuthStore();
  const displayName = getValidName(
    profile.fullName,
    profile.name,
    authState.fullName,
    authState.name,
    authState.user?.fullName,
    authState.user?.name
  );

  // Real-Time Profile Strength Items Configuration
  const checkItems = useMemo(() => {
    return [
      { id: 'photos', name: 'Profile Picture', checked: !!(profile.photos && profile.photos.length > 0 && profile.photos[0]), actionText: 'Add Profile Picture', tab: 'basic' as const },
      { id: 'name', name: 'Full Name', checked: !!(displayName && displayName.trim() !== ''), actionText: 'Add Full Name', tab: 'basic' as const },
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
  }, [profile, displayName]);

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
    <div className="min-h-screen bg-[#070709] pb-24 page-transition w-full text-zinc-100 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6">
        
        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Main Profile Area (75% Width) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Header: Cover Banner & Overlapping Avatar */}
            <div className="relative rounded-[32px] overflow-hidden bg-zinc-950/40 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              {/* Cover Banner */}
              <div className="h-44 sm:h-56 md:h-64 bg-gradient-to-r from-violet-650 via-fuchsia-600 to-indigo-705 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
                <div className="absolute -inset-[10px] opacity-30 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-pink-500 to-purple-900 filter blur-xl animate-pulse" />
              </div>
              
              {/* Overlapping Avatar & Metadata */}
              <div className="relative px-6 pb-6 pt-0">
                <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-16 sm:-mt-20">
                  {/* Large Circular Avatar */}
                  <div className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-full border-4 border-[#070709] overflow-hidden bg-zinc-900/80 shadow-2xl flex-shrink-0 group">
                    <img
                      src={profile.photos[0] || 'https://api.dicebear.com/7.x/avataaars/svg?seed=me'}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-500"
                    />
                    <button 
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      className="absolute bottom-1 right-1 h-8 w-8 rounded-full gradient-primary flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform border border-white/20"
                      title="Update Avatar"
                    >
                      <Camera className="h-4 w-4 text-primary-foreground" />
                    </button>
                    <input 
                      id="avatar-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          toast.loading('Uploading avatar...', { id: 'avatar-upload' });
                          const res = await uploadMediaFile(file, '/api/profile/avatar');
                          if (res.success && res.url) {
                            const photos = profile.photos.length > 0 ? [res.url, ...profile.photos.slice(1)] : [res.url];
                            updateProfile({ photos, profileImageUrl: res.url });
                            toast.success('Avatar uploaded successfully!', { id: 'avatar-upload' });
                          } else {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const result = reader.result as string;
                              const photos = profile.photos.length > 0 ? [result, ...profile.photos.slice(1)] : [result];
                              updateProfile({ photos });
                              toast.success('Avatar updated!', { id: 'avatar-upload' });
                            };
                            reader.readAsDataURL(file);
                          }
                        } catch (err) {
                          toast.error('Failed to upload avatar', { id: 'avatar-upload' });
                        }
                      }}
                    />
                  </div>
                  
                  {/* User Details & Action Tray */}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-2 sm:mt-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                          {displayName || 'Set Name'}
                        </h2>
                        {isVerified && <BadgeCheck className="h-5.5 w-5.5 text-primary flex-shrink-0 animate-pulse" />}
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" title="Online" />
                      </div>
                      
                      <p className="text-xs text-zinc-400 font-semibold mt-0.5">
                        @{displayName ? displayName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user'}
                      </p>
                      
                      {/* Department / Batch */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 text-xs text-zinc-350 font-bold">
                        {profile.course && <span>{profile.course}</span>}
                        {profile.course && profile.year && <span className="text-zinc-700">•</span>}
                        {profile.year && <span>Batch of {profile.year}</span>}
                        {email && <span className="text-zinc-700">•</span>}
                        {email && <span className="text-zinc-450 hover:text-white transition-colors">{email}</span>}
                      </div>
                    </div>
                    
                    {/* Actions Row */}
                    <div className="flex flex-wrap gap-2.5 items-center">
                      <Button 
                        onClick={() => setEditing(!editing)} 
                        className={`rounded-2xl h-11 px-5 text-xs font-black tracking-wide transition-all duration-300 border flex items-center gap-2 ${
                          editing 
                            ? 'bg-primary text-primary-foreground glow-primary border-transparent' 
                            : 'bg-zinc-950/40 text-white border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'
                        }`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        {editing ? "View Profile" : "Edit Profile"}
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success('Profile link copied to clipboard!');
                        }}
                        className="rounded-2xl h-11 w-11 border-zinc-800 bg-zinc-950/40 text-white hover:bg-zinc-900 hover:border-zinc-700 flex items-center justify-center p-0"
                        title="Share Profile"
                      >
                        <ChevronRight className="w-4.5 h-4.5 rotate-90" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Bio (Header Level) */}
                {profile.bio && (
                  <p className="text-xs sm:text-sm text-zinc-350 mt-5 max-w-2xl leading-relaxed whitespace-pre-wrap font-medium">
                    {profile.bio}
                  </p>
                )}
                
                {/* Social Badges Row */}
                {(profile.linkedinUrl || profile.githubUrl) && (
                  <div className="flex flex-wrap gap-2.5 mt-4">
                    {profile.linkedinUrl && (
                      <a 
                        href={profile.linkedinUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] font-extrabold uppercase tracking-wider text-blue-400 hover:bg-blue-500/15 transition-all"
                      >
                        <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                      </a>
                    )}
                    {profile.githubUrl && (
                      <a 
                        href={profile.githubUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-extrabold uppercase tracking-wider text-zinc-200 hover:bg-white/10 transition-all"
                      >
                        <Github className="w-3.5 h-3.5" /> GitHub
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Redesigned Premium Glassmorphism Statistics Cards Grid */}
            <div className={`grid grid-cols-2 sm:grid-cols-4 ${isOwnProfile ? 'lg:grid-cols-7' : 'lg:grid-cols-8'} gap-3.5`}>
              {[
                { label: 'Posts', value: profileStats?.posts || 0, color: 'from-violet-500/20 to-purple-500/5', border: 'border-violet-500/20 hover:border-violet-500/40', textColor: 'text-violet-400', glow: 'shadow-violet-500/5', icon: Newspaper },
                { label: 'Friends', value: profileStats?.friends || 0, color: 'from-blue-500/20 to-cyan-500/5', border: 'border-blue-500/20 hover:border-blue-500/40', textColor: 'text-blue-400', glow: 'shadow-blue-500/5', icon: Users },
                { label: 'Followers', value: profileStats?.followers || 0, color: 'from-fuchsia-500/20 to-pink-500/5', border: 'border-fuchsia-500/20 hover:border-fuchsia-500/40', textColor: 'text-fuchsia-400', glow: 'shadow-fuchsia-500/5', icon: UserCheck },
                { label: 'Following', value: profileStats?.following || 0, color: 'from-indigo-500/20 to-blue-500/5', border: 'border-indigo-500/20 hover:border-indigo-500/40', textColor: 'text-indigo-400', glow: 'shadow-indigo-500/5', icon: UserPlus },
                { label: 'Circles', value: profileStats?.circles || 0, color: 'from-teal-500/20 to-emerald-500/5', border: 'border-teal-500/20 hover:border-teal-500/40', textColor: 'text-teal-400', glow: 'shadow-teal-500/5', icon: Network },
                { label: 'Achievements', value: profileStats?.achievements ?? (profile?.achievements?.length || 0), color: 'from-amber-500/20 to-yellow-500/5', border: 'border-amber-500/20 hover:border-amber-500/40', textColor: 'text-amber-400', glow: 'shadow-amber-500/5', icon: Trophy },
                { label: 'Projects', value: profileStats?.projects ?? (profile?.projects?.length || 0), color: 'from-rose-500/20 to-red-500/5', border: 'border-rose-500/20 hover:border-rose-500/40', textColor: 'text-rose-400', glow: 'shadow-rose-500/5', icon: Briefcase },
                ...(!isOwnProfile ? [{ label: 'Mutual', value: profileStats?.mutual || 0, color: 'from-emerald-500/20 to-teal-500/5', border: 'border-emerald-500/20 hover:border-emerald-500/40', textColor: 'text-emerald-400', glow: 'shadow-emerald-500/5', icon: Sparkles }] : [])
              ].map((stat, i) => {
                const IconComponent = stat.icon;
                return (
                  <motion.div
                    key={i}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className={`relative p-4 rounded-2xl bg-gradient-to-b ${stat.color} border ${stat.border} flex flex-col items-center justify-center text-center shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-md ${stat.glow}`}
                  >
                    <div className="absolute top-2.5 right-2.5 opacity-20">
                      <IconComponent className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className={`text-2xl font-black ${stat.textColor} tracking-tight font-display`}>
                      {stat.value}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-extrabold uppercase mt-1 tracking-wider">
                      {stat.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Editing State vs Tabs Details View */}
            <AnimatePresence mode="wait">
              {editing ? (
                <motion.div 
                  key="edit" 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }} 
                  className="space-y-4"
                >
                  {/* Form Tabs list */}
                  <div className="flex gap-2 border-b border-white/5 pb-2 mb-4 overflow-x-auto hide-scrollbar">
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
                          editTab === t.id ? 'gradient-primary text-primary-foreground glow-primary' : 'bg-zinc-900/40 text-zinc-400 hover:text-white'
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
                        <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Full Name</label>
                        <input 
                          id="field-name"
                          value={displayName} 
                          onChange={e => updateProfile({ name: e.target.value })} 
                          placeholder="e.g. Alice Cooper"
                          className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner" 
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Personal Email</label>
                        <input 
                          id="field-personalEmail"
                          value={profile.personalEmail || ''} 
                          onChange={e => updateProfile({ personalEmail: e.target.value })} 
                          placeholder="e.g. alice@example.com"
                          className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Department</label>
                          <select 
                            id="field-course"
                            value={profile.course || ''} 
                            onChange={e => updateProfile({ course: e.target.value })} 
                            className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                          >
                            <option value="">Select Course</option>
                            {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Batch</label>
                          <select 
                            id="field-year"
                            value={profile.year || ''} 
                            onChange={e => updateProfile({ year: e.target.value })} 
                            className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                          >
                            <option value="">Select Year</option>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Academic Year</label>
                        <select 
                          id="field-academicYear"
                          value={profile.academicYear || ''} 
                          onChange={e => updateProfile({ academicYear: e.target.value })} 
                          className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
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
                          <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">CGPA</label>
                          <input 
                            id="field-cgpa"
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
                            id="field-backlogs"
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
                      <div>
                        <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide">Bio</label>
                        <textarea 
                          id="field-bio"
                          value={profile.bio || ''} 
                          onChange={e => updateProfile({ bio: e.target.value })} 
                          rows={3} 
                          maxLength={200} 
                          placeholder="Tell us about yourself, your interests, or what you study..."
                          className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all" 
                        />
                      </div>
                    </div>
                  )}

                  {/* Edit Social Links */}
                  {editTab === 'social' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide flex items-center gap-1.5">
                          <Linkedin className="h-3.5 w-3.5 text-blue-400" />
                          LinkedIn Profile URL
                        </label>
                        <input 
                          id="field-linkedinUrl"
                          value={profile.linkedinUrl || ''} 
                          onChange={e => updateProfile({ linkedinUrl: e.target.value })} 
                          placeholder="e.g. https://linkedin.com/in/username"
                          className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all" 
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide flex items-center gap-1.5">
                          <Github className="h-3.5 w-3.5" />
                          GitHub Profile URL
                        </label>
                        <input 
                          id="field-githubUrl"
                          value={profile.githubUrl || ''} 
                          onChange={e => updateProfile({ githubUrl: e.target.value })} 
                          placeholder="e.g. https://github.com/username"
                          className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all" 
                        />
                      </div>
                    </div>
                  )}

                  {/* Edit Skills & Clubs */}
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
                        <label className="text-xs text-zinc-400 mb-2 block font-bold uppercase tracking-wide">Interests</label>
                        <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-950/60 rounded-2xl border border-white/5 max-h-48 overflow-y-auto">
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
                                  hasInterest ? 'gradient-primary text-primary-foreground glow-primary' : 'bg-zinc-900/40 text-zinc-400 hover:text-white'
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

                  {/* Edit Career & Projects */}
                  {editTab === 'career' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-zinc-400 mb-1.5 block font-bold uppercase tracking-wide flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-primary" />
                          Career Goals
                        </label>
                        <textarea 
                          id="field-careerGoals"
                          value={profile.careerGoals || ''} 
                          onChange={e => updateProfile({ careerGoals: e.target.value })} 
                          rows={3} 
                          placeholder="What are your career objectives?..."
                          className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all" 
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

                  <Button onClick={handleSave} disabled={isLoading} className="w-full gradient-primary rounded-2xl h-12 font-bold tracking-wide uppercase glow-primary mt-6">
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </motion.div>
              ) : (
                <motion.div 
                  key="view" 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }} 
                  className="space-y-6 w-full"
                >
                  
                  {/* Premium Segmented Navigation Tabs */}
                  <div className="relative flex bg-zinc-950/60 border border-white/5 p-1 rounded-2xl mb-6 overflow-x-auto hide-scrollbar scroll-smooth gap-1">
                    {[
                      { id: 'about', label: 'About' },
                      { id: 'photos', label: 'Photos' },
                      { id: 'videos', label: 'Videos' },
                      { id: 'projects', label: 'Projects' },
                      { id: 'achievements', label: 'Achievements' },
                      { id: 'friends', label: 'Friends' }
                    ].map(tab => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`relative py-2 px-4 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap z-10 flex-1 text-center ${
                            isActive ? 'text-white font-black' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeTabPill"
                              className="absolute inset-0 bg-violet-600/20 border border-violet-500/30 rounded-xl -z-10"
                              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            />
                          )}
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* TAB CONTENTS */}
                  <div className="w-full">
                    
                    {/* 1. ABOUT TAB */}
                    {activeTab === 'about' && (
                      <div className="space-y-6">
                        
                        {/* Mobile Only: Profile strength layout */}
                        <div className="block lg:hidden">
                          <div className="glass-card p-5 mb-5 border border-white/[0.08] bg-zinc-950/20 relative overflow-hidden">
                            <div className="flex items-center gap-4">
                              <span className="text-xl font-black text-white">{profileCompletion}%</span>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-white">{levelInfo.name}</p>
                                <p className="text-[10px] text-zinc-400">Profile strength score</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Academic CGPA Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="rounded-[24px] border border-white/[0.06] bg-zinc-950/20 p-5 flex flex-col justify-between shadow-lg">
                            <span className="text-[10px] text-zinc-450 font-extrabold uppercase tracking-widest">Academic CGPA</span>
                            <div className="flex items-baseline gap-1 mt-3">
                              <span className="text-3xl font-black text-[#16C784] tracking-tight">{profile.cgpa || '0.0'}</span>
                              <span className="text-xs text-zinc-450 font-semibold">/ 10.0</span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                              <div className="bg-[#16C784] h-full rounded-full transition-all duration-500" style={{ width: `${(profile.cgpa || 0) * 10}%` }} />
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-white/[0.06] bg-zinc-950/20 p-5 flex flex-col justify-between shadow-lg">
                            <span className="text-[10px] text-zinc-450 font-extrabold uppercase tracking-widest">Active Backlogs</span>
                            <div className="flex items-baseline gap-1 mt-3">
                              <span className={`text-3xl font-black tracking-tight ${profile.backlogs > 0 ? 'text-[#F04438]' : 'text-slate-200'}`}>
                                {profile.backlogs !== undefined ? profile.backlogs : '0'}
                              </span>
                              <span className="text-xs text-zinc-450 font-semibold">Pending</span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${profile.backlogs > 0 ? 'bg-[#F04438]' : 'bg-white/10'}`} style={{ width: profile.backlogs > 0 ? '50%' : '0%' }} />
                            </div>
                          </div>
                        </div>

                        {/* Objectives */}
                        {profile.careerGoals && (
                          <div className="rounded-[24px] border border-white/[0.06] bg-zinc-950/20 p-5 shadow-lg space-y-2">
                            <p className="text-[10px] text-zinc-450 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                              <Target className="h-4 w-4 text-primary" /> Career Objectives
                            </p>
                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">{profile.careerGoals}</p>
                          </div>
                        )}

                        {/* Skills */}
                        {profile.skills && profile.skills.length > 0 && (
                          <div className="rounded-[24px] border border-white/[0.06] bg-zinc-950/20 p-5 shadow-lg space-y-3">
                            <p className="text-[10px] text-zinc-450 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                              <Briefcase className="h-4 w-4 text-primary" /> Target Skills
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {profile.skills.map(s => (
                                <span key={s} className="text-[10px] px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 font-black uppercase tracking-wide">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Areas of Interest */}
                        {profile.interests && profile.interests.length > 0 && (
                          <div className="rounded-[24px] border border-white/[0.06] bg-zinc-950/20 p-5 shadow-lg space-y-3">
                            <p className="text-[10px] text-zinc-450 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-primary" /> Areas of Interest
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {profile.interests.map(i => (
                                <span key={i} className="text-[10px] px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 font-black uppercase tracking-wide">{i}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Clubs & Orgs */}
                        {profile.clubs && profile.clubs.length > 0 && (
                          <div className="rounded-[24px] border border-white/[0.06] bg-zinc-950/20 p-5 shadow-lg space-y-3">
                            <p className="text-[10px] text-zinc-450 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                              <Award className="h-4 w-4 text-primary" /> Clubs & Societies
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {profile.clubs.map(c => (
                                <span key={c} className="text-[10px] px-3 py-1.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 font-black uppercase tracking-wide">{c}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Saved Referrals Section */}
                        {savedReferrals && savedReferrals.length > 0 && (
                          <div className="rounded-[24px] border border-white/[0.06] bg-zinc-950/20 p-5 shadow-lg space-y-3">
                            <p className="text-[10px] text-zinc-450 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                              <Briefcase className="h-4 w-4 text-primary" /> Bookmarked Referrals
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {savedReferrals.map((ref) => (
                                <div key={ref.id || ref._id} className="flex flex-col bg-zinc-900/10 p-4 rounded-2xl border border-white/5 relative group">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="text-xs font-black text-white">{ref.jobTitle || ref.role}</h4>
                                      <p className="text-[10px] text-zinc-400 mt-0.5">{ref.companyName || ref.company} • {ref.location || 'Remote'}</p>
                                    </div>
                                    {(ref.applicationUrl || ref.applicationLink) && (
                                      <button
                                        onClick={() => {
                                          alumniProfileService.trackReferralClick(ref.id || ref._id).catch(console.error);
                                          alumniProfileService.trackReferralApply(ref.id || ref._id).catch(console.error);
                                          window.open(ref.applicationUrl || ref.applicationLink, '_blank');
                                        }}
                                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-black uppercase tracking-wider"
                                      >
                                        Apply
                                      </button>
                                    )}
                                  </div>
                                  {ref.description && (
                                    <p className="text-xs text-zinc-450 mt-2 line-clamp-2">{ref.description}</p>
                                  )}
                                  <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-white/5 text-[10px] text-zinc-500">
                                    <span className="font-semibold">By {ref.authorName}</span>
                                    <button
                                      onClick={async () => {
                                        try {
                                          if (!uid) return;
                                          await alumniProfileService.saveReferral(ref.id || ref._id, uid);
                                          setSavedReferrals(prev => prev.filter(r => (r.id || r._id) !== (ref.id || ref._id)));
                                          toast.success('Removed bookmark');
                                        } catch (err) {
                                          toast.error('Failed to unsave');
                                        }
                                      }}
                                      className="text-red-400 hover:text-red-500 font-bold uppercase tracking-wider"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. PHOTOS TAB */}
                    {activeTab === 'photos' && (
                      <div>
                        {profileMedia.length === 0 ? (
                          <div className="p-8 rounded-[24px] border border-white/5 bg-zinc-950/20 text-center text-zinc-400 text-xs italic">
                            No photos shared yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {profileMedia.map((m, idx) => {
                              const imageCount = m.images?.length || (m.image ? 1 : 0);
                              const hasVideo = (m.videos?.length > 0) || !!m.videoUrl;
                              const thumbnailSrc = m.images?.[0] || m.image || m.url || m.imageUrl;
                              
                              return (
                                <div 
                                  key={m.id || m._id || idx} 
                                  onClick={() => {
                                    if (m.id) {
                                      usePostDetailStore.getState().openPost(m.id);
                                    }
                                  }}
                                  className="aspect-square rounded-2xl overflow-hidden border border-white/5 bg-zinc-950/20 relative group cursor-pointer shadow-md transition-transform hover:scale-[1.02] duration-300"
                                >
                                  <img
                                    src={thumbnailSrc}
                                    alt={m.content || m.caption || "Post photo"}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                                    loading="lazy"
                                  />
                                  
                                  {/* Top-right Indicator Overlay */}
                                  <div className="absolute top-2.5 right-2.5 z-10 flex gap-1 items-center pointer-events-none bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-[9px] font-bold text-white">
                                    {hasVideo ? (
                                      <span>▶ Video</span>
                                    ) : imageCount > 1 ? (
                                      <span>📷 {imageCount}</span>
                                    ) : (
                                      <span>📷</span>
                                    )}
                                  </div>

                                  {/* Hover overlay stats */}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <div className="flex items-center gap-4 text-white font-extrabold text-sm">
                                      <span className="flex items-center gap-1.5 hover:text-red-400 transition-colors">
                                        <Heart className="w-4 h-4 fill-white hover:fill-red-400" />
                                        {m.likes || 0}
                                      </span>
                                      <span className="flex items-center gap-1.5 hover:text-violet-400 transition-colors">
                                        <MessageCircle className="w-4 h-4 fill-white hover:fill-violet-400" />
                                        {m.comments?.length || 0}
                                      </span>
                                    </div>
                                    <span className="text-[8px] text-zinc-300 uppercase tracking-widest font-bold">
                                      View Post Details
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4. VIDEOS TAB */}
                    {activeTab === 'videos' && (
                      <div className="p-8 rounded-[24px] border border-white/5 bg-zinc-950/20 text-center text-zinc-400 text-xs italic">
                        No videos uploaded yet.
                      </div>
                    )}

                    {/* 5. PROJECTS TAB */}
                    {activeTab === 'projects' && (
                      <div className="space-y-3">
                        {!profile.projects || profile.projects.length === 0 ? (
                          <div className="p-8 rounded-[24px] border border-white/5 bg-zinc-950/20 text-center text-zinc-400 text-xs italic">
                            No projects added yet.
                          </div>
                        ) : (
                          profile.projects.map((proj, idx) => (
                            <div key={idx} className="flex gap-4 items-center bg-zinc-950/20 border border-white/[0.04] p-4 rounded-2xl">
                              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <GraduationCap className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-200">{proj}</h4>
                                <p className="text-[10px] text-zinc-500 mt-0.5">Academic / Personal Project</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* 6. ACHIEVEMENTS TAB */}
                    {activeTab === 'achievements' && (
                      <div className="space-y-3">
                        {!profile.achievements || profile.achievements.length === 0 ? (
                          <div className="p-8 rounded-[24px] border border-white/5 bg-zinc-950/20 text-center text-zinc-400 text-xs italic">
                            No achievements added yet.
                          </div>
                        ) : (
                          profile.achievements.map((ach, idx) => (
                            <div key={idx} className="flex gap-4 items-center bg-zinc-950/20 border border-white/[0.04] p-4 rounded-2xl">
                              <div className="h-10 w-10 rounded-xl bg-[#16C784]/10 flex items-center justify-center flex-shrink-0">
                                <Trophy className="h-5 w-5 text-[#16C784]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-200">{ach}</h4>
                                <p className="text-[10px] text-[#16C784] font-semibold mt-0.5">Verified accomplishment</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    {/* 7. FRIENDS TAB */}
                    {activeTab === 'friends' && (
                      <div className="space-y-6">
                          {/* Search and Filters Glass Control Panel */}
                          <div className="glass-card p-5 border border-white/[0.08] bg-zinc-950/40 space-y-4">
                            <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
                              <div className="relative w-full lg:w-80">
                                <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-400" />
                                <input
                                  type="text"
                                  placeholder="Search students..."
                                  value={friendsSearchQuery}
                                  onChange={e => setFriendsSearchQuery(e.target.value)}
                                  className="w-full bg-zinc-900/60 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
                                />
                              </div>
                              
                              <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto justify-end">
                                <select
                                  value={friendsFilterDept}
                                  onChange={e => setFriendsFilterDept(e.target.value)}
                                  className="bg-zinc-900/60 border border-white/5 rounded-xl px-3 py-2.5 text-[11px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500/40 cursor-pointer"
                                >
                                  <option value="all">All Departments</option>
                                  {dynamicDepartments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                  ))}
                                </select>
                                
                                <select
                                  value={friendsFilterBatch}
                                  onChange={e => setFriendsFilterBatch(e.target.value)}
                                  className="bg-zinc-900/60 border border-white/5 rounded-xl px-3 py-2.5 text-[11px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500/40 cursor-pointer"
                                >
                                  <option value="all">All Batches</option>
                                  {dynamicBatches.map(batch => (
                                    <option key={batch} value={batch}>{batch}</option>
                                  ))}
                                </select>

                                <select
                                  value={friendsSortBy}
                                  onChange={e => setFriendsSortBy(e.target.value as any)}
                                  className="bg-zinc-900/60 border border-white/5 rounded-xl px-3 py-2.5 text-[11px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500/40 cursor-pointer"
                                >
                                  <option value="name">Sort: A-Z</option>
                                  <option value="name-desc">Sort: Z-A</option>
                                  <option value="recent">Sort: Recently Joined</option>
                                  <option value="mutual">Sort: Most Mutual Friends</option>
                                  <option value="active">Sort: Most Active</option>
                                </select>
                                
                                <button
                                  onClick={() => setFriendsFilterOnlineOnly(prev => !prev)}
                                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold border transition-all duration-300 ${
                                    friendsFilterOnlineOnly 
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                      : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${friendsFilterOnlineOnly ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'}`} />
                                  Online Only
                                </button>
                              </div>
                            </div>

                            {/* Segmented Sub-tabs */}
                            <div className="flex border-t border-white/5 pt-3 overflow-x-auto hide-scrollbar scroll-smooth gap-1">
                              {[
                                { id: 'all', label: 'Friends', count: profileFriends.length },
                                { id: 'requests', label: 'Requests', count: pendingRequests.length },
                                { id: 'suggestions', label: 'Suggestions', count: suggestions.length },
                                { id: 'mutual', label: 'Mutual', count: profileFriends.filter(f => (f.mutualCount || 0) > 0).length },
                                { id: 'recent', label: 'Recently Added', count: profileFriends.length },
                                { id: 'online', label: 'Online', count: profileFriends.filter(f => f.isOnline).length },
                                { id: 'blocked', label: 'Blocked', count: blockedUsersList.length }
                              ].map(sub => {
                                const isActive = friendsSubTab === sub.id;
                                return (
                                  <button
                                    key={sub.id}
                                    onClick={() => setFriendsSubTab(sub.id as any)}
                                    className={`relative py-1.5 px-3.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap ${
                                      isActive ? 'bg-violet-600 text-white shadow-lg' : 'bg-transparent text-zinc-400 hover:text-zinc-200'
                                    }`}
                                  >
                                    {sub.label}
                                    {sub.count > 0 && (
                                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-450'}`}>
                                        {sub.count}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Friends Empty State & Suggestions */}
                          {displayCount === 0 && (
                            <div className="space-y-8">
                              {profileFriends.length === 0 && (friendsSubTab === 'all' || friendsSubTab === 'recent') ? (
                                 /* Premium Onboarding Empty State */
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.98 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="glass-card p-10 border border-white/[0.08] bg-zinc-950/20 text-center flex flex-col items-center justify-center relative overflow-hidden"
                                >
                                  <div className="absolute inset-0 bg-radial-gradient from-violet-500/5 to-transparent pointer-events-none" />
                                  <div className="h-16 w-16 rounded-[24px] bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/10 mb-5 text-white">
                                    <Users className="h-8 w-8" />
                                  </div>
                                  <h3 className="font-display text-lg sm:text-xl font-black text-white tracking-tight mb-2">
                                    Your network starts here
                                  </h3>
                                  <p className="text-xs text-zinc-400 max-w-sm leading-relaxed mb-6 font-medium">
                                    Connect with your classmates, share insights, find mentors, and grow your professional college circle. Let's make your network alive!
                                  </p>
                                  
                                  <div className="flex flex-wrap gap-3 justify-center">
                                    <Button 
                                      onClick={() => setFriendsSubTab('suggestions')} 
                                      className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-5 h-10 rounded-xl transition-all duration-300"
                                    >
                                      Find Friends
                                    </Button>
                                    <Button 
                                      onClick={() => navigate('/alumni/discover')} 
                                      className="bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white text-xs font-bold px-5 h-10 rounded-xl transition-all duration-300"
                                    >
                                      Explore Students
                                    </Button>
                                    <Button 
                                      onClick={() => setShowInviteModal(true)} 
                                      className="bg-gradient-to-r from-violet-500 to-indigo-500 hover:opacity-90 text-white text-xs font-bold px-5 h-10 rounded-xl shadow-lg transition-all duration-300"
                                    >
                                      Invite Friends
                                    </Button>
                                  </div>
                                </motion.div>
                              ) : (
                                /* Clean Localized Tab-Specific Empty State */
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="glass-card p-8 border border-white/5 bg-zinc-950/20 text-center flex flex-col items-center justify-center rounded-2xl"
                                >
                                  <div className="h-10 w-10 rounded-xl bg-white/5 text-zinc-400 flex items-center justify-center mb-3">
                                    <Users className="h-5 w-5" />
                                  </div>
                                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                    {friendsSubTab === 'requests' && 'No Pending Requests'}
                                    {friendsSubTab === 'suggestions' && 'No Recommendations'}
                                    {friendsSubTab === 'online' && 'No Friends Online'}
                                    {friendsSubTab === 'blocked' && 'No Blocked Users'}
                                    {friendsSubTab === 'mutual' && 'No Mutual Friends'}
                                    {(friendsSubTab === 'all' || friendsSubTab === 'recent') && 'No friends matching filters'}
                                  </h4>
                                  <p className="text-[10px] text-zinc-400 mt-1 max-w-xs leading-relaxed font-medium">
                                    {friendsSubTab === 'requests' && 'You have resolved all incoming peer connection requests.'}
                                    {friendsSubTab === 'suggestions' && 'Check back later for personalized classmate discovery.'}
                                    {friendsSubTab === 'online' && 'None of your connected peers are active right now.'}
                                    {friendsSubTab === 'blocked' && 'You have not blocked any campus accounts.'}
                                    {friendsSubTab === 'mutual' && 'No overlapping classmates found with this student.'}
                                    {(friendsSubTab === 'all' || friendsSubTab === 'recent') && 'Try adjusting your search query or department filters.'}
                                  </p>
                                </motion.div>
                              )}

                              {/* People You May Know - Suggestions Tray */}
                              {suggestions.length > 0 && (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-display text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                                      <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" /> People You May Know
                                    </h4>
                                  </div>
                                  
                                  <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
                                    {suggestions.map((sug, i) => (
                                      <motion.div
                                        key={sug.userId}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="snap-start flex-shrink-0 w-72 glass-card p-4 border border-white/[0.08] bg-zinc-950/40 rounded-2xl flex flex-col justify-between"
                                      >
                                        <div className="flex gap-3">
                                          <img
                                            src={sug.profileImageUrl || (sug.photos && sug.photos[0]) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sug.userId}`}
                                            alt=""
                                            className="h-12 w-12 rounded-xl object-cover border border-white/5"
                                          />
                                          <div className="min-w-0 flex-1">
                                            <h5 className="text-xs font-bold text-white truncate flex items-center gap-1">
                                              {sug.name}
                                              {sug.isOnline && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                                            </h5>
                                            <p className="text-[10px] text-zinc-400 truncate">{sug.department || 'General'} • Batch {sug.batch || 'N/A'}</p>
                                            <p className="text-[9px] text-zinc-550 truncate mt-1">SR University</p>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                                          <span className="text-[9px] text-zinc-450 font-bold">{mutualCounts[sug.userId] || 0} Mutual Friends</span>
                                          <Button
                                            onClick={async () => {
                                              try {
                                                const res = await matchApi.sendConnectionRequest(sug.userId);
                                                if (res && res.success) {
                                                  toast.success(`Request sent to ${sug.name}!`);
                                                  fetchSuggestions();
                                                  fetchConnectionRequests();
                                                }
                                              } catch (err) {
                                                toast.error('Failed to send request');
                                              }
                                            }}
                                            className="h-7 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-[10px] font-bold"
                                          >
                                            Add Friend
                                          </Button>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Friends list main responsive grid */}
                          {displayCount > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              {/* 1. Render FRIENDS Tab */}
                              {(friendsSubTab === 'all' || friendsSubTab === 'recent' || friendsSubTab === 'online' || friendsSubTab === 'mutual') && (
                                filteredFriends
                                  .filter(f => friendsSubTab !== 'online' || f.isOnline)
                                  .filter(f => friendsSubTab !== 'mutual' || (f.mutualCount || 0) > 0)
                                  .map((friend, idx) => (
                                    <FriendCard
                                      key={friend.id}
                                      friend={friend}
                                      idx={idx}
                                      navigate={navigate}
                                      mutualCounts={mutualCounts}
                                      setSelectedMutualFriends={setSelectedMutualFriends}
                                      handleRemoveFriend={handleRemoveFriend}
                                      handleBlockUser={handleBlockUser}
                                      chatWithUser={chatWithUser}
                                      activeMenuId={activeFriendMenuId}
                                      setActiveMenuId={setActiveFriendMenuId}
                                    />
                                  ))
                              )}

                              {/* 2. Render Friend REQUESTS Tab */}
                              {friendsSubTab === 'requests' && (
                                filteredRequests.map((req, idx) => (
                                  <motion.div
                                    key={req.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="glass-card p-4 border border-white/[0.08] bg-zinc-950/20 rounded-2xl flex flex-col justify-between"
                                  >
                                    <div className="flex gap-3">
                                      <img
                                        src={req.fromUser?.photos?.[0] || 'https://api.dicebear.com/7.x/avataaars/svg?seed=student'}
                                        alt=""
                                        className="h-12 w-12 rounded-xl object-cover border border-white/5"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">{req.fromUser?.name || 'A Student'}</h4>
                                        <p className="text-[10px] text-zinc-400 mt-0.5">Wants to connect 💌</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                                      <Button
                                        onClick={async () => {
                                          setPendingRequests(prev => prev.filter(r => r.id !== req.id));
                                          toast.info('Request declined');
                                        }}
                                        className="flex-1 h-8 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-[10px] font-bold border border-white/5"
                                      >
                                        Decline
                                      </Button>
                                      <Button
                                        onClick={async () => {
                                          try {
                                            const res = await matchApi.acceptRequest(req.id);
                                            if (res && res.success) {
                                              toast.success('Connected successfully!');
                                              fetchStats();
                                              fetchConnectionRequests();
                                            }
                                          } catch (err) {
                                            toast.error('Failed to accept connection');
                                          }
                                        }}
                                        className="flex-1 h-8 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-bold"
                                      >
                                        Accept
                                      </Button>
                                    </div>
                                  </motion.div>
                                ))
                              )}

                              {/* 3. Render SUGGESTIONS Tab */}
                              {friendsSubTab === 'suggestions' && (
                                filteredSuggestions.map((sug, idx) => (
                                  <motion.div
                                    key={sug.userId}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="glass-card p-4 border border-white/[0.08] bg-zinc-950/20 rounded-2xl flex flex-col justify-between"
                                  >
                                    <div className="flex gap-3">
                                      <img
                                        src={sug.profileImageUrl || (sug.photos && sug.photos[0]) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sug.userId}`}
                                        alt=""
                                        className="h-12 w-12 rounded-xl object-cover border border-white/5"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">{sug.name}</h4>
                                        <p className="text-[10px] text-zinc-400 mt-0.5">{sug.department || 'General'} • Batch {sug.batch || 'N/A'}</p>
                                      </div>
                                    </div>
                                    <Button
                                      onClick={async () => {
                                        try {
                                          const res = await matchApi.sendConnectionRequest(sug.userId);
                                          if (res && res.success) {
                                            toast.success(`Request sent to ${sug.name}!`);
                                            fetchSuggestions();
                                            fetchConnectionRequests();
                                          }
                                        } catch (err) {
                                          toast.error('Failed to send request');
                                        }
                                      }}
                                      className="w-full h-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-bold mt-4"
                                    >
                                      Add Friend
                                    </Button>
                                  </motion.div>
                                ))
                              )}

                              {/* 4. Render BLOCKED Tab */}
                              {friendsSubTab === 'blocked' && (
                                filteredBlocked.map((u, idx) => (
                                  <motion.div
                                    key={u.userId}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="glass-card p-4 border border-white/[0.08] bg-zinc-950/20 rounded-2xl flex items-center justify-between"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">{u.name}</h4>
                                      <p className="text-[10px] text-zinc-550 truncate">{u.email}</p>
                                    </div>
                                    <Button
                                      onClick={() => handleUnblockUser(u.userId)}
                                      className="h-8 bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-350 hover:text-white rounded-xl text-[10px] font-bold"
                                    >
                                      Unblock
                                    </Button>
                                  </motion.div>
                                ))
                              )}
                            </div>
                          )}

                          {/* Floating Invite Friends trigger */}
                          <div className="fixed bottom-24 right-6 z-40 hidden md:block">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setShowInviteModal(true)}
                              className="px-5 py-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-xl flex items-center gap-2 border border-violet-500/20 glow-primary"
                            >
                              <Plus className="w-4 h-4" /> Invite Classmates
                            </motion.button>
                          </div>
                        </div>
                      )}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Panel widgets (25% Width) */}
          <div className="lg:col-span-1 space-y-6 sticky top-6 hidden lg:block">
            
            {/* Widget 1: Profile strength ring */}
            <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/40 p-5 space-y-4 shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
              <span className="text-[10px] text-zinc-450 font-black uppercase tracking-widest block">Profile Completeness</span>
              
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      className="stroke-white/5"
                      strokeWidth="4.5"
                      fill="transparent"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      className="stroke-primary"
                      strokeWidth="4.5"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 26}
                      strokeDashoffset={2 * Math.PI * 26 - (2 * Math.PI * 26 * profileCompletion) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-black text-white">{profileCompletion}%</span>
                  </div>
                </div>
                
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white truncate">{levelInfo.name}</h4>
                  <p className="text-[9px] text-zinc-450 mt-0.5 leading-snug">Strengthen profile to boost platform visibility.</p>
                </div>
              </div>

              {missingItems.length > 0 && (
                <div className="space-y-1.5 pt-3 border-t border-white/5">
                  <span className="text-[9px] text-zinc-450 font-extrabold uppercase tracking-wide block">Next Steps:</span>
                  <div className="space-y-1">
                    {missingItems.slice(0, 2).map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleMissingItemClick(item.tab, item.id)}
                        className="w-full text-[10px] text-zinc-350 hover:text-primary transition-colors flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                      >
                        <span>{item.actionText}</span>
                        <span className="font-bold">+</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Widget 2: Recent Profile Viewers */}
            <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/40 p-5 space-y-4 shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
              <span className="text-[10px] text-zinc-450 font-black uppercase tracking-widest block flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-primary" /> Profile Viewers
              </span>
              
              {viewersLoading ? (
                <span className="text-[10px] text-zinc-500 italic block">Loading viewers...</span>
              ) : viewers && viewers.length > 0 ? (
                <div className="space-y-2.5">
                  {viewers.slice(0, 4).map(v => (
                    <div key={v._id} className="flex items-center gap-2.5">
                      <img
                        src={v.viewerId?.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.viewerId?.email}`}
                        alt=""
                        className="h-8 w-8 rounded-full border border-white/5 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{v.viewerId?.name}</h4>
                        <span className="text-[9px] text-zinc-550 block">Viewed profile recently</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-zinc-500 italic block">No recent views.</span>
              )}
            </div>

            {/* Widget 3: Quick Settings Action Panel */}
            <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/40 p-5 space-y-2 shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
              <span className="text-[10px] text-zinc-450 font-black uppercase tracking-widest block mb-2">Quick Shortcuts</span>
              
              {[
                { label: 'Privacy & Safety', icon: Shield, path: '/settings/privacy', color: 'text-primary bg-primary/10' },
                { label: 'Help & Support', icon: HelpCircle, path: '/support', color: 'text-zinc-400 bg-secondary' },
                { label: 'Block & Report', icon: UserX, action: () => setShowBlock(true), color: 'text-accent bg-accent/10' },
              ].map((act, idx) => (
                <button
                  key={idx}
                  onClick={() => act.action ? act.action() : navigate(act.path!)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-all text-left border border-white/[0.02]"
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${act.color}`}>
                    <act.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs text-zinc-300 font-bold">{act.label}</span>
                </button>
              ))}

              <button 
                onClick={async () => {
                  setLoggingOut(true);
                  try {
                    await logout();
                  } catch (e) {
                    setLoggingOut(false);
                  }
                }}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/10 transition-all text-left border border-red-500/10 mt-2"
              >
                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-500/10 text-red-400">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="text-xs text-red-400 font-extrabold">{loggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
            
          </div>

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

      {/* Invite Friends Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInviteModal(false)}
            className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="glass-strong rounded-[24px] p-6 w-full max-w-md border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] text-center relative"
            >
              <button
                onClick={() => setShowInviteModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="h-12 w-12 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center mx-auto mb-4 border border-violet-500/20">
                <Share2 className="w-6 h-6 animate-pulse" />
              </div>

              <h3 className="font-display text-base font-black text-white tracking-tight mb-1">Invite Classmates</h3>
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mb-6 font-medium">
                Share this QR code or invite link to get your fellow students and alumni connected on CampusConnect!
              </p>

              {/* QR Code section */}
              <div className="bg-white p-3 rounded-2xl w-44 h-44 mx-auto mb-6 flex items-center justify-center shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/setup?referrer=${uid}`)}`}
                  alt="CampusConnect Invite QR"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Link copying container */}
              <div className="flex gap-2 bg-zinc-900/60 border border-white/5 p-1.5 rounded-xl mb-6 items-center justify-between">
                <span className="text-[10px] text-zinc-450 truncate pl-2 flex-1 text-left">
                  {`${window.location.origin}/setup?referrer=${uid}`}
                </span>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/setup?referrer=${uid}`);
                    toast.success('Invitation link copied successfully!');
                  }}
                  className="h-8 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold rounded-lg px-3 flex items-center gap-1.5"
                >
                  <Copy className="w-3 h-3" /> Copy
                </Button>
              </div>

              {/* Sharing Grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'WhatsApp', href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`Hey, connect with me on CampusConnect: ${window.location.origin}/setup?referrer=${uid}`)}`, color: 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-600/20' },
                  { label: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/setup?referrer=${uid}`)}&text=${encodeURIComponent('Join CampusConnect Network!')}`, color: 'bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600/20' },
                  { label: 'Email', href: `mailto:?subject=Join CampusConnect&body=${encodeURIComponent(`Connect with me on CampusConnect: ${window.location.origin}/setup?referrer=${uid}`)}`, color: 'bg-zinc-805 text-zinc-300 border-white/5 hover:bg-zinc-700' }
                ].map(share => (
                  <a
                    key={share.label}
                    href={share.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`py-2 border rounded-xl text-[10px] font-bold text-center transition-all ${share.color}`}
                  >
                    {share.label}
                  </a>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mutual Friends Modal */}
      <AnimatePresence>
        {selectedMutualFriends && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMutualFriends(null)}
            className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="glass-strong rounded-[24px] p-6 w-full max-w-sm border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] relative"
            >
              <button
                onClick={() => setSelectedMutualFriends(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-display text-base font-black text-white tracking-tight mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" /> Mutual Connections
              </h3>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 hide-scrollbar">
                {selectedMutualFriends.map((mut, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${mut.name}`}
                      alt=""
                      className="h-8 w-8 rounded-full border border-white/5 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{mut.name}</h4>
                      <p className="text-[9px] text-zinc-400 truncate">{mut.dept || 'CSE'} Department</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageViewer
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        images={profileMedia}
        currentIndex={selectedImageIndex}
        onIndexChange={setSelectedImageIndex}
      />

      <PostDetailModal />
      <BottomTabBar />
    </div>
  );
}
