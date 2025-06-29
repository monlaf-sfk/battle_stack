"""
🔐 Google OAuth 2.0 Service for BattleStack
Handles Google authentication, ID token verification, and user management.
"""

import os
import asyncio
from typing import Optional, Dict, Any, Tuple
from datetime import datetime

from google.auth.transport import requests
from google.oauth2 import id_token
from google.auth.exceptions import GoogleAuthError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from shared.app.auth.models import User as UserModel, UserRole
from shared.app.auth.service import get_user_by_email, create_user_google
from shared.app.schemas import GoogleUserInfo, User
from shared.app.config import settings


class GoogleOAuthService:
    """
    🔐 Google OAuth 2.0 Service
    
    Provides secure Google authentication with:
    - ID Token verification
    - User creation and authentication
    - Profile information extraction
    - Security validation
    """
    
    def __init__(self):
        self.client_id = self._get_google_client_id()
        if not self.client_id:
            print("⚠️ Google OAuth not configured - GOOGLE_CLIENT_ID environment variable not set")
    
    def _get_google_client_id(self) -> Optional[str]:
        """Get Google Client ID from environment variables"""
        return (
            os.getenv("GOOGLE_CLIENT_ID") or 
            os.getenv("GOOGLE_OAUTH_CLIENT_ID") or
            getattr(settings, "GOOGLE_CLIENT_ID", None)
        )
    
    async def verify_google_token(self, credential: str) -> GoogleUserInfo:
        """
        🔍 Verify Google ID Token and extract user information
        
        Args:
            credential: Google ID Token (JWT)
            
        Returns:
            GoogleUserInfo: Verified user information from Google
            
        Raises:
            HTTPException: If token is invalid or verification fails
        """
        if not self.client_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth not configured on server"
            )
        
        try:
            print(f"🔍 Verifying Google ID token...")
            
            # Verify the token using Google's library
            # This validates the signature, expiration, issuer, and audience
            idinfo = id_token.verify_oauth2_token(
                credential, 
                requests.Request(), 
                self.client_id
            )
            
            # Additional security checks
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Wrong issuer.')
            
            if not idinfo.get('email_verified', False):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google email not verified"
                )
            
            print(f"✅ Google ID token verified for user: {idinfo.get('email')}")
            
            # Extract user information
            user_info = GoogleUserInfo(
                sub=idinfo['sub'],
                email=idinfo['email'],
                name=idinfo.get('name', ''),
                picture=idinfo.get('picture'),
                email_verified=idinfo.get('email_verified', False),
                given_name=idinfo.get('given_name'),
                family_name=idinfo.get('family_name')
            )
            
            return user_info
            
        except ValueError as e:
            print(f"❌ Google token verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Google token: {str(e)}"
            )
        except GoogleAuthError as e:
            print(f"❌ Google Auth error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google authentication failed"
            )
        except Exception as e:
            print(f"💥 Unexpected error during Google token verification: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service error"
            )
    
    async def authenticate_or_create_user(
        self, 
        db: AsyncSession, 
        google_user_info: GoogleUserInfo
    ) -> Tuple[UserModel, bool]:
        """
        🔐 Authenticate existing user or create new user from Google info
        
        Args:
            db: Database session
            google_user_info: Verified Google user information
            
        Returns:
            Tuple[UserModel, bool]: (user, is_new_user)
        """
        print(f"🔍 Looking for existing user with Google ID: {google_user_info.sub}")
        
        # First, try to find user by Google ID
        query = select(UserModel).where(UserModel.google_id == google_user_info.sub)
        result = await db.execute(query)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"✅ Found existing user by Google ID: {existing_user.username}")
            
            # Update last login and Google information
            existing_user.last_login = datetime.utcnow()
            existing_user.google_email = google_user_info.email
            existing_user.google_picture = google_user_info.picture
            
            await db.commit()
            await db.refresh(existing_user)
            
            return existing_user, False
        
        # If not found by Google ID, try to find by email
        print(f"🔍 Looking for existing user by email: {google_user_info.email}")
        
        email_user = await get_user_by_email(db, google_user_info.email)
        if email_user:
            print(f"✅ Found existing user by email: {email_user.username}")
            print(f"🔗 Linking Google account to existing user")
            
            # Link Google account to existing user
            email_user.google_id = google_user_info.sub
            email_user.google_email = google_user_info.email
            email_user.google_picture = google_user_info.picture
            email_user.oauth_provider = "google"
            email_user.last_login = datetime.utcnow()
            email_user.is_verified = True  # Google accounts are pre-verified
            
            await db.commit()
            await db.refresh(email_user)
            
            return email_user, False
        
        # Create new user from Google information
        print(f"👤 Creating new user from Google account: {google_user_info.email}")
        
        # Generate username from Google name or email
        username = self._generate_username_from_google_info(google_user_info)
        
        # Ensure username is unique
        username = await self._ensure_unique_username(db, username)
        
        new_user = await create_user_google(
            db=db,
            google_id=google_user_info.sub,
            username=username,
            email=google_user_info.email,
            full_name=google_user_info.name,
            google_picture=google_user_info.picture
        )
        
        print(f"✅ Created new user: {new_user.username}")
        
        return new_user, True
    
    def _generate_username_from_google_info(self, google_info: GoogleUserInfo) -> str:
        """Generate username from Google user information"""
        
        # Try given name first
        if google_info.given_name:
            username = google_info.given_name.lower()
        elif google_info.name:
            # Use first part of full name
            username = google_info.name.split()[0].lower()
        else:
            # Fallback to email prefix
            username = google_info.email.split('@')[0].lower()
        
        # Clean username (remove special characters, keep only alphanumeric)
        import re
        username = re.sub(r'[^a-zA-Z0-9_]', '', username)
        
        # Ensure minimum length
        if len(username) < 3:
            username = f"user_{username}"
        
        return username
    
    async def _ensure_unique_username(self, db: AsyncSession, base_username: str) -> str:
        """Ensure username is unique by adding numbers if needed"""
        
        username = base_username
        counter = 1
        
        while True:
            # Check if username exists
            query = select(UserModel).where(UserModel.username == username)
            result = await db.execute(query)
            existing = result.scalar_one_or_none()
            
            if not existing:
                return username
            
            # Try next variation
            username = f"{base_username}{counter}"
            counter += 1
            
            # Prevent infinite loop
            if counter > 1000:
                import random
                username = f"{base_username}_{random.randint(1000, 9999)}"
                break
        
        return username


# 🌍 Global instance
google_oauth_service = GoogleOAuthService() 