import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useAnnouncementStore, Announcement } from '@/store/announcementStore';
import { useAuthStore } from '@/store/authStore';
import { BottomTabBar } from '@/components/BottomTabBar';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Inbox, 
  Megaphone, 
  Shield, 
  Briefcase, 
  Calendar, 
  FileText, 
  AlertCircle, 
  Pin, 
  Sparkles, 
  Search,
  BookOpen,
  Download,
  ArrowRight,
  MapPin,
  Award,
  Clock,
  UserCheck,
  RefreshCw,
  Heart,
  Bookmark,
  Share2
} from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Logo } from '@/components/Logo';
import PlacementsDashboard from '@/components/placements/PlacementsDashboard';

// Apple/Linear style ambient gradient mesh and drifting micro-particles
function AmbientBackground() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
      
      {/* Floating Blur blobs */}
      <motion.div 
        animate={prefersReduced ? {} : { 
          scale: [1, 1.05, 1], 
          x: [0, 20, 0], 
          y: [0, -25, 0] 
        }} 
        transition={{ 
          repeat: Infinity, 
          duration: 35, 
          ease: 'easeInOut' 
        }} 
        className="absolute top-[10%] left-[20%] h-[300px] w-[300px] rounded-full bg-violet-600/3 blur-[100px]" 
      />
      <motion.div 
        animate={prefersReduced ? {} : { 
          scale: [1, 1.08, 1], 
          x: [0, -20, 0], 
          y: [0, 25, 0] 
        }} 
        transition={{ 
          repeat: Infinity, 
          duration: 40, 
          ease: 'easeInOut',
          delay: 5
        }} 
        className="absolute bottom-[20%] right-[15%] h-[400px] w-[400px] rounded-full bg-amber-500/2 blur-[120px]" 
      />

      {/* Tiny particles */}
      {!prefersReduced && (
        <div className="absolute inset-0 opacity-[0.2]">
          {[...Array(isMobile ? 8 : 16)].map((_, i) => {
            const size = Math.random() * 2 + 1;
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const duration = Math.random() * 25 + 25;
            const delay = Math.random() * -25;
            return (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white/30 blur-[0.5px]"
                style={{
                  width: size,
                  height: size,
                  left: `${left}%`,
                  top: `${top}%`,
                }}
                animate={{
                  y: [0, -100, 0],
                  x: [0, Math.random() * 30 - 15, 0],
                  opacity: [0.1, 0.7, 0.1]
                }}
                transition={{
                  duration: duration,
                  repeat: Infinity,
                  delay: delay,
                  ease: "linear"
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CounterProps {
  value: number;
}

// Counting animations for stats
function Counter({ value }: CounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setCount(0);
      return;
    }
    
    const duration = 1.2; // seconds
    const totalFrames = Math.round(duration * 60);
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      // Ease out quad
      const current = Math.round(end * (progress * (2 - progress)));
      setCount(current);

      if (frame >= totalFrames) {
        setCount(end);
        clearInterval(timer);
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
}

export default function HomePage() {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore(s => s.unreadCount);
  const college = useAuthStore(s => s.college) ?? 'SR University';
  const announcements = useAnnouncementStore(s => s.announcements);
  const fetchAnnouncements = useAnnouncementStore(s => s.fetchAnnouncements);
  const isLoading = useAnnouncementStore(s => s.isLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    fetchAnnouncements(college);
    const interval = setInterval(() => {
      fetchAnnouncements(college);
    }, 10000);
    return () => clearInterval(interval);
  }, [college, fetchAnnouncements]);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(ann => {
      if (ann.college.toLowerCase() !== college.toLowerCase()) return false;
      
      if (selectedCategory !== 'all') {
        const cat = ann.category?.toLowerCase() || '';
        if (selectedCategory === 'placement' && cat !== 'placement') return false;
        if (selectedCategory === 'internship' && cat !== 'internship') return false;
        if (selectedCategory === 'event' && !['event', 'workshop', 'hackathon', 'club', 'events', 'clubs'].includes(cat)) return false;
        if (selectedCategory === 'notice' && !['notice', 'circular', 'update', 'academic_notice'].includes(cat)) return false;
        if (selectedCategory === 'announcement' && cat !== 'announcement' && cat !== 'announcements') return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          ann.title.toLowerCase().includes(query) ||
          ann.description.toLowerCase().includes(query) ||
          (ann.category || '').toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [announcements, college, selectedCategory, searchQuery]);

  // Derive stats dynamically from database
  const stats = useMemo(() => {
    const active = announcements.filter(ann => ann.college.toLowerCase() === college.toLowerCase());
    return {
      announcements: active.filter(ann => ann.category === 'announcement' || ann.category === 'announcements').length,
      placements: active.filter(ann => ann.category === 'placement').length,
      events: active.filter(ann => ['event', 'workshop', 'hackathon', 'club', 'events', 'clubs'].includes(ann.category)).length,
      notices: active.filter(ann => ['notice', 'circular', 'update', 'academic_notice', 'emergency'].includes(ann.category)).length,
    };
  }, [announcements, college]);

  const pinnedAnnouncements = useMemo(() => {
    return filteredAnnouncements.filter(ann => (ann as any).isPinned || ann.category === 'emergency');
  }, [filteredAnnouncements]);

  const placementUpdates = useMemo(() => {
    return filteredAnnouncements.filter(ann => ann.category === 'placement');
  }, [filteredAnnouncements]);

  const internshipOpportunities = useMemo(() => {
    return filteredAnnouncements.filter(ann => ann.category === 'internship');
  }, [filteredAnnouncements]);

  const upcomingEvents = useMemo(() => {
    return filteredAnnouncements.filter(ann => ['event', 'workshop', 'hackathon', 'club', 'events', 'clubs'].includes(ann.category));
  }, [filteredAnnouncements]);

  const latestNotices = useMemo(() => {
    return filteredAnnouncements.filter(ann => ['notice', 'circular', 'update', 'academic_notice', 'emergency', 'announcement', 'announcements'].includes(ann.category));
  }, [filteredAnnouncements]);

  const getCategoryIcon = (category: string) => {
    const cat = category?.toLowerCase();
    if (cat === 'placement') return <Briefcase className="h-4 w-4" />;
    if (cat === 'internship') return <BookOpen className="h-4 w-4" />;
    if (['event', 'workshop', 'hackathon', 'club', 'events', 'clubs'].includes(cat)) return <Calendar className="h-4 w-4" />;
    if (cat === 'emergency') return <AlertCircle className="h-4 w-4 text-red-400" />;
    return <Megaphone className="h-4 w-4" />;
  };

  const getCategoryBadgeClass = (category: string) => {
    const cat = category?.toLowerCase();
    if (cat === 'placement') return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    if (cat === 'internship') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (['event', 'workshop', 'hackathon', 'club', 'events', 'clubs'].includes(cat)) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    if (cat === 'emergency') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col pb-24 font-sans select-none overflow-x-hidden relative">
      <AmbientBackground />

      {/* Sticky Header Nav */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="flex items-center justify-between px-6 py-4 bg-[#09090B]/60 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-50 w-full"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center shadow-lg">
            <Logo variant="icon" size="sm" className="text-violet-400" />
          </div>
          <div>
            <h1 className="font-display text-sm md:text-base font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
              Campus Communication
            </h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider -mt-0.5">{college} Official Hub</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => navigate('/notifications')}
            className="relative p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200"
            whileHover="hover"
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              variants={{
                hover: {
                  rotate: [0, -12, 12, -12, 12, 0],
                  transition: { duration: 0.5, ease: "easeInOut" }
                }
              }}
            >
              <Bell className="h-5 w-5 text-zinc-400 group-hover:text-white" />
            </motion.div>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
          </motion.button>
          
          <div className="relative h-9 w-9 rounded-xl border border-white/10 bg-zinc-900 overflow-hidden flex items-center justify-center">
            <span className="text-xs font-bold text-violet-400 font-mono">U</span>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border border-zinc-950" />
          </div>
        </div>
      </motion.div>

      {/* Hero Header Card */}
      {selectedCategory !== 'placement' && (
        <div className="px-6 mt-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 100, delay: 0.15 }}
            className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-gradient-to-br from-[#141824]/90 via-[#0E111A]/95 to-[#09090B] p-6 md:p-8 shadow-2xl backdrop-blur-xl"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Shield className="h-28 w-28 text-white" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  Official Channel
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Campus News & Broadcast</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Real-time official notices, placement opportunities, upcoming hackathons, and circulars directly from {college} administration.
                </p>
              </div>

              <motion.div
                animate={{ y: [-4, 4] }}
                transition={{ repeat: Infinity, repeatType: "reverse", duration: 6, ease: "easeInOut" }}
                className="hidden md:flex h-20 w-20 rounded-2xl bg-white/[0.02] border border-white/10 items-center justify-center shadow-xl backdrop-blur-md"
              >
                <Shield className="h-10 w-10 text-violet-400" />
              </motion.div>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/[0.06] z-10 relative">
              {[
                { label: 'Announcements', value: stats.announcements, color: 'text-violet-400' },
                { label: 'Placements', value: stats.placements, color: 'text-blue-400' },
                { label: 'Events', value: stats.events, color: 'text-amber-400' },
                { label: 'Notices', value: stats.notices, color: 'text-emerald-400' },
              ].map((stat, idx) => (
                <div key={idx} className="text-center md:text-left space-y-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                  <span className={`text-xl md:text-2xl font-black ${stat.color}`}>
                    <Counter value={stat.value} />
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Search and Category Filters */}
      <div className="px-6 mt-6 space-y-4 relative z-10">
        {selectedCategory !== 'placement' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative w-full"
          >
            <motion.div
              animate={{
                borderColor: isSearchFocused ? "rgba(139, 92, 246, 0.4)" : "rgba(255, 255, 255, 0.08)",
                boxShadow: isSearchFocused 
                  ? "0 0 20px 2px rgba(139, 92, 246, 0.1), inset 0 1px 1px rgba(255,255,255,0.05)" 
                  : "0 4px 6px -1px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.02)"
              }}
              transition={{ duration: 0.2 }}
              className="flex items-center w-full bg-white/[0.02] backdrop-blur-xl border rounded-xl overflow-hidden px-4 py-2.5"
            >
              <motion.div whileHover={{ rotate: 15 }} className="mr-3">
                <Search className="w-4 h-4 text-zinc-500" />
              </motion.div>
              <input
                type="text"
                placeholder="Search official notices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full bg-transparent border-none text-xs focus:outline-none text-white placeholder:text-zinc-500"
              />
            </motion.div>
          </motion.div>
        )}

        {/* Categories filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none py-2 w-full">
          {[
            { id: 'all', label: 'All Board' },
            { id: 'announcement', label: 'Announcements' },
            { id: 'placement', label: 'Placements' },
            { id: 'event', label: 'Events' },
            { id: 'notice', label: 'Notices' },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                whileHover={{ y: -3, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`relative px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 flex-shrink-0
                  ${isActive 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 border-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)]' 
                    : 'bg-[#141824]/40 border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20'
                  }
                `}
              >
                {isActive && (
                  <motion.span 
                    layoutId="activeFilterBg" 
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600/20 to-indigo-600/20 mix-blend-overlay" 
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {cat.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Announcements Content Grid */}
      <div className="px-6 mt-6 flex-1 flex flex-col space-y-6 relative z-10">
        {selectedCategory === 'placement' ? (
          <PlacementsDashboard />
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
            <span className="text-xs text-zinc-400">Syncing with database...</span>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <EmptyState 
            selectedCategory={selectedCategory} 
            college={college} 
            onRefresh={() => fetchAnnouncements(college)} 
          />
        ) : (
          <div className="space-y-8">
            {/* 1. PINNED / IMPORTANT SECTION */}
            {pinnedAnnouncements.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <Pin className="h-4 w-4 text-red-500 fill-current" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-red-400">Important Notices</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {pinnedAnnouncements.map((ann) => (
                    <CommunicationCard key={ann.id} ann={ann} getBadgeClass={getCategoryBadgeClass} getCategoryIcon={getCategoryIcon} />
                  ))}
                </div>
              </div>
            )}

            {/* 2. PLACEMENT UPDATES */}
            {placementUpdates.length > 0 && selectedCategory === 'all' && (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-blue-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">Placement Drives</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {placementUpdates.map((ann) => (
                    <CommunicationCard key={ann.id} ann={ann} getBadgeClass={getCategoryBadgeClass} getCategoryIcon={getCategoryIcon} />
                  ))}
                </div>
              </div>
            )}

            {/* 3. INTERNSHIP OPPORTUNITIES */}
            {internshipOpportunities.length > 0 && selectedCategory === 'all' && (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">Internship Posts</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {internshipOpportunities.map((ann) => (
                    <CommunicationCard key={ann.id} ann={ann} getBadgeClass={getCategoryBadgeClass} getCategoryIcon={getCategoryIcon} />
                  ))}
                </div>
              </div>
            )}

            {/* 4. UPCOMING EVENTS */}
            {upcomingEvents.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">Workshops & Events</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {upcomingEvents.map((ann) => (
                    <CommunicationCard key={ann.id} ann={ann} getBadgeClass={getCategoryBadgeClass} getCategoryIcon={getCategoryIcon} />
                  ))}
                </div>
              </div>
            )}

            {/* 5. LATEST NOTICES */}
            {latestNotices.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">Circulars & Notices</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {latestNotices.map((ann) => (
                    <CommunicationCard key={ann.id} ann={ann} getBadgeClass={getCategoryBadgeClass} getCategoryIcon={getCategoryIcon} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}

interface EmptyStateProps {
  selectedCategory: string;
  college: string;
  onRefresh: () => void;
}

function EmptyState({ selectedCategory, college, onRefresh }: EmptyStateProps) {
  const getEmptyStateContent = () => {
    if (selectedCategory === 'placement') {
      return {
        title: 'No Placements Listed',
        description: `No official placement drives have been posted for ${college} yet.`
      };
    }
    if (selectedCategory === 'internship') {
      return {
        title: 'No Internships Listed',
        description: `No official internship opportunities have been posted for ${college} yet.`
      };
    }
    if (selectedCategory === 'event') {
      return {
        title: 'No Events Listed',
        description: `No official college events or workshops have been posted for ${college} yet.`
      };
    }
    if (selectedCategory === 'notice') {
      return {
        title: 'No Circulars Listed',
        description: `No official academic notices or circulars have been posted for ${college} yet.`
      };
    }
    return {
      title: 'No Announcements Found',
      description: `No matching official notifications have been posted for ${college} yet.`
    };
  };

  const content = getEmptyStateContent();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="py-16 text-center rounded-[24px] border border-white/[0.08] bg-[#141824]/40 backdrop-blur-xl p-8 flex flex-col items-center justify-center space-y-6"
    >
      <div className="relative h-20 w-20 flex items-center justify-center">
        <div className="absolute inset-0 bg-violet-600/10 rounded-full blur-xl animate-pulse" />
        <motion.div
          animate={{
            y: [-6, 6, -6],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: "easeInOut"
          }}
          className="h-14 w-14 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center shadow-lg"
        >
          <Inbox className="h-7 w-7 text-violet-400" />
        </motion.div>
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut"
          }}
          className="absolute -top-1 -right-1"
        >
          <Megaphone className="h-5 w-5 text-amber-400" />
        </motion.div>
      </div>

      <div className="space-y-2 max-w-sm">
        <h3 className="text-base font-extrabold text-white">{content.title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {content.description}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRefresh}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.25)] transition-all flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2 bg-white/[0.03] border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all"
        >
          Browse Events
        </motion.button>
      </div>
    </motion.div>
  );
}

interface CommunicationCardProps {
  ann: Announcement;
  getBadgeClass: (cat: string) => string;
  getCategoryIcon: (cat: string) => React.ReactNode;
}

function CommunicationCard({ ann, getBadgeClass, getCategoryIcon }: CommunicationCardProps) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  
  // Custom mock analytics for premium SaaS look
  const [likesCount, setLikesCount] = useState(Math.floor(Math.random() * 45) + 12);
  const [readTime] = useState(Math.max(1, Math.ceil((ann.description || '').split(' ').length / 200)));

  const cardRef = useRef<HTMLDivElement>(null);
  const trackView = useAnnouncementStore(s => s.trackView);
  const trackClick = useAnnouncementStore(s => s.trackClick);

  useEffect(() => {
    if (!ann.id && !ann._id) return;
    const targetId = ann.id || ann._id;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    let timer: NodeJS.Timeout;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            timer = setTimeout(() => {
              trackView(targetId);
            }, 1000);
          } else {
            if (timer) clearTimeout(timer);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [ann.id, ann._id, trackView]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlightOpacity = useMotionValue(0);
  const spotlightSpr = useSpring(spotlightOpacity, { damping: 20, stiffness: 120 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
    spotlightOpacity.set(0.08);
  };

  const handleMouseLeave = () => {
    spotlightOpacity.set(0);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarked(!bookmarked);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      const shareUrl = `${window.location.origin}/announcement/${ann.id || ann._id}`;
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const isPlacementOrIntern = ann.category === 'placement' || ann.category === 'internship';
  const isEvent = ['event', 'workshop', 'hackathon', 'club', 'events', 'clubs'].includes(ann.category);
  const isNotice = ['notice', 'circular'].includes(ann.category);
  const isEmergency = ann.category === 'emergency';

  const formattedDate = ann.createdAt 
    ? formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true }) 
    : 'Just now';

  // Accent mapping
  const accentColor = isEmergency ? 'rgba(239, 68, 68, 0.12)' :
                       isPlacementOrIntern ? 'rgba(59, 130, 246, 0.12)' :
                       isEvent ? 'rgba(245, 158, 11, 0.12)' :
                       'rgba(16, 185, 129, 0.12)';

  const cardBorderAccent = isEmergency ? 'hover:border-red-500/30' :
                           isPlacementOrIntern ? 'hover:border-blue-500/30' :
                           isEvent ? 'hover:border-amber-500/30' :
                           'hover:border-emerald-500/30';

  if (isPlacementOrIntern) {
    const resolvedCompany = ann.companyName || ann.title?.split(':')[0]?.trim() || 'Hiring Partner';
    const resolvedRole = ann.jobRole || ann.title?.split(':')[1]?.trim() || ann.title;
    const resolvedSalary = ann.package || ann.stipend || 'Not Specified';
    
    return (
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        layout
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ y: -8, scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`group relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#141824]/75 backdrop-blur-[20px] p-6 shadow-xl transition-all duration-300 cursor-pointer ${cardBorderAccent}`}
        onClick={() => {
          const targetId = ann.relatedId || ann._id || ann.id;
          navigate(`/placement/${targetId}`);
        }}
      >
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: useTransform(
              [mouseX, mouseY, spotlightSpr],
              ([mx, my, op]) => `radial-gradient(350px circle at ${mx}px ${my}px, rgba(255, 255, 255, ${op}), transparent 80%)`
            )
          }}
        />
        <div 
          className="absolute -inset-[1px] rounded-[22px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[-1]"
          style={{
            background: `radial-gradient(250px circle at 50% 50%, ${accentColor}, transparent 80%)`,
          }}
        />

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-blue-400 text-lg shadow-inner">
            {resolvedCompany.substring(0,2).toUpperCase()}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Placement Drive</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{formattedDate}</span>
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white leading-snug group-hover:text-zinc-200 transition-colors">{resolvedRole}</h4>
              <p className="text-xs font-bold text-zinc-400 hover:underline">{resolvedCompany}</p>
            </div>
            
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500 pt-2 border-t border-white/[0.04]">
              <span className="text-emerald-400 font-bold">Package: {resolvedSalary}</span>
              {ann.location && <span>• {ann.location}</span>}
              {ann.employmentType && <span>• {ann.employmentType}</span>}
            </div>

            {/* Micro interaction buttons inside placements card */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{readTime} min read</div>
              <div className="flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.85 }} onClick={handleLike} className={`p-1.5 rounded-lg hover:bg-white/5 ${liked ? 'text-red-400' : 'text-zinc-500'}`}><Heart className="w-4 h-4 fill-current" /></motion.button>
                <motion.button whileTap={{ scale: 0.85 }} onClick={handleBookmark} className={`p-1.5 rounded-lg hover:bg-white/5 ${bookmarked ? 'text-amber-400' : 'text-zinc-500'}`}><Bookmark className="w-4 h-4 fill-current" /></motion.button>
                <motion.button whileTap={{ scale: 0.85 }} onClick={handleShare} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500"><Share2 className="w-4 h-4" /></motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      layout
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`group relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#141824]/75 backdrop-blur-[20px] p-6 shadow-xl transition-all duration-300 ${cardBorderAccent}`}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: useTransform(
            [mouseX, mouseY, spotlightSpr],
            ([mx, my, op]) => `radial-gradient(350px circle at ${mx}px ${my}px, rgba(255, 255, 255, ${op}), transparent 80%)`
          )
        }}
      />
      <div 
        className="absolute -inset-[1px] rounded-[22px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[-1]"
        style={{
          background: `radial-gradient(250px circle at 50% 50%, ${accentColor}, transparent 80%)`,
        }}
      />

      <div className="space-y-4">
        {/* Header Metadata */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getBadgeClass(ann.category)}`}>
            {getCategoryIcon(ann.category)}
            {ann.category}
          </span>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{formattedDate}</span>
        </div>

        {/* Card Main Body */}
        <div className="space-y-2">
          {ann.circularNumber && (
            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">REF: {ann.circularNumber}</span>
          )}
          <h4 className="text-base font-extrabold text-white group-hover:text-zinc-200 transition-colors leading-snug">{ann.title}</h4>
          
          {ann.imageURL && (
            <div className="rounded-2xl overflow-hidden my-3 border border-white/[0.05] max-h-56">
              <img src={ann.imageURL} alt="" className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-500" loading="lazy" />
            </div>
          )}

          <p className={`text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap ${showDetails ? '' : 'line-clamp-3'}`}>
            {ann.description}
          </p>
        </div>

        {/* Specific metadata for events/notices */}
        {(ann.venue || ann.eventDate) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400 pt-2 border-t border-white/[0.04]">
            {ann.venue && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-amber-400" /> {ann.venue}</span>}
            {ann.eventDate && <span className="flex items-center gap-1 font-bold text-white"><Calendar className="h-3.5 w-3.5 text-amber-400" /> {new Date(ann.eventDate).toLocaleDateString()}</span>}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-semibold hover:underline cursor-pointer">
              By: {ann.issuedBy || 'Dean Office'}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{readTime} min read</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-[10px] text-violet-400 font-black hover:underline uppercase tracking-wider mr-2"
            >
              {showDetails ? 'Collapse' : 'Read Notice'}
            </button>

            {/* Metrics */}
            <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {ann.views || 0}
            </span>

            {/* Like */}
            <motion.button 
              whileTap={{ scale: 0.85 }} 
              onClick={handleLike}
              className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${liked ? 'text-red-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Heart className="w-4 h-4 fill-current" />
            </motion.button>

            {/* Bookmark */}
            <motion.button 
              whileTap={{ scale: 0.85 }} 
              onClick={handleBookmark}
              className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${bookmarked ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </motion.button>

            {/* Share / Attachments */}
            {ann.pdfAttachment ? (
              <a
                href={ann.pdfAttachment}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  trackClick(ann.id || ann._id || '');
                }}
                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
              >
                <Download className="w-4 h-4" />
              </a>
            ) : (
              <motion.button 
                whileTap={{ scale: 0.85 }} 
                onClick={handleShare}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-zinc-500 hover:text-zinc-300"
              >
                <Share2 className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
