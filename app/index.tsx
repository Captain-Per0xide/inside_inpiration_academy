import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import tw from 'twrnc';
import { determineAppRoute } from '../utils/routingUtils';
import { SessionDebug } from '../utils/sessionDebug';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [destination, setDestination] = useState<string>('/onboarding');

  useEffect(() => {
    const initializeRoute = async () => {
      try {
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
        setDestination('/onboarding');
      } finally {
        setIsLoading(false);
      }
    };

    initializeRoute();
  }, []);

  if (isLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <Redirect href={destination as any} />;
}
