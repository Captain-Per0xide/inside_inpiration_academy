import CourseIcon from "@/components/icons/CourseIcon";
import { supabase } from "@/lib/supabase";
import { authService } from "@/services/authService";
import { Ionicons } from "@expo/vector-icons";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { router } from "expo-router";
import { Drawer } from "expo-router/drawer";
import React, { useEffect, useState } from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

interface UserData {
  id?: string;
  email?: string;
  name?: string;
  user_image?: string | null;
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const [userData, setUserData] = useState<UserData>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const id = await authService.getCurrentUserUID();
      const email = await authService.getCurrentUserEmail();

      if (!id || !email) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);
      console.log('Fetching user data for guest drawer, ID:', id);

      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, user_image')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Guest drawer fetch error:', error);
        return;
      }

      if (data) {
        setUserData(data);
      } else {
        // If no user data exists in database, use current auth info
        setUserData({ id, email, name: 'User' });
      }
    } catch (error) {
      console.error('Error fetching user data for guest drawer:', error);
      setIsLoggedIn(false);
    }
  };
  const handleLogin = () => {
    router.push("/(auth)");
  };

  const handleSignUp = () => {
    // Navigate to sign up or show sign up modal
    Alert.alert("Sign Up", "Ready to join Inside Inspiration Academy?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Up", onPress: () => router.push("/(auth)") },
    ]);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              router.replace('/(auth)');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flex: 1, backgroundColor: "#29395A" }}
    >
      <View style={{ padding: 20, alignItems: "center" }}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={{
            width: 100,
            height: 100,
            marginBottom: 10,
            backgroundColor: "#fff",
            borderRadius: 50,
          }}
        />
        <View>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "#fff" }}>
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
          <View
            style={{
              padding: 20,
              borderTopWidth: 1,
              backgroundColor: "#111827",
              borderRadius: 8,
              marginHorizontal: 10,
            }}
          >
            {isLoggedIn ? (
              // Logged in user info
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                  {userData.user_image ? (
                    <Image
                      source={{ uri: userData.user_image }}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        marginRight: 15,
                        backgroundColor: '#e0e0e0'
                      }}
                    />
                  ) : (
                    <View style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: '#FCCC42',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 15
                    }}>
                      <Text style={{
                        fontSize: 20,
                        fontWeight: 'bold',
                        color: '#fff'
                      }}>
                        {userData.name && userData.name.length > 0 ? userData.name.charAt(0).toUpperCase() : 'U'}
                      </Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: '#fff',
                      marginBottom: 2
                    }}>
                      {userData.name ? userData.name : 'User'}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#fefefe'
                    }} numberOfLines={1}>
                      {userData.email ? userData.email : 'No email'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: "#ff4444",
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  onPress={handleLogout}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                  >
                    Logout
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              // Guest user interface
              <>
                <View style={{ alignItems: "center", marginBottom: 15 }}>
                  <Ionicons
                    name="person-circle-outline"
                    size={60}
                    color="#FCCC42"
                  />
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: "#fff",
                      marginTop: 10,
                      marginBottom: 5,
                    }}
                  >
                    Welcome, Guest!
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#fefefefe",
                      textAlign: "center",
                    }}
                  >
                    Explore our courses and join our academy
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: "#FCCC42",
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                  onPress={handleLogin}
                >
                  <Text
                    style={{
                      color: "#111827",
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                  >
                    Login
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: "transparent",
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#FCCC42",
                  }}
                  onPress={handleSignUp}
                >
                  <Text
                    style={{
                      color: "#FCCC42",
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                  >
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </>
            )}
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
          headerTitle: "Inside Inspiration Academy",
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: "#29395A",
          },
          headerTintColor: "#fff",
          drawerStyle: {
            backgroundColor: "#f4f4f4",
            width: "75%",
          },
          drawerActiveTintColor: "#FCCC42",
          drawerInactiveTintColor: "#fff",
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={() => {
                Alert.alert(
                  "Login Required",
                  "Please login to access notifications",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Login", onPress: () => router.push("/(auth)") },
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
            title: "Available Courses",
            drawerLabel: "Browse Courses",
            drawerIcon: () => <CourseIcon stroke="#fff" />,
          }}
        />
        <Drawer.Screen
          name="payment"
          options={{
            title: "Payment",
            drawerLabel: () => null, // Hide from drawer menu
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
