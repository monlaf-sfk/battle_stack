import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminProblemsPage from './pages/AdminProblemsPage';
import { MainLayout } from './components/layout/MainLayout';
import { LayoutProvider } from './contexts/LayoutContext';
import QuickDuelPage from './pages/QuickDuelPage';
import ProblemsPage from './pages/ProblemsPage';
import ProblemSolvingPage from './pages/ProblemSolvingPage';
import ProfilePage from './pages/ProfilePage';
import PvEDuelPage from './pages/PvEDuelPage';
import { DuelProvider } from './contexts/DuelContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicRoute } from './components/auth/PublicRoute';
import LeaderboardsPage from "./pages/LeaderboardsPage";
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-arena-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-arena-accent border-t-transparent"></div>
          <p className="text-arena-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <LayoutProvider>
      <DuelProvider>
        <Routes>
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/problems/:problemId" element={<ProblemSolvingPage />} />
            <Route path="/admin/problems" element={<AdminProblemsPage />} />
            <Route path="/quick-duel" element={<QuickDuelPage />} />
            <Route path="/pve-duel" element={<PvEDuelPage />} />
            <Route path="/leaderboards" element={<LeaderboardsPage />} />
          </Route>
        </Routes>
      </DuelProvider>
    </LayoutProvider>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Router>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </Router>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
