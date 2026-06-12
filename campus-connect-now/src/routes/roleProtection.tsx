/**
 * Role-Based Route Protection
 * 
 * Utility components for protecting routes based on user role
 * Ensures proper access control for Student, Alumni, and Admin users
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Loader } from '@/components/Loader';

type UserRole = 'student' | 'admin' | 'alumni';

interface RouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  fallbackPath?: string;
}

/**
 * ProtectedRoute - Requires authentication
 * Redirects to home if not authenticated
 */
export const ProtectedRoute: React.FC<RouteProps> = ({ 
  children, 
  fallbackPath = '/' 
}) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

/**
 * StudentRoute - Only for students
 * Redirects alumni to alumni home, admins to admin dashboard
 */
export const StudentRoute: React.FC<RouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const role = useAuthStore(s => s.role);
  const isLoading = useAuthStore(s => s.isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role === 'alumni') {
    return <Navigate to="/alumni/home" replace />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

/**
 * AlumniRoute - Only for alumni
 * Redirects students to student home, admins to admin dashboard
 */
export const AlumniRoute: React.FC<RouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const role = useAuthStore(s => s.role);
  const isLoading = useAuthStore(s => s.isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role !== 'alumni') {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

/**
 * AdminRoute - Only for admins
 * Redirects non-admins to their default home
 */
export const AdminRoute: React.FC<RouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const role = useAuthStore(s => s.role);
  const isLoading = useAuthStore(s => s.isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

/**
 * RoleBasedRedirect - Redirects based on role
 * Used on home route to send user to correct dashboard
 */
export const getRoleBasedHomePath = (
  role: UserRole | null,
  isProfileComplete: boolean
): string => {
  if (!role) return '/';

  if (role === 'admin') return '/admin';
  if (role === 'alumni') return '/alumni/home';
  
  // Student
  if (!isProfileComplete) return '/setup';
  return '/home';
};

/**
 * useRoleAccess - Hook to check role-based access
 */
export const useRoleAccess = (allowedRoles: UserRole[]) => {
  const role = useAuthStore(s => s.role);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  return {
    hasAccess: isAuthenticated && allowedRoles.includes(role),
    role,
    isAuthenticated,
  };
};
