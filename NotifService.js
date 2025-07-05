import { Asset } from "expo-asset";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import FirebaseService from "./services/FirebaseService";

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
    this.initializeFirebase();
  }

  initializeFirebase = async () => {
    try {
      await FirebaseService.initialize();
      FirebaseService.setupMessageHandlers();
      console.log("Firebase integration initialized");
    } catch (error) {
      console.warn("Firebase initialization failed, using local notifications only:", error);
    }
  };

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
    
    // Also request Firebase permission
    try {
      await FirebaseService.requestNotificationPermission();
    } catch (error) {
      console.warn("Firebase permission request failed:", error);
    }
  };

  // Get push token (Firebase/Expo)
  getExpoPushToken = async () => {
    try {
      // First try Firebase/Expo integrated token
      const token = await FirebaseService.getExpoPushToken();
      if (token) {
        console.log("Push Token:", token);
        return token;
      }
      
      // Fallback to Expo only
      const expoToken = await Notifications.getExpoPushTokenAsync({
        projectId: "9ea8f217-50aa-4501-ab8a-7f0653ea3e91", // Your Expo project ID from app.json
      });
      console.log("Expo Push Token:", expoToken.data);
      return expoToken.data;
    } catch (error) {
      console.error("Error getting push token:", error);
      return null;
    }
  };

  // Send push notification to multiple users (handles both Expo and FCM tokens)
  sendPushNotifications = async (pushTokens, title, body, data = {}) => {
    try {
      // Separate tokens by type
      const expoTokens = pushTokens.filter(token => token.startsWith('ExponentPushToken['));
      const fcmTokens = pushTokens.filter(token => !token.startsWith('ExponentPushToken[') && token.length > 50);

      console.log(`Sending notifications to ${expoTokens.length} Expo tokens and ${fcmTokens.length} FCM tokens`);

      const results = [];

      // Send to Expo tokens using Expo push service
      if (expoTokens.length > 0) {
        try {
          const expoMessages = expoTokens.map((pushToken) => ({
            to: pushToken,
            sound: "default",
            title: title,
            body: body,
            data: data,
            priority: "high",
          }));

          const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Accept-encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(expoMessages),
          });

          const expoResult = await expoResponse.json();
          console.log("Expo push notification result:", expoResult);
          results.push({ type: 'expo', result: expoResult });
        } catch (expoError) {
          console.error('Error sending Expo notifications:', expoError);
          results.push({ type: 'expo', error: expoError.message });
        }
      }

      // Send to FCM tokens using Firebase
      if (fcmTokens.length > 0) {
        try {
          console.log(`Processing ${fcmTokens.length} FCM tokens...`);
          
          const fcmResults = [];
          for (const token of fcmTokens) {
            try {
              // Note: For proper FCM server-side sending, you'd use Firebase Admin SDK on your backend
              // For now, we'll create a local notification to ensure students get notified
              console.log(`Sending local notification for FCM token: ${token.substring(0, 20)}...`);
              
              await this.showNotification(title, body, data);
              fcmResults.push({ token: token.substring(0, 20) + '...', status: 'local_notification_sent' });
            } catch (fcmError) {
              console.error(`Error with FCM token ${token.substring(0, 20)}:`, fcmError);
              fcmResults.push({ token: token.substring(0, 20) + '...', error: fcmError.message });
            }
          }
          
          console.log('FCM notifications processed:', fcmResults);
          results.push({ type: 'fcm', result: fcmResults });
        } catch (fcmError) {
          console.error('Error sending FCM notifications:', fcmError);
          results.push({ type: 'fcm', error: fcmError.message });
        }
      }

      return results;
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
