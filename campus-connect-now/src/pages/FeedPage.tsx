import { useState, useRef, useEffect } from 'react';
import { useFeedStore } from '@/store/feedStore';
import { PostCard } from '@/components/PostCard';
import { BottomTabBar } from '@/components/BottomTabBar';
import { StoryBar, StoryViewer } from '@/components/StoryBar';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, X, Send, Image as ImageIcon, Sparkles, Users, Flame, Trophy, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PostCategory } from '@/types';
import { useNavigate } from 'react-router-dom';
import { matchApi } from '@/services/api';
import { toast } from 'sonner';

const FEED_TABS = [
  { key: 'all' as const, label: 'All Community', icon: Sparkles },
  { key: 'projects' as const, label: 'Projects & Startups', icon: Flame },
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

export default function FeedPage() {
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!postText.trim() && !imagePreview) return;
    await createPost(postText.trim(), isAnonymous, imagePreview ?? undefined, postCategory);
    setPostText('');
    setImagePreview(null);
    setPostCategory('general');
    setShowCreate(false);
  };

  const handleConnect = async (studentId: string, name: string) => {
    try {
      const res = await matchApi.sendConnectionRequest(studentId);
      if (res && res.success) {
        toast.success(`Connection request sent to ${name}!`);
        setSuggestedStudents(prev => prev.filter(s => s.userId !== studentId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 page-transition">
      {/* Redesigned Feed Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-border/10 bg-background/50 backdrop-blur-md sticky top-0 z-40"
      >
        {/* Top Left: Discover Students */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate('/discover')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/80 text-foreground hover:bg-secondary transition-colors text-xs font-semibold"
        >
          <Users className="h-4 w-4 text-primary" />
          <span>Discover Students</span>
        </motion.button>

        <h1 className="font-display text-lg font-bold text-foreground">Student Feed</h1>

        {/* Top Right: Create Post */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl gradient-primary text-primary-foreground glow-primary text-xs font-semibold"
        >
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span>Create Post</span>
        </motion.button>
      </motion.div>

      {/* Stories */}
      <StoryBar />
      <StoryViewer />

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-5 mt-2">
        {/* Left/Main Column: Tabs, Create Form, and Posts */}
        <div className="col-span-1 lg:col-span-8 space-y-4">
          
          {/* Feed Tabs */}
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
              {FEED_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <motion.button
                    key={tab.key}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'gradient-primary text-primary-foreground glow-primary'
                        : 'bg-secondary/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Create Post Form */}
          <AnimatePresence>
            {showCreate && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="glass-card p-4 mb-4">
                  <textarea
                    value={postText}
                    onChange={e => setPostText(e.target.value)}
                    placeholder="Share a project showcase, certification, hackathon win, or startup milestone..."
                    rows={3}
                    maxLength={500}
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
                  />
                  {imagePreview && (
                    <div className="relative mt-2 rounded-2xl overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-2xl" />
                      <button onClick={() => setImagePreview(null)} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                        <X className="h-3.5 w-3.5 text-foreground" />
                      </button>
                    </div>
                  )}

                  {/* Category Selector */}
                  <div className="mt-3 mb-2">
                    <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Post Category</p>
                    <div className="flex gap-2 flex-wrap">
                      {CATEGORIES.map(cat => (
                        <motion.button
                          key={cat.key}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => setPostCategory(cat.key)}
                          className={`text-[11px] px-3 py-1.5 rounded-full font-medium transition-all ${
                            postCategory === cat.key
                              ? 'gradient-primary text-primary-foreground'
                              : 'bg-secondary/80 text-muted-foreground'
                          }`}
                        >
                          {cat.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => fileRef.current?.click()} className="h-9 w-9 rounded-xl bg-secondary/80 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </motion.button>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setIsAnonymous(!isAnonymous)}
                        className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium ${isAnonymous ? 'gradient-primary text-primary-foreground' : 'bg-secondary/80 text-muted-foreground'}`}
                      >
                        🎭 {isAnonymous ? 'Anonymous' : 'Public'}
                      </motion.button>
                    </div>
                    <Button onClick={handlePost} disabled={!postText.trim() && !imagePreview} size="sm" className="rounded-full gradient-primary h-9 px-5 text-xs font-semibold">
                      <Send className="h-3 w-3 mr-1.5" /> Post
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Student Posts Feed */}
          <div>
            {isLoading ? (
              <p className="text-center text-xs text-muted-foreground py-10 animate-pulse">Fetching posts from MongoDB...</p>
            ) : posts.length === 0 ? (
              <EmptyState
                title={activeTab === 'all' ? 'No posts yet' : `No ${activeTab} posts`}
                description={activeTab === 'all' ? 'Be the first student to showcase an achievement!' : `No posts in this category yet.`}
              />
            ) : (
              posts.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <PostCard post={post} />
                </motion.div>
              ))
            )}
          </div>

        </div>

        {/* Right Column: Suggested Connections Sidebar (Desktop only) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          {suggestedStudents.length > 0 && (
            <div className="glass-card p-4 sticky top-20">
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
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{stud.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{stud.department} · {stud.batch}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleConnect(stud.userId, stud.name)}
                      className="p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors flex-shrink-0"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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

      <BottomTabBar />
    </div>
  );
}
