// services/authService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

class AuthService {
  private currentUser: any = null;
  private currentSession: any = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      console.log("Initializing auth service...");
      const { data } = await supabase.auth.getSession();
      this.currentSession = data.session;
      this.currentUser = data.session?.user || null;
      this.isInitialized = true;

      console.log("Auth initialized - Session exists:", !!data.session);
      console.log("User ID:", this.currentUser?.id || "None");
    } catch (error) {
      console.error("Error initializing auth:", error);
      this.isInitialized = true;
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, !!session);
      this.currentSession = session;
      this.currentUser = session?.user || null;
    });
  }

  // Wait for initialization to complete
  private async waitForInitialization(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve) => {
      const checkInit = () => {
        if (this.isInitialized) {
          resolve();
        } else {
          setTimeout(checkInit, 100);
        }
      };
      checkInit();
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
      await this.waitForInitialization();

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
      console.error("Error getting user UID:", error);
      return null;
    }
  }

  // Get current user's email (async - more reliable)
  async getCurrentUserEmail(): Promise<string | null> {
    try {
      await this.waitForInitialization();

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
      console.error("Error getting user email:", error);
      return null;
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.waitForInitialization();

      // First check cached session
      if (this.currentSession?.user) {
        return true;
      }

      // If no cached session, fetch fresh from Supabase
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error checking session:", error);
        return false;
      }

      // Update cached session
      this.currentSession = data.session;
      this.currentUser = data.session?.user || null;

      return !!data.session?.user;
    } catch (error) {
      console.error("Error checking authentication:", error);
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
      console.error("Error getting session:", error);
      return null;
    }
  }

  // Logout user and clear onboarding status
  async logout(): Promise<void> {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear cached user data
      this.currentUser = null;
      this.currentSession = null;

      // Clear onboarding status so user sees onboarding again on next login
      await AsyncStorage.removeItem("hasSeenOnboarding");
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  }

  // Utility method to reset onboarding status (for testing)
  async resetOnboardingStatus(): Promise<void> {
    try {
      await AsyncStorage.removeItem("hasSeenOnboarding");
    } catch (error) {
      console.error("Error resetting onboarding status:", error);
    }
  }

  // Utility method to check if user has seen onboarding
  async hasSeenOnboarding(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem("hasSeenOnboarding");
      return value === "true";
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      return false;
    }
  }

  // Utility method to mark onboarding as seen
  async markOnboardingAsSeen(): Promise<void> {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
    } catch (error) {
      console.error("Error marking onboarding as seen:", error);
    }
  }
}

export const authService = new AuthService();
