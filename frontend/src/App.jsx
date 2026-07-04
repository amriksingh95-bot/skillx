import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import RoleGuard from './components/RoleGuard';
import ErrorBoundary from './components/ErrorBoundary';
import FloatingChatbot from './components/FloatingChatbot';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import MerchantSignup from './pages/auth/MerchantSignup';
import ForgotPassword from './pages/ForgotPassword';
import Suspended from './pages/Suspended';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMerchants from './pages/admin/AdminMerchants';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminReports from './pages/admin/AdminReports';
import AdminRewardSettings from './pages/admin/AdminRewardSettings';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdvertisementsPage from './pages/admin/AdvertisementsPage';
import AdminSubscriptionPlans from './pages/admin/AdminSubscriptionPlans';
import AdminMerchantSubscriptions from './pages/admin/AdminMerchantSubscriptions';
import AdminInactivityMonitor from './pages/admin/AdminInactivityMonitor';
import ChatbotAnalytics from './pages/admin/ChatbotAnalytics';
import TopUpRequests from './pages/admin/TopUpRequests';
import AdPayments from './pages/admin/AdPayments';

// Merchant Pages
import MerchantDashboard from './pages/merchant/MerchantDashboard';
import MerchantAddPoints from './pages/merchant/MerchantAddPoints';
import MerchantRedeemPoints from './pages/merchant/MerchantRedeemPoints';
import MerchantTransactions from './pages/merchant/MerchantTransactions';
import MerchantSubscription from './pages/merchant/MerchantSubscription';
import TopUp from './pages/merchant/TopUp';
import MerchantProfile from './pages/merchant/MerchantProfile';

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import FindPartners from './pages/customer/FindPartners';
import CustomerProfile from './pages/customer/CustomerProfile';


// Helper to redirect to dashboard depending on role after log-in
function DashboardRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'merchant') return <Navigate to="/merchant/dashboard" replace />;
  if (user.role === 'customer') return <Navigate to="/customer/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
        <Router>
          <Routes>
{/* Public Auth Routes */}
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/merchant-signup" element={<MerchantSignup />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/suspended" element={<Suspended />} />

            {/* Authenticated Routes with Shell Layout */}
            <Route path="/" element={<Layout />}>
              {/* Root redirect to correct dashboard */}
              <Route index element={<DashboardRedirect />} />

              {/* Admin Protected Routes */}
              <Route
                path="admin/dashboard"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminDashboard />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/merchants"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminMerchants />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/customers"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminCustomers />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/transactions"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminTransactions />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/reports"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminReports />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/reward-settings"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminRewardSettings />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/audit-logs"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminAuditLogs />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/complaints"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminComplaints />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/advertisements"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdvertisementsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/subscription-plans"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminSubscriptionPlans />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/merchant-subscriptions"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminMerchantSubscriptions />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/inactivity-monitor"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdminInactivityMonitor />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/chatbot-analytics"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <ChatbotAnalytics />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/topup-requests"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <TopUpRequests />
                  </RoleGuard>
                }
              />
              <Route
                path="admin/ad-payments"
                element={
                  <RoleGuard allowedRoles={['super_admin']}>
                    <AdPayments />
                  </RoleGuard>
                }
              />

              {/* Merchant Protected Routes */}
              <Route
                path="merchant/dashboard"
                element={
                  <RoleGuard allowedRoles={['merchant']}>
                    <MerchantDashboard />
                  </RoleGuard>
                }
              />
              <Route
                path="merchant/add-points"
                element={
                  <RoleGuard allowedRoles={['merchant']}>
                    <MerchantAddPoints />
                  </RoleGuard>
                }
              />
              <Route
                path="merchant/redeem-points"
                element={
                  <RoleGuard allowedRoles={['merchant']}>
                    <MerchantRedeemPoints />
                  </RoleGuard>
                }
              />
              <Route
                path="merchant/transactions"
                element={
                  <RoleGuard allowedRoles={['merchant']}>
                    <MerchantTransactions />
                  </RoleGuard>
                }
              />
              <Route
                path="merchant/subscription"
                element={
                  <RoleGuard allowedRoles={['merchant']}>
                    <MerchantSubscription />
                  </RoleGuard>
                }
              />
              <Route
                path="merchant/topup"
                element={
                  <RoleGuard allowedRoles={['merchant']}>
                    <TopUp />
                  </RoleGuard>
                }
              />
              <Route
                path="merchant/profile"
                element={
                  <RoleGuard allowedRoles={['merchant']}>
                    <MerchantProfile />
                  </RoleGuard>
                }
              />

              {/* Customer Protected Routes */}
              <Route
                path="customer/dashboard"
                element={
                  <RoleGuard allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </RoleGuard>
                }
              />
              <Route
                path="customer/partners"
                element={
                  <RoleGuard allowedRoles={['customer']}>
                    <FindPartners />
                  </RoleGuard>
                }
              />
              <Route
                path="customer/profile"
                element={
                  <RoleGuard allowedRoles={['customer']}>
                    <CustomerProfile />
                  </RoleGuard>
                }
              />

            </Route>

            {/* Catch-all 404 -> Redirects to root */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <FloatingChatbot />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
