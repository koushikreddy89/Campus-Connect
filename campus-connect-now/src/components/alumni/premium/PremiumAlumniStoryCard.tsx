/**
 * Premium Alumni Story Card Component - World-Class Design
 * Supports jobs, referrals, tips, achievements, and standard posts.
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, Flame, MapPin, Briefcase, DollarSign, Calendar, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { AlumniPost } from '@/types/alumni';
import AlumniService, { alumniProfileService } from '@/services/alumniService';
import PremiumAvatar from './PremiumAvatar';
import { useAuthStore } from '@/store/authStore';

interface PremiumAlumniStoryCardProps {
  post: any; // Using any to seamlessly support both AlumniPost and AlumniPostEnhanced
  onUpdate?: (postId: string, updates: Partial<AlumniPost>) => void;
  onDelete?: (postId: string) => void;
}

function PremiumAlumniStoryCardComponent({
  post,
  onUpdate,
  onDelete,
}: PremiumAlumniStoryCardProps) {
  // Safe mapping of properties
  const authorName = post.author?.name || post.alumniName || 'Alumni Member';
  const authorAvatar = post.author?.profileImageUrl || post.alumniAvatar || '';
  const company = post.author?.company || post.company || '';
  const role = post.author?.designation || (post.author?.role && post.author.role.toLowerCase() !== 'alumni' ? post.author.role : '') || (post.role && post.role.toLowerCase() !== 'alumni' ? post.role : '') || 'Alumni Member';
  const batch = post.author?.batch || post.batch || '2022';
  const imageUrls = post.imageUrls || post.images || [];
  const postType = post.type || 'general';
  
  const initialLikes = post.likeCount !== undefined ? post.likeCount : (post.likes || 0);
  const initialCommentsCount = post.comments?.length || post.commentCount || 0;
  const initialSharesCount = post.shareCount || post.shares || 0;

  const [isLiked, setIsLiked] = useState(post.currentUserLiked || post.isLiked || (post.likes && Array.isArray(post.likes) ? post.likes.includes(useAuthStore.getState().uid) : false));
  const [likeCount, setLikeCount] = useState(post.likes && Array.isArray(post.likes) ? post.likes.length : initialLikes);
  const [isBookmarked, setIsBookmarked] = useState(post.currentUserBookmarked || post.isBookmarked || (post.saves && Array.isArray(post.saves) ? post.saves.includes(useAuthStore.getState().uid) : false));
  const [isLoadingLike, setIsLoadingLike] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentsList, setCommentsList] = useState<any[]>(post.comments || []);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const uid = useAuthStore((state) => state.uid);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (postType === 'referral') {
      alumniProfileService.trackReferralView(post.refId || post.id).catch(console.error);
    }
  }, [postType, post.id, post.refId]);

  useEffect(() => {
    if (post.likes && Array.isArray(post.likes) && uid) {
      setIsLiked(post.likes.includes(uid));
      setLikeCount(post.likes.length);
    }
    if (post.saves && Array.isArray(post.saves) && uid) {
      setIsBookmarked(post.saves.includes(uid));
    }
    if (post.comments) {
      setCommentsList(post.comments);
    }
  }, [post.likes, post.saves, post.comments, uid]);

  const handleLike = useCallback(async () => {
    try {
      setIsLoadingLike(true);
      let success = false;
      if (postType === 'referral') {
        if (!uid) {
          toast.error('You must be logged in to like');
          return;
        }
        const updated = await alumniProfileService.likeReferral(post.refId || post.id, uid);
        if (updated && updated.likes) {
          success = true;
        }
      } else {
        const token = localStorage.getItem('token') || '';
        success = await AlumniService.toggleLike(post.id, token);
      }

      if (success) {
        const newIsLiked = !isLiked;
        const newLikeCount = newIsLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
        setIsLiked(newIsLiked);
        setLikeCount(newLikeCount);
        onUpdate?.(post.id, { currentUserLiked: newIsLiked, likeCount: newLikeCount } as any);
      }
    } catch (error) {
      toast.error('Failed to like post');
    } finally {
      setIsLoadingLike(false);
    }
  }, [post.id, post.refId, postType, isLiked, likeCount, onUpdate, uid]);

  const handleBookmark = useCallback(async () => {
    try {
      if (postType === 'referral') {
        if (!uid) {
          toast.error('You must be logged in to save');
          return;
        }
        await alumniProfileService.saveReferral(post.refId || post.id, uid);
        const newSaved = !isBookmarked;
        setIsBookmarked(newSaved);
        toast.success(newSaved ? 'Saved to referrals successfully!' : 'Removed from saved referrals');
      } else {
        const token = localStorage.getItem('token') || '';
        const success = await AlumniService.toggleBookmark(post.id, token);
        if (success) {
          setIsBookmarked(!isBookmarked);
          toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
        }
      }
    } catch (error) {
      toast.error('Failed to bookmark');
    }
  }, [post.id, post.refId, postType, isBookmarked, uid]);

  const handleShare = useCallback(async () => {
    const applyUrl = post.applyLink || post.applicationUrl || `${window.location.origin}/alumni/${post.alumniId || 'explorer'}`;
    if (postType === 'referral') {
      alumniProfileService.trackReferralShare(post.refId || post.id).catch(console.error);
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${authorName}'s Referral`,
          text: post.content,
          url: applyUrl,
        });
      } catch (err) {
        console.error('Share error:', err);
      }
    } else {
      await navigator.clipboard.writeText(applyUrl);
      toast.success('Referral link copied successfully');
    }
  }, [post.alumniId, authorName, post.content, post.applyLink, post.applicationUrl, postType, post.refId, post.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setIsSubmittingComment(true);
      if (postType === 'referral') {
        if (!uid) {
          toast.error('You must be logged in to comment');
          return;
        }
        const referralData = await alumniProfileService.commentReferral(post.refId || post.id, {
          userId: uid,
          userName: user?.name || 'Student',
          userAvatar: user?.profileImageUrl || user?.profileImage || '',
          content: commentText
        });
        if (referralData && referralData.comments) {
          setCommentsList(referralData.comments);
          setCommentText('');
          toast.success('Comment added!');
          onUpdate?.(post.id, { comments: referralData.comments } as any);
        }
      } else {
        const newComment = await AlumniService.addComment(post.id, commentText);
        if (newComment) {
          const updatedComments = [...commentsList, newComment];
          setCommentsList(updatedComments);
          setCommentText('');
          toast.success('Comment added!');
          onUpdate?.(post.id, { comments: updatedComments } as any);
        }
      }
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete your comment?')) return;
    try {
      if (postType === 'referral') {
        if (!uid) return;
        const referralData = await alumniProfileService.deleteReferralComment(post.refId || post.id, commentId, uid);
        if (referralData && referralData.comments) {
          setCommentsList(referralData.comments);
          toast.success('Comment deleted!');
          onUpdate?.(post.id, { comments: referralData.comments } as any);
        }
      }
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const postTypeColors: Record<string, string> = {
    job: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-300',
    referral: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 text-emerald-300',
    internship: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30 text-indigo-300',
    achievement: 'from-amber-500/20 to-amber-600/20 border-amber-500/30 text-amber-300',
    tip: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-300',
    resource: 'from-pink-500/20 to-pink-600/20 border-pink-500/30 text-pink-300',
    event: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 text-cyan-300',
    general: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-300',
  };

  const isHotPost = likeCount > 50;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative rounded-3xl overflow-hidden group border border-white/10 hover:border-white/20 transition-all bg-slate-900/60 backdrop-blur-md"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950/90" />

      {/* Content Container */}
      <div className="relative z-10 p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <PremiumAvatar src={authorAvatar} alt={authorName} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-white truncate text-base sm:text-lg">{authorName}</h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Verified Alumni
                </span>
                {isHotPost && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300"
                  >
                    <Flame className="w-3 h-3" />
                    Hot
                  </motion.div>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium truncate">
                {company ? (
                  <>
                    {role} at{' '}
                    <span
                      onClick={() => {
                        const link = post.applyLink || post.applicationUrl;
                        if (link) {
                          if (postType === 'referral') {
                            alumniProfileService.trackReferralClick(post.refId || post.id).catch(console.error);
                          }
                          window.open(link, '_blank');
                        }
                      }}
                      className="text-blue-300 cursor-pointer hover:underline"
                    >
                      {company}
                    </span>
                  </>
                ) : role}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Batch of {batch} • {post.author?.department || 'CS'}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            {post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Just now'}
          </div>
        </div>

        {/* Contribution Type & Info Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r border ${postTypeColors[postType] || postTypeColors.general}`}>
            {postType.toUpperCase()}
          </span>

          {/* Job/Referral Info Badges */}
          {(postType === 'job' || postType === 'referral' || postType === 'internship') && (
            <>
              {post.company && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                  <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                  {post.company}
                </span>
              )}
              {post.salary && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                  <DollarSign className="w-3.5 h-3.5 text-green-400" />
                  {post.salary}
                </span>
              )}
              {post.experience && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  {post.experience}
                </span>
              )}
            </>
          )}
        </div>

        {/* Text Content */}
        <p className="text-slate-200 text-sm sm:text-base mb-6 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>

        {/* Apply Action Button */}
        {(postType === 'job' || postType === 'internship' || postType === 'referral') && (post.applyLink || post.applicationUrl) && (
          <div className="mb-6">
            <button
              onClick={() => {
                const link = post.applyLink || post.applicationUrl;
                if (link) {
                  if (postType === 'referral') {
                    alumniProfileService.trackReferralClick(post.refId || post.id).catch(console.error);
                    alumniProfileService.trackReferralApply(post.refId || post.id).catch(console.error);
                  }
                  window.open(link, '_blank');
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
            >
              Apply Now
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Images Showcase */}
        {imageUrls && imageUrls.length > 0 && (
          <div className={`grid gap-3 mb-6 ${imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {imageUrls.map((image: string, idx: number) => (
              <motion.img
                key={idx}
                whileHover={{ scale: 1.02 }}
                src={image}
                alt={`Post media ${idx + 1}`}
                className="rounded-2xl object-cover w-full h-48 sm:h-56 border border-white/10"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600';
                }}
              />
            ))}
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag: string) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/5 text-blue-300/80 border border-blue-500/10">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Metrics Footer */}
        <div className="flex items-center gap-6 text-xs sm:text-sm text-slate-400 mb-6 pb-6 border-b border-white/10">
          <div className="flex items-center gap-1.5">
            <Heart className="w-4.5 h-4.5 text-red-500" />
            <span className="font-semibold text-slate-300">{likeCount}</span>
          </div>
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 hover:text-white transition-colors">
            <MessageCircle className="w-4.5 h-4.5 text-blue-400" />
            <span className="font-semibold text-slate-300">{commentsList.length} Comments</span>
          </button>
        </div>

        {/* Action Button Strip */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLike}
            disabled={isLoadingLike}
            className={`py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm border ${
              isLiked
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border-white/5'
            }`}
          >
            <Heart className={`w-4 h-4 sm:w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            Like
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowComments(!showComments)}
            className="py-2.5 rounded-xl font-semibold bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <MessageCircle className="w-4 h-4 sm:w-5 h-5" />
            Comment
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="py-2.5 rounded-xl font-semibold bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <Share2 className="w-4 h-4 sm:w-5 h-5" />
            Share
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleBookmark}
            className={`py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm border ${
              isBookmarked
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border-white/5'
            }`}
          >
            <Bookmark className={`w-4 h-4 sm:w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            Save
          </motion.button>
        </div>

        {/* Comments Box */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-white/5 space-y-4 overflow-hidden"
            >
              {/* Form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Post
                </button>
              </form>

              {/* Comments List */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {commentsList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No comments yet. Start the conversation!</p>
                ) : (
                  commentsList.map((comm) => (
                    <div key={comm.id || comm._id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex gap-3">
                      <img
                        src={comm.author?.profileImageUrl || comm.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comm.userName}`}
                        alt={comm.userName}
                        className="w-8 h-8 rounded-full object-cover mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{comm.userName || comm.author?.name}</span>
                            <span className="text-[10px] text-slate-500">
                              {comm.createdAt ? new Date(comm.createdAt).toLocaleDateString() : 'Just now'}
                            </span>
                          </div>
                          {postType === 'referral' && comm.userId === uid && (
                            <button
                              onClick={() => handleDeleteComment(comm.id || comm._id)}
                              className="text-red-400 hover:text-red-300 text-[10px] font-semibold"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{comm.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default memo(PremiumAlumniStoryCardComponent);
