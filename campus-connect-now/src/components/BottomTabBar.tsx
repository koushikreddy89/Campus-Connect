import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Newspaper, MessageCircle, User, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { memo, useMemo } from 'react';

const defaultTabs = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/feed', icon: Newspaper, label: 'Feed' },
  { path: '/alumni', icon: Trophy, label: 'Alumni' },
  { path: '/chat', icon: MessageCircle, label: 'Chat' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const alumniTabs = [
  { path: '/alumni/dashboard', icon: Trophy, label: 'My Alumni' },
  { path: '/alumni/explorer', icon: Home, label: 'Alumni' },
  { path: '/chat', icon: MessageCircle, label: 'Chat' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export const BottomTabBar = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const role = useAuthStore(s => s.role);
  const messages = useChatStore(s => s.messages);
  const currentUserEmail = useChatStore(s => s.currentUserEmail);

  const tabs = role === 'alumni' ? alumniTabs : defaultTabs;

  const totalUnread = useMemo(() => {
    let count = 0;
    Object.values(messages).forEach(msgs => {
      msgs.forEach(m => { if (!m.read && m.senderId !== currentUserEmail) count++; });
    });
    return count;
  }, [messages, currentUserEmail]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="glass-strong border-t-0 border-x-0 rounded-none" style={{ borderBottom: 'none' }}>
        <nav className="flex items-center justify-around h-[64px] max-w-lg mx-auto px-2">
          {tabs.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(path);
            return (
              <motion.button
                key={path}
                onClick={() => navigate(path)}
                whileTap={{ scale: 0.9 }}
                className="relative flex flex-col items-center justify-center gap-1 px-4 py-2"
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute top-0 left-1/2 h-1 w-6 rounded-full gradient-primary"
                    style={{ transform: 'translateX(-50%)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`h-[22px] w-[22px] transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  {label === 'Chat' && totalUnread > 0 && (
                    <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] rounded-full bg-accent text-[9px] font-bold text-accent-foreground flex items-center justify-center px-1 glow-accent">
                      {totalUnread}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`}>
                  {label}
                </span>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </div>
  );
});

BottomTabBar.displayName = 'BottomTabBar';
