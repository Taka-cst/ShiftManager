import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * 管理者なら/admin、一般ユーザーなら/dashboardへリダイレクトするコンポーネント
 */
const DashboardRedirector: React.FC = () => {
  const { isAdmin } = useAuth();
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export default DashboardRedirector;
