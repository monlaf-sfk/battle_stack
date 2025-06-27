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
  private baseUrl = 'http://localhost:8001'; // Auth service

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await fetch(`${this.baseUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          return null;
        }
        throw new Error('Failed to fetch user');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching current user:', error);
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