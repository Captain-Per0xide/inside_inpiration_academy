// services/pushTokenService.js
import { supabase } from "../lib/supabase";
import NotifService from "../NotifService";

class PushTokenService {
  // Register push token for the current user
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

      // Get Expo push token
      const pushToken = await NotifService.getExpoPushToken();
      if (!pushToken) {
        console.log("Failed to get push token");
        return false;
      }

      // Store push token in database
      const { error: updateError } = await supabase.from("users").upsert({
        id: user.id,
        push_token: pushToken,
        updated_at: new Date().toISOString(),
      });

      if (updateError) {
        console.error("Error storing push token:", updateError);
        return false;
      }

      console.log("Push token registered successfully:", pushToken);
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

      console.log("Push token removed");
    } catch (error) {
      console.error("Error removing push token:", error);
    }
  };
}

export default PushTokenService;
