// utils/testUtils.ts
import { authService } from '../services/authService';
import { determineAppRoute } from './routingUtils';
import { SessionDebug } from './sessionDebug';

/**
 * Utility functions for testing the routing logic
 */
export class TestUtils {
  /**
   * Reset the app to first-time user state
   * This will clear onboarding status and log out the user
   */
  static async resetToFirstTimeUser(): Promise<void> {
    try {
      await authService.logout();
      console.log('App reset to first-time user state');
    } catch (error) {
      console.error('Error resetting app:', error);
    }
  }

  /**
   * Reset only the onboarding status (keep user logged in)
   */
  static async resetOnboardingOnly(): Promise<void> {
    try {
      await authService.resetOnboardingStatus();
      console.log('Onboarding status reset');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }

  /**
   * Check current app state and determine where the app would route
   */
  static async checkAppState(): Promise<void> {
    try {
      const hasSeenOnboarding = await authService.hasSeenOnboarding();
      const isAuthenticated = await authService.isAuthenticated();
      const userEmail = await authService.getCurrentUserEmail();
      const currentRoute = await determineAppRoute();
      
      console.log('=== Current App State ===');
      console.log('Has seen onboarding:', hasSeenOnboarding);
      console.log('Is authenticated:', isAuthenticated);
      console.log('User email:', userEmail || 'None');
      console.log('Would route to:', currentRoute);
      console.log('========================');
      
      // Also check session details
      await SessionDebug.checkSessionStatus();
    } catch (error) {
      console.error('Error checking app state:', error);
    }
  }

  /**
   * Simulate app refresh by returning the route the app would navigate to
   */
  static async simulateAppRefresh(): Promise<string> {
    try {
      const route = await determineAppRoute();
      console.log('App refresh would navigate to:', route);
      return route;
    } catch (error) {
      console.error('Error simulating app refresh:', error);
      return '/onboarding';
    }
  }

  /**
   * Clear all session data and start fresh (for development testing)
   */
  static async clearAllData(): Promise<void> {
    try {
      await SessionDebug.clearAllSessionData();
      console.log('All session data cleared - app will restart as new user');
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }
}
