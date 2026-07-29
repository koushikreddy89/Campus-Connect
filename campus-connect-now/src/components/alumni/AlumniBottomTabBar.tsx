import React, { memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Sparkles, MessageSquare, MessageCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';

type TabId = 'home' | 'alumni-feed' | 'student-feed' | 'chat' | 'profile';

interface NavTab {
  id: TabId;
  label: string;
  icon: any;
  path: string;
  disabled?: boolean;
}

const AlumniBottomTabBar: React.FC = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const tabs: NavTab[] = [
    { id: 'home', label: 'Home', icon: Home, path: '/alumni/home' },
    { id: 'alumni-feed', label: 'Alumni Feed', icon: Sparkles, path: '/alumni/feed/alumni' },
    { id: 'student-feed', label: 'Student Feed', icon: MessageSquare, path: '/alumni/feed/students' },
    { id: 'chat', label: 'Chat', icon: MessageCircle, path: '/alumni/chat' },
    { id: 'profile', label: 'Profile', icon: User, path: '/alumni/profile' },
  ];

  const getActiveTab = (): TabId | null => {
    const path = location.pathname;
    if (path.startsWith('/alumni/home')) return 'home';
    if (path.startsWith('/alumni/feed/alumni')) return 'alumni-feed';
    if (path.startsWith('/alumni/feed/students')) return 'student-feed';
    if (path.startsWith('/alumni/chat')) return 'chat';
    if (path.startsWith('/alumni/profile') || path.startsWith('/alumni/dashboard')) return 'profile';
    return null;
  };

  const activeTab = getActiveTab();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="glass-strong border-t-0 border-x-0 rounded-none" style={{ borderBottom: 'none' }}>
        <nav className="flex items-center justify-around h-[64px] max-w-lg mx-auto px-2">
          {tabs.map(({ id, label, icon: Icon, path, disabled }) => {
            const isActive = activeTab === id;
            return (
              <motion.button
                key={id}
                onClick={() => !disabled && navigate(path)}
                disabled={disabled}
                whileTap={disabled ? {} : { scale: 0.92 }}
                className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`h-[22px] w-[22px] transition-all duration-200 ${
                      isActive 
                        ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(109,95,245,0.45)]' 
                        : 'text-muted-foreground hover:text-white'
                    }`}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </div>
                <span className={`text-[10px] font-semibold transition-all duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`}>
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

AlumniBottomTabBar.displayName = 'AlumniBottomTabBar';
export default AlumniBottomTabBar;
