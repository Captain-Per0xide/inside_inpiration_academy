import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import tw from 'twrnc';
import { determineAppRoute } from '../utils/routingUtils';
import { SessionDebug } from '../utils/sessionDebug';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [destination, setDestination] = useState<string>('/onboarding');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeRoute = async () => {
      try {
        // Check if we can initialize the app
        console.log('App initialization starting...');

        // Test environment variables
        const hasSupabaseUrl = !!process.env.EXPO_PUBLIC_SUPABASE_URL;
        const hasSupabaseKey = !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

        console.log('Environment variables check:', { hasSupabaseUrl, hasSupabaseKey });

        if (!hasSupabaseUrl || !hasSupabaseKey) {
          throw new Error('Missing required environment variables');
        }

        // Enable session monitoring in development
        if (__DEV__) {
          SessionDebug.startAuthMonitoring();
          await SessionDebug.checkSessionStatus();
        }

        console.log('Starting route determination...');
        const route = await determineAppRoute();
        console.log('Route determined:', route);
        setDestination(route);

        console.log('App routing to:', route);
      } catch (error) {
        console.error('Error initializing route:', error);
        setError(error instanceof Error ? error.message : 'Unknown initialization error');
        setDestination('/onboarding'); // Fallback to onboarding
      } finally {
        setIsLoading(false);
      }
    };

    initializeRoute();
  }, []);

  if (error) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900 p-4`}>
        <Text style={tw`text-red-500 text-center mb-4`}>
          App Initialization Error
        </Text>
        <Text style={tw`text-white text-center text-sm`}>
          {error}
        </Text>
        <Text style={tw`text-gray-400 text-center text-xs mt-2`}>
          Please restart the app
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={tw`text-white mt-4`}>Loading...</Text>
      </View>
    );
  }

  return <Redirect href={destination as any} />;
}
