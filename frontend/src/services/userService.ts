import axios from 'axios';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface UserPermissions {
  canAccessAdmin: boolean;
  canManageProblems: boolean;
  canManageUsers: boolean;
  canModerate: boolean;
}

class UserService {
  private api = axios.create({
    baseURL: '/api/auth', // Use the same base as auth for now
  });

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    try {
      const response = await this.api.get<User>('/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      return null;
    }
  }

  getUserPermissions(user: User | null): UserPermissions {
    if (!user || !user.is_active) {
      return {
        canAccessAdmin: false,
        canManageProblems: false,
        canManageUsers: false,
        canModerate: false
      };
    }

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const isModerator = user.role === 'moderator' || isAdmin;
    const isSuperAdmin = user.role === 'super_admin';

    return {
      canAccessAdmin: isAdmin,
      canManageProblems: isAdmin,
      canManageUsers: isSuperAdmin,
      canModerate: isModerator
    };
  }

  isAdmin(user: User | null): boolean {
    if (!user || !user.is_active) return false;
    return user.role === 'admin' || user.role === 'super_admin';
  }

  isModerator(user: User | null): boolean {
    if (!user || !user.is_active) return false;
    return user.role === 'moderator' || this.isAdmin(user);
  }

  isSuperAdmin(user: User | null): boolean {
    if (!user || !user.is_active) return false;
    return user.role === 'super_admin';
  }

  getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'moderator':
        return 'bg-blue-100 text-blue-800';
      case 'user':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getRoleDisplayName(role: string): string {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'moderator':
        return 'Moderator';
      case 'user':
      default:
        return 'User';
    }
  }
}

export const userService = new UserService(); 