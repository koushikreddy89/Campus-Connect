import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, Send, AlertCircle, Check, Sparkles } from 'lucide-react';
import AlumniBottomTabBar from '@/components/alumni/AlumniBottomTabBar';
import alumniPostService from '@/services/alumniPostService';
import { toast } from 'sonner';

type PostType = 'text' | 'job_referral' | 'hiring' | 'experience' | 'advice';

interface PostFormData {
  type: PostType;
  title: string;
  content: string;
  company?: string;
  jobUrl?: string;
  images?: File[];
}

const AlumniPostCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { uid, email } = useAuthStore(s => ({
    uid: s.uid,
    email: s.email,
  }));
  const profile = useProfileStore(s => s.profile);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PostFormData>({
    type: 'text',
    title: '',
    content: '',
  });

  const postTypes: { value: PostType; label: string; description: string }[] = [
    {
      value: 'text',
      label: 'General Post',
      description: 'Share any update, thought, or story',
    },
    {
      value: 'experience',
      label: 'Career Experience',
      description: 'Share your career journey and insights',
    },
    {
      value: 'job_referral',
      label: 'Job Referral',
      description: 'Refer a job opportunity at your company',
    },
    {
      value: 'hiring',
      label: 'We\'re Hiring',
      description: 'Announce that your company is hiring',
    },
    {
      value: 'advice',
      label: 'Advice/Tips',
      description: 'Share valuable advice or tips',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.content.trim()) {
      setError('Content is required');
      return;
    }

    if (formData.type === 'job_referral' && !formData.jobUrl?.trim()) {
      setError('Job URL is required for job referral posts');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const state = useAuthStore.getState();
      const collegeName = state.college || 'SR University';
      
      const res = await alumniPostService.posts.createPost({
        authorId: uid || 'alumni-current',
        authorName: profile?.name || email || 'Alumni Member',
        authorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid || 'alumni'}`,
        authorRole: 'Alumni',
        authorCompany: formData.company || 'Verified Alumni',
        college: collegeName,
        title: formData.title.trim(),
        content: formData.content.trim(),
        type: formData.type === 'job_referral' ? 'referral' : 
              formData.type === 'experience' ? 'experience' : 
              formData.type === 'advice' ? 'advice' : 
              formData.type === 'hiring' ? 'resource' : 'general',
        company: formData.company || undefined,
        jobUrl: formData.jobUrl || undefined,
        category: formData.type === 'job_referral' ? 'referrals' : 
                  formData.type === 'experience' ? 'achievements' : 
                  formData.type === 'advice' ? 'roadmaps' : 
                  formData.type === 'hiring' ? 'resources' : 'feed',
      });

      if (res && res.success) {
        setSuccess(true);
        toast.success('Opportunity post created successfully!');
        setTimeout(() => {
          navigate('/alumni/home');
        }, 1500);
      } else {
        throw new Error(res?.error || 'Failed to create post');
      }
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err.message || 'An error occurred while creating post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value: PostType) => {
    setFormData(prev => ({ ...prev, type: value }));
  };

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
            <h1 className="text-lg font-bold">Create Post</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {success ? (
          <Card className="glass-card border border-white/[0.06] text-center p-8">
            <CardContent className="space-y-4 pt-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30">
                <Check className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Post Created!</h2>
              <p className="text-xs text-muted-foreground">Redirecting you to the home dashboard...</p>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Post Type Selector */}
            <Card className="glass-card border border-white/[0.06]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" /> Select Contribution Type
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Categorize your post to show up in the correct workspace tab</CardDescription>
              </CardHeader>
              <CardContent className="text-xs">
                <Select value={formData.type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="w-full h-10 rounded-xl bg-secondary/60 border-border text-foreground text-xs focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder="Post Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border rounded-xl">
                    {postTypes.map(type => (
                      <SelectItem 
                        key={type.value} 
                        value={type.value}
                        className="text-xs focus:bg-primary focus:text-primary-foreground"
                      >
                        <div className="font-semibold">{type.label}</div>
                        <div className="text-[10px] text-muted-foreground/80 mt-0.5">{type.description}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Post Form Inputs */}
            <Card className="glass-card border border-white/[0.06]">
              <CardContent className="space-y-4 pt-6 text-xs">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Post Title</label>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter a descriptive title..."
                    className="h-10 rounded-xl bg-secondary/60 border-border focus:ring-1 focus:ring-primary text-xs"
                    required
                  />
                </div>

                {/* Conditional Company input */}
                {(formData.type === 'job_referral' || formData.type === 'hiring') && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Company Name</label>
                    <Input
                      name="company"
                      value={formData.company || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Google, Microsoft..."
                      className="h-10 rounded-xl bg-secondary/60 border-border focus:ring-1 focus:ring-primary text-xs"
                    />
                  </div>
                )}

                {/* Conditional Job Link input */}
                {formData.type === 'job_referral' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Job Details URL</label>
                    <Input
                      name="jobUrl"
                      value={formData.jobUrl || ''}
                      onChange={handleInputChange}
                      placeholder="https://careers.google.com/jobs/..."
                      type="url"
                      className="h-10 rounded-xl bg-secondary/60 border-border focus:ring-1 focus:ring-primary text-xs"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Description Content</label>
                  <Textarea
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    placeholder="Share valuable advice, hiring requirements, referral guidelines, or career stories here..."
                    rows={6}
                    className="rounded-xl bg-secondary/60 border-border focus:ring-1 focus:ring-primary text-xs resize-none"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl gradient-primary text-primary-foreground font-bold h-10 text-xs flex items-center justify-center gap-1.5 mt-4"
                >
                  <Send className="w-4 h-4" />
                  {isLoading ? 'Publishing Contribution...' : 'Publish to Alumni network'}
                </Button>
              </CardContent>
            </Card>
          </form>
        )}
      </div>

      {/* Bottom Navigation */}
      <AlumniBottomTabBar />
    </div>
  );
};

export default AlumniPostCreatePage;
