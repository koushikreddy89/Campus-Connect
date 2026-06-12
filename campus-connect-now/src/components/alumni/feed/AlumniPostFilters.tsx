/**
 * Alumni Feed Filters Component
 * Filters posts by type, company, and visibility
 */

import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import {
  PostType,
  POST_TYPE_LABELS,
  POST_TYPE_COLORS,
} from '@/types/alumniPost';
import { useAlumniPostFeedStore } from '@/store/alumniPostFeedStore';

// ============================================
// Props
// ============================================

interface AlumniPostFiltersProps {
  onFilterChange?: (filters: any) => void;
}

// ============================================
// Component
// ============================================

export const AlumniPostFilters: React.FC<AlumniPostFiltersProps> = memo(
  ({ onFilterChange }) => {
    const selectedType = useAlumniPostFeedStore((s) => s.selectedType);
    const setSelectedType = useAlumniPostFeedStore((s) => s.setSelectedType);
    const clearFilters = useAlumniPostFeedStore((s) => s.clearFilters);

    const handleTypeClick = useCallback(
      (type: PostType) => {
        const newType = selectedType === type ? null : type;
        setSelectedType(newType);
        onFilterChange?.({ type: newType });
      },
      [selectedType, setSelectedType, onFilterChange]
    );

    const types: PostType[] = ['job', 'referral', 'general', 'link'];

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-2 mb-6 pb-6 border-b border-slate-700/50"
      >
        {/* Filter Title */}
        <span className="text-sm font-semibold text-slate-300 mr-2">Filter:</span>

        {/* Type Filters */}
        {types.map((type) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTypeClick(type)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedType === type
                ? `bg-gradient-to-r ${POST_TYPE_COLORS[type]} text-white shadow-lg`
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            {POST_TYPE_LABELS[type]}
          </motion.button>
        ))}

        {/* Clear Filters Button */}
        {selectedType && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              clearFilters();
              onFilterChange?.({ type: null });
            }}
            className="ml-auto px-3 py-2 rounded-full text-sm font-medium bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50 flex items-center gap-1"
          >
            <X size={16} />
            Clear
          </motion.button>
        )}
      </motion.div>
    );
  }
);

AlumniPostFilters.displayName = 'AlumniPostFilters';

export default AlumniPostFilters;
