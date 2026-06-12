/**
 * Format professional designation and company professionally.
 * If designation exists: "[Designation] at [Company]" (or just designation if no company)
 * If company exists but designation is empty: "Working at [Company]"
 * If both are missing: "Alumni • Batch [Year]" or "Campus Connect Alumni"
 */
export function formatAlumniDesignation(profile?: {
  designation?: string;
  role?: string;
  company?: string;
  batch?: string;
  batchYear?: string;
}): string {
  if (!profile) return 'Campus Connect Alumni';

  // Extract designation, ignoring generic "alumni" value (case-insensitive)
  let designation = (profile.designation || '').trim();
  if (!designation && profile.role && profile.role.toLowerCase() !== 'alumni') {
    designation = profile.role.trim();
  }

  const company = (profile.company || '').trim();
  const batch = (profile.batch || profile.batchYear || '').trim();

  const hasDesignation = designation.length > 0 && designation.toLowerCase() !== 'alumni';
  const hasCompany = company.length > 0;

  if (hasDesignation && hasCompany) {
    return `${designation} at ${company}`;
  } else if (hasDesignation) {
    return designation;
  } else if (hasCompany) {
    return `Working at ${company}`;
  } else {
    return batch ? `Alumni • Batch ${batch}` : 'Campus Connect Alumni';
  }
}
