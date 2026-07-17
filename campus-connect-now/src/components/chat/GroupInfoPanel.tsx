import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Users, Shield, ShieldCheck, Trash2, LogOut, Check, Search, 
  Link, Copy, Plus, Crown, RefreshCw, FileText, Image as ImageIcon, 
  Video, Link2, MessageSquare, Edit2, CheckSquare, MoreVertical, 
  Info, AlertTriangle, QrCode, Volume2, VolumeX, Eye, UserPlus, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useGroupChatStore } from '@/store/groupChatStore';
import { socketService } from '@/services/socketService';
import { getApiUrl } from '@/services/connectionService';
import { toast } from 'sonner';
import UserProfilePanel from '@/components/chat/UserProfilePanel';

interface Member {
  id: string;
  name: string;
  avatar: string;
  department: string;
  batch: string;
  college: string;
  isOnline: boolean;
  lastSeen: string;
  role: 'owner' | 'admin' | 'member';
}

interface ActivityLog {
  _id?: string;
  circleId: string;
  actorName: string;
  action: string;
  targetName?: string;
  timestamp: string;
}

interface MediaAssets {
  photos: any[];
  videos: any[];
  documents: any[];
  links: any[];
}

export default function GroupInfoPanel({
  groupId,
  onClose
}: {
  groupId: string;
  onClose: () => void;
}) {
  const currentUserId = useAuthStore(s => s._id) || useAuthStore(s => s.uid);
  const token = localStorage.getItem('token') || '';
  
  // Local States
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [media, setMedia] = useState<MediaAssets>({ photos: [], videos: [], documents: [], links: [] });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [memberQuery, setMemberQuery] = useState('');
  
  // Edit Circle State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  
  // Settings & Modal States
  const [inviteData, setInviteData] = useState<{ inviteCode: string; inviteLink: string } | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [nonMembers, setNonMembers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Interactive Popup States
  const [activeMenuMemberId, setActiveMenuMemberId] = useState<string | null>(null);
  const [selectedMemberProfileId, setSelectedMemberProfileId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Mute State (local storage backed)
  const [isMuted, setIsMuted] = useState(() => {
    try {
      const muted = JSON.parse(localStorage.getItem('muted_circles') || '[]');
      return muted.includes(groupId);
    } catch {
      return false;
    }
  });

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  // Fetch all info
  const fetchAllData = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      // Fetch details
      const detailRes = await fetch(`${getApiUrl()}/api/circles/${groupId}`, { headers: getHeaders() });
      const detailJson = await detailRes.json();
      if (detailJson.success) {
        setGroup(detailJson.data);
        setEditName(detailJson.data.name);
        setEditDesc(detailJson.data.description || '');
      }

      // Fetch members
      const membersRes = await fetch(`${getApiUrl()}/api/circles/${groupId}/members`, { headers: getHeaders() });
      const membersJson = await membersRes.json();
      if (membersJson.success) setMembers(membersJson.data);

      // Fetch media
      const mediaRes = await fetch(`${getApiUrl()}/api/circles/${groupId}/media`, { headers: getHeaders() });
      const mediaJson = await mediaRes.json();
      if (mediaJson.success) setMedia(mediaJson.data);

      // Fetch activity
      const activityRes = await fetch(`${getApiUrl()}/api/circles/${groupId}/activity`, { headers: getHeaders() });
      const activityJson = await activityRes.json();
      if (activityJson.success) setActivities(activityJson.data);

    } catch (err) {
      console.error(err);
      toast.error('Failed to load group details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [groupId]);

  // Real-time socket updates
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !groupId) return;

    const handleCircleUpdated = ({ circleId, updates }: any) => {
      if (circleId === groupId) {
        setGroup((prev: any) => ({ ...prev, ...updates }));
      }
    };

    const handleMembersUpdated = ({ circleId, members: newMembersList }: any) => {
      if (circleId === groupId) {
        // Refetch members detail list
        fetch(`${getApiUrl()}/api/circles/${groupId}/members`, { headers: getHeaders() })
          .then(res => res.json())
          .then(json => {
            if (json.success) setMembers(json.data);
          });
      }
    };

    const handleNewActivity = (act: any) => {
      if (act.circleId === groupId) {
        setActivities(prev => [act, ...prev].slice(0, 50));
      }
    };

    const handleCircleDeleted = ({ circleId }: any) => {
      if (circleId === groupId) {
        toast.warning('This circle was deleted by the owner.');
        onClose();
      }
    };

    socket.on('circleUpdated', handleCircleUpdated);
    socket.on('membersUpdated', handleMembersUpdated);
    socket.on('newCircleActivity', handleNewActivity);
    socket.on('circleDeleted', handleCircleDeleted);

    return () => {
      socket.off('circleUpdated', handleCircleUpdated);
      socket.off('membersUpdated', handleMembersUpdated);
      socket.off('newCircleActivity', handleNewActivity);
      socket.off('circleDeleted', handleCircleDeleted);
    };
  }, [groupId]);

  // Handle Mute
  const toggleMute = () => {
    try {
      const muted = JSON.parse(localStorage.getItem('muted_circles') || '[]');
      let updated;
      if (isMuted) {
        updated = muted.filter((id: string) => id !== groupId);
        toast.success('Circle unmuted 🔊');
      } else {
        updated = [...muted, groupId];
        toast.success('Circle notifications muted 🔇');
      }
      localStorage.setItem('muted_circles', JSON.stringify(updated));
      setIsMuted(!isMuted);
    } catch (e) {
      console.error(e);
    }
  };

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuMemberId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute stats and roles
  const stats = useMemo(() => {
    const total = members.length;
    const online = members.filter(m => m.isOnline).length;
    const owner = members.find(m => m.role === 'owner');
    const admins = members.filter(m => m.role === 'admin');
    const normalMembers = members.filter(m => m.role === 'member');
    
    // User role check
    const currentUserProfile = members.find(m => m.id === currentUserId);
    const userRole = currentUserProfile?.role || 'member';

    return { total, online, owner, admins, normalMembers, userRole };
  }, [members, currentUserId]);

  // Filter members list based on query
  const filteredMembers = useMemo(() => {
    if (!memberQuery.trim()) return members;
    const q = memberQuery.toLowerCase();
    return members.filter(m => 
      (m.name || '').toLowerCase().includes(q) ||
      (m.department || '').toLowerCase().includes(q) ||
      (m.batch || '').toLowerCase().includes(q) ||
      (m.role || '').toLowerCase().includes(q)
    );
  }, [members, memberQuery]);

  // Actions handlers
  const handleSaveSettings = async () => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/circles/${groupId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Circle settings updated!');
        setIsEditing(false);
      } else {
        toast.error(json.error || 'Failed to update details.');
      }
    } catch {
      toast.error('Connection error.');
    }
  };

  const handleRoleAction = async (targetUserId: string, action: 'promote' | 'demote') => {
    try {
      const res = await fetch(`${getApiUrl()}/api/circles/${groupId}/member-role`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ targetUserId, action })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(action === 'promote' ? 'Promoted to admin 🛡️' : 'Demoted from admin 👤');
        fetchAllData();
      } else {
        toast.error(json.error || 'Role change failed.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setActiveMenuMemberId(null);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/circles/${groupId}/members/${targetUserId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Member removed from circle.');
        fetchAllData();
      } else {
        toast.error(json.error || 'Removal failed.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setActiveMenuMemberId(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you absolutely sure you want to leave this circle?')) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/circles/${groupId}/members/${currentUserId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Left circle successfully.');
        onClose();
        // Update local chats list
        useGroupChatStore.setState(s => ({
          groups: s.groups.filter(g => g.id !== groupId)
        }));
      } else {
        toast.error(json.error || 'Leave request failed.');
      }
    } catch {
      toast.error('Network error.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm('🚨 WARNING: Deleting the group is permanent! It will wipe all messages, logs, and files. Continue?')) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/circles/${groupId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Circle deleted successfully.');
        onClose();
        useGroupChatStore.setState(s => ({
          groups: s.groups.filter(g => g.id !== groupId)
        }));
      } else {
        toast.error(json.error || 'Delete failed.');
      }
    } catch {
      toast.error('Network error.');
    }
  };

  const handleGenerateInvite = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/circles/${groupId}/invite`, {
        method: 'POST',
        headers: getHeaders()
      });
      const json = await res.json();
      if (json.success) {
        setInviteData(json.data);
      } else {
        toast.error('Invite creation failed.');
      }
    } catch {
      toast.error('Invite network error.');
    }
  };

  const handleCopyInvite = () => {
    if (!inviteData) return;
    navigator.clipboard.writeText(inviteData.inviteLink);
    toast.success('Invite link copied! 🔗');
  };

  // Add members logic
  const loadEligibleNonMembers = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/connections`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success) {
        const matchedUsers = (json.data || []).map((m: any) => m.user).filter(Boolean);
        const filtered = matchedUsers.filter((u: any) => !members.some(m => m.id === u.id));
        setNonMembers(filtered);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMembersSubmit = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/circles/${groupId}/members`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ memberIds: selectedUserIds })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Added ${selectedUserIds.length} member${selectedUserIds.length > 1 ? 's' : ''} successfully.`);
        setSelectedUserIds([]);
        setShowAddMembers(false);
        fetchAllData();
      } else {
        toast.error(json.error || 'Add members failed.');
      }
    } catch {
      toast.error('Network error.');
    }
  };

  // Activity logs text generators
  const renderActivityText = (log: ActivityLog) => {
    const actor = <span className="font-bold text-white">{log.actorName}</span>;
    const target = log.targetName ? <span className="font-bold text-violet-400">{log.targetName}</span> : '';

    switch (log.action) {
      case 'create':
        return <span>{actor} created the circle group.</span>;
      case 'join':
        return <span>{actor} joined the circle {target && <>via {target}</>}.</span>;
      case 'leave':
        return <span>{actor} left the circle.</span>;
      case 'remove':
        return <span>{actor} removed {target} from the circle.</span>;
      case 'name_change':
        return <span>{actor} changed group name to: {target}.</span>;
      case 'description_change':
        return <span>{actor} changed description.</span>;
      case 'photo_change':
        return <span>{actor} updated group photo.</span>;
      case 'promote':
        return <span>{actor} promoted {target} to Admin. 🛡️</span>;
      case 'demote':
        return <span>{actor} demoted {target} from Admin. 👤</span>;
      default:
        return <span>{actor} completed {log.action} action.</span>;
    }
  };

  if (loading && !group) {
    return (
      <div className="w-[360px] h-full bg-[#0A0A0F] border-l border-zinc-900 p-6 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="h-6 w-6 text-violet-500 animate-spin" />
        <p className="text-xs text-zinc-555 font-medium">Loading details...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="w-[360px] h-full bg-[#0A0A0F] border-l border-zinc-900 p-6 flex flex-col items-center justify-center">
        <Info className="h-6 w-6 text-red-500 mb-2" />
        <p className="text-xs text-zinc-400">Circle details unavailable.</p>
        <button onClick={onClose} className="mt-4 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-xs text-white rounded-lg">Close</button>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex lg:flex-col border-l border-zinc-900 h-full bg-[#0A0A0F] overflow-y-auto overflow-x-hidden p-6 space-y-6 scrollbar-thin shrink-0 select-none w-[360px] min-w-[360px] max-w-[360px] text-zinc-300">
      
      {/* Panel Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
        <h3 className="font-bold text-sm text-white">Circle Details</h3>
        <button onClick={onClose} className="text-zinc-550 hover:text-white transition-colors">
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* 1. Group Header Section */}
      <div className="flex flex-col items-center text-center pb-5 border-b border-zinc-900 space-y-3">
        <div className="relative">
          <img
            src={group.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${group.name}`}
            alt=""
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="100%" height="100%" fill="%2327272a"/><text x="50%" y="55%" font-size="24" font-family="sans-serif" font-weight="bold" fill="%23a1a1aa" dominant-baseline="middle" text-anchor="middle">CC</text></svg>';
            }}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-violet-500/20 bg-zinc-900"
          />
          {stats.online > 0 && (
            <span className="absolute bottom-0 right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0A0A0F] bg-green-400" />
          )}
        </div>

        {isEditing ? (
          <div className="w-full space-y-2 text-left">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full bg-[#111117] border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
            />
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              className="w-full bg-[#111117] border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none h-16 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 py-1 text-center bg-zinc-900 hover:bg-zinc-850 rounded-lg text-[10px] text-zinc-400">Cancel</button>
              <button onClick={handleSaveSettings} className="flex-1 py-1 text-center bg-violet-650 hover:bg-violet-750 text-white rounded-lg text-[10px] font-bold">Save</button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <h4 className="text-sm font-extrabold text-white truncate max-w-[200px]">{group.name}</h4>
              {(stats.userRole === 'owner' || stats.userRole === 'admin') && (
                <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-zinc-900 rounded text-zinc-550 hover:text-white">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-medium px-4">{group.description || 'Welcome to this circle!'}</p>
          </div>
        )}

        {/* Group Meta Info */}
        <div className="grid grid-cols-2 gap-2 w-full pt-3 text-left">
          <div className="bg-[#111117] p-2 rounded-xl border border-zinc-900/60">
            <span className="text-[9px] text-zinc-550 block font-semibold">COLLEGE</span>
            <span className="text-[10px] text-zinc-350 truncate block font-bold">{group.college}</span>
          </div>
          <div className="bg-[#111117] p-2 rounded-xl border border-zinc-900/60">
            <span className="text-[9px] text-zinc-550 block font-semibold">PRIVACY</span>
            <span className="text-[10px] text-zinc-350 block capitalize font-bold">{group.privacy || 'Public'} Circle</span>
          </div>
          <div className="bg-[#111117] p-2 rounded-xl border border-zinc-900/60">
            <span className="text-[9px] text-zinc-550 block font-semibold">MEMBERS</span>
            <span className="text-[10px] text-zinc-350 block font-bold">{stats.total} total ({stats.online} online)</span>
          </div>
          <div className="bg-[#111117] p-2 rounded-xl border border-zinc-900/60">
            <span className="text-[9px] text-zinc-550 block font-semibold">CREATED ON</span>
            <span className="text-[10px] text-zinc-350 block font-bold">{new Date(group.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* 2. Members & Action section */}
      <div className="space-y-3.5 pb-4 border-b border-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Group Members</span>
        </div>

        {/* Members Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-650" />
          <input
            type="text"
            placeholder="Search by name or department..."
            value={memberQuery}
            onChange={e => setMemberQuery(e.target.value)}
            className="w-full bg-[#111117] border border-zinc-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-650 outline-none"
          />
        </div>

        {/* Add People Action Button (Owner/Admin only) */}
        {(stats.userRole === 'owner' || stats.userRole === 'admin') && (
          <button 
            onClick={() => {
              setShowAddMembers(true);
              loadEligibleNonMembers();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#0D0D14]/60 backdrop-blur-md border border-violet-500/30 hover:border-violet-500/50 hover:bg-violet-500/5 hover:shadow-[0_0_15px_rgba(124,58,237,0.12)] transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 transition-all duration-200 group-hover:scale-105 group-hover:bg-violet-600/20">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-white block">Add People</span>
                <span className="text-[9px] text-zinc-450 font-bold block mt-0.5">Invite CampusConnect friends</span>
              </div>
            </div>
            <Plus className="w-4 h-4 text-zinc-550 group-hover:text-white transition-colors" />
          </button>
        )}

        {/* Member cards lists */}
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto scrollbar-thin">
          {filteredMembers.map(m => {
            const isMenuOpen = activeMenuMemberId === m.id;
            return (
              <div key={m.id} className="relative flex items-center justify-between p-2 rounded-xl bg-zinc-950/20 border border-zinc-900/60 hover:bg-zinc-950/40">
                <div 
                  onClick={() => setSelectedMemberProfileId(m.id)}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="relative shrink-0">
                    <img
                      src={m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover bg-zinc-900"
                    />
                    {m.isOnline && (
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-black bg-green-400" />
                    )}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white truncate max-w-[120px]">{m.name}</span>
                      {m.role === 'owner' && <Crown className="w-3 h-3 text-amber-400 shrink-0" title="Owner" />}
                      {m.role === 'admin' && <ShieldCheck className="w-3 h-3 text-violet-400 shrink-0" title="Admin" />}
                    </div>
                    <span className="text-[9px] text-zinc-550 font-medium block truncate max-w-[150px]">
                      {m.department} • Class of {m.batch}
                    </span>
                  </div>
                </div>

                {/* Member contextual actions button */}
                {m.id !== currentUserId && (
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenuMemberId(isMenuOpen ? null : m.id)}
                      className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-550 hover:text-white"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Popover Action Menu */}
                    <AnimatePresence>
                      {isMenuOpen && (
                        <motion.div
                          ref={menuRef}
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -5 }}
                          className="absolute right-0 top-7 w-44 bg-[#111117] border border-zinc-800 rounded-xl shadow-2xl z-[100] py-1.5 overflow-hidden text-left"
                        >
                          <button
                            onClick={() => {
                              setSelectedMemberProfileId(m.id);
                              setActiveMenuMemberId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-[11px] text-zinc-450 hover:bg-zinc-905 hover:text-white flex items-center gap-2"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" /> View Profile
                          </button>

                          {/* Owner / Admin specific operations */}
                          {stats.userRole === 'owner' && m.role === 'member' && (
                            <button
                              onClick={() => handleRoleAction(m.id, 'promote')}
                              className="w-full text-left px-3 py-1.5 text-[11px] text-zinc-450 hover:bg-zinc-905 hover:text-white flex items-center gap-2"
                            >
                              <Shield className="w-3.5 h-3.5 text-green-400" /> Make Admin
                            </button>
                          )}
                          {stats.userRole === 'owner' && m.role === 'admin' && (
                            <button
                              onClick={() => handleRoleAction(m.id, 'demote')}
                              className="w-full text-left px-3 py-1.5 text-[11px] text-zinc-450 hover:bg-zinc-905 hover:text-white flex items-center gap-2"
                            >
                              <Shield className="w-3.5 h-3.5 text-amber-505" /> Remove Admin
                            </button>
                          )}
                          {/* Remove from group options */}
                          {((stats.userRole === 'owner' || stats.userRole === 'admin') && m.role !== 'owner') && (
                            <button
                              onClick={() => handleRemoveMember(m.id)}
                              className="w-full text-left px-3 py-1.5 text-[11px] text-red-400 hover:bg-zinc-905/65 hover:text-red-300 flex items-center gap-2 border-t border-zinc-900 mt-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove Member
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Invites Section */}
      <div className="space-y-3.5 pb-4 border-b border-zinc-900 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Invite Code & Links</span>
          {(stats.userRole === 'owner' || stats.userRole === 'admin') && (
            <button 
              onClick={handleGenerateInvite} 
              className="text-[10px] text-violet-400 hover:text-white font-bold flex items-center gap-1 hover:underline"
            >
              <RefreshCw className="w-3 h-3" /> Regenerate
            </button>
          )}
        </div>

        {inviteData ? (
          <div className="bg-[#111117] p-3 rounded-2xl border border-zinc-900/60 space-y-2">
            <div className="flex items-center justify-between bg-zinc-950 p-1.5 rounded-xl border border-zinc-900">
              <span className="text-[10px] text-zinc-400 truncate max-w-[200px] select-all font-mono">{inviteData.inviteLink}</span>
              <button onClick={handleCopyInvite} className="p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowQRModal(true)} 
                className="flex-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 py-1.5 rounded-xl text-[10px] flex items-center justify-center gap-1.5 text-zinc-300 font-semibold"
              >
                <QrCode className="w-3.5 h-3.5 text-violet-400" /> Show QR Code
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleGenerateInvite} 
            className="w-full bg-[#111117] hover:bg-[#15151F] border border-zinc-850 hover:border-zinc-800 py-3 rounded-2xl text-xs text-center font-bold text-violet-400 transition-all flex items-center justify-center gap-2"
          >
            <Link className="w-4 h-4" /> Generate Invite Link
          </button>
        )}
      </div>

      {/* 4. Shared Resources Gallery */}
      <div className="space-y-3 pb-4 border-b border-zinc-900 text-left">
        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Shared Media</span>
        <div className="grid grid-cols-4 gap-2">
          {/* Photos */}
          <div className="bg-[#111117] p-2.5 rounded-xl border border-zinc-900 text-center flex flex-col items-center justify-center">
            <ImageIcon className="w-4.5 h-4.5 text-blue-400 mb-1" />
            <span className="text-[9px] text-zinc-550 font-medium">Photos</span>
            <span className="text-[10px] font-bold text-white mt-0.5">{media.photos.length}</span>
          </div>

          {/* Videos */}
          <div className="bg-[#111117] p-2.5 rounded-xl border border-zinc-900 text-center flex flex-col items-center justify-center">
            <Video className="w-4.5 h-4.5 text-green-400 mb-1" />
            <span className="text-[9px] text-zinc-555 font-medium">Videos</span>
            <span className="text-[10px] font-bold text-white mt-0.5">{media.videos.length}</span>
          </div>

          {/* Documents */}
          <div className="bg-[#111117] p-2.5 rounded-xl border border-zinc-900 text-center flex flex-col items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-amber-400 mb-1" />
            <span className="text-[9px] text-zinc-550 font-medium">Docs</span>
            <span className="text-[10px] font-bold text-white mt-0.5">{media.documents.length}</span>
          </div>

          {/* Links */}
          <div className="bg-[#111117] p-2.5 rounded-xl border border-zinc-900 text-center flex flex-col items-center justify-center">
            <Link2 className="w-4.5 h-4.5 text-purple-400 mb-1" />
            <span className="text-[9px] text-zinc-550 font-medium">Links</span>
            <span className="text-[10px] font-bold text-white mt-0.5">{media.links.length}</span>
          </div>
        </div>
      </div>

      {/* 5. Recent Activity Section */}
      <div className="space-y-3 pb-4 border-b border-zinc-900 text-left">
        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Group Activity logs</span>
        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto scrollbar-thin">
          {activities.length === 0 ? (
            <span className="text-[10px] text-zinc-550 font-medium">No logs recorded yet.</span>
          ) : (
            activities.map((log, idx) => (
              <div key={log._id || idx} className="text-[10px] text-zinc-450 leading-relaxed py-1 border-b border-zinc-900/40">
                <span className="block text-[8px] text-zinc-600 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {renderActivityText(log)}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 6. Settings Actions */}
      <div className="flex flex-col gap-2 pt-2 text-left">
        <button 
          onClick={toggleMute}
          className="w-full py-2 bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 rounded-xl text-xs flex items-center justify-center gap-2 font-bold text-zinc-450 hover:text-white transition-all"
        >
          {isMuted ? (
            <>
              <Volume2 className="w-4 h-4 text-green-400 animate-pulse" /> Unmute Notifications
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-zinc-500" /> Mute Notifications
            </>
          )}
        </button>

        {stats.userRole !== 'owner' ? (
          <button 
            onClick={handleLeaveGroup}
            className="w-full py-2 bg-red-950/20 border border-red-900/30 hover:bg-red-900/30 rounded-xl text-xs flex items-center justify-center gap-2 font-bold text-red-400 hover:text-red-300 transition-all"
          >
            <LogOut className="w-4 h-4" /> Leave Circle Group
          </button>
        ) : (
          <button 
            onClick={handleDeleteGroup}
            className="w-full py-2 bg-red-950/40 border border-red-900/50 hover:bg-red-900/60 rounded-xl text-xs flex items-center justify-center gap-2 font-extrabold text-red-300 transition-all animate-pulse"
          >
            <Trash2 className="w-4 h-4" /> Delete Circle Group
          </button>
        )}
      </div>

      {/* QR Code Modal Overlay */}
      {showQRModal && inviteData && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 text-center">
          <div className="bg-[#09090C] rounded-3xl p-6 border border-zinc-855 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
              <h4 className="font-bold text-xs text-white">Circle Invite QR Code</h4>
              <button onClick={() => setShowQRModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            {/* Simulated Vector QR Code */}
            <div className="flex justify-center p-4 bg-white rounded-2xl mx-auto w-48 h-48 items-center border border-zinc-250">
              <svg className="w-40 h-40" viewBox="0 0 100 100" shapeRendering="crispEdges">
                <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z" fill="#09090c" />
                <path d="M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z" fill="#09090c" />
                <path d="M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z" fill="#09090c" />
                {/* Random Matrix Pattern */}
                <path d="M40,5 h5 v5 h-5 z M55,0 h10 v5 h-10 z M45,20 h10 v5 h-10 z M35,40 h5 v10 h-5 z M50,50 h15 v5 h-15 z M80,45 h10 v5 h-10 z M90,60 h5 v5 h-5 z M60,75 h5 v10 h-5 z M80,85 h15 v5 h-15 z" fill="#09090c" />
                <path d="M45,45 h10 v10 h-10 z" fill="#7c3aed" /> {/* Brand Purple Anchor */}
              </svg>
            </div>
            
            <p className="text-[10px] text-zinc-500 leading-relaxed font-semibold">
              Scan this code to join <span className="text-white font-bold">{group.name}</span> instantly.
            </p>

            <button 
              onClick={() => setShowQRModal(false)} 
              className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs py-2 rounded-xl text-white font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Members Overlay */}
      {showAddMembers && createPortal(
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#070709] rounded-[32px] p-6 border border-white/10 w-full max-w-lg text-left shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
              <div>
                <h4 className="font-display text-base font-black text-white tracking-tight">Add Friends to Circle</h4>
                <p className="text-[11px] text-zinc-400 font-semibold mt-0.5">Invite your CampusConnect friends.</p>
              </div>
              <button 
                onClick={() => {
                  setShowAddMembers(false);
                  setSelectedUserIds([]);
                }} 
                className="p-1.5 rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Realtime Search Input */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search friends by name, username, department..."
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                className="w-full bg-[#111117] border border-zinc-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-violet-550 transition-all font-medium"
              />
            </div>

            {/* Selected Members Chips */}
            {selectedUserIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 py-2 px-3 bg-zinc-950/40 border border-zinc-900/60 rounded-xl max-h-24 overflow-y-auto scrollbar-thin">
                {selectedUserIds.map(uid => {
                  const friend = nonMembers.find(u => u.id === uid);
                  if (!friend) return null;
                  return (
                    <div 
                      key={uid} 
                      className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-violet-600/15 border border-violet-500/20 text-[10px] font-bold text-violet-400 rounded-full transition-all"
                    >
                      <img 
                        src={friend.photos?.[0] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`} 
                        alt="" 
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span>{friend.name}</span>
                      <button 
                        onClick={() => setSelectedUserIds(prev => prev.filter(id => id !== uid))}
                        className="text-violet-400 hover:text-white font-extrabold focus:outline-none"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Friends list (Filtered by search query) */}
            <div className="flex-1 mt-4 overflow-y-auto scrollbar-thin space-y-2 pr-1 min-h-[200px] max-h-[350px]">
              {(() => {
                const filteredFriends = nonMembers.filter(u => {
                  const query = addSearch.toLowerCase();
                  return (
                    (u.name || '').toLowerCase().includes(query) ||
                    (u.username || '').toLowerCase().includes(query) ||
                    (u.department || '').toLowerCase().includes(query) ||
                    (u.batch || '').toString().includes(query)
                  );
                });

                if (nonMembers.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center text-center py-10 space-y-4">
                      <div className="p-4 bg-zinc-950 rounded-full border border-zinc-900">
                        <Users className="w-8 h-8 text-zinc-650" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-400">No friends available to invite.</p>
                        <p className="text-[10px] text-zinc-550 mt-0.5">Add some connections first to build your group chat.</p>
                      </div>
                      <div className="flex gap-2 w-full max-w-xs pt-2">
                        <a 
                          href="/discover"
                          className="flex-1 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-350 text-center transition-all"
                        >
                          Find Friends
                        </a>
                        <button 
                          onClick={() => {
                            handleGenerateInvite();
                            setShowQRModal(true);
                            setShowAddMembers(false);
                          }}
                          className="flex-1 px-4 py-2 bg-violet-650 hover:bg-violet-750 text-[10px] font-bold text-white rounded-xl transition-all"
                        >
                          Generate Invite Link
                        </button>
                      </div>
                    </div>
                  );
                }

                if (filteredFriends.length === 0) {
                  return (
                    <span className="text-xs text-zinc-500 font-medium text-center block py-8">
                      No matching connections found.
                    </span>
                  );
                }

                return filteredFriends.map(u => {
                  const isChecked = selectedUserIds.includes(u.id);
                  return (
                    <div 
                      key={u.id} 
                      onClick={() => {
                        setSelectedUserIds(prev => 
                          isChecked ? prev.filter(id => id !== u.id) : [...prev, u.id]
                        );
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer select-none transition-all hover:bg-zinc-950/40 ${
                        isChecked 
                          ? 'bg-violet-600/5 border-violet-500/20' 
                          : 'bg-[#0E0E14]/30 border-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img 
                            src={u.photos?.[0] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                            alt="" 
                            className="w-10 h-10 rounded-full object-cover bg-zinc-800 border border-white/5" 
                          />
                          {u.isOnline && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#070709] bg-emerald-500" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{u.name}</span>
                          <span className="text-[10px] text-zinc-450 block mt-0.5">
                            {u.department} • Class of {u.batch}
                          </span>
                        </div>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        isChecked 
                          ? 'bg-violet-600 border-violet-500 text-white' 
                          : 'border-zinc-700 bg-transparent'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Invite Link Secondary Action (below list, only if friends exist) */}
            {nonMembers.length > 0 && (
              <div className="pt-3 border-t border-zinc-900 mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-semibold">Or share invitation instead</span>
                  <button 
                    onClick={() => {
                      handleGenerateInvite();
                      setShowQRModal(true);
                      setShowAddMembers(false);
                    }}
                    className="text-[10px] text-violet-400 hover:text-white font-bold flex items-center gap-1 transition-colors"
                  >
                    <Link className="w-3 h-3" /> Share Invite QR/Link
                  </button>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-3 pt-4 border-t border-zinc-900 mt-4">
              <button 
                onClick={() => {
                  setShowAddMembers(false);
                  setSelectedUserIds([]);
                }} 
                className="flex-1 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-xs py-2.5 rounded-xl text-zinc-400 hover:text-white transition-all font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddMembersSubmit}
                disabled={selectedUserIds.length === 0}
                className="flex-1 bg-violet-650 hover:bg-violet-750 disabled:bg-zinc-900 disabled:border-zinc-850 disabled:text-zinc-655 text-xs py-2.5 rounded-xl text-white transition-all font-bold shadow-lg shadow-violet-950/10"
              >
                Add Selected {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* User Profile Panel Overlay */}
      {selectedMemberProfileId && createPortal(
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-0 md:p-10">
          <div className="relative w-full h-full max-w-[1400px] bg-[#070709] border border-white/10 shadow-2xl flex flex-col overflow-hidden md:rounded-[32px]">
            <UserProfilePanel
              userId={selectedMemberProfileId}
              onClose={() => setSelectedMemberProfileId(null)}
            />
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
