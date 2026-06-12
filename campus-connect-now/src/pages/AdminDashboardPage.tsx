import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useAnnouncementStore, Announcement } from '@/store/announcementStore';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Plus, Trash2, LogOut, Calendar, Users, Bell,
  Image as ImageIcon, X, Megaphone, BarChart3,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Briefcase } from 'lucide-react';

const CATEGORIES: { key: any; label: string; icon: any }[] = [
  { key: 'announcement', label: 'Announcement', icon: Megaphone },
  { key: 'placement', label: 'Placement Drive', icon: Briefcase },
  { key: 'internship', label: 'Internship', icon: Calendar },
  { key: 'event', label: 'College Event', icon: Users },
  { key: 'notice', label: 'Circular/Notice', icon: Bell },
  { key: 'emergency', label: 'Emergency Alert', icon: Shield },
];

export default function AdminDashboardPage() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const role = useAuthStore(s => s.role);
  const adminCollege = useAuthStore(s => s.college);
  const token = useAuthStore(s => s.token);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const announcements = useAnnouncementStore(s => s.announcements);
  const createAnnouncement = useAnnouncementStore(s => s.createAnnouncement);
  const deleteAnnouncement = useAnnouncementStore(s => s.deleteAnnouncement);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<any>('announcement');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const college = adminCollege ?? 'SR University';

  // Protect admin route - redirect if not authenticated
  useEffect(() => {
    console.log('🔐 [AdminDashboard] Auth check:', {
      isAuthenticated,
      role,
      hasToken: !!token,
      hasCollege: !!adminCollege
    });

    if (!isAuthenticated || !token) {
      console.log('❌ [AdminDashboard] Not authenticated, redirecting to login');
      navigate('/', { replace: true });
      return;
    }

    if (role !== 'admin') {
      console.log('❌ [AdminDashboard] User is not admin, redirecting to home');
      navigate('/', { replace: true });
      return;
    }

    console.log('✅ [AdminDashboard] Admin authenticated and authorized');
  }, [isAuthenticated, token, role, navigate, adminCollege]);

  const myAnnouncements = announcements.filter(
    a => a.college.toLowerCase() === college.toLowerCase()
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) return;
    setIsCreating(true);
    try {
      await createAnnouncement({
        title: title.trim(),
        description: description.trim(),
        imageURL: imagePreview ?? undefined,
        college,
        createdBy: 'admin-current',
        createdByName: 'Campus Admin',
        category,
      });
      setTitle('');
      setDescription('');
      setImagePreview(null);
      setCategory('announcement');
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create announcement:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <EmptyState
          icon={<Shield className="h-8 w-8 text-destructive" />}
          title="Access Denied"
          description="You don't have admin permissions."
        />
      </div>
    );
  }

  const stats = [
    { label: 'Total', value: myAnnouncements.length, icon: BarChart3, gradient: 'gradient-primary', glow: 'glow-primary' },
    { label: 'Events', value: myAnnouncements.filter(a => a.category === 'event').length, icon: Calendar, gradient: 'bg-accent/15', glow: '' },
    { label: 'Clubs', value: myAnnouncements.filter(a => a.category === 'club').length, icon: Users, gradient: 'bg-secondary', glow: '' },
  ];

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-5 pt-5 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Admin Panel</h1>
            <p className="text-[11px] text-muted-foreground font-medium">{college}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="text-xs rounded-xl h-9">
            App →
          </Button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleLogout} className="p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="px-5 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-4 text-center"
            >
              <div className={`h-8 w-8 rounded-lg ${stat.gradient} flex items-center justify-center mx-auto mb-2 ${stat.glow}`}>
                <Icon className="h-4 w-4 text-primary-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Create Button */}
      <div className="px-5 mb-5">
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="w-full gradient-primary rounded-2xl h-12 font-semibold text-sm glow-primary"
          >
            {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showForm ? 'Cancel' : 'New Announcement'}
          </Button>
        </motion.div>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 mb-5 overflow-hidden"
          >
            <div className="glass-card p-5 space-y-3">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Announcement title"
                maxLength={100}
                className="w-full bg-secondary/80 rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Description..."
                rows={3}
                maxLength={500}
                className="w-full bg-secondary/80 rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />

              {/* Category */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <motion.button
                      key={cat.key}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setCategory(cat.key)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-medium transition-all ${
                        category === cat.key
                          ? 'gradient-primary text-primary-foreground glow-primary'
                          : 'bg-secondary/80 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cat.label}
                    </motion.button>
                  );
                })}
              </div>

              {/* Image */}
              {imagePreview && (
                <div className="relative rounded-2xl overflow-hidden">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-40 object-cover rounded-2xl" />
                  <button
                    onClick={() => setImagePreview(null)}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                  >
                    <X className="h-3.5 w-3.5 text-foreground" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => fileRef.current?.click()} className="h-9 w-9 rounded-xl bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </motion.button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <Button
                  onClick={handleCreate}
                  disabled={!title.trim() || !description.trim() || isCreating}
                  size="sm"
                  className="rounded-full gradient-primary px-6 h-9 font-semibold"
                >
                  {isCreating ? 'Publishing...' : 'Publish'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcements List */}
      <div className="px-5">
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
          <Megaphone className="h-3.5 w-3.5 text-primary" />
          Your Announcements
        </h2>
        {myAnnouncements.length === 0 ? (
          <EmptyState title="No announcements yet" description="Create your first campus announcement!" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myAnnouncements.map((ann, i) => (
              <motion.div
                key={ann.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                        ann.category === 'event' ? 'bg-primary/15 text-primary' :
                        ann.category === 'club' ? 'bg-accent/15 text-accent' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {ann.category.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground truncate">{ann.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{ann.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                      {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => deleteAnnouncement(ann.id)}
                    className="ml-3 h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </motion.button>
                </div>
                {ann.imageURL && (
                  <img src={ann.imageURL} alt={ann.title} className="w-full max-h-32 object-cover rounded-2xl mt-3" />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
