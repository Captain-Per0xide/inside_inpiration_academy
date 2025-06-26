import CourseIcon from "@/components/icons/CourseIcon";
import { Ionicons } from "@expo/vector-icons";
import { DrawerContentComponentProps, DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { router } from "expo-router";
import { Drawer } from "expo-router/drawer";
import React from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const handleLogin = () => {
    router.push('/(auth)');
  };

  const handleSignUp = () => {
    // Navigate to sign up or show sign up modal
    Alert.alert(
      'Sign Up',
      'Ready to join Inside Inspiration Academy?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Up', onPress: () => router.push('/(auth)') }
      ]
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, backgroundColor: '#29395A' }}>
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={{ width: 100, height: 100, marginBottom: 10, backgroundColor: '#fff', borderRadius: 50 }}
        />
        <View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>
            Inside Inspiration Academy
          </Text>
        </View>
      </View>
      <View style={{ height: 40 }} />

      <View style={{ flex: 1 }}>
        <DrawerContentScrollView
          {...props}
          contentContainerStyle={{ paddingTop: 0, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <DrawerItemList {...props} />
          <View style={{ height: 40 }} />
          
          {/* Guest Actions Section */}
          <View style={{
            padding: 20,
            borderTopWidth: 1,
            backgroundColor: '#111827',
            borderRadius: 8,
            marginHorizontal: 10
          }}>
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <Ionicons name="person-circle-outline" size={60} color="#FCCC42" />
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#fff',
                marginTop: 10,
                marginBottom: 5
              }}>
                Welcome, Guest!
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#fefefefe',
                textAlign: 'center'
              }}>
                Explore our courses and join our academy
              </Text>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: '#FCCC42',
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 8,
                alignItems: 'center',
                marginBottom: 10
              }}
              onPress={handleLogin}
            >
              <Text style={{
                color: '#111827',
                fontSize: 16,
                fontWeight: 'bold'
              }}>
                Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: 'transparent',
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#FCCC42'
              }}
              onPress={handleSignUp}
            >
              <Text style={{
                color: '#FCCC42',
                fontSize: 16,
                fontWeight: 'bold'
              }}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </DrawerContentScrollView>
      </View>
    </DrawerContentScrollView>
  );
}

export default function GuestLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={CustomDrawerContent}
        screenOptions={{
          headerShown: true,
          headerTitle: 'Inside Inspiration Academy',
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#29395A',
          },
          headerTintColor: '#fff',
          drawerStyle: {
            backgroundColor: '#f4f4f4',
            width: '75%',
          },
          drawerActiveTintColor: '#FCCC42',
          drawerInactiveTintColor: '#fff',
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={() => {
                Alert.alert(
                  'Login Required',
                  'Please login to access notifications',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Login', onPress: () => router.push('/(auth)') }
                  ]
                );
              }}
            >
              <Ionicons name="notifications-outline" size={20} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            title: 'Available Courses',
            drawerLabel: 'Browse Courses',
            drawerIcon: () => <CourseIcon stroke="#fff" />
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}