/**
 * College Detection Utilities
 * 
 * File: src/utils/collegeDetection.ts
 * 
 * Provides utility functions for:
 * - Email domain extraction
 * - Email validation
 * - Domain normalization
 * - College lookup
 * - Edge case handling
 */

// ============================================
// 1. EMAIL VALIDATION & DOMAIN EXTRACTION
// ============================================

/**
 * Extract domain from email address
 * @param email - Email address
 * @returns Extracted domain or null if invalid
 * 
 * Examples:
 * user@vit.ac.in → vit.ac.in
 * user@student.vit.ac.in → student.vit.ac.in
 */
export function extractDomain(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const trimmedEmail = email.trim().toLowerCase();
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return null;
  }

  // Extract domain part
  const [, domain] = trimmedEmail.split('@');
  return domain || null;
}

/**
 * Check if email is from personal domain (Gmail, Yahoo, etc.)
 * @param email - Email address
 * @returns true if personal email, false if likely institutional
 */
export function isPersonalEmail(email: string): boolean {
  const domain = extractDomain(email);
  if (!domain) return false;

  const personalDomains = [
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'protonmail.com',
    'icloud.com',
    'aol.com',
    'mail.com',
    'inbox.com',
    '163.com',
    'qq.com',
  ];

  return personalDomains.includes(domain);
}

/**
 * Normalize domain by removing common subdomain prefixes
 * 
 * Examples:
 * cs.vit.ac.in → vit.ac.in
 * student.vit.ac.in → vit.ac.in
 * mail.vit.ac.in → vit.ac.in
 * 
 * @param domain - Domain to normalize
 * @returns Normalized domain
 */
export function normalizeDomain(domain: string): string {
  if (!domain) return domain;

  const commonSubdomains = [
    'mail',
    'student',
    'cs',
    'it',
    'cse',
    'ece',
    'mech',
    'civil',
    'admin',
    'portal',
    'webmail',
    'email',
    'smtp',
    'imap',
  ];

  const parts = domain.split('.');
  
  // Check if first part is a common subdomain
  if (parts.length > 2 && commonSubdomains.includes(parts[0])) {
    // Remove first part and rejoin
    return parts.slice(1).join('.');
  }

  return domain;
}

/**
 * Validate if email is institutional (college email)
 * @param email - Email address
 * @returns true if appears to be institutional email
 */
export function isInstitutionalEmail(email: string): boolean {
  // Not a personal domain
  if (isPersonalEmail(email)) {
    return false;
  }

  const domain = extractDomain(email);
  if (!domain) return false;

  // Should have at least 2-3 parts (e.g., vit.ac.in or college.edu)
  return domain.split('.').length >= 2;
}

// ============================================
// 2. FIRESTORE COLLEGE LOOKUP
// ============================================

import {
  findCollegeByDomainJSON,
  getAllCollegesJSON,
  searchCollegesByNameJSON
} from './collegeDetectionJSON';

export interface College {
  collegeId: string;
  name: string;
  shortName: string;
  domains: {
    primary: string;
    secondary?: string[];
  };
  location: {
    city: string;
    state?: string;
    country: string;
  };
  verified: boolean;
  active: boolean;
  website?: string;
  logo?: string;
  stats?: {
    totalUsers: number;
    activeUsers: number;
  };
}

function mapToCollege(data: any): College {
  return {
    collegeId: data.domain,
    name: data.name,
    shortName: data.name.split(' ')[0] || data.name,
    domains: {
      primary: data.domain,
      secondary: []
    },
    location: {
      city: 'Campus',
      country: 'India'
    },
    verified: true,
    active: true
  };
}

/**
 * Find college by exact domain match
 * Searches both primary and secondary domains
 * 
 * @param domain - Email domain
 * @returns College object or null if not found
 */
export async function findCollegeByDomain(domain: string): Promise<College | null> {
  if (!domain) return null;
  try {
    const match = await findCollegeByDomainJSON(domain);
    return match ? mapToCollege(match) : null;
  } catch (error) {
    console.error('Error finding college by domain:', error);
    return null;
  }
}

/**
 * Get all active colleges (for dropdown fallback)
 * 
 * @returns Array of colleges
 */
export async function getAllColleges(): Promise<College[]> {
  try {
    const colleges = await getAllCollegesJSON();
    return colleges.map(mapToCollege);
  } catch (error) {
    console.error('Error fetching colleges:', error);
    return [];
  }
}

/**
 * Search colleges by name
 * @param searchTerm - Name to search for
 * @returns Matching colleges
 */
export async function searchColleges(searchTerm: string): Promise<College[]> {
  if (!searchTerm) return [];
  try {
    const list = await searchCollegesByNameJSON(searchTerm);
    return list.map(mapToCollege);
  } catch (error) {
    console.error('Error searching colleges:', error);
    return [];
  }
}

// ============================================
// 3. COLLEGE DETECTION WITH LOGGING
// ============================================

export interface DetectionResult {
  success: boolean;
  college: College | null;
  domain: string | null;
  isPersonal: boolean;
  isInstitutional: boolean;
  normalizedDomain: string | null;
  message: string;
  detectionMethod: 'auto' | 'manual' | 'none';
}

/**
 * Complete college detection flow
 * 
 * @param email - User email
 * @returns Detection result with detailed info
 */
export async function detectCollegeFromEmail(email: string): Promise<DetectionResult> {
  console.log('🔍 [COLLEGE DETECTION] Starting detection for:', email);

  // Step 1: Validate email format
  const domain = extractDomain(email);
  if (!domain) {
    console.warn('❌ [COLLEGE DETECTION] Invalid email format:', email);
    return {
      success: false,
      college: null,
      domain: null,
      isPersonal: false,
      isInstitutional: false,
      normalizedDomain: null,
      message: 'Invalid email format',
      detectionMethod: 'none'
    };
  }

  console.log('✓ [COLLEGE DETECTION] Domain extracted:', domain);

  // Step 2: Check if personal email
  const isPersonal = isPersonalEmail(email);
  if (isPersonal) {
    console.warn('⚠️ [COLLEGE DETECTION] Personal email detected:', domain);
    return {
      success: false,
      college: null,
      domain,
      isPersonal: true,
      isInstitutional: false,
      normalizedDomain: domain,
      message: 'Personal emails not allowed. Please use your college email.',
      detectionMethod: 'none'
    };
  }

  // Step 3: Validate institutional email
  const isInstitutional = isInstitutionalEmail(email);
  if (!isInstitutional) {
    console.warn('⚠️ [COLLEGE DETECTION] Not institutional format:', domain);
    return {
      success: false,
      college: null,
      domain,
      isPersonal: false,
      isInstitutional: false,
      normalizedDomain: domain,
      message: 'Email does not appear to be from a college',
      detectionMethod: 'none'
    };
  }

  // Step 4: Normalize domain
  const normalizedDomain = normalizeDomain(domain);
  console.log('✓ [COLLEGE DETECTION] Domain normalized:', normalizedDomain);

  // Step 5: Search
  console.log('🔍 [COLLEGE DETECTION] Searching dataset for domain:', normalizedDomain);
  const college = await findCollegeByDomain(domain);

  if (college) {
    console.log('✅ [COLLEGE DETECTION] College found:', {
      collegeId: college.collegeId,
      collegeName: college.name,
      domain: normalizedDomain
    });

    return {
      success: true,
      college,
      domain,
      isPersonal: false,
      isInstitutional: true,
      normalizedDomain,
      message: `Automatically detected: ${college.name}`,
      detectionMethod: 'auto'
    };
  }

  console.warn('⚠️ [COLLEGE DETECTION] College not found for domain:', normalizedDomain);
  return {
    success: false,
    college: null,
    domain,
    isPersonal: false,
    isInstitutional: true,
    normalizedDomain,
    message: 'College not recognized. Please select manually or request addition.',
    detectionMethod: 'none'
  };
}

// ============================================
// 4. LOCAL CACHING (Performance Optimization)
// ============================================

interface DomainCache {
  domain: string;
  college: College | null;
  timestamp: number;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
let domainCache: Map<string, DomainCache> = new Map();

/**
 * Get college from cache if available
 */
function getCachedCollege(domain: string): College | null | undefined {
  const cached = domainCache.get(domain);
  if (!cached) return undefined;

  // Check if cache expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    domainCache.delete(domain);
    return undefined;
  }

  return cached.college;
}

/**
 * Set college in cache
 */
function setCacheCollege(domain: string, college: College | null): void {
  domainCache.set(domain, {
    domain,
    college,
    timestamp: Date.now()
  });
}

/**
 * Clear all cached domains (e.g., after admin adds new college)
 */
export function clearDomainCache(): void {
  console.log('🗑️ [CACHE] Clearing domain cache');
  domainCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: domainCache.size,
    domains: Array.from(domainCache.keys()),
    cacheHitRate: `${((domainCache.size / 100) * 100).toFixed(2)}%`
  };
}

// ============================================
// 5. EXPORT TYPE DEFINITIONS
// ============================================

export type { College, DetectionResult };
