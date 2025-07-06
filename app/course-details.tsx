import FloatingActionMenu from "@/components/floating-action-menu";
import VideoUploadModal from "@/components/video-upload-modal";
import { supabase } from "@/lib/supabase";
import { getCurrentDate, getCurrentISOString } from "@/utils/testDate";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from 'expo-notifications';
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import NotifService from "../NotifService";

interface Course {
  id: string;
  codename: string;
  codename_color: string;
  full_name: string;
  full_name_color: string;
  course_type: string;
  semester: number;
  class_schedule: string;
  course_logo: string;
  course_duration: number | null;
  fees_monthly: number;
  fees_total: number | null;
  instructor: string;
  instructor_image: string | null;
  created_at: string;
  course_end?: {
    type: 'now' | 'scheduled';
    completed_date: string;
    marked_by: string;
    marked_at: string;
    status: 'completed' | 'scheduled_for_completion';
  } | null;
}

interface ClassSchedule {
  day: string;
  startTime: string;
  endTime: string;
}

interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  phone_no?: string;
  user_image?: string;
  enrolled_date?: string;
  status: 'success' | 'pending';
}

interface RecordedVideo {
  video_id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  class_notes_url?: string;
  assignment_url?: string;
  created_at: string;
  uploaded_at: string;
  scheduled_class_id?: string;
  is_from_scheduled_class: boolean;
}

const CourseDetailsPage = () => {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [screenData, setScreenData] = useState(Dimensions.get("window"));
  const [menuVisible, setMenuVisible] = useState(false);

  // Schedule editing states
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleData, setScheduleData] = useState<ClassSchedule[]>([]);

  // Enrolled students states
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [activeStudentTab, setActiveStudentTab] = useState<'success' | 'pending'>('success');
  const [showDayPicker, setShowDayPicker] = useState<number | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Course completion states
  const [showCompletionOptions, setShowCompletionOptions] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledEndDate, setScheduledEndDate] = useState<Date>(getCurrentDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [savingCompletion, setSavingCompletion] = useState(false);

  // Schedule class states
  const [showScheduleClassModal, setShowScheduleClassModal] = useState(false);
  const [showScheduledClassesModal, setShowScheduledClassesModal] = useState(false);
  const [scheduledClasses, setScheduledClasses] = useState<any[]>([]);
  const [loadingScheduledClasses, setLoadingScheduledClasses] = useState(false);
  const [classTopicName, setClassTopicName] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [classDate, setClassDate] = useState<Date>(getCurrentDate());
  const [classTime, setClassTime] = useState<Date>(getCurrentDate());
  const [showClassDatePicker, setShowClassDatePicker] = useState(false);
  const [showClassTimePicker, setShowClassTimePicker] = useState(false);
  const [savingScheduledClass, setSavingScheduledClass] = useState(false);

  // Video upload modal state
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);

  // Recorded videos state
  const [recentVideos, setRecentVideos] = useState<RecordedVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);

  // Constants for schedule editing
  const daysOfWeek = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday"
  ];

  // Parse schedule function
  const parseSchedule = (scheduleString: string) => {
    try {
      return JSON.parse(scheduleString);
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const onChange = (result: { window: any }) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener("change", onChange);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    // Request notification permissions and register push token
    const requestPermissions = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get notification permissions!');
        return;
      }

      console.log('Notification permissions granted for admin!');
      // Note: Admin doesn't register push token to avoid receiving student notifications
      // Student push tokens are managed separately through PushTokenService role checking
    };

    requestPermissions();
  }, []);

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      router.back();
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (error) {
        console.error("Error fetching course:", error);
        router.back();
        return;
      }

      setCourse(data);
    } catch (error) {
      console.error("Error in fetchCourse:", error);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const fetchEnrolledStudents = useCallback(async () => {
    if (!courseId) return;

    try {
      setStudentsLoading(true);

      // Fetch all users to check their enrolled_courses
      const { data: allUsers, error: fetchError } = await supabase
        .from("users")
        .select("id, name, email, phone_no, user_image, enrolled_courses");

      if (fetchError) {
        console.error("Error fetching users:", fetchError);
        return;
      }

      const enrolledStudentsData: EnrolledStudent[] = [];

      allUsers?.forEach(user => {
        if (user.enrolled_courses && Array.isArray(user.enrolled_courses)) {
          // Check if the user has this course enrolled
          const enrollment = user.enrolled_courses.find((enrollment: any) => {
            // Handle both old format (string) and new format (object)
            if (typeof enrollment === 'string') {
              return enrollment === courseId;
            } else if (typeof enrollment === 'object' && enrollment.course_id) {
              return enrollment.course_id === courseId;
            }
            return false;
          });

          if (enrollment) {
            let status: 'success' | 'pending' = 'success';

            // Determine status from enrollment data
            if (typeof enrollment === 'object' && enrollment.status) {
              status = enrollment.status;
            }

            enrolledStudentsData.push({
              id: user.id,
              name: user.name || 'Unknown',
              email: user.email || 'No email',
              phone_no: user.phone_no,
              user_image: user.user_image,
              status: status
            });
          }
        }
      });

      setEnrolledStudents(enrolledStudentsData);
    } catch (error) {
      console.error("Error fetching enrolled students:", error);
    } finally {
      setStudentsLoading(false);
    }
  }, [courseId]);

  const fetchRecentVideos = useCallback(async () => {
    if (!courseId) return;

    try {
      setVideosLoading(true);

      const { data, error } = await supabase
        .from("courses")
        .select("recorded_classes")
        .eq("id", courseId)
        .single();

      if (error) {
        console.error("Error fetching videos:", error);
        return;
      }

      const recordedClasses = data?.recorded_classes || [];
      // Sort by uploaded_at or created_at (newest first) and take only recent 3
      const sortedVideos = recordedClasses
        .sort((a: RecordedVideo, b: RecordedVideo) => {
          const dateA = new Date(a.uploaded_at || a.created_at);
          const dateB = new Date(b.uploaded_at || b.created_at);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 3); // Take only the 3 most recent videos

      setRecentVideos(sortedVideos);
    } catch (error) {
      console.error("Error fetching recent videos:", error);
    } finally {
      setVideosLoading(false);
    }
  }, [courseId]);

  // Function to approve pending student enrollment
  const approveStudentEnrollment = async (studentId: string, studentName: string) => {
    try {
      Alert.alert(
        "Approve Enrollment",
        `Are you sure you want to approve ${studentName}'s enrollment?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve",
            onPress: async () => {
              try {
                // Get user's current enrolled courses
                const { data: user, error: fetchError } = await supabase
                  .from("users")
                  .select("enrolled_courses")
                  .eq("id", studentId)
                  .single();

                if (fetchError) {
                  throw new Error("Failed to fetch user data");
                }

                if (!user.enrolled_courses || !Array.isArray(user.enrolled_courses)) {
                  throw new Error("Invalid enrollment data");
                }

                // Update the enrollment status to 'success'
                const updatedCourses = user.enrolled_courses.map((enrollment: any) => {
                  if (typeof enrollment === 'object' && enrollment.course_id === courseId) {
                    return { ...enrollment, status: 'success' };
                  }
                  return enrollment;
                });

                // Update the user's enrolled courses
                const { error: updateError } = await supabase
                  .from("users")
                  .update({ enrolled_courses: updatedCourses })
                  .eq("id", studentId);

                if (updateError) {
                  throw new Error("Failed to update enrollment status");
                }

                // Refresh the students list
                await fetchEnrolledStudents();

                Alert.alert("Success", `${studentName}'s enrollment has been approved!`);
              } catch (error) {
                console.error("Error approving enrollment:", error);
                Alert.alert("Error", "Failed to approve enrollment. Please try again.");
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error in approveStudentEnrollment:", error);
    }
  };

  useEffect(() => {
    fetchCourse();
    fetchEnrolledStudents();
    fetchRecentVideos();
  }, [fetchCourse, fetchEnrolledStudents, fetchRecentVideos]);

  const handleBack = () => {
    router.back();
  };

  const handleMarkAsCompleted = () => {
    setMenuVisible(false);
    setShowCompletionOptions(true);
  };

  const handleCompletionNow = async () => {
    setShowCompletionOptions(false);

    Alert.alert(
      "Mark as Completed Now",
      "Are you sure you want to mark this course as completed now?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Complete",
          onPress: async () => {
            await markCourseAsCompleted('now');
          }
        }
      ]
    );
  };

  const handleCompletionSchedule = () => {
    setShowCompletionOptions(false);
    setScheduledEndDate(getCurrentDate());
    setShowScheduleModal(true);
  };

  const markCourseAsCompleted = async (type: 'now' | 'scheduled', scheduledDate?: Date) => {
    try {
      setSavingCompletion(true);

      if (!course?.id) return;

      const completionData = {
        type,
        completed_date: type === 'now' ? getCurrentISOString() : (scheduledDate?.toISOString() || getCurrentISOString()),
        marked_by: 'admin', // You can get current admin user ID here if needed
        marked_at: getCurrentISOString(),
        status: type === 'now' ? 'completed' as const : 'scheduled_for_completion' as const
      };

      const { error } = await supabase
        .from("courses")
        .update({ course_end: completionData })
        .eq("id", course.id);

      if (error) {
        throw new Error("Failed to mark course as completed");
      }

      // Update local course data
      setCourse(prev => prev ? { ...prev, course_end: completionData } : null);

      const message = type === 'now'
        ? "Course marked as completed successfully!"
        : `Course scheduled for completion on ${scheduledDate?.toLocaleDateString()}`;

      Alert.alert("Success", message);

    } catch (error) {
      console.error("Error marking course as completed:", error);
      Alert.alert("Error", "Failed to mark course as completed. Please try again.");
    } finally {
      setSavingCompletion(false);
    }
  };

  const saveScheduledCompletion = async () => {
    await markCourseAsCompleted('scheduled', scheduledEndDate);
    setShowScheduleModal(false);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const currentTime = scheduledEndDate;
      const newDate = new Date(selectedDate);
      newDate.setHours(currentTime.getHours());
      newDate.setMinutes(currentTime.getMinutes());
      setScheduledEndDate(newDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const currentDate = scheduledEndDate;
      const newDateTime = new Date(currentDate);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setScheduledEndDate(newDateTime);
    }
  };

  const handleDelete = async () => {
    setMenuVisible(false);
    Alert.alert(
      "Delete Course",
      "Are you sure you want to delete this course? This action cannot be undone and will remove the course from all enrolled students.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!course?.id) return;

              // Show loading
              Alert.alert("Deleting", "Please wait...");

              // First, remove the course ID from all users' enrolled_courses arrays
              // Since the SQL function doesn't exist, we'll use the JavaScript approach
              console.log("Searching for users enrolled in course:", course.id);

              // Get all users who have this course in their enrolled_courses array
              const { data: allUsers, error: fetchError } = await supabase
                .from("users")
                .select("id, enrolled_courses")
                .not("enrolled_courses", "is", null);

              if (fetchError) {
                console.error("Error fetching users:", fetchError);
                throw new Error("Failed to fetch users");
              }

              console.log("Found users:", allUsers?.length || 0);

              // Filter users who have this course enrolled and update them
              const usersToUpdate = allUsers?.filter(user => {
                if (!user.enrolled_courses) return false;

                // Check if enrolled_courses is in new JSONB format
                if (Array.isArray(user.enrolled_courses) && user.enrolled_courses.length > 0) {
                  const firstItem = user.enrolled_courses[0];

                  // If it's the new format with objects containing course_id
                  if (typeof firstItem === 'object' && firstItem.course_id) {
                    return user.enrolled_courses.some((enrollment: any) =>
                      enrollment.course_id === course.id
                    );
                  }
                  // If it's the old format with just course IDs
                  else if (typeof firstItem === 'string') {
                    return user.enrolled_courses.includes(course.id);
                  }
                }

                return false;
              }) || [];

              console.log("Users with this course enrolled:", usersToUpdate.length);

              // Update each user's enrolled_courses array
              for (const user of usersToUpdate) {
                console.log(`Removing course from user ${user.id}`);

                let updatedCourses;

                // Handle new JSONB format
                if (user.enrolled_courses && user.enrolled_courses.length > 0) {
                  const firstItem = user.enrolled_courses[0];

                  if (typeof firstItem === 'object' && firstItem.course_id) {
                    // New format: filter out the enrollment object with matching course_id
                    updatedCourses = user.enrolled_courses.filter((enrollment: any) =>
                      enrollment.course_id !== course.id
                    );
                  } else {
                    // Old format: filter out the course ID
                    updatedCourses = user.enrolled_courses.filter((id: string) => id !== course.id);
                  }
                } else {
                  updatedCourses = [];
                }

                const { error: updateError } = await supabase
                  .from("users")
                  .update({ enrolled_courses: updatedCourses })
                  .eq("id", user.id);

                if (updateError) {
                  console.error(`Error updating user ${user.id}:`, updateError);
                  throw new Error(`Failed to update user ${user.id}`);
                }
              }

              // Then, delete the course from the courses table
              console.log("Deleting course from courses table");
              const { error: courseError } = await supabase
                .from("courses")
                .delete()
                .eq("id", course.id);

              if (courseError) {
                console.error("Error deleting course:", courseError);
                throw new Error("Failed to delete course");
              }

              console.log("Course deleted successfully");
              const message = usersToUpdate.length > 0
                ? `Course deleted successfully! Removed from ${usersToUpdate.length} enrolled student(s).`
                : "Course deleted successfully!";

              Alert.alert("Success", message, [
                { text: "OK", onPress: () => router.back() }
              ]);

            } catch (error) {
              console.error("Error deleting course:", error);
              Alert.alert("Error", "Failed to delete course. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleEditSchedule = () => {
    if (course) {
      setScheduleData(parseSchedule(course.class_schedule));
      setEditingSchedule(true);
      setMenuVisible(false);
    }
  };

  // Schedule editing functions
  const addSchedule = () => {
    const newSchedule: ClassSchedule = {
      day: "Sunday",
      startTime: "19:30",
      endTime: "21:30",
    };
    setScheduleData(prev => [...prev, newSchedule]);
  };

  const removeSchedule = (index: number) => {
    if (scheduleData.length > 1) {
      setScheduleData(prev => prev.filter((_, i) => i !== index));
      if (showDayPicker === index) {
        setShowDayPicker(null);
      } else if (showDayPicker !== null && showDayPicker > index) {
        setShowDayPicker(showDayPicker - 1);
      }
    }
  };

  const updateSchedule = (index: number, field: keyof ClassSchedule, value: string) => {
    setScheduleData(prev =>
      prev.map((schedule, i) =>
        i === index ? { ...schedule, [field]: value } : schedule
      )
    );
  };

  const saveSchedule = async () => {
    try {
      setSavingSchedule(true);

      if (!course?.id) return;

      const scheduleJson = JSON.stringify(scheduleData);

      const { error } = await supabase
        .from("courses")
        .update({ class_schedule: scheduleJson })
        .eq("id", course.id);

      if (error) {
        throw new Error("Failed to update schedule");
      }

      // Update local course data
      setCourse(prev => prev ? { ...prev, class_schedule: scheduleJson } : null);
      setEditingSchedule(false);

      Alert.alert("Success", "Schedule updated successfully!");

    } catch (error) {
      console.error("Error saving schedule:", error);
      Alert.alert("Error", "Failed to save schedule. Please try again.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const cancelScheduleEdit = () => {
    setEditingSchedule(false);
    setScheduleData([]);
    setShowDayPicker(null);
  };

  // Function to get the closest scheduled class day
  const getClosestScheduledDay = () => {
    const schedules = parseSchedule(course?.class_schedule || '[]');
    if (schedules.length === 0) return getCurrentDate();

    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Map day names to numbers
    const dayMap: { [key: string]: number } = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    // Get all scheduled days as numbers
    const scheduledDays = schedules.map((schedule: any) => dayMap[schedule.day]).filter((day: any) => day !== undefined);

    if (scheduledDays.length === 0) return getCurrentDate();

    // Find the next scheduled day
    let minDiff = 7;

    for (const day of scheduledDays) {
      let diff = (day - currentDayOfWeek + 7) % 7;
      if (diff === 0) diff = 7; // If today is a scheduled day, get next occurrence

      if (diff < minDiff) {
        minDiff = diff;
      }
    }

    // Calculate the date
    const closestDate = new Date(today);
    closestDate.setDate(today.getDate() + minDiff);
    return closestDate;
  };

  // Schedule class functions
  const handleScheduleClass = () => {
    setShowScheduleClassModal(true);
    // Pre-fill with closest scheduled day and time
    const closestDate = getClosestScheduledDay();
    setClassDate(closestDate);

    const schedules = parseSchedule(course?.class_schedule || '[]');
    if (schedules.length > 0) {
      const currentSchedule = schedules[0];
      const [hours, minutes] = currentSchedule.startTime.split(':');
      const prefillTime = new Date();
      prefillTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      setClassTime(prefillTime);
    }
  };

  const saveScheduledClass = async () => {
    if (!classTopicName.trim() || !meetingLink.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSavingScheduledClass(true);

      if (!course?.id) return;

      // Combine date and time
      const scheduledDateTime = new Date(classDate);
      scheduledDateTime.setHours(classTime.getHours(), classTime.getMinutes(), 0, 0);

      // Create new scheduled class object
      const newScheduledClass = {
        id: Date.now().toString(), // Simple timestamp ID like in your example
        topic: classTopicName.trim(),
        meetingLink: meetingLink.trim(),
        scheduledDateTime: scheduledDateTime.toISOString(),
        status: 'scheduled',
        createdAt: getCurrentISOString(),
        createdBy: 'admin' // You can get current admin user ID here if needed
      };

      // Get current scheduled classes
      const { data: currentCourse, error: fetchError } = await supabase
        .from('courses')
        .select('scheduled_classes')
        .eq('id', course.id)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch current course data');
      }

      // Add new class to existing scheduled classes
      const currentScheduledClasses = currentCourse.scheduled_classes || [];
      const updatedScheduledClasses = [...currentScheduledClasses, newScheduledClass];

      // Update the course in database
      const { error } = await supabase
        .from('courses')
        .update({ scheduled_classes: updatedScheduledClasses })
        .eq('id', course.id);

      if (error) {
        throw new Error('Failed to schedule class');
      }

      // Update local course data
      setCourse(prev => prev ? {
        ...prev,
        scheduled_classes: updatedScheduledClasses
      } : null);

      // Send push notifications to all enrolled students
      let notificationsSent = 0;
      try {
        const enrolledStudentsWithSuccessStatus = enrolledStudents.filter(
          student => student.status === 'success'
        );

        if (enrolledStudentsWithSuccessStatus.length > 0) {
          console.log(`Fetching push tokens for ${enrolledStudentsWithSuccessStatus.length} enrolled students...`);
          console.log('Student IDs to notify:', enrolledStudentsWithSuccessStatus.map(s => s.id));

          // Get push tokens for enrolled students with explicit role filtering
          const { data: usersWithTokens, error: tokenError } = await supabase
            .from('users')
            .select('id, name, push_token, role')
            .in('id', enrolledStudentsWithSuccessStatus.map(student => student.id))
            .not('push_token', 'is', null);

          if (tokenError) {
            console.error('Error fetching user push tokens:', tokenError);
          } else if (usersWithTokens && usersWithTokens.length > 0) {
            // Double-check that we only notify students (role = 'student' or null/undefined = default student)
            const studentUsersWithTokens = usersWithTokens.filter(user => 
              user.role === 'student' || !user.role // Default to student if no role
            );

            console.log('Total users with tokens found:', usersWithTokens.length);
            console.log('Students with tokens after role filtering:', studentUsersWithTokens.length);
            console.log('Student token samples:', studentUsersWithTokens.map(u => ({ 
              id: u.id, 
              name: u.name,
              role: u.role || 'student (default)', 
              tokenType: u.push_token?.startsWith('ExponentPushToken[') ? 'Expo' : 'FCM',
              tokenPreview: u.push_token?.substring(0, 20) + '...' 
            })));

            const validPushTokens = studentUsersWithTokens
              .map(user => user.push_token)
              .filter(token => token && (
                token.startsWith('ExponentPushToken[') || // Expo tokens
                (token.length > 50 && !token.includes(' ')) // FCM tokens (long strings without spaces)
              ));

            console.log(`Found ${validPushTokens.length} valid student push tokens`);
            console.log('Token types breakdown:', {
              expo: validPushTokens.filter(t => t.startsWith('ExponentPushToken[')).length,
              fcm: validPushTokens.filter(t => !t.startsWith('ExponentPushToken[')).length
            });

            if (validPushTokens.length > 0) {
              const notificationTitle = `New Class Scheduled - ${course.codename}`;
              const notificationBody = `${classTopicName.trim()} scheduled for ${scheduledDateTime.toLocaleDateString()} at ${scheduledDateTime.toLocaleTimeString()}`;

              console.log('Sending notifications to students with data:', {
                title: notificationTitle,
                body: notificationBody,
                studentTokenCount: validPushTokens.length,
                courseId: course.id,
                courseName: course.codename
              });

              // Send push notifications to all enrolled students' devices
              const pushResult = await NotifService.sendPushNotifications(
                validPushTokens,
                notificationTitle,
                notificationBody,
                {
                  courseId: course.id,
                  courseName: course.codename,
                  classId: newScheduledClass.id,
                  scheduledDateTime: scheduledDateTime.toISOString(),
                  type: 'class_scheduled',
                  // Navigation data for when notification is tapped
                  navigationTarget: 'batch-details',
                  targetCourseId: course.id,
                  courseFullName: course.full_name,
                  courseCodename: course.codename
                }
              );

              if (pushResult) {
                notificationsSent = validPushTokens.length;
                console.log(`✅ Push notifications sent to ${notificationsSent} student devices`);
              } else {
                console.log('❌ Failed to send push notifications');
              }
            } else {
              console.log('No valid push tokens found for enrolled students');
            }
          } else {
            console.log('No students found with push tokens');
          }
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't show error to user as the main operation (scheduling) was successful
      }

      // Reset form
      setClassTopicName('');
      setMeetingLink('');
      setClassDate(getCurrentDate());
      setClassTime(getCurrentDate());
      setShowScheduleClassModal(false);

      const enrolledCount = enrolledStudents.filter(s => s.status === 'success').length;
      let successMessage = 'Class scheduled successfully!';

      if (notificationsSent > 0) {
        successMessage = `Class scheduled successfully! Push notifications sent to ${notificationsSent} out of ${enrolledCount} enrolled students.`;
      } else if (enrolledCount > 0) {
        successMessage = `Class scheduled successfully! Note: Students need to enable notifications to receive alerts.`;
      }

      Alert.alert('Success', successMessage);

    } catch (error) {
      console.error('Error scheduling class:', error);
      Alert.alert('Error', 'Failed to schedule class. Please try again.');
    } finally {
      setSavingScheduledClass(false);
    }
  };

  const cancelScheduleClass = () => {
    setShowScheduleClassModal(false);
    setClassTopicName('');
    setMeetingLink('');
    setClassDate(getCurrentDate());
    setClassTime(getCurrentDate());
  };

  const handleManageScheduledClasses = async () => {
    setMenuVisible(false);
    setShowScheduledClassesModal(true);
    setLoadingScheduledClasses(true);

    try {
      // Fetch the current course data to get scheduled classes
      const { data: courseData, error } = await supabase
        .from('courses')
        .select('scheduled_classes')
        .eq('id', course?.id)
        .single();

      if (error) {
        console.error('Error fetching scheduled classes:', error);
        Alert.alert('Error', 'Failed to fetch scheduled classes');
        return;
      }

      const classes = courseData?.scheduled_classes || [];
      setScheduledClasses(classes);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong while fetching scheduled classes');
    } finally {
      setLoadingScheduledClasses(false);
    }
  };

  // Helper function to send notifications to enrolled students
  const sendNotificationToEnrolledStudents = async (title: string, body: string, data: any = {}) => {
    try {
      const enrolledStudentsWithSuccessStatus = enrolledStudents.filter(
        student => student.status === 'success'
      );

      if (enrolledStudentsWithSuccessStatus.length === 0) {
        console.log('No enrolled students to notify');
        return 0;
      }

      console.log(`Fetching push tokens for ${enrolledStudentsWithSuccessStatus.length} enrolled students...`);

      // Get push tokens for enrolled students with explicit role filtering
      const { data: usersWithTokens, error: tokenError } = await supabase
        .from('users')
        .select('id, name, push_token, role')
        .in('id', enrolledStudentsWithSuccessStatus.map(student => student.id))
        .not('push_token', 'is', null);

      if (tokenError) {
        console.error('Error fetching user push tokens:', tokenError);
        return 0;
      }

      if (!usersWithTokens || usersWithTokens.length === 0) {
        console.log('No students found with push tokens');
        return 0;
      }

      // Double-check that we only notify students (role = 'student' or null/undefined = default student)
      const studentUsersWithTokens = usersWithTokens.filter(user => 
        user.role === 'student' || !user.role // Default to student if no role
      );

      console.log('Students with tokens after role filtering:', studentUsersWithTokens.length);

      const validPushTokens = studentUsersWithTokens
        .map(user => user.push_token)
        .filter(token => token && (
          token.startsWith('ExponentPushToken[') || // Expo tokens
          (token.length > 50 && !token.includes(' ')) // FCM tokens (long strings without spaces)
        ));

      if (validPushTokens.length === 0) {
        console.log('No valid push tokens found for enrolled students');
        return 0;
      }

      console.log(`Found ${validPushTokens.length} valid student push tokens`);

      // Send push notifications to all enrolled students' devices
      const pushResult = await NotifService.sendPushNotifications(
        validPushTokens,
        title,
        body,
        {
          courseId: course?.id,
          courseName: course?.codename,
          ...data
        }
      );

      if (pushResult) {
        console.log(`✅ Push notifications sent to ${validPushTokens.length} student devices`);
        return validPushTokens.length;
      } else {
        console.log('❌ Failed to send push notifications');
        return 0;
      }
    } catch (error) {
      console.error('Error sending notifications to enrolled students:', error);
      return 0;
    }
  };

  const handleDeleteScheduledClass = async (classId: string) => {
    try {
      // Find the class to delete for notification details
      const classToDelete = scheduledClasses.find(cls => cls.id === classId);
      
      // Filter out the class to delete
      const updatedClasses = scheduledClasses.filter(cls => cls.id !== classId);

      // Update the database
      const { error } = await supabase
        .from('courses')
        .update({ scheduled_classes: updatedClasses })
        .eq('id', course?.id);

      if (error) {
        console.error('Error deleting scheduled class:', error);
        Alert.alert('Error', 'Failed to delete scheduled class');
        return;
      }

      // Update local state
      setScheduledClasses(updatedClasses);

      // Send notification to enrolled students about class cancellation
      if (classToDelete && course) {
        const scheduledDateTime = new Date(classToDelete.scheduledDateTime);
        const notificationTitle = `Class Cancelled - ${course.codename}`;
        const notificationBody = `The scheduled class "${classToDelete.topic}" for ${scheduledDateTime.toLocaleDateString()} at ${scheduledDateTime.toLocaleTimeString()} has been cancelled.`;
        
        try {
          const notificationsSent = await sendNotificationToEnrolledStudents(
            notificationTitle,
            notificationBody,
            {
              classId: classToDelete.id,
              scheduledDateTime: classToDelete.scheduledDateTime,
              type: 'class_cancelled',
              topic: classToDelete.topic,
              // Navigation data for when notification is tapped
              navigationTarget: 'batch-details',
              targetCourseId: course.id,
              courseName: course.full_name,
              courseCodename: course.codename
            }
          );
          
          console.log(`Class cancellation notifications sent to ${notificationsSent} students`);
        } catch (notificationError) {
          console.error('Error sending cancellation notifications:', notificationError);
        }
      }

      Alert.alert('Success', 'Scheduled class deleted successfully');
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong while deleting the class');
    }
  };

  const handleToggleClassStatus = async (classId: string) => {
    try {
      // Find the current class before updating
      const currentClass = scheduledClasses.find(cls => cls.id === classId);

      // Find the class and toggle its status
      const updatedClasses = scheduledClasses.map(cls => {
        if (cls.id === classId) {
          if (cls.status === 'scheduled') {
            return { ...cls, status: 'live' };
          } else if (cls.status === 'live') {
            return { ...cls, status: 'ended' };
          }
        }
        return cls;
      });

      // Update the database
      const { error } = await supabase
        .from('courses')
        .update({ scheduled_classes: updatedClasses })
        .eq('id', course?.id);

      if (error) {
        console.error('Error updating class status:', error);
        Alert.alert('Error', 'Failed to update class status');
        return;
      }

      // Update local state
      setScheduledClasses(updatedClasses);

      const targetClass = updatedClasses.find(cls => cls.id === classId);

      // Send notifications to enrolled students based on status change
      if (currentClass && targetClass && course) {
        try {
          let notificationTitle = '';
          let notificationBody = '';
          let notificationType = '';

          if (currentClass.status === 'scheduled' && targetClass.status === 'live') {
            // Class started
            notificationTitle = `Class Started - ${course.codename}`;
            notificationBody = `The class "${currentClass.topic}" has started! Join now: ${currentClass.meetingLink}`;
            notificationType = 'class_started';
          } else if (currentClass.status === 'live' && targetClass.status === 'ended') {
            // Class ended
            notificationTitle = `Class Ended - ${course.codename}`;
            notificationBody = `The class "${currentClass.topic}" has ended. Thank you for attending!`;
            notificationType = 'class_ended';
          }

          if (notificationTitle && notificationBody) {
            const notificationsSent = await sendNotificationToEnrolledStudents(
              notificationTitle,
              notificationBody,
              {
                classId: currentClass.id,
                scheduledDateTime: currentClass.scheduledDateTime,
                type: notificationType,
                topic: currentClass.topic,
                meetingLink: currentClass.meetingLink,
                // Navigation data for when notification is tapped
                navigationTarget: 'batch-details',
                targetCourseId: course.id,
                courseName: course.full_name,
                courseCodename: course.codename
              }
            );
            
            console.log(`Class status notifications sent to ${notificationsSent} students`);
          }
        } catch (notificationError) {
          console.error('Error sending class status notifications:', notificationError);
        }
      }

      // If starting a class, redirect to meeting link
      if (currentClass?.status === 'scheduled' && targetClass?.status === 'live') {
        Alert.alert('Success', 'Class started successfully. Opening meeting link...', [
          {
            text: 'OK',
            onPress: () => {
              if (currentClass.meetingLink) {
                Linking.openURL(currentClass.meetingLink).catch(err => {
                  console.error('Failed to open meeting link:', err);
                  Alert.alert('Error', 'Failed to open meeting link. Please copy the link manually.');
                });
              }
            }
          }
        ]);
      } else {
        const statusMessage = targetClass?.status === 'live' ? 'Class started successfully' : 'Class ended successfully';
        Alert.alert('Success', statusMessage);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong while updating class status');
    }
  };

  const onClassDateChange = (event: any, selectedDate?: Date) => {
    setShowClassDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setClassDate(selectedDate);
    }
  };

  const onClassTimeChange = (event: any, selectedTime?: Date) => {
    setShowClassTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setClassTime(selectedTime);
    }
  };

  if (loading) {
    const isSmallScreen = screenData.width < 600;

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E4064" />
        <Text style={[styles.loadingText, { fontSize: isSmallScreen ? 14 : 16 }]}>
          Loading course details...
        </Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text style={styles.errorText}>Course not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSmallScreen = screenData.width < 600;
  const isMediumScreen = screenData.width < 900;
  const isCoreCurriculum = course.course_type === "Core Curriculum";

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header with back button and menu */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButtonHeader} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
            Course Details
          </Text>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Dropdown Menu - appears under three-dot button */}
          {menuVisible && (
            <View style={styles.dropdownMenu}>
              {(!course.course_end || course.course_end.status === 'scheduled_for_completion') && (
                <>
                  <TouchableOpacity
                    style={[styles.dropdownItem, { backgroundColor: '#a9b0d4' }]}
                    onPress={handleMarkAsCompleted}
                    activeOpacity={0.8}
                  >
                    <View style={{
                      width: 28,
                      height: 28,
                      backgroundColor: '#1E3A8A',
                      borderRadius: 14,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    </View>
                    <Text style={[styles.dropdownItemText, { color: '#059669' }]}>
                      {course.course_end?.status === 'scheduled_for_completion' ? 'Update Completion' : 'Mark as Completed'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.dropdownDivider} />
                </>
              )}

              <TouchableOpacity
                style={[styles.dropdownItem, { backgroundColor: '#b6d4a9' }]}
                onPress={handleManageScheduledClasses}
                activeOpacity={0.8}
              >
                <View style={{
                  width: 28,
                  height: 28,
                  backgroundColor: '#059669',
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Ionicons name="calendar-outline" size={16} color="#fff" />
                </View>
                <Text style={[styles.dropdownItemText, { color: '#059669' }]}>Scheduled Classes</Text>
              </TouchableOpacity>

              <View style={styles.dropdownDivider} />

              <TouchableOpacity
                style={[styles.dropdownItem, { backgroundColor: '#d4a9b6' }]}
                onPress={handleDelete}
                activeOpacity={0.8}
              >
                <View style={{
                  width: 28,
                  height: 28,
                  backgroundColor: '#EF4444',
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                </View>
                <Text style={[styles.dropdownItemText, { color: "#DC2626" }]}>Delete Course</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Overlay to close dropdown when clicking outside */}
        {menuVisible && (
          <TouchableOpacity
            style={styles.dropdownOverlay}
            onPress={() => setMenuVisible(false)}
            activeOpacity={1}
          />
        )}

        {/* Course Information Section */}
        <View style={[styles.courseInfoCard, { backgroundColor: course.full_name_color }]}>
          <View style={styles.courseHeader}>
            <View style={[styles.codenameTag, { backgroundColor: course.codename_color }]}>
              <Text style={[styles.codenameText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                {course.codename}
              </Text>
            </View>
            <Ionicons
              name={isCoreCurriculum ? "school-outline" : "briefcase-outline"}
              size={isSmallScreen ? 24 : 26}
              color="black"
            />
          </View>

          <View style={styles.courseNameContainer}>
            {course.course_logo && (
              <Image
                source={{ uri: course.course_logo }}
                style={[styles.courseLogo, {
                  width: isSmallScreen ? 50 : isMediumScreen ? 55 : 60,
                  height: isSmallScreen ? 50 : isMediumScreen ? 55 : 60
                }]}
                resizeMode="contain"
              />
            )}
            <Text style={[styles.courseName, { fontSize: isSmallScreen ? 24 : isMediumScreen ? 26 : 28 }]}>
              {course.full_name}
            </Text>
          </View>

          {/* Course Completion Status */}
          {course.course_end && (
            <View style={styles.completionStatusContainer}>
              {course.course_end.type === 'now' && course.course_end.status === 'completed' ? (
                <View style={styles.completionBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={styles.completionText}>
                    Completed on {new Date(course.course_end.completed_date).toLocaleDateString()}
                  </Text>
                </View>
              ) : course.course_end.type === 'scheduled' && course.course_end.status === 'scheduled_for_completion' ? (
                <View style={[styles.completionBadge, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
                  <Text style={[styles.completionText, { color: '#1E40AF' }]}>
                    Scheduled for completion on {new Date(course.course_end.completed_date).toLocaleDateString()}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.courseMetaInfo}>
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={16} color="black" />
              <Text style={[styles.metaText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                Instructor: {course.instructor}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color="black" />
              <Text style={[styles.metaText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                Duration: {course.course_duration ? `${course.course_duration} months` : "Ongoing"}
              </Text>
            </View>

          </View>

          {/* Schedule Section - Moved outside metaRow for better layout */}
          <View style={styles.scheduleContainer}>
            <View style={styles.scheduleHeader}>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={16} color="black" />
                <Text style={[styles.metaText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                  Schedule:
                </Text>
              </View>
              <TouchableOpacity style={styles.editButton} onPress={handleEditSchedule}>
                <Ionicons name="pencil" size={14} color="#fff" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.scheduleList}>
              {parseSchedule(course.class_schedule).map((schedule: any, index: number) => (
                <View key={index} style={styles.scheduleItem}>
                  <View style={styles.dayBadge}>
                    <Text style={[styles.dayText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                      {schedule.day}
                    </Text>
                  </View>
                  <Text style={[styles.timeText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                    {schedule.startTime} - {schedule.endTime}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Course Videos Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="play-circle-outline" size={24} color="#2E4064" />
            <Text style={[styles.sectionTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
              Recent Videos ({recentVideos.length})
            </Text>
            {recentVideos.length > 0 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push({
                  pathname: '/all-videos' as any,
                  params: { courseId, courseName: course.full_name }
                })}
              >
                <Text style={styles.viewAllButtonText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>

          {videosLoading ? (
            <View style={styles.videosLoadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={[styles.loadingText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                Loading videos...
              </Text>
            </View>
          ) : recentVideos.length === 0 ? (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam-outline" size={60} color="#9CA3AF" />
              <Text style={[styles.placeholderText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                No videos uploaded yet
              </Text>
              <Text style={[styles.placeholderSubtext, { fontSize: isSmallScreen ? 12 : 14 }]}>
                Use the + button to upload your first recorded class
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.videosScrollContainer}
              style={styles.videosContainer}
            >
              {recentVideos.map((video, index) => (
                <TouchableOpacity
                  key={video.video_id}
                  style={styles.videoCard}
                  onPress={() => router.push({
                    pathname: '/all-videos' as any,
                    params: { courseId, courseName: course.full_name, videoId: video.video_id }
                  })}
                  activeOpacity={0.7}
                >
                  {/* Video Thumbnail with Play Icon */}
                  <View style={styles.videoThumbnailContainer}>
                    {video.thumbnail_url ? (
                      <Image
                        source={{ uri: video.thumbnail_url }}
                        style={styles.videoThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.videoThumbnailPlaceholder}>
                        <Ionicons name="videocam" size={32} color="#9CA3AF" />
                      </View>
                    )}

                    {/* Play Button Overlay */}
                    <View style={styles.playButtonOverlay}>
                      <View style={styles.playButton}>
                        <Ionicons name="play" size={20} color="#fff" />
                      </View>
                    </View>

                    {/* Video Duration Badge (if available) */}
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>Video</Text>
                    </View>
                  </View>

                  <View style={styles.videoCardInfo}>
                    <View style={styles.videoCardHeader}>
                      <Text style={[styles.videoCardTitle, { fontSize: isSmallScreen ? 14 : 16 }]} numberOfLines={2}>
                        {video.title}
                      </Text>
                      {video.is_from_scheduled_class && (
                        <View style={styles.scheduledVideoBadge}>
                          <Ionicons name="calendar" size={10} color="#10B981" />
                        </View>
                      )}
                    </View>

                    {video.description && (
                      <Text style={[styles.videoCardDescription, { fontSize: isSmallScreen ? 12 : 14 }]} numberOfLines={2}>
                        {video.description}
                      </Text>
                    )}

                    <View style={styles.videoCardMeta}>
                      <View style={styles.videoCardMetaItem}>
                        <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                        <Text style={[styles.videoCardMetaText, { fontSize: isSmallScreen ? 11 : 12 }]}>
                          {new Date(video.uploaded_at || video.created_at).toLocaleDateString('en-GB')}
                        </Text>
                      </View>
                      {(video.class_notes_url || video.assignment_url) && (
                        <View style={styles.videoCardResources}>
                          {video.class_notes_url && (
                            <Ionicons name="document-text" size={12} color="#10B981" />
                          )}
                          {video.assignment_url && (
                            <Ionicons name="document" size={12} color="#F59E0B" />
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Study Materials Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="library-outline" size={24} color="#2E4064" />
            <Text style={[styles.sectionTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
              Study Materials
            </Text>
          </View>

          <View style={styles.studyMaterialsGrid}>
            {/* eBooks */}
            <TouchableOpacity
              style={styles.materialCard}
              onPress={() => router.push({
                pathname: '/ebooks' as any,
                params: { courseId, courseName: course.full_name }
              })}
            >
              <View style={[styles.materialIcon, { backgroundColor: "#E3F2FD" }]}>
                <Ionicons name="book-outline" size={32} color="#1976D2" />
              </View>
              <Text style={[styles.materialTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                eBooks
              </Text>
              <Text style={[styles.materialCount, { fontSize: isSmallScreen ? 12 : 14 }]}>
                Manage eBooks
              </Text>
            </TouchableOpacity>

            {/* Notes */}
            <TouchableOpacity
              style={styles.materialCard}
              onPress={() => router.push({
                pathname: '/notes' as any,
                params: { courseId, courseName: course.full_name }
              })}
            >
              <View style={[styles.materialIcon, { backgroundColor: "#E8F5E8" }]}>
                <Ionicons name="document-text-outline" size={32} color="#388E3C" />
              </View>
              <Text style={[styles.materialTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                Notes
              </Text>
              <Text style={[styles.materialCount, { fontSize: isSmallScreen ? 12 : 14 }]}>
                Manage Notes
              </Text>
            </TouchableOpacity>

            {/* Sample Question Set - Only for Core Curriculum */}
            {isCoreCurriculum && (
              <TouchableOpacity
                style={styles.materialCard}
                onPress={() => router.push({
                  pathname: '/sample-questions' as any,
                  params: { courseId, courseName: course.full_name }
                })}
              >
                <View style={[styles.materialIcon, { backgroundColor: "#FFF3E0" }]}>
                  <Ionicons name="help-circle-outline" size={32} color="#F57C00" />
                </View>
                <Text style={[styles.materialTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                  Sample Questions
                </Text>
                <Text style={[styles.materialCount, { fontSize: isSmallScreen ? 12 : 14 }]}>
                  Manage Questions
                </Text>
              </TouchableOpacity>
            )}

            {/* Previous Year Questions - Only for Core Curriculum */}
            {isCoreCurriculum && (
              <TouchableOpacity
                style={styles.materialCard}
                onPress={() => router.push({
                  pathname: '/previous-year-questions' as any,
                  params: { courseId, courseName: course.full_name }
                })}
              >
                <View style={[styles.materialIcon, { backgroundColor: "#FCE4EC" }]}>
                  <Ionicons name="archive-outline" size={32} color="#C2185B" />
                </View>
                <Text style={[styles.materialTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                  Previous Year Questions
                </Text>
                <Text style={[styles.materialCount, { fontSize: isSmallScreen ? 12 : 14 }]}>
                  Manage PYQs
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!isCoreCurriculum && (
            <View style={styles.limitedMaterialsNote}>
              <Ionicons name="information-circle-outline" size={20} color="#9CA3AF" />
              <Text style={[styles.noteText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                Additional materials (Sample Questions & PYQs) are available only for Core Curriculum courses
              </Text>
            </View>
          )}
        </View>

        {/* Enrolled Students Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={24} color="#2E4064" />
            <Text style={[styles.sectionTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
              Enrolled Students ({enrolledStudents.length})
            </Text>
          </View>

          {/* Student Status Tabs */}
          <View style={styles.studentTabContainer}>
            <TouchableOpacity
              style={[
                styles.studentTab,
                activeStudentTab === 'success' && styles.activeStudentTab
              ]}
              onPress={() => setActiveStudentTab('success')}
            >
              <Text style={[
                styles.studentTabText,
                activeStudentTab === 'success' && styles.activeStudentTabText,
                { fontSize: isSmallScreen ? 14 : 16 }
              ]}>
                Enrolled ({enrolledStudents.filter(s => s.status === 'success').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.studentTab,
                activeStudentTab === 'pending' && styles.activeStudentTab
              ]}
              onPress={() => setActiveStudentTab('pending')}
            >
              <Text style={[
                styles.studentTabText,
                activeStudentTab === 'pending' && styles.activeStudentTabText,
                { fontSize: isSmallScreen ? 14 : 16 }
              ]}>
                Pending ({enrolledStudents.filter(s => s.status === 'pending').length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Students List */}
          {studentsLoading ? (
            <View style={styles.studentsContainer}>
              <ActivityIndicator size="large" color="#2E4064" />
              <Text style={[styles.loadingText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                Loading students...
              </Text>
            </View>
          ) : (
            <View style={styles.studentsList}>
              {enrolledStudents
                .filter(student => student.status === activeStudentTab)
                .map((student, index) => (
                  <View key={student.id} style={[
                    styles.studentCard,
                    {
                      flexDirection: isSmallScreen ? 'column' : 'row',
                      alignItems: isSmallScreen ? 'stretch' : 'center',
                      minHeight: isSmallScreen ? 85 : 70,
                      padding: isSmallScreen ? 12 : 14,
                    }
                  ]}>
                    <View style={[
                      styles.studentInfo,
                      {
                        marginRight: isSmallScreen ? 0 : 12,
                        marginBottom: isSmallScreen ? 10 : 0,
                      }
                    ]}>
                      {/* Student Avatar or Image */}
                      <View style={[
                        styles.studentAvatarContainer,
                        {
                          width: isSmallScreen ? 36 : 42,
                          height: isSmallScreen ? 36 : 42,
                          borderRadius: isSmallScreen ? 18 : 21,
                          marginRight: isSmallScreen ? 10 : 14,
                        }
                      ]}>
                        {student.user_image ? (
                          <Image
                            source={{ uri: student.user_image }}
                            style={[
                              styles.studentImage,
                              {
                                width: isSmallScreen ? 36 : 42,
                                height: isSmallScreen ? 36 : 42,
                                borderRadius: isSmallScreen ? 18 : 21,
                              }
                            ]}
                            defaultSource={{ uri: 'https://via.placeholder.com/42x42/10B981/FFFFFF?text=' + student.name.charAt(0).toUpperCase() }}
                          />
                        ) : (
                          <View style={[
                            styles.studentAvatar,
                            {
                              backgroundColor: activeStudentTab === 'success' ? '#10B981' : '#F59E0B',
                              width: isSmallScreen ? 36 : 42,
                              height: isSmallScreen ? 36 : 42,
                              borderRadius: isSmallScreen ? 18 : 21,
                            }
                          ]}>
                            <Text style={[
                              styles.studentInitial,
                              { fontSize: isSmallScreen ? 14 : 16 }
                            ]}>
                              {student.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.studentDetails}>
                        <Text style={[styles.studentName, { fontSize: isSmallScreen ? 13 : 15 }]}>
                          {student.name}
                        </Text>
                        <Text style={[styles.studentEmail, { fontSize: isSmallScreen ? 11 : 13 }]}>
                          {student.email}
                        </Text>
                        {student.phone_no && (
                          <Text style={[styles.studentPhone, { fontSize: isSmallScreen ? 11 : 13 }]}>
                            {student.phone_no}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={[
                      styles.studentActions,
                      {
                        flexDirection: isSmallScreen ? 'row' : 'column',
                        alignItems: isSmallScreen ? 'flex-end' : 'center',
                        gap: isSmallScreen ? 8 : 6,
                      }
                    ]}>
                      {/* Status Badge */}
                      <View style={[
                        styles.studentStatus,
                        {
                          backgroundColor: activeStudentTab === 'success' ? '#D1FAE5' : '#FEF3C7',
                          minWidth: isSmallScreen ? 65 : 75,
                          paddingHorizontal: isSmallScreen ? 8 : 10,
                          paddingVertical: isSmallScreen ? 4 : 6,
                        }
                      ]}>
                        <Text style={[
                          styles.studentStatusText,
                          {
                            color: activeStudentTab === 'success' ? '#065F46' : '#92400E',
                            fontSize: isSmallScreen ? 11 : 13
                          }
                        ]}>
                          {activeStudentTab === 'success' ? 'Enrolled' : 'Pending'}
                        </Text>
                      </View>

                      {/* Approve Button for Pending Students */}
                      {activeStudentTab === 'pending' && (
                        <TouchableOpacity
                          style={[
                            styles.approveButton,
                            {
                              paddingHorizontal: isSmallScreen ? 8 : 10,
                              paddingVertical: isSmallScreen ? 4 : 6,
                            }
                          ]}
                          onPress={() => approveStudentEnrollment(student.id, student.name)}
                        >
                          <Ionicons name="checkmark" size={isSmallScreen ? 14 : 16} color="#fff" />
                          <Text style={[
                            styles.approveButtonText,
                            { fontSize: isSmallScreen ? 11 : 13 }
                          ]}>
                            Approve
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              }

              {enrolledStudents.filter(student => student.status === activeStudentTab).length === 0 && (
                <View style={styles.emptyStudentsContainer}>
                  <Ionicons
                    name={activeStudentTab === 'success' ? "people-outline" : "time-outline"}
                    size={48}
                    color="#9CA3AF"
                  />
                  <Text style={[styles.emptyStudentsText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                    {activeStudentTab === 'success'
                      ? 'No enrolled students yet'
                      : 'No pending enrollments'
                    }
                  </Text>
                  <Text style={[styles.emptyStudentsSubText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                    {activeStudentTab === 'success'
                      ? 'Students will appear here once they enroll and payments are approved'
                      : 'Pending enrollments will appear here'
                    }
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Schedule Editing Modal */}
        <Modal
          visible={editingSchedule}
          animationType="slide"
          transparent
          onRequestClose={cancelScheduleEdit}
        >
          <View style={scheduleStyles.modalOverlay}>
            <View style={[
              scheduleStyles.modalContent,
              {
                maxWidth: screenData.width < 400 ? screenData.width - 32 : 500,
                width: screenData.width < 400 ? "95%" : "90%",
              }
            ]}>
              {/* Header */}
              <View style={scheduleStyles.header}>
                <Text style={[
                  scheduleStyles.modalTitle,
                  { fontSize: screenData.width < 400 ? 18 : 20 }
                ]}>Edit Schedule</Text>
                <TouchableOpacity
                  style={[
                    scheduleStyles.closeButton,
                    {
                      width: screenData.width < 400 ? 32 : 36,
                      height: screenData.width < 400 ? 32 : 36,
                      borderRadius: screenData.width < 400 ? 16 : 18,
                    }
                  ]}
                  onPress={cancelScheduleEdit}
                >
                  <Text style={[
                    scheduleStyles.closeButtonText,
                    { fontSize: screenData.width < 400 ? 18 : 20 }
                  ]}>×</Text>
                </TouchableOpacity>
              </View>

              {/* Schedule List with proper scrolling */}
              <ScrollView
                style={scheduleStyles.scheduleContainer}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{
                  paddingBottom: screenData.width < 300 ? 180 : 220,
                  paddingHorizontal: screenData.width < 400 ? 16 : 20
                }}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {scheduleData.map((schedule, index) => (
                  <View key={index} style={[
                    scheduleStyles.scheduleItem,
                    {
                      padding: screenData.width < 400 ? 16 : 20,
                      marginBottom: screenData.width < 400 ? 16 : 20,
                      zIndex: showDayPicker === index ? 9998 : 1,
                      elevation: showDayPicker === index ? 18 : 2,
                    }
                  ]}>
                    {scheduleData.length > 1 && (
                      <TouchableOpacity
                        style={[
                          scheduleStyles.removeButton,
                          {
                            width: screenData.width < 400 ? 24 : 28,
                            height: screenData.width < 400 ? 24 : 28,
                            borderRadius: screenData.width < 400 ? 12 : 14,
                            top: screenData.width < 400 ? 8 : 12,
                            right: screenData.width < 400 ? 8 : 12,
                          }
                        ]}
                        onPress={() => removeSchedule(index)}
                      >
                        <Text style={[
                          scheduleStyles.removeButtonText,
                          { fontSize: screenData.width < 400 ? 14 : 16 }
                        ]}>×</Text>
                      </TouchableOpacity>
                    )}

                    {/* Day Picker */}
                    <View style={[
                      scheduleStyles.inputGroup,
                      { marginBottom: screenData.width < 400 ? 16 : 20 }
                    ]}>
                      <Text style={[
                        scheduleStyles.label,
                        {
                          fontSize: screenData.width < 400 ? 14 : 15,
                          marginBottom: screenData.width < 400 ? 6 : 8
                        }
                      ]}>Day</Text>
                      <View style={scheduleStyles.dayDropdownWrapper}>
                        <TouchableOpacity
                          style={[
                            scheduleStyles.dayButton,
                            showDayPicker === index && scheduleStyles.dayButtonActive,
                            {
                              padding: screenData.width < 400 ? 12 : 16,
                            }
                          ]}
                          onPress={() => setShowDayPicker(showDayPicker === index ? null : index)}
                        >
                          <Text style={[
                            scheduleStyles.dayText,
                            { fontSize: screenData.width < 400 ? 15 : 16 }
                          ]}>{schedule.day}</Text>
                          <Text style={[
                            scheduleStyles.dropdownArrow,
                            showDayPicker === index && scheduleStyles.dropdownArrowRotated,
                            { fontSize: screenData.width < 400 ? 12 : 14 }
                          ]}>▼</Text>
                        </TouchableOpacity>

                        {showDayPicker === index && (
                          <View style={[
                            scheduleStyles.dayDropdownContainer,
                            {
                              marginTop: screenData.width < 400 ? 6 : 8,
                              paddingVertical: screenData.width < 400 ? 8 : 12,
                            }
                          ]}>
                            {daysOfWeek.map((day) => (
                              <TouchableOpacity
                                key={day}
                                style={[
                                  scheduleStyles.dayDropdownItem,
                                  schedule.day === day && scheduleStyles.selectedDayDropdownItem,
                                  day === daysOfWeek[daysOfWeek.length - 1] && scheduleStyles.lastDayDropdownItem,
                                  {
                                    paddingHorizontal: screenData.width < 400 ? 16 : 20,
                                    paddingVertical: screenData.width < 400 ? 12 : 14,
                                  }
                                ]}
                                onPress={() => {
                                  updateSchedule(index, "day", day);
                                  setShowDayPicker(null);
                                }}
                              >
                                <Text style={[
                                  scheduleStyles.dayDropdownItemText,
                                  schedule.day === day && scheduleStyles.selectedDayDropdownItemText,
                                  { fontSize: screenData.width < 400 ? 15 : 16 }
                                ]}>
                                  {day}
                                </Text>
                                {schedule.day === day && (
                                  <Text style={[
                                    scheduleStyles.checkmark,
                                    { fontSize: screenData.width < 400 ? 16 : 18 }
                                  ]}>✓</Text>
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Time Inputs */}
                    <View style={[
                      scheduleStyles.timeRow,
                      {
                        gap: screenData.width < 400 ? 12 : 16,
                        marginTop: screenData.width < 400 ? 2 : 4,
                      }
                    ]}>
                      <View style={scheduleStyles.timeInput}>
                        <Text style={[
                          scheduleStyles.label,
                          {
                            fontSize: screenData.width < 400 ? 14 : 15,
                            marginBottom: screenData.width < 400 ? 6 : 8
                          }
                        ]}>Start Time</Text>
                        <TouchableOpacity
                          style={[
                            scheduleStyles.timeButton,
                            {
                              padding: screenData.width < 400 ? 12 : 16,
                            }
                          ]}
                          onPress={() => {
                            // For simplicity, let's use a prompt for time input
                            Alert.prompt(
                              "Start Time",
                              "Enter start time (HH:MM)",
                              (text) => {
                                if (text && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(text)) {
                                  updateSchedule(index, "startTime", text);
                                } else {
                                  Alert.alert("Invalid format", "Please use HH:MM format (24-hour)");
                                }
                              },
                              "plain-text",
                              schedule.startTime
                            );
                          }}
                        >
                          <Text style={[
                            scheduleStyles.timeText,
                            { fontSize: screenData.width < 400 ? 15 : 16 }
                          ]}>{schedule.startTime}</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={scheduleStyles.timeInput}>
                        <Text style={[
                          scheduleStyles.label,
                          {
                            fontSize: screenData.width < 400 ? 14 : 15,
                            marginBottom: screenData.width < 400 ? 6 : 8
                          }
                        ]}>End Time</Text>
                        <TouchableOpacity
                          style={[
                            scheduleStyles.timeButton,
                            {
                              padding: screenData.width < 400 ? 12 : 16,
                            }
                          ]}
                          onPress={() => {
                            Alert.prompt(
                              "End Time",
                              "Enter end time (HH:MM)",
                              (text) => {
                                if (text && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(text)) {
                                  updateSchedule(index, "endTime", text);
                                } else {
                                  Alert.alert("Invalid format", "Please use HH:MM format (24-hour)");
                                }
                              },
                              "plain-text",
                              schedule.endTime
                            );
                          }}
                        >
                          <Text style={[
                            scheduleStyles.timeText,
                            { fontSize: screenData.width < 400 ? 15 : 16 }
                          ]}>{schedule.endTime}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Add Schedule Button */}
                <TouchableOpacity
                  style={[
                    scheduleStyles.addButton,
                    {
                      padding: screenData.width < 400 ? 16 : 20,
                      marginTop: screenData.width < 400 ? 8 : 12,
                      marginBottom: screenData.width < 400 ? 16 : 20,
                    }
                  ]}
                  onPress={addSchedule}
                >
                  <Text style={[
                    scheduleStyles.addButtonText,
                    { fontSize: screenData.width < 400 ? 15 : 16 }
                  ]}>+ Add Schedule</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Action Buttons */}
              <View style={[
                scheduleStyles.actionButtons,
                {
                  padding: screenData.width < 400 ? 16 : 20,
                  gap: screenData.width < 400 ? 12 : 16,
                }
              ]}>
                <TouchableOpacity
                  style={[
                    scheduleStyles.cancelButton,
                    {
                      paddingVertical: screenData.width < 400 ? 14 : 16,
                    }
                  ]}
                  onPress={cancelScheduleEdit}
                >
                  <Text style={[
                    scheduleStyles.cancelButtonText,
                    { fontSize: screenData.width < 400 ? 15 : 16 }
                  ]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    scheduleStyles.saveButton,
                    savingSchedule && scheduleStyles.disabledButton,
                    {
                      paddingVertical: screenData.width < 400 ? 14 : 16,
                    }
                  ]}
                  onPress={saveSchedule}
                  disabled={savingSchedule}
                >
                  <Text style={[
                    scheduleStyles.saveButtonText,
                    { fontSize: screenData.width < 400 ? 15 : 16 }
                  ]}>
                    {savingSchedule ? "Saving..." : "Save Changes"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Course Completion Options Modal */}
        <Modal
          visible={showCompletionOptions}
          animationType="fade"
          transparent
          onRequestClose={() => setShowCompletionOptions(false)}
        >
          <View style={completionStyles.modalOverlay}>
            <View style={[
              completionStyles.optionsModal,
              {
                maxWidth: screenData.width < 400 ? screenData.width - 40 : 420,
                padding: screenData.width < 400 ? 20 : 28,
              }
            ]}>
              {/* Header with Icon */}
              <View style={{ alignItems: 'center', marginBottom: screenData.width < 400 ? 20 : 24 }}>
                <View style={{
                  width: screenData.width < 400 ? 56 : 64,
                  height: screenData.width < 400 ? 56 : 64,
                  backgroundColor: '#1E3A8A',
                  borderRadius: screenData.width < 400 ? 28 : 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16,
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                  borderWidth: 2,
                  borderColor: '#3B82F6',
                }}>
                  <Ionicons name="checkmark-circle" size={screenData.width < 400 ? 28 : 32} color="#3B82F6" />
                </View>
                <Text style={[
                  completionStyles.optionsTitle,
                  {
                    fontSize: screenData.width < 400 ? 20 : 24,
                    textAlign: 'center',
                  }
                ]}>Mark Course as Completed</Text>
                <Text style={[
                  completionStyles.optionsSubtitle,
                  {
                    fontSize: screenData.width < 400 ? 14 : 16,
                    textAlign: 'center',
                  }
                ]}>Choose when to mark this course as completed</Text>
              </View>

              <TouchableOpacity
                style={[completionStyles.optionButton, {
                  borderColor: '#065F46',
                  backgroundColor: '#064E3B',
                  padding: screenData.width < 400 ? 16 : 20,
                }]}
                onPress={handleCompletionNow}
                activeOpacity={0.7}
              >
                <View style={{
                  width: screenData.width < 400 ? 44 : 48,
                  height: screenData.width < 400 ? 44 : 48,
                  backgroundColor: '#10B981',
                  borderRadius: screenData.width < 400 ? 22 : 24,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Ionicons name="checkmark-circle" size={screenData.width < 400 ? 20 : 24} color="#fff" />
                </View>
                <View style={[completionStyles.optionContent, { marginLeft: screenData.width < 400 ? 16 : 20 }]}>
                  <Text style={[
                    completionStyles.optionTitle,
                    { fontSize: screenData.width < 400 ? 16 : 18 }
                  ]}>Complete Now</Text>
                  <Text style={[
                    completionStyles.optionDescription,
                    { fontSize: screenData.width < 400 ? 13 : 15 }
                  ]}>Mark as completed immediately and finalize the course</Text>
                </View>
                <Ionicons name="chevron-forward" size={screenData.width < 400 ? 18 : 20} color="#10B981" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[completionStyles.optionButton, {
                  borderColor: '#1E3A8A',
                  backgroundColor: '#1E40AF',
                  padding: screenData.width < 400 ? 16 : 20,
                }]}
                onPress={handleCompletionSchedule}
                activeOpacity={0.7}
              >
                <View style={{
                  width: screenData.width < 400 ? 44 : 48,
                  height: screenData.width < 400 ? 44 : 48,
                  backgroundColor: '#3B82F6',
                  borderRadius: screenData.width < 400 ? 22 : 24,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Ionicons name="calendar" size={screenData.width < 400 ? 20 : 24} color="#fff" />
                </View>
                <View style={[completionStyles.optionContent, { marginLeft: screenData.width < 400 ? 16 : 20 }]}>
                  <Text style={[
                    completionStyles.optionTitle,
                    { fontSize: screenData.width < 400 ? 16 : 18 }
                  ]}>Schedule Completion</Text>
                  <Text style={[
                    completionStyles.optionDescription,
                    { fontSize: screenData.width < 400 ? 13 : 15 }
                  ]}>Set a future date and time for course completion</Text>
                </View>
                <Ionicons name="chevron-forward" size={screenData.width < 400 ? 18 : 20} color="#3B82F6" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  completionStyles.cancelButton,
                  {
                    padding: screenData.width < 400 ? 14 : 18,
                    marginTop: screenData.width < 400 ? 8 : 12,
                  }
                ]}
                onPress={() => setShowCompletionOptions(false)}
                activeOpacity={0.7}
              >
                <Text style={[
                  completionStyles.cancelButtonText,
                  { fontSize: screenData.width < 400 ? 15 : 17 }
                ]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Schedule Completion Modal */}
        <Modal
          visible={showScheduleModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowScheduleModal(false)}
        >
          <View style={completionStyles.modalOverlay}>
            <View style={[
              completionStyles.scheduleModal,
              {
                maxWidth: screenData.width < 400 ? screenData.width - 20 : 520,
                margin: screenData.width < 400 ? 10 : 20,
              }
            ]}>
              <View style={[
                completionStyles.header,
                {
                  padding: screenData.width < 400 ? 16 : 20,
                  paddingRight: screenData.width < 400 ? 12 : 16,
                }
              ]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={{
                    width: screenData.width < 400 ? 28 : 32,
                    height: screenData.width < 400 ? 28 : 32,
                    backgroundColor: '#3B82F6',
                    borderRadius: screenData.width < 400 ? 14 : 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: screenData.width < 400 ? 8 : 12,
                  }}>
                    <Ionicons name="calendar" size={screenData.width < 400 ? 16 : 18} color="#fff" />
                  </View>
                  <Text style={[
                    completionStyles.modalTitle,
                    {
                      fontSize: screenData.width < 400 ? 16 : 18,
                      lineHeight: screenData.width < 400 ? 20 : 24,
                    }
                  ]} numberOfLines={2}>Schedule Course Completion</Text>
                </View>
                <TouchableOpacity
                  style={[
                    completionStyles.closeButton,
                    {
                      width: screenData.width < 400 ? 36 : 40,
                      height: screenData.width < 400 ? 36 : 40,
                      borderRadius: screenData.width < 400 ? 18 : 20,
                    }
                  ]}
                  onPress={() => setShowScheduleModal(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={screenData.width < 400 ? 18 : 20} color="#D1D5DB" />
                </TouchableOpacity>
              </View>

              <View style={[
                completionStyles.scheduleContent,
                { padding: screenData.width < 400 ? 16 : 24 }
              ]}>
                <Text style={[
                  completionStyles.sectionTitle,
                  { fontSize: screenData.width < 400 ? 16 : 18 }
                ]}>Select Completion Date & Time</Text>

                {/* Date Selection */}
                <View style={[
                  completionStyles.dateTimeContainer,
                  {
                    flexDirection: screenData.width < 400 ? "column" : "row",
                    gap: screenData.width < 400 ? 12 : 16,
                  }
                ]}>
                  <TouchableOpacity
                    style={[completionStyles.dateTimeButton, {
                      borderColor: '#1E40AF',
                      backgroundColor: '#1E3A8A',
                      flex: screenData.width < 400 ? 0 : 1,
                    }]}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <View style={{
                      width: 32,
                      height: 32,
                      backgroundColor: '#3B82F6',
                      borderRadius: 16,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Ionicons name="calendar-outline" size={16} color="#fff" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{
                        fontSize: 12,
                        color: '#9CA3AF',
                        fontWeight: '500',
                        marginBottom: 4
                      }}>
                        Date
                      </Text>
                      <Text style={[
                        completionStyles.dateTimeText,
                        { fontSize: screenData.width < 400 ? 14 : 15 }
                      ]}>
                        {scheduledEndDate.toLocaleDateString('en-US', {
                          weekday: screenData.width < 400 ? undefined : 'short',
                          month: 'short',
                          day: 'numeric',
                          year: screenData.width < 400 ? '2-digit' : 'numeric'
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[completionStyles.dateTimeButton, {
                      borderColor: '#1E40AF',
                      backgroundColor: '#1E3A8A',
                      flex: screenData.width < 400 ? 0 : 1,
                    }]}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.8}
                  >
                    <View style={{
                      width: 32,
                      height: 32,
                      backgroundColor: '#3B82F6',
                      borderRadius: 16,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Ionicons name="time-outline" size={16} color="#fff" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{
                        fontSize: 12,
                        color: '#9CA3AF',
                        fontWeight: '500',
                        marginBottom: 4
                      }}>
                        Time
                      </Text>
                      <Text style={[
                        completionStyles.dateTimeText,
                        { fontSize: screenData.width < 400 ? 14 : 15 }
                      ]}>
                        {scheduledEndDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Course End Info */}
                <View style={completionStyles.infoContainer}>
                  <View style={{
                    width: 28,
                    height: 28,
                    backgroundColor: '#3B82F6',
                    borderRadius: 14,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 2,
                  }}>
                    <Ionicons name="information" size={16} color="#fff" />
                  </View>
                  <Text style={[
                    completionStyles.infoText,
                    { fontSize: screenData.width < 400 ? 14 : 15 }
                  ]}>
                    The course will be automatically marked as completed on the selected date and time.
                    This action will be recorded in the course&apos;s completion history and cannot be undone.
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={[
                completionStyles.actionButtons,
                {
                  padding: screenData.width < 400 ? 16 : 24,
                  gap: screenData.width < 400 ? 12 : 16,
                }
              ]}>
                <TouchableOpacity
                  style={[
                    completionStyles.cancelActionButton,
                    { padding: screenData.width < 400 ? 14 : 18 }
                  ]}
                  onPress={() => setShowScheduleModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    completionStyles.cancelActionButtonText,
                    { fontSize: screenData.width < 400 ? 14 : 16 }
                  ]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    completionStyles.saveActionButton,
                    savingCompletion && completionStyles.disabledButton,
                    { padding: screenData.width < 400 ? 14 : 18 }
                  ]}
                  onPress={saveScheduledCompletion}
                  disabled={savingCompletion}
                  activeOpacity={0.8}
                >
                  {savingCompletion ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                      <Text style={[
                        completionStyles.saveActionButtonText,
                        { fontSize: screenData.width < 400 ? 14 : 16 }
                      ]}>Scheduling...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="checkmark-circle" size={screenData.width < 400 ? 16 : 18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={[
                        completionStyles.saveActionButtonText,
                        { fontSize: screenData.width < 400 ? 14 : 16 }
                      ]}>Schedule Completion</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Date and Time Pickers */}
              {showDatePicker && (
                <DateTimePicker
                  value={scheduledEndDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={getCurrentDate()}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={scheduledEndDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Schedule Class Modal */}
        <Modal
          visible={showScheduleClassModal}
          animationType="slide"
          transparent
          onRequestClose={cancelScheduleClass}
        >
          <View style={scheduleClassStyles.modalOverlay}>
            <View style={[
              scheduleClassStyles.modalContent,
              {
                maxWidth: screenData.width < 400 ? screenData.width - 32 : 500,
                width: screenData.width < 400 ? "95%" : "90%",
              }
            ]}>
              {/* Header */}
              <View style={scheduleClassStyles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    scheduleClassStyles.modalTitle,
                    { fontSize: screenData.width < 400 ? 20 : 24 }
                  ]}>Schedule a Class</Text>
                  <Text style={{
                    color: '#9CA3AF',
                    fontSize: screenData.width < 400 ? 13 : 14,
                    marginTop: 4,
                    fontWeight: '500',
                  }}>Create a new live session for your students</Text>
                </View>
                <TouchableOpacity
                  style={[
                    scheduleClassStyles.closeButton,
                    {
                      width: screenData.width < 400 ? 32 : 36,
                      height: screenData.width < 400 ? 32 : 36,
                      borderRadius: screenData.width < 400 ? 16 : 18,
                    }
                  ]}
                  onPress={cancelScheduleClass}
                >
                  <Text style={[
                    scheduleClassStyles.closeButtonText,
                    { fontSize: screenData.width < 400 ? 18 : 20 }
                  ]}>×</Text>
                </TouchableOpacity>
              </View>

              {/* Form Content */}
              <ScrollView
                style={scheduleClassStyles.formContainer}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{
                  paddingHorizontal: screenData.width < 400 ? 16 : 20
                }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Topic Name */}
                <View style={scheduleClassStyles.inputGroup}>
                  <Text style={[
                    scheduleClassStyles.label,
                    { fontSize: screenData.width < 400 ? 14 : 15 }
                  ]}>Topic Name *</Text>
                  <TextInput
                    style={[
                      scheduleClassStyles.textInput,
                      { fontSize: screenData.width < 400 ? 15 : 16 }
                    ]}
                    value={classTopicName}
                    onChangeText={setClassTopicName}
                    placeholder="Enter class topic"
                    placeholderTextColor="#6B7280"
                  />
                </View>

                {/* Meeting Link */}
                <View style={scheduleClassStyles.inputGroup}>
                  <Text style={[
                    scheduleClassStyles.label,
                    { fontSize: screenData.width < 400 ? 14 : 15 }
                  ]}>Meeting Link *</Text>
                  <TextInput
                    style={[
                      scheduleClassStyles.textInput,
                      { fontSize: screenData.width < 400 ? 15 : 16 }
                    ]}
                    value={meetingLink}
                    onChangeText={setMeetingLink}
                    placeholder="Enter meeting link (Google Meet, Zoom, etc.)"
                    placeholderTextColor="#6B7280"
                    autoCapitalize="none"
                  />
                </View>

                {/* Date & Time Selection Row */}
                <View style={scheduleClassStyles.inputGroup}>
                  <Text style={[
                    scheduleClassStyles.label,
                    { fontSize: screenData.width < 400 ? 14 : 15 }
                  ]}>Schedule Date & Time *</Text>

                  <View style={scheduleClassStyles.dateTimeRow}>
                    {/* Date Selection */}
                    <TouchableOpacity
                      style={[scheduleClassStyles.dateTimeButton, { flex: 1.2, marginRight: 12 }]}
                      onPress={() => setShowClassDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
                      <Text style={[
                        scheduleClassStyles.dateTimeText,
                        { fontSize: screenData.width < 400 ? 14 : 15 }
                      ]}>
                        {classDate.toLocaleDateString('en-GB')}
                      </Text>
                    </TouchableOpacity>

                    {/* Time Selection */}
                    <TouchableOpacity
                      style={[scheduleClassStyles.dateTimeButton, { flex: 1 }]}
                      onPress={() => setShowClassTimePicker(true)}
                    >
                      <Ionicons name="time-outline" size={18} color="#9CA3AF" />
                      <Text style={[
                        scheduleClassStyles.dateTimeText,
                        { fontSize: screenData.width < 400 ? 14 : 15 }
                      ]}>
                        {classTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={[
                scheduleClassStyles.actionButtons,
                {
                  padding: screenData.width < 400 ? 16 : 20,
                  gap: screenData.width < 400 ? 12 : 16,
                }
              ]}>
                <TouchableOpacity
                  style={[
                    scheduleClassStyles.cancelButton,
                    {
                      paddingVertical: screenData.width < 400 ? 14 : 16,
                    }
                  ]}
                  onPress={cancelScheduleClass}
                >
                  <Text style={[
                    scheduleClassStyles.cancelButtonText,
                    { fontSize: screenData.width < 400 ? 15 : 16 }
                  ]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    scheduleClassStyles.saveButton,
                    savingScheduledClass && scheduleClassStyles.disabledButton,
                    {
                      paddingVertical: screenData.width < 400 ? 14 : 16,
                    }
                  ]}
                  onPress={saveScheduledClass}
                  disabled={savingScheduledClass}
                >
                  <Text style={[
                    scheduleClassStyles.saveButtonText,
                    { fontSize: screenData.width < 400 ? 15 : 16 }
                  ]}>
                    {savingScheduledClass ? "Scheduling..." : "Schedule Class"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Date/Time Pickers */}
              {showClassDatePicker && (
                <DateTimePicker
                  value={classDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onClassDateChange}
                  minimumDate={new Date()}
                />
              )}

              {showClassTimePicker && (
                <DateTimePicker
                  value={classTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onClassTimeChange}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Scheduled Classes Management Modal */}
        <Modal
          visible={showScheduledClassesModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowScheduledClassesModal(false)}
        >
          <View style={scheduleClassStyles.modalOverlay}>
            <View style={[
              scheduleClassStyles.modalContent,
              {
                maxWidth: screenData.width < 400 ? screenData.width - 32 : 500,
                width: screenData.width < 400 ? "95%" : "90%",
              }
            ]}>
              {/* Header */}
              <View style={scheduleClassStyles.header}>
                <Text style={[
                  scheduleClassStyles.modalTitle,
                  { fontSize: screenData.width < 400 ? 18 : 20 }
                ]}>Scheduled Classes</Text>
                <TouchableOpacity
                  style={[
                    scheduleClassStyles.closeButton,
                    {
                      width: screenData.width < 400 ? 32 : 36,
                      height: screenData.width < 400 ? 32 : 36,
                      borderRadius: screenData.width < 400 ? 16 : 18,
                    }
                  ]}
                  onPress={() => setShowScheduledClassesModal(false)}
                >
                  <Text style={[
                    scheduleClassStyles.closeButtonText,
                    { fontSize: screenData.width < 400 ? 18 : 20 }
                  ]}>×</Text>
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView
                style={scheduleClassStyles.formContainer}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{
                  paddingBottom: 20,
                  paddingHorizontal: screenData.width < 400 ? 16 : 20
                }}
              >
                {loadingScheduledClasses ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={{ color: '#9CA3AF', marginTop: 16 }}>Loading scheduled classes...</Text>
                  </View>
                ) : scheduledClasses.length === 0 ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Ionicons name="calendar-outline" size={48} color="#6B7280" />
                    <Text style={{ color: '#9CA3AF', marginTop: 16, textAlign: 'center' }}>
                      No scheduled classes found
                    </Text>
                    <Text style={{ color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
                      Use the + button to schedule a new class
                    </Text>
                  </View>
                ) : (
                  scheduledClasses.map((scheduledClass, index) => (
                    <View key={scheduledClass.id || index} style={{
                      backgroundColor: '#374151',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: '#4B5563',
                    }}>
                      {/* Class Info */}
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ color: '#F9FAFB', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                          {scheduledClass.topic}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                          <Text style={{ color: '#9CA3AF', fontSize: 14, marginLeft: 8 }}>
                            {new Date(scheduledClass.scheduledDateTime).toLocaleDateString('en-GB')} at {new Date(scheduledClass.scheduledDateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Ionicons name="link-outline" size={16} color="#9CA3AF" />
                          <Text style={{ color: '#9CA3AF', fontSize: 14, marginLeft: 8, flex: 1 }} numberOfLines={1}>
                            {scheduledClass.meetingLink}
                          </Text>
                        </View>

                        {/* Status Badge */}
                        <View style={{
                          backgroundColor:
                            scheduledClass.status === 'scheduled' ? '#1E40AF' :
                              scheduledClass.status === 'live' ? '#10B981' : '#6B7280',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                          alignSelf: 'flex-start',
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}>
                          <Ionicons
                            name={
                              scheduledClass.status === 'scheduled' ? 'time-outline' :
                                scheduledClass.status === 'live' ? 'radio-button-on' : 'checkmark-circle-outline'
                            }
                            size={12}
                            color="#fff"
                          />
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginLeft: 6 }}>
                            {scheduledClass.status === 'scheduled' ? 'Scheduled' :
                              scheduledClass.status === 'live' ? 'Live' : 'Ended'}
                          </Text>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        {/* Delete Button */}
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: '#EF4444',
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: 8,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                          }}
                          onPress={() => {
                            Alert.alert(
                              'Delete Scheduled Class',
                              'Are you sure you want to delete this scheduled class?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => handleDeleteScheduledClass(scheduledClass.id)
                                }
                              ]
                            );
                          }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#fff" />
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 6 }}>Delete</Text>
                        </TouchableOpacity>

                        {/* Start/End Button */}
                        {scheduledClass.status !== 'ended' && (
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: scheduledClass.status === 'scheduled' ? '#10B981' : '#F59E0B',
                              paddingVertical: 12,
                              paddingHorizontal: 16,
                              borderRadius: 8,
                              alignItems: 'center',
                              flexDirection: 'row',
                              justifyContent: 'center',
                            }}
                            onPress={() => handleToggleClassStatus(scheduledClass.id)}
                          >
                            <Ionicons
                              name={scheduledClass.status === 'scheduled' ? 'play-outline' : 'stop-outline'}
                              size={16}
                              color="#fff"
                            />
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 6 }}>
                              {scheduledClass.status === 'scheduled' ? 'Start Class' : 'End Class'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Floating Action Menu */}
      <FloatingActionMenu
        onScheduleClass={handleScheduleClass}
        onUploadVideo={() => setShowVideoUploadModal(true)}
      />

      {/* Video Upload Modal */}
      <VideoUploadModal
        visible={showVideoUploadModal}
        onClose={() => setShowVideoUploadModal(false)}
        courseId={courseId || ''}
        onSuccess={() => {
          // Refresh course data and recent videos after successful upload
          fetchCourse();
          fetchRecentVideos();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
  },
  loadingText: {
    marginTop: 10,
    color: "#9CA3AF",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#EF4444",
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#2E4064",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: "#1F2937",
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  backButtonHeader: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#374151",
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#374151",
    position: "relative",
  },
  dropdownMenu: {
    position: "absolute",
    top: 100,
    right: 15,
    backgroundColor: "#374151",
    borderRadius: 16,
    padding: 8,
    minWidth: 200,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
    marginVertical: 2,
  },
  dropdownItemText: {
    color: "#1F2937",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 6,
    marginHorizontal: 8,
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  courseInfoCard: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  codenameTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  codenameText: {
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
  },
  courseName: {
    fontWeight: "bold",
    color: "black",
    marginBottom: 16,
    lineHeight: 32,
    flex: 1,
  },
  courseNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  courseLogo: {
    borderRadius: 8,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completionStatusContainer: {
    marginVertical: 16,
    alignItems: "center",
  },
  completionBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b5d1a3",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 8,
  },
  completionText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#15803D",
    letterSpacing: -0.2,
  },
  courseMetaInfo: {
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    color: "black",
    fontWeight: "500",
    marginLeft: 8,
  },
  sectionCard: {
    backgroundColor: "#1F2937",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 12,
    flex: 1,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  viewAllButtonText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
  },
  videoPlaceholder: {
    backgroundColor: "#374151",
    borderRadius: 8,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#4B5563",
    borderStyle: "dashed",
  },
  placeholderText: {
    color: "#9CA3AF",
    marginTop: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  placeholderSubtext: {
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
    fontStyle: "italic",
  },
  studyMaterialsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  materialCard: {
    backgroundColor: "#374151",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flex: 1,
    minWidth: 140,
    maxWidth: 180,
    borderWidth: 1,
    borderColor: "#4B5563",
  },
  materialIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  materialTitle: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  materialCount: {
    color: "#9CA3AF",
    textAlign: "center",
  },
  limitedMaterialsNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#374151",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  noteText: {
    color: "#9CA3AF",
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  scheduleContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  scheduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  editButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  scheduleList: {
    gap: 8,
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  dayBadge: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 50,
    alignItems: "center",
  },
  dayText: {
    color: "#fff",
    fontWeight: "600",
  },
  timeText: {
    color: "black",
    fontWeight: "500",
    flex: 1,
  },

  // Student-related styles
  studentsContainer: {
    padding: 16,
  },
  studentTabContainer: {
    flexDirection: "row",
    backgroundColor: "#374151",
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  studentTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  activeStudentTab: {
    backgroundColor: "#3B82F6",
  },
  studentTabText: {
    color: "#9CA3AF",
    fontWeight: "600",
    fontSize: 14,
  },
  activeStudentTabText: {
    color: "#fff",
  },
  studentsCountContainer: {
    alignItems: "center",
    paddingVertical: 60,
    minHeight: 200,
  },
  studentsList: {
    gap: 12,
  },
  studentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 70,
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  studentAvatarContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  studentImage: {
    borderWidth: 2,
    borderColor: "#fff",
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  studentInitial: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  studentPhone: {
    fontSize: 14,
    color: "#6B7280",
  },
  studentStatus: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 80,
    alignItems: "center",
  },
  studentStatusText: {
    fontWeight: "600",
    textAlign: "center",
  },
  studentActions: {
    alignItems: "center",
    justifyContent: "center",
  },
  approveButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  approveButtonText: {
    color: "#fff",
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  emptyStudentsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
    minHeight: 200,
  },
  emptyStudentsText: {
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  emptyStudentsSubText: {
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },

  // Video-related styles
  videosLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    minHeight: 150,
  },
  videosContainer: {
    paddingHorizontal: 0,
  },
  videosScrollContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  videoCard: {
    backgroundColor: "#374151",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#4B5563",
    width: 280,
    marginRight: 16,
  },
  videoThumbnailContainer: {
    position: 'relative',
    aspectRatio: 16 / 9,
    backgroundColor: '#1F2937',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  videoPlayerCard: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  videoCardInfo: {
    padding: 16,
  },
  videoCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  videoCardTitle: {
    color: "#F9FAFB",
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  scheduledVideoBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
  },
  videoCardDescription: {
    color: "#D1D5DB",
    lineHeight: 18,
    marginBottom: 12,
  },
  videoCardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  videoCardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  videoCardMetaText: {
    color: "#9CA3AF",
  },
  videoCardResources: {
    flexDirection: "row",
    gap: 6,
  },

});

const scheduleClassStyles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1F2937',
    padding: 0,
    borderRadius: 24,
    width: '100%',
    maxHeight: '75%',
    minHeight: '65%',
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: -0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButtonText: {
    fontSize: 22,
    color: '#D1D5DB',
    fontWeight: '700',
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
    padding: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    color: '#F3F4F6',
    letterSpacing: -0.3,
  },
  input: {
    borderWidth: 2,
    borderColor: '#4B5563',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    backgroundColor: '#374151',
    color: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#4B5563',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    backgroundColor: '#374151',
    color: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    fontWeight: '500',
  },
  dateTimeButton: {
    borderWidth: 2,
    borderColor: '#4B5563',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 56,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#F9FAFB',
    fontWeight: '600',
    marginLeft: 12,
    lineHeight: 20,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: '#111827',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 16,
  },
  button: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButton: {
    backgroundColor: '#FF5734',
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FF5734',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: -0.2,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: -0.2,
  },
});

// Schedule editing styles
const scheduleStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "92%",
    backgroundColor: "#1F2937",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    backgroundColor: "#111827",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F9FAFB",
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    fontSize: 20,
    color: "#D1D5DB",
    fontWeight: "600",
    lineHeight: 20,
  },
  scheduleContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  scheduleItem: {
    backgroundColor: "#374151",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    position: "relative",
    borderWidth: 1,
    borderColor: "#4B5563",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  removeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    color: "#E5E7EB",
    marginBottom: 8,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  dayDropdownWrapper: {
    position: "relative",
    zIndex: 9999,
  },
  dayButton: {
    backgroundColor: "#4B5563",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#6B7280",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayButtonActive: {
    borderColor: "#3B82F6",
    backgroundColor: "#1E3A8A",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dayText: {
    fontSize: 16,
    color: "#F9FAFB",
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  dropdownArrow: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  dropdownArrowRotated: {
    transform: [{ rotate: "180deg" }],
    color: "#3B82F6",
  },
  dayDropdownContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#374151",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 2,
    borderColor: "#6B7280",
    zIndex: 10000,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  dayDropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#4B5563",
  },
  selectedDayDropdownItem: {
    backgroundColor: "#1E3A8A",
  },
  lastDayDropdownItem: {
    borderBottomWidth: 0,
  },
  dayDropdownItemText: {
    fontSize: 16,
    color: "#F9FAFB",
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  selectedDayDropdownItemText: {
    color: "#60A5FA",
    fontWeight: "700",
  },
  checkmark: {
    fontSize: 18,
    color: "#60A5FA",
    fontWeight: "bold",
  },
  timeRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  timeInput: {
    flex: 1,
  },
  timeButton: {
    backgroundColor: "#4B5563",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#6B7280",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timeText: {
    fontSize: 16,
    color: "#F9FAFB",
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  addButton: {
    backgroundColor: "#1E3A8A",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#3B82F6",
    borderStyle: "dashed",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 16,
    color: "#60A5FA",
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  actionButtons: {
    flexDirection: "row",
    padding: 20,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#374151",
    backgroundColor: "#111827",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#6B7280",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  disabledButton: {
    backgroundColor: "#6B7280",
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  // Enrolled Students Styles
  studentTabs: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  studentTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: "center",
    minHeight: 44, // Touch target size
  },
  activeStudentTab: {
    backgroundColor: "#2E4064",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  studentTabText: {
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
    flexWrap: "wrap",
  },
  activeStudentTabText: {
    color: "#fff",
    fontWeight: "600",
  },
  studentsLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    minHeight: 200,
  },
  studentsList: {
    gap: 12,
  },
  studentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 80, // Minimum height for better touch targets
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  studentInitial: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  studentDetails: {
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  studentName: {
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
    lineHeight: 20,
  },
  studentEmail: {
    color: "#6B7280",
    marginBottom: 2,
    lineHeight: 18,
  },
  studentPhone: {
    color: "#9CA3AF",
    lineHeight: 16,
  },
  studentStatus: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 80,
    alignItems: "center",
  },
  studentStatusText: {
    fontWeight: "600",
    textAlign: "center",
  },
  emptyStudentsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
    minHeight: 200,
  },
  emptyStudentsText: {
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  emptyStudentsSubText: {
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300, // Limit text width for better readability
  },
});

// Completion Styles
const completionStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  optionsModal: {
    backgroundColor: "#1F2937",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  optionsTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#F9FAFB",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  optionsSubtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#374151",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#4B5563",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  optionContent: {
    marginLeft: 20,
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  optionDescription: {
    fontSize: 15,
    color: "#D1D5DB",
    lineHeight: 20,
  },
  cancelButton: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#4B5563",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#6B7280",
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#D1D5DB",
    textAlign: "center",
  },
  scheduleModal: {
    backgroundColor: "#1F2937",
    borderRadius: 24,
    width: "100%",
    maxWidth: 520,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: "#374151",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    backgroundColor: "#111827",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 70,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F9FAFB",
    letterSpacing: -0.4,
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    fontSize: 22,
    color: "#9CA3AF",
    fontWeight: "600",
    lineHeight: 22,
  },
  scheduleContent: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  dateTimeContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
    flexWrap: "nowrap",
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#374151",
    borderWidth: 2,
    borderColor: "#4B5563",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 70,
  },
  dateTimeText: {
    fontSize: 15,
    color: "#F9FAFB",
    fontWeight: "600",
    flexShrink: 1,
    flexWrap: "wrap",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 20,
    backgroundColor: "#1E3A8A",
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  infoText: {
    marginLeft: 16,
    fontSize: 15,
    color: "#DBEAFE",
    lineHeight: 22,
    flex: 1,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    padding: 24,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#374151",
    backgroundColor: "#111827",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  cancelActionButton: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#4B5563",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6B7280",
  },
  cancelActionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#D1D5DB",
  },
  saveActionButton: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveActionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  disabledButton: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
});

export default CourseDetailsPage;
