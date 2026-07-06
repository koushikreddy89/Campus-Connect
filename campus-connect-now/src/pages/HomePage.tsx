import { motion, AnimatePresence } from 'framer-motion';
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
  BookOpen
} from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';
import { Logo } from '@/components/Logo';
import PlacementsDashboard from '@/components/placements/PlacementsDashboard';

export default function HomePage() {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore(s => s.unreadCount);
  const college = useAuthStore(s => s.college) ?? 'SR University';
  const announcements = useAnnouncementStore(s => s.announcements);
  const fetchAnnouncements = useAnnouncementStore(s => s.fetchAnnouncements);
  const isLoading = useAnnouncementStore(s => s.isLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch announcements on mount and when college changes (with real-time interval polling)
  useEffect(() => {
    fetchAnnouncements(college);
    const interval = setInterval(() => {
      fetchAnnouncements(college);
    }, 10000); // Keep student feed in sync with Admin modifications automatically
    return () => clearInterval(interval);
  }, [college, fetchAnnouncements]);

  // Filter announcements by college, category, and search query
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(ann => {
      // College check
      if (ann.college.toLowerCase() !== college.toLowerCase()) return false;
      
      // Category check
      if (selectedCategory !== 'all') {
        const cat = ann.category?.toLowerCase() || '';
        if (selectedCategory === 'placement' && cat !== 'placement') return false;
        if (selectedCategory === 'internship' && cat !== 'internship') return false;
        if (selectedCategory === 'event' && !['event', 'workshop', 'hackathon', 'club', 'events', 'clubs'].includes(cat)) return false;
        if (selectedCategory === 'notice' && !['notice', 'circular', 'update', 'academic_notice'].includes(cat)) return false;
        if (selectedCategory === 'announcement' && cat !== 'announcement' && cat !== 'announcements') return false;
      }

      // Search check
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

  // Group announcements for display
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
    if (cat === 'placement') return <Briefcase className="h-4 w-4 text-blue-400" />;
    if (cat === 'internship') return <BookOpen className="h-4 w-4 text-emerald-400" />;
    if (['event', 'workshop', 'hackathon', 'club', 'events', 'clubs'].includes(cat)) return <Calendar className="h-4 w-4 text-amber-400" />;
    if (cat === 'emergency') return <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />;
    return <Megaphone className="h-4 w-4 text-purple-400" />;
  };

  const getCategoryBadgeClass = (category: string) => {
    const cat = category?.toLowerCase();
    if (cat === 'placement') return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    if (cat === 'internship') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (['event', 'workshop', 'hackathon'].includes(cat)) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    if (cat === 'emergency') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
  };

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

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24 text-foreground font-sans page-transition">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-5 pt-5 pb-3 bg-background/95 backdrop-blur-lg sticky top-0 z-40 border-b border-border/45"
      >
        <div className="flex items-center gap-2">
          <Logo variant="icon" size="sm" />
          <div>
            <h1 className="font-display text-lg font-bold text-gradient">Campus Communication</h1>
            <p className="text-[10px] text-muted-foreground font-medium -mt-0.5">{college} Official Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/notifications')}
            className="relative p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-accent glow-accent" />
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Hero Header Card */}
      {selectedCategory !== 'placement' && (
        <div className="px-5 mt-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Shield className="h-24 w-24 text-primary" />
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary-foreground border border-primary/30 mb-3 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-primary-foreground" />
                Official Channel
              </span>
              <h2 className="text-xl font-bold text-white leading-tight">College Announcements</h2>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                Official academic notices, placements drives, events, and circulars directly from {college} administration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Category Filters */}
      <div className="px-5 mt-4 space-y-3">
        {selectedCategory !== 'placement' && (
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search official notices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/60 border border-border rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary transition-colors text-white placeholder:text-muted-foreground"
            />
          </div>
        )}

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1">
          {[
            { id: 'all', label: 'All Board' },
            { id: 'announcement', label: 'Announcements' },
            { id: 'placement', label: 'Placements' },
            { id: 'event', label: 'Events' },
            { id: 'notice', label: 'Notices' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex-shrink-0 transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-secondary/40 border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements Content Grid */}
      <div className="px-5 mt-5 flex-1 flex flex-col space-y-6">
        {selectedCategory === 'placement' ? (
          <PlacementsDashboard />
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="text-xs text-muted-foreground">Syncing with MongoDB...</span>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/45 p-6 flex flex-col items-center justify-center">
            <Megaphone className="w-10 h-10 text-muted-foreground/60 mb-2" />
            <h3 className="text-sm font-bold text-foreground mb-1">{getEmptyStateContent().title}</h3>
            <p className="text-xs text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
              {getEmptyStateContent().description}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. PINNED / IMPORTANT SECTION */}
            {pinnedAnnouncements.length > 0 && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-1.5">
                  <Pin className="h-3.5 w-3.5 text-red-500 fill-current" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">Important Notices</h3>
                </div>
                <div className="space-y-4">
                  {pinnedAnnouncements.map((ann) => (
                    <CommunicationCard key={ann.id} ann={ann} getBadgeClass={getCategoryBadgeClass} />
                  ))}
                </div>
              </div>
            )}



            {/* 2. PLACEMENT UPDATES */}
            {placementUpdates.length > 0 && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">Placement Drives</h3>
                </div>
                <div className="space-y-4">
                  {placementUpdates.map((ann) => (
                    <CommunicationCard key={ann.id} ann={ann} getBadgeClass={getCategoryBadgeClass} />
                  ))}
                </div>
              </div>
            )}

            {/* 4. UPCOMING EVENTS */}
            {upcomingEvents.length > 0 && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Workshops & Events</h3>
                </div>
                <div className="space-y-4">
                  {upcomingEvents.map((ann) => (
                    <CommunicationCard key={ann.id} ann={ann} getBadgeClass={getCategoryBadgeClass} />
                  ))}
                </div>
              </div>
            )}

            {/* 5. LATEST NOTICES */}
            {latestNotices.length > 0 && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-purple-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">Circulars & Notices</h3>
                </div>
                <div className="space-y-4">
                  {latestNotices.map((ann) => (
                    <CommunicationCard key={ann.id} ann={ann} getBadgeClass={getCategoryBadgeClass} />
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

interface CommunicationCardProps {
  ann: Announcement;
  getBadgeClass: (cat: string) => string;
}

function CommunicationCard({ ann, getBadgeClass }: CommunicationCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border bg-card/40 p-5 hover:border-primary/30 transition-all flex flex-col justify-between shadow-md ${
        ann.category === 'emergency' || (ann as any).isPinned
          ? 'border-red-500/20 bg-gradient-to-r from-red-500/5 to-card/40'
          : 'border-white/10'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Shield className={`w-3.5 h-3.5 ${ann.category === 'emergency' ? 'text-red-400' : 'text-primary'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${ann.category === 'emergency' ? 'text-red-400' : 'text-primary'}`}>
            Admin Verified
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">
          {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Body */}
      <div className="space-y-2 flex-1">
        <h4 className="text-sm font-extrabold text-white leading-snug">{ann.title}</h4>
        <p className={`text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words ${showDetails ? '' : 'line-clamp-3'}`}>
          {ann.description}
        </p>

        {ann.imageURL && (
          <div className="rounded-xl overflow-hidden mt-3 border border-white/5 max-h-64">
            <img src={ann.imageURL} alt="" className="w-full object-cover" loading="lazy" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04] flex-wrap gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getBadgeClass(ann.category)}`}>
            {ann.category}
          </span>
          <span className="text-[10px] text-muted-foreground">
            by Admin
          </span>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-primary font-bold hover:underline transition-all flex items-center gap-1"
        >
          {showDetails ? 'Hide Details' : 'View Details'}
        </button>
      </div>
    </motion.div>
  );
}
