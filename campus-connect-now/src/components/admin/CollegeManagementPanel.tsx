/**
 * Admin Panel Components for College Management
 * 
 * File: src/components/admin/CollegeManagementPanel.tsx
 * 
 * Admin dashboard for:
 * - Adding new colleges
 * - Managing college domains
 * - Approving college requests
 * - Viewing statistics
 */

import React, { useEffect, useState } from 'react';
import { useCollegeAdmin } from '@/hooks/useCollegeDetection';
import { College } from '@/utils/collegeDetection';
import { 
  Loader2, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle,
  TrendingUp 
} from 'lucide-react';

// ============================================
// 1. COLLEGE MANAGEMENT TAB
// ============================================

/**
 * Component to manage colleges - add, edit, delete
 */
export function CollegeManagementTab() {
  const { addCollege, isLoading, error, success } = useCollegeAdmin();
  const [colleges, setColleges] = useState<College[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    domains: {
      primary: '',
      secondary: [] as string[],
    },
    location: {
      city: '',
      state: '',
      country: '',
    },
    website: '',
  });

  // Load colleges on mount
  useEffect(() => {
    loadColleges();
  }, []);

  const loadColleges = async () => {
    try {
      // Fetch from Firestore
      // const snapshot = await getDocs(collection(db, 'colleges'));
      // setColleges(snapshot.docs.map(doc => ({
      //   collegeId: doc.id,
      //   ...doc.data()
      // })));
    } catch (err) {
      console.error('Error loading colleges:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.domains.primary) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await addCollege({
        name: formData.name,
        shortName: formData.shortName,
        domains: {
          primary: formData.domains.primary.toLowerCase(),
          secondary: formData.domains.secondary.map(d => d.toLowerCase()),
        },
        location: formData.location,
        website: formData.website,
      } as Partial<College>);

      // Reset form
      setFormData({
        name: '',
        shortName: '',
        domains: { primary: '', secondary: [] },
        location: { city: '', state: '', country: '' },
        website: '',
      });
      setIsFormOpen(false);

      // Reload colleges
      loadColleges();
    } catch (err) {
      console.error('Error adding college:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Manage Colleges</h2>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="
            flex items-center gap-2 px-4 py-2 bg-primary text-white
            rounded-lg font-semibold hover:bg-primary/90 transition-colors
          "
        >
          <Plus className="w-4 h-4" />
          Add College
        </button>
      </div>

      {/* ADD COLLEGE FORM */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Add New College</h3>

          {error && (
            <div className="p-3 mb-4 bg-red-100 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 mb-4 bg-green-100 text-green-800 rounded-lg">
              College added successfully!
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* College Name */}
            <div>
              <label className="block text-sm font-medium mb-1">College Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VIT University"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            {/* Short Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Short Name</label>
              <input
                type="text"
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                placeholder="VIT"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            {/* Primary Domain */}
            <div>
              <label className="block text-sm font-medium mb-1">Primary Domain *</label>
              <input
                type="text"
                value={formData.domains.primary}
                onChange={(e) => setFormData({
                  ...formData,
                  domains: { ...formData.domains, primary: e.target.value }
                })}
                placeholder="vit.ac.in"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                value={formData.location.city}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, city: e.target.value }
                })}
                placeholder="Vellore"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            {/* Website */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.vit.ac.in"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="
                flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold
                hover:bg-primary/90 disabled:bg-gray-400 transition-colors
                flex items-center justify-center gap-2
              "
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Add College
            </button>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="
                flex-1 px-4 py-2 bg-gray-300 text-foreground rounded-lg font-semibold
                hover:bg-gray-400 transition-colors
              "
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* COLLEGES LIST */}
      <div className="space-y-3">
        {colleges.length > 0 ? (
          colleges.map((college) => (
            <div
              key={college.collegeId}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <h3 className="font-semibold text-foreground">{college.name}</h3>
                <p className="text-sm text-gray-600">
                  {college.domains.primary}
                  {college.domains.secondary && college.domains.secondary.length > 0 && (
                    <> + {college.domains.secondary.length} alternate(s)</>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {college.location.city}, {college.location.country}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-600">
            No colleges added yet. Click "Add College" to get started.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 2. COLLEGE REQUESTS TAB
// ============================================

/**
 * Approve pending college requests from users
 */
export function CollegeRequestsTab() {
  const { getPendingRequests, approveRequest, isLoading, pendingRequests } = useCollegeAdmin();

  useEffect(() => {
    getPendingRequests();
  }, [getPendingRequests]);

  const handleApprove = async (requestId: string) => {
    const collegeName = prompt('Enter college ID to create or link:');
    if (collegeName) {
      try {
        await approveRequest(requestId, collegeName);
        getPendingRequests();
      } catch (err) {
        console.error('Error approving request:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          College Requests {pendingRequests.length > 0 && (
            <span className="text-sm bg-red-500 text-white px-2 py-1 rounded ml-2">
              {pendingRequests.length}
            </span>
          )}
        </h2>
        <p className="text-gray-600">Review and approve user requests to add new colleges</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : pendingRequests.length > 0 ? (
        <div className="space-y-3">
          {pendingRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{request.college.name}</h3>
                  <p className="text-sm text-gray-600">Domain: {request.college.domain}</p>
                  <p className="text-sm text-gray-600">Location: {request.college.location}</p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Pending
                </span>
              </div>

              <div className="bg-gray-50 p-3 rounded text-sm">
                <p className="font-medium text-gray-700">Requested by:</p>
                <p className="text-gray-600">{request.userEmail}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(request.id)}
                  disabled={isLoading}
                  className="
                    flex-1 flex items-center justify-center gap-2 px-4 py-2
                    bg-green-500 text-white rounded-lg font-semibold
                    hover:bg-green-600 disabled:bg-gray-400 transition-colors
                  "
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  className="
                    flex-1 flex items-center justify-center gap-2 px-4 py-2
                    bg-red-500 text-white rounded-lg font-semibold
                    hover:bg-red-600 transition-colors
                  "
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-600 bg-gray-50 rounded-lg">
          No pending requests
        </div>
      )}
    </div>
  );
}

// ============================================
// 3. STATISTICS TAB
// ============================================

/**
 * Show statistics about colleges and users
 */
export function StatisticsTab() {
  const [stats, setStats] = useState({
    totalColleges: 0,
    totalUsers: 0,
    pendingRequests: 0,
    recentSignups: [],
  });

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    // Fetch statistics from Firestore
    // This is a simplified version
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Statistics</h2>

      {/* STAT CARDS */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total Colleges"
          value={stats.totalColleges.toString()}
          icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
        />
        <StatCard
          label="Total Users"
          value={stats.totalUsers.toString()}
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
        />
        <StatCard
          label="Pending Requests"
          value={stats.pendingRequests.toString()}
          icon={<TrendingUp className="w-6 h-6 text-orange-600" />}
        />
      </div>

      {/* CHART PLACEHOLDER */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-600">
        <p>Add charts using Chart.js or Recharts to visualize user growth, college distribution, etc.</p>
      </div>
    </div>
  );
}

// ============================================
// 4. STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        {icon && <div className="opacity-50">{icon}</div>}
      </div>
    </div>
  );
}

// ============================================
// 5. MAIN ADMIN PANEL COMPONENT
// ============================================

/**
 * Main admin panel with tabs
 */
export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'colleges' | 'requests' | 'stats'>('colleges');

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-gray-600 mt-2">Manage colleges and handle user requests</p>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('colleges')}
          className={`
            px-6 py-3 font-semibold transition-colors border-b-2 -mb-[2px]
            ${
              activeTab === 'colleges'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-foreground'
            }
          `}
        >
          Manage Colleges
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`
            px-6 py-3 font-semibold transition-colors border-b-2 -mb-[2px]
            ${
              activeTab === 'requests'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-foreground'
            }
          `}
        >
          College Requests
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`
            px-6 py-3 font-semibold transition-colors border-b-2 -mb-[2px]
            ${
              activeTab === 'stats'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-foreground'
            }
          `}
        >
          Statistics
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="bg-white rounded-lg p-6">
        {activeTab === 'colleges' && <CollegeManagementTab />}
        {activeTab === 'requests' && <CollegeRequestsTab />}
        {activeTab === 'stats' && <StatisticsTab />}
      </div>
    </div>
  );
}
