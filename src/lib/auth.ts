import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'company' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string | null;
  created_at: string;
  clerk_id: string | null;
}

/**
 * Sync a Clerk user to the Supabase users table via edge function
 */
export const syncClerkUser = async (
  clerkUserId: string,
  email: string,
  fullName?: string,
  companyName?: string
): Promise<AuthUser | null> => {
  try {
    const response = await fetch(
      'https://fbifazlicxbyhryzozbe.supabase.co/functions/v1/sync-clerk-user',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiaWZhemxpY3hieWhyeXpvemJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NzQ1MjMsImV4cCI6MjA2NzQ1MDUyM30.iQc0gbcFFSqplu3jLiuxUox9ivTk5axEAuAjUAAaFH0',
        },
        body: JSON.stringify({
          clerk_user_id: clerkUserId,
          email,
          full_name: fullName,
          company_name: companyName,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Sync error:', errorData);
      return null;
    }

    const data = await response.json();
    const user = data.user;

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role as UserRole,
      company_id: user.company_id,
      created_at: user.created_at,
      clerk_id: user.clerk_id,
    };
  } catch (error) {
    console.error('Error syncing Clerk user:', error);
    return null;
  }
};

/**
 * Get user profile by Clerk ID from Supabase
 */
export const getUserByClerkId = async (clerkId: string): Promise<AuthUser | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role as UserRole,
      company_id: data.company_id,
      created_at: data.created_at,
      clerk_id: data.clerk_id,
    };
  } catch (error) {
    console.error('Error getting user by Clerk ID:', error);
    return null;
  }
};

/**
 * Update user role (admin only)
 */
export const updateUserRole = async (userId: string, newRole: UserRole) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { data: null, error };
  }
};

/**
 * Check if current user has specific role
 */
export const hasRole = (user: AuthUser | null, requiredRole: UserRole): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.role === requiredRole;
};

/**
 * Check if current user has any of the specified roles
 */
export const hasAnyRole = (user: AuthUser | null, roles: UserRole[]): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return roles.includes(user.role);
};

/**
 * Get users by role (for admin management)
 */
export const getUsersByRole = async (role?: UserRole) => {
  try {
    let query = supabase.from('users').select('*');
    if (role) {
      query = query.eq('role', role);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting users by role:', error);
    return { data: null, error };
  }
};
