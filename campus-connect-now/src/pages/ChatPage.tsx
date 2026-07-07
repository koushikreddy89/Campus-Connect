import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { useMatchStore } from '@/store/matchStore';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, Send, Eye, Phone, Video, Info, MoreVertical, Paperclip, Smile, Copy, Reply, Trash2, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/EmptyState';
import { ReactionEmoji } from '@/types';
import { toast } from 'sonner';

const EMPTY_MESSAGES: any[] = [];
const REACTION_OPTIONS: ReactionEmoji[] = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatPage({ 
  embeddedMatchId,
  toggleSidebar 
}: { 
  embeddedMatchId?: string;
  toggleSidebar?: () => void;
} = {}) {
  const { matchId: paramMatchId } = useParams<{ matchId: string }>();
  const matchId = embeddedMatchId || paramMatchId;
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);

  const messagesMap = useChatStore(s => s.messages);
  const messages = messagesMap[matchId!] ?? EMPTY_MESSAGES;
  const typingMatchId = useChatStore(s => s.typingMatchId);
  const currentUserId = useAuthStore(s => s.uid);
  const sendMessage = useChatStore(s => s.sendMessage);
  const reactToMessage = useChatStore(s => s.reactToMessage);

  const match = useMatchStore(s => s.matches.find(m => m.id === matchId));
  const revealIdentity = useMatchStore(s => s.revealIdentity);
  const fetchMessages = useChatStore(s => s.fetchMessages);

  // Hover action panel overlay
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // Emoji picker overlay
  const [showEmojiPickerForMsg, setShowEmojiPickerForMsg] = useState<string | null>(null);

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
      <div className="min-h-screen bg-[#08080C] flex items-center justify-center">
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
    setShowEmojiPickerForMsg(null);
  };

  const handleCopyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success('Text copied to clipboard! 📋');
  };

  const isOnline = match.user?.isOnline ?? false;
  const matchName = match.isRevealed ? match.user?.name : match.user?.anonymousName || 'Anonymous';

  // Group messages consecutively by sender within 3 minutes
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((msg, idx) => {
      const msgTime = new Date(msg.timestamp).getTime();
      const isSameSender = currentGroup && currentGroup.senderId === msg.senderId;
      const isWithinTime = currentGroup && (msgTime - new Date(currentGroup.messages[currentGroup.messages.length - 1].timestamp).getTime() < 180000); // 3 minutes

      if (isSameSender && isWithinTime) {
        currentGroup.messages.push(msg);
      } else {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        const isOwn = msg.senderId === currentUserId;
        currentGroup = {
          senderId: msg.senderId,
          senderName: isOwn ? 'You' : matchName,
          avatar: isOwn ? '' : match.user?.photos?.[0],
          isOwn,
          messages: [msg]
        };
      }
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }
    return groups;
  }, [messages, currentUserId, matchName, match]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#08080C] text-zinc-300">
      
      {/* Header */}
      <div className="bg-[#0A0A0F] border-b border-zinc-900/60 z-10 shrink-0 select-none">
        <div className="max-w-[820px] mx-auto w-full px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            {!embeddedMatchId && (
              <button onClick={() => navigate('/chat')} className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="relative shrink-0">
              <img
                src={match.user?.photos?.[0]}
                alt=""
                className={`h-10 w-10 rounded-full object-cover ${!match.isRevealed ? 'blur-[3px]' : ''}`}
              />
              {isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0A0A0F] bg-green-400" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white truncate">{matchName}</h2>
              <p className="text-[10px] text-zinc-550 truncate mt-0.5">
                {typingMatchId === matchId ? 'typing...' : isOnline ? '🟢 Active now' : '⚪ Offline'}
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={() => toast.info('Voice call initiation coming soon')}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-xl transition-colors"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button 
              onClick={() => toast.info('Video call initiation coming soon')}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-xl transition-colors"
            >
              <Video className="w-4 h-4" />
            </button>
            {toggleSidebar && (
              <button 
                onClick={toggleSidebar}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-xl transition-colors"
                title="Toggle sidebar info"
              >
                <Info className="w-4 h-4" />
              </button>
            )}
            
            {!match.isRevealed && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => revealIdentity(matchId!)}
                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-650 hover:bg-violet-755 text-[10px] font-bold text-white shrink-0 shadow-md shadow-violet-950/20"
              >
                <Eye className="h-3 w-3" /> Reveal
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-[820px] mx-auto w-full px-6 py-6 space-y-4">
          {groupedMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none opacity-60 min-h-[300px]">
              <span className="text-3xl mb-2">👋</span>
              <p className="text-xs text-zinc-400 font-medium">No messages yet. Send a wave to start the chat!</p>
            </div>
          ) : (
            groupedMessages.map((group, gIdx) => (
              <div key={gIdx} className={`flex gap-3.5 ${group.isOwn ? 'justify-end' : 'justify-start'}`}>
                
                {/* Sender Avatar */}
                {!group.isOwn && (
                  <div className="w-8 shrink-0 flex items-end">
                    <img
                      src={group.avatar}
                      alt=""
                      className={`h-8 w-8 rounded-full object-cover border border-zinc-900 ${!match.isRevealed ? 'blur-[2px]' : ''}`}
                    />
                  </div>
                )}

                {/* Message Group Bubbles list */}
                <div className="flex flex-col space-y-1 max-w-[70%]">
                  {group.messages.map((msg: any, mIdx: number) => {
                    const isHovered = hoveredMessageId === msg.id || hoveredMessageId === msg._id;
                    const isEmojiOpen = showEmojiPickerForMsg === msg.id || showEmojiPickerForMsg === msg._id;
                    const keyId = msg.id || msg._id;

                    return (
                      <div 
                        key={keyId}
                        className="relative group flex items-center gap-2"
                        onMouseEnter={() => setHoveredMessageId(keyId)}
                        onMouseLeave={() => {
                          setHoveredMessageId(null);
                          setShowEmojiPickerForMsg(null);
                        }}
                      >
                        {/* Outgoing hover menu */}
                        {group.isOwn && isHovered && (
                          <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-850 rounded-xl shadow-lg shrink-0 scale-90 origin-right transition-all">
                            <button 
                              onClick={() => setShowEmojiPickerForMsg(isEmojiOpen ? null : keyId)}
                              className="p-1 text-zinc-450 hover:text-white"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleCopyText(msg.text)}
                              className="p-1 text-zinc-450 hover:text-white"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Msg Bubble */}
                        <div className="relative">
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm transition-all ${
                              group.isOwn
                                ? 'bg-violet-650 text-white rounded-br-sm'
                                : 'bg-[#121217] border border-zinc-900/60 text-zinc-200 rounded-bl-sm'
                            }`}
                          >
                            <p className="break-words select-text">{msg.text}</p>
                            
                            {/* Time & Read status */}
                            <div className="flex items-center justify-end gap-1 mt-1 opacity-60 text-[9px] select-none font-mono">
                              <span>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {group.isOwn && (
                                <CheckCheck className="w-3 h-3 text-white/80" />
                              )}
                            </div>
                          </div>

                          {/* Reaction Emojis list overlay */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="absolute -bottom-2 right-2 flex gap-0.5 bg-zinc-950 border border-zinc-850 px-1.5 py-0.5 rounded-full shadow-md text-[10px]">
                              {msg.reactions.map((r: any, rIdx: number) => (
                                <span key={rIdx} title={r.userEmail}>{r.emoji}</span>
                              ))}
                            </div>
                          )}

                          {/* Reaction Picker overlay */}
                          {isEmojiOpen && (
                            <div className="absolute -top-10 right-0 bg-zinc-950 border border-zinc-850 px-2 py-1 rounded-full flex gap-1 shadow-2xl z-50">
                              {REACTION_OPTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(keyId, emoji)}
                                  className="hover:scale-125 transition-transform"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Incoming hover menu */}
                        {!group.isOwn && isHovered && (
                          <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-850 rounded-xl shadow-lg shrink-0 scale-90 origin-left transition-all">
                            <button 
                              onClick={() => setShowEmojiPickerForMsg(isEmojiOpen ? null : keyId)}
                              className="p-1 text-zinc-450 hover:text-white"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleCopyText(msg.text)}
                              className="p-1 text-zinc-450 hover:text-white"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

              </div>
            ))
          )}
          {typingMatchId === matchId && (
            <div className="flex items-center gap-2 select-none text-[10px] text-zinc-550 font-mono pl-12">
              <span className="h-2 w-2 bg-zinc-500 rounded-full animate-bounce" />
              <span className="h-2 w-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span>typing...</span>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>
      </div>

      {/* Sticky Message composer (Input panel) */}
      <div className="bg-[#0A0A0F] border-t border-zinc-900/60 safe-bottom shrink-0 select-none">
        <div className="max-w-[820px] mx-auto w-full px-5 py-3.5">
          <div className="flex gap-2 items-center bg-[#111116] border border-zinc-850/80 rounded-2xl px-3 py-1.5">
            <button 
              onClick={() => toast.info('Attachments coming soon')}
              className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900/40"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={`Message ${matchName}...`}
              className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder:text-zinc-650 outline-none"
            />

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!text.trim()}
              className="h-8 w-8 rounded-xl bg-violet-650 hover:bg-violet-755 disabled:opacity-40 flex items-center justify-center text-white shrink-0 shadow-md shadow-violet-950/20"
            >
              <Send className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </div>
      </div>

    </div>
  );
}
