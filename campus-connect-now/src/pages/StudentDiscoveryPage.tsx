import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { ArrowLeft, UserPlus, X, Sparkles, Trophy, ShieldCheck, Heart, Hash, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { matchApi } from '@/services/api';
import { toast } from 'sonner';

export default function StudentDiscoveryPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Framer Motion Hook Controls for top card dragging & programmatic swipe
  const x = useMotionValue(0);
  const controls = useAnimation();

  // Dynamic values based on drag distance
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 0.8, 1, 0.8, 0.5]);
  const glow = useTransform(x, [-120, 0, 120], [
    "0px 0px 20px 4px rgba(239, 68, 68, 0.45)", 
    "0px 10px 20px 0px rgba(0, 0, 0, 0.3)", 
    "0px 0px 20px 4px rgba(16, 185, 129, 0.45)"
  ]);

  const connectOpacity = useTransform(x, [0, 85], [0, 1]);
  const passOpacity = useTransform(x, [-85, 0], [1, 0]);

  useEffect(() => {
    const fetchDiscovery = async () => {
      setIsLoading(true);
      try {
        const res = await matchApi.getSwipePool();
        if (res && res.success) {
          setStudents(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load discovery pool:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDiscovery();
  }, []);

  // Prefetch image of the next student to prevent image loading stutter
  useEffect(() => {
    if (currentIndex + 1 < students.length) {
      const nextStudent = students[currentIndex + 1];
      const imgUrl = nextStudent.profileImageUrl || (nextStudent.photos && nextStudent.photos[0]) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${nextStudent.userId}`;
      if (imgUrl) {
        const img = new Image();
        img.src = imgUrl;
      }
    }
  }, [currentIndex, students]);

  const handleSwipe = async (action: 'connect' | 'pass') => {
    if (currentIndex >= students.length) return;
    const currentStudent = students[currentIndex];

    // Trigger API call asynchronously
    try {
      if (action === 'connect') {
        const res = await matchApi.sendConnectionRequest(currentStudent.userId);
        if (res && res.success) {
          if (res.matched) {
            toast.success(`🎉 You and ${currentStudent.name} are now connected!`, {
              description: 'Start chatting in the Chat room!',
              duration: 5000,
            });
          } else {
            toast.success(`Connection request sent to ${currentStudent.name}!`);
          }
        }
      } else {
        await matchApi.passUser(currentStudent.userId);
      }
    } catch (e) {
      console.error('Action failed:', e);
    }

    // Move to next card
    setCurrentIndex(prev => prev + 1);
    // Reset motion value and controls back to neutral position
    x.set(0);
    controls.set({ x: 0, rotate: 0, opacity: 1 });
  };

  const executeSwipeAnimation = async (action: 'connect' | 'pass') => {
    const targetX = action === 'connect' ? 400 : -400;
    const targetRotate = action === 'connect' ? 25 : -25;
    
    // Animate top card off screen
    await controls.start({
      x: targetX,
      rotate: targetRotate,
      opacity: 0,
      transition: { duration: 0.25 }
    });

    handleSwipe(action);
  };

  const handleDragEnd = async (event: any, info: any) => {
    const swipeThreshold = 120;
    if (info.offset.x > swipeThreshold) {
      // Swiped right -> Connect
      await controls.start({
        x: 400,
        rotate: 25,
        opacity: 0,
        transition: { duration: 0.2 }
      });
      handleSwipe('connect');
    } else if (info.offset.x < -swipeThreshold) {
      // Swiped left -> Pass
      await controls.start({
        x: -400,
        rotate: -25,
        opacity: 0,
        transition: { duration: 0.2 }
      });
      handleSwipe('pass');
    } else {
      // Snap back to center
      controls.start({ 
        x: 0, 
        rotate: 0, 
        opacity: 1, 
        transition: { type: 'spring', stiffness: 300, damping: 22 } 
      });
    }
  };

  const activeStudent = currentIndex < students.length ? students[currentIndex] : null;
  const nextStudent = currentIndex + 1 < students.length ? students[currentIndex + 1] : null;

  const renderCardContent = (student: any) => {
    const avatarUrl = student.profileImageUrl || (student.photos && student.photos[0]) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.userId}`;
    return (
      <div className="flex flex-col h-full justify-between">
        {/* Banner */}
        <div className="relative h-24 w-full flex-shrink-0 bg-gradient-to-r from-purple-600/40 via-primary/30 to-accent/20">
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          {/* Verification Badge */}
          <span className="absolute top-3 right-3 text-[9px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" /> Student
          </span>
        </div>

        {/* Profile Header Block */}
        <div className="flex items-start px-4 -mt-8 relative z-10 gap-3">
          <img
            src={avatarUrl}
            alt=""
            className="h-16 w-16 rounded-2xl border-2 border-border/80 bg-card object-cover shadow-md"
          />
          <div className="flex-1 min-w-0 pt-7">
            <h2 className="text-base font-bold text-foreground truncate flex items-center gap-1.5">
              {student.name}
            </h2>
            <p className="text-[10px] text-muted-foreground font-semibold truncate">
              {student.department || 'Computer Science'} · Class of {student.batch || '2027'}
            </p>
            <p className="text-[9px] text-muted-foreground/80 mt-0.5 truncate">
              {student.college || 'SR University'}
            </p>
          </div>
        </div>

        {/* Details Body */}
        <div className="px-4 py-3 flex-1 flex flex-col justify-between gap-3 min-h-0">
          {/* Bio */}
          {student.bio && (
            <div className="min-h-0 flex-shrink">
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1">About</p>
              <p className="text-xs text-foreground/85 leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04] line-clamp-2">
                {student.bio}
              </p>
            </div>
          )}

          {/* Skills & Interests */}
          <div className="space-y-2">
            {student.skills && student.skills.length > 0 && (
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-primary" /> Skills
                </p>
                <div className="flex flex-wrap gap-1">
                  {student.skills.slice(0, 3).map((skill: string) => (
                    <span key={skill} className="text-[9px] px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-medium">
                      {skill}
                    </span>
                  ))}
                  {student.skills.length > 3 && (
                    <span className="text-[9px] text-muted-foreground font-medium self-center px-1">
                      +{student.skills.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {student.interests && student.interests.length > 0 && (
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <Heart className="h-2.5 w-2.5 text-accent" /> Interests
                </p>
                <div className="flex flex-wrap gap-1">
                  {student.interests.slice(0, 3).map((interest: string) => (
                    <span key={interest} className="text-[9px] px-2 py-0.5 rounded-lg bg-accent/10 text-accent border border-accent/20 font-medium">
                      {interest}
                    </span>
                  ))}
                  {student.interests.length > 3 && (
                    <span className="text-[9px] text-muted-foreground font-medium self-center px-1">
                      +{student.interests.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clubs & Achievements Small Grid */}
          <div className="grid grid-cols-2 gap-2 mt-0.5">
            {student.clubs && student.clubs.length > 0 && (
              <div className="bg-white/[0.01] p-2 rounded-xl border border-white/[0.04] min-w-0">
                <p className="text-[8px] text-muted-foreground uppercase font-bold mb-0.5 flex items-center gap-1">
                  <Hash className="h-2.5 w-2.5 text-primary" /> Club
                </p>
                <p className="text-[10px] font-semibold text-foreground truncate">{student.clubs[0]}</p>
              </div>
            )}
            {student.achievements && student.achievements.length > 0 && (
              <div className="bg-white/[0.01] p-2 rounded-xl border border-white/[0.04] min-w-0">
                <p className="text-[8px] text-muted-foreground uppercase font-bold mb-0.5 flex items-center gap-1">
                  <Trophy className="h-2.5 w-2.5 text-accent" /> Achievement
                </p>
                <p className="text-[10px] font-semibold text-foreground truncate">{student.achievements[0]}</p>
              </div>
            )}
          </div>

          {/* View Full Profile */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/student/${student.userId}`);
            }}
            className="w-full py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] transition-all text-xs font-bold text-primary flex items-center justify-center gap-1.5 shadow-sm mt-auto"
          >
            View Full Profile
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-10 page-transition flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl bg-secondary/80 hover:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="font-display text-xl font-bold text-foreground">Discover Students</h1>
      </div>

      <div className="flex-1 px-5 flex flex-col justify-center items-center min-h-0">
        {isLoading ? (
          <div className="text-center py-20 animate-pulse text-muted-foreground text-sm">
            Searching for students on campus...
          </div>
        ) : activeStudent ? (
          <div className="w-full max-w-sm flex-1 flex flex-col justify-between py-4 min-h-0">
            {/* Card Stack Deck */}
            <div className="relative flex-1 flex items-center justify-center min-h-0">
              
              {/* Under Card (Next Preview) */}
              {nextStudent && (
                <div
                  className="absolute inset-0 w-full h-[480px] glass-card overflow-hidden flex flex-col justify-between border border-white/[0.04] rounded-3xl pointer-events-none z-10"
                  style={{
                    transform: 'translateY(14px) scale(0.94)',
                    opacity: 0.65,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  {renderCardContent(nextStudent)}
                </div>
              )}

              {/* Current Top Card */}
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1.1}
                style={{ x, rotate, opacity, boxShadow: glow }}
                animate={controls}
                onDragEnd={handleDragEnd}
                className="w-full h-[480px] glass-card border border-white/[0.08] relative rounded-3xl cursor-grab active:cursor-grabbing z-20 overflow-hidden flex flex-col justify-between"
              >
                {/* Connect/Pass Dynamic Overlay Labels */}
                <motion.div
                  style={{ opacity: connectOpacity }}
                  className="absolute top-8 left-8 border-4 border-emerald-500 text-emerald-500 font-extrabold text-2xl uppercase tracking-wider px-4 py-2 rounded-xl rotate-[-12deg] z-50 pointer-events-none"
                >
                  Connect
                </motion.div>

                <motion.div
                  style={{ opacity: passOpacity }}
                  className="absolute top-8 right-8 border-4 border-red-500 text-red-500 font-extrabold text-2xl uppercase tracking-wider px-4 py-2 rounded-xl rotate-[12deg] z-50 pointer-events-none"
                >
                  Pass
                </motion.div>

                {renderCardContent(activeStudent)}
              </motion.div>

            </div>

            {/* Action Buttons Connect & Pass */}
            <div className="flex items-center justify-center gap-6 mt-6 flex-shrink-0">
              {/* Pass Button */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => executeSwipeAnimation('pass')}
                className="h-14 w-14 rounded-full bg-secondary/80 border border-white/[0.1] flex items-center justify-center hover:bg-secondary/100 transition-colors shadow-lg hover:border-red-500/25"
              >
                <X className="h-6 w-6 text-muted-foreground hover:text-red-500 transition-colors" />
              </motion.button>

              {/* Connect Button */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => executeSwipeAnimation('connect')}
                className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center glow-primary shadow-xl"
              >
                <UserPlus className="h-7 w-7 text-primary-foreground" />
              </motion.button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 text-center max-w-sm mt-8 border border-white/[0.06]"
          >
            <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 glow-primary">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="text-base font-bold text-foreground mb-2">No more students to show</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You've explored all registered student profiles. Check back later or get involved in campus clubs and activities!
            </p>
            <button
              onClick={() => navigate('/feed')}
              className="mt-4 text-xs font-semibold text-primary hover:underline"
            >
              Back to Feed
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
