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
  BookOpen,
  Download,
  ArrowRight,
  MapPin,
  Award,
  Clock,
  UserCheck
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
        className="flex items-center justify-between px-5 pt-5 pb-3 bg-[#0B0F19]/95 backdrop-blur-lg sticky top-0 z-40 border-b border-white/[0.04]"
      >
        <div className="flex items-center gap-2">
          <Logo variant="icon" size="sm" />
          <div>
            <h1 className="font-display text-lg font-bold text-gradient">Campus Communication</h1>
            <p className="text-[10px] text-slate-400 font-medium -mt-0.5">{college} Official Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/notifications')}
            className="relative p-2.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <Bell className="h-5 w-5 text-slate-400 hover:text-white" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Hero Header Card */}
      {selectedCategory !== 'placement' && (
        <div className="px-5 mt-4">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#121826] p-6 shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Shield className="h-24 w-24 text-primary" />
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-[#6D5EF5]/15 text-[#6D5EF5] border border-[#6D5EF5]/20 mb-3 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Official Channel
              </span>
              <h2 className="text-xl font-black text-white leading-tight">Campus Announcements</h2>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                Official notices, placements drives, events, and circulars directly from {college} administration.
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
              className="w-full bg-[#121826] border border-white/[0.05] rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-[#6D5EF5] transition-colors text-white placeholder:text-muted-foreground"
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
              className={`px-4 py-2 rounded-xl text-xs font-bold border flex-shrink-0 transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#6D5EF5] border-[#6D5EF5] text-white'
                  : 'bg-[#121826] border-white/[0.05] text-slate-400 hover:text-white'
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6D5EF5]" />
            <span className="text-xs text-slate-400">Syncing with MongoDB...</span>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-[#121826]/40 p-6 flex flex-col items-center justify-center">
            <Megaphone className="w-10 h-10 text-muted-foreground/60 mb-2" />
            <h3 className="text-sm font-bold text-white mb-1">{getEmptyStateContent().title}</h3>
            <p className="text-xs text-slate-400 max-w-[240px] mx-auto leading-relaxed">
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
                  <h3 className="text-xs font-black uppercase tracking-wider text-red-400">Important Notices</h3>
                </div>
                <div className="space-y-4">
                  {pinnedAnnouncements.map((ann) => (
                    <CommunicationCard key={ann.id} ann={ann} getBadgeClass={getCategoryBadgeClass} />
                  ))}
                </div>
              </div>
            )}

            {/* 2. PLACEMENT UPDATES */}
            {placementUpdates.length > 0 && selectedCategory === 'all' && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-[#6D5EF5]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#6D5EF5]">Placement Drives</h3>
                </div>
                <div className="space-y-4">
                  {placementUpdates.map((ann) => (
                    <CommunicationCard key={ann.id} ann={ann} getBadgeClass={getCategoryBadgeClass} />
                  ))}
                </div>
              </div>
            )}

            {/* 3. INTERNSHIP OPPORTUNITIES */}
            {internshipOpportunities.length > 0 && selectedCategory === 'all' && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-[#16C784]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#16C784]">Internship Posts</h3>
                </div>
                <div className="space-y-4">
                  {internshipOpportunities.map((ann) => (
                    <CommunicationCard key={ann.id} ann={ann} getBadgeClass={getCategoryBadgeClass} />
                  ))}
                </div>
              </div>
            )}

            {/* 4. UPCOMING EVENTS */}
            {upcomingEvents.length > 0 && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#FFB020]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#FFB020]">Workshops & Events</h3>
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
                  <FileText className="h-4 w-4 text-[#16C784]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#16C784]">Circulars & Notices</h3>
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
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const isPlacementOrIntern = ann.category === 'placement' || ann.category === 'internship';
  const isEvent = ['event', 'workshop', 'hackathon', 'club', 'events', 'clubs'].includes(ann.category);
  const isNotice = ['notice', 'circular'].includes(ann.category);

  // 1. PLACEMENTS CARD LAYOUT (Accent: Purple)
  if (isPlacementOrIntern) {
    const resolvedCompany = ann.companyName || ann.title?.split(':')[0]?.trim() || 'Hiring Partner';
    const resolvedRole = ann.jobRole || ann.title?.split(':')[1]?.trim() || ann.title;
    const resolvedSalary = ann.package || ann.stipend || 'Not Specified';
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#121826] p-5 shadow-lg transition-all hover:border-[#6D5EF5]/30 hover:shadow-2xl cursor-pointer"
        onClick={() => {
          const targetId = ann.relatedId || ann._id || ann.id;
          navigate(`/placement/${targetId}`);
        }}
      >
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[#6D5EF5] text-lg">
            {resolvedCompany.substring(0,2).toUpperCase()}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#6D5EF5] uppercase tracking-widest">Placement Drive</span>
              <span className="text-[9px] text-slate-400 font-semibold">
                {ann.createdAt ? formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true }) : 'Just now'}
              </span>
            </div>
            <h4 className="text-sm font-extrabold text-white leading-snug">{resolvedRole}</h4>
            <p className="text-xs font-bold text-slate-300">{resolvedCompany}</p>
            
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-2">
              <span className="text-[#16C784] font-bold">Package: {resolvedSalary}</span>
              {ann.location && <span>• {ann.location}</span>}
              {ann.employmentType && <span>• {ann.employmentType}</span>}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // 2. EVENT CARD LAYOUT (Accent: Orange)
  if (isEvent) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#121826] shadow-lg transition-all hover:border-[#FFB020]/30 hover:shadow-2xl cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        {ann.imageURL && (
          <div className="relative h-40 w-full overflow-hidden border-b border-white/[0.05]">
            <img src={ann.imageURL} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            <div className="absolute top-3 left-3 bg-[#FFB020]/20 backdrop-blur-md border border-[#FFB020]/30 px-3 py-1 rounded-xl text-[9px] font-black uppercase text-[#FFB020] tracking-wider">
              {ann.category}
            </div>
          </div>
        )}

        <div className="p-5 space-y-3">
          {!ann.imageURL && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#FFB020] uppercase tracking-widest">{ann.category}</span>
              <span className="text-[9px] text-slate-400 font-semibold">
                {ann.createdAt ? formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true }) : 'Just now'}
              </span>
            </div>
          )}
          <h4 className="text-sm font-extrabold text-white leading-snug">{ann.title}</h4>
          <p className={`text-xs text-slate-300 leading-relaxed whitespace-pre-wrap ${showDetails ? '' : 'line-clamp-2'}`}>
            {ann.description}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[10px] text-slate-400">
            {ann.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#FFB020]" />
                {ann.venue}
              </span>
            )}
            {ann.eventDate && (
              <span className="flex items-center gap-1 font-bold text-white">
                <Calendar className="w-3.5 h-3.5 text-[#FFB020]" />
                {new Date(ann.eventDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // 3. NOTICE CARD LAYOUT (Accent: Green)
  if (isNotice) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#121826] p-5 shadow-lg transition-all hover:border-[#16C784]/30 hover:shadow-2xl"
      >
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#16C784] uppercase tracking-widest">
              <FileText className="w-3.5 h-3.5" />
              Circular Notice
            </span>
            <span className="text-[9px] text-slate-400 font-semibold">
              {ann.createdAt ? formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true }) : 'Just now'}
            </span>
          </div>

          <div className="space-y-1">
            {ann.circularNumber && (
              <span className="text-[9px] text-[#16C784] font-extrabold uppercase tracking-wider block">Ref: {ann.circularNumber}</span>
            )}
            <h4 className="text-sm font-extrabold text-white leading-snug">{ann.title}</h4>
            <p className={`text-xs text-slate-300 leading-relaxed whitespace-pre-wrap ${showDetails ? '' : 'line-clamp-3'}`}>
              {ann.description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
            <span className="text-[10px] text-slate-400 font-medium">Issued by: {ann.issuedBy || 'Dean Office'}</span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-[10px] text-[#16C784] font-black hover:underline uppercase tracking-wider"
              >
                {showDetails ? 'Hide' : 'Read Notice'}
              </button>
              {ann.pdfAttachment && (
                <a
                  href={ann.pdfAttachment}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-[#16C784]/10 text-[#16C784] hover:bg-[#16C784]/20 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // 4. ANNOUNCEMENTS / EMERGENCIES (Accent: Blue)
  const isEmergency = ann.category === 'emergency';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative overflow-hidden rounded-3xl border p-5 shadow-lg transition-all ${
        isEmergency 
          ? 'border-[#F04438]/20 bg-gradient-to-r from-[#F04438]/5 to-[#121826]' 
          : 'border-white/[0.06] bg-[#121826] hover:border-blue-500/30 hover:shadow-2xl'
      }`}
    >
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${isEmergency ? 'text-[#F04438]' : 'text-blue-400'}`}>
            <Shield className="w-3.5 h-3.5" />
            {isEmergency ? 'Emergency Alert' : 'University Update'}
          </span>
          <span className="text-[9px] text-slate-400 font-semibold">
            {ann.createdAt ? formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true }) : 'Just now'}
          </span>
        </div>

        <div className="space-y-1">
          <h4 className="text-sm font-extrabold text-white leading-snug">{ann.title}</h4>
          <p className={`text-xs text-slate-300 leading-relaxed whitespace-pre-wrap ${showDetails ? '' : 'line-clamp-3'}`}>
            {ann.description}
          </p>
        </div>

        {ann.imageURL && (
          <div className="rounded-2xl overflow-hidden mt-2 border border-white/[0.05] max-h-64">
            <img src={ann.imageURL} alt="" className="w-full object-cover" loading="lazy" />
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
          <span className="text-[10px] text-slate-400 font-semibold">by Admin</span>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`text-[10px] font-black hover:underline uppercase tracking-wider ${isEmergency ? 'text-[#F04438]' : 'text-blue-400'}`}
          >
            {showDetails ? 'Collapse' : 'Expand Details'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
