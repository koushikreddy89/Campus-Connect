import { useEffect, useRef, useState, useMemo } from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';
import { EmptyState } from '@/components/EmptyState';
import { BottomTabBar } from '@/components/BottomTabBar';
import { 
  ArrowLeft, Bell, Heart, MessageSquare, ThumbsUp, UserPlus, 
  Megaphone, Briefcase, Calendar, Search, Trash2, CheckCheck, 
  Loader2, ChevronRight, Inbox, MessageCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Mapping of icons based on notification type
const icons: Record<string, any> = {
  friend_request: UserPlus,
  friend_accept: CheckCheck,
  post_like: ThumbsUp,
  post_comment: MessageSquare,
  comment_reply: MessageSquare,
  new_message: MessageCircle,
  admin_announcement: Megaphone,
  placement_announcement: Briefcase,
  alumni_referral: Briefcase,
  event_invitation: Calendar,
  mention: Megaphone,
  profile_viewed: Bell
};

const iconColors: Record<string, string> = {
  friend_request: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  friend_accept: 'text-green-400 bg-green-500/10 border-green-500/20',
  post_like: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  post_comment: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  comment_reply: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  new_message: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  admin_announcement: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  placement_announcement: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  alumni_referral: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  event_invitation: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  mention: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  profile_viewed: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
};

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'messages', label: 'Messages' },
  { id: 'social', label: 'Social' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'placements', label: 'Placements' },
  { id: 'events', label: 'Events' },
  { id: 'mentions', label: 'Mentions' }
];

export default function NotificationsPage() {
  const { 
    notifications, loading, hasMore, filter, searchQuery,
    setFilter, setSearchQuery, fetchNotifications, markRead, 
    markAllRead, deleteNotifications 
  } = useNotificationStore();

  const currentUserId = useAuthStore(s => s._id);
  const navigate = useNavigate();
  const observerRef = useRef<HTMLDivElement>(null);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Initialize notifications on mount
  useEffect(() => {
    fetchNotifications(true);
  }, []);

  // Search debounce / update handler
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  // Infinite scroll trigger via intersection observer
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchNotifications(false);
      }
    }, { threshold: 0.8 });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, fetchNotifications]);

  const handleNotificationClick = (n: Notification) => {
    markRead([n.id]);
    
    // Smart router targets matching entity types
    if (n.type === 'new_message') {
      navigate(`/chat/${n.relatedId}`);
    } else if (n.type === 'friend_request') {
      navigate('/alumni');
    } else if (n.type === 'friend_accept') {
      navigate(`/profile/${n.senderId || n.relatedId}`);
    } else if (n.type === 'post_like' || n.type === 'post_comment' || n.type === 'comment_reply') {
      navigate('/feed');
    } else if (n.type === 'placement_announcement' || n.type === 'alumni_referral') {
      navigate('/alumni');
    } else if (n.type === 'profile_viewed') {
      navigate(`/profile/${n.relatedId}`);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotifications([id]);
  };

  // Helper to highlight matching text in notification text/title
  const highlightText = (textStr: string, highlight: string) => {
    if (!highlight.trim()) return textStr;
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = textStr.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-violet-500/30 text-white rounded-[2px] px-0.5">{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-300 pb-24 select-none relative overflow-x-hidden">
      {/* Background Lighting blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-3 z-0">
        <div className="absolute top-10 right-10 w-96 h-96 rounded-full bg-violet-600/10 blur-[130px]" />
      </div>

      {/* Floating Glass Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-950/70 border-b border-white/[0.06] select-none">
        <div className="max-w-[900px] mx-auto w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 hover:bg-white/[0.06] rounded-xl text-zinc-400 hover:text-white transition-all active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-white tracking-wide">Notifications</h1>
          </div>
          
          <button 
            onClick={() => markAllRead()}
            className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1.5 px-3 py-2 hover:bg-violet-500/10 rounded-xl transition-all"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto w-full px-6 mt-4 space-y-4 relative z-10">
        {/* Search Bar Container */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-550 w-4 h-4" />
          <input 
            type="text"
            placeholder="Search notification descriptions..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            className="w-full bg-[#111118]/85 border border-white/[0.08] focus:border-violet-600 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 outline-none transition-colors"
          />
        </div>

        {/* Tab Filters Scrollbar */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none hide-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all ${
                filter === tab.id 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/20' 
                  : 'bg-zinc-900 border border-white/[0.04] text-zinc-450 hover:text-white hover:bg-zinc-850'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications Grid List */}
        <div className="space-y-2">
          {notifications.length === 0 && !loading ? (
            <div className="py-20">
              <EmptyState
                icon={<Bell className="h-10 w-10 text-zinc-650 animate-pulse" />}
                title="All caught up!"
                description={searchQuery ? "No notifications match your search terms." : "You don't have any notifications at the moment."}
              />
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.map((n) => {
                const Icon = icons[n.type] || Bell;
                const isUnread = !n.read;

                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full flex items-center gap-4 p-4 rounded-3xl bg-[#111118]/65 border text-left cursor-pointer transition-all hover:scale-[1.008] duration-200 group/notif ${
                      isUnread 
                        ? 'border-violet-500/20 bg-gradient-to-r from-violet-600/5 to-transparent' 
                        : 'border-white/[0.04]'
                    }`}
                  >
                    {/* Icon Bubble */}
                    <div className="relative shrink-0">
                      <div className={`h-11 w-11 rounded-full border flex items-center justify-center transition-transform group-hover/notif:scale-105 duration-200 ${
                        iconColors[n.type] || 'text-zinc-400 bg-zinc-900 border-zinc-800'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    {/* Content Detail */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs truncate ${isUnread ? 'text-white font-bold' : 'text-zinc-350 font-medium'}`}>
                          {n.title}
                        </span>
                        
                        {/* Purple Dot Breathing Indicator */}
                        {isUnread && (
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] leading-relaxed break-words line-clamp-2 ${isUnread ? 'text-zinc-200 font-semibold' : 'text-zinc-450'}`}>
                        {highlightText(n.body, searchQuery)}
                      </p>
                      
                      <div className="text-[10px] text-zinc-550 font-mono">
                        {new Date(n.createdAt).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover/notif:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDelete(e, n.id)}
                        className="p-2 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 rounded-xl transition-all"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-zinc-550 group-hover/notif:translate-x-0.5 transition-transform" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {/* Skeleton Loaders for Infinite Scroll */}
          {loading && (
            <div className="space-y-2 pt-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-full flex items-center gap-4 p-4 rounded-3xl bg-[#111118]/65 border border-white/[0.04] animate-pulse">
                  <div className="h-11 w-11 rounded-full bg-zinc-900 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/4 bg-zinc-900 rounded" />
                    <div className="h-2 w-3/4 bg-zinc-900 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Intersection Observer Anchor element */}
          <div ref={observerRef} className="h-4 w-full" />
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}
