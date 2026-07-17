import React, { useState, useEffect } from 'react';
import { 
  X, Grid, FileText, Image as ImageIcon, Video, Compass, UserCheck, 
  UserPlus, Mail, ExternalLink, RefreshCw, Eye, Lock, CheckCircle, 
  Ban, ShieldAlert, Share2, Link2, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiUrl } from '@/services/connectionService';
import { useAuthStore } from '@/store/authStore';
import { socketService } from '@/services/socketService';
import { toast } from 'sonner';

interface UserProfilePanelProps {
  userId: string;
  onClose: () => void;
}

export default function UserProfilePanel({ userId, onClose }: UserProfilePanelProps) {
  const currentUserId = useAuthStore(s => s._id) || useAuthStore(s => s.uid);
  const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token') || '';

  // API States
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [mutualData, setMutualData] = useState<any>({ friends: [], circles: [] });
  const [loading, setLoading] = useState(true);

  // Tab & Media Overlay States
  const [activeTab, setActiveTab] = useState<'posts' | 'photos' | 'mutual' | 'info'>('posts');
  const [activeLightboxMedia, setActiveLightboxMedia] = useState<any | null>(null);

  // Action Pending States
  const [followPending, setFollowPending] = useState(false);
  const [blockPending, setBlockPending] = useState(false);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const fetchProfileDetails = async () => {
    if (!userId) return;
    
    // Step 5: Log Clicked Member ID
    console.log("🔍 [User Profile Panel] Loading profile. Clicked Member ID:", userId, "API Base URL:", getApiUrl());
    
    try {
      setLoading(true);
      
      // Fetch details from local backend APIs with format checks
      const profileRes = await fetch(`${getApiUrl()}/api/users/${userId}/profile`, { headers: getHeaders() });
      
      const profileContentType = profileRes.headers.get("content-type");
      if (!profileRes.ok || !profileContentType || !profileContentType.includes("application/json")) {
        const text = await profileRes.text();
        console.error("❌ [User Profile Panel] Server returned non-JSON/error response:", text);
        throw new Error(`Profile fetch failed: status ${profileRes.status}`);
      }
      
      const profileJson = await profileRes.json();
      if (profileJson.success) setProfile(profileJson.data);

      // Friends
      const friendsRes = await fetch(`${getApiUrl()}/api/users/${userId}/friends`, { headers: getHeaders() });
      if (friendsRes.ok && friendsRes.headers.get("content-type")?.includes("application/json")) {
        const friendsJson = await friendsRes.json();
        if (friendsJson.success) setFriends(friendsJson.data);
      }

      // Followers
      const followersRes = await fetch(`${getApiUrl()}/api/users/${userId}/followers`, { headers: getHeaders() });
      if (followersRes.ok && followersRes.headers.get("content-type")?.includes("application/json")) {
        const followersJson = await followersRes.json();
        if (followersJson.success) setFollowers(followersJson.data);
      }

      // Mutual
      const mutualRes = await fetch(`${getApiUrl()}/api/users/${userId}/mutual`, { headers: getHeaders() });
      if (mutualRes.ok && mutualRes.headers.get("content-type")?.includes("application/json")) {
        const mutualJson = await mutualRes.json();
        if (mutualJson.success) setMutualData(mutualJson.data);
      }

      // Posts
      const postsRes = await fetch(`${getApiUrl()}/api/users/${userId}/posts`, { headers: getHeaders() });
      if (postsRes.ok && postsRes.headers.get("content-type")?.includes("application/json")) {
        const postsJson = await postsRes.json();
        if (postsJson.success) setPosts(postsJson.data);
      }

      // Media
      const mediaRes = await fetch(`${getApiUrl()}/api/users/${userId}/media`, { headers: getHeaders() });
      if (mediaRes.ok && mediaRes.headers.get("content-type")?.includes("application/json")) {
        const mediaJson = await mediaRes.json();
        if (mediaJson.success) setMedia(mediaJson.data);
      }

    } catch (err: any) {
      console.error("❌ [User Profile Panel] Failed to load profile details:", err.message);
      toast.error('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, [userId]);

  // Socket setup for updates
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !userId) return;

    const handleRelationshipChanged = ({ userId: actorId, isFollowing }: any) => {
      if (actorId === currentUserId) {
        setProfile((prev: any) => {
          if (!prev) return prev;
          const delta = isFollowing ? 1 : -1;
          return {
            ...prev,
            stats: { ...prev.stats, followers: Math.max(0, prev.stats.followers + delta) },
            relationship: { ...prev.relationship, isFollowing }
          };
        });
      }
    };

    socket.on('relationshipChanged', handleRelationshipChanged);
    return () => {
      socket.off('relationshipChanged', handleRelationshipChanged);
    };
  }, [userId, currentUserId]);

  const handleFollowToggle = async () => {
    if (followPending) return;
    try {
      setFollowPending(true);
      const res = await fetch(`${getApiUrl()}/api/users/${userId}/follow`, {
        method: 'POST',
        headers: getHeaders()
      });
      const json = await res.json();
      if (json.success) {
        setProfile((prev: any) => {
          if (!prev) return prev;
          const isFollowing = json.isFollowing;
          const delta = isFollowing ? 1 : -1;
          return {
            ...prev,
            stats: { ...prev.stats, followers: Math.max(0, prev.stats.followers + delta) },
            relationship: { ...prev.relationship, isFollowing }
          };
        });
        toast.success(json.isFollowing ? 'You connected with this user! 🔔' : 'Unfollowed successfully.');
      }
    } catch {
      toast.error('Connection request failed.');
    } finally {
      setFollowPending(false);
    }
  };

  const handleBlockToggle = async () => {
    if (blockPending) return;
    if (!confirm('Are you sure you want to block or unblock this user?')) return;
    try {
      setBlockPending(true);
      const res = await fetch(`${getApiUrl()}/api/users/${userId}/block`, {
        method: 'POST',
        headers: getHeaders()
      });
      const json = await res.json();
      if (json.success) {
        setProfile((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            relationship: { ...prev.relationship, isBlocked: json.isBlocked }
          };
        });
        toast.success(json.isBlocked ? 'User restricted.' : 'User unrestricted.');
      }
    } catch {
      toast.error('Block request failed.');
    } finally {
      setBlockPending(false);
    }
  };

  const handleReport = async () => {
    const reason = prompt('Enter the reason for reporting this profile:');
    if (!reason) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/users/${userId}/report`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Report submitted to moderation. Thank you! 🛡️');
      }
    } catch {
      toast.error('Reporting failed.');
    }
  };

  const handleShareProfile = () => {
    navigator.clipboard.writeText(`http://localhost:8081/users/profile/${userId}`);
    toast.success('Profile share link copied to clipboard! 🔗');
  };

  if (loading && !profile) {
    return (
      <div className="w-full h-full bg-[#070709] p-6 flex flex-col items-center justify-center space-y-4 relative">
        <button onClick={onClose} className="absolute top-6 right-6 px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white font-bold text-xs uppercase">Close</button>
        <RefreshCw className="h-6 w-6 text-violet-500 animate-spin" />
        <p className="text-xs text-zinc-400 font-medium">Loading profile details...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full h-full bg-[#070709] p-6 flex flex-col items-center justify-center relative">
        <button onClick={onClose} className="absolute top-6 right-6 px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white font-bold text-xs uppercase">Close</button>
        <AlertTriangle className="h-6 w-6 text-red-500 mb-2" />
        <p className="text-xs text-zinc-400 font-semibold">User profile is currently unavailable.</p>
        <button onClick={onClose} className="mt-4 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-xs text-white rounded-lg">Close</button>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#070709] pb-24 text-zinc-100 overflow-y-auto overflow-x-hidden select-none relative">
      {/* Top Header close button */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 pt-6 flex justify-end">
        <button onClick={onClose} className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white transition-all flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider shadow-lg">
          <X className="w-4 h-4" /> Close Profile
        </button>
      </div>

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
                  <div className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-full border-4 border-[#070709] overflow-hidden bg-zinc-900/80 shadow-2xl flex-shrink-0">
                    <img
                      src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  
                  {/* User Details & Action Tray */}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2 sm:mt-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                          {profile.name}
                        </h2>
                        {profile.isVerified && <CheckCircle className="h-5.5 w-5.5 text-blue-400 flex-shrink-0" />}
                        {profile.isOnline && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" title="Online" />}
                      </div>
                      
                      <p className="text-xs text-zinc-400 font-semibold mt-0.5">
                        @{profile.username || 'user'}
                      </p>
                      
                      {/* Department / Batch */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 text-xs text-zinc-350 font-bold">
                        {profile.department && <span>{profile.department}</span>}
                        {profile.department && profile.batch && <span className="text-zinc-700">•</span>}
                        {profile.batch && <span>Class of {profile.batch}</span>}
                      </div>
                    </div>
                    
                    {/* Actions Row */}
                    <div className="flex flex-wrap gap-2.5 items-center">
                      {profile.relationship.isFriend ? (
                        <button 
                          onClick={() => toast.success('Connecting chat request...')}
                          className="py-2.5 px-5 bg-violet-650 hover:bg-violet-755 text-xs text-white rounded-2xl font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-violet-950/20"
                        >
                          <Mail className="w-4 h-4" /> Message
                        </button>
                      ) : (
                        <button
                          onClick={handleFollowToggle}
                          className={`py-2.5 px-5 text-xs rounded-2xl font-black flex items-center justify-center gap-1.5 transition-all shadow-md ${
                            profile.relationship.isFollowing 
                              ? 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800' 
                              : 'bg-violet-650 hover:bg-violet-750 text-white'
                          }`}
                        >
                          {profile.relationship.isFollowing ? (
                            <>
                              <UserCheck className="w-4 h-4" /> Connected
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" /> Connect
                            </>
                          )}
                        </button>
                      )}
                      
                      <button 
                        onClick={handleShareProfile}
                        className="py-2.5 px-4 bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-xs text-zinc-400 hover:text-white rounded-2xl font-black flex items-center justify-center transition-all"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Bio (Header Level) */}
                {profile.bio && (
                  <p className="text-xs sm:text-sm text-zinc-350 mt-5 max-w-2xl leading-relaxed whitespace-pre-wrap font-medium">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Statistics Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Posts', value: profile.stats?.posts || 0, color: 'text-violet-400', bg: 'bg-violet-500/5 border-violet-500/10' },
                { label: 'Friends', value: profile.stats?.friends || 0, color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/10' },
                { label: 'Followers', value: profile.stats?.followers || 0, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/5 border-fuchsia-500/10' },
                { label: 'Circles', value: profile.stats?.circles || 0, color: 'text-teal-400', bg: 'bg-teal-500/5 border-teal-500/10' },
              ].map((stat, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${stat.bg} flex flex-col items-center justify-center text-center shadow-lg transition-all hover:-translate-y-0.5 duration-300`}>
                  <span className={`text-2xl font-black ${stat.color} tracking-tight`}>{stat.value}</span>
                  <span className="text-[9px] text-zinc-400 font-extrabold uppercase mt-1 tracking-wider">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Tab Selection */}
            <div className="flex border-b border-white/5 pb-0 mb-4 overflow-x-auto hide-scrollbar">
              {[
                { id: 'posts', label: 'Feed' },
                { id: 'photos', label: 'Photos' },
                { id: 'mutual', label: 'Mutual' },
                { id: 'info', label: 'About' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-3 px-5 text-xs font-black uppercase tracking-wider transition-all relative whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'text-primary border-b-2 border-primary font-black' 
                      : 'text-zinc-450 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content Body */}
            <div className="w-full">
              <AnimatePresence mode="wait">
                {activeTab === 'posts' && (
                  <motion.div 
                    key="posts"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {posts.length === 0 ? (
                      <div className="p-8 rounded-[24px] border border-white/5 bg-zinc-950/20 text-center text-zinc-450 text-xs italic">
                        No posts shared yet.
                      </div>
                    ) : (
                      posts.map(p => (
                        <div key={p.id} className="p-5 bg-zinc-950/20 border border-white/[0.06] rounded-[24px] space-y-3 shadow-md">
                          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{p.content}</p>
                          {p.image && (
                            <div className="rounded-2xl overflow-hidden bg-black/40 border border-white/5 max-h-96">
                              <img src={p.image} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-extrabold uppercase">
                            <span>👍 ${p.likes} likes • ${p.commentsCount} replies</span>
                            <span>${new Date(p.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}

                {activeTab === 'photos' && (
                  <motion.div 
                    key="photos"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {media.length === 0 ? (
                      <div className="p-8 rounded-[24px] border border-white/5 bg-zinc-950/20 text-center text-zinc-450 text-xs italic">
                        No media attachments found.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {media.map(m => (
                          <div 
                            key={m.id} 
                            onClick={() => setActiveLightboxMedia(m)}
                            className="aspect-square bg-zinc-950 rounded-2xl overflow-hidden border border-white/5 cursor-pointer group relative shadow-md"
                          >
                            <img src={m.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] text-white font-extrabold uppercase tracking-widest">View Image</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'mutual' && (
                  <motion.div 
                    key="mutual"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Common Context */}
                    <div className="space-y-3">
                      <span className="text-[10px] uppercase font-black text-zinc-450 tracking-wider">Common Context</span>
                      <div className="flex flex-col gap-2">
                        {profile.college === 'SR University' && (
                          <span className="px-4 py-3 bg-zinc-950/20 border border-white/[0.04] rounded-2xl text-xs flex items-center gap-2 font-medium">
                            🏫 Member of Same College
                          </span>
                        )}
                        {mutualData.friends && mutualData.friends.length > 0 && (
                          <span className="px-4 py-3 bg-zinc-950/20 border border-white/[0.04] rounded-2xl text-xs flex items-center gap-2 font-medium">
                            🤝 {mutualData.friends.length === 1 ? "1 Mutual Connection" : `${mutualData.friends.length} Mutual Connections`}
                          </span>
                        )}
                        {mutualData.circles && mutualData.circles.length > 0 && (
                          <span className="px-4 py-3 bg-zinc-950/20 border border-white/[0.04] rounded-2xl text-xs flex items-center gap-2 font-medium">
                            👥 {mutualData.circles.length === 1 ? "1 Shared Circle" : `${mutualData.circles.length} Shared Circles`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Shared Circles */}
                    {mutualData.circles && mutualData.circles.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase font-black text-zinc-450 tracking-wider block">Shared Circles</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {mutualData.circles.map((c: any) => (
                            <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/20 border border-white/5">
                              <img src={c.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.name}`} alt="" className="w-10 h-10 rounded-full object-cover" />
                              <div>
                                <span className="text-xs font-bold text-white block">{c.name}</span>
                                <span className="text-[10px] text-zinc-500 block font-semibold">{c.membersCount} active members</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'info' && (
                  <motion.div 
                    key="info"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-black text-zinc-450 tracking-wider">Bio Description</span>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium bg-zinc-950/20 border border-white/[0.06] p-4 rounded-2xl">{profile.bio}</p>
                    </div>

                    {profile.skills && profile.skills.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase font-black text-zinc-450 tracking-wider block">Skills & Expertise</span>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.skills.map((s: string, idx: number) => (
                            <span key={idx} className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary text-[10px] rounded-xl font-bold uppercase tracking-wider">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.interests && profile.interests.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase font-black text-zinc-450 tracking-wider block">Interests</span>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.interests.map((i: string, idx: number) => (
                            <span key={idx} className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] rounded-xl font-bold uppercase tracking-wide">
                              {i}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Links */}
                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <span className="text-[10px] uppercase font-black text-zinc-450 tracking-wider block">Contact & Assets</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {profile.email && (
                          <a href={`mailto:${profile.email}`} className="flex items-center gap-3 p-3 bg-zinc-950/20 border border-white/5 hover:bg-zinc-900/40 rounded-2xl text-xs text-zinc-350">
                            <Mail className="w-4 h-4 text-violet-400" />
                            <span className="truncate font-semibold">{profile.email}</span>
                          </a>
                        )}
                        {profile.githubUrl && (
                          <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-zinc-950/20 border border-white/5 hover:bg-zinc-900/40 rounded-2xl text-xs text-zinc-350">
                            <ExternalLink className="w-4 h-4 text-zinc-200" />
                            <span className="truncate font-semibold">GitHub Profile</span>
                          </a>
                        )}
                        {profile.linkedinUrl && (
                          <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-zinc-950/20 border border-white/5 hover:bg-zinc-900/40 rounded-2xl text-xs text-zinc-350">
                            <Link2 className="w-4 h-4 text-blue-400" />
                            <span className="truncate font-semibold">LinkedIn Profile</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Panel Widgets (25% Width) */}
          <div className="lg:col-span-1 space-y-6 sticky top-6 hidden lg:block">
            {/* Widget: Actions Card */}
            <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/40 p-5 space-y-3 shadow-lg">
              <span className="text-[10px] text-zinc-450 font-black uppercase tracking-widest block mb-2">Shortcuts</span>
              
              <button 
                onClick={handleBlockToggle}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-all text-left border border-white/[0.02] text-xs font-bold text-zinc-300"
              >
                <Ban className="w-4 h-4 text-amber-500" /> {profile.relationship.isBlocked ? 'Unblock User' : 'Block User'}
              </button>
              <button 
                onClick={handleReport}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-500/5 hover:bg-red-500/10 transition-all text-left border border-red-500/10 text-xs font-bold text-red-400"
              >
                <ShieldAlert className="w-4 h-4" /> Report Profile
              </button>
            </div>
          </div>

        </div>
      </div>
      
      {/* Lightbox media viewer */}
      {activeLightboxMedia && (
        <div 
          className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setActiveLightboxMedia(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 bg-black/60 rounded-full border border-white/25 text-white"
            onClick={() => setActiveLightboxMedia(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img 
            src={activeLightboxMedia.url} 
            alt="" 
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" 
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
}
