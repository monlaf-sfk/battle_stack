import React, { useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { authApiService } from '../../services/api'; // Import the service

interface GoogleOAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  text?: string;
  variant?: 'signin' | 'signup';
}

// 🔐 Google OAuth Response Interface
interface GoogleOAuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    email: string;
    full_name: string;
    google_picture?: string;
    oauth_provider?: string;
    role: string;
    is_active: boolean;
    is_verified: boolean;
  };
  is_new_user: boolean;
}

export const GoogleOAuthButton: React.FC<GoogleOAuthButtonProps> = ({
  onSuccess,
  onError,
  text,
  variant = 'signin'
}) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Store client ID at component level
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 
                  '540303217537-4de1qfd75neh0cihsgp6bo44ffaud44s.apps.googleusercontent.com';

  const handleGoogleSuccess = useCallback(async (credential: string) => {
    try {
      console.log('🔐 Google OAuth credential received');
      
      // Send credential to our backend using the centralized service
      const response = await authApiService.googleLogin(credential);

      if (!response.data) {
        throw new Error('Google authentication failed');
      }

      const authData: GoogleOAuthResponse = response.data;
      
      // Store tokens using our auth context
      login(authData.access_token, authData.refresh_token);
      
      console.log(`✅ Google OAuth success: ${authData.user.username} (${authData.is_new_user ? 'new user' : 'existing user'})`);
      
      // Show welcome message for new users
      if (authData.is_new_user) {
        console.log('👋 Welcome to BattleStack!');
      } else {
        console.log('🎮 Welcome back to BattleStack!');
      }
      
      onSuccess?.();
      navigate('/dashboard');
      
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Google authentication failed';
      onError?.(errorMessage);
    }
  }, [login, navigate, onSuccess, onError]);

  useEffect(() => {
    // Use globally loaded Google Identity Services script
    const loadGoogleScript = () => {
      if (window.google) {
        initializeGoogle();
        return;
      }

      // Wait for script to load (since it's loaded in index.html)
      const checkGoogleLoaded = () => {
        if (window.google) {
          initializeGoogle();
        } else {
          // Retry after 100ms
          setTimeout(checkGoogleLoaded, 100);
        }
      };
      
      checkGoogleLoaded();
    };

    const initializeGoogle = () => {
      if (window.google) {
        console.log('🔍 Debug - Using Google Client ID:', clientId);
        console.log('🔍 Debug - Current origin:', window.location.origin);
        console.log('🔍 Debug - Environment variable:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
        
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: any) => {
              console.log('📥 Google callback received:', response);
              handleGoogleSuccess(response.credential);
            },
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: true
          });
          
          console.log('✅ Google Identity Services initialized successfully');
        } catch (error) {
          console.error('❌ Error initializing Google Identity Services:', error);
        }
      } else {
        console.error('❌ window.google not available');
      }
    };

    loadGoogleScript();
  }, [handleGoogleSuccess, clientId]);

  const handleClick = () => {
    console.log('🔘 Custom Google Sign-In button clicked');
    console.log('🚀 Using reliable Google OAuth method...');
    
    // Skip problematic prompt() and go directly to working method
    openGoogleOAuthFallback();
  };

  const openGoogleOAuthFallback = () => {
    console.log('🚀 Opening Google OAuth fallback...');
    
    if (window.google && window.google.accounts && window.google.accounts.id) {
      // Create temporary hidden container for Google button
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);
      
      try {
        // Reinitialize for button
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            console.log('📥 Fallback Google OAuth callback received:', response);
            handleGoogleSuccess(response.credential);
            // Clean up
            if (document.body.contains(tempContainer)) {
              document.body.removeChild(tempContainer);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });
        
        // Render Google button and auto-click it
        window.google.accounts.id.renderButton(tempContainer, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: 250,
          logo_alignment: 'left'
        });
        
        // Auto-click the Google button after a short delay
        setTimeout(() => {
          const googleButton = tempContainer.querySelector('div[role="button"]') as HTMLElement;
          if (googleButton) {
            console.log('🔄 Auto-clicking Google button...');
            googleButton.click();
          } else {
            console.log('⚠️ Google button not found, please try again...');
            if (document.body.contains(tempContainer)) {
              document.body.removeChild(tempContainer);
            }
          }
        }, 200);
        
      } catch (error) {
        console.error('❌ Error with fallback method:', error);
        console.log('⚠️ Please try again or check your internet connection');
        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
      }
    } else {
      console.error('❌ Google Identity Services not available');
      console.log('⚠️ Please refresh the page and try again');
    }
      };

  return (
    <div className="space-y-3">
      {/* 🎨 Custom TETR.IO Style Google Button */}
      <Button
        onClick={handleClick}
        className="w-full bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 font-mono text-sm uppercase tracking-wider flex items-center justify-center gap-3 px-6 py-3"
        type="button"
      >
        {/* Google Logo SVG */}
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        
        {text || (variant === 'signup' ? 'CONTINUE WITH GOOGLE' : 'SIGN IN WITH GOOGLE')}
      </Button>
    </div>
  );
};

// Extend Window interface for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
} 