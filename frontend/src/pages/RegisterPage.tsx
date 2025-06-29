import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Header } from "@/components/layout/Header";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import { Link } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, label: '', color: '' });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();
  const usernameRef = useRef<HTMLInputElement>(null);

  // Auto-focus username field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      usernameRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
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

  const calculatePasswordStrength = (pass: string): PasswordStrength => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) score++;
    if (pass.match(/[0-9]/)) score++;
    if (pass.match(/[^a-zA-Z0-9]/)) score++;

    const strengths = [
      { score: 0, label: '', color: '' },
      { score: 1, label: 'WEAK', color: 'text-red-400' },
      { score: 2, label: 'FAIR', color: 'text-orange-400' },
      { score: 3, label: 'GOOD', color: 'text-yellow-400' },
      { score: 4, label: 'STRONG', color: 'text-green-400' }
    ];

    return strengths[score];
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(calculatePasswordStrength(newPassword));
  };

  const validateForm = () => {
    if (!username.trim()) {
      setError('Username is required');
      usernameRef.current?.focus();
      return false;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!password) {
      setError('Password is required');
      return false;
    }
    if (passwordStrength.score < 2) {
      setError('Password is too weak. Please choose a stronger password.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!acceptTerms) {
      setError('Please accept the Terms of Service and Privacy Policy');
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
      await authApi.post('/register', {
        username: username.trim(),
        email: email.trim(),
        password,
      });

      // Show success toast
      addToast({
        type: 'success',
        title: 'Account Created',
        message: 'Account created successfully. Logging you in...',
        duration: 3000
      });

      // Show success state
      setShowSuccess(true);

      // Log in the user after successful registration
      const formData = new URLSearchParams();
      formData.append('username', username.trim());
      formData.append('password', password);

      const response = await authApi.post('/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Delay navigation to show success message
      setTimeout(() => {
        login(response.data.access_token, response.data.refresh_token);
        navigate('/dashboard');
      }, 1500);
      
    } catch (err: any) {
      let errorMessage = 'Registration failed. Please try again.';
      let errorTitle = 'Registration Error';
      
      if (err.response?.status === 409) {
        errorMessage = 'Username or email already in use. Choose different credentials.';
        errorTitle = 'Account Conflict';
      } else if (err.response?.status === 422) {
        errorMessage = 'Invalid information provided. Check your details.';
        errorTitle = 'Invalid Data';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      // Show error toast
      addToast({
        type: 'error',
        title: errorTitle,
        message: errorMessage,
        duration: 6000
      });
      
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formValidation = {
    username: username.length >= 3,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    password: passwordStrength.score >= 2,
    confirmPassword: password === confirmPassword && confirmPassword.length > 0,
    terms: acceptTerms
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-28 h-28 mx-auto mb-8 bg-white rounded-lg flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 360] }}
            transition={{ duration: 2, repeat: 1 }}
          >
            <CheckCircle size={56} className="text-black" />
          </motion.div>
          <h2 className="text-4xl font-bold text-white mb-4 font-mono">ACCOUNT CREATED</h2>
          <p className="text-gray-400 text-lg mb-2 font-mono">YOUR PROFILE HAS BEEN CREATED.</p>
          <p className="text-gray-500 font-mono">LOGGING YOU IN...</p>
          <motion.div 
            className="mt-6 w-64 h-1 mx-auto bg-gray-800 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className="h-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="flex items-center justify-center min-h-screen pt-20 pb-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Register Card */}
          <Card className="bg-gray-900 border border-gray-800">
            <CardContent className="p-8 sm:p-10">
              {/* Logo and Title */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-center mb-8"
              >
                <motion.div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-lg bg-white mb-6"
                  animate={{ 
                    rotate: [0, -5, 5, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: 6, repeat: Infinity }}
                >
                  <span className="text-2xl font-bold text-black font-mono">BS</span>
                </motion.div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 font-mono">
                  CREATE ACCOUNT
                </h1>
                <p className="text-gray-400 text-lg font-mono">
                  JOIN BATTLESTACK AND START CODING
                </p>
              </motion.div>

              {/* Register Form */}
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <Input
                    ref={usernameRef}
                    type="text"
                    label="USERNAME"
                    icon={<User size={18} />}
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    success={formValidation.username ? 'Username available' : undefined}
                    autoComplete="username"
                    disabled={isLoading}
                    className="bg-gray-800 border-gray-700 text-white focus:border-gray-600"
                  />
                </motion.div>

                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  <Input
                    type="email"
                    label="EMAIL"
                    icon={<Mail size={18} />}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    success={formValidation.email ? 'Valid email address' : undefined}
                    autoComplete="email"
                    disabled={isLoading}
                    className="bg-gray-800 border-gray-700 text-white focus:border-gray-600"
                  />
                </motion.div>

                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  <Input
                    type="password"
                    label="PASSWORD"
                    icon={<Lock size={18} />}
                    required
                    value={password}
                    onChange={handlePasswordChange}
                    showPasswordToggle
                    autoComplete="new-password"
                    disabled={isLoading}
                    success={passwordStrength.score >= 3 ? 'Strong password' : undefined}
                    className="bg-gray-800 border-gray-700 text-white focus:border-gray-600"
                  />
                  {/* Password Strength Indicator */}
                  {password && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 space-y-2"
                    >
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <motion.div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              level <= passwordStrength.score
                                ? passwordStrength.score === 1 ? 'bg-red-400'
                                : passwordStrength.score === 2 ? 'bg-orange-400'
                                : passwordStrength.score === 3 ? 'bg-yellow-400'
                                : 'bg-green-400'
                                : 'bg-gray-700'
                            }`}
                            animate={{ scale: level <= passwordStrength.score ? [1, 1.1, 1] : 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        ))}
                      </div>
                      {passwordStrength.label && (
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium font-mono ${passwordStrength.color}`}>
                            SECURITY LEVEL: {passwordStrength.label}
                          </span>
                          {passwordStrength.score >= 3 && (
                            <CheckCircle size={14} className="text-green-400" />
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  <Input
                    type="password"
                    label="CONFIRM PASSWORD"
                    icon={<Lock size={18} />}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    success={formValidation.confirmPassword ? 'Passwords match' : undefined}
                    error={confirmPassword && !formValidation.confirmPassword ? 'Passwords do not match' : undefined}
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="bg-gray-800 border-gray-700 text-white focus:border-gray-600"
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
                      <Card className="border-red-600 bg-red-900/20">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400 font-medium font-mono">{error}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Terms Checkbox */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <motion.input
                    type="checkbox"
                    required
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded bg-gray-800 border-gray-700 text-white focus:ring-gray-600 transition-all"
                    whileTap={{ scale: 0.95 }}
                  />
                  <label className="text-sm text-gray-400 font-mono">
                    I AGREE TO THE{' '}
                    <Link to="/terms" className="text-white hover:text-gray-300 transition-colors font-medium underline">
                      TERMS OF SERVICE
                    </Link>{' '}
                    AND{' '}
                    <Link to="/privacy" className="text-white hover:text-gray-300 transition-colors font-medium underline">
                      PRIVACY POLICY
                    </Link>
                  </label>
                </motion.div>

                {/* Submit Button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                >
                  <Button
                    type="submit"
                    className="w-full text-lg py-4 font-bold bg-white text-black hover:bg-gray-200 font-mono"
                    loading={isLoading}
                    disabled={isLoading || !Object.values(formValidation).every(v => v)}
                  >
                    <UserPlus size={20} className="mr-3" />
                    {isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                  </Button>
                </motion.div>
              </form>

              {/* Divider */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="relative my-8"
              >
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-900 text-gray-400 font-mono">
                    OR CONTINUE WITH
                  </span>
                </div>
              </motion.div>

              {/* Social Registration */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.4 }}
                className="space-y-4"
              >
                {/* 🔐 Google OAuth Button */}
                <GoogleOAuthButton
                  variant="signup"
                  onSuccess={() => {
                    addToast({
                      type: 'success',
                      title: 'Google Registration Successful',
                      message: 'Account created! Redirecting to dashboard...',
                      duration: 3000
                    });
                  }}
                  onError={(error) => {
                    addToast({
                      type: 'error',
                      title: 'Google Registration Failed',
                      message: error,
                      duration: 5000
                    });
                  }}
                />
                
                {/* GitHub Button (placeholder for future implementation) */}
                <Button 
                  className="w-full bg-gray-800 text-white border border-gray-700 hover:border-gray-600 font-mono text-sm uppercase tracking-wider" 
                  disabled={true}
                  type="button"
                >
                  <img src="https://www.svgrepo.com/show/512120/github-142.svg" alt="GitHub" className="w-5 h-5 mr-3" />
                  GITHUB (COMING SOON)
                </Button>
              </motion.div>

              {/* Sign In Link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.4 }}
                className="mt-8 text-center"
              >
                <p className="text-gray-400 font-mono">
                  ALREADY HAVE AN ACCOUNT?{' '}
                  <Link
                    to="/login"
                    className="text-white hover:text-gray-300 transition-colors font-bold"
                  >
                    LOGIN
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

export default RegisterPage; 