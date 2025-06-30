// utils/authUtils.ts
import { supabase } from "@/lib/supabase";
import { authService } from "@/services/authService";
import { router } from "expo-router";
import { Alert } from "react-native";

/**
 * Safely handles user logout with proper error handling
 * for AuthSessionMissingError and other auth-related issues
 */
export const safeLogout = async (): Promise<void> => {
  try {
    // Check if there's an active session first
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session) {
      // Only attempt sign out if there's an active session
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("Logout warning:", error);
        // Don't throw error for AuthSessionMissingError
        if (!error.message.includes("Auth session missing")) {
          throw error;
        }
      }
    } else {
      console.log("No active session found, proceeding with logout");
    }

    // Use auth service to clean up properly
    await authService.logout();

    console.log("Logout completed successfully");
  } catch (error: any) {
    console.error("Logout error:", error);

    // Handle the specific AuthSessionMissingError
    if (error.message?.includes("Auth session missing")) {
      console.log("Session already cleared, completing logout cleanup");
      // Still clean up local state even if session is missing
      try {
        await authService.logout();
      } catch (cleanupError) {
        console.warn("Error during logout cleanup:", cleanupError);
      }
    } else {
      throw error; // Re-throw other errors
    }
  }
};

/**
 * Shows logout confirmation dialog and handles the logout process
 */
export const showLogoutConfirmation = (): void => {
  Alert.alert("Logout", "Are you sure you want to logout?", [
    {
      text: "Cancel",
      style: "cancel",
    },
    {
      text: "Logout",
      style: "destructive",
      onPress: async () => {
        try {
          await safeLogout();
          router.replace("/(auth)");
        } catch (error: any) {
          console.error("Final logout error:", error);

          // Even if logout fails, navigate to auth screen
          // This ensures user isn't stuck in the app
          if (error.message?.includes("Auth session missing")) {
            console.log("Session already cleared, navigating to auth");
            router.replace("/(auth)");
          } else {
            Alert.alert(
              "Error",
              "Failed to logout completely, but you will be signed out."
            );
            router.replace("/(auth)");
          }
        }
      },
    },
  ]);
};

/**
 * Check if user session is valid and handle expired sessions
 */
export const validateSession = async (): Promise<boolean> => {
  try {
    const { data: sessionData, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Session validation error:", error);
      return false;
    }

    if (!sessionData.session) {
      console.log("No active session found");
      return false;
    }

    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (
      sessionData.session.expires_at &&
      sessionData.session.expires_at < now
    ) {
      console.log("Session has expired");
      await safeLogout();
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating session:", error);
    return false;
  }
};
