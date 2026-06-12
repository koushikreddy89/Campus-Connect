import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Match } from '@/types';

interface MatchModalProps {
  match: Match | null;
  onClose: () => void;
  onChat: (matchId: string) => void;
}

export const MatchModal = ({ match, onClose, onChat }: MatchModalProps) => (
  <AnimatePresence>
    {match && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="glass-strong rounded-3xl p-8 text-center max-w-sm w-full"
          onClick={e => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mx-auto mb-4 h-20 w-20 rounded-full gradient-primary flex items-center justify-center"
          >
            <Heart className="h-10 w-10 text-primary-foreground" fill="currentColor" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-gradient mb-2">It's a Match!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            You and {match.user.anonymousName || 'someone special'} liked each other
          </p>
          <img
            src={match.user.photos[0]}
            alt="Match"
            className="h-24 w-24 rounded-full mx-auto mb-6 border-2 border-primary/50 blur-sm"
          />
          <div className="flex flex-col gap-3">
            <Button onClick={() => onChat(match.id)} className="gradient-primary rounded-2xl h-12 font-semibold">
              Send a Message
            </Button>
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
              Keep Swiping
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
