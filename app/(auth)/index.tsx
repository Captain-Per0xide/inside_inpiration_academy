// app/(auth)/index.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import tw from 'twrnc';
import { supabase } from '../../lib/supabase';
import { HelloWave } from '@/components/HelloWave';

const { width, height } = Dimensions.get('window');

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          Alert.alert('Login Error', error.message);
        } else {
          // Navigate to main app
          router.replace('/(profile)');
        }
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          Alert.alert('Sign Up Error', error.message);
        } else {
          Alert.alert(
            'Success',
            'Please check your email for verification link',
            [
              {
                text: 'OK',
                onPress: () => setIsLogin(true),
              },
            ]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-900`}>
      <StatusBar backgroundColor="#111827" barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1`}
      >
        <ScrollView
          contentContainerStyle={tw`flex-grow justify-center`}
          keyboardShouldPersistTaps="handled"
        >
          <View style={tw`px-8 py-12 w-full flex justify-center items-center`}>
            <HelloWave />
            {/* Header */}
            <View style={tw`items-center mb-12`}>
              <Text style={tw`text-white text-3xl font-bold mb-2`}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </Text>
              <Text style={tw`text-gray-400 text-base text-center`}>
                {isLogin
                  ? 'Sign in to continue to your account'
                  : 'Sign up to get started with your account'}
              </Text>
            </View>

            {/* Form */}
            <View style={tw`space-y-6 w-full max-w-md`}>
              {/* Email Input */}
              
              <View>
                <Text style={tw`text-white text-sm font-medium mb-2`}>
                  Email Address
                </Text>
                <TextInput
                  style={tw`bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-base`}
                  placeholderTextColor="#9CA3AF"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View>
                <Text style={tw`text-white text-sm font-medium mb-2`}>
                  Password
                </Text>
                <TextInput
                  style={tw`bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-base`}
                  placeholderTextColor="#9CA3AF"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              {/* Confirm Password Input (Sign Up Only) */}
              {!isLogin && (
                <View>
                  <Text style={tw`text-white text-sm font-medium mb-2`}>
                    Confirm Password
                  </Text>
                  <TextInput
                    style={tw`bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-base`}
                    placeholderTextColor="#9CA3AF"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Auth Button */}
              <TouchableOpacity
                style={[
                  tw`bg-blue-600 rounded-lg py-4 items-center mt-8`,
                  loading && tw`opacity-50`,
                ]}
                onPress={handleAuth}
                disabled={loading}
              >
                <Text style={tw`text-white text-base font-bold`}>
                  {loading
                    ? isLogin
                      ? 'Signing In...'
                      : 'Creating Account...'
                    : isLogin
                    ? 'Sign In'
                    : 'Create Account'}
                </Text>
              </TouchableOpacity>

              {/* Toggle Auth Mode */}
              <View style={tw`flex-row justify-center items-center mt-6`}>
                <Text style={tw`text-gray-400 text-sm`}>
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                </Text>
                <TouchableOpacity onPress={toggleAuthMode}>
                  <Text style={tw`text-blue-400 text-sm font-medium`}>
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AuthScreen;