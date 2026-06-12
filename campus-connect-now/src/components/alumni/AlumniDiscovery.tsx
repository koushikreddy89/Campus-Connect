/**
 * Alumni Discovery Cards Component
 * Tinder-style swipeable cards for discovering alumni
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, ChevronRight } from 'lucide-react';
import { useSocialStore } from '@/store/socialStore';
import { AlumniCard as AlumniCardType } from '@/types/social';
import { useNavigate } from 'react-router-dom';
import { Loader } from '@/components/Loader';

interface AlumniDiscoveryProps {
  college?: string;
  onFollowSuccess?: () => void;
}

export const AlumniDiscovery: React.FC<AlumniDiscoveryProps> = ({ college, onFollowSuccess }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const {
    discoveryAlumni,
    discoveryLoading,
    discoveryError,
    fetchDiscoveryAlumni,
    followAlumni,
    skipAlumni,
    isFollowing,
  } = useSocialStore();

  useEffect(() => {
    fetchDiscoveryAlumni(1, 20, college);
  }, [college, fetchDiscoveryAlumni]);

  const currentAlumni = discoveryAlumni[currentIndex];

  const handleSwipeRight = async () => {
    if (!currentAlumni || isAnimating) return;
    setIsAnimating(true);

    try {
      await followAlumni(currentAlumni._id);
      if (onFollowSuccess) {
        onFollowSuccess();
      }
    } catch (error) {
      console.error('Failed to follow alumni:', error);
    } finally {
      handleNextCard();
    }
  };

  const handleSwipeLeft = () => {
    if (!currentAlumni || isAnimating) return;
    setIsAnimating(true);
    skipAlumni(currentAlumni._id);
    handleNextCard();
  };

  const handleNextCard = () => {
    if (currentIndex < discoveryAlumni.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Fetch more alumni when reaching the end
      fetchDiscoveryAlumni(2, 20, college);
    }
    setIsAnimating(false);
  };

  const handleViewProfile = () => {
    if (currentAlumni) {
      navigate(`/alumni/${currentAlumni._id}`);
    }
  };

  if (discoveryLoading && discoveryAlumni.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size="lg" />
      </div>
    );
  }

  if (discoveryError) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-center">
        <div>
          <p className="text-red-500 mb-2">{discoveryError}</p>
          <button
            onClick={() => fetchDiscoveryAlumni(1, 20, college)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentAlumni) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-center">
        <div>
          <p className="text-gray-500 mb-2">No more alumni to discover</p>
          <button
            onClick={() => fetchDiscoveryAlumni(1, 20, college)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative h-[600px] perspective">
        <AnimatePresence>
          {currentAlumni && (
            <motion.div
              key={currentAlumni._id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0, x: 300 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-2xl h-full flex flex-col cursor-pointer">
                {/* Profile Image */}
                <div className="relative h-80 bg-gradient-to-br from-amber-400 to-orange-500 overflow-hidden">
                  {currentAlumni.profilePic ? (
                    <img
                      src={currentAlumni.profilePic}
                      alt={currentAlumni.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
                      {currentAlumni.name[0]}
                    </div>
                  )}

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                  {/* Badge */}
                  <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {currentAlumni.company || 'Professional'}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 flex flex-col justify-between overflow-hidden">
                  {/* Header */}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{currentAlumni.name}</h2>
                    <p className="text-amber-400 font-semibold mb-1">{currentAlumni.position}</p>
                    <p className="text-gray-400 text-sm mb-3">
                      {currentAlumni.college} • {currentAlumni.followerCount} followers
                    </p>

                    {/* Bio */}
                    {currentAlumni.bio && (
                      <p className="text-gray-300 text-sm line-clamp-3 mb-4">{currentAlumni.bio}</p>
                    )}

                    {/* Interests */}
                    {currentAlumni.interests && currentAlumni.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {currentAlumni.interests.slice(0, 3).map((interest) => (
                          <span
                            key={interest}
                            className="bg-slate-700 text-gray-300 px-3 py-1 rounded-full text-xs"
                          >
                            #{interest}
                          </span>
                        ))}
                        {currentAlumni.interests.length > 3 && (
                          <span className="text-gray-400 text-xs pt-1">
                            +{currentAlumni.interests.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* View Profile Link */}
                  <button
                    onClick={handleViewProfile}
                    className="text-amber-400 hover:text-amber-300 text-sm font-semibold flex items-center gap-2 mb-4 transition-colors"
                  >
                    View Full Profile
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 p-6 border-t border-slate-700">
                  <button
                    onClick={handleSwipeLeft}
                    disabled={isAnimating}
                    className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <X size={20} />
                    <span className="font-semibold">Skip</span>
                  </button>
                  <button
                    onClick={handleSwipeRight}
                    disabled={isAnimating}
                    className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl transition-colors disabled:opacity-50 font-semibold"
                  >
                    <Heart size={20} />
                    <span>Follow</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gray-400 text-sm">
          {currentIndex + 1} of {discoveryAlumni.length}
        </div>
      </div>
    </div>
  );
};

export default AlumniDiscovery;
