import AttendanceIcon from "@/components/icons/AttendanceIcon";
import BatchesIcon from "@/components/icons/BatchesIcon";
import CodingLeagueIcon from "@/components/icons/CodingLeagueIcon";
import HomeIcon from "@/components/icons/HomeIcon";
import PaymentIcon from "@/components/icons/PaymentIcon";
import PerformanceIcon from "@/components/icons/Performance";
import SettingsIcon from "@/components/icons/SettingsIcon";
import TestSeriesIcon from "@/components/icons/TestSeriesIcon";
import { supabase } from "@/lib/supabase";
import { authService } from "@/services/authService";
import { Ionicons } from "@expo/vector-icons";
import { DrawerContentComponentProps, DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
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

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const id = await authService.getCurrentUserUID();
      const email = await authService.getCurrentUserEmail();

      if (!id || !email) return;

      console.log('Fetching user data for drawer, ID:', id);

      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, user_image')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Drawer fetch error:', error);
        return;
      }

      if (data) {
        setUserData(data);
      } else {
        // If no user data exists in database, use current auth info
        setUserData({ id, email, name: 'User' });
      }
    } catch (error) {
      console.error('Error fetching user data for drawer:', error);
    }
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
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, backgroundColor: '#29395A' }}>
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={{ width: 100, height: 100, marginBottom: 10, backgroundColor: '#fff', borderRadius: 50 }}
        />
        <View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>Inside Inspiration Academy</Text>
        </View>
      </View>
      <View style={{ height: 40 }} />

      <View style={{ flex: 1 }}>
        <DrawerItemList {...props} />
      </View>

      <View style={{
        padding: 20,
        borderTopWidth: 1,
        borderRadius: 8,
        backgroundColor: '#111827'
      }}>
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
          <SettingsIcon stroke="white" />
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: '#ff4444',
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 8,
            alignItems: 'center'
          }}
          onPress={handleLogout}
        >
          <Text style={{
            color: 'white',
            fontSize: 16,
            fontWeight: 'bold'
          }}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}
export default function StudentsLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={CustomDrawerContent}
        screenOptions={{
          headerShown: true,
          headerTitle: 'Inside Inspiration Academy',
          headerTitleAlign: 'center',
          drawerStyle: {
            backgroundColor: '#111827',
            width: '75%',
          },
          drawerActiveTintColor: '#FCCC42',
          drawerInactiveTintColor: '#fff',
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={() => {
                // Handle notification icon press here
                // For example: router.push('/(students)/notifications');
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
            title: 'Home',
            drawerLabel: 'Home',
            drawerIcon: () => <HomeIcon stroke="white"/>
          }}
        />
        <Drawer.Screen
          name="batches"
          options={{
            title: 'Batches',
            drawerLabel: 'My Batches',
            drawerIcon: () => <BatchesIcon stroke="white"/>
          }}
        />
        <Drawer.Screen
          name="test-series"
          options={{
            title: 'Test Series',
            drawerLabel: 'Test Series',
            drawerIcon: () => <TestSeriesIcon stroke="white"/>
          }}
        />
        <Drawer.Screen
          name="coding-league"
          options={{
            title: 'Coding League',
            drawerLabel: 'Coding League',
            drawerIcon: () => <CodingLeagueIcon stroke="white"/>
          }}
        />
        <Drawer.Screen
          name="attendance"
          options={{
            title: 'Attendance',
            drawerLabel: 'My Attendance',
            drawerIcon: () => <AttendanceIcon stroke="white"/>
          }}
        />
        <Drawer.Screen
          name="performance"
          options={{
            title: 'Performance',
            drawerLabel: 'My Performance',
            drawerIcon: () => <PerformanceIcon fill="white"/>
          }}
        />
        <Drawer.Screen
          name="payment"
          options={{
            title: 'Payment',
            drawerLabel: 'Payment',
            drawerIcon: () => <PaymentIcon stroke="white"/>
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
