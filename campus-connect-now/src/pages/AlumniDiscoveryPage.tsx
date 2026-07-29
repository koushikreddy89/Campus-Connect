/**
 * Alumni Discovery Page
 * Main page for discovering and following alumni
 */

import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import AlumniDiscovery from '@/components/alumni/AlumniDiscovery';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const AlumniDiscoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(s => !!s.uid);
  const [followCount, setFollowCount] = useState(0);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <p className="text-gray-300 mb-4">Please login to discover alumni</p>
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

  return (
    <>
      <Helmet>
        <title>Discover Alumni - Campus Connect</title>
        <meta name="description" content="Discover and connect with alumni from your college" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-20">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-slate-800/80 backdrop-blur-md border-b border-slate-700 py-4">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-amber-400" />
                  Discover Alumni
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Swipe to follow alumni from your network
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Following</p>
              <p className="text-2xl font-bold text-amber-400">{followCount}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <AlumniDiscovery
            onFollowSuccess={() => setFollowCount(followCount + 1)}
          />
        </div>

        {/* Tips Section */}
        <div className="max-w-md mx-auto px-4 mt-12">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Tips for Alumni Discovery
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>✨ Follow alumni to see their posts in your feed</li>
              <li>💼 View full profiles to learn more about their career paths</li>
              <li>🔗 Connect and network with professionals in your field</li>
              <li>📚 Get insights and advice from experienced alumni</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default AlumniDiscoveryPage;
