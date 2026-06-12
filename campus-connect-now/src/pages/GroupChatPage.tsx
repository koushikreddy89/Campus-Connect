import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupChatStore } from '@/store/groupChatStore';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { EmptyState } from '@/components/EmptyState';

export default function GroupChatPage({ embeddedGroupId }: { embeddedGroupId?: string } = {}) {
  const { groupId: paramGroupId } = useParams<{ groupId: string }>();
  const groupId = embeddedGroupId || paramGroupId;
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);

  const group = useGroupChatStore(s => s.groups.find(g => g.id === groupId));
  const messages = useGroupChatStore(s => s.groupMessages[groupId!] || []);
  const currentUserEmail = useGroupChatStore(s => s.currentUserEmail);
  const sendGroupMessage = useGroupChatStore(s => s.sendGroupMessage);
  const fetchGroupMessages = useGroupChatStore(s => s.fetchGroupMessages);

  useEffect(() => {
    if (groupId) {
      fetchGroupMessages(groupId);
      const interval = setInterval(() => {
        fetchGroupMessages(groupId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [groupId, fetchGroupMessages]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <EmptyState title="Group not found" description="This circle doesn't exist." />
      </div>
    );
  }

  const handleSend = () => {
    if (!text.trim()) return;
    sendGroupMessage(groupId!, text.trim());
    setText('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="glass-strong px-4 py-3 flex items-center gap-3 z-10">
        {!embeddedGroupId && (
          <button onClick={() => navigate('/chat')} className="p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
        )}
        <img src={group.avatar} alt="" className="h-9 w-9 rounded-full" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{group.name}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> {group.members.length} members
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Start the conversation! 🎉</p>
          </div>
        )}
        {messages.map(msg => {
          const isOwn = msg.senderId === currentUserEmail;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
            >
              <div className="max-w-[75%]">
                {!isOwn && (
                  <p className="text-[10px] text-primary font-semibold mb-0.5 ml-1">{msg.senderName}</p>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 ${
                    isOwn
                      ? 'gradient-primary text-primary-foreground rounded-br-sm'
                      : 'glass text-foreground rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
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
