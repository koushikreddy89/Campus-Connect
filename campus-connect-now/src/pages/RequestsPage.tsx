import { useEffect, useState } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { BottomTabBar } from '@/components/BottomTabBar';
import { EmptyState } from '@/components/EmptyState';
import { ArrowLeft, Check, X, Inbox, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { matchApi } from '@/services/api';
import { toast } from 'sonner';

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await matchApi.getConnectionRequests();
      if (res && res.success) {
        setRequests(res.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch requests:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (requestId: string, name: string) => {
    try {
      const res = await matchApi.acceptRequest(requestId);
      if (res && res.success) {
        toast.success(`Connected!`, {
          description: `You are now connected with ${name}`,
        });
        fetchRequests(); // Refresh requests list
      } else {
        toast.error(res?.error || 'Failed to accept connection');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to accept connection');
    }
  };

  const handleReject = async (requestId: string) => {
    // Treat reject as a pass or just remove it locally
    setRequests(prev => prev.filter(r => r.id !== requestId));
    toast.info('Request skipped');
  };

  return (
    <div className="min-h-screen bg-background pb-20 page-transition">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-5 pb-4 flex items-center gap-3"
      >
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </motion.button>
        <h1 className="font-display text-xl font-bold text-foreground">Requests</h1>
        {requests.length > 0 && (
          <span className="ml-auto h-7 min-w-[28px] rounded-full gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center px-2 glow-primary">
            {requests.length}
          </span>
        )}
      </motion.div>

      <div className="px-5 space-y-3">
        {isLoading ? (
          <p className="text-center text-xs text-muted-foreground py-10 animate-pulse">Loading requests...</p>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-8 w-8 text-muted-foreground" />}
            title="No pending requests"
            description="When someone wants to connect with you, their request will appear here."
          />
        ) : (
          requests.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, ease: 'easeOut' }}
              className="glass-card p-4 flex items-center gap-4"
            >
              <div className="relative">
                <img
                  src={req.fromUser?.photos?.[0] || 'https://api.dicebear.com/7.x/avataaars/svg?seed=student'}
                  alt=""
                  className="h-14 w-14 rounded-2xl border border-primary/20 object-cover"
                />
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full gradient-primary flex items-center justify-center">
                  <Sparkles className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {req.fromUser?.name || 'A Student'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {req.fromUser?.course || req.fromUser?.college || 'Student'}
                </p>
                <p className="text-[10px] text-primary/70 mt-1 font-medium">
                  Wants to connect 💌
                </p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={() => handleReject(req.id)}
                  className="h-10 w-10 rounded-xl bg-secondary/80 flex items-center justify-center border border-border/50 hover:bg-secondary transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={() => handleAccept(req.id, req.fromUser?.name || 'A Student')}
                  className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center glow-primary"
                >
                  <Check className="h-4 w-4 text-primary-foreground" />
                </motion.button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
