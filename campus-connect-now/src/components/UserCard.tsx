import { User } from '@/types';
import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export const UserCard = ({ user }: { user: User }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.03 }}
    className="glass rounded-2xl overflow-hidden"
  >
    <div className="relative h-40">
      <img src={user.photos[0]} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute bottom-2 left-3 right-3">
        <p className="font-display text-sm font-bold text-foreground">{user.anonymousName || user.name}, {user.age}</p>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{user.distance} mi</span>
        </div>
      </div>
    </div>
  </motion.div>
);
