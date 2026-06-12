/**
 * Alumni Feed Search Component
 * Search posts by keyword
 */

import React, { memo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useAlumniPostFeedStore } from '@/store/alumniPostFeedStore';

// ============================================
// Props
// ============================================

interface AlumniPostSearchProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

// ============================================
// Component
// ============================================

export const AlumniPostSearch: React.FC<AlumniPostSearchProps> = memo(
  ({ onSearch, placeholder = 'Search posts by keyword, company, skills...' }) => {
    const [isFocused, setIsFocused] = useState(false);
    const searchQuery = useAlumniPostFeedStore((s) => s.searchQuery);
    const setSearchQuery = useAlumniPostFeedStore((s) => s.setSearchQuery);
    const clearSearch = useAlumniPostFeedStore((s) => s.clearSearch);

    const handleChange = useCallback(
      (value: string) => {
        setSearchQuery(value);
        onSearch?.(value);
      },
      [setSearchQuery, onSearch]
    );

    const handleClear = useCallback(() => {
      clearSearch();
      onSearch?.('');
    }, [clearSearch, onSearch]);

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div
          className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            isFocused
              ? 'bg-gradient-to-r from-slate-800 to-slate-700 border border-blue-500/50 shadow-lg shadow-blue-500/20'
              : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50'
          }`}
        >
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-white placeholder-slate-500 text-sm"
          />

          {searchQuery && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleClear}
              className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X size={16} className="text-slate-400" />
            </motion.button>
          )}
        </div>

        {/* Search Suggestions */}
        {isFocused && searchQuery.length > 2 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 border border-slate-700/50 rounded-xl p-3 z-10 space-y-2"
          >
            <div className="text-xs text-slate-400">Recent searches</div>
            {/* Suggestions would be populated from API */}
          </motion.div>
        )}
      </motion.div>
    );
  }
);

AlumniPostSearch.displayName = 'AlumniPostSearch';

export default AlumniPostSearch;
