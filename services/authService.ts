// services/authService.ts
import { supabase } from '../lib/supabase';

class AuthService {
  private currentUser: any = null;
  private currentSession: any = null;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      const { data } = await supabase.auth.getSession();
      this.currentSession = data.session;
      this.currentUser = data.session?.user || null;
    } catch (error) {
      console.error('Error initializing auth:', error);
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      this.currentSession = session;
      this.currentUser = session?.user || null;
    });
  }

  // Get current user's UID (synchronous)
  getUserUID(): string | null {
    return this.currentUser?.id || null;
  }

  // Get current user's email (synchronous)
  getUserEmail(): string | null {
    return this.currentUser?.email || null;
  }

  // Get current user's UID (async - more reliable)
  async getCurrentUserUID(): Promise<string | null> {
    try {
      // First try to get from current user cache
      if (this.currentUser?.id) {
        return this.currentUser.id;
      }
      
      // If not available, fetch fresh from Supabase
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      // Update current user cache
      this.currentUser = data.user;
      return data.user?.id || null;
    } catch (error) {
      console.error('Error getting user UID:', error);
      return null;
    }
  }

  // Get current user's email (async - more reliable)
  async getCurrentUserEmail(): Promise<string | null> {
    try {
      // First try to get from current user cache
      if (this.currentUser?.email) {
        return this.currentUser.email;
      }
      
      // If not available, fetch fresh from Supabase
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      // Update current user cache
      this.currentUser = data.user;
      return data.user?.email || null;
    } catch (error) {
      console.error('Error getting user email:', error);
      return null;
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return !!data.user;
    } catch (error) {
      return false;
    }
  }

  // Get current session
  async getCurrentSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }
}

export const authService = new AuthService();
