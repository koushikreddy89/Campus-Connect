import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, User, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useMatchStore } from '@/store/matchStore';
import { memo, useMemo } from 'react';

const tabs = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/chat', icon: MessageCircle, label: 'Chat' },
  { path: '/notifications', icon: Bell, label: 'Notifications' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export const BottomTabBar = memo(({ isGlobal }: { isGlobal?: boolean }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const role = useAuthStore(s => s.role);
  const matches = useMatchStore(s => s.matches);

  const getTabPath = (basePath: string) => {
    if (basePath === '/home' && role === 'alumni') return '/alumni/home';
    if (basePath === '/profile' && role === 'alumni') return '/alumni/dashboard';
    return basePath;
  };

  // Detect student swipe routing paths
  const isSwipeRoute = ['/student/dashboard', '/home', '/feed', '/alumni', '/chat', '/profile', '/settings'].some(path => 
    location.pathname.startsWith(path)
  );

  // Hide local duplicates on horizontal swipe routing paths
  if (isSwipeRoute && !isGlobal && role !== 'alumni') {
    return null;
  }

  const totalUnread = useMemo(() => {
    return matches.reduce((sum, m) => sum + (m.unreadCount || 0), 0);
  }, [matches]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="glass-strong border-t-0 border-x-0 rounded-none bg-zinc-950/60 backdrop-blur-xl border-t border-white/[0.08]" style={{ borderBottom: 'none' }}>
        <nav className="relative flex items-center justify-around h-[64px] max-w-lg mx-auto px-2">
          {tabs.map(({ path, icon: Icon, label }) => {
            const mappedPath = getTabPath(path);
            const isActive = location.pathname.startsWith(path) || 
              location.pathname.startsWith(mappedPath) ||
              (path === '/profile' && location.pathname.startsWith('/settings')) ||
              (path === '/profile' && location.pathname.startsWith('/alumni/dashboard'));
            
            return (
              <motion.button
                key={path}
                onClick={() => navigate(mappedPath)}
                whileTap={{ scale: 0.92 }}
                className="relative flex flex-col items-center justify-center gap-1 px-4 py-2"
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`h-[22px] w-[22px] transition-all duration-200 ${
                      isActive 
                        ? 'text-violet-400 scale-110 drop-shadow-[0_0_8px_rgba(139,92,246,0.45)]' 
                        : 'text-zinc-500 hover:text-zinc-300'
                     }`}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  {label === 'Chat' && totalUnread > 0 && (
                    <motion.span 
                      key={totalUnread}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 600, damping: 14 }}
                      className="absolute -top-1.5 -right-2 h-4 min-w-[16px] rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-1 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    >
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </motion.span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold transition-all duration-200 ${isActive ? 'text-violet-400' : 'text-zinc-500/70'}`}>
                  {label}
                </span>

                {/* Sliding spring active indicator line */}
                {isActive && (
                  <motion.div
                    layoutId="tabActiveIndicator"
                    className="absolute bottom-0 h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full w-8 shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>
      </div>
    </div>
  );
});

BottomTabBar.displayName = 'BottomTabBar';
