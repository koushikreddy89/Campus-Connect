import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Shield, 
  Eye, 
  MessageSquare, 
  Search, 
  Bell, 
  Lock, 
  Key, 
  Laptop, 
  Smartphone,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrivacySettings {
  profileVisibility: 'Public' | 'College Only' | 'Connections Only' | 'Private';
  messagingPermissions: 'Everyone' | 'Alumni Only' | 'Connections Only' | 'Nobody';
  profileDiscovery: 'Show in Search' | 'Hide from Search';
  showPosts: boolean;
  showReferrals: boolean;
  showAchievements: boolean;
  referralAlerts: boolean;
  messageAlerts: boolean;
  resonanceEnabled?: boolean;
}

export default function PrivacySafetyPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: 'Public',
    messagingPermissions: 'Everyone',
    profileDiscovery: 'Show in Search',
    showPosts: true,
    showReferrals: true,
    showAchievements: true,
    referralAlerts: true,
    messageAlerts: true,
    resonanceEnabled: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordAlert, setShowPasswordAlert] = useState(false);
  const [otherSessions, setOtherSessions] = useState([
    { id: '1', device: 'Safari on iPhone 15', location: 'California, USA', active: false, time: '2 hours ago' }
  ]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/privacy-settings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const json = await res.json();
        if (json.success && json.privacySettings) {
          setSettings(json.privacySettings);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        toast.error('Failed to load privacy settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdateField = async (updatedFields: Partial<PrivacySettings>) => {
    const newSettings = { ...settings, ...updatedFields };
    setSettings(newSettings);
    setIsSaving(true);
    try {
      const res = await fetch('http://localhost:5000/api/privacy-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newSettings)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Settings updated');
      } else {
        toast.error(json.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutOthers = () => {
    setOtherSessions([]);
    toast.success('Successfully logged out of all other sessions');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-card border-b border-white/5 py-4 px-6 flex items-center gap-4">
        <button onClick={() => navigate('/settings')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-lg font-bold">Privacy & Safety</h1>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Manage Account settings</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 mt-6 space-y-6">
        {/* Profile Visibility */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Profile Visibility</h2>
              <p className="text-[11px] text-muted-foreground">Who can view your profile metrics and history</p>
            </div>
          </div>

          <select
            value={settings.profileVisibility}
            onChange={(e) => handleUpdateField({ profileVisibility: e.target.value as any })}
            className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-xs text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
          >
            <option value="Public">Public (Anyone can see)</option>
            <option value="College Only">College Only (Only students & faculty)</option>
            <option value="Connections Only">Connections Only (Only matched connections)</option>
            <option value="Private">Private (Only you)</option>
          </select>
        </div>

        {/* Messaging Permissions */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-accent/10 rounded-xl flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Messaging</h2>
              <p className="text-[11px] text-muted-foreground">Who can send you direct messages</p>
            </div>
          </div>

          <select
            value={settings.messagingPermissions}
            onChange={(e) => handleUpdateField({ messagingPermissions: e.target.value as any })}
            className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-xs text-foreground focus:ring-2 focus:ring-accent/50 outline-none"
          >
            <option value="Everyone">Everyone</option>
            <option value="Alumni Only">Alumni Only</option>
            <option value="Connections Only">Connections Only</option>
            <option value="Nobody">Nobody</option>
          </select>
        </div>

        {/* Discovery & Search */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-secondary rounded-xl flex items-center justify-center">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Discovery</h2>
              <p className="text-[11px] text-muted-foreground">Control if your profile shows up in Search and Discover</p>
            </div>
          </div>

          <select
            value={settings.profileDiscovery}
            onChange={(e) => handleUpdateField({ profileDiscovery: e.target.value as any })}
            className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-xs text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
          >
            <option value="Show in Search">Show in Search and Discover</option>
            <option value="Hide from Search">Hide from Search and Discover</option>
          </select>
        </div>

        {/* Dynamic toggles */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Display Options</h2>
              <p className="text-[11px] text-muted-foreground">Toggle visibility of specific profile sections</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-xs text-foreground/90">Show Posts on profile</span>
              <input
                type="checkbox"
                checked={settings.showPosts}
                onChange={(e) => handleUpdateField({ showPosts: e.target.checked })}
                className="rounded border-white/10 bg-secondary text-primary focus:ring-primary/30 h-4 w-4"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-xs text-foreground/90">Show Referrals on profile</span>
              <input
                type="checkbox"
                checked={settings.showReferrals}
                onChange={(e) => handleUpdateField({ showReferrals: e.target.checked })}
                className="rounded border-white/10 bg-secondary text-primary focus:ring-primary/30 h-4 w-4"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-xs text-foreground/90">Show Achievements on profile</span>
              <input
                type="checkbox"
                checked={settings.showAchievements}
                onChange={(e) => handleUpdateField({ showAchievements: e.target.checked })}
                className="rounded border-white/10 bg-secondary text-primary focus:ring-primary/30 h-4 w-4"
              />
            </label>
          </div>
        </div>

        {/* Notifications & Alerts */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-accent/10 rounded-xl flex items-center justify-center">
              <Bell className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Alerts & Notifications</h2>
              <p className="text-[11px] text-muted-foreground">Get notified about referrals and direct messages</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-xs text-foreground/90">Referrals Alerts</span>
              <input
                type="checkbox"
                checked={settings.referralAlerts}
                onChange={(e) => handleUpdateField({ referralAlerts: e.target.checked })}
                className="rounded border-white/10 bg-secondary text-accent focus:ring-accent/30 h-4 w-4"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-xs text-foreground/90">Message Alerts</span>
              <input
                type="checkbox"
                checked={settings.messageAlerts}
                onChange={(e) => handleUpdateField({ messageAlerts: e.target.checked })}
                className="rounded border-white/10 bg-secondary text-accent focus:ring-accent/30 h-4 w-4"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer py-1">
              <div className="flex flex-col">
                <span className="text-xs text-foreground/90">Resonance System (Read Awareness)</span>
                <span className="text-[9px] text-muted-foreground">Share reading and channel focus presence indicator</span>
              </div>
              <input
                type="checkbox"
                checked={settings.resonanceEnabled ?? true}
                onChange={(e) => handleUpdateField({ resonanceEnabled: e.target.checked })}
                className="rounded border-white/10 bg-secondary text-accent focus:ring-accent/30 h-4 w-4"
              />
            </label>
          </div>
        </div>

        {/* Account Security */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-secondary rounded-xl flex items-center justify-center">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Account Security</h2>
              <p className="text-[11px] text-muted-foreground">Password configuration and secure access</p>
            </div>
          </div>

          <Button
            onClick={() => setShowPasswordAlert(!showPasswordAlert)}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl h-11 text-xs font-semibold"
          >
            <Key className="h-4 w-4" /> Change Password
          </Button>

          {showPasswordAlert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-primary/5 border border-primary/20 rounded-2xl text-[11px] leading-relaxed text-foreground/90 space-y-1.5"
            >
              <p className="font-bold flex items-center gap-1.5 text-primary">
                <span>🔐</span> Secure OTP Authentication
              </p>
              <p>
                Campus Connect uses secure 6-digit email OTP codes to verify and authenticate your session directly. No passwords exist in our database, which completely eliminates credential theft or brute-force risks.
              </p>
            </motion.div>
          )}
        </div>

        {/* Sessions & Active Devices */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <Laptop className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Session Management</h2>
              <p className="text-[11px] text-muted-foreground">Devices currently logged into your account</p>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed">
            You can view all devices currently logged into your Campus Connect account and revoke any active sessions.
          </p>

          <Button
            onClick={() => navigate('/settings/security')}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl h-11 text-xs font-semibold"
          >
            <Shield className="h-4 w-4 text-primary" /> View & Manage Sessions
          </Button>
        </div>
      </div>
    </div>
  );
}
