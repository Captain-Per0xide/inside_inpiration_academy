import CodingLeagueIcon from "@/components/icons/CodingLeagueIcon";
import CourseIcon from "@/components/icons/CourseIcon";
import HomeIcon from "@/components/icons/HomeIcon";
import LiveIcon from "@/components/icons/LiveIcon";
import PaymentIcon from "@/components/icons/PaymentIcon";
import PerformanceIcon from "@/components/icons/Performance";
import RoutineIcon from "@/components/icons/RoutineIcon";
import SettingsIcon from "@/components/icons/SettingsIcon";
import StudentsIcon from "@/components/icons/StudentsIcon";
import TeacherIcon from "@/components/icons/TeacherIcon";
import TestSeriesIcon from "@/components/icons/TestSeriesIcon";
import { supabase } from "@/lib/supabase";
import { authService } from "@/services/authService";
import PushTokenService from "@/services/pushTokenService";
import { getCurrentDate } from "@/utils/testDate";
import { Ionicons } from "@expo/vector-icons";
import { DrawerContentComponentProps, DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { router } from "expo-router";
import { Drawer } from "expo-router/drawer";
import React, { useCallback, useEffect, useState } from "react";
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

  // Helper function to get months between two dates
  const getMonthsBetween = useCallback((startDate: Date, endDate: Date): string[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const result: string[] = [];

    const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (start <= end) {
      result.push(months[start.getMonth()]);
      start.setMonth(start.getMonth() + 1);
    }

    return result;
  }, []);

  // Check if trigger already ran this month for any user
  const hasTriggeredThisMonth = useCallback(async (): Promise<boolean> => {
    try {
      const currentDate = getCurrentDate();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // Check if there's a trigger log for this month
      const { data, error } = await supabase
        .from('admin_triggers')
        .select('id, triggered_date')
        .gte('triggered_date', new Date(currentYear, currentMonth, 1).toISOString())
        .lte('triggered_date', new Date(currentYear, currentMonth + 1, 0).toISOString())
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking trigger status:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in hasTriggeredThisMonth:', error);
      return false;
    }
  }, [getCurrentDate]);

  // Monthly trigger to update overdue course enrollments for all students
  const runMonthlyOverdueCheck = useCallback(async () => {
    try {
      console.log('🚨 ADMIN TRIGGER: Starting monthly overdue check for all students...');

      const currentDate = getCurrentDate();
      const today = currentDate.getDate();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // Check if today is the 15th of the month
      if (today !== 15) {
        console.log(`📅 Trigger check: Today is ${today}th, trigger only runs on 15th of month. Skipping...`);
        return;
      }

      // Check if trigger already ran this month
      if (await hasTriggeredThisMonth()) {
        console.log(`✅ Trigger already ran this month (${currentMonth + 1}/${currentYear}). Skipping duplicate run...`);
        return;
      }

      console.log(`🎯 ADMIN TRIGGER ACTIVATED: Today is ${today}th of ${currentMonth + 1}/${currentYear} - Running monthly overdue check for ALL students...`);

      // Get all users with enrolled courses
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, name, enrolled_courses')
        .not('enrolled_courses', 'is', null);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return;
      }

      console.log(`📊 Found ${allUsers?.length || 0} users with enrolled courses`);

      let totalStudentsProcessed = 0;
      let totalCoursesSuspended = 0;
      let usersWithSuspensions = 0;

      for (const user of allUsers || []) {
        if (!user.enrolled_courses || !Array.isArray(user.enrolled_courses)) continue;

        totalStudentsProcessed++;
        const updatedEnrollments = [...user.enrolled_courses];
        let hasUpdates = false;
        let userCoursesSuspended = 0;

        console.log(`\n👤 Processing user: ${user.name} (${user.id})`);

        for (let i = 0; i < updatedEnrollments.length; i++) {
          const enrollment = updatedEnrollments[i];
          if (!enrollment || !enrollment.course_id) continue;

          // Skip if already pending or other non-success status
          if (enrollment.status !== 'success') {
            console.log(`⏭️  Skipping course ${enrollment.course_id} - status is already ${enrollment.status}`);
            continue;
          }

          const courseId = enrollment.course_id;

          // Get course enrollment date from courses table
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('id, full_name, enrolled_students')
            .eq('id', courseId)
            .single();

          if (courseError || !courseData) {
            console.log(`❌ Could not fetch course data for ${courseId}`);
            continue;
          }

          // Find user's enrollment date
          let enrollmentDate: Date | null = null;
          if (courseData.enrolled_students && Array.isArray(courseData.enrolled_students)) {
            const userEnrollment = courseData.enrolled_students.find(
              (student: any) => student && student.user_id === user.id
            );

            if (userEnrollment && userEnrollment.approve_date) {
              enrollmentDate = new Date(userEnrollment.approve_date);
            }
          }

          if (!enrollmentDate) {
            console.log(`❌ No enrollment date found for course ${courseId}`);
            continue;
          }

          // Check if enrollment is in the future
          if (enrollmentDate.getTime() > currentDate.getTime()) {
            console.log(`⚠️  Future enrollment for course ${courseId} - skipping`);
            continue;
          }

          // Calculate months from enrollment to end of current month for payment calculation
          const endOfCurrentMonth = new Date(currentYear, currentMonth, 15);
          const relevantMonths = getMonthsBetween(enrollmentDate, endOfCurrentMonth);

          // Get fee data to check payment status
          const { data: feeData, error: feeError } = await supabase
            .from('fees')
            .select('*')
            .eq('id', courseId)
            .single();

          let overdueMonths = 0;

          if (feeError || !feeData) {
            // No fee record means all months are overdue
            overdueMonths = relevantMonths.length;
          } else {
            // Count overdue months
            for (const month of relevantMonths) {
              const monthData = feeData[month];

              if (!monthData || !Array.isArray(monthData)) {
                overdueMonths++;
                continue;
              }

              // Check if user has successful payment for this month
              const userPayment = monthData.find((payment: any) =>
                payment.user_id === user.id && payment.status === 'success'
              );

              if (!userPayment) {
                overdueMonths++;
              }
            }
          }

          // If 2 or more months overdue, update status to pending
          if (overdueMonths >= 2) {
            console.log(`🚨 SUSPENDING: Course ${courseId} (${courseData.full_name}) for user ${user.name} - ${overdueMonths} overdue months`);

            updatedEnrollments[i] = {
              ...enrollment,
              status: 'pending',
              suspended_date: new Date().toISOString(),
              overdue_months: overdueMonths,
              last_trigger_check: new Date().toISOString(),
              reason: `Auto-suspended by admin trigger on ${currentDate.toLocaleDateString()}: ${overdueMonths} months payment overdue`
            };
            hasUpdates = true;
            userCoursesSuspended++;
            totalCoursesSuspended++;
          } else {
            // Update last trigger check date even if no suspension needed
            updatedEnrollments[i] = {
              ...enrollment,
              last_trigger_check: new Date().toISOString()
            };
            hasUpdates = true;
          }
        }

        // Update database if there are changes for this user
        if (hasUpdates) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ enrolled_courses: updatedEnrollments })
            .eq('id', user.id);

          if (updateError) {
            console.error(`❌ Error updating enrollment status for user ${user.id}:`, updateError);
          } else {
            console.log(`✅ Updated enrollment status for user ${user.name} - ${userCoursesSuspended} courses suspended`);
            if (userCoursesSuspended > 0) {
              usersWithSuspensions++;
            }
          }
        }
      }

      // Log trigger execution
      await supabase
        .from('admin_triggers')
        .insert({
          triggered_date: new Date().toISOString(),
          students_processed: totalStudentsProcessed,
          courses_suspended: totalCoursesSuspended,
          users_affected: usersWithSuspensions
        });

      console.log(`\n📋 MONTHLY TRIGGER SUMMARY:`);
      console.log(`   Students processed: ${totalStudentsProcessed}`);
      console.log(`   Courses suspended: ${totalCoursesSuspended}`);
      console.log(`   Users affected: ${usersWithSuspensions}`);

      // Show summary alert to admin
      if (totalCoursesSuspended > 0) {
        Alert.alert(
          'Monthly Payment Review Complete',
          `Payment review completed successfully!\n\n• Students processed: ${totalStudentsProcessed}\n• Courses suspended: ${totalCoursesSuspended}\n• Users affected: ${usersWithSuspensions}\n\nCourses with 2+ months overdue payments have been suspended.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Monthly Payment Review Complete',
          `Payment review completed successfully!\n\n• Students processed: ${totalStudentsProcessed}\n• No courses required suspension\n\nAll students are up to date with their payments.`,
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('❌ Error in runMonthlyOverdueCheck:', error);
      Alert.alert(
        'Error',
        'An error occurred during the monthly payment review. Please check the console for details.',
        [{ text: 'OK' }]
      );
    }
  }, [getCurrentDate, getMonthsBetween, hasTriggeredThisMonth]);

  useEffect(() => {
    fetchUserData();
    // Register push token for admin notifications
    PushTokenService.registerPushToken();
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

        // Run monthly overdue check when admin logs in
        await runMonthlyOverdueCheck();
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
              // Check if there's an active session first
              const { data: sessionData } = await supabase.auth.getSession();

              if (sessionData.session) {
                // Only attempt sign out if there's an active session
                const { error } = await supabase.auth.signOut();
                if (error) {
                  console.warn('Logout warning:', error);
                  // Don't throw error for AuthSessionMissingError
                  if (error.message.includes('Auth session missing')) {
                    console.log('No active session to sign out from');
                  } else {
                    throw error;
                  }
                }
              } else {
                console.log('No active session found, proceeding with logout');
              }

              // Always navigate to auth screen regardless of session state
              router.replace('/(auth)');
            } catch (error: any) {
              console.error('Logout error:', error);

              // Handle the specific AuthSessionMissingError
              if (error.message?.includes('Auth session missing')) {
                console.log('Session already cleared, navigating to auth');
                router.replace('/(auth)');
              } else {
                Alert.alert('Error', 'Failed to logout');
              }
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
          <View style={{
            padding: 20,
            borderTopWidth: 1,
            backgroundColor: '#111827',
            borderRadius: 8
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
                    {(userData.name && userData.name.length > 0) ? userData.name.charAt(0).toUpperCase() : 'U'}
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
                  {userData.name || 'User'}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#fefefefe'
                }} numberOfLines={1}>
                  {userData.email || 'No email'}
                </Text>
              </View>
              <SettingsIcon stroke="#fff" />
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
      </View>


    </DrawerContentScrollView>
  );
}

export default function AdminLayout() {
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
            drawerIcon: () => <HomeIcon stroke="#fff" />
          }}
        />
        <Drawer.Screen
          name="courses"
          options={{
            title: 'Manage Courses',
            drawerLabel: 'Manage Courses',
            drawerIcon: () => <CourseIcon stroke="#fff" />
          }}
        />
        <Drawer.Screen
          name="routine"
          options={{
            title: 'Routine Management',
            drawerLabel: 'Routine Management',
            drawerIcon: () => <RoutineIcon stroke="#fff" />
          }}
        />
        <Drawer.Screen
          name="liveclass"
          options={{
            title: 'Attendance Management',
            drawerLabel: 'Attendance Management',
            drawerIcon: () => <LiveIcon stroke="#fff" />
          }}
        />
        <Drawer.Screen
          name="teachers"
          options={{
            title: 'Manage Teachers',
            drawerLabel: 'Manage Teachers',
            drawerIcon: () => <TeacherIcon fill="#fff" />
          }}
        />
        <Drawer.Screen
          name="students"
          options={{
            title: 'Manage Students',
            drawerLabel: 'Manage Students',
            drawerIcon: () => <StudentsIcon fill="white" />
          }}
        />
        <Drawer.Screen
          name="test"
          options={{
            title: 'Test Management',
            drawerLabel: 'Test Management',
            drawerIcon: () => <TestSeriesIcon stroke="white" />
          }}
        />
        <Drawer.Screen
          name="coding-league"
          options={{
            title: 'Coding League',
            drawerLabel: 'Coding League',
            drawerIcon: () => <CodingLeagueIcon stroke="white" />
          }}
        />
        <Drawer.Screen
          name="result"
          options={{
            title: 'Result Management',
            drawerLabel: 'Result Management',
            drawerIcon: () => <PerformanceIcon fill="white" />
          }}
        />
        <Drawer.Screen
          name="payment"
          options={{
            title: 'Payment',
            drawerLabel: 'Payment',
            drawerIcon: () => <PaymentIcon stroke="white" />
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}