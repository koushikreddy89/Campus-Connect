import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupChatStore } from '@/store/groupChatStore';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { ArrowLeft, Send, Users, Phone, Video, Info, Paperclip, Smile, Copy, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/EmptyState';
import { toast } from 'sonner';
import { BottomTabBar } from '@/components/BottomTabBar';
import { socketService } from '@/services/socketService';

export default function GroupChatPage({ 
  embeddedGroupId,
  toggleSidebar 
}: { 
  embeddedGroupId?: string;
  toggleSidebar?: () => void;
} = {}) {
  const { groupId: paramGroupId } = useParams<{ groupId: string }>();
  const groupId = embeddedGroupId || paramGroupId;
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(0);

  const group = useGroupChatStore(s => s.groups.find(g => g.id === groupId));
  const messages = useGroupChatStore(s => s.groupMessages[groupId!] || []);
  const currentUserId = useAuthStore(s => s._id);
  const sendGroupMessage = useGroupChatStore(s => s.sendGroupMessage);
  const fetchGroupMessages = useGroupChatStore(s => s.fetchGroupMessages);

  // Hover action panel overlay
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  const typingTimeoutRef = useRef<any>(null);

  const handleTextChange = (val: string) => {
    setText(val);
    const socket = socketService.getSocket();
    if (socket?.connected && groupId) {
      socket.emit('typing', { roomId: groupId, userId: currentUserId, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { roomId: groupId, userId: currentUserId, isTyping: false });
      }, 1500);
    }
  };

  // Connect socket and listen to events
  useEffect(() => {
    useChatStore.getState().connectSocket();
    return () => {
      useChatStore.getState().disconnectSocket();
    };
  }, []);

  // Join the group chat room on load
  useEffect(() => {
    if (groupId) {
      socketService.joinRoom(groupId);
      return () => {
        socketService.leaveRoom(groupId);
      };
    }
  }, [groupId]);

  // Fetch messages exactly once on mount / chat load
  useEffect(() => {
    if (groupId) {
      fetchGroupMessages(groupId);
    }
  }, [groupId, fetchGroupMessages]);

  // Smart auto-scroll logic
  useEffect(() => {
    if (messages.length > lastMessageCount.current) {
      const lastMsg = messages[messages.length - 1];
      const isOwn = lastMsg?.senderId === currentUserId;
      const container = scrollContainerRef.current;
      
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 250;
        if (isOwn || isNearBottom) {
          messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
      lastMessageCount.current = messages.length;
    }
  }, [messages, currentUserId]);

  // Jump to bottom instantly on chat load
  useEffect(() => {
    if (messages.length > 0) {
      messagesEnd.current?.scrollIntoView({ behavior: 'auto' });
      lastMessageCount.current = messages.length;
    }
  }, [groupId]);

  if (!group) {
    return (
      <div className="min-h-screen bg-[#08080C] flex items-center justify-center">
        <EmptyState title="Group not found" description="This circle doesn't exist." />
      </div>
    );
  }

  const handleSend = () => {
    if (!text.trim()) return;
    sendGroupMessage(groupId!, text.trim());
    setText('');
  };

  const handleCopyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success('Text copied to clipboard! 📋');
  };

  // Group messages consecutively by sender within 3 minutes
  const groupedMessages = useMemo(() => {
    const groupsList = [];
    let currentGroup = null;

    messages.forEach((msg, idx) => {
      const msgTime = new Date(msg.timestamp).getTime();
      const isSameSender = currentGroup && currentGroup.senderId === msg.senderId;
      const isWithinTime = currentGroup && (msgTime - new Date(currentGroup.messages[currentGroup.messages.length - 1].timestamp).getTime() < 180000); // 3 minutes

      if (isSameSender && isWithinTime) {
        currentGroup.messages.push(msg);
      } else {
        if (currentGroup) {
          groupsList.push(currentGroup);
        }
        const isOwn = msg.senderId === currentUserId;
        currentGroup = {
          senderId: msg.senderId,
          senderName: msg.senderName || 'Anonymous User',
          avatar: msg.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde', // placeholder avatar
          isOwn,
          messages: [msg]
        };
      }
    });

    if (currentGroup) {
      groupsList.push(currentGroup);
    }
    return groupsList;
  }, [messages, currentUserId]);

  return (
    <div className={`flex-1 flex flex-col h-full bg-[#08080C] text-zinc-300 relative ${!embeddedGroupId ? 'pb-[64px]' : ''}`}>
      
      {/* Header */}
      <div className="bg-[#0A0A0F] border-b border-zinc-900/60 z-10 shrink-0 select-none">
        <div className="max-w-[820px] mx-auto w-full px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            {!embeddedGroupId && (
              <button onClick={() => navigate('/chat')} className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <img src={group.avatar} alt="" className="h-10 w-10 rounded-full object-cover shrink-0 bg-zinc-900" />
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white truncate">{group.name}</h2>
              <p className="text-[10px] text-zinc-550 flex items-center gap-1 mt-0.5 font-medium">
                <Users className="h-3 w-3 text-violet-400" /> {group.members?.length || 0} active circle members
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={() => toast.info('Circle voice call coming soon')}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-xl transition-colors"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button 
              onClick={() => toast.info('Circle video call coming soon')}
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
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-[820px] mx-auto w-full px-6 py-6 space-y-4">
          {groupedMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none opacity-60 min-h-[300px]">
              <span className="text-3xl mb-2">👥</span>
              <p className="text-xs text-zinc-400 font-medium">Welcome to the circle! Introduce yourself. 👋</p>
            </div>
          ) : (
            groupedMessages.map((groupItem, gIdx) => (
              <div key={gIdx} className={`flex gap-3.5 ${groupItem.isOwn ? 'justify-end' : 'justify-start'}`}>
                
                {/* Sender Avatar */}
                {!groupItem.isOwn && (
                  <div className="w-8 shrink-0 flex items-end">
                    <img
                      src={groupItem.avatar}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover border border-zinc-900 bg-zinc-900"
                    />
                  </div>
                )}

                {/* Message Group Bubbles list */}
                <div className="flex flex-col space-y-1 max-w-[70%]">
                  {/* Username on incoming first msg */}
                  {!groupItem.isOwn && (
                    <span className="text-[10px] text-violet-400 font-bold mb-0.5 ml-1 font-mono">
                      {groupItem.senderName}
                    </span>
                  )}

                  {groupItem.messages.map((msg: any, mIdx: number) => {
                    const isHovered = hoveredMessageId === msg.id || hoveredMessageId === msg._id;
                    const keyId = msg.id || msg._id;

                    return (
                      <div 
                        key={keyId}
                        className="relative group flex items-center gap-2"
                        onMouseEnter={() => setHoveredMessageId(keyId)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                      >
                        {/* Outgoing hover menu */}
                        {groupItem.isOwn && isHovered && (
                          <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-850 rounded-xl shadow-lg shrink-0 scale-90 origin-right transition-all">
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
                              groupItem.isOwn
                                ? 'bg-violet-650 text-white rounded-br-sm'
                                : 'bg-[#121217] border border-zinc-900/60 text-zinc-200 rounded-bl-sm'
                            }`}
                          >
                            <p className="break-words select-text">{msg.text}</p>
                            
                            <div className="flex items-center justify-end gap-1 mt-1 opacity-60 text-[9px] select-none font-mono">
                              <span>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {groupItem.isOwn && (
                                <CheckCheck className="w-3 h-3 text-white/80" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Incoming hover menu */}
                        {!groupItem.isOwn && isHovered && (
                          <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-850 rounded-xl shadow-lg shrink-0 scale-90 origin-left transition-all">
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
              onChange={e => handleTextChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={`Message ${group.name}...`}
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

      {!embeddedGroupId && <BottomTabBar />}
    </div>
  );
}
