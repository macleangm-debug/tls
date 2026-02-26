import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { initPWA } from "./lib/pwa";
import { initDB } from "./lib/offlineDB";
import PWAInstallBanner from "./components/PWAInstallBanner";
import OfflineIndicator from "./components/OfflineIndicator";
import BottomNavBar from "./components/BottomNavBar";
import PasswordResetModal from "./components/PasswordResetModal";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import AdvocateDashboard from "./pages/AdvocateDashboard";
import ProfilePage from "./pages/ProfilePage";
import StampOrderPage from "./pages/StampOrderPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import DigitalStampsPage from "./pages/DigitalStampsPage";
import DocumentStampPage from "./pages/DocumentStampPage";
import BatchStampPage from "./pages/BatchStampPage";
import StampLedgerPage from "./pages/StampLedgerPage";
import MyStampsPage from "./pages/MyStampsPage";
import StampVerificationPage from "./pages/StampVerificationPage";
import InstitutionalPortal from "./pages/InstitutionalPortal";
import VerifyPage from "./pages/VerifyPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAdvocates from "./pages/AdminAdvocates";
import AdminOrders from "./pages/AdminOrders";
import TLSEventsAdmin from "./pages/TLSEventsAdmin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import IDCOrdersPage from "./pages/IDCOrdersPage";
import BusinessRegistrationPage from "./pages/BusinessRegistrationPage";
import AdvocateProfilePage from "./pages/AdvocateProfilePage";
import AdvocateDirectoryPage from "./pages/AdvocateDirectoryPage";
import PracticeManagementPage from "./pages/PracticeManagementPage";
import PaymentsPage from "./pages/PaymentsPage";
import "./App.css";

const ProtectedRoute = ({ children, adminOnly = false, superAdminOnly = false }) => {
  const { user, loading } = useAuth();
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  
  useEffect(() => {
    if (user?.force_password_reset) {
      setShowPasswordReset(true);
    }
  }, [user]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040A]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (superAdminOnly && user.role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (adminOnly && !["admin", "super_admin"].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <>
      {showPasswordReset && (
        <PasswordResetModal 
          isOpen={showPasswordReset} 
          onClose={() => setShowPasswordReset(false)} 
        />
      )}
      {children}
    </>
  );
};

function App() {
  // Initialize PWA and offline DB on app load
  useEffect(() => {
    // Initialize PWA
    initPWA().then((registration) => {
      if (registration) {
        console.log('PWA initialized successfully');
      }
    });
    
    // Initialize IndexedDB for offline storage
    initDB().then(() => {
      console.log('Offline database initialized');
    }).catch(err => {
      console.error('Failed to initialize offline database:', err);
    });
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/verify/:stampId" element={<VerifyPage />} />
          <Route path="/v/:stampId" element={<VerifyPage />} />
          <Route path="/business" element={<BusinessRegistrationPage />} />
          <Route path="/business-register" element={<BusinessRegistrationPage />} />
          <Route path="/for-business" element={<BusinessRegistrationPage />} />
          <Route path="/advocate/:advocateId" element={<AdvocateProfilePage />} />
          <Route path="/advocates" element={<AdvocateDirectoryPage />} />
          <Route path="/directory" element={<AdvocateDirectoryPage />} />
          
          {/* Advocate Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><AdvocateDashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/practice" element={<ProtectedRoute><PracticeManagementPage /></ProtectedRoute>} />
          <Route path="/practice-management" element={<ProtectedRoute><PracticeManagementPage /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
          <Route path="/order-stamp" element={<ProtectedRoute><StampOrderPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
          <Route path="/digital-stamps" element={<ProtectedRoute><DigitalStampsPage /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><DocumentStampPage /></ProtectedRoute>} />
          <Route path="/stamp-document" element={<ProtectedRoute><DocumentStampPage /></ProtectedRoute>} />
          <Route path="/batch-stamp" element={<ProtectedRoute><BatchStampPage /></ProtectedRoute>} />
          <Route path="/stamp-ledger" element={<ProtectedRoute><StampLedgerPage /></ProtectedRoute>} />
          <Route path="/stamp-settings" element={<ProtectedRoute><MyStampsPage /></ProtectedRoute>} />
          <Route path="/my-stamps" element={<ProtectedRoute><MyStampsPage /></ProtectedRoute>} />
          <Route path="/stamp-verification" element={<ProtectedRoute><StampVerificationPage /></ProtectedRoute>} />
          
          {/* Institutional Portal (separate login system) */}
          <Route path="/institutional" element={<InstitutionalPortal />} />
          
          {/* Admin Routes (TLS) */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/advocates" element={<ProtectedRoute adminOnly><AdminAdvocates /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute adminOnly><AdminOrders /></ProtectedRoute>} />
          
          {/* Super Admin Routes (IDC) */}
          <Route path="/super-admin" element={<ProtectedRoute superAdminOnly><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="/super-admin/orders" element={<ProtectedRoute superAdminOnly><IDCOrdersPage /></ProtectedRoute>} />
          <Route path="/idc/orders" element={<ProtectedRoute superAdminOnly><IDCOrdersPage /></ProtectedRoute>} />
        </Routes>
        <Toaster position="top-right" richColors />
        <PWAInstallBanner />
        <OfflineIndicator />
        <BottomNavBar />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
