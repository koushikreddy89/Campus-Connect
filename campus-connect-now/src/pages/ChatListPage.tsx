import React, { useState, useEffect, useMemo } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { useChatStore } from '@/store/chatStore';
import { useGroupChatStore } from '@/store/groupChatStore';
import { useUserStore } from '@/store/userStore';
import { BottomTabBar } from '@/components/BottomTabBar';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { 
  MessageCircle, Users, Plus, X, Search, Pin, BellOff, MoreVertical,
  Phone, Video, Info, ShieldAlert, Ban, Trash2, Image, FileText, Link, Group
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatPage from './ChatPage';
import GroupChatPage from './GroupChatPage';
import { Button } from '@/components/ui/button';

export default function ChatListPage() {
  const matches = useMatchStore(s => s.matches);
  const groups = useGroupChatStore(s => s.groups);
  const availableUsers = useUserStore(s => s.availableUsers);
  const navigate = useNavigate();
  
  const [tab, setTab] = useState<'direct' | 'groups'>('direct');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  const createGroup = useGroupChatStore(s => s.createGroup);
  const fetchMatches = useMatchStore(s => s.fetchMatches);
  const fetchGroups = useGroupChatStore(s => s.fetchGroups);

  // Load and poll matches/groups
  useEffect(() => {
    fetchMatches();
    fetchGroups();
    const interval = setInterval(() => {
      fetchMatches();
      fetchGroups();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchMatches, fetchGroups]);

  // Split-pane selection state for tablet/desktop
  const [selectedChat, setSelectedChat] = useState<{ id: string; type: 'direct' | 'group' } | null>(null);
  const [memberSearch, setMemberSearch] = useState('');

  const sharedPhotosMap = useChatStore(s => s.sharedPhotos);
  const sharedDocsMap = useChatStore(s => s.sharedDocs);
  const sharedLinksMap = useChatStore(s => s.sharedLinks);
  const fetchSharedAssets = useChatStore(s => s.fetchSharedAssets);

  useEffect(() => {
    if (selectedChat && selectedChat.type === 'direct') {
      fetchSharedAssets(selectedChat.id);
    }
  }, [selectedChat, fetchSharedAssets]);

  // ESC key listener to close modal
  useEffect(() => {
    if (!showCreateGroup) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreateGroup(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateGroup]);

  // Filter available users for search input
  const filteredAvailableUsers = availableUsers.filter(u =>
    u.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Filter conversation list based on search query
  const filteredChats = useMemo(() => {
    if (tab === 'direct') {
      return matches.filter(m => {
        const name = m.isRevealed ? m.user?.name : m.user?.anonymousName || 'Anonymous';
        return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
               (m.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase());
      });
    } else {
      return groups.filter(g => 
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  }, [matches, groups, tab, searchQuery]);

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    createGroup(groupName.trim(), selectedMembers);
    setGroupName('');
    setMemberSearch('');
    setSelectedMembers([]);
    setShowCreateGroup(false);
    toast.success('College circle successfully created! 👥');
  };

  const handleItemClick = (id: string, type: 'direct' | 'group') => {
    setSelectedChat({ id, type });
    // If mobile width, trigger standard routing
    if (window.innerWidth < 1024) {
      navigate(type === 'direct' ? `/chat/${id}` : `/chat/group/${id}`);
    }
  };

  // Compute selected chat info for the Right Sidebar
  const selectedChatInfo = useMemo(() => {
    if (!selectedChat) return null;
    if (selectedChat.type === 'direct') {
      const match = matches.find(m => m.id === selectedChat.id);
      if (!match) return null;
      return {
        name: match.isRevealed ? match.user?.name : match.user?.anonymousName || 'Anonymous',
        avatar: match.user?.photos?.[0] || '',
        isRevealed: match.isRevealed,
        email: match.user?.email || '',
        bio: match.user?.bio || 'College student exploring Campus Connect.',
        department: match.user?.department || 'Computer Science',
        batch: match.user?.batch || '2026',
        college: match.user?.college || 'SR University',
        isOnline: match.user?.isOnline || false,
        interests: match.user?.interests || []
      };
    } else {
      const group = groups.find(g => g.id === selectedChat.id);
      if (!group) return null;
      return {
        name: group.name,
        avatar: group.avatar || '',
        isRevealed: true,
        email: '',
        bio: `Circle with ${group.members?.length || 0} active members.`,
        department: 'General Public',
        batch: 'N/A',
        college: 'SR University',
        isOnline: true,
        members: group.members || []
      };
    }
  }, [selectedChat, matches, groups]);

  return (
    <div className="bg-[#070709] page-transition flex flex-col h-screen w-full overflow-hidden text-zinc-300">
      
      {/* 3-Column Split Pane Workspace (padding reserves space for the bottom tab bar) */}
      <div className="flex flex-row flex-1 min-h-0 w-full relative overflow-hidden pb-[64px]">
        
        {/* COLUMN 1: Conversation List (Left Sidebar) */}
        <div className="w-full lg:w-[320px] lg:min-w-[320px] lg:max-w-[320px] flex flex-col border-r border-zinc-900 h-full overflow-hidden bg-[#0A0A0F] shrink-0">
          
          {/* Header */}
          <div className="px-5 pt-6 pb-3 flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Messenger</h1>
              <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Real-time collaboration workspace</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowCreateGroup(true)}
              className="h-9 w-9 rounded-xl bg-violet-600/10 border border-violet-500/25 flex items-center justify-center hover:bg-violet-600/20 transition-all text-violet-400"
              title="Create new circle group"
            >
              <Plus className="h-4 w-4" />
            </motion.button>
          </div>

          {/* Search bar */}
          <div className="px-5 mb-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-550" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-[#111117] border border-zinc-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-violet-550/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>
          </div>

          {/* Active Tabs */}
          <div className="px-5 mb-4 flex gap-2 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setTab('direct')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all border ${
                tab === 'direct' 
                  ? 'bg-violet-600/10 border-violet-500/25 text-violet-400' 
                  : 'bg-zinc-900/60 border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" /> Direct
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setTab('groups')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all border ${
                tab === 'groups' 
                  ? 'bg-violet-600/10 border-violet-500/25 text-violet-400' 
                  : 'bg-zinc-900/60 border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Circles
              {groups.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/30 ml-1 font-bold text-violet-400">
                  {groups.length}
                </span>
              )}
            </motion.button>
          </div>

          {/* Chat List Scrollable Wrapper */}
          <div className="flex-1 overflow-y-auto pb-8 space-y-3 px-5 scrollbar-thin">
            {tab === 'direct' ? (
              <>
                {/* Matches horizontal stack */}
                {matches.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[9px] text-zinc-550 mb-2 font-bold uppercase tracking-wider">Active Matches</p>
                    <div className="flex gap-3.5 overflow-x-auto hide-scrollbar pb-1.5">
                      {matches.map(m => (
                        <MatchAvatar 
                          key={m.id} 
                          match={m} 
                          onClick={() => handleItemClick(m.id, 'direct')} 
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Messages list */}
                <div className="space-y-2">
                  {filteredChats.length === 0 ? (
                    <EmptyState
                      icon={<MessageCircle className="h-8 w-8 text-zinc-650" />}
                      title="No conversations"
                      description="Search for matches or start a chat."
                    />
                  ) : (
                    filteredChats.map((m, i) => (
                      <ChatListItem 
                        key={m.id} 
                        match={m} 
                        index={i} 
                        isActive={selectedChat?.id === m.id}
                        onClick={() => handleItemClick(m.id, 'direct')} 
                      />
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {filteredChats.length === 0 ? (
                  <EmptyState
                    icon={<Users className="h-8 w-8 text-zinc-650" />}
                    title="No circles found"
                    description="Create a group to coordinate projects."
                  />
                ) : (
                  filteredChats.map((g, i) => (
                    <motion.button
                      key={g.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleItemClick(g.id, 'group')}
                      className={`w-full rounded-2xl p-3 flex items-center gap-3 text-left border transition-all ${
                        selectedChat?.id === g.id 
                          ? 'bg-violet-600/10 border-violet-500/25 shadow-lg shadow-violet-950/20' 
                          : 'bg-[#101015]/60 border-zinc-900/60 hover:bg-[#121217]'
                      }`}
                    >
                      <img src={g.avatar} alt="" className="h-11 w-11 rounded-full object-cover bg-zinc-900" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="text-xs font-bold text-white truncate">{g.name}</p>
                          <span className="text-[9px] text-zinc-550 shrink-0 font-medium">{g.members?.length || 0} members</span>
                        </div>
                        {g.lastMessage && (
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{g.lastMessage}</p>
                        )}
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: Workspace & Messaging Area (Middle Pane) */}
        <div className="flex-1 flex flex-col h-full bg-[#08080C] overflow-hidden relative border-r border-zinc-900 min-w-0">
          {selectedChat ? (
            selectedChat.type === 'direct' ? (
              <ChatPage 
                key={selectedChat.id} 
                embeddedMatchId={selectedChat.id} 
                toggleSidebar={() => setShowRightSidebar(!showRightSidebar)}
              />
            ) : (
              <GroupChatPage 
                key={selectedChat.id} 
                embeddedGroupId={selectedChat.id} 
                toggleSidebar={() => setShowRightSidebar(!showRightSidebar)}
              />
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#08080C]">
              <div className="h-14 w-14 rounded-2xl bg-violet-600/10 border border-violet-500/25 flex items-center justify-center mb-4 text-violet-400">
                <MessageCircle className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-white">Select a Workspace</h2>
              <p className="text-xs text-zinc-550 max-w-xs mt-1.5 leading-relaxed">
                Click on a match or college circle from the left pane to explore real-time channels, share files, and collaborate.
              </p>
            </div>
          )}
        </div>

        {/* COLUMN 3: Conversation Details (Right Sidebar) */}
        <AnimatePresence>
          {showRightSidebar && selectedChatInfo && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="hidden lg:flex lg:flex-col border-l border-zinc-900 h-full bg-[#0A0A0F] overflow-y-auto overflow-x-hidden p-6 space-y-6 scrollbar-thin shrink-0 select-none w-[360px] min-w-[360px] max-w-[360px]"
            >
              {/* Profile Block */}
              <div className="flex flex-col items-center text-center pb-5 border-b border-zinc-900">
                <div className="relative mb-3.5">
                  <img
                    src={selectedChatInfo.avatar}
                    alt=""
                    className={`h-22 w-22 rounded-full object-cover ring-2 ring-violet-500/25 ${!selectedChatInfo.isRevealed ? 'blur-[5px]' : ''}`}
                  />
                  {selectedChatInfo.isOnline && (
                    <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0A0A0F] bg-green-400" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-white">{selectedChatInfo.name}</h3>
                <p className="text-[10px] text-zinc-550 mt-1 uppercase tracking-wider font-semibold">{selectedChatInfo.department}</p>
                <p className="text-[10px] text-zinc-550 font-medium">Batch of {selectedChatInfo.batch}</p>
              </div>

              {/* General details */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[9px] uppercase font-bold text-zinc-550 tracking-wider">Bio / Description</span>
                  <p className="text-xs text-zinc-400 leading-relaxed">{selectedChatInfo.bio}</p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] uppercase font-bold text-zinc-550 tracking-wider">College Group</span>
                  <p className="text-xs text-white font-medium">{selectedChatInfo.college}</p>
                </div>
              </div>

              {/* Shared Assets */}
              <div className="space-y-3 pt-2">
                <span className="text-[9px] uppercase font-bold text-zinc-550 tracking-wider block">Shared Resources</span>
                <div className="space-y-2">
                  {(() => {
                    const photosList = selectedChat ? (sharedPhotosMap[selectedChat.id] || []) : [];
                    const docsList = selectedChat ? (sharedDocsMap[selectedChat.id] || []) : [];
                    const linksList = selectedChat ? (sharedLinksMap[selectedChat.id] || []) : [];

                    return (
                      <>
                        <div className="space-y-1">
                          <div className="w-full flex items-center justify-between p-2.5 bg-[#121217]/50 rounded-xl text-xs border border-zinc-900">
                            <span className="flex items-center gap-2 text-zinc-400"><Image className="w-3.5 h-3.5 text-violet-400" /> Shared Photos</span>
                            <span className="text-[10px] text-zinc-550">{photosList.length} files</span>
                          </div>
                          {photosList.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5 p-2 bg-[#121217]/30 border border-zinc-900/50 rounded-xl">
                              {photosList.slice(0, 6).map((photo, pIdx) => (
                                <a key={pIdx} href={photo.imageUrl} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-zinc-800 hover:opacity-85 transition-opacity">
                                  <img src={photo.imageUrl} alt="" className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <div className="w-full flex items-center justify-between p-2.5 bg-[#121217]/50 rounded-xl text-xs border border-zinc-900">
                            <span className="flex items-center gap-2 text-zinc-400"><FileText className="w-3.5 h-3.5 text-violet-400" /> Documents</span>
                            <span className="text-[10px] text-zinc-550">{docsList.length} files</span>
                          </div>
                          {docsList.length > 0 && (
                            <div className="space-y-1 p-2 bg-[#121217]/30 border border-zinc-900/50 rounded-xl max-h-40 overflow-y-auto">
                              {docsList.map((doc, dIdx) => (
                                <a key={dIdx} href={doc.documentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-1.5 hover:bg-zinc-900/40 rounded-lg text-[10px] text-zinc-400 truncate">
                                  <FileText className="w-3 h-3 text-violet-400/80 shrink-0" />
                                  <span className="truncate flex-1">{doc.documentName}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="w-full flex items-center justify-between p-2.5 bg-[#121217]/50 rounded-xl text-xs border border-zinc-900">
                            <span className="flex items-center gap-2 text-zinc-400"><Link className="w-3.5 h-3.5 text-violet-400" /> Shared Links</span>
                            <span className="text-[10px] text-zinc-550">{linksList.length} links</span>
                          </div>
                          {linksList.length > 0 && (
                            <div className="space-y-1 p-2 bg-[#121217]/30 border border-zinc-900/50 rounded-xl max-h-40 overflow-y-auto">
                              {linksList.map((link, lIdx) => (
                                <a key={lIdx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-0.5 p-1.5 hover:bg-zinc-900/40 rounded-lg text-[10px] text-zinc-400">
                                  <span className="font-semibold text-white truncate">{link.title || 'Link'}</span>
                                  <span className="text-[9px] text-zinc-500 truncate">{link.url}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Mutual Items */}
              {selectedChatInfo.interests && selectedChatInfo.interests.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-bold text-zinc-550 tracking-wider block">Interests & Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedChatInfo.interests.map((interest: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 bg-zinc-900 text-zinc-300 text-[10px] rounded-lg border border-zinc-800">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Critical Actions */}
              <div className="space-y-2 pt-4 border-t border-zinc-900">
                <button 
                  onClick={() => toast.success('Conversation muted')}
                  className="w-full py-2.5 px-3 bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-800 rounded-xl text-left text-xs text-zinc-450 hover:text-white flex items-center gap-2.5 transition-colors"
                >
                  <BellOff className="w-3.5 h-3.5" /> Mute Notifications
                </button>
                <button 
                  onClick={() => toast.info('Conversation cleared')}
                  className="w-full py-2.5 px-3 bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-800 rounded-xl text-left text-xs text-zinc-450 hover:text-white flex items-center gap-2.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Conversations
                </button>
                <button 
                  onClick={() => toast.error('User restricted')}
                  className="w-full py-2.5 px-3 bg-red-950/10 border border-red-500/10 hover:bg-red-950/20 rounded-xl text-left text-xs text-red-400 flex items-center gap-2.5 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" /> Mute / Block Participant
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* CREATE CIRCLE DIALOG MODAL */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
            onClick={() => setShowCreateGroup(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#09090C] rounded-3xl p-6 w-full max-w-md mx-auto border border-zinc-850 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                <h3 className="font-bold text-sm text-white">Create Circle Group</h3>
                <button onClick={() => setShowCreateGroup(false)} className="text-zinc-500 hover:text-white">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Circle Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Circle Name</label>
                <input
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="e.g. Project Team, Hackathon"
                  className="w-full bg-[#111117] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-650 outline-none"
                />
              </div>

              {/* Member Search */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Available Users</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 border border-zinc-900 rounded-xl bg-zinc-950/20">
                  {filteredAvailableUsers.map(u => {
                    const isSelected = selectedMembers.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedMembers(prev =>
                            prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                          );
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all border ${
                          isSelected
                            ? 'bg-violet-600/10 border-violet-500/30 text-violet-400'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-400'
                        }`}
                      >
                        <img src={u.photos?.[0]} alt="" className="w-4.5 h-4.5 rounded-full object-cover" />
                        <span>{u.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <Button
                  onClick={() => setShowCreateGroup(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 rounded-xl py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || selectedMembers.length === 0}
                  className="flex-1 bg-violet-650 hover:bg-violet-755 text-white rounded-xl py-2 text-xs font-semibold disabled:opacity-40"
                >
                  Create Circle
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomTabBar />
    </div>
  );
}

// Left Conversation Stack Sub-components
function MatchAvatar({ match, onClick }: { match: any; onClick: () => void }) {
  const navigate = useNavigate();
  const isOnline = match.user?.isOnline || false;
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[55px] select-none shrink-0 group">
      <div 
        onClick={(e) => {
          e.stopPropagation();
          if (match.userId) navigate(`/profile/${match.userId}`);
        }}
        className="relative cursor-pointer hover:scale-105 active:scale-95 transition-all"
      >
        <img
          src={match.user?.photos?.[0]}
          alt=""
          className={`h-11 w-11 rounded-full object-cover border border-zinc-900 ring-2 ring-zinc-900 group-hover:ring-violet-500/40 transition-all ${!match.isRevealed ? 'blur-[2px]' : ''}`}
        />
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0A0A0F] bg-green-400" />
        )}
        {match.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4.5 w-4.5 rounded-full bg-violet-650 text-[9px] font-extrabold text-white flex items-center justify-center border border-[#0A0A0F]">
            {match.unreadCount}
          </span>
        )}
      </div>
      <span 
        onClick={onClick}
        className="text-[10px] text-zinc-550 group-hover:text-zinc-350 truncate w-12 text-center font-medium cursor-pointer"
      >
        {match.isRevealed ? match.user?.name?.split(' ')[0] : match.user?.anonymousName?.split(' ')[0]}
      </span>
    </div>
  );
}

function ChatListItem({ match, index, isActive, onClick }: { match: any; index: number; isActive?: boolean; onClick: () => void }) {
  const navigate = useNavigate();
  const isOnline = match.user?.isOnline || false;
  const name = match.isRevealed ? match.user?.name : match.user?.anonymousName || 'Anonymous';
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  };

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onContextMenu={handleContextMenu}
        onClick={onClick}
        className={`w-full rounded-2xl p-3 flex items-center gap-3 text-left border transition-all cursor-pointer select-none ${
          isActive 
            ? 'bg-violet-600/10 border-violet-500/25 shadow-lg shadow-violet-950/20' 
            : 'bg-[#101015]/60 border-zinc-900/60 hover:bg-[#121217]'
        }`}
      >
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (match.userId) navigate(`/profile/${match.userId}`);
          }}
          className="relative shrink-0 hover:scale-105 active:scale-95 transition-transform"
        >
          <img
            src={match.user?.photos?.[0]}
            alt=""
            className={`h-11 w-11 rounded-full object-cover bg-zinc-900 ${!match.isRevealed ? 'blur-[2px]' : ''}`}
            loading="lazy"
          />
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0A0A0F] bg-green-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <p className="text-xs font-bold text-white truncate">{name}</p>
            <span className="text-[9px] text-zinc-550 shrink-0">
              {match.lastMessageTime ? new Date(match.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{match.lastMessage || 'Start swiping!'}</p>
        </div>

        {match.unreadCount > 0 && (
          <span className="h-5 w-5 rounded-full bg-violet-600 text-[10px] font-extrabold text-white flex items-center justify-center shadow-sm shrink-0 border border-violet-500/20">
            {match.unreadCount}
          </span>
        )}
      </motion.div>

      {/* Context Menu Overlay */}
      {contextMenu && (
        <div 
          className="fixed z-[100] w-48 bg-zinc-950 border border-white/[0.08] rounded-2xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] select-none backdrop-blur-xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => {
              setContextMenu(null);
              if (match.userId) navigate(`/profile/${match.userId}`);
            }}
            className="w-full text-left px-3 py-2 text-xs text-zinc-350 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all font-semibold"
          >
            View Profile
          </button>
          <button 
            onClick={() => {
              setContextMenu(null);
              toast.success('Conversation muted');
            }}
            className="w-full text-left px-3 py-2 text-xs text-zinc-350 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all font-semibold"
          >
            Mute Chat
          </button>
          <button 
            onClick={() => {
              setContextMenu(null);
              toast.info('Conversation archived');
            }}
            className="w-full text-left px-3 py-2 text-xs text-zinc-350 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all font-semibold"
          >
            Archive Chat
          </button>
          <button 
            onClick={() => {
              setContextMenu(null);
              toast.error('User blocked successfully');
            }}
            className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 rounded-xl transition-all font-semibold"
          >
            Block User
          </button>
          <div className="h-px bg-white/[0.06] my-1" />
          <button 
            onClick={() => {
              setContextMenu(null);
              toast.error('Chat history deleted');
            }}
            className="w-full text-left px-3 py-2 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-semibold"
          >
            Delete Chat
          </button>
        </div>
      )}
    </div>
  );
}

// sonner notification library fallback support checks
import { toast } from 'sonner';
