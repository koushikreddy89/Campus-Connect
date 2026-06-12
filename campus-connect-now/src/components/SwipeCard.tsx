import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { User } from '@/types';
import { X, MapPin, Send } from 'lucide-react';
import { memo } from 'react';

interface SwipeCardProps {
  user: User;
  onLike: () => void;
  onDislike: () => void;
  isTop: boolean;
}

export const SwipeCard = memo(({ user, onLike, onDislike, isTop }: SwipeCardProps) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) onLike();
    else if (info.offset.x < -100) onDislike();
  };

  if (!isTop) {
    return (
      <div className="absolute inset-0 rounded-3xl overflow-hidden scale-[0.93] opacity-40">
        <img src={user?.photos?.[0]} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/60" />
      </div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate, scale }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
      exit={{ x: 300, opacity: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl">
        <img src={user?.photos?.[0]} alt={user?.anonymousName ?? ''} className="w-full h-full object-cover" />
        
        {/* Premium gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

        {/* Connect indicator */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-8 left-6 border-[3px] border-emerald-400 text-emerald-400 rounded-2xl px-5 py-2 font-display font-bold text-xl -rotate-12 backdrop-blur-sm bg-emerald-400/10"
        >
          CONNECT ✨
        </motion.div>
        
        {/* Pass indicator */}
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute top-8 right-6 border-[3px] border-accent text-accent rounded-2xl px-5 py-2 font-display font-bold text-xl rotate-12 backdrop-blur-sm bg-accent/10"
        >
          PASS
        </motion.div>

        {/* Online indicator */}
        {user?.isOnline && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-foreground/90 font-medium">Online</span>
          </div>
        )}

        {/* User info - premium layout */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end gap-2 mb-1">
            <h3 className="font-display text-2xl font-bold text-foreground">
              {user?.anonymousName || user?.name || 'Anonymous'}
            </h3>
            <span className="text-lg text-foreground/70 font-medium mb-0.5">{user?.age ?? '?'}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-foreground/60 text-sm">
            <MapPin className="h-3.5 w-3.5" />
            <span>{user?.distance ?? '?'} mi</span>
            <span className="text-foreground/30">·</span>
            <span>{user?.college ?? 'Unknown'}</span>
          </div>
          
          {user?.course && (
            <p className="text-xs text-primary/80 mt-1.5 font-medium">{user.course}{user.year ? ` · ${user.year}` : ''}</p>
          )}
          
          {user?.bio && (
            <p className="text-sm text-foreground/70 mt-2 line-clamp-2 leading-relaxed">{user.bio}</p>
          )}
          
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(user?.interests ?? []).slice(0, 4).map(i => (
              <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 text-foreground/80 backdrop-blur-sm border border-white/[0.06]">
                {i}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

SwipeCard.displayName = 'SwipeCard';

interface SwipeButtonsProps {
  onDislike: () => void;
  onLike: () => void;
}

export const SwipeButtons = memo(({ onDislike, onLike }: SwipeButtonsProps) => (
  <div className="flex items-center justify-center gap-5 mt-5">
    <motion.button
      whileTap={{ scale: 0.8 }}
      whileHover={{ scale: 1.08 }}
      onClick={onDislike}
      className="h-[60px] w-[60px] rounded-full glass flex items-center justify-center border-accent/20"
    >
      <X className="h-6 w-6 text-accent" />
    </motion.button>
    <motion.button
      whileTap={{ scale: 0.8 }}
      whileHover={{ scale: 1.08 }}
      onClick={onLike}
      className="h-[72px] w-[72px] rounded-full gradient-primary flex items-center justify-center glow-primary"
    >
      <Send className="h-7 w-7 text-primary-foreground" />
    </motion.button>
  </div>
));

SwipeButtons.displayName = 'SwipeButtons';
