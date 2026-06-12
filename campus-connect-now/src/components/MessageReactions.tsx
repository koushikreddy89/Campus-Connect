import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ReactionEmoji, Reaction } from '@/types';
import { getCurrentUserEmail } from '@/utils/userUtils';

const REACTION_EMOJIS: ReactionEmoji[] = ['❤️', '🔥', '😂', '👀', '👍'];

interface MessageReactionsProps {
  reactions?: Reaction[];
  onReact: (emoji: ReactionEmoji) => void;
  isOwn: boolean;
  currentUserEmail?: string;
}

export const MessageReactions = ({ reactions = [], onReact, isOwn, currentUserEmail = '' }: MessageReactionsProps) => {
  const [showPicker, setShowPicker] = useState(false);

  const grouped = reactions.reduce<Record<ReactionEmoji, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<ReactionEmoji, number>);

  const myReactions = new Set(reactions.filter(r => r.userId === currentUserEmail).map(r => r.emoji));

  return (
    <div className="relative">
      {Object.keys(grouped).length > 0 && (
        <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {Object.entries(grouped).map(([emoji, count]) => (
            <motion.button
              key={emoji}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.8 }}
              onClick={() => onReact(emoji as ReactionEmoji)}
              className={`text-[11px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 transition-colors ${
                myReactions.has(emoji as ReactionEmoji) ? 'bg-primary/20 border border-primary/40' : 'bg-secondary/80 border border-border/50'
              }`}
            >
              <span>{emoji}</span>
              {count > 1 && <span className="text-[9px] text-muted-foreground">{count}</span>}
            </motion.button>
          ))}
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => setShowPicker(!showPicker)}
        className={`text-[10px] mt-0.5 px-1.5 py-0.5 rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/50 transition-all ${isOwn ? 'ml-auto block' : ''}`}
      >
        +😊
      </motion.button>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 4 }}
            className={`absolute bottom-full mb-1 flex gap-1 glass-strong rounded-full px-2 py-1.5 z-50 ${isOwn ? 'right-0' : 'left-0'}`}
          >
            {REACTION_EMOJIS.map(emoji => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.8 }}
                onClick={() => { onReact(emoji); setShowPicker(false); }}
                className="text-lg hover:bg-secondary/50 rounded-full p-0.5 transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface PostReactionsProps {
  reactions?: Record<ReactionEmoji, string[]>;
  onReact: (emoji: ReactionEmoji) => void;
}

export const PostReactions = ({ reactions = {} as Record<ReactionEmoji, string[]>, onReact }: PostReactionsProps) => {
  const [showPicker, setShowPicker] = useState(false);

  const currentUserEmail = getCurrentUserEmail() || '';
  
  const grouped = Object.entries(reactions).reduce<Record<ReactionEmoji, number>>((acc, [emoji, users]) => {
    acc[emoji as ReactionEmoji] = (users || []).length;
    return acc;
  }, {} as Record<ReactionEmoji, number>);

  const myReactions = new Set(
    Object.entries(reactions)
      .filter(([_, users]) => (users || []).includes(currentUserEmail))
      .map(([emoji]) => emoji as ReactionEmoji)
  );

  const hasAny = Object.values(reactions).some(arr => (arr || []).length > 0);

  return (
    <div className="relative inline-flex items-center gap-1">
      {hasAny && (
        <div className="flex gap-1">
          {REACTION_EMOJIS.filter(e => grouped[e]).map(emoji => (
            <motion.button
              key={emoji}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.8 }}
              onClick={() => onReact(emoji)}
              className={`text-[11px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                myReactions.has(emoji) ? 'bg-primary/20 border border-primary/40' : 'bg-secondary/80 border border-border/50'
              }`}
            >
              <span>{emoji}</span>
              <span className="text-[9px] text-muted-foreground">{grouped[emoji]}</span>
            </motion.button>
          ))}
        </div>
      )}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => setShowPicker(!showPicker)}
        className="text-xs px-2 py-1 rounded-full text-muted-foreground hover:bg-secondary/50 transition-colors"
      >
        😊
      </motion.button>
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 4 }}
            className="absolute bottom-full mb-1 left-0 flex gap-1 glass-strong rounded-full px-2 py-1.5 z-50"
          >
            {REACTION_EMOJIS.map(emoji => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.8 }}
                onClick={() => { onReact(emoji); setShowPicker(false); }}
                className="text-lg hover:bg-secondary/50 rounded-full p-0.5 transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
