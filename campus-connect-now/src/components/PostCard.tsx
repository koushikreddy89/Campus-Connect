import React, { useState, useEffect, memo } from 'react';
import { Post, ReactionEmoji } from '@/types';
import { Heart, MessageCircle, Bookmark, Share2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeedStore } from '@/store/feedStore';
import { usePostDetailStore } from '@/store/postDetailStore';
import { PostReactions } from '@/components/MessageReactions';
import { toast } from 'sonner';

const CATEGORY_LABELS: Record<string, string> = {
  general: '💬 General',
  events: '📅 Events',
  clubs: '👥 Clubs',
  announcements: '📢 News',
};

export const PostCard = memo(({ post }: { post: Post }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const toggleLike = useFeedStore(s => s.toggleLike);
  const toggleSave = useFeedStore(s => s.toggleSave);
  const savedPosts = useFeedStore(s => s.savedPosts);
  const addComment = useFeedStore(s => s.addComment);
  const reactToPost = useFeedStore(s => s.reactToPost);
  const incrementView = useFeedStore(s => s.incrementView);
  const isSaved = savedPosts.has(post.id);

  useEffect(() => {
    incrementView(post.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const handleComment = () => {
    if (!commentText.trim()) return;
    addComment(post.id, commentText.trim());
    setCommentText('');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Campus Connect Post', text: post.content }).catch(() => {});
    } else {
      navigator.clipboard.writeText(post.content);
      toast.success('Post copied to clipboard!');
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 mb-3 transition-all hover:border-white/[0.12]"
    >
      <div className="flex items-center gap-3 mb-3">
        <img src={post.authorAvatar} alt="" className={`h-10 w-10 rounded-full bg-secondary ${post.isAnonymous ? 'blur-[2px]' : ''}`} loading="lazy" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {post.isAnonymous ? '🎭 Anonymous' : post.authorName}
          </p>
          <p className="text-[11px] text-muted-foreground">{timeAgo(post.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {post.viewCount !== undefined && post.viewCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Eye className="h-3 w-3" />
              {post.viewCount}
            </span>
          )}
          {post.category && post.category !== 'general' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
              {CATEGORY_LABELS[post.category] ?? post.category}
            </span>
          )}
        </div>
      </div>

      <p 
        onClick={() => usePostDetailStore.getState().openPost(post.id)}
        className="text-sm text-foreground/90 leading-relaxed mb-3 cursor-pointer hover:text-foreground transition-colors"
      >
        {post.content}
      </p>
 
      {post.image && (
        <div 
          onClick={() => usePostDetailStore.getState().openPost(post.id)}
          className="rounded-xl overflow-hidden mb-3 cursor-pointer transition-transform hover:scale-[1.005]"
        >
          <img src={post.image} alt="Post" className="w-full max-h-72 object-cover" loading="lazy" />
        </div>
      )}
 
      <div className="flex items-center gap-1 pt-2 border-t border-border/50">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => toggleLike(post.id)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl hover:bg-secondary/50 transition-colors"
        >
          <Heart className={`h-4 w-4 transition-colors ${post.isLiked ? 'text-accent fill-accent' : 'text-muted-foreground'}`} />
          <span className={`text-xs ${post.isLiked ? 'text-accent font-semibold' : 'text-muted-foreground'}`}>{post.likes}</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => usePostDetailStore.getState().openPost(post.id)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl hover:bg-secondary/50 transition-colors text-muted-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs">{post.comments.length}</span>
        </motion.button>
        <PostReactions
          reactions={post.reactions}
          onReact={(emoji) => reactToPost(post.id, emoji)}
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { toggleSave(post.id); toast.success(isSaved ? 'Unsaved' : 'Post saved!'); }}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl hover:bg-secondary/50 transition-colors"
        >
          <Bookmark className={`h-4 w-4 transition-colors ${isSaved ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleShare}
          className="ml-auto flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl hover:bg-secondary/50 transition-colors text-muted-foreground"
        >
          <Share2 className="h-4 w-4" />
        </motion.button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 space-y-2 overflow-hidden">
            {post.comments.length === 0 && (
              <p className="text-xs text-muted-foreground/60 text-center py-2">No comments yet — be the first!</p>
            )}
            {post.comments.map(c => (
              <div key={c.id} className="bg-secondary/50 rounded-xl px-3 py-2">
                <p className="text-xs font-semibold text-foreground">{c.authorName}</p>
                <p className="text-xs text-foreground/80">{c.content}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-secondary/50 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary transition-shadow"
              />
              <button onClick={handleComment} className="text-xs text-primary font-semibold px-2 hover:text-primary/80 transition-colors">Post</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
PostCard.displayName = 'PostCard';
