import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTenantInfo } from '@/context/TenantContext';

const ProtectedRoute = ({ children }) => {
  const user = sessionStorage.getItem('user');
  const cashierId = sessionStorage.getItem('cashier_id');
  const location = useLocation();
  const { features, loading } = useTenantInfo();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If POS feature is disabled in plan, do not force cashier shift flow
  if (!loading && !features?.havePOS) {
    return children;
  }

  // If user is authenticated but has no active cashier selected, redirect to /cashier
  if (!cashierId && location.pathname !== '/cashier') {
    return <Navigate to="/cashier" replace />;
  }

  // If user already has an active cashier / shift, prevent accessing /cashier
  if (cashierId && location.pathname === '/cashier') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
