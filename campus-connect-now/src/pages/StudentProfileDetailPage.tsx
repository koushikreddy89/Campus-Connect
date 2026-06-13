import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Share2,
  MapPin,
  Calendar,
  Sparkles,
  Trophy,
  ShieldCheck,
  Heart,
  MessageSquare,
  BookOpen,
  ArrowUpRight,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getApiUrl } from '@/services/connectionService';
import { matchApi } from '@/services/api';

export default function StudentProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUserId = useAuthStore(s => s.uid);

  const [student, setStudent] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'projects' | 'achievements' | 'clubs'>('posts');

  useEffect(() => {
    if (id) {
      loadStudentData();
    }
  }, [id]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      if (!id) return;

      // 1. Fetch Student profile from MongoDB
      const res = await fetch(`${getApiUrl()}/api/student/profile?userId=${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await res.json();
      if (result.success && result.data) {
        setStudent(result.data);
      } else {
        throw new Error('Profile not found');
      }

      // Check connection state
      if (currentUserId && id) {
        // Fetch current user notifications to see if requested or use discovery api check
        const notificationsRes = await fetch(`${getApiUrl()}/api/notifications?userId=${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const notifResult = await notificationsRes.json();
        const incomingReqs = (notifResult.data || []).filter((n: any) => n.type === 'request' && n.relatedId === currentUserId);
        setIsRequested(incomingReqs.length > 0);

        // check accepted connections or pending requests initiated by currentUserId
        const selfNotifsRes = await fetch(`${getApiUrl()}/api/notifications?userId=${currentUserId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const selfNotifResult = await selfNotifsRes.json();
        const outgoingReqs = (selfNotifResult.data || []).filter((n: any) => n.type === 'request' && n.userId === id);
        
        // Simple mock connection status or check notifications
        const isMatched = (selfNotifResult.data || []).some((n: any) => n.type === 'accept' && n.relatedId === id);
        setIsConnected(isMatched);
      }

      // 2. Fetch posts by this author
      const postsRes = await fetch(`${getApiUrl()}/api/feed?authorId=${id}&userId=${currentUserId || ''}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const postsResult = await postsRes.json();
      if (postsResult.success) {
        setPosts(postsResult.data || []);
      }

    } catch (e) {
      console.error(e);
      toast.error('Failed to load student profile details');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!student) return;
    try {
      const result = await matchApi.sendConnectionRequest(student.userId);
      if (result.success) {
        if (result.matched) {
          setIsConnected(true);
          setIsRequested(false);
          toast.success(`You are now connected with ${student.name}!`);
        } else {
          setIsRequested(true);
          toast.success(`Connection request sent to ${student.name}`);
        }
      }
    } catch (e) {
      toast.error('Failed to send connection request');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-foreground">
        <p className="text-sm font-semibold text-muted-foreground">Student profile not found</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="border-border hover:bg-secondary">
          Go Back
        </Button>
      </div>
    );
  }

  const projects = posts.filter(p => p.category === 'projects');

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-28">
      {/* Navigation Headers */}
      <div className="flex items-center justify-between p-4 border-b border-border/10 bg-background/95 backdrop-blur-md sticky top-0 z-40">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-secondary/80 border border-border/50 text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Profile link copied!');
          }}
          className="p-2 rounded-xl bg-secondary/80 border border-border/50 text-muted-foreground"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Banner */}
      <div className="h-36 relative bg-gradient-to-r from-purple-600/40 via-pink-600/30 to-background border-b border-border/15">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Profile Info Card */}
      <div className="px-4 -mt-12 relative z-10 space-y-4">
        <div className="flex items-end justify-between">
          <img
            src={student.profileImageUrl || (student.photos && student.photos[0]) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.userId}`}
            alt={student.name}
            className="h-20 w-20 rounded-2xl ring-4 ring-background bg-card shadow-xl object-cover"
          />
          {student.userId !== currentUserId && (
            <div className="flex gap-2">
              <button
                onClick={handleConnect}
                disabled={isRequested}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isConnected
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : isRequested
                      ? 'bg-secondary border-border text-muted-foreground'
                      : 'gradient-primary text-primary-foreground border-primary glow-primary'
                }`}
              >
                {isConnected ? 'Connected' : isRequested ? 'Pending' : 'Connect'}
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold text-foreground">{student.name}</h1>
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Student
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
            {student.department || 'Computer Science'} · {student.batch || 'Class of 2027'}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/85 mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span>{student.college || 'SR University'}</span>
          </div>
        </div>

        {/* Bio */}
        {student.bio && (
          <Card className="p-4 border-border bg-card/60">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">About Me</h2>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">
              {student.bio}
            </p>
          </Card>
        )}

        {/* Skills */}
        {student.skills && student.skills.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {student.skills.map((skill: string) => (
                <span key={skill} className="text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {student.interests && student.interests.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
              <Heart className="h-3 w-3 text-accent" /> Interests
            </p>
            <div className="flex flex-wrap gap-1.5">
              {student.interests.map((interest: string) => (
                <span key={interest} className="text-[10px] px-2.5 py-1 rounded-lg bg-accent/10 text-accent border border-accent/20 font-medium">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/10 gap-1 overflow-x-auto scrollbar-none mt-6 px-4">
        {[
          { id: 'posts', label: `Posts (${posts.length})` },
          { id: 'projects', label: `Projects (${projects.length})` },
          { id: 'achievements', label: `Achievements (${(student.achievements || []).length})` },
          { id: 'clubs', label: `Clubs (${(student.clubs || []).length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary font-extrabold'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="px-4 mt-6 min-h-[200px] space-y-4">
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card/30">
                <MessageSquare className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-[11px] text-muted-foreground">No posts shared by this student yet.</p>
              </div>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="p-4 border-border bg-card/40 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <img 
                      src={post.authorAvatar} 
                      alt="" 
                      className="h-8 w-8 rounded-full" 
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{post.authorName}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">{post.content}</p>
                  {post.image && (
                    <img src={post.image} alt="" className="mt-3 rounded-lg max-h-48 w-full object-cover" />
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card/30">
                <BookOpen className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-[11px] text-muted-foreground">No project showcases shared by this student yet.</p>
              </div>
            ) : (
              projects.map((proj) => (
                <Card key={proj.id} className="p-4 border-border bg-card/40">
                  <p className="text-xs text-foreground/90 leading-relaxed font-semibold">{proj.content}</p>
                  {proj.image && (
                    <img src={proj.image} alt="" className="mt-2 rounded-lg max-h-48 w-full object-cover" />
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-3">
            {(!student.achievements || student.achievements.length === 0) ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card/30">
                <Trophy className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-[11px] text-muted-foreground">No achievements added yet.</p>
              </div>
            ) : (
              student.achievements.map((ach: string, i: number) => (
                <Card key={i} className="p-3 border-border bg-card/40 flex items-start gap-2.5">
                  <Trophy className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-foreground/90 leading-relaxed">{ach}</span>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'clubs' && (
          <div className="space-y-3">
            {(!student.clubs || student.clubs.length === 0) ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card/30">
                <Sparkles className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-[11px] text-muted-foreground">No clubs memberships listed.</p>
              </div>
            ) : (
              student.clubs.map((club: string, i: number) => (
                <Card key={i} className="p-3 border-border bg-card/40 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full gradient-primary" />
                  <span className="text-xs text-foreground/90 font-medium">{club}</span>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
