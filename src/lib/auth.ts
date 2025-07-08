import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type UserRole = 'admin' | 'company' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string | null;
  created_at: string;
}

/**
 * Sign up a new user with a specific role
 */
export const signUpWithRole = async (
  email: string,
  password: string,
  fullName: string,
  role: UserRole = 'user',
  companyName?: string,
  companyId?: string
) => {
  try {
    // First, sign up the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned');

    // Handle company creation/association
    let finalCompanyId = companyId;
    
    if (companyName && !companyId) {
      // Create a new company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          contact_email: email,
        })
        .select()
        .single();

      if (companyError) throw companyError;
      finalCompanyId = companyData.id;
    }

    // Then, create the user record in our users table with the role
    const userData: TablesInsert<'users'> = {
      id: authData.user.id,
      email,
      full_name: fullName,
      role,
      company_id: finalCompanyId || null,
    };

    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (userError) throw userError;

    return { user: authData.user, userRecord, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return { user: null, userRecord: null, error };
  }
};

/**
 * Get current user with role information
 */
export const getCurrentUserWithRole = async (): Promise<AuthUser | null> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return null;

    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord) return null;

    return {
      id: userRecord.id,
      email: userRecord.email,
      full_name: userRecord.full_name,
      role: userRecord.role as UserRole,
      company_id: userRecord.company_id,
      created_at: userRecord.created_at,
    };
  } catch (error) {
    console.error('Error getting user with role:', error);
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
  
  // Admin has access to everything
  if (user.role === 'admin') return true;
  
  return user.role === requiredRole;
};

/**
 * Check if current user has any of the specified roles
 */
export const hasAnyRole = (user: AuthUser | null, roles: UserRole[]): boolean => {
  if (!user) return false;
  
  // Admin has access to everything
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