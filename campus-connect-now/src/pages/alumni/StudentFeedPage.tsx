import { useState, useRef, useEffect } from 'react';
import { useFeedStore } from '@/store/feedStore';
import { PostCard } from '@/components/PostCard';
import { PostDetailModal } from '@/components/common/PostDetailModal';

import { StoryBar, StoryViewer } from '@/components/StoryBar';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, X, Send, Image as ImageIcon, Sparkles, Users, Flame, Trophy, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PostCategory } from '@/types';
import { useNavigate } from 'react-router-dom';
import { matchApi } from '@/services/api';
import { toast } from 'sonner';
import { uploadMediaFile } from '@/services/uploadService';

const FEED_TABS = [
  { key: 'all' as const, label: 'All Campus', icon: Sparkles },
  { key: 'projects' as const, label: 'Projects Showcase', icon: Flame },
  { key: 'certifications' as const, label: 'Certifications', icon: Trophy },
  { key: 'events' as const, label: 'Clubs & Events', icon: Users },
];

type FeedTab = 'all' | PostCategory;

const CATEGORIES: { key: PostCategory; label: string }[] = [
  { key: 'general', label: '💬 General' },
  { key: 'projects', label: '🚀 Project Showcase' },
  { key: 'certifications', label: '📜 Certification/Achievement' },
  { key: 'events', label: '📅 Event/Club Activity' },
];

export default function StudentFeedPage() {
  const posts = useFeedStore(s => s.posts);
  const isLoading = useFeedStore(s => s.isLoading);
  const fetchPosts = useFeedStore(s => s.fetchPosts);
  const createPost = useFeedStore(s => s.createPost);

  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [postText, setPostText] = useState('');
  const [postCategory, setPostCategory] = useState<PostCategory>('general');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [suggestedStudents, setSuggestedStudents] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load feed posts
  useEffect(() => {
    fetchPosts(activeTab);
  }, [activeTab, fetchPosts]);

  // Load suggested connections
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const res = await matchApi.getSwipePool();
        if (res && res.success) {
          setSuggestedStudents(res.data.slice(0, 3));
        }
      } catch (e) {
        console.error('Failed to load suggested students:', e);
      }
    };
    loadSuggestions();
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.loading('Uploading post image...', { id: 'feed-img' });
      const res = await uploadMediaFile(file, '/api/posts/upload');
      if (res.success && res.url) {
        setImagePreview(res.url);
        toast.success('Image ready!', { id: 'feed-img' });
      } else {
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
        toast.success('Image selected!', { id: 'feed-img' });
      }
    } catch (err) {
      toast.error('Failed to upload post image', { id: 'feed-img' });
    }
  };

  const handlePost = async () => {
    if (!postText.trim() && !imagePreview) {
      toast.error('Please enter some text or select an image/video to share.');
      return;
    }
    await createPost(postText.trim(), isAnonymous, imagePreview ?? undefined, postCategory);
    setPostText('');
    setImagePreview(null);
    setPostCategory('general');
    setShowCreate(false);
  };

  const handleConnect = async (targetId: string, targetName: string) => {
    try {
      const res = await matchApi.sendConnectionRequest(targetId);
      if (res.success) {
        toast.success(res.matched ? `Connected with ${targetName}! 🎉` : `Connection request sent to ${targetName}!`);
        setSuggestedStudents(prev => prev.filter(s => s.userId !== targetId));
      } else {
        toast.error(res.error || 'Failed to connect');
      }
    } catch (err) {
      toast.error('Failed to connect');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground font-sans page-transition">
      <StoryViewer />

      {/* Redesigned Glass Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Student Campus Feed
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Explore student project showcase and campus clubs</p>
          </div>
          <button 
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/95 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>

        {/* 4 Categorized Horizontal Tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1">
          {FEED_TABS.map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                  isTabActive 
                    ? 'bg-primary/10 text-primary border-transparent' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Story Section */}
        <StoryBar />

        {/* Create Post Card (Hidden by default, triggered by click) */}
        <AnimatePresence>
          {showCreate && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card p-4 relative border border-white/[0.08]"
            >
              <button 
                onClick={() => setShowCreate(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-xs font-bold text-foreground mb-3">Create Social Post</h3>
              <textarea 
                value={postText}
                onChange={e => setPostText(e.target.value)}
                placeholder="What is happening on campus?"
                className="w-full bg-[#101015]/60 border border-zinc-900 rounded-xl p-3 text-xs min-h-[90px] focus:outline-none focus:border-primary placeholder:text-muted-foreground text-white"
              />

              {imagePreview && (
                <div className="mt-3 relative inline-block">
                  <img src={imagePreview} alt="Upload preview" className="max-h-32 rounded-xl object-cover" />
                  <button 
                    onClick={() => setImagePreview(null)}
                    className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-zinc-900/80 hover:bg-zinc-900 border border-white/10 text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => fileRef.current?.click()}
                    className="p-2 bg-secondary/80 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

                  <select 
                    value={postCategory} 
                    onChange={e => setPostCategory(e.target.value as PostCategory)}
                    className="bg-[#101015] border border-zinc-900 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground font-bold focus:outline-none"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`text-[10px] font-bold px-2 py-1.5 rounded-xl border transition-colors ${
                      isAnonymous 
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-500' 
                        : 'border-white/[0.04] text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Anonymous
                  </button>
                  <button 
                    onClick={handlePost}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-colors"
                  >
                    Post <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Posts lists container */}
        {isLoading ? (
          <div className="flex flex-col gap-4 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState title="Feed is empty" description="Check back later for student projects!" />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id || post._id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* Suggested Connections Widget (Mobile/Tablet only) */}
      {suggestedStudents.length > 0 && (
        <div className="lg:hidden px-5 mb-4 mt-2">
          <div className="glass-card p-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-accent" /> Suggested Connections
            </h3>
            <div className="space-y-3">
              {suggestedStudents.map((stud) => (
                <div key={stud.userId} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={stud.photos?.[0] || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + stud.userId} 
                      alt="" 
                      className="h-9 w-9 rounded-full object-cover" 
                      loading="lazy"
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{stud.name}</p>
                      <p className="text-[10px] text-muted-foreground">{stud.department} · {stud.batch}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleConnect(stud.userId, stud.name)}
                    className="p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <PostDetailModal />
    </div>
  );
}
