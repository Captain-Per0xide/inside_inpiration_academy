import { Asset } from "expo-asset";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.configure();
    this.lastId = 0;
    this.appIconUri = null;
    this.loadAppIcon();
  }

  loadAppIcon = async () => {
    try {
      const asset = Asset.fromModule(
        require("./assets/images/adaptive-icon.png")
      );
      await asset.downloadAsync();
      this.appIconUri = asset.localUri || asset.uri;
      console.log("App icon loaded for notifications:", this.appIconUri);
    } catch (error) {
      console.error("Error loading app icon:", error);
    }
  };

  configure = async () => {
    // Request permissions
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#3B82F6",
        sound: true,
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
      });
    }

    // Request permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return;
    }

    console.log("Notification permissions granted!");
  };

  // Get Expo push token for the current device
  getExpoPushToken = async () => {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: "9ea8f217-50aa-4501-ab8a-7f0653ea3e91", // Your Expo project ID
      });
      console.log("Expo Push Token:", token.data);
      return token.data;
    } catch (error) {
      console.error("Error getting Expo push token:", error);
      return null;
    }
  };

  // Send push notification to multiple users
  sendPushNotifications = async (pushTokens, title, body, data = {}) => {
    try {
      const messages = pushTokens.map((pushToken) => ({
        to: pushToken,
        sound: "default",
        title: title,
        body: body,
        data: data,
        priority: "high",
      }));

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log("Push notification result:", result);
      return result;
    } catch (error) {
      console.error("Error sending push notifications:", error);
      return null;
    }
  };

  showNotification = async (title, message, data = {}, options = {}) => {
    try {
      const notificationContent = {
        title: title,
        body: message,
        data: data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...Platform.select({
          android: {
            color: "#3B82F6", // Blue color for notification accent
            badge: 1,
            categoryIdentifier: "admin-notification",
          },
          ios: {
            sound: "default",
            badge: 1,
            categoryIdentifier: "admin-notification",
          },
        }),
        ...options,
      };

      // Add app icon for iOS notifications
      if (Platform.OS === "ios" && this.appIconUri) {
        notificationContent.attachments = [
          {
            identifier: "app-logo",
            url: this.appIconUri,
            typeHint: "public.png",
          },
        ];
      }

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Show immediately
      });
      this.lastId++;
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  };

  cancelNotification = async (identifier) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error("Error cancelling notification:", error);
    }
  };

  cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("All notifications cancelled");
    } catch (error) {
      console.error("Error cancelling all notifications:", error);
    }
  };

  showScheduledNotification = async (title, message, date) => {
    try {
      const notificationContent = {
        title: title,
        body: message,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...Platform.select({
          android: {
            color: "#3B82F6", // Blue color for notification accent
            badge: 1,
            categoryIdentifier: "admin-notification",
          },
          ios: {
            sound: "default",
            badge: 1,
            categoryIdentifier: "admin-notification",
          },
        }),
      };

      // Add app icon for iOS notifications
      if (Platform.OS === "ios" && this.appIconUri) {
        notificationContent.attachments = [
          {
            identifier: "app-logo",
            url: this.appIconUri,
            typeHint: "public.png",
          },
        ];
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          date: date,
        },
      });
      this.lastId++;
      return identifier;
    } catch (error) {
      console.error("Error scheduling notification:", error);
      return null;
    }
  };
}

export default new NotificationService();
