// utils/sessionDebug.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

/**
 * Debug utilities for session persistence during development
 */
export class SessionDebug {
  /**
   * Check the current session status and storage
   */
  static async checkSessionStatus(): Promise<void> {
    try {
      console.log('=== SESSION DEBUG ===');
      
      // Check Supabase session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('Supabase session:', !!sessionData.session);
      console.log('Session error:', sessionError);
      
      if (sessionData.session) {
        console.log('User ID:', sessionData.session.user.id);
        console.log('User email:', sessionData.session.user.email);
        console.log('Session expires at:', sessionData.session.expires_at);
      }
      
      // Check AsyncStorage for session data
      const storageKeys = await AsyncStorage.getAllKeys();
      const supabaseKeys = storageKeys.filter(key => key.includes('supabase'));
      console.log('Supabase keys in storage:', supabaseKeys);
      
      for (const key of supabaseKeys) {
        const value = await AsyncStorage.getItem(key);
        console.log(`${key}:`, value ? 'Has data' : 'Empty');
      }
      
      // Check onboarding status
      const onboardingStatus = await AsyncStorage.getItem('hasSeenOnboarding');
      console.log('Onboarding status:', onboardingStatus);
      
      console.log('==================');
    } catch (error) {
      console.error('Session debug error:', error);
    }
  }

  /**
   * Clear all session data (for testing)
   */
  static async clearAllSessionData(): Promise<void> {
    try {
      console.log('Clearing all session data...');
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear onboarding status
      await AsyncStorage.removeItem('hasSeenOnboarding');
      
      // Clear any other Supabase-related storage
      const storageKeys = await AsyncStorage.getAllKeys();
      const supabaseKeys = storageKeys.filter(key => key.includes('supabase'));
      
      for (const key of supabaseKeys) {
        await AsyncStorage.removeItem(key);
      }
      
      console.log('Session data cleared');
    } catch (error) {
      console.error('Error clearing session data:', error);
    }
  }

  /**
   * Monitor auth state changes during development
   */
  static startAuthMonitoring(): void {
    console.log('Starting auth state monitoring...');
    
    supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AUTH EVENT] ${event}:`, {
        hasSession: !!session,
        userId: session?.user?.id || 'None',
        email: session?.user?.email || 'None',
        timestamp: new Date().toISOString()
      });
    });
  }
}
