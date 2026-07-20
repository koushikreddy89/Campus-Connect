import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  HelpCircle, 
  MessageSquare, 
  Bug, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Send,
  Clock,
  User,
  Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FAQ {
  _id: string;
  category: string;
  question: string;
  answer: string;
}

interface SupportTicket {
  _id: string;
  subject: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  replies: Array<{
    senderName: string;
    message: string;
    createdAt: string;
  }>;
  createdAt: string;
}

export default function HelpSupportPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'faqs' | 'ticket' | 'bug' | 'feature'>('faqs');
  
  // FAQ state
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [faqLoading, setFaqLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Ticket state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [viewingTicketId, setViewingTicketId] = useState<string | null>(null);

  // Bug & Feature state
  const [bugDescription, setBugDescription] = useState('');
  const [bugScreenshot, setBugScreenshot] = useState('');
  const [submittingBug, setSubmittingBug] = useState(false);

  const [featureDescription, setFeatureDescription] = useState('');
  const [submittingFeature, setSubmittingFeature] = useState(false);

  // Load FAQs
  const loadFAQs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/faqs');
      const json = await res.json();
      if (json.success) {
        setFaqs(json.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load FAQs');
    } finally {
      setFaqLoading(false);
    }
  };

  // Load Tickets
  const loadTickets = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/support-tickets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const json = await res.json();
      if (json.success) {
        setTickets(json.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load tickets');
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    loadFAQs();
    loadTickets();
  }, []);

  // Submit Ticket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in all ticket fields');
      return;
    }
    setSubmittingTicket(true);
    try {
      const res = await fetch('http://localhost:5000/api/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ subject, description })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Support ticket submitted successfully');
        setSubject('');
        setDescription('');
        loadTickets();
      } else {
        toast.error(json.error || 'Failed to submit ticket');
      }
    } catch (err) {
      toast.error('Failed to submit ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Submit Bug Report
  const handleSubmitBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugDescription.trim()) {
      toast.error('Please describe the bug');
      return;
    }
    setSubmittingBug(true);
    
    // Automatically retrieve browser info
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height
    };

    try {
      const res = await fetch('http://localhost:5000/api/bugs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          description: bugDescription,
          deviceInfo,
          screenshotUrl: bugScreenshot,
          screenshot: bugScreenshot
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Bug report submitted. Thank you!');
        setBugDescription('');
        setBugScreenshot('');
      } else {
        toast.error(json.error || 'Failed to submit bug report');
      }
    } catch (err) {
      toast.error('Failed to submit bug report');
    } finally {
      setSubmittingBug(false);
    }
  };

  // Submit Feature Request
  const handleSubmitFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureDescription.trim()) {
      toast.error('Please describe the feature');
      return;
    }
    setSubmittingFeature(true);
    try {
      const res = await fetch('http://localhost:5000/api/feature-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: 'feature',
          description: featureDescription
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Feature request submitted successfully!');
        setFeatureDescription('');
      } else {
        toast.error(json.error || 'Failed to submit feature request');
      }
    } catch (err) {
      toast.error('Failed to submit feature request');
    } finally {
      setSubmittingFeature(false);
    }
  };

  // Helper to trigger screenshot simulation
  const handleScreenshotSimulation = () => {
    // Inject a dummy base64 string
    setBugScreenshot('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    toast.success('Simulated screenshot captured successfully!');
  };

  // Group FAQs by Category
  const groupedFAQs = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-card border-b border-white/5 py-4 px-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-lg font-bold">Help & Support</h1>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Help Center & Ticketing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-xl mx-auto px-4 mt-6">
        <div className="flex bg-secondary/40 border border-white/5 p-1 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('faqs')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'faqs' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" /> FAQs
          </button>
          <button
            onClick={() => setActiveTab('ticket')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'ticket' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" /> Support
          </button>
          <button
            onClick={() => setActiveTab('bug')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'bug' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bug className="h-3.5 w-3.5" /> Bug
          </button>
          <button
            onClick={() => setActiveTab('feature')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'feature' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> Feature
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 mt-6">
        <AnimatePresence mode="wait">
          {/* FAQs TAB */}
          {activeTab === 'faqs' && (
            <motion.div
              key="faqs"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {faqLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : Object.keys(groupedFAQs).length === 0 ? (
                <div className="glass-card p-8 text-center text-muted-foreground">
                  No FAQs available.
                </div>
              ) : (
                Object.entries(groupedFAQs).map(([category, items]) => (
                  <div key={category} className="space-y-3">
                    <h2 className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-2">{category}</h2>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item._id} className="glass-card overflow-hidden">
                          <button
                            onClick={() => setExpandedFaq(expandedFaq === item._id ? null : item._id)}
                            className="w-full text-left p-4 flex items-center justify-between hover:bg-white/5 transition-all"
                          >
                            <span className="text-xs font-semibold text-foreground">{item.question}</span>
                            {expandedFaq === item._id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </button>
                          
                          {expandedFaq === item._id && (
                            <div className="p-4 pt-0 text-xs text-muted-foreground border-t border-white/5 bg-black/10 leading-relaxed">
                              {item.answer}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* SUPPORT TICKETING TAB */}
          {activeTab === 'ticket' && (
            <motion.div
              key="ticket"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Form to submit support ticket */}
              <div className="glass-card p-6 space-y-4">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <span>✉️</span> Open Support Ticket
                </h2>
                
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase block">Subject</label>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter ticket subject..."
                      className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase block">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detail your issue or question..."
                      rows={4}
                      className="w-full bg-secondary border border-white/10 rounded-xl p-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submittingTicket}
                    className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-11 text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" /> {submittingTicket ? 'Submitting...' : 'Submit Support Ticket'}
                  </Button>
                </form>
              </div>

              {/* Tickets list */}
              <div className="space-y-3">
                <h2 className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-2">Your Tickets</h2>
                {ticketsLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="glass-card p-8 text-center text-muted-foreground text-xs italic">
                    You have not submitted any support tickets.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <div key={ticket._id} className="glass-card p-4 space-y-3 border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{ticket.subject}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            ticket.status === 'Open' ? 'bg-green-500/10 text-green-400' :
                            ticket.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{ticket.description}</p>
                        
                        <div className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" /> Submitted on {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>

                        {/* Admin replies accordion */}
                        {ticket.replies.length > 0 && (
                          <div className="mt-3 border-t border-white/5 pt-3 space-y-2 bg-black/10 p-3 rounded-xl">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                              <Inbox className="h-3.5 w-3.5 text-primary" /> Admin Response:
                            </p>
                            {ticket.replies.map((rep, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                                  <span className="font-semibold text-foreground flex items-center gap-1">
                                    <User className="h-3 w-3" /> {rep.senderName}
                                  </span>
                                  <span>{new Date(rep.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-foreground bg-secondary/50 p-2.5 rounded-lg border border-white/5">{rep.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* BUG REPORT TAB */}
          {activeTab === 'bug' && (
            <motion.div
              key="bug"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass-card p-6 space-y-4"
            >
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Bug className="h-4 w-4 text-primary" /> Submit Bug Report
              </h2>
              
              <form onSubmit={handleSubmitBug} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase block">Describe the Bug</label>
                  <textarea
                    value={bugDescription}
                    onChange={(e) => setBugDescription(e.target.value)}
                    placeholder="Provide details of the bug, steps to reproduce, and expected behavior..."
                    rows={5}
                    className="w-full bg-secondary border border-white/10 rounded-xl p-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase block">Screenshot attachment</label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      onClick={handleScreenshotSimulation}
                      variant="outline"
                      className="bg-white/5 border-white/10 rounded-xl text-xs h-10 px-4 font-semibold"
                    >
                      📸 Capture Current View
                    </Button>
                    {bugScreenshot && (
                      <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1">
                        ✓ Attachment ready
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submittingBug}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-11 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {submittingBug ? 'Submitting...' : 'Submit Bug Report'}
                </Button>
              </form>
            </motion.div>
          )}

          {/* FEATURE REQUEST TAB */}
          {activeTab === 'feature' && (
            <motion.div
              key="feature"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass-card p-6 space-y-4"
            >
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> Suggest a Feature
              </h2>
              
              <form onSubmit={handleSubmitFeature} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase block">Your Idea</label>
                  <textarea
                    value={featureDescription}
                    onChange={(e) => setFeatureDescription(e.target.value)}
                    placeholder="Describe the feature request, why you would like it, and how it helps the community..."
                    rows={5}
                    className="w-full bg-secondary border border-white/10 rounded-xl p-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submittingFeature}
                  className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl h-11 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {submittingFeature ? 'Submitting...' : 'Submit Feature Request'}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
