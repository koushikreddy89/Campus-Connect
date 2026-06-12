/**
 * Alumni Social Feed Page
 * Displays personalized feed from followed alumni
 */

import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import SocialFeed from '@/components/alumni/SocialFeed';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Radio, Filter } from 'lucide-react';

type PostType = 'text' | 'image' | 'video' | 'referral' | 'roadmap' | undefined;

export const AlumniSocialFeedPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore(s => ({
    isAuthenticated: !!s.uid,
  }));
  const [selectedType, setSelectedType] = useState<PostType>(undefined);
  const [postCount, setPostCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <p className="text-gray-300 mb-4">Please login to view your feed</p>
          <button
            onClick={() => navigate('/auth')}
            className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  const postTypes: Array<{ value: PostType; label: string }> = [
    { value: undefined, label: 'All Posts' },
    { value: 'text', label: '📝 Text' },
    { value: 'image', label: '🖼️ Images' },
    { value: 'video', label: '🎬 Videos' },
    { value: 'referral', label: '🤝 Referrals' },
    { value: 'roadmap', label: '🗺️ Roadmaps' },
  ];

  return (
    <>
      <Helmet>
        <title>Alumni Feed - Campus Connect</title>
        <meta name="description" content="View updates from followed alumni" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-slate-800/80 backdrop-blur-md border-b border-slate-700">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Radio className="w-6 h-6 text-amber-400 animate-pulse" />
                  Alumni Feed
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  {postCount} {postCount === 1 ? 'post' : 'posts'} from {postCount > 0 ? 'your following' : 'alumni'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters
                    ? 'bg-amber-600 text-white'
                    : 'hover:bg-slate-700 text-gray-400'
                }`}
              >
                <Filter className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          {showFilters && (
            <div className="border-t border-slate-700 bg-slate-800/50 px-4 py-3">
              <div className="max-w-2xl mx-auto">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Filter by Type
                </p>
                <div className="flex flex-wrap gap-2">
                  {postTypes.map((type) => (
                    <button
                      key={String(type.value)}
                      onClick={() => setSelectedType(type.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedType === type.value
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feed Content */}
        <div className="max-w-2xl mx-auto px-4 py-8">
          <SocialFeed type={selectedType} onPostsLoaded={setPostCount} />
        </div>

        {/* Quick Actions */}
        {postCount === 0 && (
          <div className="max-w-2xl mx-auto px-4 mt-8 mb-20">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <h3 className="text-xl font-bold text-white mb-3">Start Following Alumni</h3>
              <p className="text-gray-400 mb-6">
                Follow alumni to see their posts, updates, and career insights in your feed
              </p>
              <button
                onClick={() => navigate('/alumni/discover')}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold transition-colors"
              >
                Discover Alumni
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AlumniSocialFeedPage;
