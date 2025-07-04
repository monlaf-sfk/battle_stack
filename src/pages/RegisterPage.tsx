import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { AnimatePresence, motion } from 'framer-motion';
import { GoogleOAuthButton } from '../../components/auth/GoogleOAuthButton';
import { User, Mail, Lock, AlertCircle, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PasswordStrength {
  score: number;
} 