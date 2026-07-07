import React, { memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Plus, FileText, Users, MessageCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';

type TabId = 'home' | 'create' | 'posts' | 'network' | 'chat' | 'profile';

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
    { id: 'create', label: 'Post', icon: Plus, path: '/alumni/post/create' },
    { id: 'posts', label: 'My Posts', icon: FileText, path: '/alumni/posts' },
    { id: 'network', label: 'Network', icon: Users, path: '/alumni/network' },
    { id: 'chat', label: 'Chat', icon: MessageCircle, path: '/alumni/chat' },
    { id: 'profile', label: 'Profile', icon: User, path: '/alumni/dashboard' },
  ];

  const getActiveTab = (): TabId | null => {
    const path = location.pathname;
    if (path.startsWith('/alumni/home')) return 'home';
    if (path.startsWith('/alumni/post/create')) return 'create';
    if (path.startsWith('/alumni/posts')) return 'posts';
    if (path.startsWith('/alumni/network')) return 'network';
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
