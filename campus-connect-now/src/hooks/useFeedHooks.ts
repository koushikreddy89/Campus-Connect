/**
 * Custom Hooks for Premium Alumni Feed
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePremiumFeedStore } from '@/store/premiumFeedStore';

/**
 * Hook for infinite scroll pagination
 * Triggers loadMore when user scrolls near bottom
 */
export const useInfiniteScroll = (threshold = 500) => {
  const { loadMorePosts, pagination } = usePremiumFeedStore();
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !pagination.isLoading && pagination.hasMore) {
          loadMorePosts();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [pagination.hasMore, pagination.isLoading, loadMorePosts, threshold]);

  return observerTarget;
};

/**
 * Hook for debounced scroll events
 */
export const useDebouncedScroll = (callback: () => void, delay = 300) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleScroll = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);
  }, [callback, delay]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleScroll]);
};

/**
 * Hook to lazy load images
 */
export const useLazyImage = (src: string) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && imageRef.current) {
          imageRef.current.src = src;
          setIsLoaded(true);
          observer.unobserve(imageRef.current);
        }
      },
      { rootMargin: '50px' }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => {
      if (imageRef.current) {
        observer.unobserve(imageRef.current);
      }
    };
  }, [src]);

  return { imageRef, isLoaded };
};

/**
 * Hook to format relative time
 */
export const useRelativeTime = (timestamp: string) => {
  const [relativeTime, setRelativeTime] = React.useState('');

  useEffect(() => {
    const formatRelativeTime = () => {
      const date = new Date(timestamp);
      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (seconds < 60) return 'now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
      if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
      if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`;
      if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo`;
      return `${Math.floor(seconds / 31536000)}y`;
    };

    setRelativeTime(formatRelativeTime());
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timestamp]);

  return relativeTime;
};

import * as React from 'react';
