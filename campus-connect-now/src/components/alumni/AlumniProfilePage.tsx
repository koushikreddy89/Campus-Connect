/**
 * Alumni Profile Component
 * Instagram-style profile with posts grid and follower counts
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, MapPin, Briefcase, Users, UserPlus, UserCheck } from 'lucide-react';
import { useSocialStore } from '@/store/socialStore';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/Loader';

interface AlumniProfileProps {
  alumniId: string;
}

export const AlumniProfile: React.FC<AlumniProfileProps> = ({ alumniId }) => {
  const navigate = useNavigate();
  const { uid } = useAuthStore(s => ({ uid: s.uid }));
  const [isFollowingLocal, setIsFollowingLocal] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const {
    currentProfile,
    currentProfileLoading,
    currentProfileError,
    fetchAlumniProfile,
    followAlumni,
    unfollowAlumni,
    isFollowing,
  } = useSocialStore();

  useEffect(() => {
    fetchAlumniProfile(alumniId);
    setIsFollowingLocal(isFollowing(alumniId));
  }, [alumniId, fetchAlumniProfile, isFollowing]);

  const handleFollowClick = async () => {
    setIsFollowLoading(true);
    try {
      if (isFollowingLocal) {
        await unfollowAlumni(alumniId);
      } else {
        await followAlumni(alumniId);
      }
      setIsFollowingLocal(!isFollowingLocal);
    } catch (error) {
      console.error('Failed to update follow:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (currentProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  if (currentProfileError || !currentProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen text-center">
        <div>
          <p className="text-red-500 mb-2">{currentProfileError || 'Alumni not found'}</p>
          <button
            onClick={() => navigate('/alumni/discover')}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Back to Discovery
          </button>
        </div>
      </div>
    );
  }

  const profile = currentProfile;

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground">
      {/* Header Background */}
      <div className="relative h-64 bg-gradient-to-br from-primary/35 via-purple-500/20 to-transparent overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -mr-48 -mt-48 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full -ml-48 -mb-48 blur-2xl" />
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 bg-secondary/80 hover:bg-secondary border border-border rounded-full p-2 transition-colors"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Profile Section */}
      <div className="max-w-4xl mx-auto px-4 -mt-32 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 md:p-8"
        >
          {/* Avatar and Basic Info */}
          <div className="flex flex-col sm:flex-row gap-8 mb-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar className="w-32 h-32 border-4 border-primary shadow-lg">
                <AvatarImage src={profile.profilePic} />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-purple-600 text-white">
                  {profile.name[0]}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-white mb-2">{profile.name}</h1>
                <p className="text-lg text-primary font-semibold mb-2">
                  {profile.position || 'Professional'}
                </p>
                <div className="flex flex-col gap-2 text-muted-foreground mb-4">
                  {profile.company && (
                    <div className="flex items-center gap-2 text-xs">
                      <Briefcase size={16} className="text-primary" />
                      <span>{profile.company}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin size={16} className="text-primary" />
                    <span>{profile.college}</span>
                  </div>
                </div>

                {profile.bio && <p className="text-sm text-muted-foreground mb-4 leading-relaxed italic">"{profile.bio}"</p>}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-center">
                  <div className="text-xl font-extrabold text-foreground">{profile.postCount}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Posts</div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-center">
                  <div className="text-xl font-extrabold text-foreground">{profile.followerCount}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Followers</div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-center">
                  <div className="text-xl font-extrabold text-primary">{profile.followingCount}</div>
                  <div className="text-[10px] text-primary uppercase font-bold tracking-wider mt-1">Following</div>
                </div>
              </div>
            </div>

            {/* Follow Button */}
            {uid !== profile._id && (
              <div className="flex-shrink-0 flex flex-col gap-2">
                <Button
                  onClick={handleFollowClick}
                  disabled={isFollowLoading}
                  className={`px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                    isFollowingLocal
                      ? 'bg-secondary hover:bg-secondary/85 text-foreground'
                      : 'bg-primary hover:bg-primary/95 text-primary-foreground'
                  }`}
                >
                  {isFollowingLocal ? (
                    <>
                      <UserCheck size={18} />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Follow
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="border-t border-border/40 pt-6">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                Interests
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="bg-secondary hover:bg-secondary/85 text-primary px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                  >
                    #{interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Follow/Followers Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button className="bg-card/40 hover:bg-card/60 border border-border/40 rounded-xl py-3 text-foreground font-semibold flex items-center justify-center gap-2 transition-colors text-xs">
            <Users size={18} className="text-primary" />
            View Following
          </button>
          <button className="bg-card/40 hover:bg-card/60 border border-border/40 rounded-xl py-3 text-foreground font-semibold flex items-center justify-center gap-2 transition-colors text-xs">
            <Users size={18} className="text-primary" />
            View Followers
          </button>
        </div>

        {/* Posts Section */}
        {/* TODO: Implement posts grid display here */}
      </div>
    </div>
  );
};

export default AlumniProfile;
