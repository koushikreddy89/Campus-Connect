/**
 * User Role Management (Stubbed for MongoDB migration)
 */

export type UserRole = 'student' | 'admin' | 'alumni';

export async function fetchUserRole(uid: string): Promise<UserRole> {
  return 'student';
}

export async function fetchUserProfile(uid: string) {
  return null;
}
