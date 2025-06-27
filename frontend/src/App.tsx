import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminProblemsPage from './pages/AdminProblemsPage';
import MainLayout from './components/layout/MainLayout';
import { LayoutProvider } from './contexts/LayoutContext';
import QuickDuelPage from './pages/QuickDuelPage';
import ProblemsPage from './pages/ProblemsPage';
import ProblemSolvingPage from './pages/ProblemSolvingPage';
import { RealTimeDuel } from './components/duels/RealTimeDuel';

function App() {
  const { isAuthenticated, loading } = useAuth();

  // Show loading screen while checking authentication
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
    <Router>
      <ToastProvider>
        <LayoutProvider>
          <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />} />

            {/* Problem solving page without sidebar */}
            <Route path="/problems/:slug" element={isAuthenticated ? <ProblemSolvingPage /> : <Navigate to="/login" />} />

            <Route element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/problems" element={<ProblemsPage />} />
              <Route path="/quick-duel" element={<QuickDuelPage />} />
              <Route path="/admin" element={<AdminProblemsPage />} />
              {/* Add other authenticated routes here, they will have the sidebar */}
            </Route>
            
            {/* Duel page without sidebar for full-screen experience */}
            <Route path="/duels/:duelId" element={isAuthenticated ? <RealTimeDuel /> : <Navigate to="/login" />} />
          </Routes>
        </LayoutProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
