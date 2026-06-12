import { Message, ReactionEmoji, Reaction } from '@/types';
import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';
import { MessageReactions } from '@/components/MessageReactions';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  onReact?: (messageId: string, emoji: ReactionEmoji) => void;
}

export const ChatBubble = ({ message, isOwn, onReact }: ChatBubbleProps) => {
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleReact = (emoji: ReactionEmoji) => {
    onReact?.(message.id, emoji);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
    >
      <div className="max-w-[75%]">
        <div
          className={`rounded-2xl px-3.5 py-2.5 ${
            isOwn
              ? 'gradient-primary text-primary-foreground rounded-br-sm'
              : 'glass text-foreground rounded-bl-sm'
          }`}
        >
          <p className="text-sm leading-relaxed">{message.text}</p>
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
            <span className={`text-[10px] ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
              {time}
            </span>
            {isOwn && (
              <span className="text-primary-foreground/60">
                {message.status === 'seen' ? (
                  <CheckCheck className="h-3 w-3 text-blue-300" />
                ) : message.status === 'delivered' ? (
                  <CheckCheck className="h-3 w-3" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
        </div>
        <MessageReactions
          reactions={message.reactions}
          onReact={handleReact}
          isOwn={isOwn}
        />
      </div>
    </motion.div>
  );
};

export const TypingIndicator = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-2">
    <div className="glass rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-muted-foreground"
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
        />
      ))}
    </div>
  </motion.div>
);
