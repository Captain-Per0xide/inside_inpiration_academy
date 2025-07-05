// services/pushTokenService.js
import { supabase } from "../lib/supabase";
import NotifService from "../NotifService";

class PushTokenService {
  // Register push token for the current user (only for students)
  static registerPushToken = async () => {
    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log("No authenticated user found");
        return false;
      }

      // Check user role from database to ensure only students register tokens
      const { data: userData, error: userDataError } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (userDataError) {
        console.error("Error fetching user role:", userDataError);
        return false;
      }

      // Only register push tokens for students (role === 'student' or no role, defaulting to student)
      const userRole = userData?.role || 'student'; // Default to student if no role is set
      if (userRole !== 'student') {
        console.log(`User role is '${userRole}', skipping push token registration for non-students`);
        return false;
      }

      console.log("Registering push token for student user:", user.id);

      // Get Expo push token
      const pushToken = await NotifService.getExpoPushToken();
      if (!pushToken) {
        console.log("Failed to get push token");
        return false;
      }

      // Store push token in database for student
      const { error: updateError } = await supabase.from("users").upsert({
        id: user.id,
        push_token: pushToken,
        updated_at: new Date().toISOString(),
      });

      if (updateError) {
        console.error("Error storing push token:", updateError);
        return false;
      }

      console.log("Student push token registered successfully:", pushToken);
      return true;
    } catch (error) {
      console.error("Error in registerPushToken:", error);
      return false;
    }
  };

  // Remove push token (e.g., on logout)
  static removePushToken = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("users")
        .update({
          push_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      console.log("Push token removed for user:", user.id);
    } catch (error) {
      console.error("Error removing push token:", error);
    }
  };
}

export default PushTokenService;
