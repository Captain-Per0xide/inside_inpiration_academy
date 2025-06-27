// utils/routingUtils.ts
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';

/**
 * Determines the appropriate route for an authenticated user based on their profile and role
 * @param userId - The user's ID from authentication
 * @returns The route path to redirect to
 */
export const determineUserRoute = async (userId: string): Promise<string> => {
  try {
    // Fetch user data to determine role and profile completion
    const { data: userData, error } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user data:', error);
      // If error fetching user data, go to profile to complete setup
      return '/(profile)';
    }

    if (!userData || !userData.name) {
      // User exists but profile incomplete - go to profile
      return '/(profile)';
    }

    // Redirect based on user role
    if (userData.role === 'admin') {
      return '/(admin)';
    } else if (userData.role === 'student') {
      return '/(students)';
    } else {
      // Default or no role - go to guest
      return '/(guest)';
    }
  } catch (error) {
    console.error('Error determining user route:', error);
    // On error, default to profile setup
    return '/(profile)';
  }
};

/**
 * Complete routing logic for the app including onboarding and auth checks
 * @returns The route path to redirect to
 */
export const determineAppRoute = async (): Promise<string> => {
  try {
    // Check if user has seen onboarding
    const hasSeenOnboarding = await authService.hasSeenOnboarding();
    
    if (!hasSeenOnboarding) {
      // First time user - show onboarding
      return '/onboarding';
    }

    // Check authentication status
    const isAuthenticated = await authService.isAuthenticated();
    
    if (!isAuthenticated) {
      // User has seen onboarding but not authenticated - go to auth
      return '/(auth)';
    }

    // User is authenticated - get their route based on profile and role
    const userId = await authService.getCurrentUserUID();
    
    if (!userId) {
      // No user ID found - go to auth
      return '/(auth)';
    }

    return await determineUserRoute(userId);
  } catch (error) {
    console.error('Error determining app route:', error);
    // On error, default to onboarding
    return '/onboarding';
  }
};
