import React, { useState, useEffect, useRef, useTransition, Suspense } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { BottomTabBar } from '@/components/BottomTabBar';

const HomePage = React.lazy(() => import('../pages/HomePage.tsx'));
const FeedPage = React.lazy(() => import('../pages/FeedPage.tsx'));
const PremiumAlumniFeedPage = React.lazy(() => import('../pages/PremiumAlumniFeedPage.tsx'));
const ChatListPage = React.lazy(() => import('../pages/ChatListPage.tsx'));
const ProfilePage = React.lazy(() => import('../pages/ProfilePage.tsx'));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#09090B]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
  </div>
);

const swipePaths = [
  '/student/dashboard',
  '/feed',
  '/alumni',
  '/chat',
  '/profile'
];

export const getIndexFromPath = (path: string) => {
  if (path.startsWith('/student/dashboard') || path.startsWith('/home')) return 0;
  if (path.startsWith('/feed')) return 1;
  if (path.startsWith('/alumni')) return 2;
  if (path.startsWith('/chat')) return 3;
  if (path.startsWith('/profile')) return 4;
  return -1;
};

interface SwipePageWrapperProps {
  i: number;
  animX: any;
  containerWidth: number;
  activeIndex: number;
  prefersReduced: boolean;
  children: React.ReactNode;
}

// Sub-component wrapper to preserve the order of hooks for Framer Motion useTransform calls
function SwipePageWrapper({
  i,
  animX,
  containerWidth,
  activeIndex,
  prefersReduced,
  children
}: SwipePageWrapperProps) {
  const pageX = useTransform(animX, (val: number) => {
    if (prefersReduced) return 0;
    const relativeOffset = val + i * containerWidth;
    if (relativeOffset < 0) {
      // Outgoing page (translate slower for native parallax effect)
      return relativeOffset * 0.3;
    }
    // Incoming page (translate normally)
    return relativeOffset;
  });

  const pageScale = useTransform(animX, (val: number) => {
    if (prefersReduced) return 1;
    const relativeOffset = val + i * containerWidth;
    const distance = Math.abs(relativeOffset) / containerWidth;
    if (relativeOffset < 0) {
      // Outgoing page shrinks slightly
      return 1 - distance * 0.02;
    }
    // Incoming page starts at 0.99 and reaches 1
    return 0.99 + (1 - distance) * 0.01;
  });

  const pageOpacity = useTransform(animX, (val: number) => {
    if (prefersReduced) return 1;
    const relativeOffset = val + i * containerWidth;
    const distance = Math.abs(relativeOffset) / containerWidth;
    if (relativeOffset < 0) {
      // Outgoing page opacity decreases slightly
      return 1 - distance * 0.08;
    }
    // Incoming page opacity goes from 0.92 to 1
    return 0.92 + (1 - distance) * 0.08;
  });

  return (
    <motion.div
      style={{
        x: pageX,
        scale: pageScale,
        opacity: pageOpacity,
        pointerEvents: i === activeIndex ? 'auto' : 'none',
        zIndex: i === activeIndex ? 20 : 10
      }}
      className="absolute inset-0 w-full h-full overflow-y-auto overflow-x-hidden hide-scrollbar"
    >
      {children}
    </motion.div>
  );
}

export default function SwipeNavigator() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeIndex = getIndexFromPath(location.pathname);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(375);
  const [isDragging, setIsDragging] = useState(false);
  const [, startTransition] = useTransition();

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.getBoundingClientRect().width || window.innerWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Motion value representing the gesture drag offset
  const dragX = useMotionValue(0);
  
  // Spring settings for premium snappy iOS-like transitions
  const springConfig = { stiffness: 260, damping: 30, mass: 0.9 };
  const animX = useSpring(dragX, springConfig);

  // Sync route changes to the scroll animation
  useEffect(() => {
    if (activeIndex !== -1 && !isDragging) {
      dragX.set(-activeIndex * containerWidth);
    }
  }, [activeIndex, containerWidth, isDragging]);

  // Touch gesture state variables
  const touchStart = useRef({ x: 0, y: 0 });
  const touchDirection = useRef<'none' | 'vertical' | 'horizontal'>('none');
  const currentOffset = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeIndex === -1) return;
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    touchDirection.current = 'none';
    currentOffset.current = -activeIndex * containerWidth;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (activeIndex === -1 || touchDirection.current === 'vertical') return;

    const touch = e.touches[0];
    const diffX = touch.clientX - touchStart.current.x;
    const diffY = touch.clientY - touchStart.current.y;

    // Detect scroll intent
    if (touchDirection.current === 'none') {
      if (Math.abs(diffY) > 6 && Math.abs(diffY) > Math.abs(diffX)) {
        touchDirection.current = 'vertical';
        return;
      }
      if (Math.abs(diffX) > 6 && Math.abs(diffX) > Math.abs(diffY)) {
        touchDirection.current = 'horizontal';
        setIsDragging(true);
      }
    }

    if (touchDirection.current === 'horizontal') {
      if (e.cancelable) e.preventDefault();
      
      // Rubber-banding calculations at start/end
      let targetX = currentOffset.current + diffX;
      const minX = -(swipePaths.length - 1) * containerWidth;
      const maxX = 0;

      if (targetX > maxX) {
        // Dragging right beyond Home
        targetX = maxX + diffX * 0.3;
      } else if (targetX < minX) {
        // Dragging left beyond Profile
        const overscroll = targetX - minX;
        targetX = minX + overscroll * 0.3;
      }

      dragX.set(targetX);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (activeIndex === -1 || touchDirection.current !== 'horizontal') {
      touchDirection.current = 'none';
      return;
    }

    setIsDragging(false);
    touchDirection.current = 'none';

    const endX = dragX.get();
    const relativeDrag = (endX - currentOffset.current) / containerWidth;

    let targetIndex = activeIndex;
    
    // Check gesture thresholds
    if (relativeDrag < -0.25 && activeIndex < swipePaths.length - 1) {
      targetIndex = activeIndex + 1;
    } else if (relativeDrag > 0.25 && activeIndex > 0) {
      targetIndex = activeIndex - 1;
    }

    // Set final snap coordinate
    dragX.set(-targetIndex * containerWidth);

    // Sync route with react-router transition
    if (targetIndex !== activeIndex) {
      startTransition(() => {
        navigate(swipePaths[targetIndex]);
      });
    }
  };

  // Render normal layout if sub-route
  if (activeIndex === -1) {
    return <Outlet />;
  }

  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[calc(100vh-64px)] overflow-hidden z-10"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 flex h-full w-full">
        {swipePaths.map((path, i) => {
          const isPageVisible = Math.abs(i - activeIndex) <= 1 || isDragging;
          
          if (!isPageVisible) {
            return (
              <div 
                key={path} 
                style={{ display: 'none' }} 
                className="w-full h-full absolute"
              />
            );
          }

          return (
            <SwipePageWrapper
              key={path}
              i={i}
              animX={animX}
              containerWidth={containerWidth}
              activeIndex={activeIndex}
              prefersReduced={prefersReduced}
            >
              <Suspense fallback={<PageLoader />}>
                {i === 0 && <HomePage />}
                {i === 1 && <FeedPage />}
                {i === 2 && <PremiumAlumniFeedPage />}
                {i === 3 && <ChatListPage />}
                {i === 4 && <ProfilePage />}
              </Suspense>
            </SwipePageWrapper>
          );
        })}
      </div>

      {/* Synchronized Bottom tab bar */}
      <BottomTabBar isGlobal={true} />
    </div>
  );
}
