import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute — wraps routes that require authentication.
 *
 * Props:
 *   allowedRoles  — array of role strings that may access this route
 *                   e.g. ['customer'] | ['vendor'] | ['admin'] | ['admin','vendor']
 *                   omit (or pass []) to allow ANY authenticated user
 *   redirectTo    — where to send unauthenticated visitors (default '/login')
 *   deniedTo      — where to send authenticated users who lack the role (default '/403')
 *
 * Usage:
 *   <Route path="/profile"     element={<ProtectedRoute allowedRoles={['customer']}><CustomerProfile /></ProtectedRoute>} />
 *   <Route path="/vendor"      element={<ProtectedRoute allowedRoles={['vendor']} redirectTo="/vendor/login"><VendorHome /></ProtectedRoute>} />
 *   <Route path="/admin"       element={<ProtectedRoute allowedRoles={['admin']}  redirectTo="/admin/login"><AdminHome /></ProtectedRoute>} />
 *   <Route path="/delivery"    element={<ProtectedRoute allowedRoles={['delivery']} redirectTo="/delivery/login"><DeliveryHome /></ProtectedRoute>} />
 */
export default function ProtectedRoute({
  children,
  allowedRoles = [],
  redirectTo   = '/login',
  deniedTo     = '/403',
}) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  // Not logged in — send to login, remember where they were headed
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Logged in but wrong role
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={deniedTo} replace />;
  }

  return children;
}
