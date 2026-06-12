import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { useMatchStore } from '@/store/matchStore';
import { ChatBubble, TypingIndicator } from '@/components/ChatBubble';
import { ArrowLeft, Send, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { EmptyState } from '@/components/EmptyState';
import { ReactionEmoji } from '@/types';

const EMPTY_MESSAGES: import('@/types').Message[] = [];

export default function ChatPage({ embeddedMatchId }: { embeddedMatchId?: string } = {}) {
  const { matchId: paramMatchId } = useParams<{ matchId: string }>();
  const matchId = embeddedMatchId || paramMatchId;
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);

  const messagesMap = useChatStore(s => s.messages);
  const messages = messagesMap[matchId!] ?? EMPTY_MESSAGES;
  const typingMatchId = useChatStore(s => s.typingMatchId);
  const currentUserEmail = useChatStore(s => s.currentUserEmail);
  const sendMessage = useChatStore(s => s.sendMessage);
  const reactToMessage = useChatStore(s => s.reactToMessage);

  const match = useMatchStore(s => s.matches.find(m => m.id === matchId));
  const revealIdentity = useMatchStore(s => s.revealIdentity);
  const fetchMessages = useChatStore(s => s.fetchMessages);

  useEffect(() => {
    if (matchId) {
      fetchMessages(matchId);
      const interval = setInterval(() => {
        fetchMessages(matchId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [matchId, fetchMessages]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingMatchId]);

  if (!match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <EmptyState title="Chat not found" description="This conversation doesn't exist." />
      </div>
    );
  }

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(matchId!, text.trim());
    setText('');
  };

  const handleReact = (messageId: string, emoji: ReactionEmoji) => {
    reactToMessage(matchId!, messageId, emoji);
  };

  const isOnline = match.user?.isOnline ?? false;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="glass-strong px-4 py-3 flex items-center gap-3 z-10">
        {!embeddedMatchId && (
          <button onClick={() => navigate('/chat')} className="p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
        )}
        <div className="relative">
          <img
            src={match.user?.photos?.[0]}
            alt=""
            className={`h-9 w-9 rounded-full ${!match.isRevealed ? 'blur-[3px]' : ''}`}
          />
          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${isOnline ? 'bg-green-400' : 'bg-muted-foreground/50'}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground">
              {match.isRevealed ? match.user?.name : match.user?.anonymousName || 'Anonymous'}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {typingMatchId === matchId ? 'typing...' : isOnline ? '🟢 Online' : '⚪ Offline'}
          </p>
        </div>
        {!match.isRevealed && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => revealIdentity(matchId!)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full gradient-primary text-xs font-semibold text-primary-foreground"
          >
            <Eye className="h-3.5 w-3.5" /> Reveal
          </motion.button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Say hello! 👋</p>
          </div>
        )}
        {messages.map(msg => (
          <ChatBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === currentUserEmail}
            onReact={handleReact}
          />
        ))}
        {typingMatchId === matchId && <TypingIndicator />}
        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div className="glass-strong px-4 py-3 safe-bottom">
        <div className="flex gap-2 items-end">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-secondary rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleSend}
            disabled={!text.trim()}
            className="h-11 w-11 rounded-full gradient-primary flex items-center justify-center disabled:opacity-40"
          >
            <Send className="h-4.5 w-4.5 text-primary-foreground" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
