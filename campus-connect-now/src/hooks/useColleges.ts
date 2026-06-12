import { useState, useEffect, useCallback } from 'react';

interface College {
  id?: string;
  name: string;
  domain: string;
  alternativeDomains?: string[];
  location?: string;
  country?: string;
  keywords?: string[];
  founded?: number;
  type?: string;
  isCustom?: boolean;
  [key: string]: any;
}

interface UseCollegesResult {
  colleges: College[];
  loading: boolean;
  error: string | null;
  searchColleges: (searchText: string, limit?: number) => Promise<College[]>;
  getCollegeByDomain: (domain: string) => Promise<College | null>;
  stats: any;
  refreshColleges: () => Promise<void>;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Hook for accessing merged college dataset (custom + API)
 * Provides search, domain lookup, and caching
 */
export function useColleges(): UseCollegesResult {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Load all colleges on mount
  useEffect(() => {
    loadAllColleges();
  }, []);

  const loadAllColleges = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[useColleges] Fetching all colleges (merged dataset)');

      const response = await fetch(`${API_BASE_URL}/colleges`);

      if (!response.ok) {
        throw new Error('Failed to fetch colleges');
      }

      const data = await response.json();
      setColleges(data.data?.colleges || []);

      console.log(
        `[useColleges] ✅ Loaded ${data.data?.colleges?.length || 0} colleges`
      );
    } catch (err: any) {
      console.error('[useColleges] Error loading colleges:', err);
      setError(err.message || 'Failed to load colleges');
    } finally {
      setLoading(false);
    }
  };

  const searchColleges = useCallback(
    async (searchText: string, limit = 10): Promise<College[]> => {
      try {
        console.log(`[useColleges] Searching: "${searchText}"`);

        const response = await fetch(
          `${API_BASE_URL}/colleges/search?q=${encodeURIComponent(searchText)}&limit=${limit}`
        );

        if (!response.ok) {
          throw new Error('Failed to search colleges');
        }

        const data = await response.json();
        const results = data.data?.colleges || [];

        console.log(`[useColleges] Found ${results.length} colleges`);

        return results;
      } catch (err: any) {
        console.error('[useColleges] Search error:', err);
        return [];
      }
    },
    []
  );

  const getCollegeByDomain = useCallback(
    async (domain: string): Promise<College | null> => {
      try {
        if (!domain || domain.trim().length === 0) {
          return null;
        }

        console.log(`[useColleges] Looking up college for domain: ${domain}`);

        const response = await fetch(
          `${API_BASE_URL}/colleges/by-domain/${encodeURIComponent(domain)}`
        );

        if (!response.ok) {
          throw new Error('Failed to lookup college');
        }

        const data = await response.json();
        const college = data.data?.college;

        if (college) {
          console.log(`[useColleges] ✅ Found: ${college.name}`);
        } else {
          console.log(`[useColleges] ⚠️  No college found for domain: ${domain}`);
        }

        return college || null;
      } catch (err: any) {
        console.error('[useColleges] Lookup error:', err);
        return null;
      }
    },
    []
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/colleges/stats/overview`);

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
        console.log('[useColleges] Statistics:', data.data);
      }
    } catch (err) {
      console.error('[useColleges] Stats fetch error:', err);
    }
  }, []);

  const refreshColleges = useCallback(async () => {
    console.log('[useColleges] Refreshing colleges');
    await loadAllColleges();
    await fetchStats();
  }, []);

  return {
    colleges,
    loading,
    error,
    searchColleges,
    getCollegeByDomain,
    stats,
    refreshColleges,
  };
}

/**
 * Hook for domain auto-detection
 */
export function useCollegeDomainDetection(email: string | undefined) {
  const [college, setCollege] = useState<College | null>(null);
  const [loading, setLoading] = useState(false);
  const { getCollegeByDomain } = useColleges();

  useEffect(() => {
    if (!email || !email.includes('@')) {
      setCollege(null);
      return;
    }

    const detectCollege = async () => {
      setLoading(true);
      try {
        const domain = email.split('@')[1];
        const detected = await getCollegeByDomain(domain);
        setCollege(detected);
      } finally {
        setLoading(false);
      }
    };

    // Debounce detection
    const timeout = setTimeout(detectCollege, 500);
    return () => clearTimeout(timeout);
  }, [email, getCollegeByDomain]);

  return { college, loading };
}

export default useColleges;
