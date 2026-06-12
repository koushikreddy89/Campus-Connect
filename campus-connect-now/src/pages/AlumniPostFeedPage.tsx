/**
 * Alumni Post Feed Page
 * Main feed page for browsing and creating alumni posts
 */

import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, TrendingUp, Search as SearchIcon } from 'lucide-react';
import { useAlumniPostFeedStore } from '@/store/alumniPostFeedStore';
import { alumniPostService } from '@/services/alumniPostService';
import { AlumniPostCard } from '@/components/alumni/feed/AlumniPostCard';
import { AlumniPostFilters } from '@/components/alumni/feed/AlumniPostFilters';
import { AlumniPostSearch } from '@/components/alumni/feed/AlumniPostSearch';
import { AlumniPostLoadingSkeleton } from '@/components/alumni/feed/AlumniPostLoadingSkeleton';
import { FEED_PAGINATION_LIMIT } from '@/types/alumniPost';
import { toast } from 'sonner';

// ============================================
// Constants
// ============================================

const ANIMATION_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
};

// ============================================
// Component
// ============================================

export const AlumniPostFeedPage: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Store selectors
  const selectedType = useAlumniPostFeedStore((s) => s.selectedType);
  const searchQuery = useAlumniPostFeedStore((s) => s.searchQuery);
  const sortBy = useAlumniPostFeedStore((s) => s.sortBy);
  const currentPage = useAlumniPostFeedStore((s) => s.currentPage);
  const pageSize = useAlumniPostFeedStore((s) => s.pageSize);
  const setPosts = useAlumniPostFeedStore((s) => s.setPosts);
  const setTotal = useAlumniPostFeedStore((s) => s.setTotal);
  const setHasMore = useAlumniPostFeedStore((s) => s.setHasMore);
  const setLoading = useAlumniPostFeedStore((s) => s.setLoading);
  const setError = useAlumniPostFeedStore((s) => s.setError);
  const updatePost = useAlumniPostFeedStore((s) => s.updatePost);
  const removePost = useAlumniPostFeedStore((s) => s.removePost);
  const posts = useAlumniPostFeedStore((s) => s.posts);
  const error = useAlumniPostFeedStore((s) => s.error);
  const isLoading = useAlumniPostFeedStore((s) => s.isLoading);

  // ================================
  // Queries
  // ================================

  // Main feed query
  const {
    data: feedData,
    isLoading: isFeedLoading,
    error: feedError,
    refetch: refetchFeed,
  } = useQuery({
    queryKey: [
      'alumni-posts',
      {
        page: currentPage,
        limit: pageSize,
        type: selectedType,
        search: searchQuery,
        sort: sortBy,
      },
    ],
    queryFn: async () => {
      try {
        setLoading(true);
        const response = await alumniPostService.posts.getFeed({
          page: currentPage,
          limit: pageSize,
          type: selectedType ?? undefined,
          search: searchQuery || undefined,
          sortBy: sortBy,
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load feed';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // User stats query
  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => alumniPostService.posts.getStats(),
    staleTime: 5 * 60 * 1000,
  });

  // Trending posts query
  const { data: trendingPosts } = useQuery({
    queryKey: ['trending-posts'],
    queryFn: () => alumniPostService.posts.getTrending(5),
    staleTime: 10 * 60 * 1000,
  });

  // ================================
  // Effects
  // ================================

  useEffect(() => {
    if (feedData) {
      setPosts(feedData.posts);
      setTotal(feedData.total);
      setHasMore(feedData.hasMore);
    }
  }, [feedData, setPosts, setTotal, setHasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFeedLoading) {
          refetchFeed();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isFeedLoading, refetchFeed]);

  // ================================
  // Handlers
  // ================================

  const handleSearch = useCallback((query: string) => {
    refetchFeed();
  }, [refetchFeed]);

  const handleFilterChange = useCallback(() => {
    refetchFeed();
  }, [refetchFeed]);

  const handlePostCreate = useCallback(() => {
    setShowCreateModal(false);
    refetchFeed();
  }, [refetchFeed]);

  // ================================
  // Computed Values
  // ================================

  const emptyState = useMemo(() => {
    if (searchQuery) {
      return {
        icon: SearchIcon,
        title: 'No posts found',
        description: `No posts match your search for "${searchQuery}"`,
      };
    }

    if (selectedType) {
      return {
        icon: TrendingUp,
        title: 'No posts yet',
        description: 'Be the first to create a post!',
      };
    }

    return {
      icon: Plus,
      title: 'Welcome to Alumni Feed',
      description: 'Start by creating your first post or explore posts from other alumni',
    };
  }, [searchQuery, selectedType]);

  // ================================
  // Render
  // ================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Alumni Feed
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {feedData?.total || 0} posts • Connect with alumni community
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              <Plus size={20} />
              Create Post
            </motion.button>
          </div>

          {/* Search */}
          <AlumniPostSearch onSearch={handleSearch} />

          {/* Filters */}
          <AlumniPostFilters onFilterChange={handleFilterChange} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm mb-6"
          >
            {error}
          </motion.div>
        )}

        {/* Loading State */}
        {isFeedLoading && posts.length === 0 ? (
          <motion.div
            variants={ANIMATION_VARIANTS.container}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <AlumniPostLoadingSkeleton key={i} />
            ))}
          </motion.div>
        ) : posts.length > 0 ? (
          // Posts List
          <motion.div
            variants={ANIMATION_VARIANTS.container}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <AnimatePresence>
              {posts.map((post) => (
                <motion.div key={post.id} variants={ANIMATION_VARIANTS.item}>
                  <AlumniPostCard
                    post={post}
                    onPostUpdate={(postId, updates) => updatePost(postId, updates)}
                    onDelete={(postId) => removePost(postId)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          // Empty State
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700/50 mb-4">
              <emptyState.icon size={28} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{emptyState.title}</h3>
            <p className="text-slate-400 mb-6">{emptyState.description}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all"
            >
              <Plus size={18} />
              Create Your First Post
            </motion.button>
          </motion.div>
        )}

        {/* Infinite Scroll Trigger */}
        <div ref={observerTarget} className="h-10" />

        {/* Loading More */}
        {isFeedLoading && posts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="inline-flex items-center gap-2 text-slate-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              <span className="ml-2 text-sm">Loading more posts...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Sidebar */}
      <div className="hidden lg:block fixed right-4 top-32 w-80">
        {/* Trending Posts Widget */}
        {trendingPosts && trendingPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-orange-400" />
              <h3 className="text-lg font-bold text-white">Trending</h3>
            </div>

            <div className="space-y-3">
              {trendingPosts.slice(0, 5).map((post, idx) => (
                <motion.a
                  key={post.id}
                  whileHover={{ x: 4 }}
                  href={`#post-${post.id}`}
                  className="block p-3 rounded-lg hover:bg-slate-700/50 transition-colors group"
                >
                  <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                    {post.title || post.content}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{post.likes} likes • {post.comments} comments</p>
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}

        {/* User Stats Widget */}
        {userStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">Your Stats</h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Posts</span>
                <span className="text-white font-semibold">{userStats.totalPosts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Likes</span>
                <span className="text-white font-semibold">{userStats.totalLikes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Engagement</span>
                <span className="text-white font-semibold">{userStats.totalEngagement}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Create Post Modal - Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-2xl w-full"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Create Post</h2>
            <p className="text-slate-400 mb-6">Post creation form coming soon...</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(false)}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Close
            </motion.button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AlumniPostFeedPage;
