import { getApps, initializeApp } from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

class FirebaseService {
  async initialize() {
    try {
      // Check if Firebase is already initialized
      if (getApps().length === 0) {
        console.log('Initializing Firebase...');
        await initializeApp();
        console.log('Firebase initialized successfully');
      }

      // Request permission for notifications
      await this.requestNotificationPermission();
      
      // Get FCM token
      const fcmToken = await this.getFCMToken();
      console.log('FCM Token:', fcmToken);
      
      return fcmToken;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  }

  async requestNotificationPermission() {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Notification permission granted');
        return true;
      } else {
        console.log('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  async getFCMToken() {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async getExpoPushToken() {
    try {
      // First try to get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'inside-inspiration-acade-a0b27', // Your Firebase project ID
      });
      return token.data;
    } catch (error) {
      console.warn('Expo push token error, falling back to FCM:', error.message);
      // Fall back to FCM token if Expo token fails
      return await this.getFCMToken();
    }
  }

  setupMessageHandlers() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
    });

    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('Message received in foreground!', remoteMessage);
      
      // Show local notification using Expo
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title || 'New Notification',
          body: remoteMessage.notification?.body || 'You have a new message',
          data: remoteMessage.data,
        },
        trigger: null, // Show immediately
      });
    });
  }
}

export default new FirebaseService();
