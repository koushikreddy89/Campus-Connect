import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  ChevronRight,
  Briefcase,
  Users,
  Sparkles,
  Search,
  Filter,
  Calendar,
  X,
  Award,
  BookOpen,
  Plus,
  FileText,
  Map,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import AlumniService from '@/services/alumniService';
import alumniPostService from '@/services/alumniPostService';
import { AlumniProfile } from '@/types/alumni';
import PremiumAlumniStoryCard from '@/components/alumni/premium/PremiumAlumniStoryCard';
import PremiumAvatar from '@/components/alumni/premium/PremiumAvatar';
import AlumniLoadingSkeleton from '@/components/alumni/premium/AlumniLoadingSkeleton';

import { matchApi, chatApi } from '@/services/api';

const POSTS_PER_PAGE = 20;

export default function PremiumAlumniFeedPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Zustand State
  const college = useAuthStore(s => s.college) || 'SR University';
  const role = useAuthStore(s => s.role);

  // Six visual areas tab: feed, directory, referrals, roadmaps, resources, achievements
  const [activeTab, setActiveTab] = useState<string>('feed'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filter state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterBatch, setFilterBatch] = useState('');

  // Mentorship / Connection states
  const [selectedAlumniForMentorship, setSelectedAlumniForMentorship] = useState<AlumniProfile | null>(null);
  const [mentorshipDate, setMentorshipDate] = useState('');
  const [mentorshipTime, setMentorshipTime] = useState('');
  const [mentorshipNote, setMentorshipNote] = useState('');
  const [isSubmittingMentorship, setIsSubmittingMentorship] = useState(false);

  const [selectedAlumniForReferral, setSelectedAlumniForReferral] = useState<AlumniProfile | null>(null);
  const [referralResumeName, setReferralResumeName] = useState('');
  const [referralPitch, setReferralPitch] = useState('');
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);

  // Fetch feed content based on tab
  // If activeTab is 'feed', we fetch 'all' posts (which are alumni-created only).
  // Else if referrals, roadmaps, resources, achievements, we pass that type as filter.
  const feedType = useMemo(() => {
    if (activeTab === 'feed') return undefined;
    if (activeTab === 'referrals') return 'referral';
    if (activeTab === 'roadmaps') return 'roadmap';
    if (activeTab === 'resources') return 'resource';
    if (activeTab === 'achievements') return 'achievement';
    return undefined;
  }, [activeTab]);

  const {
    data: feedData,
    isLoading: feedLoading,
    refetch: refetchFeed,
  } = useQuery({
    queryKey: ['premium-alumni-feed', college, activeTab, searchQuery],
    queryFn: async () => {
      return alumniPostService.posts.getFeed({
        type: feedType as any,
        search: searchQuery || undefined,
        limit: POSTS_PER_PAGE,
        page: 1,
      });
    },
    staleTime: 5000, // keep stale time low for real-time MongoDB updates
  });

  // Fetch Alumni Profiles for Directory
  const {
    data: profilesData,
    isLoading: profilesLoading,
    refetch: refetchProfiles,
  } = useQuery({
    queryKey: ['premium-alumni-profiles', college],
    queryFn: async () => {
      if (!college) throw new Error('College required');
      return AlumniService.profiles.getAllProfiles(college, { limit: 100 });
    },
    staleTime: 5000,
  });

  const {
    data: matchesData,
    refetch: refetchMatches,
  } = useQuery({
    queryKey: ['my-matches'],
    queryFn: async () => {
      const res = await matchApi.getMatches();
      return res.data || [];
    },
    staleTime: 5000,
  });

  const {
    data: requestsData,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ['my-connection-requests'],
    queryFn: async () => {
      const res = await matchApi.getConnectionRequests();
      return res.data || [];
    },
    staleTime: 5000,
  });

  const posts = useMemo(() => feedData?.posts || [], [feedData]);
  const rawProfiles = useMemo(() => profilesData?.data || [], [profilesData]);

  // Apply search/filters on verified profiles (Directory)
  const filteredAlumni = useMemo(() => {
    return rawProfiles.filter(p => {
      if (p.approvalStatus !== 'approved') return false;

      const query = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(query) ||
        (p.company && p.company.toLowerCase().includes(query)) ||
        (p.role && p.role.toLowerCase().includes(query)) ||
        p.skills?.some(s => s.toLowerCase().includes(query));

      const matchesCompany = !filterCompany || p.company?.toLowerCase().includes(filterCompany.toLowerCase());
      const matchesRole = !filterRole || p.role?.toLowerCase().includes(filterRole.toLowerCase());
      const matchesDept = !filterDepartment || p.department?.toLowerCase() === filterDepartment.toLowerCase();
      const matchesBatch = !filterBatch || p.batch === filterBatch;

      return matchesSearch && matchesCompany && matchesRole && matchesDept && matchesBatch;
    });
  }, [rawProfiles, searchQuery, filterCompany, filterRole, filterDepartment, filterBatch]);

  // Connect using real API
  const handleConnect = useCallback(async (alumniId: string) => {
    try {
      const result = await matchApi.sendConnectionRequest(alumniId);
      if (result.success) {
        toast.success(result.matched ? 'You are now connected!' : 'Connection request sent!');
        refetchProfiles();
        refetchMatches();
        refetchRequests();
      } else {
        toast.error(result.error || 'Failed to send connection request');
      }
    } catch (e) {
      toast.error('Failed to send connection request');
    }
  }, [refetchProfiles, refetchMatches, refetchRequests]);

  const handleBookMentorshipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorshipDate || !mentorshipTime) {
      toast.error('Please pick a date and time');
      return;
    }

    try {
      setIsSubmittingMentorship(true);
      const userUid = useAuthStore.getState().uid;
      if (!userUid || !selectedAlumniForMentorship) return;

      const matches = matchesData || [];
      const match = matches.find((m: any) => m.userId === selectedAlumniForMentorship.userId);

      if (match) {
        await chatApi.sendMessage(match.id, `Hello! I would love to connect for a mentorship session on ${mentorshipDate} at ${mentorshipTime}. Notes: ${mentorshipNote || 'Looking for career advice.'}`);
        toast.success(`Session scheduled successfully with ${selectedAlumniForMentorship.name}!`);
      } else {
        await matchApi.sendConnectionRequest(selectedAlumniForMentorship.userId);
        toast.success(`Connection request sent to ${selectedAlumniForMentorship.name}! Once accepted, you can coordinate the mentorship session.`);
        refetchRequests();
      }

      setSelectedAlumniForMentorship(null);
      setMentorshipDate('');
      setMentorshipTime('');
      setMentorshipNote('');
    } catch (err) {
      toast.error('Failed to book mentorship');
    } finally {
      setIsSubmittingMentorship(false);
    }
  };

  const handleResumeUploadSimulate = () => {
    setIsUploadingResume(true);
    setTimeout(() => {
      setReferralResumeName('Resume_SWE_Student.pdf');
      setIsUploadingResume(false);
      toast.success('Resume uploaded successfully!');
    }, 1000);
  };

  const handleRequestReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralResumeName) {
      toast.error('Please upload your resume');
      return;
    }

    try {
      setIsSubmittingReferral(true);
      const userUid = useAuthStore.getState().uid;
      if (!userUid || !selectedAlumniForReferral) return;

      const matches = matchesData || [];
      const match = matches.find((m: any) => m.userId === selectedAlumniForReferral.userId);

      if (match) {
        await chatApi.sendMessage(match.id, `Hello ${selectedAlumniForReferral.name}, I uploaded my resume (${referralResumeName}) and would be extremely grateful for a referral. Pitch: ${referralPitch || 'I meet all core requirements.'}`);
        toast.success(`Referral request sent to ${selectedAlumniForReferral.name}!`);
      } else {
        await matchApi.sendConnectionRequest(selectedAlumniForReferral.userId);
        toast.success(`Connection request sent to ${selectedAlumniForReferral.name}! Once accepted, you can coordinate the referral.`);
        refetchRequests();
      }

      setSelectedAlumniForReferral(null);
      setReferralResumeName('');
      setReferralPitch('');
    } catch (err) {
      toast.error('Failed to submit referral request');
    } finally {
      setIsSubmittingReferral(false);
    }
  };



  return (
    <div className={embedded ? "w-full text-foreground font-sans relative" : "min-h-screen bg-background pb-28 text-foreground font-sans relative"}>
      {/* Header */}
      <div className={embedded ? "sticky top-0 z-40 bg-zinc-950/20 backdrop-blur-lg border-b border-border/20 px-4 py-2" : "sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4"}>
        {!embedded && (
          <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Alumni Network
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified Professional Alumni Space
            </p>
          </div>
          {role === 'alumni' && (
            <button
              onClick={() => navigate('/alumni/post/create')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md"
            >
              <Plus className="w-4 h-4" />
              Share Post
            </button>
          )}
        </div>
        )}

        {/* Search & Filter Trigger */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={activeTab === 'directory' ? "Search alumni profiles..." : "Search career updates, referrals..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/60 border border-border rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
              showAdvancedFilters 
                ? 'bg-primary border-primary text-primary-foreground' 
                : 'bg-secondary/60 border-border text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Drawer */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border overflow-hidden"
            >
              <div>
                <input
                  type="text"
                  placeholder="Company"
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Designation"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Graduation Year"
                  value={filterBatch}
                  onChange={(e) => setFilterBatch(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Department"
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 6 Visual Areas Navigation Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none py-2 border-t border-border/40 mt-2">
          {[
            { id: 'feed', label: 'Feed', icon: MessageSquare },
            { id: 'directory', label: 'Directory', icon: Users },
            { id: 'referrals', label: 'Referrals', icon: Briefcase },
            { id: 'roadmaps', label: 'Roadmaps', icon: Map },
            { id: 'resources', label: 'Resources', icon: FileText },
            { id: 'achievements', label: 'Achievements', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 flex-shrink-0 transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary border-primary text-primary-foreground shadow-md'
                    : 'bg-secondary/40 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Tab 1: Directory */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />
              Verified Alumni Directory
            </h2>

            {profilesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <AlumniLoadingSkeleton key={i} />)}
              </div>
            ) : filteredAlumni.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card/45 p-6">
                <Users className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                <h3 className="text-xs font-bold text-foreground mb-1">No Alumni Profiles Found</h3>
                <p className="text-[10px] text-muted-foreground max-w-[220px] mx-auto">
                  Try adjusting filters or search query to find verified profiles.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAlumni.map((alum) => {
                  const matches = matchesData || [];
                  const requests = requestsData || [];
                  const isConnected = matches.some((m: any) => m.userId === alum.userId || m.user?.id === alum.userId);
                  const isRequested = requests.some((r: any) => r.fromUserId === alum.userId || r.toUserId === alum.userId);

                  return (
                    <motion.div
                      key={alum.id}
                      onClick={() => navigate(`/alumni/${alum.id}`)}
                      className="rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <PremiumAvatar src={alum.profileImageUrl} alt={alum.name} size="sm" />
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white flex items-center gap-1">
                              {alum.name}
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Verified
                              </span>
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium truncate">{alum.role || 'Alumni Member'}</p>
                            <p className="text-[11px] text-primary font-semibold truncate">{alum.company}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500">Class of {alum.batch}</span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-3 italic line-clamp-2">
                        "{alum.story || 'Passionate about helping junior students with career guidance and networking.'}"
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            if (isConnected) {
                              setSelectedAlumniForReferral(alum);
                            } else if (isRequested) {
                              toast.info("Pending connection approval.");
                            } else {
                              handleConnect(alum.userId);
                            }
                          }}
                          className={`py-1.5 rounded-xl text-[10px] font-bold border ${
                            isConnected 
                              ? 'bg-emerald-600 border-emerald-500 text-white' 
                              : isRequested
                                ? 'bg-secondary border-border text-slate-400 cursor-not-allowed'
                                : 'bg-secondary hover:bg-secondary/80 text-foreground border-border'
                          }`}
                        >
                          {isConnected ? 'Request Referral' : isRequested ? 'Request Pending' : 'Connect'}
                        </button>

                        <button
                          onClick={() => setSelectedAlumniForMentorship(alum)}
                          className="py-1.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-95"
                        >
                          Book Mentorship
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2-6: Contributions Feeds (Feed, Referrals, Roadmaps, Resources, Achievements) */}
        {activeTab !== 'directory' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              {activeTab === 'feed' && <MessageSquare className="w-4 h-4 text-primary" />}
              {activeTab === 'referrals' && <Briefcase className="w-4 h-4 text-primary" />}
              {activeTab === 'roadmaps' && <Map className="w-4 h-4 text-primary" />}
              {activeTab === 'resources' && <FileText className="w-4 h-4 text-primary" />}
              {activeTab === 'achievements' && <Award className="w-4 h-4 text-primary" />}
              Alumni {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>

            {feedLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <AlumniLoadingSkeleton key={i} />)}
              </div>
            ) : posts.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card/40">
                <BookOpen className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-foreground mb-1">No updates here yet</h3>
                <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                  No verified alumni posts are currently active in this category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0">
                <AnimatePresence mode="popLayout">
                  {posts.map((post) => (
                    <PremiumAlumniStoryCard
                      key={post.id}
                      post={post}
                      onUpdate={() => refetchFeed()}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: BOOK MENTORSHIP */}
      <AnimatePresence>
        {selectedAlumniForMentorship && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAlumniForMentorship(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl z-10"
            >
              <button
                onClick={() => setSelectedAlumniForMentorship(null)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <PremiumAvatar src={selectedAlumniForMentorship.profileImageUrl} alt={selectedAlumniForMentorship.name} size="sm" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Book Mentorship</h3>
                  <p className="text-[11px] text-muted-foreground">{selectedAlumniForMentorship.name}</p>
                </div>
              </div>

              <form onSubmit={handleBookMentorshipSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold mb-1.5 block">Date</label>
                  <input
                    type="date"
                    required
                    value={mentorshipDate}
                    onChange={(e) => setMentorshipDate(e.target.value)}
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold mb-1.5 block">Time Slot</label>
                  <select
                    required
                    value={mentorshipTime}
                    onChange={(e) => setMentorshipTime(e.target.value)}
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none"
                  >
                    <option value="">Choose a slot</option>
                    <option value="10:00 AM">10:00 AM - 10:30 AM</option>
                    <option value="02:00 PM">02:00 PM - 02:30 PM</option>
                    <option value="05:30 PM">05:30 PM - 06:00 PM</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold mb-1.5 block">Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Topic description..."
                    value={mentorshipNote}
                    onChange={(e) => setMentorshipNote(e.target.value)}
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedAlumniForMentorship(null)}
                    className="w-1/2 py-2 border border-border text-foreground rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingMentorship}
                    className="w-1/2 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold"
                  >
                    Book
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REQUEST REFERRAL */}
      <AnimatePresence>
        {selectedAlumniForReferral && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAlumniForReferral(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl z-10"
            >
              <button
                onClick={() => setSelectedAlumniForReferral(null)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <PremiumAvatar src={selectedAlumniForReferral.profileImageUrl} alt={selectedAlumniForReferral.name} size="sm" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Request Referral</h3>
                  <p className="text-[11px] text-muted-foreground">{selectedAlumniForReferral.name}</p>
                </div>
              </div>

              <form onSubmit={handleRequestReferralSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold mb-1.5 block">Resume (PDF)</label>
                  {referralResumeName ? (
                    <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                      <span className="text-[11px] text-emerald-400 font-medium truncate">{referralResumeName}</span>
                      <button type="button" onClick={() => setReferralResumeName('')} className="text-muted-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={handleResumeUploadSimulate}
                      className="p-6 rounded-xl border border-dashed border-border bg-secondary/35 text-center cursor-pointer hover:border-primary/45 transition-colors"
                    >
                      {isUploadingResume ? (
                        <span className="text-[11px] text-muted-foreground">Uploading...</span>
                      ) : (
                        <div className="text-muted-foreground">
                          <span className="text-xs font-bold block">Upload PDF Resume</span>
                          <span className="text-[9px] text-muted-foreground/60 block mt-0.5">Click to simulate</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground font-bold mb-1.5 block">Pitch Message</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Why are you a good fit?"
                    value={referralPitch}
                    onChange={(e) => setReferralPitch(e.target.value)}
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedAlumniForReferral(null)}
                    className="w-1/2 py-2 border border-border text-foreground rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReferral || !referralResumeName}
                    className="w-1/2 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold"
                  >
                    Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
