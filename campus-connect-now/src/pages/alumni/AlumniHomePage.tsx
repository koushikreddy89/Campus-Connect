import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { Loader } from '@/components/Loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  FileText,
  Share2,
  Zap,
  TrendingUp,
  ArrowRight,
  Plus,
  Sparkles,
} from 'lucide-react';

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const AlumniHomePage: React.FC = () => {
  const navigate = useNavigate();
  const email = useAuthStore(s => s.email);
  const uid = useAuthStore(s => s.uid);
  const profile = useProfileStore(s => s.profile);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    connections: 12,
    posts: 4,
    views: 148,
  });
  const [recentPosts, setRecentPosts] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Simulate data load
        await new Promise(resolve => setTimeout(resolve, 600));
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading alumni home:', error);
        setIsLoading(false);
      }
    };

    loadData();
  }, [uid]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground font-sans page-transition">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/40 via-primary/30 to-accent/20 pt-8 pb-10 px-5 border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 w-fit uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> Alumni Portal
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back! 👋</h1>
          <p className="text-xs text-muted-foreground font-medium">{profile?.name || email}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass-card border border-white/[0.05] bg-white/[0.02]">
            <CardContent className="pt-4 text-center p-3">
              <div className="flex justify-center mb-2">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="text-xl font-bold text-foreground">{stats.connections}</div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Connections</div>
            </CardContent>
          </Card>

          <Card className="glass-card border border-white/[0.05] bg-white/[0.02]">
            <CardContent className="pt-4 text-center p-3">
              <div className="flex justify-center mb-2">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="text-xl font-bold text-foreground">{stats.posts}</div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">My Posts</div>
            </CardContent>
          </Card>

          <Card className="glass-card border border-white/[0.05] bg-white/[0.02]">
            <CardContent className="pt-4 text-center p-3">
              <div className="flex justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div className="text-xl font-bold text-foreground">{stats.views}</div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Views</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/alumni/post/create')}
            className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-white/[0.08] bg-primary/10 hover:bg-primary/15 text-primary transition-all font-semibold text-xs h-24"
          >
            <Plus className="w-5 h-5" />
            <span>Create Opportunity Post</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/alumni/network')}
            className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-white/[0.08] bg-accent/10 hover:bg-accent/15 text-accent transition-all font-semibold text-xs h-24"
          >
            <Zap className="w-5 h-5" />
            <span>Alumni Networking Hub</span>
          </motion.button>
        </div>

        {/* Recent Alumni Posts Container */}
        <Card className="glass-card border border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Share2 className="w-4 h-4 text-primary" />
              My Network Contributions
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Manage job referral opportunities and industry insights you posted</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPosts.length === 0 ? (
              <div className="text-center py-6 flex flex-col items-center">
                <p className="text-xs text-muted-foreground mb-3">You haven't posted any opportunities yet.</p>
                <Button
                  onClick={() => navigate('/alumni/post/create')}
                  className="rounded-xl bg-primary hover:bg-primary/95 text-xs font-semibold gap-1.5 h-9"
                >
                  Create Opportunities
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Your posts list will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trending Section */}
        <Card className="glass-card border border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <TrendingUp className="w-4 h-4 text-accent" />
              Trending Referral Hubs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="p-3 bg-white/[0.01] rounded-xl border border-white/[0.03] flex justify-between items-center">
                <div>
                  <p className="font-bold text-foreground">Google PM Roles</p>
                  <p className="text-[10px] text-muted-foreground">Microsoft, Apple, JP Morgan, Google recruiters hiring</p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default AlumniHomePage;
