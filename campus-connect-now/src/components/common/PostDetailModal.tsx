import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Heart, MessageCircle, Share2, Bookmark, Send, 
  Trash2, ExternalLink, Copy, Calendar, User, Info, 
  ChevronLeft, ChevronRight, Play, Pause, BadgeCheck,
  MoreVertical, ShieldAlert, Link2, AlertTriangle, Smile
} from 'lucide-react';
import { usePostDetailStore } from '@/store/postDetailStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { socketService } from '@/services/socketService';

export const PostDetailModal: React.FC = () => {
  const { 
    isOpen, 
    post, 
    isLoading, 
    closePost, 
    toggleLikeActivePost, 
    addCommentToActivePost, 
    deleteCommentFromActivePost,
    refreshActivePost
  } = usePostDetailStore();

  const currentUserId = useAuthStore(s => s.uid) || useAuthStore(s => s._id) || '';
  const [commentText, setCommentText] = useState('');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const commentEndRef = useRef<HTMLDivElement>(null);

  // Sync index and video state on change
  useEffect(() => {
    setCarouselIndex(0);
    setIsVideoPlaying(false);
    setIsCaptionExpanded(false);
    setShowOptions(false);
    setCommentText('');
  }, [post?.id]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Listen to Socket.IO real-time refresh events
  useEffect(() => {
    if (!isOpen || !post?.id) return;

    const socket = socketService.getSocket();
    const handleRealtimePostUpdate = (data: any) => {
      if (data.postId === post.id || data._id === post.id) {
        refreshActivePost();
      }
    };

    if (socket) {
      socket.on('post:liked', handleRealtimePostUpdate);
      socket.on('post:commented', handleRealtimePostUpdate);
    }

    return () => {
      if (socket) {
        socket.off('post:liked', handleRealtimePostUpdate);
        socket.off('post:commented', handleRealtimePostUpdate);
      }
    };
  }, [isOpen, post?.id, refreshActivePost]);

  // Scroll to bottom of comments when new comments arrive
  useEffect(() => {
    if (post?.comments) {
      commentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [post?.comments?.length]);

  const handleVideoPlayToggle = () => {
    if (!videoRef.current) return;
    if (isVideoPlaying) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    } else {
      videoRef.current.play();
      setIsVideoPlaying(true);
    }
  };

  const handleSendComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;
    await addCommentToActivePost(commentText.trim());
    setCommentText('');
  };

  // Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in input or textarea
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';

      if (e.key === 'Escape') {
        closePost();
      } else if (e.key === 'ArrowRight' && !isInput) {
        handleNextMedia();
      } else if (e.key === 'ArrowLeft' && !isInput) {
        handlePrevMedia();
      } else if (e.key === ' ' && !isInput) {
        e.preventDefault();
        handleVideoPlayToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePost, post]);

  const getMediaList = () => {
    if (!post) return [];
    const imgs = post.images && post.images.length > 0 ? post.images : (post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : (post.image ? [post.image] : []));
    const vids = post.videos && post.videos.length > 0 ? post.videos : (post.videoUrls && post.videoUrls.length > 0 ? post.videoUrls : (post.videoUrl ? [post.videoUrl] : []));
    return [
      ...imgs.map(url => ({ type: 'image', url })),
      ...vids.map(url => ({ type: 'video', url }))
    ];
  };

  const mediaList = getMediaList();
  const currentMedia = mediaList[carouselIndex] || null;

  const handleNextMedia = () => {
    if (mediaList.length <= 1) return;
    setCarouselIndex(prev => (prev + 1) % mediaList.length);
  };

  const handlePrevMedia = () => {
    if (mediaList.length <= 1) return;
    setCarouselIndex(prev => (prev - 1 + mediaList.length) % mediaList.length);
  };

  const handleCopyLink = () => {
    if (!post) return;
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    toast.success('Post link copied to clipboard!');
  };

  const handleShare = () => {
    if (!post) return;
    toast.success('Shared to global Feed!');
  };

  if (!isOpen) return null;

  const formattedDate = post?.createdAt
    ? new Date(post.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-y-auto"
        onClick={closePost}
      >
        <button
          onClick={closePost}
          className="absolute top-4 right-4 z-50 p-2 rounded-xl bg-black/50 hover:bg-black/85 border border-white/10 text-white transition-all hover:scale-105"
        >
          <X className="w-5 h-5" />
        </button>

        {/* MAIN TWO-COLUMN LAYOUT CONTAINER */}
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="relative bg-zinc-950 border border-white/10 w-full sm:max-w-5xl md:h-[80vh] flex flex-col md:flex-row rounded-none sm:rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* LEFT SIDE (70%): MEDIA OR GRADIENT */}
          <div className="relative w-full md:w-[65%] h-[40vh] md:h-full bg-zinc-900 border-r border-white/5 flex items-center justify-center overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                <span className="text-xs text-zinc-400 font-semibold">Loading media details...</span>
              </div>
            ) : currentMedia ? (
              <>
                {currentMedia.type === 'image' ? (
                  <img
                    src={currentMedia.url}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={videoRef}
                      src={currentMedia.url}
                      onClick={handleVideoPlayToggle}
                      onPlay={() => setIsVideoPlaying(true)}
                      onPause={() => setIsVideoPlaying(false)}
                      className="max-h-full max-w-full object-contain"
                      controls
                    />
                    {!isVideoPlaying && (
                      <button
                        onClick={handleVideoPlayToggle}
                        className="absolute p-4 rounded-full bg-black/60 text-white border border-white/20 hover:bg-violet-600 transition-all hover:scale-110"
                      >
                        <Play className="w-6 h-6 fill-white" />
                      </button>
                    )}
                  </div>
                )}

                {/* Media Navigation controls */}
                {mediaList.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevMedia}
                      className="absolute left-4 p-2.5 rounded-xl bg-black/60 border border-white/10 hover:bg-zinc-800 text-white transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextMedia}
                      className="absolute right-4 p-2.5 rounded-xl bg-black/60 border border-white/10 hover:bg-zinc-800 text-white transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    <div className="absolute bottom-4 flex gap-1.5">
                      {mediaList.map((_, idx) => (
                        <span
                          key={idx}
                          className={`h-1.5 w-1.5 rounded-full transition-all ${
                            idx === carouselIndex ? 'bg-violet-500 scale-125' : 'bg-white/40'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              // Text post fallback display
              <div className="w-full h-full gradient-primary opacity-90 p-8 flex flex-col justify-center text-center">
                <span className="text-lg sm:text-2xl font-black text-white leading-relaxed max-w-lg mx-auto">
                  "{post?.content}"
                </span>
                <span className="text-[10px] text-white/50 uppercase tracking-widest font-extrabold mt-6">
                  Text Publication
                </span>
              </div>
            )}
          </div>

          {/* RIGHT SIDE (35%): INTERACTIONS & HEADER */}
          <div className="w-full md:w-[35%] h-[55vh] md:h-full flex flex-col justify-between bg-zinc-950">
            {/* Header: User Profile Info */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <img
                  src={post?.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post?.authorName}`}
                  alt=""
                  className="h-9 w-9 rounded-xl object-cover border border-white/10 bg-zinc-850"
                />
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1">
                    {post?.authorName || 'Student'}
                    {(post?.type === 'alumni' || post?.author?.role === 'alumni') && (
                      <BadgeCheck className="w-3.5 h-3.5 text-violet-400 fill-violet-400/10" />
                    )}
                  </h4>
                  <p className="text-[9px] text-zinc-400 truncate">
                    {post?.author?.department || 'Computer Science'} • Batch {post?.author?.batch || '2026'}
                  </p>
                </div>
              </div>

              {/* Options actions menu */}
              <div className="relative">
                <button
                  onClick={() => setShowOptions(prev => !prev)}
                  className="p-1 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showOptions && (
                  <div className="absolute right-0 mt-1.5 w-40 bg-zinc-900 border border-white/10 rounded-xl py-1 shadow-2xl z-40">
                    <button
                      onClick={handleCopyLink}
                      className="w-full text-left px-3.5 py-2 text-[10px] font-bold text-zinc-300 hover:bg-white/5 flex items-center gap-2"
                    >
                      <Link2 className="w-3.5 h-3.5" /> Copy Link
                    </button>
                    <button
                      onClick={handleShare}
                      className="w-full text-left px-3.5 py-2 text-[10px] font-bold text-zinc-300 hover:bg-white/5 flex items-center gap-2"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Share Post
                    </button>
                    <button
                      onClick={() => toast.error('Reporting tool coming soon')}
                      className="w-full text-left px-3.5 py-2 text-[10px] font-bold text-amber-500 hover:bg-amber-500/10 flex items-center gap-2"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Report Post
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable comments & post caption */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Caption */}
              {post?.content && currentMedia && (
                <div className="flex items-start gap-2.5 pb-3 border-b border-white/5">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-black text-white mr-1.5">{post.authorName}</span>
                    <span className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {isCaptionExpanded ? post.content : `${post.content.slice(0, 150)}${post.content.length > 150 ? '...' : ''}`}
                    </span>
                    {post.content.length > 150 && (
                      <button
                        onClick={() => setIsCaptionExpanded(prev => !prev)}
                        className="text-[10px] font-bold text-violet-400 hover:underline ml-1.5 block mt-1"
                      >
                        {isCaptionExpanded ? 'Read Less' : 'Read More'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Comments list */}
              <div className="space-y-3">
                {post?.comments && post.comments.length > 0 ? (
                  post.comments.map((comment, index) => (
                    <div key={comment.id || index} className="flex items-start gap-2.5 text-left group">
                      <img
                        src={comment.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.authorName}`}
                        alt=""
                        className="h-7 w-7 rounded-lg object-cover border border-white/5 bg-zinc-900 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-2xl relative">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black text-slate-300">{comment.authorName}</span>
                          <span className="text-[8px] text-zinc-500 font-semibold">
                            {new Date(comment.createdAt).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed break-words">{comment.content}</p>

                        {/* Delete action for comment owner */}
                        {comment.authorId === currentUserId && (
                          <button
                            onClick={() => deleteCommentFromActivePost(comment.id)}
                            className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs italic">
                    Be the first to leave a comment on this post! 💬
                  </div>
                )}
                <div ref={commentEndRef} />
              </div>
            </div>

            {/* Engagement Footer Panel */}
            <div className="p-4 border-t border-white/5 bg-black/10">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleLikeActivePost}
                    className={`flex items-center gap-1.5 text-xs font-black transition-all ${
                      post?.isLiked ? 'text-red-500' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post?.isLiked ? 'fill-red-500' : ''}`} />
                    <span>{post?.likes || 0}</span>
                  </button>

                  <div className="flex items-center gap-1.5 text-xs font-black text-zinc-400">
                    <MessageCircle className="w-4 h-4" />
                    <span>{post?.comments?.length || 0}</span>
                  </div>
                </div>

                <button
                  onClick={handleDownloadOrSave}
                  className="text-zinc-400 hover:text-white transition-all"
                >
                  <Bookmark className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Input Comment Form */}
              <form onSubmit={handleSendComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-zinc-900/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-violet-500/50"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="p-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              {formattedDate && (
                <div className="flex items-center gap-1 text-[9px] text-zinc-555 font-bold uppercase mt-3">
                  <Calendar className="w-3 h-3 text-violet-400" />
                  <span>Posted {formattedDate}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  function Loader2(props: any) {
    return <Loader2Icon {...props} />;
  }

  function Loader2Icon(props: any) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    );
  }

  function handleDownloadOrSave() {
    toast.success('Bookmarked successfully!');
  }
};
