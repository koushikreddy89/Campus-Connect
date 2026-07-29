import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader } from '@/components/Loader';
import { X, Heart, ChevronLeft, Sparkles } from 'lucide-react';
import AlumniBottomTabBar from '@/components/alumni/AlumniBottomTabBar';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { alumniProfileService } from '@/services/alumniService';
import { matchApi } from '@/services/api';

interface AlumniCard {
  id: string;
  name: string;
  batch: number;
  company: string;
  role: string;
  bio: string;
  profileImage?: string;
  major?: string;
}

const AlumniNetworkPage: React.FC = () => {
  const navigate = useNavigate();
  const uid = useAuthStore(s => s.uid);
  const college = useAuthStore(s => s.college || 'SR University');
  const [isLoading, setIsLoading] = useState(true);
  const [cards, setCards] = useState<AlumniCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeHistory, setSwipeHistory] = useState<{ id: string; action: 'like' | 'pass' }[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Framer Motion gesture tracking values
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);

  useEffect(() => {
    const loadAlumni = async () => {
      try {
        setIsLoading(true);
        const response = await alumniProfileService.getAllProfiles(college);
        const profiles = (response.data || []).map((p: any) => ({
          id: p.userId || p.id || p._id,
          name: p.name || p.fullName || 'Alumni User',
          batch: p.batch || parseInt(p.batchYear) || 2024,
          company: p.company || 'Tech Company',
          role: p.role || p.designation || 'Software Engineer',
          bio: p.story || p.careerJourney || 'Hello, I am a proud alumnus!',
          profileImage: p.profileImageUrl || p.profileImage || '',
          major: p.department || '',
        }));

        // Filter out the current user's profile
        const activeUserId = useAuthStore.getState().uid;
        const filtered = profiles.filter((p: any) => p.id !== activeUserId);

        setCards(filtered);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading alumni:', error);
        setIsLoading(false);
      }
    };

    loadAlumni();
  }, [uid, college]);

  const handleSwipe = async (action: 'like' | 'pass') => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    try {
      setSwipeHistory(prev => [...prev, { id: currentCard.id, action }]);

      if (action === 'like') {
        setSuccessMessage(`Connection request sent to ${currentCard.name}!`);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);
        // Call backend API to create friend request and trigger notification
        await matchApi.sendConnectionRequest(currentCard.id);
      } else {
        // Skip/pass request
        await matchApi.passUser(currentCard.id);
      }

      x.set(0); // Reset drag position
      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error swiping:', error);
    }
  };

  const handleUndo = () => {
    if (swipeHistory.length > 0) {
      const lastSwipe = swipeHistory[swipeHistory.length - 1];
      setSwipeHistory(prev => prev.slice(0, -1));
      if (currentIndex > 0) {
        x.set(0);
        setCurrentIndex(prev => prev - 1);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20 text-foreground">
        <div className="text-center px-4">
          <h2 className="text-xl font-bold mb-2">No alumni available</h2>
          <p className="text-xs text-muted-foreground mb-6">
            Check back later or invite more alumni to the network
          </p>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground font-sans page-transition">
      {/* Header */}
      <div className="bg-background/90 border-b border-white/[0.06] sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => navigate('/alumni/home')}
              className="p-1.5 hover:bg-secondary/50 rounded-xl transition-colors border border-white/[0.05]"
              title="Go back"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-bold">Alumni Network</h1>
          </div>
          <span className="text-xs text-muted-foreground font-semibold">
            {Math.min(currentIndex + 1, cards.length)} of {cards.length}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="bg-white/[0.04] h-1 w-full overflow-hidden">
          <div
            className="gradient-primary h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold text-center">
            {successMessage}
          </div>
        )}

        {/* Swipe Card container */}
        <div className="flex flex-col items-center gap-6 overflow-hidden py-4">
          {currentIndex < cards.length && currentCard ? (
            <motion.div
              key={currentCard.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              style={{ x, rotate, opacity }}
              onDragEnd={(event, info) => {
                if (info.offset.x > 140) {
                  handleSwipe('like');
                } else if (info.offset.x < -140) {
                  handleSwipe('pass');
                }
              }}
              whileDrag={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="w-full max-w-sm cursor-grab active:cursor-grabbing select-none"
            >
              <Card className="w-full overflow-hidden glass-card border border-white/[0.06] shadow-2xl flex flex-col justify-between">
                {/* Profile Avatar Block */}
                <div className="h-28 bg-gradient-to-r from-purple-600/40 via-primary/30 to-accent/20 flex items-center justify-center relative flex-shrink-0">
                  <span className="absolute top-3 right-3 text-[9px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5 animate-pulse" /> Verified Alumni
                  </span>
                </div>

                {/* Profile Info */}
                <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3 -mt-10 relative z-10">
                    <div className="h-16 w-16 rounded-2xl bg-card border-2 border-border/80 flex items-center justify-center text-3xl shadow-lg overflow-hidden">
                      {currentCard.profileImage ? (
                        <img src={currentCard.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        '👤'
                      )}
                    </div>
                    <div className="pt-10 flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-foreground truncate">{currentCard.name}</h2>
                      <p className="text-primary font-semibold text-xs mt-0.5 truncate">
                        {currentCard.company} · {currentCard.role}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 py-3 border-y border-white/[0.04] text-xs">
                    <div>
                      <span className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Batch:</span>{' '}
                      <span className="text-foreground font-medium">Class of {currentCard.batch}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Major:</span>{' '}
                      <span className="text-foreground font-medium">{currentCard.major || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1">About</p>
                    <p className="text-xs text-foreground/80 leading-relaxed bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.03] italic">
                      "{currentCard.bio}"
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-2">
                    <Button
                      onClick={() => handleSwipe('pass')}
                      className="flex-1 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold text-xs h-10 gap-1.5"
                    >
                      <X className="w-4 h-4 text-red-500" />
                      Pass
                    </Button>
                    <Button
                      onClick={() => handleSwipe('like')}
                      className="flex-1 rounded-xl gradient-primary text-primary-foreground font-semibold text-xs h-10 gap-1.5 glow-primary"
                    >
                      <Heart className="w-4 h-4 fill-current text-white animate-pulse" />
                      Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="glass-card p-6 text-center max-w-sm mt-8 border border-white/[0.06]">
              <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 glow-primary">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-2">No more profiles</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You've explored all available alumni profiles in your network college stack. Check back later!
              </p>
            </div>
          )}

          {/* Bottom Controls */}
          {swipeHistory.length > 0 && currentIndex < cards.length && (
            <div className="flex gap-2 justify-center">
              <Button
                onClick={handleUndo}
                variant="outline"
                className="rounded-xl h-8 text-xs font-semibold px-3 border-border hover:bg-secondary"
              >
                Undo Last Swipe
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <AlumniBottomTabBar />
    </div>
  );
};

export default AlumniNetworkPage;
