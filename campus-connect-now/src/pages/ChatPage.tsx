import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { useMatchStore } from '@/store/matchStore';
import { useAuthStore } from '@/store/authStore';
import { useGroupChatStore } from '@/store/groupChatStore';
import { ArrowLeft, Send, Eye, Phone, Video, Info, MoreVertical, Paperclip, Smile, Copy, Reply, Trash2, Download, FileText, Image as ImageIcon, Loader2, Share2, Heart, Forward, Link, Star, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { chatApi } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/EmptyState';
import { ReactionEmoji } from '@/types';
import { toast } from 'sonner';
import { ResonanceThread, ResonanceState } from '@/components/chat/ResonanceThread';
import { BottomTabBar } from '@/components/BottomTabBar';
import { socketService } from '@/services/socketService';

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
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeMedia, setActiveMedia] = useState<any | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [showMetadata, setShowMetadata] = useState(false);
  const [forwardingMedia, setForwardingMedia] = useState<any | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [forwardSearch, setForwardSearch] = useState('');
  const [customCaption, setCustomCaption] = useState('');
  const [includeCaption, setIncludeCaption] = useState(true);
  const [mediaResolution, setMediaResolution] = useState<string>('');
  const messagesEnd = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageCount = useRef(0);

  // Focus composer input on match load/mount
  useEffect(() => {
    if (matchId) {
      inputRef.current?.focus();
    }
  }, [matchId]);

  const allMatches = useMatchStore(s => s.matches);
  const allGroups = useGroupChatStore(s => s.groups);
  const forwardMessageAction = useChatStore(s => s.forwardMessage);

  useEffect(() => {
    useGroupChatStore.getState().fetchGroups();
  }, []);

  const currentUserId = useAuthStore(s => s._id);
  const match = useMatchStore(s => s.matches.find(m => m.id === matchId));
  const messagesMap = useChatStore(s => s.messages);
  const messages = messagesMap[matchId!] ?? EMPTY_MESSAGES;

  const conversationImages = useMemo(() => {
    const list: any[] = [];
    messages.forEach((msg: any) => {
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach((file: any) => {
          if (file.mimeType && file.mimeType.startsWith('image/')) {
            list.push({
              file,
              senderName: msg.senderId === currentUserId ? 'You' : (match?.anonymousName || 'Match'),
              timestamp: msg.timestamp,
              msgId: msg.id || msg._id,
              messageType: msg.messageType,
              text: msg.text
            });
          }
        });
      }
    });
    return list;
  }, [messages, currentUserId, match]);

  const typingMatchId = useChatStore(s => s.typingMatchId);
  const sendMessage = useChatStore(s => s.sendMessage);
  const reactToMessage = useChatStore(s => s.reactToMessage);
  const revealIdentity = useMatchStore(s => s.revealIdentity);
  const fetchMessages = useChatStore(s => s.fetchMessages);

  // Hover action panel overlay
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // Emoji picker overlay
  const [showEmojiPickerForMsg, setShowEmojiPickerForMsg] = useState<string | null>(null);

  const typingTimeoutRef = useRef<any>(null);

  const handleTextChange = (val: string) => {
    setText(val);
    const socket = socketService.getSocket();
    if (socket?.connected && matchId) {
      socket.emit('typing', { roomId: matchId, userId: currentUserId, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { roomId: matchId, userId: currentUserId, isTyping: false });
      }, 1500);
    }
  };

  const getResonanceState = (msg: any): ResonanceState => {
    if (msg.resonanceState) return msg.resonanceState as ResonanceState;
    if (msg.status === 'seen') return 'absorbed';
    if (msg.status === 'delivered') return 'harmonized';
    if (msg.status === 'sent') return 'bridged';
    return 'dormant';
  };

  // Connect socket, join room, and listen to events
  useEffect(() => {
    if (matchId) {
      useChatStore.getState().connectSocket();
      socketService.joinRoom(`match_${matchId}`);
      return () => {
        socketService.leaveRoom(`match_${matchId}`);
        useChatStore.getState().disconnectSocket();
      };
    }
  }, [matchId]);

  // Keyboard shortcut listener to close Lightbox image on Escape key, and navigate on Arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMedia(null);
        setZoomScale(1);
        setShowMetadata(false);
      } else if (e.key === 'ArrowLeft') {
        setActiveMedia(prev => {
          if (!prev) return null;
          const idx = conversationImages.findIndex(img => img.file.downloadUrl === prev.file.downloadUrl);
          if (idx > 0) {
            setZoomScale(1);
            return conversationImages[idx - 1];
          }
          return prev;
        });
      } else if (e.key === 'ArrowRight') {
        setActiveMedia(prev => {
          if (!prev) return null;
          const idx = conversationImages.findIndex(img => img.file.downloadUrl === prev.file.downloadUrl);
          if (idx !== -1 && idx < conversationImages.length - 1) {
            setZoomScale(1);
            return conversationImages[idx + 1];
          }
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conversationImages]);

  // Load active media resolution dynamically
  useEffect(() => {
    if (activeMedia?.file?.downloadUrl) {
      const img = new Image();
      img.src = activeMedia.file.downloadUrl;
      img.onload = () => {
        setMediaResolution(`${img.naturalWidth} x ${img.naturalHeight}`);
      };
      img.onerror = () => {
        setMediaResolution('Unknown resolution');
      };
    } else {
      setMediaResolution('');
    }
  }, [activeMedia]);

  // Fetch messages exactly once on mount / chat load
  useEffect(() => {
    if (matchId) {
      fetchMessages(matchId);
    }
  }, [matchId, fetchMessages]);

  // Track user focus on this conversation channel
  useEffect(() => {
    if (matchId) {
      useChatStore.getState().focusChannel(matchId, true);
      return () => {
        useChatStore.getState().focusChannel(matchId, false);
      };
    }
  }, [matchId]);

  // Viewport Intersection Observer to mark incoming messages as Resonating/Absorbed
  useEffect(() => {
    if (!matchId || messages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const msgId = entry.target.getAttribute('data-msg-id');
            const senderId = entry.target.getAttribute('data-sender-id');
            const currentResState = entry.target.getAttribute('data-res-state');

            // If it's an incoming message and not already fully acknowledged
            if (
              msgId && 
              senderId && 
              senderId !== currentUserId && 
              currentResState !== 'absorbed' && 
              currentResState !== 'seen'
            ) {
              useChatStore.getState().markResonanceState(matchId, msgId, 'resonating');
            }
          }
        });
      },
      { threshold: 0.15 } // Trigger when at least 15% is visible
    );

    // Observe each message bubble container
    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('[data-msg-id]');
      elements.forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      const elements = document.querySelectorAll('[data-msg-id]');
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [messages, matchId, currentUserId]);

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
    } else if (typingMatchId === matchId) {
      const container = scrollContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 250;
        if (isNearBottom) {
          messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [messages, typingMatchId, currentUserId, matchId]);

  // Jump to bottom instantly on chat load
  useEffect(() => {
    if (messages.length > 0) {
      messagesEnd.current?.scrollIntoView({ behavior: 'auto' });
      lastMessageCount.current = messages.length;
    }
  }, [matchId]);

  if (!match) {
    return (
      <div className="min-h-screen bg-[#08080C] flex items-center justify-center">
        <EmptyState title="Chat not found" description="This conversation doesn't exist." />
      </div>
    );
  }

  const handleUpload = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setUploadProgress(0);
    try {
      const file = files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds the 10MB limit.');
        setUploadProgress(null);
        return;
      }

      const res = await chatApi.uploadFile(matchId!, file, (pct) => {
        setUploadProgress(pct);
      });

      if (res && res.success && res.data && res.data.length > 0) {
        const uploadedFile = res.data[0];
        const isImage = uploadedFile.mimeType.startsWith('image/');
        const msgType = isImage ? 'image' : 'file';

        await sendMessage(matchId!, '', msgType, [uploadedFile]);
        toast.success('File uploaded successfully!');
      } else {
        toast.error(res.error || 'Upload failed.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploadProgress(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      handleUpload(files);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || isSending) return;
    setIsSending(true);
    try {
      await sendMessage(matchId!, text.trim());
      setText('');
    } catch (e) {
      console.error('Error sending message:', e);
    } finally {
      setIsSending(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
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
        const isOwn = String(msg.senderId) === String(currentUserId) || (currentUserId ? false : (String(msg.senderId) === String(useAuthStore.getState()._id)));
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
    <div className={`flex-1 flex flex-col h-full bg-[#08080C] text-zinc-300 relative ${!embeddedMatchId ? 'pb-[64px]' : ''}`}>
      
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
      <div 
        ref={scrollContainerRef} 
        className={`flex-1 overflow-y-auto scrollbar-thin relative transition-colors ${
          isDragging ? 'bg-violet-950/25' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-[#08080C]/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center pointer-events-none">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3 p-8 border border-zinc-850 rounded-3xl bg-zinc-950/80 shadow-2xl max-w-xs text-center"
            >
              <div className="p-4 bg-violet-500/10 rounded-2xl text-violet-500">
                <Paperclip className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-xs font-semibold text-white">Drop files to send</h3>
              <p className="text-[10px] text-zinc-500 leading-normal">Share photos, PDFs, and ZIP documents up to 10MB</p>
            </motion.div>
          </div>
        )}

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
                        data-msg-id={keyId}
                        data-sender-id={msg.senderId}
                        data-res-state={getResonanceState(msg)}
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
                            <button 
                              onClick={() => {
                                setForwardingMedia({
                                  msgId: keyId,
                                  text: msg.text || '',
                                  messageType: msg.messageType || 'text',
                                  file: msg.attachments && msg.attachments.length > 0 ? msg.attachments[0] : null
                                });
                                setSelectedTargets([]);
                                setCustomCaption(msg.text || '');
                              }}
                              className="p-1 text-zinc-450 hover:text-white"
                              title="Forward message"
                            >
                              <Forward className="w-3.5 h-3.5" />
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
                            {/* Render Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="space-y-2 mb-2 max-w-[280px]">
                                {msg.attachments.map((file: any, fIdx: number) => {
                                  const isImage = file.mimeType.startsWith('image/');
                                  if (isImage) {
                                    return (
                                      <div 
                                        key={fIdx} 
                                        className="relative rounded-lg overflow-hidden border border-zinc-880/80 cursor-zoom-in group/img"
                                        onClick={() => setActiveMedia({
                                          file,
                                          senderName: group.senderName,
                                          timestamp: msg.timestamp,
                                          msgId: msg.id || msg._id,
                                          messageType: msg.messageType,
                                          text: msg.text
                                        })}
                                      >
                                        <img 
                                          src={file.downloadUrl} 
                                          alt={file.fileName} 
                                          className="max-h-[180px] w-full object-cover rounded-lg hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                          <ImageIcon className="w-5 h-5 text-white animate-pulse" />
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div key={fIdx} className="flex items-center gap-3 p-2.5 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                                      <FileText className="w-6 h-6 text-zinc-400 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-medium text-zinc-200 truncate">{file.fileName}</p>
                                        <p className="text-[9px] text-zinc-500 font-mono">{(file.fileSize / 1024).toFixed(1)} KB</p>
                                      </div>
                                      <a
                                        href={file.downloadUrl}
                                        download={file.fileName}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {msg.text && <p className="break-words select-text">{msg.text}</p>}
                            
                            {/* Time & Resonance Acknowledgment */}
                            <div className="flex items-center justify-between gap-3 mt-1.5 opacity-60 text-[9px] select-none font-mono">
                              <span>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {group.isOwn && (
                                <ResonanceThread state={getResonanceState(msg)} isSender={true} />
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
                            <button 
                              onClick={() => {
                                setForwardingMedia({
                                  msgId: keyId,
                                  text: msg.text || '',
                                  messageType: msg.messageType || 'text',
                                  file: msg.attachments && msg.attachments.length > 0 ? msg.attachments[0] : null
                                });
                                setSelectedTargets([]);
                                setCustomCaption(msg.text || '');
                              }}
                              className="p-1 text-zinc-450 hover:text-white"
                              title="Forward message"
                            >
                              <Forward className="w-3.5 h-3.5" />
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
        {uploadProgress !== null && (
          <div className="max-w-[820px] mx-auto w-full px-5 pt-2">
            <div className="bg-zinc-900 rounded-lg p-2 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-violet-500 animate-spin shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                  <span>Uploading file...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-850 h-1 rounded-full overflow-hidden">
                  <div className="bg-violet-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-[820px] mx-auto w-full px-5 py-3.5">
          <div className="flex gap-2 items-center bg-[#111116] border border-zinc-850/80 rounded-2xl px-3 py-1.5">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileSelect} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadProgress !== null}
              className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900/40 disabled:opacity-40"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            
            <input
              ref={inputRef}
              value={text}
              disabled={uploadProgress !== null}
              onChange={e => handleTextChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onPaste={handlePaste}
              placeholder={`Message ${matchName}...`}
              className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder:text-zinc-650 outline-none caret-violet-500"
            />

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!text.trim() || isSending || uploadProgress !== null}
              className="h-8 w-8 rounded-xl bg-violet-650 hover:bg-violet-755 disabled:opacity-40 flex items-center justify-center text-white shrink-0 shadow-md shadow-violet-950/20"
            >
              <Send className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Redesigned Premium Media Viewer */}
      {createPortal(
        <AnimatePresence>
          {activeMedia && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-black/95 flex flex-col justify-between select-none"
              onClick={() => {
                setActiveMedia(null);
                setZoomScale(1);
                setShowMetadata(false);
              }}
            >
              {/* Top Action Bar */}
              <div 
                className="w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 p-4 flex items-center justify-between z-10"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setActiveMedia(null);
                      setZoomScale(1);
                      setShowMetadata(false);
                    }}
                    className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-zinc-100 truncate max-w-[200px] sm:max-w-[400px]">
                      {activeMedia.file.fileName}
                    </h3>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                      <span>By {activeMedia.senderName}</span>
                      <span>•</span>
                      <span>{new Date(activeMedia.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      {mediaResolution && (
                        <>
                          <span>{mediaResolution}</span>
                          <span>•</span>
                        </>
                      )}
                      <span className="font-mono">{(activeMedia.file.fileSize / 1024).toFixed(1)} KB</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMetadata(prev => !prev)}
                    className={`p-2 rounded-xl transition-colors ${showMetadata ? 'bg-violet-650/25 text-violet-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                    title="Info Details"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <button 
                    className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-colors"
                    onClick={() => {
                      setActiveMedia(null);
                      setZoomScale(1);
                      setShowMetadata(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Content Area: Image + Side Drawer */}
              <div className="flex-1 flex relative w-full overflow-hidden justify-center items-center">
                {/* Left navigation arrow */}
                {conversationImages.length > 1 && (
                  <button
                    className="absolute left-6 z-20 p-3 rounded-full bg-zinc-950/60 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors select-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = conversationImages.findIndex(img => img.file.downloadUrl === activeMedia.file.downloadUrl);
                      if (idx > 0) {
                        setZoomScale(1);
                        setActiveMedia(conversationImages[idx - 1]);
                      }
                    }}
                    disabled={conversationImages.findIndex(img => img.file.downloadUrl === activeMedia.file.downloadUrl) === 0}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                {/* Viewport for image */}
                <div 
                  className="flex-1 h-full flex items-center justify-center overflow-hidden p-6"
                  onClick={() => {
                    setActiveMedia(null);
                    setZoomScale(1);
                    setShowMetadata(false);
                  }}
                >
                  <motion.img
                    initial={{ scale: 0.95, x: 0, y: 0 }}
                    animate={{ scale: zoomScale }}
                    drag={zoomScale > 1}
                    dragConstraints={{ left: -400 * (zoomScale - 1), right: 400 * (zoomScale - 1), top: -400 * (zoomScale - 1), bottom: 400 * (zoomScale - 1) }}
                    dragElastic={0.15}
                    exit={{ scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    src={activeMedia.file.downloadUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl cursor-zoom-in"
                    onWheel={(e) => {
                      setZoomScale(prev => {
                        const step = 0.25;
                        const next = e.deltaY < 0 ? prev + step : prev - step;
                        return Math.min(3, Math.max(1, next));
                      });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomScale(prev => prev === 1 ? 2 : 1);
                    }}
                  />
                </div>

                {/* Right navigation arrow */}
                {conversationImages.length > 1 && (
                  <button
                    className="absolute right-6 z-20 p-3 rounded-full bg-zinc-950/60 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors select-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = conversationImages.findIndex(img => img.file.downloadUrl === activeMedia.file.downloadUrl);
                      if (idx !== -1 && idx < conversationImages.length - 1) {
                        setZoomScale(1);
                        setActiveMedia(conversationImages[idx + 1]);
                      }
                    }}
                    disabled={conversationImages.findIndex(img => img.file.downloadUrl === activeMedia.file.downloadUrl) === conversationImages.length - 1}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}

                {/* Side Drawer Details Inspector */}
                <AnimatePresence>
                  {showMetadata && (
                    <motion.div
                      initial={{ x: 300, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 300, opacity: 0 }}
                      onClick={e => e.stopPropagation()}
                      className="absolute right-0 top-0 bottom-0 w-80 bg-zinc-950/95 border-l border-zinc-900 p-6 z-30 overflow-y-auto flex flex-col gap-6"
                    >
                      <div>
                        <h4 className="text-zinc-200 text-xs font-semibold uppercase tracking-wider mb-4 font-mono text-violet-400">File Details</h4>
                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] text-zinc-500">Filename</p>
                            <p className="text-xs text-zinc-200 break-all font-medium mt-1">{activeMedia.file.fileName}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500">Mime Type</p>
                            <p className="text-xs text-zinc-200 font-mono mt-1">{activeMedia.file.mimeType}</p>
                          </div>
                          {mediaResolution && (
                            <div>
                              <p className="text-[10px] text-zinc-500">Resolution</p>
                              <p className="text-xs text-zinc-200 font-mono mt-1">{mediaResolution}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] text-zinc-500">File Size</p>
                            <p className="text-xs text-zinc-200 font-mono mt-1">{(activeMedia.file.fileSize / 1024).toFixed(1)} KB ({activeMedia.file.fileSize} bytes)</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500">Upload Time</p>
                            <p className="text-xs text-zinc-200 mt-1">{new Date(activeMedia.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-zinc-900" />

                      <div>
                        <h4 className="text-zinc-200 text-xs font-semibold uppercase tracking-wider mb-4 font-mono text-violet-400">Metadata</h4>
                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] text-zinc-500">Sender</p>
                            <p className="text-xs text-zinc-200 mt-1">{activeMedia.senderName}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500">Conversation ID</p>
                            <p className="text-xs text-zinc-400 font-mono break-all mt-1">{matchId}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500">Message ID</p>
                            <p className="text-xs text-zinc-400 font-mono break-all mt-1">{activeMedia.msgId}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Actions Bar */}
              <div 
                className="w-full bg-zinc-950/85 backdrop-blur-md border-t border-zinc-900 p-4 flex flex-col items-center gap-3 z-10 shrink-0 pointer-events-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      reactToMessage(matchId!, activeMedia.msgId, '❤️');
                      toast.success('Reacted with ❤️');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-rose-500 text-xs transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5 fill-rose-500" /> React
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeMedia.file.downloadUrl);
                      toast.success('Image link copied to clipboard!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </button>

                  <button
                    onClick={() => {
                      setForwardingMedia(activeMedia);
                      setSelectedTargets([]);
                      setCustomCaption(activeMedia.text || '');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-305 hover:text-white text-xs transition-colors"
                  >
                    <Forward className="w-3.5 h-3.5" /> Forward
                  </button>

                  <a
                    href={activeMedia.file.downloadUrl}
                    download={activeMedia.file.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-305 hover:text-white text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>

                  <button
                    onClick={() => {
                      setText(prev => `Replying to image: "${activeMedia.file.fileName}"\n${prev}`);
                      setActiveMedia(null);
                      toast.success('Replied with image reference!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-305 hover:text-white text-xs transition-colors"
                  >
                    <Reply className="w-3.5 h-3.5" /> Reply
                  </button>

                  <button
                    onClick={() => {
                      toast.success('Saved to Favorites ⭐');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-305 hover:text-white text-xs transition-colors"
                  >
                    <Star className="w-3.5 h-3.5" /> Favorite
                  </button>

                  {activeMedia.senderName === 'You' && (
                    <button
                      onClick={() => {
                        toast.success('Delete request received.');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900 text-rose-300 text-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>

                {/* Zoom tools inside actions bar */}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => setZoomScale(prev => Math.max(1, prev - 0.5))}
                    className="h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white flex items-center justify-center hover:bg-zinc-800 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-[10px] font-mono text-zinc-500 w-12 text-center select-none">
                    {zoomScale.toFixed(1)}x
                  </span>
                  <button
                    onClick={() => setZoomScale(prev => Math.min(3, prev + 0.5))}
                    className="h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white flex items-center justify-center hover:bg-zinc-800 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Forward Message Modal */}
      <AnimatePresence>
        {forwardingMedia && (
          <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-900 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">Forward Message</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Select direct chats or groups to share this media attachment</p>
                </div>
                <button
                  onClick={() => setForwardingMedia(null)}
                  className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selection Chips */}
              {selectedTargets.length > 0 && (
                <div className="px-5 py-3 border-b border-zinc-900 flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                  {selectedTargets.map(targetId => {
                    const targetMatch = allMatches.find(m => m.id === targetId);
                    const targetGroup = allGroups.find(g => g._id === targetId || (g as any).id === targetId);
                    const name = targetMatch 
                      ? (targetMatch.anonymousName || 'Direct Chat') 
                      : (targetGroup ? targetGroup.name : 'Group Chat');

                    return (
                      <span 
                        key={targetId} 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-650/20 border border-violet-900/60 text-violet-300 text-[10px] font-medium"
                      >
                        {name}
                        <button 
                          onClick={() => setSelectedTargets(prev => prev.filter(id => id !== targetId))}
                          className="hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Search Bar */}
              <div className="p-4 border-b border-zinc-900">
                <input 
                  type="text"
                  placeholder="Search contacts, chats, or groups..."
                  value={forwardSearch}
                  onChange={e => setForwardSearch(e.target.value)}
                  className="w-full bg-zinc-905 border border-zinc-850 focus:border-violet-650 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-550 outline-none transition-colors"
                />
              </div>

              {/* Chat list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Direct Chats */}
                <div>
                  <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">Direct Chats</h4>
                  <div className="space-y-1.5">
                    {allMatches
                      .filter(m => (m.anonymousName || '').toLowerCase().includes(forwardSearch.toLowerCase()))
                      .map(m => {
                        const isSelected = selectedTargets.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              setSelectedTargets(prev => 
                                isSelected ? prev.filter(id => id !== m.id) : [...prev, m.id]
                              );
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${isSelected ? 'bg-zinc-900 border border-zinc-800' : 'hover:bg-zinc-900/40 border border-transparent'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-zinc-855 flex items-center justify-center text-xs text-zinc-400 font-semibold uppercase">
                                {(m.anonymousName || 'D')[0]}
                              </div>
                              <span className="text-xs text-zinc-200 font-medium">{m.anonymousName || 'Anonymous Student'}</span>
                            </div>
                            <div className={`h-4 w-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-violet-650 border-violet-650 text-white' : 'border-zinc-800'}`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Groups */}
                <div>
                  <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">Groups</h4>
                  <div className="space-y-1.5">
                    {allGroups
                      .filter(g => g.name.toLowerCase().includes(forwardSearch.toLowerCase()))
                      .map(g => {
                        const gId = g._id || (g as any).id;
                        const isSelected = selectedTargets.includes(gId);
                        return (
                          <button
                            key={gId}
                            onClick={() => {
                              setSelectedTargets(prev => 
                                isSelected ? prev.filter(id => id !== gId) : [...prev, gId]
                              );
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${isSelected ? 'bg-zinc-900 border border-zinc-800' : 'hover:bg-zinc-900/40 border border-transparent'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-zinc-855 flex items-center justify-center text-xs text-zinc-400 font-semibold uppercase">
                                {g.name[0]}
                              </div>
                              <span className="text-xs text-zinc-200 font-medium">{g.name}</span>
                            </div>
                            <div className={`h-4 w-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-violet-650 border-violet-650 text-white' : 'border-zinc-800'}`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Caption options */}
              <div className="p-5 border-t border-zinc-900 bg-zinc-950/40 space-y-3">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="incl-capt"
                    checked={includeCaption}
                    onChange={e => setIncludeCaption(e.target.checked)}
                    className="rounded border-zinc-850 text-violet-650 focus:ring-violet-650/40"
                  />
                  <label htmlFor="incl-capt" className="text-[10px] text-zinc-400 cursor-pointer select-none">
                    Include original caption
                  </label>
                </div>

                <div>
                  <textarea 
                    placeholder="Add a new caption or note..."
                    value={customCaption}
                    onChange={e => setCustomCaption(e.target.value)}
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-855 rounded-xl p-2.5 text-xs text-white placeholder:text-zinc-650 outline-none focus:border-violet-650 resize-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button 
                    onClick={() => setForwardingMedia(null)}
                    className="px-4 py-2 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (selectedTargets.length === 0) {
                        toast.error('Please select at least one recipient.');
                        return;
                      }
                      const captionText = includeCaption 
                        ? (customCaption || forwardingMedia.text || '')
                        : customCaption;

                      const res = await forwardMessageAction(
                        selectedTargets,
                        forwardingMedia.msgId,
                        captionText,
                        forwardingMedia.messageType,
                        forwardingMedia.file ? [forwardingMedia.file] : []
                      );

                      if (res && res.success) {
                        toast.success('Message forwarded successfully!');
                        setForwardingMedia(null);
                        setActiveMedia(null); // Close viewer as well
                      } else {
                        toast.error(res?.error || 'Failed to forward message.');
                      }
                    }}
                    disabled={selectedTargets.length === 0}
                    className="px-5 py-2.5 bg-violet-650 hover:bg-violet-755 disabled:opacity-40 rounded-xl text-white text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all"
                  >
                    Forward ({selectedTargets.length})
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!embeddedMatchId && <BottomTabBar />}
    </div>
  );
}
