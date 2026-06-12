/**
 * Admin Alumni Panel
 * Content moderation and approvals
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAlumniStore } from '@/store/alumniStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { adminAlumniService } from '@/services/alumniService';
import { AlumniProfile, AlumniPost, AlumniVideo } from '@/types/alumni';

export const AdminAlumniPanelPage: React.FC = () => {
  const college = useAuthStore((state) => state.college);
  const role = useAuthStore((state) => state.role);

  // State
  const [pendingProfiles, setPendingProfiles] = useState<AlumniProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Store
  const approveAlumniProfile = useAlumniStore((state) => state.approveAlumniProfile);
  const rejectAlumniProfile = useAlumniStore((state) => state.rejectAlumniProfile);
  const fetchAnalytics = useAlumniStore((state) => state.fetchAnalytics);
  const analytics = useAlumniStore((state) => state.analytics);

  // Effects
  useEffect(() => {
    if (role !== 'admin') {
      window.location.href = '/';
      return;
    }

    if (college) {
      loadPendingProfiles();
      loadAnalytics();
    }
  }, [college, role]);

  // Handlers
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
      }
    } catch (error) {
      console.error('Failed to approve profile:', error);
    }
  };

  const handleReject = async (profileId: string) => {
    try {
      if (college) {
        await rejectAlumniProfile(profileId, college);
        setPendingProfiles(pendingProfiles.filter(p => p.id !== profileId));
      }
    } catch (error) {
      console.error('Failed to reject profile:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
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
            <TabsTrigger value="posts">Posts</TabsTrigger>
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
            <Card className="p-12 text-center text-muted-foreground">
              <p className="text-lg">Posts moderation coming soon</p>
            </Card>
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
