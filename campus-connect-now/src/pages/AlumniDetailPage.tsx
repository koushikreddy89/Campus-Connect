import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Share2,
  MapPin,
  Briefcase,
  Calendar,
  Linkedin,
  Mail,
  UserCheck,
  UserPlus,
  Award,
  BookOpen,
  ArrowUpRight,
  Clock,
  CheckCircle,
  Link,
  MessageSquare,
  HelpCircle,
  FileText,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AlumniService from '@/services/alumniService';
import { AlumniProfile, AlumniPost } from '@/types/alumni';
import { formatAlumniDesignation } from '@/utils/alumniUtils';
import PremiumAvatar from '@/components/alumni/premium/PremiumAvatar';
import PremiumAlumniStoryCard from '@/components/alumni/premium/PremiumAlumniStoryCard';
import { BottomTabBar } from '@/components/BottomTabBar';
import { matchApi, chatApi } from '@/services/api';

export default function AlumniDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const college = useAuthStore((s) => s.college) || 'SR University';

  // Backend state
  const [profile, setProfile] = useState<AlumniProfile | null>(null);
  const [posts, setPosts] = useState<AlumniPost[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Connection states
  const [isConnected, setIsConnected] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Interactive modals states
  const [showMentorshipModal, setShowMentorshipModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [mentorshipDate, setMentorshipDate] = useState('');
  const [mentorshipTime, setMentorshipTime] = useState('');
  const [mentorshipNote, setMentorshipNote] = useState('');
  const [resumeName, setResumeName] = useState('');
  const [referralPitch, setReferralPitch] = useState('');

  // Active section tab
  const [activeProfileTab, setActiveProfileTab] = useState<'roadmap' | 'experience' | 'jobs' | 'activity' | 'mentorship'>('roadmap');

  useEffect(() => {
    if (id) {
      loadAlumniData();
    }
  }, [id, college]);

  const loadAlumniData = async () => {
    try {
      setLoading(true);
      if (!id) return;

      // 1. Fetch profile
      const data = await AlumniService.profiles.getProfileById(id, college);
      setProfile(data);

      // Check connections state
      const currentUserId = useAuthStore.getState().uid;
      if (currentUserId && data) {
        const matchesRes = await matchApi.getMatches();
        const requestsRes = await matchApi.getConnectionRequests();
        const matches = matchesRes.data || [];
        const requests = requestsRes.data || [];

        const hasMatch = matches.some((m: any) => m.userId === data.userId || m.user?.id === data.userId);
        const hasReq = requests.some((r: any) => r.fromUserId === data.userId || r.toUserId === data.userId);

        setIsRequested(hasReq && !hasMatch);
        setIsConnected(hasMatch);

        const following = localStorage.getItem(`follow_${data.userId}`) === 'true';
        setIsFollowing(following);
      }

      // 2. Fetch sub-resources in parallel
      try {
        const [postsData, referralsData, roadmapsData, resourcesData] = await Promise.all([
          AlumniService.profiles.getPostsByAlumniId(id, college),
          AlumniService.profiles.getReferralsByAlumniId(id),
          AlumniService.profiles.getRoadmapsByAlumniId(id),
          AlumniService.profiles.getResourcesByAlumniId(id)
        ]);

        setPosts(postsData.data || postsData || []);
        setReferrals(referralsData || []);
        setRoadmaps(roadmapsData || []);
        setResources(resourcesData || []);
      } catch (subErr) {
        console.error('Failed to load sub-resources:', subErr);
      }

    } catch (error) {
      console.error('Failed to load alumni data:', error);
      toast.error('Failed to load alumni profile details');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!profile) return;
    try {
      const result = await matchApi.sendConnectionRequest(profile.userId);
      if (result.success) {
        if (result.matched) {
          setIsConnected(true);
          setIsRequested(false);
          toast.success(`You are now connected with ${profile.name}!`);
        } else {
          setIsRequested(true);
          toast.success(`Connection request sent to ${profile.name}`);
        }
      } else {
        toast.error(result.error || 'Failed to send connection request');
      }
    } catch (e) {
      toast.error('Failed to send connection request');
    }
  };

  const handleFollowToggle = () => {
    if (!profile) return;
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    localStorage.setItem(`follow_${profile.userId}`, nextState ? 'true' : 'false');
    toast.success(nextState ? `You are now following ${profile.name}` : `Unfollowed ${profile.name}`);
  };

  const handleBookMentorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorshipDate || !mentorshipTime) {
      toast.error('Please pick date and time');
      return;
    }
    try {
      const currentUserId = useAuthStore.getState().uid;
      if (currentUserId && profile) {
        const matchesRes = await matchApi.getMatches();
        const matches = matchesRes.data || [];
        const match = matches.find((m: any) => m.userId === profile.userId);

        if (match) {
          await chatApi.sendMessage(match.id, `Hi ${profile.name}! I just booked a mentorship session for ${mentorshipDate} at ${mentorshipTime}. Notes: ${mentorshipNote || 'None'}`);
          toast.success('Mentorship session requested successfully!');
        } else {
          await matchApi.sendConnectionRequest(profile.userId);
          toast.success(`Connection request sent to ${profile.name}! Once accepted, you can coordinate the mentorship session.`);
          setIsRequested(true);
        }
      }

      setShowMentorshipModal(false);
      setMentorshipDate('');
      setMentorshipTime('');
      setMentorshipNote('');
    } catch (err) {
      toast.error('Booking failed');
    }
  };

  const handleReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeName) {
      toast.error('Please upload your resume');
      return;
    }
    try {
      const currentUserId = useAuthStore.getState().uid;
      if (currentUserId && profile) {
        const matchesRes = await matchApi.getMatches();
        const matches = matchesRes.data || [];
        const match = matches.find((m: any) => m.userId === profile.userId);

        if (match) {
          await chatApi.sendMessage(match.id, `Hi ${profile.name}, I would love a referral for openings at ${profile.company}. Resume uploaded: ${resumeName}. Pitch: ${referralPitch}`);
          toast.success('Referral request sent directly to alumni inbox!');
        } else {
          await matchApi.sendConnectionRequest(profile.userId);
          toast.success(`Connection request sent to ${profile.name}! Once accepted, you can coordinate the referral.`);
          setIsRequested(true);
        }
      }

      setShowReferralModal(false);
      setResumeName('');
      setReferralPitch('');
    } catch (err) {
      toast.error('Failed to submit referral');
    }
  };

  const experienceHistory = useMemo(() => {
    if (!profile) return [];
    if (profile.experience && profile.experience.length > 0) {
      return profile.experience;
    }
    // Fallback if no specific work history array exists
    if (profile.company || profile.designation || profile.role) {
      return [
        {
          company: profile.company || 'Company',
          role: profile.designation || (profile.role && profile.role.toLowerCase() !== 'alumni' ? profile.role : 'Campus Connect Alumni'),
          duration: 'Present',
          location: (profile as any).location || 'San Francisco, CA',
          responsibilities: ['Professional engineering contributions and industry execution.']
        }
      ];
    }
    return [];
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-foreground">
        <p className="text-sm font-semibold text-muted-foreground">Alumni profile not found</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="border-border hover:bg-secondary">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-28">
      {/* Navigation Headers */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-40">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-secondary/80 border border-border text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Profile link copied!');
          }}
          className="p-2 rounded-xl bg-secondary/80 border border-border text-muted-foreground"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Banner */}
      <div className="h-36 relative bg-gradient-to-r from-blue-600/40 via-purple-600/30 to-background border-b border-border">
        {profile.coverImageUrl && (
          <img
            src={profile.coverImageUrl}
            alt="Cover banner"
            className="w-full h-full object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Profile Info Card */}
      <div className="px-4 -mt-12 relative z-10 space-y-4">
        <div className="flex items-end justify-between">
          <PremiumAvatar
            src={profile.profileImageUrl}
            alt={profile.name}
            size="xl"
            className="ring-4 ring-background bg-card shadow-xl"
          />
          <div className="flex gap-2">
            <button
              onClick={handleFollowToggle}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                isFollowing 
                  ? 'bg-secondary border-border text-foreground' 
                  : 'bg-primary text-primary-foreground border-primary'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <button
              onClick={handleConnect}
              disabled={isRequested}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                isConnected
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : isRequested
                    ? 'bg-secondary border-border text-muted-foreground'
                    : 'bg-primary text-primary-foreground border-primary'
              }`}
            >
              {isConnected ? 'Connected' : isRequested ? 'Pending' : 'Connect'}
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold text-foreground">{profile.name}</h1>
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold">
              ✓ Verified Alumni
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
            {formatAlumniDesignation(profile)}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/85 mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span>{(profile as any).location || 'San Francisco, CA'}</span>
            <span>•</span>
            <span>Class of {profile.batch}</span>
          </div>
        </div>

        {/* Real Backend Statistics */}
        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-border/60 text-center">
          <div className="bg-secondary/40 rounded-xl p-2.5 border border-border/40">
            <p className="text-base font-extrabold text-foreground">{profile.viewCount || 0}</p>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Views</p>
          </div>
          <div className="bg-secondary/40 rounded-xl p-2.5 border border-border/40">
            <p className="text-base font-extrabold text-foreground">{profile.helpedCount || 0}</p>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Helped</p>
          </div>
          <div className="bg-secondary/40 rounded-xl p-2.5 border border-border/40">
            <p className="text-base font-extrabold text-foreground">{profile.followers?.length || 0}</p>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Followers</p>
          </div>
          <div className="bg-secondary/40 rounded-xl p-2.5 border border-border/40">
            <p className="text-base font-extrabold text-foreground">{profile.connections?.length || 0}</p>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Connected</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex gap-3 pt-3 border-t border-border/60">
          {profile.linkedinUrl && (
            <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary flex items-center gap-1">
              <Linkedin className="w-3.5 h-3.5" /> LinkedIn
            </a>
          )}
          {profile.email && (
            <a href={`mailto:${profile.email}`} className="text-[10px] font-bold text-primary flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> Contact
            </a>
          )}
          {profile.portfolioUrl && (
            <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary flex items-center gap-1">
              <Link className="w-3.5 h-3.5" /> Portfolio
            </a>
          )}
        </div>
      </div>

      {/* About Section */}
      <div className="px-4 mt-6">
        <Card className="p-4 border-border bg-card/60">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">About Journey</h2>
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">
            {profile.story || 'Professional engineering leader. Open to mentoring, resume guidance, and placement support.'}
          </p>
        </Card>
      </div>

      {/* Real Achievements Section */}
      {profile.achievements && profile.achievements.length > 0 && (
        <div className="px-4 mt-4">
          <Card className="p-4 border-border bg-card/60">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Award className="w-4.5 h-4.5 text-amber-500" /> Key Achievements
            </h2>
            <ul className="space-y-2">
              {profile.achievements.map((ach, i) => (
                <li key={i} className="text-xs text-foreground flex items-start gap-2 leading-relaxed">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{ach}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto scrollbar-none mt-6 px-4">
        {[
          { id: 'roadmap', label: `Roadmaps (${roadmaps.length})` },
          { id: 'experience', label: 'History' },
          { id: 'jobs', label: `Openings (${referrals.length})` },
          { id: 'mentorship', label: `Resources (${resources.length})` },
          { id: 'activity', label: `Posts (${posts.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveProfileTab(tab.id as any)}
            className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeProfileTab === tab.id
                ? 'border-primary text-primary font-extrabold'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="px-4 mt-6 min-h-[200px]">
        {activeProfileTab === 'roadmap' && (
          <div className="space-y-4">
            {roadmaps.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card/30">
                <BookOpen className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
                <h3 className="text-xs font-bold text-foreground mb-1">No Roadmaps Shared Yet</h3>
                <p className="text-[10px] text-muted-foreground">Detailed roadmaps shared by {profile.name} will render here.</p>
              </div>
            ) : (
              roadmaps.map((rdm) => (
                <Card key={rdm.id} className="p-4 border-border bg-card/30">
                  <h3 className="text-sm font-bold text-foreground mb-2">{rdm.title}</h3>
                  {rdm.description && <p className="text-xs text-muted-foreground mb-4">{rdm.description}</p>}
                  <div className="relative border-l border-border pl-4 ml-2 space-y-6 text-xs">
                    {rdm.steps?.map((step: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute left-[-22px] top-0 p-1 rounded-full bg-primary border-2 border-background">
                          <CheckCircle className="w-2.5 h-2.5 text-white" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-foreground">{step.title}</h4>
                          <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                          {step.resources && step.resources.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {step.resources.map((res: string, i: number) => (
                                <span key={i} className="text-[9px] bg-secondary px-2 py-0.5 rounded border border-border text-foreground">
                                  {res}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeProfileTab === 'experience' && (
          <div className="space-y-4">
            <Card className="p-4 border-border bg-card/30 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Work History</h3>
              {experienceHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground">No work history details added yet.</p>
              ) : (
                experienceHistory.map((exp, idx) => (
                  <div key={idx} className="flex gap-3 border-b border-border/40 pb-4 last:border-0 last:pb-0">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary h-8 w-8 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4.5 h-4.5" />
                    </div>
                    <div className="space-y-1.5 text-xs flex-1">
                      <div>
                        <h4 className="font-bold text-foreground">{exp.role}</h4>
                        <p className="text-[11px] text-primary font-semibold">{exp.company}</p>
                        <p className="text-[10px] text-muted-foreground">{exp.duration} • {exp.location || 'Remote'}</p>
                      </div>
                      {exp.responsibilities && exp.responsibilities.length > 0 && (
                        <ul className="list-disc list-inside text-[11px] text-muted-foreground pl-1.5 space-y-1">
                          {exp.responsibilities.map((r, i) => (
                            <li key={i} className="leading-relaxed">{r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))
              )}
            </Card>

            {profile.skills && profile.skills.length > 0 && (
              <Card className="p-4 border-border bg-card/30">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Skills Learned</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map(s => (
                    <span key={s} className="text-[10px] px-2.5 py-1 rounded-lg bg-secondary border border-border text-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeProfileTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opportunities</h3>
              {isConnected && (
                <button
                  onClick={() => setShowReferralModal(true)}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold"
                >
                  Ask Referral
                </button>
              )}
            </div>

            {!isConnected && (
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-[10px] text-primary leading-normal">
                ℹ️ Connect with {profile.name} to upload your resume and request a referral.
              </div>
            )}

            {referrals.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card/30">
                <Briefcase className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
                <h3 className="text-xs font-bold text-foreground mb-1">No Referrals Shared Yet</h3>
                <p className="text-[10px] text-muted-foreground">Referrals shared by {profile.name} will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((job, idx) => (
                  <div key={job.id || idx} className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between space-y-3 text-xs">
                    <div>
                      <div className="flex items-start justify-between">
                        <h4 className="font-bold text-foreground">{job.role}</h4>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{job.company} • {job.location || 'Remote'}</p>
                      {job.salary && <p className="text-[11px] text-green-500 font-bold mt-2">Salary: {job.salary}</p>}
                      {job.experience && <p className="text-[10px] text-muted-foreground mt-1">Experience: {job.experience}</p>}
                      {job.eligibility && <p className="text-[10px] text-muted-foreground mt-1">{job.eligibility}</p>}
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[10px]">
                      <span className="text-muted-foreground/60">{job.deadline ? `Apply by: ${job.deadline}` : 'Apply anytime'}</span>
                      <button
                        onClick={() => {
                          if (isConnected) {
                            setShowReferralModal(true);
                          } else {
                            handleConnect();
                          }
                        }}
                        className="text-primary font-bold flex items-center gap-0.5"
                      >
                        {isConnected ? 'Apply' : 'Connect to Apply'}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeProfileTab === 'mentorship' && (
          <div className="space-y-4">
            <Card className="p-4 border-border bg-card/30 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">1-on-1 Sessions</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Book a personalized slot to review your resume, practice coding rounds, or get job referrals.
              </p>
              <button
                onClick={() => setShowMentorshipModal(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold transition-all shadow-md"
              >
                Schedule Session
              </button>
            </Card>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resources & Guidance</h4>
              {resources.length === 0 ? (
                <div className="py-8 text-center rounded-2xl border border-dashed border-border bg-card/35 p-4">
                  <FileText className="w-6 h-6 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground">No resources shared yet by this alumni.</p>
                </div>
              ) : (
                resources.map((resrc, idx) => (
                  <div key={resrc.id || idx} className="p-4 rounded-xl border border-border bg-card/40 space-y-2 text-xs">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-2">
                        <FileText className="w-4.5 h-4.5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-foreground leading-snug">{resrc.title}</h4>
                          {resrc.description && <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{resrc.description}</p>}
                        </div>
                      </div>
                      {resrc.link && (
                        <a
                          href={resrc.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-[10px] font-bold flex items-center gap-0.5"
                        >
                          Open <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeProfileTab === 'activity' && (
          <div className="space-y-4 max-w-md mx-auto">
            {posts.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card/30">
                <MessageSquare className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
                <h3 className="text-xs font-bold text-foreground mb-1">No updates shared</h3>
                <p className="text-[10px] text-muted-foreground">Updates shared by {profile.name} will render here.</p>
              </div>
            ) : (
              posts.map((post) => (
                <PremiumAlumniStoryCard
                  key={post.id || post._id}
                  post={post}
                  onUpdate={() => loadAlumniData()}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* MODAL: MENTORSHIP SCHEDULER */}
      <AnimatePresence>
        {showMentorshipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMentorshipModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl z-10"
            >
              <button
                onClick={() => setShowMentorshipModal(false)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <h3 className="text-sm font-bold text-foreground mb-4">Request 1-on-1 Session</h3>
              <form onSubmit={handleBookMentorship} className="space-y-4">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold mb-1 block">Date</label>
                  <input
                    type="date"
                    required
                    value={mentorshipDate}
                    onChange={(e) => setMentorshipDate(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold mb-1 block">Time Slot</label>
                  <select
                    required
                    value={mentorshipTime}
                    onChange={(e) => setMentorshipTime(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                  >
                    <option value="">Choose a slot</option>
                    <option value="10:00 AM">10:00 AM - 10:30 AM</option>
                    <option value="02:00 PM">02:00 PM - 02:30 PM</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold mb-1 block">Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Describe your questions..."
                    value={mentorshipNote}
                    onChange={(e) => setMentorshipNote(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMentorshipModal(false)}
                    className="w-1/2 py-2 border border-border rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
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

      {/* MODAL: SUBMIT REFERRAL */}
      <AnimatePresence>
        {showReferralModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReferralModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl z-10"
            >
              <button
                onClick={() => setShowReferralModal(false)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <h3 className="text-sm font-bold text-foreground mb-4">Request Referral</h3>
              <form onSubmit={handleReferralSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold mb-1 block">Resume (PDF)</label>
                  {resumeName ? (
                    <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                      <span className="text-[11px] text-emerald-400 font-medium truncate">{resumeName}</span>
                      <button type="button" onClick={() => setResumeName('')} className="text-muted-foreground">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => setResumeName('Resume_Koushik_Reddy_SWE.pdf')}
                      className="p-6 border border-dashed border-border rounded-xl bg-secondary/35 text-center cursor-pointer hover:border-primary/40 transition-colors"
                    >
                      <span className="text-xs block text-muted-foreground">Upload PDF Resume</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold mb-1 block">Pitch Message</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Briefly state your achievements..."
                    value={referralPitch}
                    onChange={(e) => setReferralPitch(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReferralModal(false)}
                    className="w-1/2 py-2 border border-border rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!resumeName}
                    className="w-1/2 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomTabBar />
    </div>
  );
}
