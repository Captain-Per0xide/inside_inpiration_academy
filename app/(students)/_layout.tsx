import AttendanceIcon from "@/components/icons/AttendanceIcon";
import BatchesIcon from "@/components/icons/BatchesIcon";
import CodingLeagueIcon from "@/components/icons/CodingLeagueIcon";
import HomeIcon from "@/components/icons/HomeIcon";
import PaymentIcon from "@/components/icons/PaymentIcon";
import PerformanceIcon from "@/components/icons/Performance";
import TestSeriesIcon from "@/components/icons/TestSeriesIcon";
import { DrawerContentComponentProps, DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { Drawer } from "expo-router/drawer";
import { Image, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
function CustomDrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView {...props}>
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={{ width: 100, height: 100, marginBottom: 10 }}
        />
        <View>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Inside Inspiration Academy</Text>
        </View>
      </View>
      <View style={{ height: 40 }} />
      <DrawerItemList {...props} />
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
          drawerStyle: {
        backgroundColor: '#f4f4f4',
        width: '75%', // Use 75% of the screen width
          },
          drawerActiveTintColor: '#FCCC42',
          drawerInactiveTintColor: '#333',
          drawerLabelStyle: {
        fontSize: 21, // Increase the font size here
          },
        }}>
        <Drawer.Screen name="index" options={{ title: 'Home', drawerLabel: 'Home', drawerIcon: () => <HomeIcon /> }} />
        <Drawer.Screen name="batches" options={{ title: 'Batches', drawerLabel: 'My Batches', drawerIcon: () => <BatchesIcon /> }} />
        <Drawer.Screen name="test-series" options={{ title: 'Test Series', drawerLabel: 'Test Series', drawerIcon: () => <TestSeriesIcon /> }} />
        <Drawer.Screen name="coding-league" options={{ title: 'Coding League', drawerLabel: 'Coding League', drawerIcon: () => <CodingLeagueIcon /> }} />
        <Drawer.Screen name="attendance" options={{ title: 'Attendance', drawerLabel: 'My Attendance', drawerIcon: () => <AttendanceIcon /> }} />
        <Drawer.Screen name="performance" options={{ title: 'Performance', drawerLabel: 'My Performance', drawerIcon: () => <PerformanceIcon /> }} />
        <Drawer.Screen name="payment" options={{ title: 'Payment', drawerLabel: 'Payment', drawerIcon: () => <PaymentIcon /> }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}
