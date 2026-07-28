import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Shield, 
  Laptop, 
  Smartphone, 
  Trash2, 
  ShieldAlert, 
  Clock, 
  Globe 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

export default function SecuritySettings() {
  const navigate = useNavigate();
  const { 
    activeSessions, 
    fetchActiveSessions, 
    revokeSession, 
    revokeAllOtherSessions,
    isLoading, 
    error 
  } = useAuthStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveSessions();
  }, [fetchActiveSessions]);

  const handleRevoke = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      await revokeSession(sessionId);
      toast.success('Session terminated successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke session');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeOthers = async () => {
    if (window.confirm('Are you sure you want to sign out of all other devices?')) {
      setActionLoading('revoke-all');
      try {
        await revokeAllOtherSessions();
        toast.success('Logged out of all other devices');
      } catch (err: any) {
        toast.error(err?.message || 'Failed to revoke sessions');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const formatUA = (uaString: string) => {
    if (!uaString) return 'Unknown Device';
    if (uaString.includes('Chrome/')) {
      if (uaString.includes('Windows')) return 'Chrome on Windows';
      if (uaString.includes('Macintosh')) return 'Chrome on macOS';
      if (uaString.includes('Android')) return 'Chrome on Android';
      if (uaString.includes('Linux')) return 'Chrome on Linux';
      return 'Chrome Browser';
    }
    if (uaString.includes('Safari/') && !uaString.includes('Chrome/')) {
      if (uaString.includes('iPhone')) return 'Safari on iPhone';
      if (uaString.includes('Macintosh')) return 'Safari on macOS';
      return 'Safari Browser';
    }
    if (uaString.includes('Firefox/')) {
      if (uaString.includes('Windows')) return 'Firefox on Windows';
      if (uaString.includes('Macintosh')) return 'Firefox on macOS';
      return 'Firefox Browser';
    }
    if (uaString.includes('Mobile')) return 'Mobile Web Browser';
    return uaString.length > 40 ? uaString.substring(0, 40) + '...' : uaString;
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const otherSessions = activeSessions.filter(s => !s.isCurrentDevice);
  const currentSession = activeSessions.find(s => s.isCurrentDevice);

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-card border-b border-white/5 py-4 px-6 flex items-center gap-4">
        <button onClick={() => navigate('/settings')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-lg font-bold">Active Sessions</h1>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Device & Session Security</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 mt-6 space-y-6">
        {/* Intro */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Session Security</h2>
              <p className="text-[11px] text-muted-foreground">Manage and revoke active sessions on your account</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            If you notice any unfamiliar devices or locations, revoke that session immediately to secure your account. You will be logged out of that device instantly.
          </p>
        </div>

        {/* Current device */}
        {currentSession && (
          <div className="glass-card p-6 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This Device</h3>
            <div className="flex items-start justify-between p-4 bg-primary/5 border border-primary/10 rounded-2xl">
              <div className="flex gap-4">
                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  {currentSession.deviceType === 'mobile' ? (
                    <Smartphone className="h-5 w-5 text-primary" />
                  ) : (
                    <Laptop className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-foreground">{formatUA(currentSession.userAgent)}</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    <span>IP: {currentSession.ipAddress}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Last active: Active Now</span>
                  </div>
                </div>
              </div>
              <span className="text-[9px] bg-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Current</span>
            </div>
          </div>
        )}

        {/* Other devices */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Other Active Devices</h3>
            {otherSessions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRevokeOthers}
                disabled={actionLoading !== null}
                className="text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/5 font-bold uppercase tracking-wider p-0 h-auto"
              >
                {actionLoading === 'revoke-all' ? 'Revoking...' : 'Revoke All'}
              </Button>
            )}
          </div>

          {isLoading && !actionLoading && (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!isLoading && otherSessions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-secondary/10 border border-white/5 rounded-2xl">
              <ShieldAlert className="h-8 w-8 text-muted-foreground/60 mb-2" />
              <span className="text-xs font-semibold text-muted-foreground">No other active devices</span>
              <span className="text-[10px] text-muted-foreground/60 mt-1">You are only logged in on this browser.</span>
            </div>
          )}

          <div className="space-y-3">
            {otherSessions.map(sess => (
              <div key={sess.sessionId} className="flex items-start justify-between p-4 bg-secondary/20 border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
                <div className="flex gap-4">
                  <div className="h-10 w-10 bg-secondary rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    {sess.deviceType === 'mobile' ? (
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Laptop className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold">{formatUA(sess.userAgent)}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <span>IP: {sess.ipAddress}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Last active: {formatTime(sess.lastActiveAt)}</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={actionLoading !== null}
                  onClick={() => handleRevoke(sess.sessionId)}
                  className="text-muted-foreground hover:text-red-400 hover:bg-red-500/5 rounded-xl shrink-0"
                >
                  {actionLoading === sess.sessionId ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
