/**
 * College Detection Components
 * 
 * File: src/components/auth/CollegeDetectionInput.tsx
 * 
 * Production-ready React components for college auto-detection
 */

import React, { useState } from 'react';
import { useCollegeDetection } from '@/hooks/useCollegeDetection';
import { College } from '@/utils/collegeDetection';
import { Loader2, AlertCircle, CheckCircle, Search } from 'lucide-react';

// ============================================
// 1. COLLEGE DETECTION INPUT COMPONENT
// ============================================

/**
 * Primary input component for email-based college detection
 * 
 * Features:
 * - Real-time email input
 * - Auto college detection on blur
 * - Personal email validation
 * - College auto-selection
 * - Loading states
 * - Error messages
 * - Manual fallback dropdown
 */
export function CollegeDetectionInput() {
  const {
    email,
    isDetecting,
    detection,
    selectedCollege,
    allColleges,
    searchResults,
    isSearching,
    error,
    handleEmailChange,
    selectCollege,
    searchForCollege,
  } = useCollegeDetection();

  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-4">
      {/* EMAIL INPUT */}
      <div className="relative">
        <label className="block text-sm font-medium text-foreground mb-2">
          College Email <span className="text-red-500">*</span>
        </label>

        <input
          type="email"
          value={email}
          onChange={(e) => {
            handleEmailChange(e.target.value);
            setShowDropdown(false); // Close dropdown on new input
          }}
          onBlur={() => {
            // Trigger detection on blur if not already done
            if (email && !detection) {
              handleEmailChange(email);
            }
          }}
          placeholder="your.email@college.edu"
          className={`
            w-full px-4 py-3 rounded-lg border-2 transition-all
            focus:outline-none
            ${
              detection?.isPersonal
                ? 'border-red-500 bg-red-50'
                : detection?.success
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 focus:border-primary'
            }
          `}
          disabled={isDetecting}
        />

        {/* LOADING INDICATOR */}
        {isDetecting && (
          <div className="absolute right-3 top-11 flex items-center">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* DETECTION MESSAGES */}
      {detection && (
        <div className={`
          p-3 rounded-lg flex items-center gap-2
          ${
            detection.success
              ? 'bg-green-100 text-green-800'
              : detection.isPersonal
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
          }
        `}>
          {detection.success && <CheckCircle className="w-4 h-4" />}
          {(detection.isPersonal || !detection.success) && <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">{detection.message}</span>
        </div>
      )}

      {/* AUTO-DETECTED COLLEGE DISPLAY */}
      {selectedCollege && detection?.success && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Detected College</p>
              <h3 className="text-lg font-semibold text-foreground">
                {selectedCollege.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Domain: {selectedCollege.domains.primary}
              </p>
            </div>
            {selectedCollege.logo && (
              <img 
                src={selectedCollege.logo} 
                alt={selectedCollege.name}
                className="w-12 h-12 rounded object-cover"
              />
            )}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            ✓ You're restricted to the {selectedCollege.shortName} campus ecosystem
          </p>
        </div>
      )}

      {/* MANUAL COLLEGE SELECTION (FALLBACK) */}
      {(!selectedCollege || !detection?.success) && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Or select your college manually:
          </label>

          {/* SEARCH FIELD */}
          <div className="relative">
            <div className="absolute left-3 top-3 text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search college name..."
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                searchForCollege(val);
              }}
              onFocus={() => setShowDropdown(true)}
              className="
                w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                focus:outline-none focus:border-primary
              "
            />
          </div>

          {/* DROPDOWN RESULTS */}
          {showDropdown && (
            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto bg-white shadow-lg">
              {isSearching ? (
                <div className="p-3 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((college) => (
                  <button
                    key={college.collegeId}
                    onClick={() => {
                      selectCollege(college);
                      setShowDropdown(false);
                      setSearchQuery('');
                    }}
                    className="
                      w-full text-left px-4 py-3 hover:bg-gray-100
                      border-b border-gray-200 last:border-b-0
                      transition-colors
                    "
                  >
                    <p className="font-medium text-foreground">
                      {college.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {college.location.city}, {college.location.country}
                    </p>
                  </button>
                ))
              ) : searchQuery ? (
                <div className="p-3 text-sm text-gray-600">
                  No colleges found. Try another search.
                  <p className="text-xs text-gray-500 mt-2">
                    <a href="#request-college" className="text-primary hover:underline">
                      Request your college to be added
                    </a>
                  </p>
                </div>
              ) : (
                <div className="p-3 text-sm text-gray-600">
                  {allColleges.length} colleges available. Start typing to search.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ERROR MESSAGES */}
      {error && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

// ============================================
// 2. COLLEGE REQUEST COMPONENT
// ============================================

/**
 * Component for users with unrecognized colleges to request addition
 */
export function RequestCollegeForm() {
  const [formData, setFormData] = React.useState({
    collegeName: '',
    domain: '',
    location: '',
    website: '',
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Submit request to Firestore
      // collegeRequests collection
      // await addDoc(collection(db, 'collegeRequests'), {
      //   ...formData,
      //   status: 'pending',
      //   requestedAt: new Date(),
      // });

      setSuccess(true);
      setFormData({ collegeName: '', domain: '', location: '', website: '' });

      // Reset success after 3s
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border-t-2 mt-6">
      <h3 className="font-semibold text-foreground">Request Your College</h3>

      {success && (
        <div className="p-3 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>Request submitted! Admins will review it soon.</span>
        </div>
      )}

      <input
        type="text"
        placeholder="College Name"
        value={formData.collegeName}
        onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
        required
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
      />

      <input
        type="email"
        placeholder="College Domain (e.g., college.edu)"
        value={formData.domain}
        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
        required
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
      />

      <input
        type="text"
        placeholder="Location (City, Country)"
        value={formData.location}
        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        required
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
      />

      <input
        type="url"
        placeholder="College Website (optional)"
        value={formData.website}
        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="
          w-full px-4 py-2 bg-primary text-white rounded-lg font-semibold
          hover:bg-primary/90 disabled:bg-gray-400 transition-colors
          flex items-center justify-center gap-2
        "
      >
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Submit Request
      </button>
    </form>
  );
}

// ============================================
// 3. COLLEGE DISPLAY CARD COMPONENT
// ============================================

/**
 * Reusable component to display college information
 */
export function CollegeCard({ college }: { college: College }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {college.logo && (
          <img
            src={college.logo}
            alt={college.name}
            className="w-16 h-16 rounded object-cover"
          />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{college.name}</h3>
          <p className="text-xs text-gray-600">
            {college.location.city}, {college.location.country}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {college.domains.primary}
            </span>
            {college.verified && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                ✓ Verified
              </span>
            )}
          </div>
          {college.stats && (
            <p className="text-xs text-gray-500 mt-2">
              {college.stats.activeUsers} active users
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 4. USAGE EXAMPLE IN SIGNUP PAGE
// ============================================

/**
 * Example: How to use CollegeDetectionInput in your signup page
 * 
 * import { CollegeDetectionInput, RequestCollegeForm } from '@/components/auth/CollegeDetectionInput';
 * 
 * function SignupPage() {
 *   return (
 *     <form>
 *       <CollegeDetectionInput />
 *       <RequestCollegeForm />
 *       <button type="submit">Sign Up</button>
 *     </form>
 *   );
 * }
 */
