import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import StudentRecordsPage from './pages/StudentRecordsPage';
import BillingHistoryPage from './pages/BillingHistoryPage';
import ExpensesPage from './pages/ExpensesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import FeeMasterPage from './pages/FeeMasterPage';
import MasterClassPage from './pages/MasterClassPage';
import ReceiptPage from './pages/ReceiptPage';
import UserManagementPage from './pages/UserManagementPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <span className="material-symbols-outlined text-secondary text-5xl animate-spin">progress_activity</span>
          <p className="mt-4 text-on-surface-variant font-body-md">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/student" element={
        <ProtectedRoute>
          <StudentDashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/receipt/:id" element={
        <ProtectedRoute>
          <ReceiptPage />
        </ProtectedRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="pos" element={<POSPage />} />
        <Route path="billing" element={<BillingHistoryPage />} />
        <Route path="students" element={<StudentRecordsPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="fees" element={<FeeMasterPage />} />
        <Route path="master-classes" element={<MasterClassPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route
          path="*"
          element={
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Coming Soon</h2>
                <p className="text-on-surface-variant">This page is under development.</p>
              </div>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
