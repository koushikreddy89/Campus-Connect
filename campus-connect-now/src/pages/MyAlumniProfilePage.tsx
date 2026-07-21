/**
 * My Alumni Profile Page - Redesigned Premium Alumni Creator Dashboard
 * Inspired by LinkedIn Premium, ADPList, and Notion.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Menu,
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
  Pin,
  Map,
  Link as LinkIcon,
  Calendar,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  LogOut,
  Camera
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/authStore';
import { useAlumniStore } from '@/store/alumniStore';
import { formatAlumniDesignation } from '@/utils/alumniUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { alumniProfileService, alumniPostsService } from '@/services/alumniService';
import {
  AlumniProfile,
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

class SidebarErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[SidebarErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md">
          <p className="font-bold mb-1">Sidebar Navigation Error</p>
          <p>Please reload or click back.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface PremiumAvatarProps {
  src?: string;
  name?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}

const PremiumDashboardAvatar: React.FC<PremiumAvatarProps> = ({ src, name = 'User', onClick, size = 'sm', showStatus = true }) => {
  const [imageError, setImageError] = useState(false);
  
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const sizeClasses = {
    sm: 'h-9 w-9 text-xs',
    md: 'h-16 w-16 text-lg',
    lg: 'h-20 w-20 text-xl'
  };

  const statusSizeClasses = {
    sm: 'h-2.5 w-2.5 right-0 bottom-0 ring-1',
    md: 'h-3.5 w-3.5 right-0.5 bottom-0.5 ring-2',
    lg: 'h-4 w-4 right-1 bottom-1 ring-2'
  };

  const hasImage = !!src && src.startsWith('http') && !imageError;

  return (
    <div 
      className="relative inline-block cursor-pointer group transition-all duration-300 ease-out"
      onClick={onClick}
    >
      <div className={`
        ${sizeClasses[size]}
        rounded-full 
        flex 
        items-center 
        justify-center 
        overflow-hidden 
        transition-all 
        duration-300 
        border-2 
        border-primary 
        shadow-[0_0_15px_rgba(124,92,252,0.20)] 
        group-hover:shadow-[0_0_20px_rgba(124,92,252,0.45)] 
        group-hover:scale-105 
        bg-gradient-to-br from-primary via-purple-500 to-violet-600 
        text-white 
        font-bold
      `}>
        {hasImage ? (
          <img 
            src={src} 
            alt={name} 
            className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="tracking-wider text-white select-none">{initials}</span>
        )}
      </div>
      
      {showStatus && (
        <span className={`
          ${statusSizeClasses[size]}
          absolute 
          rounded-full 
          bg-green-500 
          ring-background 
          animate-pulse
        `} />
      )}
    </div>
  );
};

export const MyAlumniProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const authCollege = useAuthStore((state) => state.college);
  const college = authCollege || 'SR University';
  const userId = useAuthStore((state) => state.uid);
  const logout = useAuthStore((state) => state.logout);

  // Core Page State
  const [isChecking, setIsChecking] = useState(true);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Sub-resource lists
  const [posts, setPosts] = useState<AlumniPost[]>([]);
  const [referrals, setReferrals] = useState<AlumniReferral[]>([]);
  const [roadmaps, setRoadmaps] = useState<AlumniRoadmap[]>([]);
  const [resources, setResources] = useState<AlumniResource[]>([]);
  const [achievements, setAchievements] = useState<AlumniAchievement[]>([]);
  const [pinnedPostId, setPinnedPostId] = useState<string | null>(null);

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
    // Immediate execution on component mount using authenticated session or stored credentials
    const activeUserId = userId || localStorage.getItem('user_id') || 'alumni-test-user-89';
    console.log('🚀 [Dashboard Mount] Initializing creator dashboard for activeUserId:', activeUserId);
    loadAllData(activeUserId);

    if (college) {
      loadProfile();
    } else {
      const timer = setTimeout(() => {
        setIsChecking(false);
        setIsCreatingProfile(true);
      }, 2000);
      return () => clearTimeout(timer);
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
        portfolioUrl: currentAlumniProfile.portfolioUrl || ''
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
        // Fallback: If no dedicated alumni profile document exists yet, load data using current user ID
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
      console.log('🔄 [Dashboard] Fetching creator content for profileId:', profileId);
      
      let postsResult: any = { data: [] };
      try {
        postsResult = await alumniPostsService.getMyPosts();
      } catch (myPostsErr) {
        console.warn('⚠️ getMyPosts failed, falling back to getPostsByAlumniId:', myPostsErr);
        postsResult = await alumniPostsService.getPostsByAlumniId(profileId, college);
      }

      const [fetchedReferrals, fetchedRoadmaps, fetchedResources, fetchedAchievements] = await Promise.all([
        alumniProfileService.getReferralsByAlumniId(profileId),
        alumniProfileService.getRoadmapsByAlumniId(profileId),
        alumniProfileService.getResourcesByAlumniId(profileId),
        alumniProfileService.getAchievementsByAlumniId(profileId)
      ]);

      console.log('✅ [Dashboard] Loaded creator posts count:', (postsResult.data || []).length);
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

  // Handlers for profile creation/updating
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
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile details');
    }
  };

  // State for post submission
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // CRUD handlers for Posts
  const handleSavePost = async (data: any) => {
    console.log('📝 [Alumni Creator] handleSavePost triggered with form data:', data);
    if (!data.content || !data.content.trim()) {
      toast.error('Post content cannot be empty.');
      return;
    }

    try {
      setIsSubmittingPost(true);
      const targetAlumniId = currentAlumniProfile?.id || userId || '';
      const payload = {
        content: data.content.trim(),
        type: data.type || 'general',
        alumniId: targetAlumniId,
        collegeId: college,
        tags: [data.type || 'general']
      };

      if (editingItem) {
        console.log('🔄 [Alumni Creator] Updating existing post:', editingItem.id);
        const updated = await alumniPostsService.updatePost(editingItem.id, payload, college);
        toast.success('Post updated successfully!');
        if (updated) {
          setPosts(prev => prev.map(p => (p.id === updated.id || p._id === updated._id) ? { ...p, ...updated } : p));
        }
      } else {
        console.log('📤 [Alumni Creator] Publishing new post payload:', payload);
        const newCreatedPost = await alumniPostsService.createPost(payload, college);
        toast.success('Post published successfully.');
        // Immediately prepend new post into React state
        if (newCreatedPost) {
          setPosts(prev => [newCreatedPost, ...prev]);
        }
      }
      
      setActiveModal(null);
      setEditingItem(null);
      postForm.reset();
      
      if (targetAlumniId) {
        loadAllData(targetAlumniId);
      }
    } catch (err: any) {
      console.error('❌ [Alumni Creator] Post publication failed:', err);
      toast.error(err?.message || 'Failed to publish post. Please try again.');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await alumniPostsService.deletePost(id, college);
      toast.success('Post removed');
      setPosts(prev => prev.filter(p => (p.id !== id && p._id !== id)));
      if (userId) loadAllData(userId);
    } catch (err) {
      toast.error('Failed to delete post');
    }
  };

  // CRUD handlers for Referrals
  const handleSaveReferral = async (data: any) => {
    try {
      if (!currentAlumniProfile) return;
      
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;
      if (!data.applicationUrl || !urlPattern.test(data.applicationUrl.trim())) {
        toast.error('Invalid application URL. Please provide a valid web link.');
        return;
      }

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

  // CRUD handlers for Roadmaps
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

  // CRUD handlers for Resources
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

  // CRUD handlers for Achievements
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

  // Toggle Pinned Post status locally
  const togglePinPost = (id: string) => {
    if (pinnedPostId === id) {
      setPinnedPostId(null);
      toast.success('Post unpinned');
    } else {
      setPinnedPostId(id);
      toast.success('Post pinned to top');
    }
  };

  // Sidebar Menu Items Definition
  const menuItems = [
    { id: 'dashboard', label: 'Creator Home', icon: BarChart2 },
    { id: 'posts', label: 'My Posts', icon: FileText },
    { id: 'referrals', label: 'My Referrals', icon: Briefcase },
    { id: 'roadmaps', label: 'My Roadmaps', icon: Map },
    { id: 'resources', label: 'My Resources', icon: BookOpen },
    { id: 'achievements', label: 'My Achievements', icon: Award },
    { id: 'analytics', label: 'My Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Profile Settings', icon: Settings },
  ];

  // Helper stats computation
  const stats = {
    totalPosts: posts.length,
    totalReferrals: referrals.length,
    totalRoadmaps: roadmaps.length,
    totalResources: resources.length,
    studentsHelped: currentAlumniProfile?.connections?.length || currentAlumniProfile?.helpedCount || 0
  };

  // Loading indicator for profile check
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      <div className="min-h-screen bg-background py-12 px-4">
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
              <h1 className="text-3xl font-bold tracking-tight">Alumni Creator Setup</h1>
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

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Profile Photo (Optional)</label>
                  <div className="flex items-center gap-4 bg-background/25 border border-border/40 rounded-xl p-3">
                    <div className="relative group">
                      <PremiumDashboardAvatar
                        src={profileForm.watch('profileImageUrl')}
                        name={profileForm.watch('name') || 'Alumni'}
                        size="md"
                        showStatus={false}
                      />
                      <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera size={16} className="text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.getElementById('profile-image-upload-setup') as HTMLInputElement;
                            if (input) input.click();
                          }}
                          className="h-8 text-xs font-semibold border-primary/20 hover:bg-primary/10 text-primary"
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? 'Loading...' : 'Upload Photo'}
                        </Button>
                        {profileForm.watch('profileImageUrl') && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              profileForm.setValue('profileImageUrl', '');
                            }}
                            className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        JPG, PNG or WEBP. Max size 5MB.
                      </p>
                      <input
                        id="profile-image-upload-setup"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>
                  </div>
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

  // Dashboard Page Content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Performance overview */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Performance Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card/40 border-border/30 backdrop-blur-sm p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs font-medium uppercase tracking-wider">Total Views</span>
                    <Eye size={16} className="text-primary" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-bold">{currentAlumniProfile?.viewCount || 0}</span>
                    <p className="text-[10px] text-green-500 mt-1">▲ 12.3% this month</p>
                  </div>
                </Card>

                <Card className="bg-card/40 border-border/30 backdrop-blur-sm p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs font-medium uppercase tracking-wider">Connections</span>
                    <Users size={16} className="text-blue-500" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-bold">{stats.studentsHelped}</span>
                    <p className="text-[10px] text-blue-500 mt-1">Students connected</p>
                  </div>
                </Card>

                <Card className="bg-card/40 border-border/30 backdrop-blur-sm p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs font-medium uppercase tracking-wider">Referrals</span>
                    <Briefcase size={16} className="text-amber-500" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-bold">{stats.totalReferrals}</span>
                    <p className="text-[10px] text-amber-500 mt-1">Opportunities shared</p>
                  </div>
                </Card>

                <Card className="bg-card/40 border-border/30 backdrop-blur-sm p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs font-medium uppercase tracking-wider">Saved Resources</span>
                    <Bookmark size={16} className="text-purple-500" />
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-bold">{currentAlumniProfile?.savedResources?.length || 0}</span>
                    <p className="text-[10px] text-purple-500 mt-1">Bookmarked items</p>
                  </div>
                </Card>
              </div>
            </div>

            {/* Recent activity */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Recent Activity</h2>
              <Card className="bg-card/40 border-border/30 backdrop-blur-sm p-4 divide-y divide-border/20">
                {posts.length === 0 && referrals.length === 0 && roadmaps.length === 0 && resources.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No recent activities. Share a post or a referral to get started!
                  </div>
                )}

                {posts.slice(0, 1).map(post => (
                  <div key={post.id} className="py-3 first:pt-0 flex items-start gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-full mt-0.5">
                      <FileText size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-foreground">Published Post</span>
                        <span className="text-[10px] text-muted-foreground">Latest</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
                    </div>
                  </div>
                ))}

                {referrals.slice(0, 1).map(ref => (
                  <div key={ref.id} className="py-3 flex items-start gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-full mt-0.5">
                      <Briefcase size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-foreground">Referral Shared</span>
                        <span className="text-[10px] text-muted-foreground">{ref.company}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{ref.role} referral opportunity is live</p>
                    </div>
                  </div>
                ))}

                {resources.slice(0, 1).map(res => (
                  <div key={res.id} className="py-3 flex items-start gap-3">
                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-full mt-0.5">
                      <BookOpen size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-foreground">Resource Uploaded</span>
                        <span className="text-[10px] text-muted-foreground">{res.categoryType}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{res.title}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        );

      case 'posts':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-foreground">Creator Feed Posts</h2>
              <Button size="sm" onClick={() => { setEditingItem(null); postForm.reset(); setActiveModal('post'); }} className="gap-1.5 h-8">
                <Plus size={14} /> New Post
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground text-sm border-dashed col-span-full">
                  Write your first career insight or hiring update.
                </Card>
              ) : (
                posts.map(post => {
                  const postId = post._id || post.id || '';
                  return (
                    <Card key={postId} className="bg-card/40 border-border/30 p-4 relative overflow-hidden">
                      {pinnedPostId === postId && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[8px] font-bold px-2 py-0.5 rounded-bl">
                          PINNED
                        </div>
                      )}
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex gap-2 items-center">
                            <Badge variant="secondary" className="text-[9px] px-2 py-0">
                              {post.type}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Just now'}
                            </span>
                          </div>
                          <p className="text-xs text-foreground mt-2 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/10">
                        <div className="flex gap-1.5">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => togglePinPost(postId)}
                            className={`h-7 w-7 ${pinnedPostId === postId ? 'text-primary' : 'text-muted-foreground'}`}
                          >
                            <Pin size={13} />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => {
                              setEditingItem({ ...post, id: postId });
                              postForm.reset({
                                content: post.content,
                                type: post.type
                              });
                              setActiveModal('post');
                            }}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 size={13} />
                          </Button>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => handleDeletePost(postId)} className="h-7 w-7 text-destructive hover:bg-destructive/10">
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        );

      case 'referrals':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-foreground">Hiring Referrals</h2>
              <Button size="sm" onClick={() => { setEditingItem(null); referralForm.reset(); setActiveModal('referral'); }} className="gap-1.5 h-8">
                <Plus size={14} /> Share Opportunity
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {referrals.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground text-sm border-dashed col-span-full">
                  No referrals listed. Help students get referred to your company!
                </Card>
              ) : (
                referrals.map(ref => (
                  <Card key={ref.id} className="bg-card/40 border-border/30 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{ref.jobTitle || ref.role}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{ref.companyName || ref.company} • {ref.location || 'Remote'}</p>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-[11px] text-muted-foreground">
                          <p>🎯 <span className="font-semibold">Eligibility:</span> {ref.eligibility || 'Open'}</p>
                          <p>📅 <span className="font-semibold">Deadline:</span> {ref.deadline || 'No Deadline'}</p>
                          {ref.salary && <p>💰 <span className="font-semibold">Salary:</span> {ref.salary}</p>}
                          {(ref.role || ref.jobTitle) && <p>👔 <span className="font-semibold">Role:</span> {ref.jobTitle || ref.role}</p>}
                        </div>
                        {ref.description && (
                          <p className="text-xs text-muted-foreground mt-2 border-t border-border/10 pt-2">{ref.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/10">
                      {(ref.applicationUrl || ref.applicationLink) ? (
                        <a href={ref.applicationUrl || ref.applicationLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                          <LinkIcon size={10} /> Link
                        </a>
                      ) : <span className="text-[10px] text-muted-foreground">No Link</span>}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingItem(ref);
                            referralForm.reset({
                              companyName: ref.companyName || ref.company,
                              jobTitle: ref.jobTitle || ref.role,
                              eligibility: ref.eligibility || '',
                              deadline: ref.deadline || '',
                              salary: ref.salary || '',
                              location: ref.location || 'Remote',
                              applicationUrl: ref.applicationUrl || ref.applicationLink || '',
                              description: ref.description || ''
                            });
                            setActiveModal('referral');
                          }}
                          className="h-7 px-2.5 text-xs text-muted-foreground"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteReferral(ref.id)}
                          className="h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        );

      case 'roadmaps':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-foreground">Learning Roadmaps</h2>
              <Button size="sm" onClick={() => { setEditingItem(null); roadmapForm.reset(); setRoadmapSteps([{ title: '', description: '' }]); setActiveModal('roadmap'); }} className="gap-1.5 h-8">
                <Plus size={14} /> Create Roadmap
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roadmaps.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground text-sm border-dashed col-span-full">
                  No learning roadmaps shared yet. Guide students step-by-step.
                </Card>
              ) : (
                roadmaps.map(rd => (
                  <Card key={rd.id} className="bg-card/40 border-border/30 p-4">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{rd.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rd.description}</p>
                      
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Milestones</p>
                        <div className="space-y-1">
                          {rd.steps.map((st, idx) => (
                            <div key={idx} className="flex gap-2 items-center text-xs text-muted-foreground">
                              <span className="font-semibold text-primary">{idx + 1}.</span>
                              <span className="truncate">{st.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/10">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingItem(rd);
                          roadmapForm.reset(rd);
                          setRoadmapSteps(rd.steps);
                          setActiveModal('roadmap');
                        }}
                        className="h-7 px-2.5 text-xs text-muted-foreground"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRoadmap(rd.id)}
                        className="h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                      >
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-foreground">Content Resources</h2>
              <Button size="sm" onClick={() => { setEditingItem(null); resourceForm.reset(); setActiveModal('resource'); }} className="gap-1.5 h-8">
                <Plus size={14} /> Upload / Link
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resources.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground text-sm border-dashed col-span-full">
                  No learning resources shared. Add PDFs, course links, or templates.
                </Card>
              ) : (
                resources.map(res => (
                  <Card key={res.id} className="bg-card/40 border-border/30 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">{res.title}</h3>
                          <Badge className="text-[8px] uppercase">{res.categoryType}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{res.description}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/10">
                      {res.link ? (
                        <a href={res.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          Access Resource <ExternalLink size={10} />
                        </a>
                      ) : <span className="text-xs text-muted-foreground">Link not available</span>}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingItem(res);
                            resourceForm.reset(res);
                            setActiveModal('resource');
                          }}
                          className="h-7 px-2.5 text-xs text-muted-foreground"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteResource(res.id)}
                          className="h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        );

      case 'achievements':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-foreground">Milestones & Awards</h2>
              <Button size="sm" onClick={() => { setEditingItem(null); achievementForm.reset(); setActiveModal('achievement'); }} className="gap-1.5 h-8">
                <Plus size={14} /> Add Achievement
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground text-sm border-dashed col-span-full">
                  No achievements posted. Share promotion updates, awards, or certs!
                </Card>
              ) : (
                achievements.map(ac => (
                  <Card key={ac.id} className="bg-card/40 border-border/30 p-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="outline" className="text-[8px] uppercase tracking-wider mb-1">
                            {ac.type}
                          </Badge>
                          <h3 className="text-sm font-bold text-foreground">{ac.title}</h3>
                          {ac.issuer && <p className="text-[11px] text-muted-foreground">{ac.issuer}</p>}
                        </div>
                        {ac.date && <span className="text-[10px] text-muted-foreground">{ac.date}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{ac.description}</p>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/10">
                      {ac.link ? (
                        <a href={ac.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                          View Verification <ExternalLink size={10} />
                        </a>
                      ) : <span />}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingItem(ac);
                            achievementForm.reset(ac);
                            setActiveModal('achievement');
                          }}
                          className="h-7 px-2.5 text-xs text-muted-foreground"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAchievement(ac.id)}
                          className="h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-foreground">Creator Analytics</h2>
            
            {/* Main graph placeholder styled premium */}
            <Card className="bg-card/40 border-border/30 p-4 space-y-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Weekly Reach</span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">1,240 Impressions</h3>
              </div>
              <div className="h-28 bg-gradient-to-t from-primary/10 to-transparent border-b border-border/20 rounded flex items-end justify-between p-2">
                <div className="w-6 bg-primary/20 h-8 rounded-t" />
                <div className="w-6 bg-primary/30 h-14 rounded-t" />
                <div className="w-6 bg-primary/40 h-20 rounded-t" />
                <div className="w-6 bg-primary/30 h-10 rounded-t" />
                <div className="w-6 bg-primary/50 h-24 rounded-t" />
                <div className="w-6 bg-primary/80 h-28 rounded-t" />
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-card/40 border-border/30 p-3 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Post Engagement</p>
                <p className="text-lg font-bold text-foreground">4.2%</p>
                <div className="w-full bg-border/20 h-1 rounded overflow-hidden">
                  <div className="bg-green-500 h-full w-[42%]" />
                </div>
              </Card>

              <Card className="bg-card/40 border-border/30 p-3 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Search Appearances</p>
                <p className="text-lg font-bold text-foreground">186</p>
                <div className="w-full bg-border/20 h-1 rounded overflow-hidden">
                  <div className="bg-primary h-full w-[60%]" />
                </div>
              </Card>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-lg font-bold text-foreground">Edit Profile Settings</h2>
            
            <Card className="bg-card/40 border-border/30 p-5">
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Full Name</label>
                  <Input {...profileForm.register('name')} className="mt-1 bg-background/50 h-9" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Batch Year</label>
                    <select
                      {...profileForm.register('batch')}
                      className="mt-1 w-full rounded-md border border-input bg-background/50 px-3 h-9 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {BatchOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Department</label>
                    <Input {...profileForm.register('department')} className="mt-1 bg-background/50 h-9" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Company</label>
                    <Input {...profileForm.register('company')} className="mt-1 bg-background/50 h-9" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Designation / Role</label>
                    <Input {...profileForm.register('role')} className="mt-1 bg-background/50 h-9" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Bio / Story / Career Journey</label>
                  <Textarea {...profileForm.register('story')} className="mt-1 bg-background/50 h-24" />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Skills (comma separated)</label>
                  <Input {...profileForm.register('skills')} placeholder="React, Node.js, Python" className="mt-1 bg-background/50 h-9" />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Profile Photo</label>
                  <div className="flex items-center gap-4 bg-background/25 border border-border/40 rounded-xl p-3">
                    <div className="relative group">
                      <PremiumDashboardAvatar
                        src={profileForm.watch('profileImageUrl')}
                        name={profileForm.watch('name') || 'Alumni'}
                        size="md"
                        showStatus={false}
                      />
                      <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera size={16} className="text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.getElementById('profile-image-upload-edit') as HTMLInputElement;
                            if (input) input.click();
                          }}
                          className="h-8 text-xs font-semibold border-primary/20 hover:bg-primary/10 text-primary"
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? 'Loading...' : 'Upload Photo'}
                        </Button>
                        {profileForm.watch('profileImageUrl') && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              profileForm.setValue('profileImageUrl', '');
                            }}
                            className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        JPG, PNG or WEBP. Max size 5MB.
                      </p>
                      <input
                        id="profile-image-upload-edit"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">LinkedIn URL</label>
                    <Input {...profileForm.register('linkedinUrl')} className="mt-1 bg-background/50 h-9" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Portfolio URL</label>
                    <Input {...profileForm.register('portfolioUrl')} className="mt-1 bg-background/50 h-9" />
                  </div>
                </div>

                <Button type="submit" disabled={profilesLoading} className="w-full mt-4 h-9">
                  {profilesLoading ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </form>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header Bar */}
      <div className="border-b border-border/40 backdrop-blur-md bg-background/80 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => setIsSidebarOpen(true)} className="h-8 w-8 text-foreground">
            <Menu size={20} />
          </Button>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight flex items-center gap-1">
              CAMPUS CONNECT <Badge className="bg-primary/25 hover:bg-primary/20 text-primary text-[8px] font-black px-1.5 py-0.5 border border-primary/20">CREATOR</Badge>
            </h1>
          </div>
        </div>

        {currentAlumniProfile && (
          <PremiumDashboardAvatar
            src={currentAlumniProfile.profileImageUrl || currentAlumniProfile.profileImage}
            name={currentAlumniProfile.name}
            onClick={() => setActiveTab('settings')}
            size="sm"
            showStatus={true}
          />
        )}
      </div>

      {/* Slide-out Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black z-50 max-w-lg mx-auto"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-3/4 max-w-[280px] bg-background/95 backdrop-blur-xl border-r border-border/40 z-50 p-5 flex flex-col justify-between"
            >
              <SidebarErrorBoundary>
                <div className="flex flex-col h-full justify-between">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black tracking-wider text-muted-foreground uppercase">Creator Center</span>
                      <Button size="icon" variant="ghost" onClick={() => setIsSidebarOpen(false)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                        {X ? <X size={16} /> : <span>×</span>}
                      </Button>
                    </div>

                    <div className="space-y-1">
                      {menuItems.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              setIsSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                              isActive
                                ? 'bg-primary/10 text-primary border-l-2 border-primary'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                          >
                            {Icon ? <Icon size={16} /> : <div className="w-4 h-4 rounded bg-muted" />}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-border/30 pt-4 space-y-3">
                    {currentAlumniProfile && (
                      <div className="flex items-center gap-3">
                        <PremiumDashboardAvatar
                          src={currentAlumniProfile.profileImageUrl || currentAlumniProfile.profileImage}
                          name={currentAlumniProfile.name}
                          size="sm"
                          showStatus={false}
                        />
                        <div className="truncate">
                          <p className="text-xs font-bold text-foreground truncate">{currentAlumniProfile.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{currentAlumniProfile.company}</p>
                        </div>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await logout();
                        navigate('/');
                      }}
                      className="w-full text-xs font-semibold justify-start text-muted-foreground hover:text-foreground"
                    >
                      {LogOut ? <LogOut size={14} className="mr-2" /> : <div className="w-3.5 h-3.5 rounded bg-muted mr-2" />} Exit Dashboard
                    </Button>
                  </div>
                </div>
              </SidebarErrorBoundary>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="px-4 py-6 w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto space-y-6">
        {/* Top Professional Alumni Header Card */}
        {currentAlumniProfile && (
          <Card className="overflow-hidden border border-border/40 bg-card/40 backdrop-blur-md relative">
            <div className="h-16 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent absolute top-0 inset-x-0" />
            <CardContent className="pt-8 px-4 pb-4 relative space-y-4">
              <div className="flex gap-4 items-start">
                <PremiumDashboardAvatar
                  src={currentAlumniProfile.profileImageUrl || currentAlumniProfile.profileImage}
                  name={currentAlumniProfile.name}
                  size="md"
                  showStatus={true}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-extrabold tracking-tight text-foreground">{currentAlumniProfile.name}</h2>
                    <Badge className="bg-primary/15 hover:bg-primary/10 border-primary/20 text-primary p-0.5 text-[8px] rounded-full">
                      <Sparkles size={8} className="fill-primary" />
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {formatAlumniDesignation(currentAlumniProfile)}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80">
                    Batch {currentAlumniProfile.batch || currentAlumniProfile.batchYear} • {currentAlumniProfile.department}
                  </p>
                </div>
              </div>

              {/* Stat Cards Row */}
              <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-border/10 text-center">
                <div className="space-y-0.5">
                  <p className="text-sm font-black text-foreground">{stats.totalPosts}</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wide">Posts</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-black text-foreground">{stats.totalReferrals}</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wide">Refers</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-black text-foreground">{stats.totalRoadmaps}</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wide">Maps</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-black text-foreground">{stats.totalResources}</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wide">Links</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-black text-primary">{stats.studentsHelped}</p>
                  <p className="text-[8px] font-bold text-primary uppercase tracking-wide">Helped</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dynamic section renderer */}
        {loadingData ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-xs text-muted-foreground mt-3">Syncing dashboard data...</p>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>

      {/* Universal Modals Manager */}
      
      {/* 1. Post Dialog */}
      <Dialog open={activeModal === 'post'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border/40">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Post' : 'Share Career Insight'}</DialogTitle>
            <DialogDescription>Write career advice, industry updates, or success stories for students.</DialogDescription>
          </DialogHeader>
          <form onSubmit={postForm.handleSubmit(handleSavePost)} className="space-y-4 pt-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Post Type</label>
              <select
                {...postForm.register('type')}
                className="mt-1 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none"
              >
                <option value="general">Career Advice / General</option>
                <option value="job">Hiring Updates / Openings</option>
                <option value="industry_insight">Industry Insights</option>
                <option value="success_story">Success Stories</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Content</label>
              <Textarea
                {...postForm.register('content', { required: true })}
                placeholder="What's on your mind? Share industry insights or stories..."
                className="mt-1 h-32 bg-background/50"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" size="sm" disabled={isSubmittingPost} onClick={() => setActiveModal(null)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isSubmittingPost}>
                {isSubmittingPost ? 'Publishing...' : (editingItem ? 'Save Updates' : 'Publish Post')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Referral Dialog */}
      <Dialog open={activeModal === 'referral'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border/40">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Referral Opportunity' : 'List a Hiring Referral'}</DialogTitle>
            <DialogDescription>Input job opportunities details. Stored directly on MongoDB.</DialogDescription>
          </DialogHeader>
          <form onSubmit={referralForm.handleSubmit(handleSaveReferral)} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Company Name *</label>
                <Input 
                  {...referralForm.register('companyName', { required: 'Company Name is required' })} 
                  placeholder="e.g. Google" 
                  className={`mt-1 bg-background/50 ${referralForm.formState.errors.companyName ? 'border-red-500' : ''}`}
                />
                {referralForm.formState.errors.companyName && (
                  <p className="text-[10px] text-red-500 mt-0.5">{referralForm.formState.errors.companyName.message?.toString()}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Job Title *</label>
                <Input 
                  {...referralForm.register('jobTitle', { required: 'Job Title is required' })} 
                  placeholder="e.g. Frontend Intern" 
                  className={`mt-1 bg-background/50 ${referralForm.formState.errors.jobTitle ? 'border-red-500' : ''}`}
                />
                {referralForm.formState.errors.jobTitle && (
                  <p className="text-[10px] text-red-500 mt-0.5">{referralForm.formState.errors.jobTitle.message?.toString()}</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Eligibility Requirements *</label>
              <Input 
                {...referralForm.register('eligibility', { required: 'Eligibility requirements are required' })} 
                placeholder="e.g. B.Tech 2025/2026, Min 8 CGPA" 
                className={`mt-1 bg-background/50 ${referralForm.formState.errors.eligibility ? 'border-red-500' : ''}`}
              />
              {referralForm.formState.errors.eligibility && (
                <p className="text-[10px] text-red-500 mt-0.5">{referralForm.formState.errors.eligibility.message?.toString()}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deadline *</label>
                <Input 
                  {...referralForm.register('deadline', { required: 'Deadline is required' })} 
                  type="date" 
                  className={`mt-1 bg-background/50 text-xs ${referralForm.formState.errors.deadline ? 'border-red-500' : ''}`}
                />
                {referralForm.formState.errors.deadline && (
                  <p className="text-[10px] text-red-500 mt-0.5">{referralForm.formState.errors.deadline.message?.toString()}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Salary Range</label>
                <select
                  {...referralForm.register('salary')}
                  className="mt-1 w-full rounded-md border border-input bg-background/50 px-3 h-9 text-xs text-foreground focus:outline-none"
                >
                  <option value="">Select Range</option>
                  {SalaryRangeOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Application URL *</label>
              <Input 
                {...referralForm.register('applicationUrl', { required: 'Application URL is required' })} 
                placeholder="https://..." 
                className={`mt-1 bg-background/50 ${referralForm.formState.errors.applicationUrl ? 'border-red-500' : ''}`}
              />
              {referralForm.formState.errors.applicationUrl && (
                <p className="text-[10px] text-red-500 mt-0.5">{referralForm.formState.errors.applicationUrl.message?.toString()}</p>
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Optional Description</label>
              <Textarea 
                {...referralForm.register('description')} 
                placeholder="Add optional notes, tips, or details about the referral process..." 
                className="mt-1 h-20 bg-background/50 text-xs" 
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveModal(null)}>Cancel</Button>
              <Button type="submit" size="sm">{editingItem ? 'Update Opportunity' : 'Share Opportunity'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Roadmap Dialog */}
      <Dialog open={activeModal === 'roadmap'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border/40 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Learning Roadmap' : 'Publish Learning Roadmap'}</DialogTitle>
            <DialogDescription>Map out step-by-step career tracks for current students.</DialogDescription>
          </DialogHeader>
          <form onSubmit={roadmapForm.handleSubmit(handleSaveRoadmap)} className="space-y-4 pt-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Roadmap Track Title</label>
              <Input {...roadmapForm.register('title', { required: true })} placeholder="e.g. Frontend Engineering Guide" className="mt-1 bg-background/50" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Brief Description</label>
              <Textarea {...roadmapForm.register('description')} placeholder="Guide summary..." className="mt-1 h-16 bg-background/50" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-border/20 pb-1.5">
                <span className="text-xs font-bold text-foreground">Timeline Milestones</span>
                <Button type="button" size="sm" variant="ghost" onClick={handleAddRoadmapStep} className="h-6 text-primary gap-1">
                  <Plus size={10} /> Add Milestone
                </Button>
              </div>
              
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
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
            <DialogTitle>{editingItem ? 'Edit Resource' : 'Share Resource'}</DialogTitle>
            <DialogDescription>Publish helpful guides, PDFs, learning courses, or interview prep notes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={resourceForm.handleSubmit(handleSaveResource)} className="space-y-3 pt-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resource Title</label>
              <Input {...resourceForm.register('title', { required: true })} placeholder="e.g. FAANG Interview Prep Guide" className="mt-1 bg-background/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                <select
                  {...resourceForm.register('categoryType')}
                  className="mt-1 w-full rounded-md border border-input bg-background/50 px-3 h-9 text-xs text-foreground focus:outline-none"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="course">Learning Course</option>
                  <option value="doc">Preparation Doc</option>
                  <option value="note">Study Notes</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Link</label>
                <Input {...resourceForm.register('link')} placeholder="https://..." className="mt-1 bg-background/50" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
              <Textarea {...resourceForm.register('description')} placeholder="What should students focus on when reading this resource?" className="mt-1 h-20 bg-background/50" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveModal(null)}>Cancel</Button>
              <Button type="submit" size="sm">Share Resource</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Achievement Dialog */}
      <Dialog open={activeModal === 'achievement'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border/40">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Achievement' : 'Log Professional Achievement'}</DialogTitle>
            <DialogDescription>Announce certifications, publications, promotions, or awards.</DialogDescription>
          </DialogHeader>
          <form onSubmit={achievementForm.handleSubmit(handleSaveAchievement)} className="space-y-3 pt-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Achievement Title</label>
              <Input {...achievementForm.register('title', { required: true })} placeholder="e.g. Promoted to Staff Engineer" className="mt-1 bg-background/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Milestone Type</label>
                <select
                  {...achievementForm.register('type')}
                  className="mt-1 w-full rounded-md border border-input bg-background/50 px-3 h-9 text-xs text-foreground focus:outline-none"
                >
                  <option value="Promotion">Promotion</option>
                  <option value="Certification">Certification</option>
                  <option value="Award">Award</option>
                  <option value="Publication">Publication</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date Achieved</label>
                <Input {...achievementForm.register('date')} placeholder="e.g. June 2026" className="mt-1 bg-background/50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Issuer / Org</label>
                <Input {...achievementForm.register('issuer')} placeholder="e.g. Google Cloud" className="mt-1 bg-background/50" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">External Link</label>
                <Input {...achievementForm.register('link')} placeholder="https://..." className="mt-1 bg-background/50" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
              <Textarea {...achievementForm.register('description')} placeholder="Detail your achievement milestones..." className="mt-1 h-20 bg-background/50" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveModal(null)}>Cancel</Button>
              <Button type="submit" size="sm">Log Milestone</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAlumniProfilePage;
