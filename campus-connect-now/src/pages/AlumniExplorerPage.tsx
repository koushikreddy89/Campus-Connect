/**
 * Alumni Explorer Page
 * Main page for browsing and discovering alumni
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X } from 'lucide-react';
import { useAlumniStore } from '@/store/alumniStore';
import { useAuthStore } from '@/store/authStore';
import { AlumniCard, AlumniGrid } from '@/components/alumni/AlumniComponents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import {
  AlumniFilterParams,
  BatchOptions,
  PlacementTypeOptions,
  AlumniProfile,
} from '@/types/alumni';

export const AlumniExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AlumniFilterParams>({});
  const [page, setPage] = useState(0);

  // Store
  const authCollege = useAuthStore((state) => state.college);
  const college = authCollege || 'SR University';
  const {
    profiles,
    profilesLoading,
    currentFilters,
    fetchAlumniProfiles,
    searchAlumni,
    applyFilters,
    clearFilters,
    bookmarkedAlumni,
    bookmarkAlumni,
    unbookmarkAlumni,
  } = useAlumniStore();

  // Effects
  useEffect(() => {
    if (college) {
      fetchAlumniProfiles(college);
    }
  }, [college, fetchAlumniProfiles]);

  // Handlers
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!college) return;

    if (searchQuery.trim()) {
      await searchAlumni(searchQuery, college, currentFilters);
    } else {
      await fetchAlumniProfiles(college, currentFilters);
    }
  };

  const handleFilterChange = (newFilters: Partial<AlumniFilterParams>) => {
    const combined = { ...filters, ...newFilters };
    setFilters(combined);
  };

  const handleApplyFilters = async () => {
    if (!college) return;
    await applyFilters(filters, college);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    clearFilters();
    setFilters({});
    setSearchQuery('');
  };

  const handleBookmark = (alumniId: string) => {
    if (!college) return;
    if (bookmarkedAlumni.has(alumniId)) {
      unbookmarkAlumni(alumniId, college);
    } else {
      bookmarkAlumni(alumniId, college);
    }
  };

  const handleLoadMore = async () => {
    if (!college) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchAlumniProfiles(college, {
      ...currentFilters,
      offset: nextPage * 12,
    });
  };

  return (
    <div className="min-h-screen bg-background space-y-8 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold">Explore Alumni</h1>
            <p className="text-muted-foreground mt-2">
              Connect with successful alumni and learn from their experiences
            </p>
          </motion.div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search alumni by name, company, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <Button type="submit" className="h-12">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={20} />
            </Button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* Active Filters */}
        <AnimatePresence>
          {(Object.keys(currentFilters).length > 0 || searchQuery) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Active Filters
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchQuery && (
                  <Badge variant="secondary" className="gap-2">
                    Search: {searchQuery}
                    <X
                      size={14}
                      className="cursor-pointer hover:text-destructive"
                      onClick={() => setSearchQuery('')}
                    />
                  </Badge>
                )}
                {currentFilters.batch?.map((b) => (
                  <Badge key={b} variant="outline" className="gap-2">
                    Batch: {b}
                    <X size={14} className="cursor-pointer" />
                  </Badge>
                ))}
                {currentFilters.department?.map((d) => (
                  <Badge key={d} variant="outline" className="gap-2">
                    {d}
                    <X size={14} className="cursor-pointer" />
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Batch Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Batch Year</label>
                    <Select
                      value={filters.batch?.[0] || ''}
                      onValueChange={(value) =>
                        handleFilterChange({ batch: [value] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {BatchOptions.map((batch) => (
                          <SelectItem key={batch} value={batch}>
                            {batch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Placement Type Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Placement Type</label>
                    <Select
                      value={filters.placementType?.[0] || ''}
                      onValueChange={(value) =>
                        handleFilterChange({ placementType: [value] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PlacementTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort By</label>
                    <Select
                      value={filters.sortBy || 'recent'}
                      onValueChange={(value) =>
                        handleFilterChange({
                          sortBy: value as 'recent' | 'popular' | 'featured',
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="popular">Most Popular</SelectItem>
                        <SelectItem value="featured">Featured First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(false)}
                  >
                    Close
                  </Button>
                  <Button onClick={handleApplyFilters}>
                    Apply Filters
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alumni Grid */}
        <AlumniGrid
          items={profiles}
          isLoading={profilesLoading}
          type="profiles"
          onItemClick={(alumniId) => {
            // Navigate to alumni detail page
            navigate(`/alumni/${alumniId}`);
          }}
        />

        {/* Load More */}
        {profiles.length > 0 && profiles.length % 12 === 0 && (
          <div className="flex justify-center pt-8">
            <Button
              onClick={handleLoadMore}
              disabled={profilesLoading}
              variant="outline"
            >
              {profilesLoading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!profilesLoading && profiles.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <p className="text-lg font-semibold mb-2">No Alumni Profiles Available Yet</p>
            <p className="text-muted-foreground mb-6">
              Try adjusting your filters or search query, or create a profile to get started
            </p>
            <Button onClick={handleClearFilters} variant="outline">
              Clear Filters
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AlumniExplorerPage;
