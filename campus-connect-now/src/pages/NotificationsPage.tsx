import { useEffect } from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { EmptyState } from '@/components/EmptyState';
import { BottomTabBar } from '@/components/BottomTabBar';
import { ArrowLeft, Bell, Heart, MessageCircle, ThumbsUp, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const icons: Record<string, typeof Heart> = {
  match: Heart,
  message: MessageCircle,
  like: ThumbsUp,
  comment: MessageCircle,
  request: Inbox,
};

const iconColors: Record<string, string> = {
  match: 'text-accent',
  message: 'text-primary',
  like: 'text-accent',
  comment: 'text-primary',
  request: 'text-primary',
};

export default function NotificationsPage() {
  const notifications = useNotificationStore(s => s.notifications);
  const fetchNotifications = useNotificationStore(s => s.fetchNotifications);
  const markRead = useNotificationStore(s => s.markRead);
  const markAllRead = useNotificationStore(s => s.markAllRead);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleClick = (n: typeof notifications[0]) => {
    markRead(n.id);
    if (n.type === 'request') navigate('/requests');
    else if (n.type === 'match' || n.type === 'message') navigate(`/chat/${n.relatedId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20 page-transition">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">Notifications</h1>
        </div>
        <button onClick={markAllRead} className="text-xs text-primary font-semibold">Mark all read</button>
      </div>

      <div className="px-5 space-y-2">
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-8 w-8 text-muted-foreground" />}
            title="No notifications"
            description="You're all caught up!"
          />
        ) : (
          notifications.map((n, i) => {
            const Icon = icons[n.type] || Bell;
            return (
              <motion.button
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleClick(n)}
                className={`w-full glass rounded-2xl p-3.5 flex items-center gap-3 text-left ${!n.read ? 'border-primary/30' : ''}`}
              >
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                  <Icon className={`h-5 w-5 ${iconColors[n.type] || 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
                {!n.read && <span className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" />}
              </motion.button>
            );
          })
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
