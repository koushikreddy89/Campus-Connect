/**
 * Premium Feed List Component
 * Main feed container with infinite scroll support
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePremiumFeedStore } from '@/store/premiumFeedStore';
import { PostCard } from './PostCard';
import { FeedSkeletonLoader } from './SkeletonLoader';
import { useInfiniteScroll } from '@/hooks/useFeedHooks';

interface FeedListProps {
  filter?: {
    postType?: string;
    tags?: string[];
    sortBy?: 'latest' | 'trending' | 'topLiked';
  };
}

export const FeedList: React.FC<FeedListProps> = ({ filter }) => {
  const { posts, isLoading, isLoadingMore, pagination, fetchFeed } = usePremiumFeedStore();
  const observerTarget = useInfiniteScroll(300);

  useEffect(() => {
    fetchFeed(filter);
  }, [filter, fetchFeed]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      {/* Loading state */}
      {isLoading && posts.length === 0 && <FeedSkeletonLoader count={3} />}

      {/* Empty state */}
      {!isLoading && posts.length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-gray-400 text-lg">No posts yet</p>
          <p className="text-gray-500 text-sm mt-2">
            Follow more alumni to see their posts here
          </p>
        </motion.div>
      )}

      {/* Posts list */}
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {posts.map((post, index) => (
          <PostCard key={post.id} post={post} index={index} />
        ))}
      </motion.div>

      {/* Loading more indicator */}
      {isLoadingMore && (
        <motion.div
          className="flex justify-center py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ delay: '0.1s' }} />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ delay: '0.2s' }} />
          </div>
        </motion.div>
      )}

      {/* Error state */}
      {pagination.error && (
        <motion.div
          className="text-center py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-red-400 text-sm">{pagination.error}</p>
          <button
            onClick={() => fetchFeed(filter)}
            className="mt-3 text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            Try again
          </button>
        </motion.div>
      )}

      {/* No more posts */}
      {!pagination.hasMore && posts.length > 0 && (
        <motion.div
          className="text-center py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-gray-500 text-sm">You're all caught up!</p>
        </motion.div>
      )}

      {/* Infinite scroll trigger */}
      {pagination.hasMore && posts.length > 0 && (
        <div ref={observerTarget} className="h-10 mt-8" />
      )}
    </div>
  );
};
