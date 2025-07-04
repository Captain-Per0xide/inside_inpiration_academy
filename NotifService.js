import { Asset } from 'expo-asset';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// App logo for notifications

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
      const asset = Asset.fromModule(require('./assets/images/adaptive-icon.png'));
      await asset.downloadAsync();
      this.appIconUri = asset.localUri || asset.uri;
      console.log('App icon loaded for notifications:', this.appIconUri);
    } catch (error) {
      console.error('Error loading app icon:', error);
    }
  };

  configure = async () => {
    // Request permissions
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: true,
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
      });
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    console.log('Notification permissions granted!');
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
            color: '#3B82F6', // Blue color for notification accent
            badge: 1,
            categoryIdentifier: 'admin-notification',
          },
          ios: {
            sound: 'default',
            badge: 1,
            categoryIdentifier: 'admin-notification',
          },
        }),
        ...options,
      };

      // Add app icon for iOS notifications
      if (Platform.OS === 'ios' && this.appIconUri) {
        notificationContent.attachments = [
          {
            identifier: 'app-logo',
            url: this.appIconUri,
            typeHint: 'public.png',
          },
        ];
      }

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Show immediately
      });
      this.lastId++;
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  cancelNotification = async (identifier) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  };

  cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
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
            color: '#3B82F6', // Blue color for notification accent
            badge: 1,
            categoryIdentifier: 'admin-notification',
          },
          ios: {
            sound: 'default',
            badge: 1,
            categoryIdentifier: 'admin-notification',
          },
        }),
      };

      // Add app icon for iOS notifications
      if (Platform.OS === 'ios' && this.appIconUri) {
        notificationContent.attachments = [
          {
            identifier: 'app-logo',
            url: this.appIconUri,
            typeHint: 'public.png',
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
      console.error('Error scheduling notification:', error);
      return null;
    }
  };
}

export default new NotificationService();
