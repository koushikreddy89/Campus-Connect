import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  Briefcase,
  Award,
  FileText,
  Settings,
  TrendingUp,
  BarChart2,
  BookOpen,
  Eye,
  Users,
  ChevronRight,
  Bookmark,
  Sparkles,
  Link as LinkIcon,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Camera,
  Linkedin,
  Github,
  Mail,
  UserCheck,
  Check,
  Zap,
  MapPin
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/authStore';
import { useAlumniStore } from '@/store/alumniStore';
import { useProfileStore } from '@/store/profileStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { alumniProfileService, alumniPostsService } from '@/services/alumniService';
import {
  AlumniPost,
  AlumniReferral,
  AlumniRoadmap,
  AlumniResource,
  AlumniAchievement,
  BatchOptions,
  PlacementTypeOptions,
  SalaryRangeOptions
} from '@/types/alumni';
import { toast } from 'sonner';

// Counting animations for stats
function Counter({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setCount(0);
      return;
    }
    
    const duration = 1.0; // seconds
    const totalFrames = Math.round(duration * 60);
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
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

export const MyAlumniProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const hasLoadedRef = useRef(false);
  const authCollege = useAuthStore((state) => state.college);
  const college = authCollege || 'SR University';
  const userId = useAuthStore((state) => state.uid);
  const email = useAuthStore((state) => state.email);

  // Core Page State
  const [isChecking, setIsChecking] = useState(true);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Sub-resource lists
  const [posts, setPosts] = useState<AlumniPost[]>([]);
  const [referrals, setReferrals] = useState<AlumniReferral[]>([]);
  const [roadmaps, setRoadmaps] = useState<AlumniRoadmap[]>([]);
  const [resources, setResources] = useState<AlumniResource[]>([]);
  const [achievements, setAchievements] = useState<AlumniAchievement[]>([]);

  // Modal / Form Management
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Roadmap Step Form State
  const [roadmapSteps, setRoadmapSteps] = useState<Array<{ title: string; description: string }>>([
    { title: '', description: '' }
  ]);

  // Global Alumni Zustand Store
  const currentAlumniProfile = useAlumniStore((state) => state.currentAlumniProfile);
  const profilesLoading = useAlumniStore((state) => state.profilesLoading);
  const fetchAlumniById = useAlumniStore((state) => state.fetchAlumniById);
  const createAlumniProfile = useAlumniStore((state) => state.createAlumniProfile);
  const updateAlumniProfile = useAlumniStore((state) => state.updateAlumniProfile);

  // Forms
  const profileForm = useForm<any>();
  const postForm = useForm<any>();
  const referralForm = useForm<any>();
  const roadmapForm = useForm<any>();
  const resourceForm = useForm<any>();
  const achievementForm = useForm<any>();

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file is too large (max 5MB)");
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      profileForm.setValue('profileImageUrl', base64String);
      setUploadingImage(false);
      toast.success("Profile image loaded!");
    };
    reader.onerror = () => {
      setUploadingImage(false);
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  // Effects
  useEffect(() => {
    const activeUserId = userId || localStorage.getItem('user_id') || '';
    if (activeUserId) {
      loadAllData(activeUserId);
    }

    if (college) {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        loadProfile();
      }
    } else {
      setIsChecking(false);
      setIsCreatingProfile(true);
    }
  }, [college, userId]);

  useEffect(() => {
    if (currentAlumniProfile) {
      loadAllData(currentAlumniProfile.id || userId);
      profileForm.reset({
        name: currentAlumniProfile.name || currentAlumniProfile.fullName,
        batch: currentAlumniProfile.batch || currentAlumniProfile.batchYear,
        department: currentAlumniProfile.department,
        company: currentAlumniProfile.company,
        role: currentAlumniProfile.role || currentAlumniProfile.designation,
        story: currentAlumniProfile.story || currentAlumniProfile.careerJourney,
        profileImageUrl: currentAlumniProfile.profileImageUrl || currentAlumniProfile.profileImage,
        skills: currentAlumniProfile.skills ? currentAlumniProfile.skills.join(', ') : '',
        linkedinUrl: currentAlumniProfile.linkedinUrl || '',
        portfolioUrl: currentAlumniProfile.portfolioUrl || '',
        githubUrl: currentAlumniProfile.githubUrl || '',
        resumeUrl: currentAlumniProfile.resumeUrl || '',
        isAvailableForMentorship: currentAlumniProfile.isAvailableForMentorship ?? true,
        isAvailableForReferrals: currentAlumniProfile.isAvailableForReferrals ?? true,
        hiringStatus: currentAlumniProfile.hiringStatus || 'not_hiring'
      });
    }
  }, [currentAlumniProfile]);

  const loadProfile = async () => {
    try {
      setIsChecking(true);
      const profile = await alumniProfileService.getMyProfile(college);
      if (profile) {
        if (profile.id) {
          await fetchAlumniById(profile.id, college);
          await loadAllData(profile.id);
        }
        setIsChecking(false);
      } else {
        if (userId) {
          await loadAllData(userId);
        }
        setIsChecking(false);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      if (userId) {
        await loadAllData(userId);
      }
      setIsChecking(false);
    }
  };

  const loadAllData = async (profileId: string) => {
    try {
      setLoadingData(true);
      
      let postsResult: any = { data: [] };
      try {
        postsResult = await alumniPostsService.getMyPosts();
      } catch (myPostsErr) {
        postsResult = await alumniPostsService.getPostsByAlumniId(profileId, college);
      }

      const results = await Promise.allSettled([
        alumniProfileService.getReferralsByAlumniId(profileId),
        alumniProfileService.getRoadmapsByAlumniId(profileId),
        alumniProfileService.getResourcesByAlumniId(profileId),
        alumniProfileService.getAchievementsByAlumniId(profileId)
      ]);

      const fetchedReferrals = results[0].status === 'fulfilled' ? (results[0] as any).value : [];
      const fetchedRoadmaps = results[1].status === 'fulfilled' ? (results[1] as any).value : [];
      const fetchedResources = results[2].status === 'fulfilled' ? (results[2] as any).value : [];
      const fetchedAchievements = results[3].status === 'fulfilled' ? (results[3] as any).value : [];

      setPosts(postsResult.data || []);
      setReferrals(fetchedReferrals || []);
      setRoadmaps(fetchedRoadmaps || []);
      setResources(fetchedResources || []);
      setAchievements(fetchedAchievements || []);
    } catch (err) {
      console.error("Failed to load dashboard content:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmitProfile = async (data: any) => {
    try {
      if (!college) return;
      
      const skillsArray = data.skills ? data.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      const payload = {
        ...data,
        skills: skillsArray,
      };

      if (currentAlumniProfile) {
        await updateAlumniProfile(currentAlumniProfile.id, payload, college);
        toast.success('Profile updated successfully!');
      } else {
        const profile = await createAlumniProfile(payload, college);
        setIsCreatingProfile(false);
        await fetchAlumniById(profile.id, college);
        toast.success('Creator Profile Setup Complete!');
      }
      setIsEditingInfo(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile details');
    }
  };

  // CRUD actions for post, referrals, roadmaps, resources
  const handleSavePost = async (data: any) => {
    if (!data.content || !data.content.trim()) {
      toast.error('Post content cannot be empty.');
      return;
    }
    try {
      const targetAlumniId = currentAlumniProfile?.id || userId || '';
      const payload = {
        content: data.content.trim(),
        type: data.type || 'general',
        alumniId: targetAlumniId,
        collegeId: college,
        tags: [data.type || 'general']
      };

      if (editingItem) {
        const updated = await alumniPostsService.updatePost(editingItem.id, payload, college);
        toast.success('Post updated successfully!');
        if (updated) {
          setPosts(prev => prev.map(p => (p.id === updated.id || p._id === updated._id) ? { ...p, ...updated } : p));
        }
      } else {
        const newCreatedPost = await alumniPostsService.createPost(payload, college);
        toast.success('Post published successfully.');
        if (newCreatedPost) {
          setPosts(prev => [newCreatedPost, ...prev]);
        }
      }
      setActiveModal(null);
      setEditingItem(null);
      postForm.reset();
    } catch (err) {
      toast.error('Failed to publish post');
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await alumniPostsService.deletePost(id, college);
      toast.success('Post deleted successfully');
      setPosts(prev => prev.filter(p => p.id !== id && (p as any)._id !== id));
    } catch (err) {
      toast.error('Failed to delete post');
    }
  };

  const handleSaveReferral = async (data: any) => {
    try {
      if (!currentAlumniProfile) return;
      const payload = {
        alumniId: currentAlumniProfile.id,
        company: data.companyName,
        companyName: data.companyName,
        role: data.jobTitle,
        jobTitle: data.jobTitle,
        eligibility: data.eligibility,
        deadline: data.deadline,
        applicationUrl: data.applicationUrl.trim(),
        description: data.description || '',
        salary: data.salary || '',
        location: data.location || 'Remote'
      };

      if (editingItem) {
        await alumniProfileService.updateReferral(editingItem.id, payload);
        toast.success('Referral updated successfully!');
      } else {
        await alumniProfileService.createReferral(payload);
        toast.success('Referral shared with students!');
      }
      setActiveModal(null);
      setEditingItem(null);
      referralForm.reset();
      loadAllData(currentAlumniProfile.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save referral');
    }
  };

  const handleDeleteReferral = async (id: string) => {
    if (!confirm('Close/Delete this referral listing?')) return;
    try {
      await alumniProfileService.deleteReferral(id);
      toast.success('Referral listing closed');
      if (currentAlumniProfile) loadAllData(currentAlumniProfile.id);
    } catch (err) {
      toast.error('Failed to delete referral');
    }
  };

  const handleAddRoadmapStep = () => {
    setRoadmapSteps([...roadmapSteps, { title: '', description: '' }]);
  };

  const handleRemoveRoadmapStep = (index: number) => {
    setRoadmapSteps(roadmapSteps.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: 'title' | 'description', value: string) => {
    const updated = [...roadmapSteps];
    updated[index][field] = value;
    setRoadmapSteps(updated);
  };

  const handleSaveRoadmap = async (data: any) => {
    try {
      if (!currentAlumniProfile) return;
      const payload = {
        title: data.title,
        description: data.description,
        steps: roadmapSteps.filter(s => s.title.trim()),
        alumniId: currentAlumniProfile.id,
      };

      if (editingItem) {
        await alumniProfileService.updateRoadmap(editingItem.id, payload);
        toast.success('Roadmap updated!');
      } else {
        await alumniProfileService.createRoadmap(payload);
        toast.success('Roadmap published for students!');
      }
      setActiveModal(null);
      setEditingItem(null);
      roadmapForm.reset();
      setRoadmapSteps([{ title: '', description: '' }]);
      loadAllData(currentAlumniProfile.id);
    } catch (err) {
      toast.error('Failed to save roadmap');
    }
  };

  const handleDeleteRoadmap = async (id: string) => {
    if (!confirm('Are you sure you want to delete this roadmap?')) return;
    try {
      await alumniProfileService.deleteRoadmap(id);
      toast.success('Roadmap deleted');
      if (currentAlumniProfile) loadAllData(currentAlumniProfile.id);
    } catch (err) {
      toast.error('Failed to delete roadmap');
    }
  };

  const handleSaveResource = async (data: any) => {
    try {
      if (!currentAlumniProfile) return;
      const payload = {
        ...data,
        alumniId: currentAlumniProfile.id,
      };

      if (editingItem) {
        await alumniProfileService.updateResource(editingItem.id, payload);
        toast.success('Resource updated!');
      } else {
        await alumniProfileService.createResource(payload);
        toast.success('Resource uploaded successfully!');
      }
      setActiveModal(null);
      setEditingItem(null);
      resourceForm.reset();
      loadAllData(currentAlumniProfile.id);
    } catch (err) {
      toast.error('Failed to save resource');
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await alumniProfileService.deleteResource(id);
      toast.success('Resource removed');
      if (currentAlumniProfile) loadAllData(currentAlumniProfile.id);
    } catch (err) {
      toast.error('Failed to delete resource');
    }
  };

  const handleSaveAchievement = async (data: any) => {
    try {
      if (!currentAlumniProfile) return;
      const payload = {
        ...data,
        alumniId: currentAlumniProfile.id,
      };

      if (editingItem) {
        await alumniProfileService.updateAchievement(editingItem.id, payload);
        toast.success('Achievement updated!');
      } else {
        await alumniProfileService.createAchievement(payload);
        toast.success('Achievement shared with network!');
      }
      setActiveModal(null);
      setEditingItem(null);
      achievementForm.reset();
      loadAllData(currentAlumniProfile.id);
    } catch (err) {
      toast.error('Failed to save achievement');
    }
  };

  const handleDeleteAchievement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this achievement?')) return;
    try {
      await alumniProfileService.deleteAchievement(id);
      toast.success('Achievement removed');
      if (currentAlumniProfile) loadAllData(currentAlumniProfile.id);
    } catch (err) {
      toast.error('Failed to delete achievement');
    }
  };

  // Helper stats computation
  const stats = {
    totalPosts: posts.length,
    totalReferrals: referrals.length,
    totalRoadmaps: roadmaps.length,
    totalResources: resources.length,
    studentsHelped: currentAlumniProfile?.connections?.length || currentAlumniProfile?.helpedCount || 0
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground text-sm font-medium">Loading Alumni Dashboard...</p>
        </div>
      </div>
    );
  }

  // Profile setup flow
  if (isCreatingProfile && !currentAlumniProfile) {
    return (
      <div className="min-h-screen bg-[#09090B] py-12 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2">
                <Sparkles size={32} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Alumni Creator Setup</h1>
              <p className="text-muted-foreground text-sm">
                Join our elite alumni team and help students unlock their potential.
              </p>
            </div>

            <Card className="border border-border/40 backdrop-blur-md bg-card/60 p-6 shadow-xl">
              <form 
                onSubmit={profileForm.handleSubmit(onSubmitProfile)} 
                className="space-y-5"
              >
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name *</label>
                  <Input
                    {...profileForm.register('name', { required: 'Full Name is required' })}
                    placeholder="Enter your name"
                    className="mt-1 bg-background/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Batch Year *</label>
                    <select
                      {...profileForm.register('batch', { required: 'Batch is required' })}
                      className="mt-1 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Year</option>
                      {BatchOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department *</label>
                    <Input
                      {...profileForm.register('department', { required: 'Department is required' })}
                      placeholder="CSE, ECE, etc."
                      className="mt-1 bg-background/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</label>
                    <Input
                      {...profileForm.register('company')}
                      placeholder="e.g. Google"
                      className="mt-1 bg-background/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role / Designation</label>
                    <Input
                      {...profileForm.register('role')}
                      placeholder="e.g. Software Engineer"
                      className="mt-1 bg-background/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Story / Career Journey</label>
                  <Textarea
                    {...profileForm.register('story')}
                    placeholder="Briefly describe your career path..."
                    className="mt-1 h-24 bg-background/50"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-border/40">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="w-1/3"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={profilesLoading}
                    className="flex-1"
                  >
                    {profilesLoading ? 'Setting up...' : 'Create Creator Profile'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] pb-28 text-white font-sans overflow-x-hidden relative">
      
      {/* 1. Header banner layout */}
      <div className="relative h-48 bg-gradient-to-r from-purple-900/40 via-primary/30 to-accent/20 border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.15)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] to-transparent" />
      </div>

      {/* 2. Main Profile Content Container */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 -mt-20 relative z-10 space-y-6">
        
        {/* Profile Card Header */}
        <Card className="bg-[#141824]/40 border border-white/[0.08] backdrop-blur-xl rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            
            {/* Avatar & online status */}
            <div className="relative self-center md:self-start">
              <div className="h-28 w-28 rounded-full border-4 border-[#09090B] overflow-hidden bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center">
                {currentAlumniProfile?.profileImageUrl ? (
                  <img src={currentAlumniProfile.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-white font-mono">
                    {(currentAlumniProfile?.name || email || 'A')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-green-500 border-4 border-[#141824] animate-pulse" />
            </div>

            {/* User Metadata */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 justify-center md:justify-start">
                  {currentAlumniProfile?.name || email}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                    Verified Alumni
                  </span>
                </h1>
              </div>

              <p className="text-sm font-semibold text-zinc-300">
                {currentAlumniProfile?.role || 'Senior Software Engineer'} at <span className="text-violet-400">{currentAlumniProfile?.company || 'Technology Company'}</span>
              </p>
              
              <div className="flex items-center justify-center md:justify-start gap-3 text-xs text-zinc-400 font-medium">
                <span className="flex items-center gap-1"><MapPin size={13} /> Remote / USA</span>
                <span>•</span>
                <span>Batch {currentAlumniProfile?.batch || '2022'}</span>
                <span>•</span>
                <span>{currentAlumniProfile?.department || 'CSE'}</span>
              </div>

              <p className="text-xs text-zinc-400 max-w-xl leading-relaxed mt-2">
                {currentAlumniProfile?.story || 'Passionate about engineering clean architectures, mentorship, and building sustainable tech products.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2.5 pt-4 justify-center md:justify-start">
                <Button 
                  onClick={() => setIsEditingInfo(true)}
                  className="rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold gap-1.5 h-9"
                >
                  <Edit2 size={13} /> Edit Profile
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/settings')}
                  className="rounded-xl border-white/10 hover:bg-white/5 text-xs font-bold gap-1.5 h-9 text-zinc-300"
                >
                  <Settings size={13} /> Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Social Links Panel */}
          <div className="flex justify-center md:justify-start gap-4 border-t border-white/[0.06] mt-6 pt-4 text-zinc-400">
            {currentAlumniProfile?.linkedinUrl && (
              <a href={currentAlumniProfile.linkedinUrl} target="_blank" className="hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold">
                <Linkedin size={14} className="text-[#0A66C2]" /> LinkedIn
              </a>
            )}
            {currentAlumniProfile?.portfolioUrl && (
              <a href={currentAlumniProfile.portfolioUrl} target="_blank" className="hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold">
                <LinkIcon size={14} className="text-violet-400" /> Portfolio
              </a>
            )}
            <span className="text-white/10">|</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Contact: {email}</span>
          </div>
        </Card>

        {/* 3. Statistics Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Network Reach', value: 1420, color: 'text-violet-400' },
            { label: 'Students Mentored', value: stats.studentsHelped, color: 'text-emerald-400' },
            { label: 'Referrals Listed', value: stats.totalReferrals, color: 'text-amber-400' },
            { label: 'Resources Shared', value: stats.totalResources, color: 'text-sky-400' }
          ].map((stat, idx) => (
            <Card key={idx} className="bg-[#141824]/40 border border-white/[0.06] p-4 text-center">
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">{stat.label}</div>
              <div className={`text-2xl font-black ${stat.color}`}>
                <Counter value={stat.value} />
              </div>
            </Card>
          ))}
        </div>

        {/* 4. Collapsible Dashboard Section */}
        <Card className="bg-[#141824]/40 border border-white/[0.08] rounded-[24px] overflow-hidden">
          <button 
            onClick={() => setIsDashboardExpanded(!isDashboardExpanded)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.01] transition-colors"
          >
            <div className="flex items-center gap-3">
              <BarChart2 className="text-violet-400 w-5 h-5" />
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Analytics Performance Dashboard</h2>
                <p className="text-[11px] text-zinc-500">Weekly reach, student connection requests, and download insights</p>
              </div>
            </div>
            {isDashboardExpanded ? <ChevronUp size={18} className="text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
          </button>

          <AnimatePresence>
            {isDashboardExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-white/[0.06]"
              >
                <div className="p-6 space-y-6">
                  {/* Performance stats metrics grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Profile Views', val: '240', rate: '▲ 8.2%' },
                      { label: 'Resource DLs', val: stats.totalResources, rate: '▲ 14.5%' },
                      { label: 'Weekly Reach', val: '6,450', rate: '▲ 22.1%' },
                      { label: 'Acceptance Rate', val: '94%', rate: 'Stable' }
                    ].map((metric, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{metric.label}</span>
                        <div className="flex justify-between items-end">
                          <span className="text-lg font-black text-white">{metric.val}</span>
                          <span className="text-[9px] font-bold text-emerald-400">{metric.rate}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* SVG Bar Chart for reach */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Weekly Reach Activity</span>
                    <div className="h-28 flex items-end gap-2.5 pt-4 px-2 border-b border-white/10">
                      {[30, 45, 35, 60, 80, 55, 90].map((h, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                          <div 
                            className="w-full bg-gradient-to-t from-violet-600 to-indigo-500 rounded-t-sm transition-all duration-500" 
                            style={{ height: `${h}%` }} 
                          />
                          <span className="text-[9px] text-zinc-500 font-bold uppercase">{"MTWTFSS"[idx]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent activities logged */}
                  <div className="space-y-3 pt-4">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Recent Activity Log</span>
                    <div className="space-y-3">
                      {[
                        { title: 'Posted Job Referral at Google', time: 'Today' },
                        { title: 'Approved 3 Student Connection Requests', time: 'Yesterday' },
                        { title: 'Shared roadmap on Frontend Engineering Track', time: '4 days ago' }
                      ].map((act, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-3 bg-white/[0.01] rounded-xl border border-white/5">
                          <span className="text-zinc-300 font-medium">{act.title}</span>
                          <span className="text-[10px] text-zinc-500 font-bold">{act.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* 5. Creator Center (Premium Action Cards) */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Creator Center Hub</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Share Opportunity', sub: 'Post job referalls & hiring drives', count: stats.totalReferrals, key: 'referral', color: 'border-violet-500/20' },
              { title: 'Publish Roadmap', sub: 'Create linear learning paths', count: stats.totalRoadmaps, key: 'roadmap', color: 'border-amber-500/20' },
              { title: 'Upload Resource', sub: 'Share documents, PDFs, study prep', count: stats.totalResources, key: 'resource', color: 'border-sky-500/20' }
            ].map((card, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setEditingItem(null);
                  setActiveModal(card.key);
                }}
                className={`p-5 rounded-2xl border ${card.color} bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer flex flex-col justify-between h-36 transition-all`}
              >
                <div>
                  <h3 className="font-bold text-white text-sm">{card.title}</h3>
                  <p className="text-[11px] text-zinc-400 mt-1">{card.sub}</p>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-black text-violet-400">{card.count} active</span>
                  <ChevronRight size={14} className="text-zinc-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Inline editable Professional Information */}
        <Card className="bg-[#141824]/40 border border-white/[0.08] rounded-[24px] p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase size={16} className="text-violet-400" />
              Professional Profile details
            </h2>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setIsEditingInfo(!isEditingInfo)}
              className="text-violet-400 text-xs font-semibold hover:bg-white/5"
            >
              {isEditingInfo ? 'Cancel' : 'Edit details'}
            </Button>
          </div>

          {isEditingInfo ? (
            <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Current Company</label>
                  <Input {...profileForm.register('company')} className="bg-background/50 text-xs mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Role Designation</label>
                  <Input {...profileForm.register('role')} className="bg-background/50 text-xs mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">LinkedIn Profile URL</label>
                  <Input {...profileForm.register('linkedinUrl')} className="bg-background/50 text-xs mt-1" placeholder="https://linkedin.com/in/..." />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Portfolio URL</label>
                  <Input {...profileForm.register('portfolioUrl')} className="bg-background/50 text-xs mt-1" placeholder="https://..." />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Technical Skills (comma separated)</label>
                <Input {...profileForm.register('skills')} className="bg-background/50 text-xs mt-1" placeholder="React, Node.js, Python, AWS" />
              </div>

              <div className="flex gap-4 items-center pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                  <input type="checkbox" {...profileForm.register('isAvailableForMentorship')} className="rounded border-white/10 bg-background" />
                  Available for Mentorship
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                  <input type="checkbox" {...profileForm.register('isAvailableForReferrals')} className="rounded border-white/10 bg-background" />
                  Available for Referrals
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="submit" size="sm">Save Changes</Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Company & Role</span>
                  <p className="text-zinc-200 font-medium">{currentAlumniProfile?.role || 'Senior Software Engineer'} at {currentAlumniProfile?.company || 'Google'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Tech Stack & Skills</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(currentAlumniProfile?.skills || ['React', 'Node.js', 'Typescript', 'AWS', 'Next.js']).map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-zinc-300 font-semibold text-[10px]">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Mentorship Status</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                    currentAlumniProfile?.isAvailableForMentorship ?? true 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-zinc-500/10 text-zinc-400 border border-white/5'
                  } uppercase`}>
                    <Check size={10} /> {currentAlumniProfile?.isAvailableForMentorship ?? true ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Referral Status</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                    currentAlumniProfile?.isAvailableForReferrals ?? true 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-zinc-500/10 text-zinc-400 border border-white/5'
                  } uppercase`}>
                    <Check size={10} /> {currentAlumniProfile?.isAvailableForReferrals ?? true ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 6. Achievements Vertical Timeline */}
        <Card className="bg-[#141824]/40 border border-white/[0.08] rounded-[24px] p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/[0.06] pb-3">
            <Award size={16} className="text-violet-400" />
            Achievements Milestones
          </h2>

          <div className="relative pl-6 border-l border-white/10 space-y-6">
            {achievements.length === 0 ? (
              <div className="text-xs text-zinc-500 py-3">No professional achievements logged yet. Click "Achievements" card inside Creator Center to add!</div>
            ) : (
              achievements.map((ach) => (
                <div key={ach.id} className="relative space-y-1">
                  <span className="absolute -left-[30px] top-1 h-3.5 w-3.5 rounded-full bg-violet-600 border border-zinc-950 flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-white">{ach.title}</h4>
                    <span className="text-[10px] text-zinc-500 font-bold">{ach.date}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">{ach.description}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* dialog forms */}
      {/* 1. Post Dialog */}
      <Dialog open={activeModal === 'post'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border/40">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Opportunity Post' : 'Share Job Opportunity'}</DialogTitle>
            <DialogDescription>Publish job alerts, industry articles, or open internships.</DialogDescription>
          </DialogHeader>
          <form onSubmit={postForm.handleSubmit(handleSavePost)} className="space-y-4 pt-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Post Category</label>
              <select
                {...postForm.register('type')}
                className="mt-1 w-full rounded-md border border-input bg-background/50 px-3 h-9 text-xs text-foreground focus:outline-none"
              >
                <option value="internship">Internship</option>
                <option value="hiring">Full-Time Hiring</option>
                <option value="referral">Job Referral</option>
                <option value="general">Career Insight</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Post Details</label>
              <Textarea 
                {...postForm.register('content', { required: true })} 
                placeholder="Include eligibility, skills required, link to apply, etc." 
                className="mt-1 h-32 bg-background/50" 
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveModal(null)}>Cancel</Button>
              <Button type="submit" size="sm">Publish Post</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Referral Dialog */}
      <Dialog open={activeModal === 'referral'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border/40">
          <DialogHeader>
            <DialogTitle>Create Job Referral</DialogTitle>
          </DialogHeader>
          <form onSubmit={referralForm.handleSubmit(handleSaveReferral)} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Company Name</label>
                <Input {...referralForm.register('companyName', { required: true })} placeholder="e.g. Google" className="mt-1 bg-background/50 h-9 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Job Title</label>
                <Input {...referralForm.register('jobTitle', { required: true })} placeholder="e.g. Product Manager" className="mt-1 bg-background/50 h-9 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Location</label>
                <Input {...referralForm.register('location')} placeholder="e.g. Sunnyvale, CA" className="mt-1 bg-background/50 h-9 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Application Link</label>
                <Input {...referralForm.register('applicationUrl', { required: true })} placeholder="https://..." className="mt-1 bg-background/50 h-9 text-xs" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Role Description</label>
              <Textarea {...referralForm.register('description')} placeholder="Detail the candidate criteria..." className="mt-1 h-20 bg-background/50 text-xs" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveModal(null)}>Cancel</Button>
              <Button type="submit" size="sm">Create Referral</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Roadmap Dialog */}
      <Dialog open={activeModal === 'roadmap'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border/40">
          <DialogHeader>
            <DialogTitle>Publish Learning Roadmap</DialogTitle>
          </DialogHeader>
          <form onSubmit={roadmapForm.handleSubmit(handleSaveRoadmap)} className="space-y-4 pt-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Roadmap Title</label>
              <Input {...roadmapForm.register('title', { required: true })} placeholder="e.g. Frontend Engineering Guide" className="mt-1 bg-background/50 h-9 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
              <Textarea {...roadmapForm.register('description')} placeholder="Guide summary..." className="mt-1 h-16 bg-background/50 text-xs" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-border/20 pb-1.5">
                <span className="text-xs font-bold text-foreground">Timeline Milestones</span>
                <Button type="button" size="sm" variant="ghost" onClick={handleAddRoadmapStep} className="h-6 text-primary gap-1">
                  <Plus size={10} /> Add Milestone
                </Button>
              </div>
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                {roadmapSteps.map((step, idx) => (
                  <div key={idx} className="p-3 rounded-md border border-border/20 bg-muted/40 space-y-2 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-primary uppercase">Step {idx + 1}</span>
                      {roadmapSteps.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveRoadmapStep(idx)} className="h-5 w-5 text-destructive">
                          <Trash2 size={12} />
                        </Button>
                      )}
                    </div>
                    <Input 
                      value={step.title} 
                      onChange={(e) => handleStepChange(idx, 'title', e.target.value)} 
                      placeholder="e.g. Master HTML, CSS, & Git" 
                      className="bg-background/50 h-8 text-xs"
                      required
                    />
                    <Textarea 
                      value={step.description} 
                      onChange={(e) => handleStepChange(idx, 'description', e.target.value)} 
                      placeholder="e.g. Focus on flexbox, grid, semantic elements..." 
                      className="bg-background/50 text-xs h-12" 
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveModal(null)}>Cancel</Button>
              <Button type="submit" size="sm">Publish Guide</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Resource Dialog */}
      <Dialog open={activeModal === 'resource'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border/40">
          <DialogHeader>
            <DialogTitle>Share Resource</DialogTitle>
          </DialogHeader>
          <form onSubmit={resourceForm.handleSubmit(handleSaveResource)} className="space-y-3 pt-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resource Title</label>
              <Input {...resourceForm.register('title', { required: true })} placeholder="e.g. FAANG Interview Prep Guide" className="mt-1 bg-background/50 h-9 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                <select {...resourceForm.register('categoryType')} className="mt-1 w-full rounded-md border border-input bg-background/50 px-3 h-9 text-xs text-foreground focus:outline-none">
                  <option value="pdf">PDF Document</option>
                  <option value="course">Learning Course</option>
                  <option value="doc">Preparation Doc</option>
                  <option value="note">Study Notes</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Link</label>
                <Input {...resourceForm.register('link')} placeholder="https://..." className="mt-1 bg-background/50 h-9 text-xs" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
              <Textarea {...resourceForm.register('description')} placeholder="What should students focus on when reading this resource?" className="mt-1 h-20 bg-background/50 text-xs" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveModal(null)}>Cancel</Button>
              <Button type="submit" size="sm">Share Resource</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAlumniProfilePage;
