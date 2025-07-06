import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import 'react-native-reanimated';
import tw from 'twrnc';

import { useColorScheme } from '@/hooks/useColorScheme';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={tw`flex-1 justify-center items-center bg-gray-900 p-4`}>
          <Text style={tw`text-red-500 text-xl font-bold mb-4`}>
            Something went wrong
          </Text>
          <Text style={tw`text-white text-center mb-2`}>
            The app encountered an unexpected error
          </Text>
          <Text style={tw`text-gray-400 text-center text-sm`}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Handle notification responses (when user taps on notification)
  useEffect(() => {
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      console.log('Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      console.log('Notification data:', data);

      // Handle navigation based on notification data
      if (data?.navigationTarget && data?.targetCourseId) {
        try {
          switch (data.navigationTarget) {
            case 'batch-details':
              const params: { [key: string]: string } = { courseId: data.targetCourseId as string };
              
              // Add tab parameter if specified
              if (data.targetTab) {
                params.tab = data.targetTab as string;
              }
              
              // Add course name if available
              if (data.courseName) {
                params.courseName = data.courseName as string;
              }
              
              console.log('Navigating to batch-details with params:', params);
              router.push({
                pathname: '/batch-details',
                params: params
              });
              break;
              
            case 'course-details':
              router.push({
                pathname: '/course-details',
                params: { courseId: data.targetCourseId as string }
              });
              break;
              
            default:
              console.log('Unknown navigation target:', data.navigationTarget);
          }
        } catch (error) {
          console.error('Error handling notification navigation:', error);
        }
      }
    };

    // Listen for notification responses
    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // Cleanup
    return () => {
      subscription.remove();
    };
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(guest)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(profile)" options={{ headerShown: false }} />
          <Stack.Screen name="(students)" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          <Stack.Screen name="(banned)" options={{ headerShown: false }} />
          <Stack.Screen name="course-details" options={{ headerShown: false }} />

          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
