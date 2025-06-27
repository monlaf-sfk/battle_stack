import { useState, useEffect, useRef } from 'react';
import { authApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Header } from "@/components/layout/Header";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, LogIn, Sparkles, AlertTriangle, CheckCircle2, Swords } from "lucide-react";

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);

  // Auto-focus username field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      usernameRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Restore remember me preference from localStorage
  useEffect(() => {
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    setRememberMe(savedRememberMe);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setError('');
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const validateForm = () => {
    if (!username.trim()) {
      setError('Username is required');
      usernameRef.current?.focus();
      return false;
    }
    if (!password) {
      setError('Password is required');
      return false;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', username.trim());
      formData.append('password', password);

      // Add remember_me parameter to the URL
      const url = rememberMe ? '/token?remember_me=true' : '/token';

      const response = await authApi.post(url, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Show success toast
      addToast({
        type: 'success',
        title: 'Welcome back to the Arena!',
        message: rememberMe 
          ? 'Login successful with extended session. You\'ll stay logged in for 30 days!' 
          : 'Login successful. Redirecting to dashboard...',
        duration: 3000
      });
      
      // Show success state
      setShowSuccess(true);
      
      // Save remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }
      
      // Login and navigate after brief success display
      setTimeout(() => {
        login(response.data.access_token, response.data.refresh_token);
        navigate('/dashboard');
      }, 1000);
      
    } catch (err: any) {
      let errorMessage = 'Arena access denied. Please try again.';
      let errorTitle = 'Authentication Failed';
      
      if (err.response?.status === 401) {
        errorMessage = 'Invalid credentials. Check your username and password.';
        errorTitle = 'Arena Access Denied';
      } else if (err.response?.status === 429) {
        errorMessage = 'Too many attempts. Please wait before trying again.';
        errorTitle = 'Rate Limited';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      // Show error toast
      addToast({
        type: 'error',
        title: errorTitle,
        message: errorMessage,
        duration: 5000
      });
      
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-arena-dark relative flex items-center justify-center">
        {/* Background mesh effect */}
        <div className="fixed inset-0 bg-arena-gradient-mesh opacity-30 pointer-events-none" />
        
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center relative z-10"
        >
          <motion.div
            className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-arena-accent to-arena-tertiary rounded-2xl flex items-center justify-center shadow-arena-glow"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
            transition={{ duration: 0.8, repeat: 2 }}
          >
            <CheckCircle2 size={48} className="text-arena-dark" />
          </motion.div>
          <h2 className="text-3xl font-bold gradient-text mb-3">Arena Access Granted!</h2>
          <p className="text-arena-text-muted text-lg">Redirecting to your dashboard...</p>
          <motion.div 
            className="mt-4 w-48 h-1 mx-auto bg-arena-border rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-arena-accent to-arena-tertiary"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arena-dark relative overflow-hidden">
      {/* Background mesh effect */}
      <div className="fixed inset-0 bg-arena-gradient-mesh opacity-30 pointer-events-none" />

      <Header />
      
      <main className="flex items-center justify-center min-h-screen pt-20 pb-12 px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Login Card */}
          <Card variant="glass" className="border-arena-accent/20 shadow-arena-glow">
            <CardContent className="p-8 sm:p-10">
              {/* Logo and Title */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-center mb-8"
              >
                <motion.div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-arena-accent to-arena-tertiary mb-6 shadow-arena-glow"
                  animate={{ 
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: 6, repeat: Infinity }}
                >
                  <Swords size={40} className="text-arena-dark" />
                </motion.div>
                <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">
                  Welcome Back
                </h1>
                <p className="text-arena-text-muted text-lg">
                  Enter the arena and continue your coding journey
                </p>
              </motion.div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <Input
                    ref={usernameRef}
                    type="text"
                    label="Username or Email"
                    icon={<User size={18} />}
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    variant="glass"
                    hint="Enter your arena credentials"
                    autoComplete="username"
                    disabled={isLoading}
                    className="bg-arena-surface/50 border-arena-border focus:border-arena-accent/50"
                  />
                </motion.div>

                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  <Input
                    type="password"
                    label="Password"
                    icon={<Lock size={18} />}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    variant="glass"
                    showPasswordToggle
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="bg-arena-surface/50 border-arena-border focus:border-arena-accent/50"
                  />
                </motion.div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card variant="glass" className="border-red-400/30 bg-red-500/10">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-400 font-medium">{error}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Remember Me & Forgot Password */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="flex items-center justify-between"
                >
                  <label className="flex items-center cursor-pointer group">
                    <motion.input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded bg-arena-surface border-arena-border text-arena-accent focus:ring-arena-accent/50 transition-all"
                      whileTap={{ scale: 0.95 }}
                    />
                    <span className="ml-3 text-sm text-arena-text-muted group-hover:text-arena-text transition-colors">
                      Remember me
                    </span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-arena-accent hover:text-arena-accent-hover transition-colors font-medium"
                  >
                    Forgot password?
                  </Link>
                </motion.div>

                {/* Submit Button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  <Button
                    type="submit"
                    variant="gradient"
                    className="w-full text-lg py-4 font-bold shadow-arena-glow"
                    loading={isLoading}
                    disabled={isLoading}
                  >
                    <LogIn size={20} className="mr-3" />
                    {isLoading ? 'Entering Arena...' : 'Enter Arena'}
                  </Button>
                </motion.div>
              </form>

              {/* Divider */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                className="relative my-8"
              >
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-arena-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-arena-dark/90 text-arena-text-muted backdrop-blur-sm rounded-lg border border-arena-border">
                    Or continue with
                  </span>
                </div>
              </motion.div>

              {/* Social Login */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="grid grid-cols-2 gap-4"
              >
                <Button variant="glass" className="w-full border border-arena-border hover:border-arena-accent/40" disabled={isLoading}>
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 mr-2" />
                  Google
                </Button>
                <Button variant="glass" className="w-full border border-arena-border hover:border-arena-accent/40" disabled={isLoading}>
                  <img src="https://www.svgrepo.com/show/512120/github-142.svg" alt="GitHub" className="w-5 h-5 mr-2" />
                  GitHub
                </Button>
              </motion.div>

              {/* Sign Up Link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="mt-8 text-center"
              >
                <p className="text-arena-text-muted">
                  New to the arena?{' '}
                  <Link
                    to="/register"
                    className="text-arena-accent hover:text-arena-accent-hover transition-colors font-bold"
                  >
                    Join the battle!
                  </Link>
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default LoginPage; 