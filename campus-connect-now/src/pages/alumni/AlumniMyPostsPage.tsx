import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/Loader';
import {
  ChevronLeft,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Edit2,
  MoreVertical,
  Sparkles,
} from 'lucide-react';
import AlumniBottomTabBar from '@/components/alumni/AlumniBottomTabBar';
import { motion } from 'framer-motion';
import AlumniService from '@/services/alumniService';
import { toast } from 'sonner';

interface Post {
  id: string;
  type: 'text' | 'job_referral' | 'hiring' | 'experience' | 'advice';
  title: string;
  content: string;
  company?: string;
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
}

const AlumniMyPostsPage: React.FC = () => {
  const navigate = useNavigate();
  const { uid, college } = useAuthStore(s => ({
    uid: s.uid,
    college: s.college || 'SR University'
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setIsLoading(true);
        // Load the logged-in alumni profile
        const myProfile = await AlumniService.profiles.getMyProfile(college);
        if (myProfile) {
          const res = await AlumniService.profiles.getPostsByAlumniId(myProfile.id, college);
          const mappedPosts = (res.data || []).map((p: any) => ({
            id: p.id || p._id,
            type: p.type || 'text',
            title: p.jobRole || p.title || 'Alumni Post Update',
            content: p.content,
            company: p.company,
            likes: p.likes?.length || 0,
            comments: p.comments?.length || 0,
            shares: p.shareCount || 0,
            created_at: p.createdAt
          }));
          setPosts(mappedPosts);
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error('Error loading posts:', error);
        toast.error('Failed to load posts');
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, [uid]);

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await AlumniService.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setSelectedPostId(null);
      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const getPostTypeLabel = (type: Post['type']): string => {
    const labels: Record<Post['type'], string> = {
      text: '📝 General Post',
      experience: '💼 Career Experience',
      job_referral: '🎯 Job Referral',
      hiring: '🚀 We\'re Hiring',
      advice: '💡 Advice/Tips',
    };
    return labels[type];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground font-sans page-transition">
      {/* Header */}
      <div className="bg-background/90 border-b border-white/[0.06] sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => navigate('/alumni/home')}
              className="p-1.5 hover:bg-secondary/50 rounded-xl transition-colors border border-white/[0.05]"
              title="Go back"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-bold">My Posts</h1>
          </div>
          <Button
            onClick={() => navigate('/alumni/post/create')}
            className="h-9 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold px-4 flex items-center gap-1 glow-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            New Post
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {posts.length === 0 ? (
          <Card className="glass-card border border-white/[0.06] text-center p-8">
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <p className="text-xs text-muted-foreground">You haven't created any posts yet</p>
              <Button
                onClick={() => navigate('/alumni/post/create')}
                className="rounded-xl gradient-primary text-primary-foreground text-xs font-semibold h-9 px-4 glow-primary"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create Your First Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map(post => (
              <Card
                key={post.id}
                className={`glass-card border border-white/[0.06] transition-all relative ${
                  selectedPostId === post.id ? 'ring-2 ring-primary/45' : ''
                }`}
              >
                <CardHeader className="pb-3 text-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> {getPostTypeLabel(post.type)}
                      </div>
                      <CardTitle className="text-sm font-bold text-foreground truncate">{post.title}</CardTitle>
                      <CardDescription className="text-[10px] text-muted-foreground mt-0.5">{formatDate(post.created_at)}</CardDescription>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setSelectedPostId(
                            selectedPostId === post.id ? null : post.id
                          )
                        }
                        className="p-1.5 hover:bg-secondary rounded-lg transition-colors border border-white/[0.04]"
                      >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>

                      {/* Action Dropdown */}
                      {selectedPostId === post.id && (
                        <div className="absolute right-0 top-8 bg-popover border border-border rounded-xl shadow-2xl z-25 min-w-40 overflow-hidden text-xs">
                          <button
                            onClick={() => navigate(`/alumni/post/edit/${post.id}`)}
                            className="w-full text-left px-3.5 py-2 hover:bg-secondary flex items-center gap-2 text-foreground font-semibold border-b border-border/50"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-primary" />
                            Edit Post
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="w-full text-left px-3.5 py-2 hover:bg-red-950/20 flex items-center gap-2 text-red-400 font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            Delete Post
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Content Preview */}
                <CardContent className="space-y-3.5 text-xs">
                  <p className="text-muted-foreground leading-relaxed line-clamp-3">{post.content}</p>

                  {post.company && (
                    <div className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 p-2 rounded-xl w-fit">
                      🏢 {post.company}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex gap-4 pt-3.5 border-t border-white/[0.04] text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      {post.likes}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {post.comments}
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="w-3.5 h-3.5" />
                      {post.shares}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <AlumniBottomTabBar />
    </div>
  );
};

export default AlumniMyPostsPage;
