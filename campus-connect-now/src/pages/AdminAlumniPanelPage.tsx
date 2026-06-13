/**
 * Admin Alumni Panel
 * Content moderation and approvals
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, ShieldAlert, Clock, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAlumniStore } from '@/store/alumniStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { adminAlumniService } from '@/services/alumniService';
import { getApiUrl } from '@/services/connectionService';
import { AlumniProfile, AlumniPost, AlumniVideo } from '@/types/alumni';
import { toast } from 'sonner';

export const AdminAlumniPanelPage: React.FC = () => {
  const college = useAuthStore((state) => state.college);
  const role = useAuthStore((state) => state.role);

  // State
  const [pendingProfiles, setPendingProfiles] = useState<AlumniProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [moderationEnabled, setModerationEnabled] = useState(true);

  // Store
  const approveAlumniProfile = useAlumniStore((state) => state.approveAlumniProfile);
  const rejectAlumniProfile = useAlumniStore((state) => state.rejectAlumniProfile);
  const fetchAnalytics = useAlumniStore((state) => state.fetchAnalytics);
  const analytics = useAlumniStore((state) => state.analytics);

  const posts = useAlumniStore((state) => state.posts);
  const postsLoading = useAlumniStore((state) => state.postsLoading);
  const fetchAlumniPosts = useAlumniStore((state) => state.fetchAlumniPosts);
  const approveAlumniPost = useAlumniStore((state) => state.approveAlumniPost);
  const rejectAlumniPost = useAlumniStore((state) => state.rejectAlumniPost);

  // Effects
  useEffect(() => {
    if (role !== 'admin') {
      window.location.href = '/';
      return;
    }

    if (college) {
      loadPendingProfiles();
      loadAnalytics();
      fetchAlumniPosts(college);
      checkModerationStatus();
    }
  }, [college, role]);

  // Handlers
  const checkModerationStatus = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/config`);
      const data = await res.json();
      if (data.success && data.config) {
        setModerationEnabled(data.config.moderationEnabled);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const loadPendingProfiles = async () => {
    try {
      setLoading(true);
      if (college) {
        const profiles = await adminAlumniService.getPendingProfiles(college);
        setPendingProfiles(profiles);
      }
    } catch (error) {
      console.error('Failed to load pending profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (college) {
      await fetchAnalytics(college);
    }
  };

  const handleApprove = async (profileId: string) => {
    try {
      if (college) {
        await approveAlumniProfile(profileId, college);
        setPendingProfiles(pendingProfiles.filter(p => p.id !== profileId));
        toast.success('Profile approved successfully!');
      }
    } catch (error) {
      console.error('Failed to approve profile:', error);
      toast.error('Failed to approve profile');
    }
  };

  const handleReject = async (profileId: string) => {
    try {
      if (college) {
        await rejectAlumniProfile(profileId, college);
        setPendingProfiles(pendingProfiles.filter(p => p.id !== profileId));
        toast.success('Profile rejected successfully!');
      }
    } catch (error) {
      console.error('Failed to reject profile:', error);
      toast.error('Failed to reject profile');
    }
  };

  const handleApprovePost = async (postId: string) => {
    try {
      if (college) {
        await approveAlumniPost(postId, college);
        toast.success('Post approved successfully!');
        await fetchAlumniPosts(college);
      }
    } catch (error) {
      console.error('Failed to approve post:', error);
      toast.error('Failed to approve post');
    }
  };

  const handleRejectPost = async (postId: string) => {
    try {
      if (college) {
        await rejectAlumniPost(postId, college);
        toast.success('Post rejected successfully!');
        await fetchAlumniPosts(college);
      }
    } catch (error) {
      console.error('Failed to reject post:', error);
      toast.error('Failed to reject post');
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold">Alumni Content Moderation</h1>
            <p className="text-muted-foreground mt-1">
              Review and approve alumni profiles, posts, and videos
            </p>
          </motion.div>

          {/* Mode Indicator Tag */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 self-start md:self-center"
          >
            {moderationEnabled ? (
              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Moderation Mode Active
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                Auto-Approval Mode Active
              </Badge>
            )}
          </motion.div>
        </div>

        {/* Premium Bypassed Banner */}
        {!moderationEnabled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-emerald-500/5 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Auto-Approval Testing Mode Enabled</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  The Admin Approval Workflow is currently bypassed because <code className="text-emerald-300 font-semibold">MODERATION_ENABLED=false</code> is set in the environment. All new alumni posts and profiles bypass review, are marked as "Approved", and are published instantly to all feeds.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analytics Overview */}
        {analytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <Card className="p-6 space-y-2">
              <p className="text-sm text-muted-foreground">Total Profiles</p>
              <p className="text-3xl font-bold">{analytics.totalProfiles}</p>
            </Card>
            <Card className="p-6 space-y-2">
              <p className="text-sm text-muted-foreground">Total Posts</p>
              <p className="text-3xl font-bold">{analytics.totalPosts}</p>
            </Card>
            <Card className="p-6 space-y-2">
              <p className="text-sm text-muted-foreground">Total Videos</p>
              <p className="text-3xl font-bold">{analytics.totalVideos}</p>
            </Card>
            <Card className="p-6 space-y-2">
              <p className="text-sm text-muted-foreground">Total Engagement</p>
              <p className="text-3xl font-bold">{analytics.totalEngagement}</p>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="profiles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="profiles">
              Pending Profiles
              {pendingProfiles.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingProfiles.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="posts">
              Posts
              {posts.filter(p => p.approvalStatus === 'pending' || p.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {posts.filter(p => p.approvalStatus === 'pending' || p.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
          </TabsList>

          {/* Pending Profiles Tab */}
          <TabsContent value="profiles" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : pendingProfiles.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {pendingProfiles.map((profile, idx) => (
                  <motion.div
                    key={profile.id}
                    layout
                    className={expandedId === profile.id ? "col-span-full" : ""}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div
                        className="p-6 space-y-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() =>
                          setExpandedId(
                            expandedId === profile.id ? null : profile.id
                          )
                        }
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <Avatar
                              src={profile.profileImageUrl}
                              alt={profile.name}
                              className="h-12 w-12"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">
                                  {profile.name}
                                </h3>
                                <AlertCircle
                                  size={18}
                                  className="text-yellow-500"
                                />
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {profile.batch} • {profile.department}
                              </p>
                              {profile.company && (
                                <p className="text-sm font-medium mt-1">
                                  {profile.company} • {profile.role}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {new Date(
                              profile.createdAt
                            ).toLocaleDateString()}
                          </Badge>
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {expandedId === profile.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="pt-4 border-t space-y-4"
                            >
                              {/* Story */}
                              {profile.story && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">
                                    Career Journey
                                  </h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {profile.story}
                                  </p>
                                </div>
                              )}

                              {/* Skills */}
                              {profile.skills && profile.skills.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">
                                    Skills
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {profile.skills.map((skill) => (
                                      <Badge
                                        key={skill}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Achievements */}
                              {profile.achievements &&
                                profile.achievements.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2">
                                      Achievements
                                    </h4>
                                    <ul className="space-y-1 text-sm text-muted-foreground">
                                      {profile.achievements.map(
                                        (achievement, i) => (
                                          <li
                                            key={i}
                                            className="flex items-start gap-2"
                                          >
                                            <span className="text-accent">•</span>
                                            <span>{achievement}</span>
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}

                              {/* Actions */}
                              <div className="flex gap-3 pt-4 border-t">
                                <Button
                                  variant="outline"
                                  className="flex-1 gap-2 text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReject(profile.id);
                                  }}
                                >
                                  <XCircle size={18} />
                                  Reject
                                </Button>
                                <Button
                                  className="flex-1 gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApprove(profile.id);
                                  }}
                                >
                                  <CheckCircle2 size={18} />
                                  Approve
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              ) : (
                <Card className="col-span-full p-12 text-center text-muted-foreground">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-semibold">No pending profiles</p>
                  <p className="text-sm">All alumni profiles have been reviewed</p>
                </Card>
              )}
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts">
            {postsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : posts && posts.length > 0 ? (
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {posts.map((post, idx) => {
                    const isPending = post.approvalStatus === 'pending' || post.status === 'pending';
                    const isApproved = post.approvalStatus === 'approved' || post.status === 'approved';
                    const isRejected = post.approvalStatus === 'rejected' || post.status === 'rejected';

                    return (
                      <motion.div
                        key={post.id || post._id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                      >
                        <Card className="p-6 hover:shadow-lg transition-all border border-white/[0.06] bg-card flex flex-col justify-between h-full space-y-4">
                          <div className="space-y-4">
                            {/* Post Header */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  src={post.author?.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.alumniId}`}
                                  alt={post.author?.name || 'Alumni'}
                                  className="h-10 w-10 border border-white/[0.08]"
                                />
                                <div>
                                  <h4 className="font-semibold text-sm">
                                    {post.author?.name || 'Alumni Member'}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {post.author?.batch ? `${post.author.batch} • ${post.author.department}` : 'Alumni'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <Badge variant="outline" className="text-[10px]">
                                  {new Date(post.createdAt).toLocaleDateString()}
                                </Badge>
                                
                                {/* Status Badge */}
                                {isApproved ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                                    {!moderationEnabled ? 'Auto-Approved' : 'Approved'}
                                  </Badge>
                                ) : isRejected ? (
                                  <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold">
                                    Rejected
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-semibold">
                                    Pending Review
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Post Content */}
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold tracking-wider">
                                  {post.type || 'general'}
                                </Badge>
                                {post.company && (
                                  <Badge variant="secondary" className="text-[10px] font-medium">
                                    {post.company}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">
                                {post.content}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-3 border-t border-white/[0.06] flex gap-3 mt-auto">
                            {!moderationEnabled ? (
                              <div className="w-full text-center text-xs text-muted-foreground/60 py-2 bg-muted/20 rounded-xl border border-dashed border-white/[0.04] font-medium">
                                Moderation Bypassed (Auto-Approved)
                              </div>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 gap-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-xl"
                                  onClick={() => handleRejectPost(post.id || post._id)}
                                  disabled={isRejected}
                                >
                                  <XCircle size={14} />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 gap-1.5 text-xs rounded-xl"
                                  onClick={() => handleApprovePost(post.id || post._id)}
                                  disabled={isApproved}
                                >
                                  <CheckCircle2 size={14} />
                                  Approve
                                </Button>
                              </>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            ) : (
              <Card className="p-12 text-center text-muted-foreground">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                <p className="text-lg font-semibold">No posts found</p>
                <p className="text-sm">There are no alumni posts to moderate</p>
              </Card>
            )}
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos">
            <Card className="p-12 text-center text-muted-foreground">
              <p className="text-lg">Videos moderation coming soon</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminAlumniPanelPage;
