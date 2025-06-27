import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Header } from "@/components/layout/Header";
import { Link } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, CheckCircle, AlertCircle, UserPlus, Swords, Shield } from 'lucide-react';

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
      { score: 1, label: 'Weak', color: 'text-red-400' },
      { score: 2, label: 'Fair', color: 'text-orange-400' },
      { score: 3, label: 'Good', color: 'text-yellow-400' },
      { score: 4, label: 'Strong', color: 'text-green-400' }
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
        title: 'Welcome to the Arena!',
        message: 'Account created successfully. Entering the battle zone...',
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
      let errorMessage = 'Arena registration failed. Please try again.';
      let errorTitle = 'Registration Error';
      
      if (err.response?.status === 409) {
        errorMessage = 'Username or email already in use. Choose different credentials.';
        errorTitle = 'Arena Conflict';
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
      <div className="min-h-screen bg-arena-dark relative flex items-center justify-center">
        {/* Background mesh effect */}
        <div className="fixed inset-0 bg-arena-gradient-mesh opacity-30 pointer-events-none" />
        
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center relative z-10"
        >
          <motion.div
            className="w-28 h-28 mx-auto mb-8 bg-gradient-to-br from-arena-accent to-arena-secondary rounded-2xl flex items-center justify-center shadow-arena-glow"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 360] }}
            transition={{ duration: 2, repeat: 1 }}
          >
            <CheckCircle size={56} className="text-arena-dark" />
          </motion.div>
          <h2 className="text-4xl font-bold gradient-text mb-4">Arena Access Granted!</h2>
          <p className="text-arena-text-muted text-lg mb-2">Your warrior profile has been created.</p>
          <p className="text-arena-text-dim">Entering the battle zone...</p>
          <motion.div 
            className="mt-6 w-64 h-1 mx-auto bg-arena-border rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-arena-accent to-arena-secondary"
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
          {/* Register Card */}
          <Card variant="glass" className="border-arena-secondary/20 shadow-arena-glow">
            <CardContent className="p-8 sm:p-10">
              {/* Logo and Title */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-center mb-8"
              >
                <motion.div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-arena-secondary to-arena-accent mb-6 shadow-arena-glow"
                  animate={{ 
                    rotate: [0, -5, 5, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: 6, repeat: Infinity }}
                >
                  <Shield size={40} className="text-arena-dark" />
                </motion.div>
                <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">
                  Join the Arena
                </h1>
                <p className="text-arena-text-muted text-lg">
                  Create your warrior profile and start battling
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
                    label="Username"
                    icon={<User size={18} />}
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    variant="glass"
                    success={formValidation.username ? 'Username available' : undefined}
                    hint="Your arena warrior name (min 3 chars)"
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
                    type="email"
                    label="Email"
                    icon={<Mail size={18} />}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    variant="glass"
                    success={formValidation.email ? 'Valid email address' : undefined}
                    hint="Your arena contact email"
                    autoComplete="email"
                    disabled={isLoading}
                    className="bg-arena-surface/50 border-arena-border focus:border-arena-accent/50"
                  />
                </motion.div>

                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  <Input
                    type="password"
                    label="Password"
                    icon={<Lock size={18} />}
                    required
                    value={password}
                    onChange={handlePasswordChange}
                    variant="glass"
                    showPasswordToggle
                    autoComplete="new-password"
                    disabled={isLoading}
                    success={passwordStrength.score >= 3 ? 'Fortress-level security' : undefined}
                    className="bg-arena-surface/50 border-arena-border focus:border-arena-accent/50"
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
                                : 'bg-arena-border'
                            }`}
                            animate={{ scale: level <= passwordStrength.score ? [1, 1.1, 1] : 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        ))}
                      </div>
                      {passwordStrength.label && (
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${passwordStrength.color}`}>
                            Security Level: {passwordStrength.label}
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
                    label="Confirm Password"
                    icon={<Lock size={18} />}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    variant="glass"
                    success={formValidation.confirmPassword ? 'Passwords match' : undefined}
                    error={confirmPassword && !formValidation.confirmPassword ? 'Passwords do not match' : undefined}
                    autoComplete="new-password"
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
                          <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400 font-medium">{error}</p>
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
                    className="mt-1 w-4 h-4 rounded bg-arena-surface border-arena-border text-arena-accent focus:ring-arena-accent/50 transition-all"
                    whileTap={{ scale: 0.95 }}
                  />
                  <label className="text-sm text-arena-text-muted">
                    I agree to the{' '}
                    <Link to="/terms" className="text-arena-accent hover:text-arena-accent-hover transition-colors font-medium underline">
                      Arena Combat Rules
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-arena-accent hover:text-arena-accent-hover transition-colors font-medium underline">
                      Privacy Code
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
                    variant="gradient"
                    className="w-full text-lg py-4 font-bold shadow-arena-glow"
                    loading={isLoading}
                    disabled={isLoading || !Object.values(formValidation).every(v => v)}
                  >
                    <UserPlus size={20} className="mr-3" />
                    {isLoading ? 'Creating Warrior...' : 'Enter the Arena'}
                  </Button>
                </motion.div>
              </form>

              {/* Sign In Link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="mt-8 text-center"
              >
                <p className="text-arena-text-muted">
                  Already a warrior?{' '}
                  <Link
                    to="/login"
                    className="text-arena-accent hover:text-arena-accent-hover transition-colors font-bold"
                  >
                    Return to battle!
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