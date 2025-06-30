// utils/routingUtils.ts
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';

/**
 * Checks if user profile is complete based on required fields
 * @param userId - The user's ID from authentication
 * @returns True if profile is complete, false otherwise
 */
export const isProfileComplete = async (userId: string): Promise<boolean> => {
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('name, phone_no, address, dob, univ_name, gender')
      .eq('id', userId)
      .maybeSingle();

    if (error || !userData) {
      console.error('Error fetching user data for profile check:', error);
      return false;
    }

    // Check if all required fields have data (not empty or null)
    const requiredFields = ['name', 'phone_no', 'address', 'dob', 'univ_name', 'gender'];
    
    for (const field of requiredFields) {
      const value = userData[field as keyof typeof userData];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        console.log(`Profile incomplete: missing ${field}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking profile completion:', error);
    return false;
  }
};

/**
 * Determines the appropriate route for an authenticated user based on their role
 * @param userId - The user's ID from authentication
 * @returns The route path to redirect to
 */
export const determineUserRoute = async (userId: string): Promise<string> => {
  try {
    // Fetch user data to determine role
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user data:', error);
      // If error fetching user data, go to guest
      return '/(guest)';
    }

    if (!userData) {
      // User doesn't exist in database, go to guest
      return '/(guest)';
    }

    // Redirect based on user role
    if (userData.role === 'admin') {
      return '/(admin)';
    }
    else if (userData.role === 'teacher') {
      return '/(admin)';
    }
    else if (userData.role === 'student') {
      return '/(students)';
    } else {
      // Default or no role - go to guest
      return '/(guest)';
    }
  } catch (error) {
    console.error('Error determining user route:', error);
    // On error, default to guest
    return '/(guest)';
  }
};

/**
 * Complete routing logic for the app including onboarding and auth checks
 * @returns The route path to redirect to
 */
export const determineAppRoute = async (): Promise<string> => {
  try {
    // Check authentication status first
    const isAuthenticated = await authService.isAuthenticated();
    
    if (isAuthenticated) {
      // User is authenticated - get user session to determine route
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Send user directly to their role-based dashboard
        return await determineUserRoute(session.user.id);
      }
    }

    // Check if user has seen onboarding
    const hasSeenOnboarding = await authService.hasSeenOnboarding();
    
    if (!hasSeenOnboarding) {
      // First time user - show onboarding
      return '/onboarding';
    }

    // User has seen onboarding but not authenticated - go to auth
    return '/(auth)';
  } catch (error) {
    console.error('Error determining app route:', error);
    // On error, default to onboarding
    return '/onboarding';
  }
};
