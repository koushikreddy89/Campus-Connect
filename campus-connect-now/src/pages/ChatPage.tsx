import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { useMatchStore } from '@/store/matchStore';
import { useAuthStore } from '@/store/authStore';
import { useGroupChatStore } from '@/store/groupChatStore';
import { ArrowLeft, Send, Eye, Phone, Video, Info, Paperclip, Smile, Copy, Reply, Trash2, Download, FileText, Image as ImageIcon, Loader2, Forward, Check, ChevronLeft, ChevronRight, X, Star, ArrowDown, Flame, Infinity, Lock, Heart, Pin, Bookmark, Share2 } from 'lucide-react';
import { chatApi } from '@/services/api';
import { getApiUrl } from '@/services/connectionService';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/EmptyState';
import { ReactionEmoji } from '@/types';
import { toast } from 'sonner';
import { ResonanceThread } from '@/components/chat/ResonanceThread';
import { BottomTabBar } from '@/components/BottomTabBar';
import { socketService } from '@/services/socketService';

const EMPTY_MESSAGES: any[] = [];
const REACTION_OPTIONS: ReactionEmoji[] = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// Premium Last Seen & Status Formatter
const formatLastSeen = (status: string, timestampStr?: string) => {
  if (status === 'online') return '🟢 Online';
  if (status === 'idle') return 'Idle';
  if (status === 'typing') return 'Typing...';
  if (status === 'recording') return 'Recording voice...';
  
  if (!timestampStr) return 'Last seen unavailable';

  const date = new Date(timestampStr);
  if (isNaN(date.getTime())) return 'Last seen unavailable';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  // Just now: < 1 minute
  if (diffMs < 60000) {
    return 'Last seen just now';
  }
  // Minutes ago: < 1 hour
  if (diffMs < 3600000) {
    const mins = Math.floor(diffMs / 60000);
    return `Last seen ${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (date.toDateString() === today.toDateString()) {
    return `Last seen today at ${timeStr}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `Last seen yesterday at ${timeStr}`;
  }

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `Last seen ${date.toLocaleDateString(undefined, options)} at ${timeStr}`;
};

const formatDividerDate = (timestampStr: string) => {
  const date = new Date(timestampStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
};

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
  
  // Floating new messages scroll pill state
  const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);
  const [unreadCountSinceScroll, setUnreadCountSinceScroll] = useState(0);

  // Real-time recipient presence state
  const match = useMatchStore(s => s.matches.find(m => m.id === matchId));
  const recipientPresence = useMemo(() => {
    return {
      status: (match?.isOnline || match?.user?.isOnline) ? 'online' : 'offline',
      lastSeen: match?.user?.lastSeen
    };
  }, [match]);

  const [retentionMode, setRetentionMode] = useState<'VIEW_ONCE' | 'NEVER_DELETE'>(
    (localStorage.getItem('chat_retention_mode') as 'VIEW_ONCE' | 'NEVER_DELETE') || 'NEVER_DELETE'
  );

  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaLoadError, setMediaLoadError] = useState<string | null>(null);

  // Premium context menu and details states
  const [selectedMenuMsg, setSelectedMenuMsg] = useState<any | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [showDetailsMsg, setShowDetailsMsg] = useState<any | null>(null);
  const [showDeleteConfirmMsg, setShowDeleteConfirmMsg] = useState<any | null>(null);
  const [deleteType, setDeleteType] = useState<'me' | 'everyone'>('me');
  const [replyParentMsg, setReplyParentMsg] = useState<any | null>(null);

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

  useEffect(() => {
    if (matchId && match?.user?.id) {
      const fetchPresence = async () => {
        try {
          const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token') || '';
          const res = await fetch(`${getApiUrl()}/api/users/${match.user.id}/presence`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          if (data && data.lastSeen !== undefined) {
            useMatchStore.getState().setMatches(
              useMatchStore.getState().matches.map(m => {
                if (m.id === matchId) {
                  return {
                    ...m,
                    isOnline: data.isOnline,
                    user: m.user ? { ...m.user, isOnline: data.isOnline, lastSeen: data.lastSeen } : undefined
                  };
                }
                return m;
              })
            );
          }
        } catch (e) {
          console.error("Failed to fetch fresh user presence:", e);
        }
      };
      fetchPresence();
      
      const presenceInterval = setInterval(fetchPresence, 30000);
      return () => clearInterval(presenceInterval);
    }
  }, [matchId, match?.user?.id]);

  const currentUserId = useAuthStore(s => s.uid);
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
    const token = localStorage.getItem('token') || '';
    if (socket?.connected && matchId) {
      socket.emit('typing', { roomId: matchId, userId: currentUserId, isTyping: val.length > 0 });
    }
    if (token && matchId) {
      if (val.length > 0) {
        fetch('http://localhost:5000/api/typing/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ conversationId: matchId })
        }).catch(() => {});
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socket?.connected) {
          socket.emit('typing', { roomId: matchId, userId: currentUserId, isTyping: false });
        }
        fetch('http://localhost:5000/api/typing/stop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ conversationId: matchId })
        }).catch(() => {});
      }, 2000);
    }
  };

  const getResonanceState = (msg: any) => {
    if (msg.resonanceState) return msg.resonanceState;
    if (msg.status === 'seen') return 'absorbed';
    if (msg.status === 'delivered') return 'harmonized';
    if (msg.status === 'sent') return 'bridged';
    return 'dormant';
  };

  // Connect socket and join room
  useEffect(() => {
    if (matchId) {
      useChatStore.getState().connectSocket();
      socketService.joinRoom(`match_${matchId}`);

      return () => {
        socketService.leaveRoom(`match_${matchId}`);
        useChatStore.getState().disconnectSocket();
      };
    }
  }, [matchId, currentUserId]);

  // Presence last-seen timestamp ticker (force update every 30s)
  const [, setPresenceTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setPresenceTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

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
      { threshold: 0.15 }
    );

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

  // View Once 8-second auto-close timer
  useEffect(() => {
    if (activeMedia && activeMedia.isViewOnce && activeMedia.loadedSuccessfully) {
      const timer = setTimeout(() => {
        const msgId = activeMedia.msgId;
        setActiveMedia(null);
        useChatStore.getState().openMessage(matchId!, msgId);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [activeMedia, matchId]);

  // Handle escape key to close media viewer modal and context menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeMedia) {
          closeMediaViewer();
        }
        if (showMenu) {
          setShowMenu(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMedia, showMenu]);

  // Scroll position listener to auto-toggle Floating unread indicator pill
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (isNearBottom) {
      setShowNewMessagesPill(false);
      setUnreadCountSinceScroll(0);
    }
  };

  // Smart auto-scroll and unread counter logic
  useEffect(() => {
    if (messages.length > lastMessageCount.current) {
      const lastMsg = messages[messages.length - 1];
      const isOwn = lastMsg?.senderId === currentUserId;
      const container = scrollContainerRef.current;
      
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 250;
        if (isOwn || isNearBottom) {
          messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
          setShowNewMessagesPill(false);
          setUnreadCountSinceScroll(0);
        } else {
          setUnreadCountSinceScroll(prev => prev + 1);
          setShowNewMessagesPill(true);
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
    setShowNewMessagesPill(false);
    setUnreadCountSinceScroll(0);
  }, [matchId]);

  if (!match) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
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

        await sendMessage(matchId!, '', msgType, [uploadedFile], retentionMode);
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
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      const socket = socketService.getSocket();
      const token = localStorage.getItem('token') || '';
      if (socket?.connected && matchId) {
        socket.emit('typing', { roomId: matchId, userId: currentUserId, isTyping: false });
      }
      if (token && matchId) {
        fetch('http://localhost:5000/api/typing/stop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ conversationId: matchId })
        }).catch(() => {});
      }

      if (replyParentMsg) {
        await useChatStore.getState().replyToMessage(matchId!, replyParentMsg.id || replyParentMsg._id, text.trim(), 'text');
        setReplyParentMsg(null);
      } else {
        await sendMessage(matchId!, text.trim(), 'text', [], retentionMode);
      }
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

  const handleModeChange = (mode: 'VIEW_ONCE' | 'NEVER_DELETE') => {
    setRetentionMode(mode);
    localStorage.setItem('chat_retention_mode', mode);
  };

  const handleReact = (messageId: string, emoji: ReactionEmoji) => {
    reactToMessage(matchId!, messageId, emoji);
    setShowEmojiPickerForMsg(null);
  };

  const openContextMenu = (msg: any, x: number, y: number, isOwn: boolean) => {
    const menuWidth = 240;
    const menuHeight = 420;
    const padding = 16;

    let posX = x;
    let posY = y;

    if (x + menuWidth > window.innerWidth) {
      posX = window.innerWidth - menuWidth - padding;
    }
    if (y + menuHeight > window.innerHeight) {
      posY = window.innerHeight - menuHeight - padding;
    }

    setMenuCoords({ x: Math.max(padding, posX), y: Math.max(padding, posY) });
    setSelectedMenuMsg(msg);
    setShowMenu(true);
  };

  const handleContextReact = (emoji: ReactionEmoji) => {
    if (!selectedMenuMsg) return;
    reactToMessage(matchId!, selectedMenuMsg.id || selectedMenuMsg._id, emoji);
    setShowMenu(false);
  };

  const handleContextPin = () => {
    if (!selectedMenuMsg) return;
    useChatStore.getState().pinMessage(matchId!, selectedMenuMsg.id || selectedMenuMsg._id);
    setShowMenu(false);
    toast.success(selectedMenuMsg.pinned ? 'Message unpinned! 📌' : 'Message pinned! 📌');
  };

  const handleContextBookmark = () => {
    if (!selectedMenuMsg) return;
    useChatStore.getState().bookmarkMessage(matchId!, selectedMenuMsg.id || selectedMenuMsg._id);
    setShowMenu(false);
    toast.success('Bookmark updated! 🔖');
  };

  const handleContextDeleteForMe = () => {
    if (!selectedMenuMsg) return;
    setDeleteType('me');
    setShowDeleteConfirmMsg(selectedMenuMsg);
    setShowMenu(false);
  };

  const handleContextDeleteForEveryone = () => {
    if (!selectedMenuMsg) return;
    setDeleteType('everyone');
    setShowDeleteConfirmMsg(selectedMenuMsg);
    setShowMenu(false);
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirmMsg) return;
    const msgId = showDeleteConfirmMsg.id || showDeleteConfirmMsg._id;
    if (deleteType === 'me') {
      await useChatStore.getState().deleteMessageForMe(matchId!, msgId);
      toast.success('Message deleted for you.');
    } else {
      await useChatStore.getState().deleteMessageForEveryone(matchId!, msgId);
      toast.success('Message deleted for everyone.');
    }
    setShowDeleteConfirmMsg(null);
  };

  const holdTimer = useRef<any>(null);

  const handleMouseDown = (e: React.MouseEvent, msg: any, isOwn: boolean) => {
    if (e.button !== 0) return;
    holdTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(60);
      openContextMenu(msg, e.clientX, e.clientY, isOwn);
    }, 2000);
  };

  const handleMouseUp = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent, msg: any, isOwn: boolean) => {
    const touch = e.touches[0];
    holdTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(60);
      openContextMenu(msg, touch.clientX, touch.clientY, isOwn);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, msg: any, isOwn: boolean) => {
    e.preventDefault();
    openContextMenu(msg, e.clientX, e.clientY, isOwn);
  };

  const preloadViewOnce = (msg: any, senderName: string) => {
    console.log("View Once clicked, message details:", msg);
    
    const fileObj = msg.attachments?.[0] || { downloadUrl: msg.imageUrl || '', fileName: 'View Once Media', mimeType: msg.messageType === 'image' ? 'image/png' : 'text/plain' };
    const url = fileObj.downloadUrl;

    if (!url) {
      console.error("preloadViewOnce failed: downloadUrl is missing", fileObj);
      toast.error("This View Once media has no configured URL.");
      return;
    }

    const baseUrl = getApiUrl();
    const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token') || '';
    
    let fullUrl = url;
    if (url.startsWith('/')) {
      fullUrl = `${baseUrl}${url}`;
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `${baseUrl}/${url}`;
    }
    fullUrl = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}token=${token}`;

    const updatedFileObj = {
      ...fileObj,
      downloadUrl: fullUrl
    };

    setMediaLoading(true);
    setMediaLoadError(null);

    setActiveMedia({
      file: updatedFileObj,
      senderName,
      timestamp: msg.timestamp,
      msgId: msg.id || msg._id,
      messageType: msg.messageType,
      text: msg.text || 'View Once Message',
      isViewOnce: true,
      loadedSuccessfully: false
    });

    const img = new Image();
    img.src = fullUrl;
    img.onload = () => {
      setMediaLoading(false);
      setActiveMedia(prev => {
        if (!prev) return null;
        return {
          ...prev,
          loadedSuccessfully: true
        };
      });
    };
    img.onerror = () => {
      setMediaLoading(false);
      setMediaLoadError("This media could not be loaded.");
    };
  };

  const closeMediaViewer = () => {
    if (!activeMedia) return;
    const msgId = activeMedia.msgId;
    const isViewOnce = activeMedia.isViewOnce;
    const loadedSuccessfully = activeMedia.loadedSuccessfully;

    setActiveMedia(null);
    setZoomScale(1);
    setShowMetadata(false);
    setMediaLoading(false);
    setMediaLoadError(null);

    if (isViewOnce && loadedSuccessfully) {
      useChatStore.getState().openMessage(matchId!, msgId);
    }
  };

  const handleCopyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success('Text copied to clipboard! 📋');
  };

  const isOnline = match.user?.isOnline ?? false;
  const matchName = match.isRevealed ? match.user?.name : match.user?.anonymousName || 'Anonymous';

  // Group messages consecutively by sender within 3 minutes and same calendar day
  const groupedMessages = useMemo(() => {
    const groups: any[] = [];
    let currentGroup: any = null;

    messages.forEach((msg) => {
      const msgTime = new Date(msg.timestamp).getTime();
      const isSameSender = currentGroup && currentGroup.senderId === msg.senderId;
      const prevMsg = currentGroup ? currentGroup.messages[currentGroup.messages.length - 1] : null;
      const isSameDay = prevMsg && new Date(msg.timestamp).toDateString() === new Date(prevMsg.timestamp).toDateString();
      const isWithinTime = currentGroup && isSameDay && (msgTime - new Date(prevMsg.timestamp).getTime() < 180000);

      if (isSameSender && isWithinTime) {
        currentGroup.messages.push(msg);
      } else {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        const isOwn = String(msg.senderId) === String(currentUserId) || String(msg.senderId) === String(useAuthStore.getState().uid);
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

  // Derived presence status string
  const activeStatusStr = useMemo(() => {
    if (typingMatchId === matchId) return 'Typing...';
    return formatLastSeen(recipientPresence.status, recipientPresence.lastSeen || match?.user?.updatedAt);
  }, [recipientPresence, typingMatchId, matchId, match]);

  return (
    <div className={`flex-1 flex flex-col h-full bg-[#09090B] text-zinc-300 relative select-none overflow-hidden ${!embeddedMatchId ? 'pb-[64px]' : ''}`}>
      
      {/* Premium Background Lighting/Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-3 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-violet-600/10 to-indigo-600/10 blur-[140px] animate-pulse duration-[10000ms]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-fuchsia-600/10 to-violet-600/10 blur-[160px] animate-pulse duration-[14000ms]" />
      </div>

      {/* Redesigned Floating Glass Header */}
      <div className="backdrop-blur-xl bg-zinc-950/75 border-b border-white/[0.06] sticky top-0 z-50 shrink-0 select-none shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="max-w-[900px] mx-auto w-full px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            {!embeddedMatchId && (
              <button 
                onClick={() => navigate('/chat')} 
                className="p-2 hover:bg-white/[0.06] rounded-xl text-zinc-400 hover:text-white transition-all active:scale-95 shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            
            <div 
              onClick={() => {
                if (match?.userId) {
                  navigate(`/profile/${match.userId}`);
                }
              }}
              className="flex items-center gap-4 min-w-0 cursor-pointer select-none group/header active:scale-98 transition-all hover:scale-[1.03]"
            >
              {/* 56px Premium Profile Photo with Glow Ring */}
              <div className="relative shrink-0 group">
                <div className={`absolute -inset-0.5 rounded-full blur opacity-40 transition-opacity duration-300 group-hover/header:opacity-80 ${
                  recipientPresence.status === 'online' ? 'bg-[#22C55E]' : 'bg-violet-500/20'
                }`} />
                <img
                  src={match.user?.photos?.[0] || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + matchName}
                  alt=""
                  className={`relative h-[56px] w-[56px] rounded-full object-cover border-2 border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.6)] ${!match.isRevealed ? 'blur-[2px]' : ''}`}
                  loading="lazy"
                />
                {recipientPresence.status === 'online' && (
                  <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#09090B] bg-[#22C55E] shadow-[0_0_12px_rgba(34,197,94,0.8)] animate-pulse" />
                )}
              </div>
              
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white tracking-wide truncate group-hover/header:text-violet-400 transition-colors">{matchName}</h2>
                <p className={`text-[11px] font-semibold flex items-center gap-1.5 mt-0.5 transition-colors duration-200 ${
                  activeStatusStr === 'Typing...' ? 'text-blue-400 animate-pulse' :
                  recipientPresence.status === 'online' ? 'text-[#22C55E]' :
                  recipientPresence.status === 'idle' ? 'text-amber-400' :
                  'text-zinc-400'
                }`}>
                  {activeStatusStr}
                </p>
              </div>
            </div>
          </div>

          {/* Redesigned Header Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={() => toast.info('Voice call initiation coming soon')}
              className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] hover:scale-105 active:scale-95 rounded-xl transition-all"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button 
              onClick={() => toast.info('Video call initiation coming soon')}
              className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] hover:scale-105 active:scale-95 rounded-xl transition-all"
            >
              <Video className="w-4 h-4" />
            </button>
            {toggleSidebar && (
              <button 
                onClick={toggleSidebar}
                className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] hover:scale-105 active:scale-95 rounded-xl transition-all"
                title="Toggle sidebar info"
              >
                <Info className="w-4 h-4" />
              </button>
            )}
            
            {!match.isRevealed && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => revealIdentity(matchId!)}
                className="ml-2 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-[11px] font-bold text-white shrink-0 shadow-lg shadow-violet-950/30 transition-all"
              >
                <Eye className="h-3.5 w-3.5" /> Reveal Identity
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef} 
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto scrollbar-thin relative transition-colors z-10 ${
          isDragging ? 'bg-violet-950/10' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-[#09090B]/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center pointer-events-none">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3 p-8 border border-white/[0.08] rounded-3xl bg-zinc-950/80 shadow-2xl max-w-xs text-center"
            >
              <div className="p-4 bg-violet-500/10 rounded-2xl text-violet-400">
                <Paperclip className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-xs font-semibold text-white">Drop files to send</h3>
              <p className="text-[10px] text-zinc-500 leading-normal">Share photos, PDFs, and ZIP documents up to 10MB</p>
            </motion.div>
          </div>
        )}

        <div className="max-w-[900px] mx-auto w-full px-6 py-6 space-y-4">
          {groupedMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none opacity-60 min-h-[300px]">
              <span className="text-3xl mb-2 animate-bounce">👋</span>
              <p className="text-xs text-zinc-400 font-medium">No messages yet. Send a wave to start the chat!</p>
            </div>
          ) : (
            groupedMessages.map((group, gIdx) => {
              const showDateDivider = gIdx === 0 || 
                new Date(group.messages[0].timestamp).toDateString() !== 
                new Date(groupedMessages[gIdx - 1].messages[0].timestamp).toDateString();

              return (
                <div key={gIdx} className="flex flex-col">
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-6 select-none">
                      <div className="h-px bg-white/[0.05] flex-1 max-w-[150px]" />
                      <span className="text-[9px] uppercase tracking-widest font-mono text-zinc-550 px-4 font-bold">
                        {formatDividerDate(group.messages[0].timestamp)}
                      </span>
                      <div className="h-px bg-white/[0.05] flex-1 max-w-[150px]" />
                    </div>
                  )}

                  <div className={`flex gap-3.5 mb-2 ${group.isOwn ? 'justify-end' : 'justify-start'}`}>
                    {/* Sender Avatar - displayed only once per incoming group */}
                    {!group.isOwn && (
                      <div className="w-8 shrink-0 flex items-end mb-1">
                        <img
                          src={group.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + matchName}
                          alt=""
                          className={`h-8 w-8 rounded-full object-cover border border-white/[0.06] ${!match.isRevealed ? 'blur-[1.5px]' : ''}`}
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Message Group Bubbles list */}
                    <div className="flex flex-col space-y-1 max-w-[65%]">
                      {group.messages.map((msg: any, mIdx: number) => {
                        const isHovered = hoveredMessageId === msg.id || hoveredMessageId === msg._id;
                        const isEmojiOpen = showEmojiPickerForMsg === msg.id || showEmojiPickerForMsg === msg._id;
                        const keyId = msg.id || msg._id;

                        return (
                          <motion.div 
                            key={keyId}
                            data-msg-id={keyId}
                            data-sender-id={msg.senderId}
                            data-res-state={getResonanceState(msg)}
                            initial={{ opacity: 0, x: group.isOwn ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                            className={`relative group flex items-center gap-2.5 ${group.isOwn ? 'justify-end ml-auto' : 'justify-start mr-auto'}`}
                            onMouseEnter={() => setHoveredMessageId(keyId)}
                            onMouseLeave={() => {
                              setHoveredMessageId(null);
                              setShowEmojiPickerForMsg(null);
                            }}
                          >
                            {/* Outgoing hover menu */}
                            {group.isOwn && isHovered && msg.retentionMode !== 'VIEW_ONCE' && (
                              <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-white/[0.06] rounded-xl shadow-lg shrink-0 scale-90 origin-right transition-all">
                                <button 
                                  onClick={() => setShowEmojiPickerForMsg(isEmojiOpen ? null : keyId)}
                                  className="p-1 text-zinc-400 hover:text-white transition-colors"
                                >
                                  <Smile className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleCopyText(msg.text)}
                                  className="p-1 text-zinc-400 hover:text-white transition-colors"
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
                                  className="p-1 text-zinc-400 hover:text-white transition-colors"
                                  title="Forward message"
                                >
                                  <Forward className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Msg Bubble */}
                            <div 
                              className="relative"
                              onContextMenu={(e) => handleContextMenu(e, msg, group.isOwn)}
                              onMouseDown={(e) => handleMouseDown(e, msg, group.isOwn)}
                              onMouseUp={handleMouseUp}
                              onMouseLeave={handleMouseUp}
                              onTouchStart={(e) => handleTouchStart(e, msg, group.isOwn)}
                              onTouchEnd={handleTouchEnd}
                              onTouchMove={handleTouchEnd}
                            >
                              <div
                                className={`px-4 py-3 rounded-[24px] text-xs leading-relaxed shadow-md transition-all ${
                                  group.isOwn
                                    ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-br-[4px] shadow-[0_4px_16px_rgba(124,58,237,0.2)] hover:-translate-y-[1px]'
                                    : 'bg-[#24242E] border border-white/[0.05] text-zinc-100 rounded-bl-[4px] shadow-sm hover:-translate-y-[1px]'
                                }`}
                              >
                                {msg.retentionMode === 'VIEW_ONCE' ? (
                                  msg.viewed ? (
                                    <div className="flex items-center gap-1.5 py-1 text-zinc-450 font-medium">
                                      <Flame className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                                      <span>{group.isOwn ? 'Opened' : 'You opened this message.'}</span>
                                      <span className="text-[9px] text-zinc-550 italic font-mono shrink-0 ml-1">(disappeared)</span>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={!group.isOwn ? () => preloadViewOnce(msg, group.senderName) : undefined}
                                      className={!group.isOwn ? "cursor-pointer" : ""}
                                    >
                                      {group.isOwn ? (
                                        <div className="flex items-center gap-2 py-1 select-none opacity-85">
                                          <Lock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                                          <div className="flex flex-col">
                                            <span className="font-semibold text-amber-300">View Once Message</span>
                                            <span className="text-[9px] text-zinc-400">Waiting for recipient to open</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2.5 py-1.5 select-none active:opacity-70 group/once">
                                          <Flame className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
                                          <div className="flex flex-col">
                                            <span className="font-bold text-amber-400 group-hover/once:underline">View Once Message</span>
                                            <span className="text-[9px] text-zinc-400">Click to open & view now</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                ) : (
                                  <>
                                    {/* Render Attachments */}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                      <div className="space-y-2 mb-2 max-w-[280px]">
                                        {msg.attachments.map((file: any, fIdx: number) => {
                                          const isImage = file.mimeType.startsWith('image/');
                                          if (isImage) {
                                            return (
                                              <div 
                                                key={fIdx} 
                                                className="relative rounded-2xl overflow-hidden border border-white/[0.08] cursor-zoom-in group/img shadow-md"
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
                                                  className="max-h-[180px] w-full object-cover rounded-2xl hover:scale-105 transition-transform duration-300"
                                                  loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                                  <ImageIcon className="w-5 h-5 text-white animate-pulse" />
                                                </div>
                                              </div>
                                            );
                                          }

                                          return (
                                            <div key={fIdx} className="flex items-center gap-3 p-3 bg-zinc-950/40 border border-white/[0.06] rounded-2xl">
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
                                  </>
                                )}
                                
                                {/* Time & Read Receipts */}
                                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] select-none font-mono text-zinc-500">
                                  <span>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {group.isOwn && (
                                    <span className="ml-1 select-none text-[10px] leading-none shrink-0">
                                      {msg.status === 'seen' || msg.read || getResonanceState(msg) === 'absorbed' ? (
                                        <span className="text-blue-400 font-bold">✓✓</span>
                                      ) : msg.status === 'delivered' || getResonanceState(msg) === 'harmonized' ? (
                                        <span className="text-zinc-450 font-bold">✓✓</span>
                                      ) : (
                                        <span className="text-zinc-550 font-medium">✓</span>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Reaction Emojis list overlay */}
                              {msg.reactions && msg.reactions.length > 0 && (
                                <div className="absolute -bottom-2 right-2 flex gap-0.5 bg-zinc-950 border border-white/[0.06] px-1.5 py-0.5 rounded-full shadow-md text-[10px] z-10 animate-bounce">
                                  {msg.reactions.map((r: any, rIdx: number) => (
                                    <span key={rIdx} title={r.userEmail}>{r.emoji}</span>
                                  ))}
                                </div>
                              )}

                              {/* Reaction Picker overlay */}
                              {isEmojiOpen && (
                                <div className="absolute -top-10 right-0 bg-zinc-950 border border-white/[0.08] px-2 py-1 rounded-full flex gap-1.5 shadow-2xl z-50">
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
                              <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-white/[0.06] rounded-xl shadow-lg shrink-0 scale-90 origin-left transition-all">
                                <button 
                                  onClick={() => setShowEmojiPickerForMsg(isEmojiOpen ? null : keyId)}
                                  className="p-1 text-zinc-450 hover:text-white transition-colors"
                                >
                                  <Smile className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleCopyText(msg.text)}
                                  className="p-1 text-zinc-450 hover:text-white transition-colors"
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
                                  className="p-1 text-zinc-450 hover:text-white transition-colors"
                                  title="Forward message"
                                >
                                  <Forward className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {/* Animated typing dots indicator */}
          {typingMatchId === matchId && (
            <div className="flex items-center gap-1.5 select-none text-[10px] text-zinc-500 font-mono pl-12 py-1">
              <span className="h-1.5 w-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.1s]" />
              <span className="h-1.5 w-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.3s]" />
              <span className="h-1.5 w-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.5s]" />
              <span className="text-[9px] text-zinc-500 font-semibold ml-1">typing...</span>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>
      </div>

      {/* Floating New Messages Scroll Alert Pill */}
      <AnimatePresence>
        {showNewMessagesPill && unreadCountSinceScroll > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={() => {
              messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
              setShowNewMessagesPill(false);
              setUnreadCountSinceScroll(0);
            }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold shadow-xl shadow-violet-950/40 border border-violet-500/20"
          >
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
            <span>{unreadCountSinceScroll} New Message{unreadCountSinceScroll > 1 ? 's' : ''}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Redesigned Floating Glass Input Composer */}
      <div className="relative z-10 safe-bottom shrink-0 select-none pb-4 px-6 max-w-[900px] mx-auto w-full">
        {replyParentMsg && (
          <div className="w-full px-5 py-2">
            <div className="bg-[#111118]/90 border border-white/[0.08] backdrop-blur-md rounded-2xl p-3 flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2 text-zinc-300">
                <Reply className="w-3.5 h-3.5 text-violet-400" />
                <span>Replying to <span className="font-bold text-violet-400">Message</span>: </span>
                <span className="text-zinc-450 italic truncate max-w-[300px]">{replyParentMsg.text || 'Media attachment'}</span>
              </div>
              <button 
                onClick={() => setReplyParentMsg(null)}
                className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {uploadProgress !== null && (
          <div className="w-full px-5 py-2">
            <div className="bg-zinc-900/80 border border-white/[0.08] backdrop-blur-md rounded-2xl p-3 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-violet-500 animate-spin shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                  <span>Uploading file...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-850 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-violet-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="glass-strong rounded-full border border-white/[0.08] px-4 py-2 shadow-2xl flex gap-2 items-center bg-[#111118]/90 backdrop-blur-md">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect} 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress !== null}
            className="p-2 text-zinc-450 hover:text-white rounded-full hover:bg-white/[0.06] disabled:opacity-40 transition-all shrink-0"
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
            className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder:text-zinc-550 outline-none caret-violet-500"
          />

          {/* Retention Mode Toggle */}
          <div className="flex items-center gap-0.5 bg-zinc-950/60 border border-white/[0.04] p-0.5 rounded-full text-[10px] select-none text-zinc-400 shrink-0">
            <button 
              onClick={() => handleModeChange('VIEW_ONCE')}
              className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
                retentionMode === 'VIEW_ONCE' ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/20' : 'hover:text-zinc-200'
              }`}
              title="View Once (Snapchat mode)"
            >
              <Flame className="w-2.5 h-2.5 shrink-0" />
              <span className="hidden sm:inline">View Once</span>
            </button>
            <button 
              onClick={() => handleModeChange('NEVER_DELETE')}
              className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
                retentionMode === 'NEVER_DELETE' ? 'bg-violet-500/20 text-violet-400 font-bold border border-violet-500/20' : 'hover:text-zinc-200'
              }`}
              title="Never Delete (Standard mode)"
            >
              <Infinity className="w-2.5 h-2.5 shrink-0" />
              <span className="hidden sm:inline">Never Delete</span>
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!text.trim() || isSending || uploadProgress !== null}
            className={`h-8 w-8 rounded-full flex items-center justify-center text-white shrink-0 transition-all shadow-md ${
              text.trim() ? 'bg-violet-600 hover:bg-violet-700 shadow-[0_0_12px_rgba(139,92,246,0.4)]' : 'bg-zinc-800 opacity-40 cursor-default'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
          </motion.button>
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
              onClick={closeMediaViewer}
            >
              {/* Top Action Bar */}
              <div 
                className="w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 p-4 flex items-center justify-between z-10"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <button 
                    onClick={closeMediaViewer}
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
                    onClick={closeMediaViewer}
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
                  onClick={closeMediaViewer}
                >
                  {mediaLoading ? (
                    <div className="flex flex-col items-center gap-3 text-center" onClick={e => e.stopPropagation()}>
                      <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                      <span className="text-xs text-zinc-400 font-medium font-mono">Preloading secure media...</span>
                    </div>
                  ) : mediaLoadError ? (
                    <div className="flex flex-col items-center gap-4 text-center select-none" onClick={e => e.stopPropagation()}>
                      <Flame className="w-10 h-10 text-rose-500 animate-pulse" />
                      <h3 className="text-zinc-200 font-medium text-sm">Unable to load media</h3>
                      <p className="text-xs text-zinc-550 max-w-xs">{mediaLoadError}</p>
                      <button 
                        onClick={() => preloadViewOnce({ attachments: [activeMedia.file], timestamp: activeMedia.timestamp, id: activeMedia.msgId, messageType: activeMedia.messageType, text: activeMedia.text }, activeMedia.senderName)}
                        className="px-4 py-2 bg-violet-650 hover:bg-violet-750 text-white rounded-xl text-xs font-semibold font-mono transition-colors shadow-[0_0_12px_rgba(109,40,217,0.3)]"
                      >
                        Retry Loading
                      </button>
                    </div>
                  ) : activeMedia.messageType === 'text' ? (
                    <div 
                      className="p-8 border border-white/[0.08] rounded-3xl bg-zinc-900/80 shadow-2xl max-w-md text-center flex flex-col items-center gap-4 backdrop-blur-xl"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500 animate-pulse">
                        <Flame className="w-8 h-8" />
                      </div>
                      <h3 className="text-sm font-semibold text-white">Disappearing Message</h3>
                      <p className="text-zinc-200 text-sm font-medium leading-relaxed font-mono px-4 py-3 bg-zinc-950/60 rounded-2xl border border-white/[0.04] select-text">
                        {activeMedia.text}
                      </p>
                    </div>
                  ) : (activeMedia.messageType === 'document' || activeMedia.messageType === 'file') ? (
                    <div 
                      className="p-8 border border-white/[0.08] rounded-3xl bg-zinc-900/80 shadow-2xl max-w-md text-center flex flex-col items-center gap-4 backdrop-blur-xl"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400">
                        <FileText className="w-8 h-8" />
                      </div>
                      <h3 className="text-sm font-semibold text-white">{activeMedia.file.fileName}</h3>
                      <span className="text-[10px] font-mono text-zinc-500">{(activeMedia.file.fileSize / 1024).toFixed(1)} KB</span>
                      <p className="text-zinc-400 text-xs leading-relaxed italic">
                        {activeMedia.text || 'Secure document attachment'}
                      </p>
                    </div>
                  ) : (
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
                  )}
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
                {activeMedia.isViewOnce ? (
                  <div className="flex items-center justify-center gap-2 text-amber-400 font-medium py-2 px-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-center select-none font-mono max-w-md">
                    <Flame className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                    <span>This View Once message will disappear permanently after you close this screen.</span>
                  </div>
                ) : (
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs transition-colors"
                    >
                      <Forward className="w-3.5 h-3.5" /> Forward
                    </button>

                    <a
                      href={activeMedia.file.downloadUrl}
                      download={activeMedia.file.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>

                    <button
                      onClick={() => {
                        setText(prev => `Replying to image: "${activeMedia.file.fileName}"\n${prev}`);
                        setActiveMedia(null);
                        toast.success('Replied with image reference!');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs transition-colors"
                    >
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </button>

                    <button
                      onClick={() => {
                        toast.success('Saved to Favorites ⭐');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs transition-colors"
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
                )}

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
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-600/20 border border-violet-900/60 text-violet-300 text-[10px] font-medium"
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
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-600 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none transition-colors"
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
                              <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-semibold uppercase">
                                {(m.anonymousName || 'D')[0]}
                              </div>
                              <span className="text-xs text-zinc-200 font-medium">{m.anonymousName || 'Anonymous Student'}</span>
                            </div>
                            <div className={`h-4 w-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-violet-600 border-violet-600 text-white' : 'border-zinc-800'}`}>
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
                              <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-semibold uppercase">
                                {g.name[0]}
                              </div>
                              <span className="text-xs text-zinc-200 font-medium">{g.name}</span>
                            </div>
                            <div className={`h-4 w-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-violet-600 border-violet-600 text-white' : 'border-zinc-800'}`}>
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
                    className="rounded border-zinc-800 text-violet-600 focus:ring-violet-600/40"
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
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder:text-zinc-650 outline-none focus:border-violet-600 resize-none transition-colors"
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
                        setActiveMedia(null);
                      } else {
                        toast.error(res?.error || 'Failed to forward message.');
                      }
                    }}
                    disabled={selectedTargets.length === 0}
                    className="px-5 py-2.5 bg-violet-600 hover:bg-violet-755 disabled:opacity-40 rounded-xl text-white text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all"
                  >
                    Forward ({selectedTargets.length})
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Floating Context Menu */}
      {showMenu && selectedMenuMsg && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/10 transition-opacity"
          onClick={() => setShowMenu(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ top: menuCoords.y, left: menuCoords.x }}
            className="absolute bg-zinc-950/85 backdrop-blur-xl border border-white/[0.08] shadow-2xl rounded-3xl w-[240px] overflow-hidden z-[100000] p-1.5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Section - Reaction Bar */}
            <div className="flex items-center justify-between px-2.5 py-2 border-b border-white/[0.06] mb-1.5">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {REACTION_OPTIONS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.25 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    onClick={() => handleContextReact(emoji)}
                    className="text-lg p-0.5 leading-none"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
              <button 
                onClick={() => {
                  toast.info('More reactions coming soon! ✨');
                }}
                className="text-zinc-500 hover:text-zinc-300 text-xs font-semibold pl-1 border-l border-white/[0.06]"
              >
                ➕
              </button>
            </div>

            {/* Menu Options */}
            <div className="space-y-0.5 text-xs text-zinc-300 font-medium">
              <button
                onClick={() => {
                  setReplyParentMsg(selectedMenuMsg);
                  setShowMenu(false);
                  toast.success('Replying to message...');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] rounded-xl text-left transition-colors"
              >
                <Reply className="w-4 h-4 text-zinc-450" />
                <span>Reply</span>
              </button>

              {selectedMenuMsg.messageType === 'text' && selectedMenuMsg.retentionMode !== 'VIEW_ONCE' && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedMenuMsg.text);
                    toast.success('Copied text to clipboard! 📋');
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] rounded-xl text-left transition-colors"
                >
                  <Copy className="w-4 h-4 text-zinc-450" />
                  <span>Copy Text</span>
                </button>
              )}

              <button
                onClick={() => {
                  toast.success('Link copied for sharing! 📤');
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] rounded-xl text-left transition-colors"
              >
                <Share2 className="w-4 h-4 text-zinc-450" />
                <span>Share Link</span>
              </button>

              {selectedMenuMsg.retentionMode !== 'VIEW_ONCE' && (
                <>
                  <button
                    onClick={() => {
                      toast.success('Message saved to Favorites! ⭐');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] rounded-xl text-left transition-colors"
                  >
                    <Star className="w-4 h-4 text-zinc-450" />
                    <span>Save to Favorites</span>
                  </button>

                  <button
                    onClick={handleContextPin}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] rounded-xl text-left transition-colors"
                  >
                    <Pin className="w-4 h-4 text-zinc-450" />
                    <span>{selectedMenuMsg.pinned ? 'Unpin Message' : 'Pin Message'}</span>
                  </button>

                  <button
                    onClick={handleContextBookmark}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] rounded-xl text-left transition-colors"
                  >
                    <Bookmark className="w-4 h-4 text-zinc-450" />
                    <span>{selectedMenuMsg.bookmarkedBy?.includes(useAuthStore.getState().uid) ? 'Remove Bookmark' : 'Bookmark Message'}</span>
                  </button>

                  {((selectedMenuMsg.attachments && selectedMenuMsg.attachments.length > 0) || selectedMenuMsg.imageUrl || selectedMenuMsg.documentUrl) && (
                    <a
                      href={selectedMenuMsg.attachments?.[0]?.downloadUrl || selectedMenuMsg.imageUrl || selectedMenuMsg.documentUrl}
                      download
                      onClick={() => setShowMenu(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] rounded-xl text-left transition-colors"
                    >
                      <Download className="w-4 h-4 text-zinc-450" />
                      <span>Download</span>
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setForwardingMedia({
                        msgId: selectedMenuMsg.id || selectedMenuMsg._id,
                        text: selectedMenuMsg.text || '',
                        messageType: selectedMenuMsg.messageType || 'text',
                        file: selectedMenuMsg.attachments && selectedMenuMsg.attachments.length > 0 ? selectedMenuMsg.attachments[0] : null
                      });
                      setSelectedTargets([]);
                      setCustomCaption(selectedMenuMsg.text || '');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] rounded-xl text-left transition-colors"
                  >
                    <Forward className="w-4 h-4 text-zinc-450" />
                    <span>Forward Message</span>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  setShowDetailsMsg(selectedMenuMsg);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] rounded-xl text-left transition-colors"
              >
                <Info className="w-4 h-4 text-zinc-450" />
                <span>Message Details</span>
              </button>

              {/* Danger Actions Section */}
              <div className="border-t border-white/[0.06] mt-1.5 pt-1.5">
                <button
                  onClick={handleContextDeleteForMe}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-rose-500/10 text-rose-400 rounded-xl text-left transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-rose-500/80" />
                  <span>Delete for Me</span>
                </button>

                {(String(selectedMenuMsg.senderId) === String(useAuthStore.getState().uid) || String(selectedMenuMsg.senderId) === String(useAuthStore.getState()._id)) && (
                  <button
                    onClick={handleContextDeleteForEveryone}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-rose-500/10 text-rose-400 rounded-xl text-left transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>Delete for Everyone</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmMsg && createPortal(
        <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-zinc-950 border border-white/[0.08] rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center select-none"
          >
            <div className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl w-fit mx-auto mb-4">
              <Trash2 className="w-7 h-7 animate-pulse" />
            </div>
            <h3 className="text-zinc-200 font-semibold text-sm">Delete Message</h3>
            <p className="text-zinc-450 text-xs mt-2 leading-relaxed">
              {deleteType === 'everyone' 
                ? "This message will disappear for everyone."
                : "This message will be removed from your chat history."
              }
            </p>
            <div className="flex gap-2.5 mt-5">
              <button 
                onClick={() => setShowDeleteConfirmMsg(null)}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all shadow-[0_0_12px_rgba(220,38,38,0.2)]"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Message Details Modal */}
      {showDetailsMsg && createPortal(
        <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-zinc-950 border border-white/[0.08] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden select-none"
          >
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">Message Details</h3>
              <button 
                onClick={() => setShowDetailsMsg(null)}
                className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs text-zinc-400 font-medium">
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                <span>Message ID</span>
                <span className="font-mono text-[10px] text-zinc-500 select-all">{showDetailsMsg.id || showDetailsMsg._id}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                <span>Retention Mode</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${showDetailsMsg.retentionMode === 'VIEW_ONCE' ? 'bg-amber-500/10 text-amber-500' : 'bg-violet-500/10 text-violet-400'}`}>
                  {showDetailsMsg.retentionMode === 'VIEW_ONCE' ? 'View Once (disappearing)' : 'Never Delete'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                <span>Format</span>
                <span className="capitalize">{showDetailsMsg.messageType}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                <span>Sent Time</span>
                <span className="text-zinc-300 font-mono">{new Date(showDetailsMsg.timestamp).toLocaleString()}</span>
              </div>
              {showDetailsMsg.seenAt && (
                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                  <span>Seen Time</span>
                  <span className="text-blue-400 font-mono">{new Date(showDetailsMsg.seenAt).toLocaleString()}</span>
                </div>
              )}
              {showDetailsMsg.deliveredAt && (
                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                  <span>Delivered Time</span>
                  <span className="text-zinc-350 font-mono">{new Date(showDetailsMsg.deliveredAt).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                <span>Sender ID</span>
                <span className="font-mono text-[10px] text-zinc-500 select-all">{showDetailsMsg.senderId}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                <span>Receiver ID</span>
                <span className="font-mono text-[10px] text-zinc-500 select-all">{showDetailsMsg.receiverId || 'N/A'}</span>
              </div>
              {showDetailsMsg.attachments?.[0] && (
                <>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                    <span>File Name</span>
                    <span className="truncate max-w-[200px] text-zinc-300">{showDetailsMsg.attachments[0].fileName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                    <span>File Size</span>
                    <span className="text-zinc-300">{(showDetailsMsg.attachments[0].fileSize / 1024).toFixed(1)} KB</span>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 bg-zinc-950/80 border-t border-white/[0.06] flex justify-end">
              <button 
                onClick={() => setShowDetailsMsg(null)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-755 text-white rounded-xl text-xs font-semibold font-mono transition-colors shadow-md"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {!embeddedMatchId && <BottomTabBar />}
    </div>
  );
}
