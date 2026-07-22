import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MerchantSubscriptionProvider } from './context/MerchantSubscriptionContext';
import Layout from './components/Layout';
import RoleGuard from './components/RoleGuard';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import FloatingChatbot from './components/FloatingChatbot';

// Auth Pages — lazy-loaded
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const MerchantSignup = React.lazy(() => import('./pages/auth/MerchantSignup'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const Suspended = React.lazy(() => import('./pages/Suspended'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));

// Admin Pages — lazy-loaded
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminMerchants = React.lazy(() => import('./pages/admin/AdminMerchants'));
const AdminCustomers = React.lazy(() => import('./pages/admin/AdminCustomers'));
const AdminTransactions = React.lazy(() => import('./pages/admin/AdminTransactions'));
const AdminReports = React.lazy(() => import('./pages/admin/AdminReports'));
const AdminRewardSettings = React.lazy(() => import('./pages/admin/AdminRewardSettings'));
const AdminAuditLogs = React.lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminComplaints = React.lazy(() => import('./pages/admin/AdminComplaints'));
const AdvertisementsPage = React.lazy(() => import('./pages/admin/AdvertisementsPage'));
const AdminSubscriptionPlans = React.lazy(() => import('./pages/admin/AdminSubscriptionPlans'));
const AdminMerchantSubscriptions = React.lazy(() => import('./pages/admin/AdminMerchantSubscriptions'));
const AdminInactivityMonitor = React.lazy(() => import('./pages/admin/AdminInactivityMonitor'));
const ChatbotAnalytics = React.lazy(() => import('./pages/admin/ChatbotAnalytics'));
const TopUpRequests = React.lazy(() => import('./pages/admin/TopUpRequests'));
const AdPayments = React.lazy(() => import('./pages/admin/AdPayments'));

// Merchant Pages — lazy-loaded
const MerchantDashboard = React.lazy(() => import('./pages/merchant/MerchantDashboard'));
const MerchantAddPoints = React.lazy(() => import('./pages/merchant/MerchantAddPoints'));
const MerchantRedeemPoints = React.lazy(() => import('./pages/merchant/MerchantRedeemPoints'));
const MerchantTransactions = React.lazy(() => import('./pages/merchant/MerchantTransactions'));
const MerchantSubscription = React.lazy(() => import('./pages/merchant/MerchantSubscription'));
const MerchantReports = React.lazy(() => import('./pages/merchant/MerchantReports'));
const TopUp = React.lazy(() => import('./pages/merchant/TopUp'));
const MerchantProfile = React.lazy(() => import('./pages/merchant/MerchantProfile'));
const MerchantPromote = React.lazy(() => import('./pages/merchant/MerchantPromote'));
const MerchantReferral = React.lazy(() => import('./pages/merchant/MerchantReferral'));

// Customer Pages — lazy-loaded
const CustomerDashboard = React.lazy(() => import('./pages/customer/CustomerDashboard'));
const FindPartners = React.lazy(() => import('./pages/customer/FindPartners'));
const CustomerProfile = React.lazy(() => import('./pages/customer/CustomerProfile'));


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
          <Suspense fallback={<LoadingSpinner fullPage />}>
          <Routes>
{/* Public Auth Routes */}
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/merchant-signup" element={<MerchantSignup />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/suspended" element={<Suspended />} />
<Route path="/privacy-policy" element={<PrivacyPolicy />} />

            {/* Authenticated Routes with Shell Layout */}
            <Route path="/" element={<MerchantSubscriptionProvider><Layout /></MerchantSubscriptionProvider>}>
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
                path="merchant/reports"
                element={
                  <RoleGuard allowedRoles={['merchant']}>
                    <MerchantReports />
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
                path="merchant/promote"
                element={
                  <RoleGuard allowedRoles={['merchant']}>
                    <MerchantPromote />
                  </RoleGuard>
                }
              />
              <Route
                path="merchant/referrals"
                element={
                  <RoleGuard allowedRoles={['merchant']}>
                    <MerchantReferral />
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
          </Suspense>
          <FloatingChatbot />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
