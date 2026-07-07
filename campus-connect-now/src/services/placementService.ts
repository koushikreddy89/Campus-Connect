import { getApiUrl } from './connectionService';

export interface PlacementOpportunity {
  id?: string;
  _id?: string;
  companyLogo: string;
  companyName: string;
  jobRole: string;
  employmentType: 'Internship' | 'Full Time' | 'Full-Time' | 'Internship + PPO' | 'Contract' | 'Apprenticeship';
  package: string;
  packageVal?: number;
  location: string;
  expiryDate: string;
  description: string;
  eligibility: string;
  eligibleYears: string[];
  eligibleDepartments: string[];
  minimumCGPA: number;
  maximumBacklogs: number;
  eligibleBatches: string[];
  eligibleSections?: string[];
  createdBy: string;
  createdByName: string;
  createdByRole: 'Admin' | 'Alumni' | 'ADMIN' | 'ALUMNI';
  status: 'active' | 'archived' | 'pending' | 'trash';
  isVerified: boolean;
  referralAvailable: boolean;
  contactAlumni?: string;
  college: string;
  createdAt?: string;
  updatedAt?: string;

  // New production-grade fields
  title?: string;
  company?: string;
  role?: string;
  minCGPA?: number;
  maxBacklogs?: number;
  branches?: string[];
  batches?: string[];
  salary?: string;
  registrationDeadline?: string;
  driveDate?: string;
  applyLink?: string;
  placementType?: 'OFFICIAL' | 'ALUMNI_REFERRAL';
  isEligible?: boolean;
  ineligibilityReason?: string;
}

function getHeaders(contentType = 'application/json') {
  const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const placementService = {
  /**
   * Get eligible placements with search, filters, pagination
   */
  getPlacements: async (params: {
    tab?: 'admin' | 'alumni';
    search?: string;
    filters?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.tab) queryParams.append('tab', params.tab);
      if (params.search) queryParams.append('search', params.search);
      if (params.filters) queryParams.append('filters', params.filters);
      if (params.page) queryParams.append('page', String(params.page));
      if (params.limit) queryParams.append('limit', String(params.limit));

      const res = await fetch(`${getApiUrl()}/api/placements?${queryParams.toString()}`, {
        headers: getHeaders()
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch placements');
      return result;
    } catch (error: any) {
      console.error('[PlacementService] Error fetching placements:', error);
      throw error;
    }
  },

  /**
   * Get official placements
   */
  getOfficialPlacements: async (params: {
    search?: string;
    filters?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.filters) queryParams.append('filters', params.filters);
      if (params.page) queryParams.append('page', String(params.page));
      if (params.limit) queryParams.append('limit', String(params.limit));

      const res = await fetch(`${getApiUrl()}/api/placements/official?${queryParams.toString()}`, {
        headers: getHeaders()
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch official placements');
      return result;
    } catch (error: any) {
      console.error('[PlacementService] Error fetching official placements:', error);
      throw error;
    }
  },

  /**
   * Get alumni referrals
   */
  getAlumniReferrals: async (params: {
    search?: string;
    filters?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.filters) queryParams.append('filters', params.filters);
      if (params.page) queryParams.append('page', String(params.page));
      if (params.limit) queryParams.append('limit', String(params.limit));

      const res = await fetch(`${getApiUrl()}/api/placements/referrals?${queryParams.toString()}`, {
        headers: getHeaders()
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch alumni referrals');
      return result;
    } catch (error: any) {
      console.error('[PlacementService] Error fetching alumni referrals:', error);
      throw error;
    }
  },

  /**
   * Get specific placement details
   */
  getPlacementDetails: async (id: string): Promise<PlacementOpportunity> => {
    const res = await fetch(`${getApiUrl()}/api/placements/${id}`, {
      headers: getHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch details');
    return result.data;
  },

  /**
   * Get preview of eligible student count based on criteria
   */
  getPreviewCount: async (criteria: {
    eligibleYears: string[];
    eligibleDepartments: string[];
    minimumCGPA?: number;
    maximumBacklogs?: number | string;
    eligibleBatches: string[];
  }): Promise<number> => {
    const res = await fetch(`${getApiUrl()}/api/placements/preview-count`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(criteria)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch count');
    return result.count || 0;
  },

  /**
   * Create a new placement drive (Admin or Alumni)
   */
  createPlacement: async (payload: Partial<PlacementOpportunity>): Promise<PlacementOpportunity> => {
    const res = await fetch(`${getApiUrl()}/api/placements`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to create placement');
    return result.data;
  },

  /**
   * Delete a placement drive (soft delete)
   */
  deletePlacement: async (id: string): Promise<boolean> => {
    const res = await fetch(`${getApiUrl()}/api/placements/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete placement');
    return true;
  },

  /**
   * Update a placement drive
   */
  updatePlacement: async (id: string, payload: Partial<PlacementOpportunity>): Promise<PlacementOpportunity> => {
    const res = await fetch(`${getApiUrl()}/api/placements/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to update placement');
    return result.data;
  },

  /**
   * Duplicate a placement drive
   */
  duplicatePlacement: async (id: string): Promise<PlacementOpportunity> => {
    const res = await fetch(`${getApiUrl()}/api/placements/${id}/duplicate`, {
      method: 'POST',
      headers: getHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to duplicate placement');
    return result.data;
  },

  /**
   * Toggle pin status for a placement drive
   */
  togglePin: async (id: string): Promise<PlacementOpportunity> => {
    const res = await fetch(`${getApiUrl()}/api/placements/${id}/pin`, {
      method: 'POST',
      headers: getHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to pin placement');
    return result.data;
  },

  /**
   * Toggle pause/resume registration
   */
  togglePause: async (id: string): Promise<PlacementOpportunity> => {
    const res = await fetch(`${getApiUrl()}/api/placements/${id}/pause`, {
      method: 'POST',
      headers: getHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to pause placement');
    return result.data;
  },

  /**
   * Restore a soft-deleted placement drive
   */
  restore: async (id: string): Promise<PlacementOpportunity> => {
    const res = await fetch(`${getApiUrl()}/api/placements/${id}/restore`, {
      method: 'POST',
      headers: getHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to restore placement');
    return result.data;
  },

  /**
   * Permanently delete a placement drive
   */
  permanentDelete: async (id: string): Promise<boolean> => {
    const res = await fetch(`${getApiUrl()}/api/placements/${id}/permanent-delete`, {
      method: 'POST',
      headers: getHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to permanently delete placement');
    return true;
  },

  /**
   * Track action activity (view/click/apply)
   */
  trackActivity: async (id: string, action: 'view' | 'click' | 'apply'): Promise<void> => {
    try {
      await fetch(`${getApiUrl()}/api/placements/${id}/track`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action })
      });
    } catch (e) {
      console.error('Failed to track placement activity:', e);
    }
  },

  /**
   * Get all soft-deleted placements
   */
  getTrashPlacements: async (): Promise<PlacementOpportunity[]> => {
    const res = await fetch(`${getApiUrl()}/api/placements/trash`, {
      headers: getHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch trash placements');
    return result.data || [];
  }
};
