import React, { useState, useEffect, useRef } from 'react';
import { authApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Header } from "@/components/layout/Header";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, AlertCircle } from "lucide-react";
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      emailRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setError('');
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const validateForm = () => {
    if (!email.trim()) {
      setError(t('loginPage.emailRequired'));
      emailRef.current?.focus();
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('loginPage.emailInvalid'));
      return false;
    }
    if (!password) {
      setError(t('loginPage.passwordRequired'));
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
      formData.append('username', email.trim()); // FastAPI expects 'username' for email in token endpoint
      formData.append('password', password);

      const response = await authApi.post('/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      login(response.data.access_token, response.data.refresh_token);
      addToast({
        type: 'success',
        title: t('common.success'),
        message: t('loginPage.loginSuccess'),
        duration: 3000,
      });
      navigate('/dashboard');
    } catch (err: any) {
      let errorMessage = t('loginPage.loginFailed');
      if (err.response?.status === 400) {
        errorMessage = t('loginPage.invalidCredentials');
      } else if (err.response?.status === 429) {
        errorMessage = t('loginPage.rateLimited');
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      addToast({
        type: 'error',
        title: t('common.error'),
        message: errorMessage,
        duration: 5000,
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
          {/* Login Card */}
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
                   <svg
                     width="48"
                     height="48"
                     viewBox="0 0 1024 1024"
                     fill="none"
                     className="text-black"
                   >
                     <g clipPath="url(#clip0_10_2)">
                       <path d="M512 0L1024 256V768L512 1024L0 768V256L512 0Z" fill="currentColor"/>
                       <path d="M512 448L768 320V640L512 768V448Z" fill="currentColor"/>
                       <path d="M512 448L256 320V640L512 768V448Z" fill="#1a1a1a"/>
                       <path d="M512 0L256 128V320L512 448L768 320V128L512 0Z" fill="#ffffff"/>
                       <path d="M512 0L256 128V320L512 448V0Z" fill="#e5e5e5"/>
                     </g>
                     <defs>
                       <clipPath id="clip0_10_2">
                         <rect width="1024" height="1024" fill="white"/>
                       </clipPath>
                     </defs>
                   </svg>
                </motion.div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 font-mono">
                  {t('loginPage.title')}
                </h1>
                <p className="text-gray-400 text-lg font-mono">
                  {t('loginPage.subtitle')}
                </p>
              </motion.div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <Input
                    ref={emailRef}
                    type="email"
                    label={t('common.email')}
                    icon={<User size={18} />}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    success={email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? t('loginPage.validEmail') : undefined}
                    autoComplete="email"
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
                    type="password"
                    label={t('common.password')}
                    icon={<Lock size={18} />}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    showPasswordToggle
                    autoComplete="current-password"
                    disabled={isLoading}
                    success={password.length >= 8 ? t('loginPage.strongPassword') : undefined}
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

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="flex justify-end text-sm"
                >
                  <Link to="/forgot-password" className="text-gray-400 hover:text-white transition-colors font-bold font-mono">
                    {t('loginPage.forgotPassword')}
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  <Button
                    type="submit"
                    className="w-full text-lg py-4 font-bold bg-white text-black hover:bg-gray-200 font-mono"
                    loading={isLoading}
                    disabled={isLoading || !email || !password}
                  >
                    {isLoading ? t('common.loading') : t('common.login')}
                  </Button>
                </motion.div>
              </form>

              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.7, duration: 0.4 }}
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
                transition={{ delay: 0.8, duration: 0.4 }}
                className="space-y-4"
              >
                <GoogleOAuthButton
                  onSuccess={() => {
                    addToast({
                      type: 'success',
                      title: t('loginPage.googleLoginSuccessTitle'),
                      message: t('loginPage.googleLoginSuccessMessage'),
                      duration: 3000,
                    });
                  }}
                  onError={(error) => {
                    addToast({
                      type: 'error',
                      title: t('loginPage.googleLoginErrorTitle'),
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
                  <img src="https://www.svgrepo.com/show/512120/github-142.svg" alt="GitHub" className="w-5 h-5 mr-3" />
                  GITHUB ({t('common.comingSoon')})
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="mt-8 text-center"
              >
                <p className="text-gray-400 font-mono">
                  {t('loginPage.noAccount')}{' '}
                  <Link
                    to="/register"
                    className="text-white hover:text-gray-300 transition-colors font-bold"
                  >
                    {t('common.register')}
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

export default LoginPage; 