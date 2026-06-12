import { useState, useEffect } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { useChatStore } from '@/store/chatStore';
import { useGroupChatStore } from '@/store/groupChatStore';
import { useUserStore } from '@/store/userStore';
import { BottomTabBar } from '@/components/BottomTabBar';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { MessageCircle, Users, Plus, X } from 'lucide-react';
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

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    createGroup(groupName.trim(), selectedMembers);
    setGroupName('');
    setMemberSearch('');
    setSelectedMembers([]);
    setShowCreateGroup(false);
  };

  const handleItemClick = (id: string, type: 'direct' | 'group') => {
    setSelectedChat({ id, type });
    // If mobile width, trigger standard react-router navigation
    if (window.innerWidth < 1024) {
      navigate(type === 'direct' ? `/chat/${id}` : `/chat/group/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 page-transition flex flex-col h-screen overflow-hidden">
      {/* Split Pane Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 flex-1 min-h-0 w-full">
        
        {/* Left Column: Messages List */}
        <div className="col-span-1 lg:col-span-4 flex flex-col border-r border-border/10 h-full overflow-y-auto hide-scrollbar">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
            <h1 className="font-display text-xl font-bold text-foreground">Messages</h1>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowCreateGroup(true)}
              className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center"
            >
              <Plus className="h-4 w-4 text-primary-foreground" />
            </motion.button>
          </div>

          {/* Tabs */}
          <div className="px-5 mb-4 flex gap-2 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setTab('direct')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                tab === 'direct' ? 'gradient-primary text-primary-foreground' : 'bg-secondary/80 text-muted-foreground'
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" /> Direct
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setTab('groups')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                tab === 'groups' ? 'gradient-primary text-primary-foreground' : 'bg-secondary/80 text-muted-foreground'
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Circles
              {groups.length > 0 && <span className="text-[9px] ml-0.5">{groups.length}</span>}
            </motion.button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto pb-6">
            {tab === 'direct' ? (
              <>
                {/* Matches row */}
                {matches.length > 0 && (
                  <div className="px-5 mb-4">
                    <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">New Matches</p>
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
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

                {/* Chat list */}
                <div className="px-5 space-y-2">
                  {matches.length === 0 ? (
                    <EmptyState
                      icon={<MessageCircle className="h-8 w-8 text-muted-foreground" />}
                      title="No matches yet"
                      description="Start swiping to find your match!"
                    />
                  ) : (
                    matches.filter(m => m.lastMessage).map((m, i) => (
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
              <div className="px-5 space-y-2">
                {groups.length === 0 ? (
                  <EmptyState
                    icon={<Users className="h-8 w-8 text-muted-foreground" />}
                    title="No circles yet"
                    description="Create a group to chat with friends!"
                  />
                ) : (
                  groups.map((g, i) => (
                    <motion.button
                      key={g.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleItemClick(g.id, 'group')}
                      className={`w-full rounded-2xl p-3.5 flex items-center gap-3 text-left border transition-all ${
                        selectedChat?.id === g.id 
                          ? 'bg-primary/15 border-primary/40' 
                          : 'glass border-transparent hover:border-white/[0.08]'
                      }`}
                    >
                      <img src={g.avatar} alt="" className="h-12 w-12 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-foreground">{g.name}</p>
                          <span className="text-[10px] text-muted-foreground">{g.members.length} members</span>
                        </div>
                        {g.lastMessage && (
                          <p className="text-xs text-muted-foreground truncate">{g.lastMessage}</p>
                        )}
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat Pane (Desktop only) */}
        <div className="hidden lg:flex lg:col-span-8 flex-col h-full bg-slate-950/20">
          {selectedChat ? (
            selectedChat.type === 'direct' ? (
              <ChatPage key={selectedChat.id} embeddedMatchId={selectedChat.id} />
            ) : (
              <GroupChatPage key={selectedChat.id} embeddedGroupId={selectedChat.id} />
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-14 w-14 rounded-full gradient-primary flex items-center justify-center mb-4 glow-primary opacity-80">
                <MessageCircle className="h-7 w-7 text-primary-foreground" />
              </div>
              <h2 className="text-base font-bold text-foreground">Your Messenger Workspace</h2>
              <p className="text-xs text-muted-foreground max-w-xs mt-1.5">
                Select a match or college circle from the list to start messaging in real-time.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 py-6"
            onClick={() => setShowCreateGroup(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={e => e.stopPropagation()}
              className="glass-strong rounded-3xl p-6 w-full max-w-lg md:max-w-xl mx-auto flex flex-col max-h-[80vh] shadow-2xl relative border border-white/[0.08]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border/20 flex-shrink-0">
                <h3 className="font-display text-lg font-bold text-foreground">Create Circle</h3>
                <button 
                  onClick={() => setShowCreateGroup(false)}
                  className="p-1 rounded-xl hover:bg-secondary/55 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>

              {/* Body (scrollable) */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
                {/* Circle Name Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Circle Name</label>
                  <input
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    placeholder="Circle name..."
                    autoFocus
                    className="w-full bg-secondary/80 border border-border/40 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>

                {/* Member Search Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Search Members</label>
                  <input
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Type name to filter..."
                    className="w-full bg-secondary/80 border border-border/40 rounded-2xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>

                {/* Selected Members Chips */}
                {selectedMembers.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Selected Members ({selectedMembers.length})</label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-secondary/40 border border-border/40 rounded-2xl max-h-24 overflow-y-auto">
                      {selectedMembers.map(memberId => {
                        const user = availableUsers.find(u => u.id === memberId);
                        if (!user) return null;
                        return (
                          <div 
                            key={memberId} 
                            className="inline-flex items-center gap-1.5 bg-primary/20 border border-primary/30 text-foreground px-2 py-1 rounded-full text-[10px] font-semibold"
                          >
                            <img src={user.photos[0]} alt="" className="h-4.5 w-4.5 rounded-full object-cover" />
                            <span>{user.name.split(' ')[0]}</span>
                            <button 
                              type="button" 
                              onClick={() => setSelectedMembers(prev => prev.filter(id => id !== memberId))}
                              className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available Members Pool */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Available Members</label>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                    {filteredAvailableUsers.slice(0, 8).map(u => {
                      const isSelected = selectedMembers.includes(u.id);
                      return (
                        <motion.button
                          key={u.id}
                          type="button"
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            setSelectedMembers(prev =>
                              prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                            );
                          }}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all border ${
                            isSelected
                              ? 'gradient-primary text-primary-foreground border-primary glow-primary shadow-sm'
                              : 'bg-secondary/60 hover:bg-secondary border-border/30 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <img src={u.photos[0]} alt="" className="h-5 w-5 rounded-full object-cover" />
                          <span>{u.name}</span>
                        </motion.button>
                      );
                    })}
                    {filteredAvailableUsers.length === 0 && (
                      <p className="text-xs text-muted-foreground/60 italic py-2">No matching members found</p>
                    )}
                  </div>
                </div>

                {/* Circle Preview Card */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Circle Preview</label>
                  <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl flex items-center gap-4">
                    {/* Overlapping avatars stack */}
                    <div className="flex -space-x-3 overflow-hidden flex-shrink-0">
                      {selectedMembers.slice(0, 4).map(memberId => {
                        const user = availableUsers.find(u => u.id === memberId);
                        if (!user) return null;
                        return (
                          <img
                            key={memberId}
                            src={user.photos[0]}
                            alt=""
                            className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-950 object-cover"
                          />
                        );
                      })}
                      {selectedMembers.length > 4 && (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary/20 text-[10px] font-bold text-primary ring-2 ring-slate-950 border border-primary/30">
                          +{selectedMembers.length - 4}
                        </div>
                      )}
                      {selectedMembers.length === 0 && (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-muted-foreground ring-2 ring-slate-950">
                          👥
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">
                        {groupName.trim() || 'Circle Preview'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} • Ready to compile
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border/20 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateGroup(false)}
                  className="flex-1 rounded-2xl h-11 text-xs font-bold border-border/40 hover:bg-secondary/40"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || selectedMembers.length === 0}
                  className="flex-1 rounded-2xl h-11 text-xs font-bold gradient-primary text-primary-foreground glow-primary disabled:opacity-40"
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

// Sub-components
function MatchAvatar({ match, onClick }: { match: any; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 min-w-[60px]">
      <div className="relative">
        <img
          src={match.user.photos[0]}
          alt=""
          className={`h-14 w-14 rounded-full border-2 border-primary/50 ${!match.isRevealed ? 'blur-[3px]' : ''}`}
        />
        {match.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent text-[9px] font-bold text-accent-foreground flex items-center justify-center">
            {match.unreadCount}
          </span>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground truncate w-14 text-center">
        {match.isRevealed ? match.user.name.split(' ')[0] : match.user.anonymousName?.split(' ')[0]}
      </span>
    </button>
  );
}

function ChatListItem({ match, index, isActive, onClick }: { match: any; index: number; isActive?: boolean; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`w-full rounded-2xl p-3.5 flex items-center gap-3 text-left border transition-all ${
        isActive 
          ? 'bg-primary/15 border-primary/40' 
          : 'glass border-transparent hover:border-white/[0.08]'
      }`}
    >
      <img
        src={match.user.photos[0]}
        alt=""
        className={`h-12 w-12 rounded-full ${!match.isRevealed ? 'blur-[3px]' : ''}`}
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground">
            {match.isRevealed ? match.user.name : match.user.anonymousName}
          </p>
        </div>
        <p className="text-xs text-muted-foreground truncate">{match.lastMessage}</p>
      </div>
      {match.unreadCount > 0 && (
        <span className="h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
          {match.unreadCount}
        </span>
      )}
    </motion.button>
  );
}
