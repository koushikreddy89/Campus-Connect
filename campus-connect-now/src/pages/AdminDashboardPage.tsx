import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useAnnouncementStore } from '@/store/announcementStore';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Plus, Trash2, LogOut, Calendar, Users, Bell,
  Image as ImageIcon, X, Megaphone, BarChart3, Briefcase,
  AlertTriangle, CheckCircle, LifeBuoy, MessageSquare,
  Clock, Check, Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

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

  const [activeAdminTab, setActiveAdminTab] = useState<'announcements' | 'reports' | 'tickets'>('announcements');

  // Announcement Form State
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<any>('announcement');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const college = adminCollege ?? 'SR University';

  // User Reports State
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Support Tickets State
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyTicketId, setReplyTicketId] = useState<string | null>(null);
  const [replyStatus, setReplyStatus] = useState<string>('Resolved');

  // Protect admin route
  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate('/', { replace: true });
      return;
    }
    if (role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }
  }, [isAuthenticated, token, role, navigate]);

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/reports', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const json = await res.json();
      if (json.success) {
        setReports(json.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load user reports');
    } finally {
      setReportsLoading(false);
    }
  };

  const loadTickets = async () => {
    setTicketsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/support-tickets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const json = await res.json();
      if (json.success) {
        setTickets(json.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load support tickets');
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'reports') {
      loadReports();
    } else if (activeAdminTab === 'tickets') {
      loadTickets();
    }
  }, [activeAdminTab]);

  const handleResolveReport = async (reportId: string, action: 'suspend' | 'dismiss') => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(action === 'suspend' ? 'User account suspended' : 'Report dismissed');
        loadReports();
      } else {
        toast.error(json.error || 'Failed to resolve report');
      }
    } catch (e) {
      toast.error('Error resolving report');
    }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTicketId || !replyText.trim()) return;

    try {
      const res = await fetch(`http://localhost:5000/api/admin/support-tickets/${replyTicketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reply: replyText.trim(), status: replyStatus })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Reply submitted and status updated');
        setReplyText('');
        setReplyTicketId(null);
        loadTickets();
      } else {
        toast.error(json.error || 'Failed to submit reply');
      }
    } catch (e) {
      toast.error('Error submitting reply');
    }
  };

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
      toast.success('Announcement published successfully');
    } catch (error) {
      console.error('Failed to create announcement:', error);
      toast.error('Failed to publish announcement');
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

  return (
    <div className="min-h-screen bg-background pb-12 text-foreground">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-5 pt-5 pb-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Campus Control</h1>
            <p className="text-[11px] text-muted-foreground font-medium">{college}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="text-xs rounded-xl h-9">
            App View
          </Button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleLogout} className="p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="px-5 my-5">
        <div className="flex bg-secondary/40 border border-white/5 p-1 rounded-2xl gap-1">
          <button
            onClick={() => setActiveAdminTab('announcements')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeAdminTab === 'announcements' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Megaphone className="h-3.5 w-3.5" /> Broadcasts
          </button>
          <button
            onClick={() => setActiveAdminTab('reports')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeAdminTab === 'reports' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Moderation Reports
          </button>
          <button
            onClick={() => setActiveAdminTab('tickets')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeAdminTab === 'tickets' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LifeBuoy className="h-3.5 w-3.5" /> Help Desk
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Broadcasts Tab */}
        {activeAdminTab === 'announcements' && (
          <motion.div
            key="announcements"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-5"
          >
            {/* Create Button */}
            <div className="px-5">
              <Button
                onClick={() => setShowForm(!showForm)}
                className="w-full gradient-primary rounded-2xl h-12 font-semibold text-sm glow-primary"
              >
                {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {showForm ? 'Cancel' : 'New Broadcast'}
              </Button>
            </div>

            {/* Create Form */}
            {showForm && (
              <div className="px-5">
                <div className="glass-card p-5 space-y-4">
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Announcement title"
                    maxLength={100}
                    className="w-full bg-secondary/80 border border-white/5 rounded-2xl px-4 py-3.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  />
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Description detail..."
                    rows={3}
                    maxLength={500}
                    className="w-full bg-secondary/80 border border-white/5 rounded-2xl px-4 py-3.5 text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  />

                  {/* Category Selection */}
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setCategory(cat.key)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-bold transition-all ${
                            category === cat.key
                              ? 'gradient-primary text-primary-foreground glow-primary'
                              : 'bg-secondary/80 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Image Attachment preview */}
                  {imagePreview && (
                    <div className="relative rounded-2xl overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full max-h-40 object-cover rounded-2xl" />
                      <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                      >
                        <X className="h-3.5 w-3.5 text-foreground" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="h-9 w-9 rounded-xl bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
                    >
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    
                    <Button
                      onClick={handleCreate}
                      disabled={!title.trim() || !description.trim() || isCreating}
                      size="sm"
                      className="rounded-full gradient-primary px-6 h-9 font-semibold text-xs"
                    >
                      {isCreating ? 'Publishing...' : 'Publish'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Broadcasts List */}
            <div className="px-5">
              <h2 className="text-[10px] font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                <Megaphone className="h-3.5 w-3.5 text-primary" />
                Active Announcements
              </h2>
              
              {myAnnouncements.length === 0 ? (
                <EmptyState title="No announcements yet" description="Create your first campus announcement!" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myAnnouncements.map((ann) => (
                    <div key={ann.id} className="glass-card p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-primary/10 text-primary">
                            {ann.category}
                          </span>
                          <button
                            onClick={() => deleteAnnouncement(ann.id)}
                            className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                        <h3 className="text-xs font-bold text-foreground mt-2">{ann.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ann.description}</p>
                      </div>
                      
                      <div>
                        {ann.imageURL && (
                          <img src={ann.imageURL} alt={ann.title} className="w-full max-h-32 object-cover rounded-xl mt-3" />
                        )}
                        <p className="text-[9px] text-muted-foreground/60 mt-3">
                          {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* User Reports Tab */}
        {activeAdminTab === 'reports' && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="px-5 space-y-4"
          >
            <h2 className="text-[10px] font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
              <AlertTriangle className="h-3.5 w-3.5 text-primary" /> Pending Moderation Reports ({reports.length})
            </h2>

            {reportsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : reports.length === 0 ? (
              <div className="glass-card p-10 text-center text-muted-foreground text-xs italic">
                No active reports pending review. Clear dashboard! 🎉
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report._id} className="glass-card p-5 space-y-4 border border-white/5 relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {report.type}
                        </span>
                        <h3 className="text-xs font-bold mt-1 text-foreground">
                          Reported User: {report.reported ? report.reported.name : 'Unknown User'}
                        </h3>
                        <p className="text-[10px] text-muted-foreground">{report.reported ? report.reported.email : report.reportedNameOrEmail}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleResolveReport(report._id, 'dismiss')}
                          variant="outline"
                          className="border-white/10 hover:bg-secondary h-8 px-3 rounded-lg text-[10px] font-bold"
                        >
                          Dismiss
                        </Button>
                        <Button
                          onClick={() => handleResolveReport(report._id, 'suspend')}
                          disabled={report.reported?.isSuspended}
                          className="bg-red-600 hover:bg-red-500 text-white h-8 px-3 rounded-lg text-[10px] font-bold"
                        >
                          {report.reported?.isSuspended ? 'Suspended' : 'Suspend User'}
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1 text-xs">
                      <p className="font-semibold text-foreground/90">Reason details:</p>
                      <p className="text-muted-foreground leading-relaxed italic">"{report.reason}"</p>
                    </div>

                    <div className="text-[9px] text-muted-foreground/60 flex items-center justify-between">
                      <span>Reporter: {report.reporter ? `${report.reporter.name} (${report.reporter.email})` : 'Anonymous'}</span>
                      <span>{formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Support Help Desk Tab */}
        {activeAdminTab === 'tickets' && (
          <motion.div
            key="tickets"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="px-5 space-y-4"
          >
            <h2 className="text-[10px] font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
              <LifeBuoy className="h-3.5 w-3.5 text-primary" /> Support Tickets ({tickets.length})
            </h2>

            {ticketsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="glass-card p-10 text-center text-muted-foreground text-xs italic">
                No support tickets filed yet. Great support history!
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div key={ticket._id} className="glass-card p-5 space-y-4 border border-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            ticket.status === 'Open' ? 'bg-green-500/10 text-green-400' :
                            ticket.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400' :
                            ticket.status === 'Resolved' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                            {ticket.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground">User: {ticket.name} ({ticket.email})</span>
                        </div>
                        <h3 className="text-xs font-bold text-foreground mt-2">{ticket.subject}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ticket.description}</p>
                      </div>

                      <Button
                        onClick={() => {
                          setReplyTicketId(replyTicketId === ticket._id ? null : ticket._id);
                          setReplyText('');
                        }}
                        className="bg-primary hover:bg-primary/90 text-white rounded-lg h-8 px-3 text-[10px] font-bold shrink-0"
                      >
                        Reply / Edit
                      </Button>
                    </div>

                    {/* Replies count */}
                    {ticket.replies && ticket.replies.length > 0 && (
                      <div className="pl-4 border-l border-white/10 space-y-2.5">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase">Thread Replies ({ticket.replies.length})</p>
                        {ticket.replies.map((rep: any, idx: number) => (
                          <div key={idx} className="space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                              <span className="font-semibold text-foreground">{rep.senderName}</span>
                              <span>• {new Date(rep.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-muted-foreground bg-secondary/35 p-2 rounded-lg border border-white/5">{rep.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline reply form */}
                    {replyTicketId === ticket._id && (
                      <form onSubmit={handleSendAdminReply} className="p-4 bg-secondary/30 border border-white/5 rounded-xl space-y-3">
                        <h4 className="text-[10px] text-foreground font-bold uppercase">Submit Support Response</h4>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write response message to the user..."
                            rows={3}
                            className="flex-1 bg-secondary border border-white/10 rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          
                          <div className="flex flex-row sm:flex-col justify-between sm:justify-start gap-2">
                            <div className="flex flex-col">
                              <label className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Status</label>
                              <select
                                value={replyStatus}
                                onChange={(e) => setReplyStatus(e.target.value)}
                                className="bg-secondary border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                              >
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Closed">Closed</option>
                              </select>
                            </div>
                            
                            <Button
                              type="submit"
                              disabled={!replyText.trim()}
                              className="bg-primary hover:bg-primary/95 text-white rounded-lg h-9 px-4 text-xs font-bold mt-auto sm:mt-1.5"
                            >
                              Submit
                            </Button>
                          </div>
                        </div>
                      </form>
                    )}

                    <div className="text-[9px] text-muted-foreground/60 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Submitted {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
