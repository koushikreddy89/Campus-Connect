import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { UserCard } from '@/components/UserCard';
import { BottomTabBar } from '@/components/BottomTabBar';
import { Loader } from '@/components/Loader';
import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NearbyPage() {
  const nearbyUsers = useUserStore(s => s.nearbyUsers);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGrantPermission = () => {
    setLoading(true);
    setTimeout(() => {
      setPermissionGranted(true);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-5 pb-3">
        <h1 className="font-display text-xl font-bold text-foreground">Nearby</h1>
        <p className="text-xs text-muted-foreground">People around your campus</p>
      </div>

      {!permissionGranted ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground mb-2">Enable Location</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Allow location access to discover people near you on campus
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleGrantPermission}
            className="gradient-primary rounded-2xl px-8 py-3 text-sm font-semibold text-primary-foreground"
          >
            {loading ? 'Getting location...' : 'Allow Location'}
          </motion.button>
        </div>
      ) : (
        <div className="px-5 grid grid-cols-2 gap-3">
          {nearbyUsers.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <UserCard user={user} />
            </motion.div>
          ))}
        </div>
      )}

      <BottomTabBar />
    </div>
  );
}
