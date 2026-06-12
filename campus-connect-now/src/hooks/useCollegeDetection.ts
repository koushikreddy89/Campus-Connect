/**
 * useCollegeDetection - React Hook
 * 
 * File: src/hooks/useCollegeDetection.ts
 * 
 * Provides React hook for college auto-detection in signup/login flow
 */

import { useState, useCallback, useEffect } from 'react';
import {
  detectCollegeFromEmail,
  getAllColleges,
  searchColleges,
  College,
  DetectionResult,
} from '@/utils/collegeDetection';

export interface UseCollegeDetectionState {
  email: string;
  isDetecting: boolean;
  detection: DetectionResult | null;
  selectedCollege: College | null;
  allColleges: College[];
  searchResults: College[];
  isSearching: boolean;
  error: string | null;
}

export interface UseCollegeDetectionActions {
  // Auto-detect college from email
  handleEmailChange: (email: string) => void;
  // Manual college selection
  selectCollege: (college: College) => void;
  // Search colleges
  searchForCollege: (query: string) => Promise<void>;
  // Reset state
  reset: () => void;
}

/**
 * Hook for auto college detection
 * 
 * Usage in component:
 * const {
 *   email,
 *   detection,
 *   selectedCollege,
 *   allColleges,
 *   handleEmailChange,
 *   selectCollege,
 *   searchForCollege
 * } = useCollegeDetection();
 */
export function useCollegeDetection(): UseCollegeDetectionState & UseCollegeDetectionActions {
  // State
  const [email, setEmail] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [allColleges, setAllColleges] = useState<College[]>([]);
  const [searchResults, setSearchResults] = useState<College[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all colleges on mount
  useEffect(() => {
    const loadColleges = async () => {
      try {
        const colleges = await getAllColleges();
        setAllColleges(colleges);
      } catch (err) {
        console.error('Error loading colleges:', err);
        setError('Could not load colleges list');
      }
    };

    loadColleges();
  }, []);

  // Auto-detect college from email
  const handleEmailChange = useCallback(async (newEmail: string) => {
    setEmail(newEmail);
    setError(null);
    setSelectedCollege(null);

    if (!newEmail) {
      setDetection(null);
      return;
    }

    // Debounce: only detect if email looks somewhat complete
    if (!newEmail.includes('@')) {
      return;
    }

    setIsDetecting(true);

    try {
      const result = await detectCollegeFromEmail(newEmail);
      setDetection(result);

      // Auto-select if detected
      if (result.success && result.college) {
        setSelectedCollege(result.college);
      }
    } catch (err) {
      console.error('Detection error:', err);
      setError('Error detecting college');
    } finally {
      setIsDetecting(false);
    }
  }, []);

  // Manual college selection
  const selectCollege = useCallback((college: College) => {
    setSelectedCollege(college);
    setDetection(null);
    setSearchResults([]);
  }, []);

  // Search for college
  const searchForCollege = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const results = await searchColleges(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setError('Error searching colleges');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setEmail('');
    setDetection(null);
    setSelectedCollege(null);
    setSearchResults([]);
    setError(null);
    setIsDetecting(false);
    setIsSearching(false);
  }, []);

  return {
    // State
    email,
    isDetecting,
    detection,
    selectedCollege,
    allColleges,
    searchResults,
    isSearching,
    error,
    // Actions
    handleEmailChange,
    selectCollege,
    searchForCollege,
    reset,
  };
}

// ============================================
// ADDITIONAL HOOKS FOR ADMIN FUNCTIONALITY
// ============================================

export interface UseCollegeAdminState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  pendingRequests: any[];
}

export interface UseCollegeAdminActions {
  addCollege: (collegeData: Partial<College>) => Promise<string>;
  approveRequest: (requestId: string, collegeId: string) => Promise<void>;
  getPendingRequests: () => Promise<void>;
}

/**
 * Hook for college admin functions (Stubbed for MongoDB migration)
 */
export function useCollegeAdmin(): UseCollegeAdminState & UseCollegeAdminActions {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Add new college
  const addCollege = useCallback(async (collegeData: Partial<College>): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      setSuccess(true);
      return 'stub-college-id';
    } catch (err: any) {
      const message = err.message || 'Failed to add college';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Approve college request
  const approveRequest = useCallback(
    async (requestId: string, collegeId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        setSuccess(true);
      } catch (err: any) {
        setError(err.message || 'Failed to approve request');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Get pending requests
  const getPendingRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      setPendingRequests([]);
    } catch (err: any) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    success,
    pendingRequests,
    addCollege,
    approveRequest,
    getPendingRequests,
  };
}
