/**
 * Premium Stat Card Component
 * Displays animated statistics with icons
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface PremiumStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: number;
}

function PremiumStatCardComponent({
  label,
  value,
  icon: Icon,
  color,
  trend,
}: PremiumStatCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="relative p-4 rounded-xl overflow-hidden group cursor-pointer"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent backdrop-blur border border-white/10 group-hover:border-white/20 transition-all" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm text-slate-400">{label}</span>
          <motion.div
            whileHover={{ scale: 1.2, rotate: 10 }}
            className={`p-2 rounded-lg bg-gradient-to-br ${color} bg-opacity-20`}
          >
            <Icon className="w-4 h-4 text-white" />
          </motion.div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {trend && (
            <span className={`text-xs font-semibold ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(PremiumStatCardComponent);
