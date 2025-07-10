import React, { useState, useEffect, useRef } from 'react';
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
import { User, Mail, Lock, AlertCircle, UserPlus, Github } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

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
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, label: 'Very Weak', color: 'text-red-500' });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);
  const emailCheckTimeout = useRef<NodeJS.Timeout | null>(null);
  const [formValidation, setFormValidation] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false
  });
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();
  const usernameRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

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

  // Debounce username availability check
  useEffect(() => {
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    if (username.length >= 3) {
      setError(prev => (prev === t('registerPage.usernameMinLength') ? '' : prev));
      
      usernameCheckTimeout.current = setTimeout(async () => {
        try {
          const response = await authApi.get(`/check-username?username=${username}`);
          setUsernameAvailable(response.data.available);
          if (!response.data.available) {
            setError(t('registerPage.usernameTaken'));
          } else {
            setError(prev => (prev === t('registerPage.usernameTaken') ? '' : prev));
          }
        } catch (err) {
          console.error('Error checking username availability:', err);
          setUsernameAvailable(null);
        }
      }, 500);
    } else if (username.length > 0) {
      setUsernameAvailable(false);
      setError(t('registerPage.usernameMinLength'));
    } else {
      setUsernameAvailable(null);
      setError(prev =>
        [t('registerPage.usernameMinLength'), t('registerPage.usernameTaken')].includes(prev) ? '' : prev
      );
    }
    return () => {
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current);
      }
    };
  }, [username, t]);

  // Debounce email availability check
  useEffect(() => {
    if (emailCheckTimeout.current) {
      clearTimeout(emailCheckTimeout.current);
    }

    if (/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)) {
      setError(prev => (prev === t('registerPage.emailInvalid') ? '' : prev));

      emailCheckTimeout.current = setTimeout(async () => {
        try {
          const response = await authApi.get(`/check-email?email=${email}`);
          setEmailAvailable(response.data.available);
          if (!response.data.available) {
            setError(t('registerPage.emailTaken'));
          } else {
            setError(prev => (prev === t('registerPage.emailTaken') ? '' : prev));
          }
        } catch (err) {
          console.error('Error checking email availability:', err);
          setEmailAvailable(null);
        }
      }, 500);
    } else if (email.length > 0) {
      setEmailAvailable(false);
      setError(t('registerPage.emailInvalid'));
    } else {
      setEmailAvailable(null);
      setError(prev =>
        [t('registerPage.emailInvalid'), t('registerPage.emailTaken')].includes(prev) ? '' : prev
      );
    }
    return () => {
      if (emailCheckTimeout.current) {
        clearTimeout(emailCheckTimeout.current);
      }
    };
  }, [email, t]);

  // Update validation when form fields change
  useEffect(() => {
    setFormValidation({
      username: username.trim().length >= 3,
      email: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email),
      password: passwordStrength.score >= 2,
      confirmPassword: password === confirmPassword && confirmPassword.length > 0
    });
  }, [username, email, password, confirmPassword, passwordStrength]);

  const calculatePasswordStrength = (pass: string): PasswordStrength => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) score++;
    if (pass.match(/[0-9]/)) score++;
    if (pass.match(/[^a-zA-Z0-9]/)) score++;

    const strengths = [
      { score: 0, label: t('registerPage.passwordStrength.veryWeak'), color: '' },
      { score: 1, label: t('registerPage.passwordStrength.weak'), color: 'text-red-400' },
      { score: 2, label: t('registerPage.passwordStrength.fair'), color: 'text-orange-400' },
      { score: 3, label: t('registerPage.passwordStrength.good'), color: 'text-yellow-400' },
      { score: 4, label: t('registerPage.passwordStrength.strong'), color: 'text-green-400' }
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
      setError(t('registerPage.usernameRequired'));
      usernameRef.current?.focus();
      return false;
    }
    if (username.length < 3) {
      setError(t('registerPage.usernameMinLength'));
      return false;
    }
    if (!email.trim()) {
      setError(t('registerPage.emailRequired'));
      return false;
    }
    if (!/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)) {
      setError(t('registerPage.emailInvalid'));
      return false;
    }
    if (!password) {
      setError(t('registerPage.passwordRequired'));
      return false;
    }
    if (passwordStrength.score < 2) {
      setError(t('registerPage.passwordWeak'));
      return false;
    }
    if (password !== confirmPassword) {
      setError(t('registerPage.passwordsMismatch'));
      return false;
    }
    if (!acceptTerms) {
      setError(t('registerPage.termsNotAccepted'));
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
        title: t('registerPage.accountCreatedTitle'),
        message: t('registerPage.accountCreatedMessage'),
        duration: 3000
      });

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
      let errorMessage = t('registerPage.registrationFailed');
      let errorTitle = t('registerPage.registrationErrorTitle');
      
      if (err.response?.status === 409) {
        errorMessage = t('registerPage.usernameEmailConflict');
        errorTitle = t('registerPage.accountConflictTitle');
      } else if (err.response?.status === 422) {
        errorMessage = t('registerPage.invalidInfoProvided');
        errorTitle = t('registerPage.invalidDataTitle');
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
          <div className="bg-gray-900 border border-gray-800">
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
                  <UserPlus size={48} className="text-black" />
                </motion.div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 font-mono">
                  {t('registerPage.title')}
                </h1>
                <p className="text-gray-400 text-lg font-mono">
                  {t('registerPage.subtitle')}
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
                    label={t('common.username')}
                    icon={<User size={18} />}
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    success={username.length >= 3 && usernameAvailable === true ? t('registerPage.validUsername') : undefined}
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
                    label={t('common.email')}
                    icon={<Mail size={18} />}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    success={/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email) && emailAvailable === true ? t('registerPage.validEmail') : undefined}
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
                    label={t('common.password')}
                    icon={<Lock size={18} />}
                    required
                    value={password}
                    onChange={handlePasswordChange}
                    showPasswordToggle
                    autoComplete="new-password"
                    disabled={isLoading}
                    success={passwordStrength.score >= 2 ? t('registerPage.strongPassword') : undefined}
                    className="bg-gray-800 border-gray-700 text-white focus:border-gray-600"
                  />
                  {password.length > 0 && (
                    <div className="flex items-center mt-2 text-sm">
                      <div className="w-full h-1 bg-gray-700 rounded-full mr-2">
                        <div
                          className={`h-full rounded-full ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                        />
                      </div>
                      <span className={`font-mono ${passwordStrength.color}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  <Input
                    type="password"
                    label={t('registerPage.confirmPassword')}
                    icon={<Lock size={18} />}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    showPasswordToggle
                    autoComplete="new-password"
                    disabled={isLoading}
                    success={password === confirmPassword && confirmPassword.length > 0 ? t('registerPage.passwordsMatch') : undefined}
                    className="bg-gray-800 border-gray-700 text-white focus:border-gray-600"
                  />
                </motion.div>

                {/* Terms and Conditions Checkbox */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  className="flex items-center space-x-2 text-sm"
                >
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-white bg-gray-700 border-gray-600 rounded focus:ring-0 focus:outline-none"
                  />
                  <label htmlFor="acceptTerms" className="text-gray-400 font-mono">
                    <Trans
                      i18nKey="registerPage.agreeToTerms"
                      components={{
                        1: <Link to="/terms" className="text-white hover:text-gray-300 transition-colors font-bold" />,
                        3: <Link to="/privacy" className="text-white hover:text-gray-300 transition-colors font-bold" />
                      }}
                    />
                  </label>
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

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                >
                  <Button
                    type="submit"
                    className="w-full text-lg py-4 font-bold bg-white text-black hover:bg-gray-200 font-mono"
                    loading={isLoading}
                    disabled={isLoading || !formValidation.username || !formValidation.email || !formValidation.password || !formValidation.confirmPassword || !acceptTerms}
                  >
                    {isLoading ? t('common.loading') : t('common.register')}
                  </Button>
                </motion.div>
              </form>

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
                    {t('common.continueWith')}
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.4 }}
                className="space-y-4"
              >
                <GoogleOAuthButton
                  onSuccess={() => {
                    addToast({
                      type: 'success',
                      title: t('registerPage.googleRegisterSuccessTitle'),
                      message: t('registerPage.googleRegisterSuccessMessage'),
                      duration: 3000,
                    });
                  }}
                  onError={(error) => {
                    addToast({
                      type: 'error',
                      title: t('registerPage.googleRegisterErrorTitle'),
                      message: error,
                      duration: 5000,
                    });
                  }}
                />
                <Button
                  className="w-full bg-gray-800 text-white border border-gray-700 hover:border-gray-600 font-mono text-sm uppercase tracking-wider"
                  disabled={true}
                  type="button"
                >
                  <Github size={20} className="mr-3" />
                  {t('common.github')} {t('common.comingSoon')}
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.4 }}
                className="mt-8 text-center"
              >
                <p className="text-gray-400 font-mono">
                  {t('registerPage.alreadyHaveAccount')}{' '}
                  <Link
                    to="/login"
                    className="text-white hover:text-gray-300 transition-colors font-bold"
                  >
                    {t('common.login')}
                  </Link>
                </p>
              </motion.div>
            </CardContent>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default RegisterPage; 