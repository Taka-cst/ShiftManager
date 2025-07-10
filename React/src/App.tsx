import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import Navbar from './components/Navbar';
import ErrorAlert from './components/ErrorAlert';
import AuthGuard from './components/AuthGuard';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import DashboardRedirector from './pages/DashboardRedirector';
import ShiftRequestsPage from './pages/ShiftRequestsPage';
import ShiftRequestFormPage from './pages/ShiftRequestFormPage';
import ConfirmedShiftsPage from './pages/ConfirmedShiftsPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminShiftRequestsPage from './pages/AdminShiftRequestsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminDayOfWeekSettingsPage from './pages/AdminDayOfWeekSettingsPage';
import AdminMonthlyShiftPage from './pages/AdminMonthlyShiftPage';
import AdminConfirmedShiftsPage from './pages/AdminConfirmedShiftsPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorProvider>
        <AuthProvider>
          <Router>
            <Navbar />
            <ErrorAlert />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route 
                path="/dashboard" 
                element={
                  <AuthGuard>
                    <Dashboard />
                  </AuthGuard>
                } 
              />
              {/* 管理者は一般ダッシュボードをスキップし、/adminへリダイレクト */}
              <Route 
                path="/dashboard" 
                element={
                  <AuthGuard>
                    <DashboardRedirector />
                  </AuthGuard>
                } 
              />
              <Route 
                path="/shift-requests" 
                element={
                  <AuthGuard>
                    <ShiftRequestsPage />
                  </AuthGuard>
                } 
              />
              <Route 
                path="/shift-requests/new" 
                element={
                  <AuthGuard>
                    <ShiftRequestFormPage />
                  </AuthGuard>
                } 
              />
              <Route 
                path="/shift-requests/:id/edit" 
                element={
                  <AuthGuard>
                    <ShiftRequestFormPage />
                  </AuthGuard>
                } 
              />
              <Route 
                path="/confirmed-shifts" 
                element={
                  <AuthGuard>
                    <ConfirmedShiftsPage />
                  </AuthGuard>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <AuthGuard adminOnly>
                    <AdminDashboard />
                  </AuthGuard>
                } 
              />

                  <Route path="/admin/shift-requests" 
                    element={
                      <AuthGuard adminOnly>
                        <AdminShiftRequestsPage />
                      </AuthGuard>
                    }  
                  />
                  <Route
                    path="/admin/monthly-shifts"
                    element={
                      <AuthGuard adminOnly>
                        <AdminMonthlyShiftPage />
                      </AuthGuard>
                    }
                  />
                  <Route
                path="/admin/confirmed-shifts"
                element={
                  <AuthGuard adminOnly>
                    <AdminConfirmedShiftsPage />
                  </AuthGuard>
                }
              />
  <Route 
    path="/admin/users" 
    element={
        <AuthGuard adminOnly>
        <AdminUsersPage />
      </AuthGuard>
    } 
  />
  <Route 
  path="/admin/settings" 
  element={
    <AuthGuard adminOnly>
      <AdminDayOfWeekSettingsPage />
    </AuthGuard>
  } 
/>
    <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
          </Router>
        </AuthProvider>
      </ErrorProvider>
    </ThemeProvider>
  );
};

export default App;