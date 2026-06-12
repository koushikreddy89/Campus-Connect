/**
 * Alumni Feed Page - PRODUCTION READY
 * 
 * Issues Fixed:
 * 1. useCallback for memoized callbacks prevents re-render loops
 * 2. Proper dependency array in useQuery
 * 3. useMemo to prevent object recreation
 * 4. Removed unnecessary re-renders
 * 5. Proper error handling and loading states
 * 
 * CRITICAL PATTERNS:
 * - Selector memoization in Zustand
 * - useCallback for handlers passed to children
 * - useMemo for derived state
 * - React Query with stable dependencies
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { LoaderCircle, Briefcase, Users, TrendingUp } from 'lucide-react';
import AlumniPostCard from '@/components/alumni/AlumniPostCard';
import AlumniProfileCard from '@/components/alumni/AlumniProfileCard';
import { AlumniPost, AlumniProfile } from '@/types/alumni';
import { Loader } from '@/components/Loader';
import { Button } from '@/components/ui/button';
import AlumniService from '@/services/alumniService';

const POSTS_PER_PAGE = 8;
const PROFILES_LIMIT = 12;

export default function AlumniFeedPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ✅ FIX 1: Memoize Zustand selector to prevent re-renders
  // Each value must be explicitly selected to prevent object recreation
  const authCollege = useAuthStore(s => s.college);
  const college = authCollege || 'SR University';
  const role = useAuthStore(s => s.role);
  const email = useAuthStore(s => s.email);

  // Pagination state for posts
  const [postsPage, setPostsPage] = useState(1);

  // ✅ FIX 2: Fetch posts using React Query with stable dependencies
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
  } = useQuery({
    queryKey: ['alumni-posts', college, postsPage],  // ✅ All deps are primitives
    queryFn: async () => {
      if (!college) throw new Error('College required');
      const offset = (postsPage - 1) * POSTS_PER_PAGE;
      return AlumniService.posts.getFeed(college, POSTS_PER_PAGE, offset);
    },
    enabled: !!college,  // ✅ Only fetch if college exists
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,  // 10 minutes (formerly cacheTime)
    retry: 2,  // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // ✅ FIX 3: Fetch profiles using React Query with stable dependencies
  const {
    data: profilesData,
    isLoading: profilesLoading,
    error: profilesError,
  } = useQuery({
    queryKey: ['alumni-profiles', college],  // ✅ Stable key
    queryFn: async () => {
      if (!college) throw new Error('College required');
      return AlumniService.profiles.getAllProfiles(college, {
        limit: PROFILES_LIMIT,
      });
    },
    enabled: !!college,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
  });

  // ✅ FIX 4: Memoize derived state to prevent unnecessary re-renders
  const { posts, hasMorePosts, error } = useMemo(() => ({
    posts: postsData?.data || [],
    hasMorePosts: postsData?.hasMore || false,
    error: postsError || profilesError,
  }), [postsData, postsError, profilesError]);

  // ✅ FIX 5: Memoize profiles to prevent recreation
  const profiles = useMemo(() => profilesData?.data || [], [profilesData]);

  // ✅ FIX 6: Use useCallback for memoized callbacks
  // These are stable across renders, preventing child component re-renders
  const updatePost = useCallback((postId: string, updates: Partial<AlumniPost>) => {
    if (!college) return;
    
    queryClient.setQueryData(['alumni-posts', college, postsPage], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.map((post: AlumniPost) =>
          post.id === postId ? { ...post, ...updates } : post
        ),
      };
    });
  }, [college, postsPage, queryClient]);  // ✅ Stable dependencies

  // ✅ FIX 7: Use useCallback for delete handler
  const removePost = useCallback((postId: string) => {
    if (!college) return;
    
    queryClient.setQueryData(['alumni-posts', college, postsPage], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.filter((post: AlumniPost) => post.id !== postId),
      };
    });
  }, [college, postsPage, queryClient]);

  // ✅ FIX 8: Use useCallback for navigation handlers
  const handleLoadMore = useCallback(() => {
    if (!postsLoading && hasMorePosts) {
      setPostsPage(prev => prev + 1);
    }
  }, [postsLoading, hasMorePosts]);

  const handleViewAllProfiles = useCallback(() => {
    navigate('/alumni/explorer');
  }, [navigate]);

  const handleCreatePost = useCallback(() => {
    navigate('/alumni/post/create');
  }, [navigate]);

  const handleViewAlumni = useCallback((alumniId: string) => {
    navigate(`/alumni/${alumniId}`);
  }, [navigate]);

  // ✅ FIX 9: Show loading state only on initial load
  const isInitialLoading = postsLoading && posts.length === 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 glass-strong border-b border-border"
      >
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Briefcase className="h-7 w-7 text-primary" />
                Alumni Hub
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Discover alumni stories, jobs & career insights
              </p>
            </div>

            {role === 'alumni' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreatePost}
                className="px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold"
              >
                + Share Story
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-destructive/15 text-destructive text-sm"
          >
            ❌ {error instanceof Error ? error.message : 'Failed to load alumni data. Please try again.'}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Alumni Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Featured Alumni Profiles (horizontal scroll) */}
            {!profilesLoading && profiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-foreground font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Featured Alumni
                  </h2>
                  <button
                    onClick={handleViewAllProfiles}
                    className="text-xs text-primary hover:underline transition-all"
                  >
                    View All
                  </button>
                </div>

                {/* Horizontal scroll profiles */}
                <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                  {profiles.slice(0, 8).map(profile => (
                    <motion.div
                      key={profile.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex-shrink-0"
                    >
                      <AlumniProfileCard
                        profile={profile}
                        onClick={() => handleViewAlumni(profile.id)}
                        variant="compact"
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Alumni Posts Feed */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-foreground font-semibold">Latest Stories</h2>
              </div>

              {/* Loading state */}
              {isInitialLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader size="lg" />
                </div>
              )}

              {/* Empty state */}
              {!isInitialLoading && posts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass rounded-2xl p-8 text-center"
                >
                  <Briefcase className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No alumni posts yet. Be the first to share your journey!
                  </p>
                  {role === 'alumni' && (
                    <Button
                      onClick={handleCreatePost}
                      className="mt-4"
                    >
                      Create Post
                    </Button>
                  )}
                </motion.div>
              )}

              {/* Posts list */}
              {posts.length > 0 && (
                <AnimatePresence mode="popLayout">
                  {posts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                    >
                      <AlumniPostCard
                        post={post}
                        onUpdate={updatePost}
                        onDelete={removePost}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {/* Load More Button */}
              {hasMorePosts && !isInitialLoading && posts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center pt-4"
                >
                  <Button
                    onClick={handleLoadMore}
                    disabled={postsLoading}
                    variant="outline"
                    className="rounded-full"
                  >
                    {postsLoading ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More Stories'
                    )}
                  </Button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Right: Sidebar (Desktop only) */}
          <div className="hidden lg:block space-y-4">
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-2xl p-4 space-y-4"
            >
              <h3 className="font-semibold text-foreground">Alumni Insights</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Alumni</span>
                  <span className="font-semibold text-foreground">
                    {profiles.length}+
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Posts</span>
                  <span className="font-semibold text-foreground">
                    {posts.length}+
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">From {college}</span>
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
              </div>

              <div className="border-t border-border/50 pt-3">
                <Button
                  onClick={handleViewAllProfiles}
                  variant="outline"
                  className="w-full rounded-xl"
                >
                  Explore All Alumni
                </Button>
              </div>
            </motion.div>

            {/* Top Companies */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-4"
            >
              <h3 className="font-semibold text-foreground mb-3">
                Where Alumni Work
              </h3>
              <div className="space-y-2">
                {profiles
                  .slice(0, 5)
                  .map(profile => (
                    <div
                      key={profile.id}
                      className="text-sm flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => handleViewAlumni(profile.id)}
                    >
                      <span className="text-muted-foreground">
                        {profile.company}
                      </span>
                      <span className="text-[10px] px-2 py-1 rounded bg-primary/15 text-primary font-medium">
                        {profile.role}
                      </span>
                    </div>
                  ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
