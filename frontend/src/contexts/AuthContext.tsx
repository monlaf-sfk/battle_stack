import { createContext, useContext, useState, useEffect } from 'react';
import { type ReactNode } from 'react';
import { authApiService } from '../services/api';
import { userService } from '../services/userService';
import { useTranslation } from 'react-i18next';

// Локальные типы для избежания проблем с импортом
interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  google_picture?: string;
  profile_picture?: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  email_notifications?: boolean;
}

interface UserPermissions {
  canAccessAdmin: boolean;
  canManageProblems: boolean;
  canManageUsers: boolean;
  canModerate: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  permissions: UserPermissions;
  loading: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  currentLanguage: string;
  changeLanguage: (lang: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>({
    canAccessAdmin: false,
    canManageProblems: false,
    canManageUsers: false,
    canModerate: false
  });
  const [loading, setLoading] = useState<boolean>(true);
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // Helper function to check if JWT token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return true;
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const payload = JSON.parse(jsonPayload);
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Token is expired if exp is less than current time (with 30 second buffer)
      return !payload.exp || payload.exp <= (currentTime + 30);
    } catch (error) {
      console.debug('Token validation error:', error);
      return true;
    }
  };

  // Auto refresh access token if it's about to expire
  const refreshTokenIfNeeded = async (): Promise<boolean> => {
    const accessToken = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!accessToken || !refreshToken) {
      return false;
    }

    // Check if access token is expired or about to expire
    if (isTokenExpired(accessToken)) {
      console.log('🔄 Access token expired, refreshing...');
      
      try {
        const response = await authApiService.refreshToken(refreshToken);
        
        // Store new tokens
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('refreshToken', response.data.refresh_token);
        
        console.log('✅ Tokens refreshed successfully');
        return true;
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        
        // If refresh fails, log out user
        logout();
        return false;
      }
    }
    
    return true;
  };

  const refreshUser = async () => {
    try {
      // Try to refresh token first if needed
      const tokenValid = await refreshTokenIfNeeded();
      if (!tokenValid) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      const response = await authApiService.getCurrentUser();
      const currentUser = response.data;
      if (currentUser) {
        setUser(currentUser);
        setPermissions(userService.getUserPermissions(currentUser));
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setPermissions({
          canAccessAdmin: false,
          canManageProblems: false,
          canManageUsers: false,
          canModerate: false
        });
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      
      // If user fetch fails due to auth, try refreshing token once more
      if ((error as any)?.response?.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const response = await authApiService.refreshToken(refreshToken);
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('refreshToken', response.data.refresh_token);
            
            // Retry getting user
            const userResponse = await authApiService.getCurrentUser();
            const currentUser = userResponse.data;
            if (currentUser) {
              setUser(currentUser);
              setPermissions(userService.getUserPermissions(currentUser));
              setIsAuthenticated(true);
              return;
            }
          } catch (refreshError) {
            console.error('Final refresh attempt failed:', refreshError);
          }
        }
      }
      
      setUser(null);
      setIsAuthenticated(false);
      logout();
    }
  };

  // Set up periodic token refresh
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isAuthenticated) {
        await refreshTokenIfNeeded();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      const storedLanguage = localStorage.getItem('language');
      if (storedLanguage && storedLanguage !== i18n.language) {
        await i18n.changeLanguage(storedLanguage);
        setCurrentLanguage(storedLanguage);
      }
      
      if (token && refreshToken) {
        await refreshUser();
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (accessToken: string, refreshToken: string) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setIsAuthenticated(true);
    await refreshUser();
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rememberMe');
    setIsAuthenticated(false);
    setUser(null);
    setPermissions({
      canAccessAdmin: false,
      canManageProblems: false,
      canManageUsers: false,
      canModerate: false
    });
  };

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    setCurrentLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      permissions, 
      loading, 
      login, 
      logout, 
      refreshUser, 
      currentLanguage, 
      changeLanguage 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
