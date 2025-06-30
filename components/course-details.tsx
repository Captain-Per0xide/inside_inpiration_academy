import { supabase } from "@/lib/supabase";
import { getCurrentDate, getCurrentISOString } from "@/utils/testDate";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import EBooksUpload from "./eBooks-upload";

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

interface CourseDetailsPageProps {
  courseId?: string;
  onBack?: () => void;
}

const CourseDetailsPage = ({ courseId: propCourseId, onBack }: CourseDetailsPageProps = {}) => {
  const routerParams = useLocalSearchParams<{ courseId: string }>();
  const courseId = propCourseId || routerParams.courseId;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [screenData, setScreenData] = useState(Dimensions.get("window"));
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentView, setCurrentView] = useState<'course-details' | 'ebooks'>('course-details');

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

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      if (onBack) {
        onBack();
      } else {
        router.back();
      }
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
        if (onBack) {
          onBack();
        } else {
          router.back();
        }
        return;
      }

      setCourse(data);
    } catch (error) {
      console.error("Error in fetchCourse:", error);
      if (onBack) {
        onBack();
      } else {
        router.back();
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, onBack]);

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
  }, [fetchCourse, fetchEnrolledStudents]);

  const handleBack = () => {
    handleBackNavigation();
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
                {
                  text: "OK", onPress: () => {
                    if (onBack) {
                      onBack();
                    } else {
                      router.back();
                    }
                  }
                }
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

  // Handle back navigation based on current view
  const handleBackNavigation = () => {
    if (currentView === 'ebooks') {
      setCurrentView('course-details');
    } else {
      if (onBack) {
        onBack();
      } else {
        router.back();
      }
    }
  };

  // Show eBooks upload component
  if (currentView === 'ebooks' && course) {
    return (
      <EBooksUpload
        courseId={courseId}
        courseName={course.full_name}
        onBack={() => setCurrentView('course-details')}
      />
    );
  }

  return (
    <>
      {!onBack && (
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
      )}
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

        {/* Main Content Wrapper with Top Padding */}
        <View style={{ paddingTop: 100 }}>
          {/* Course Information Section */}
          <View style={[styles.courseInfoCard, { backgroundColor: course.full_name_color }]}>
            <View style={styles.courseHeader}>
              <View style={styles.courseHeaderLeft}>
                <View style={[styles.codenameTag, { backgroundColor: course.codename_color }]}>
                  <Text style={[styles.codenameText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                    {course.codename}
                  </Text>
                </View>

              </View>
              <Ionicons
                name={isCoreCurriculum ? "school-outline" : "briefcase-outline"}
                size={isSmallScreen ? 24 : 26}
                color="black"
              />
            </View>

            {/* Course Logo and Name in a row */}
            <View style={styles.courseNameRow}>
              {course.course_logo && (
                <View style={styles.courseLogoContainer}>
                  <Image
                    source={{ uri: course.course_logo }}
                    style={[styles.courseLogo, {
                      height: "auto",
                      aspectRatio: 1,
                    }]}
                    defaultSource={{ uri: 'https://via.placeholder.com/48x48/2E4064/FFFFFF?text=C' }}
                    resizeMode="contain"
                  />
                </View>
              )}          <Text style={[styles.courseName, {
                fontSize: isSmallScreen ? 24 : isMediumScreen ? 26 : 28,
                flex: 1,
                marginBottom: 0
              }]}>
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
              {/* Instructor with Image */}
              <View style={styles.instructorSection}>
                {course.instructor_image && (
                  <View style={styles.instructorImageContainer}>
                    <Image
                      source={{ uri: course.instructor_image }}
                      style={[styles.instructorImage, {
                        width: isSmallScreen ? 42 : 48,
                        height: isSmallScreen ? 42 : 48,
                        borderRadius: isSmallScreen ? 21 : 24,
                      }]}
                      defaultSource={{ uri: `https://via.placeholder.com/48x48/10B981/FFFFFF?text=${course.instructor.charAt(0).toUpperCase()}` }}
                    />
                  </View>
                )}
                <View style={styles.instructorInfo}>
                  <Text style={[styles.instructorLabel, { fontSize: isSmallScreen ? 12 : 14 }]}>
                    Instructor
                  </Text>
                  <Text style={[styles.instructorName, { fontSize: isSmallScreen ? 16 : 18 }]}>
                    {course.instructor}
                  </Text>
                </View>
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
                Course Videos
              </Text>
            </View>

            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam-outline" size={60} color="#9CA3AF" />
              <Text style={[styles.placeholderText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                Course videos will be available here
              </Text>
              <Text style={[styles.placeholderSubtext, { fontSize: isSmallScreen ? 12 : 14 }]}>
                Backend implementation pending
              </Text>
            </View>
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
                onPress={() => setCurrentView('ebooks')}
              >
                <View style={[styles.materialIcon, { backgroundColor: "#E3F2FD" }]}>
                  <Ionicons name="book-outline" size={32} color="#1976D2" />
                </View>
                <Text style={[styles.materialTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                  eBooks
                </Text>
                <Text style={[styles.materialCount, { fontSize: isSmallScreen ? 12 : 14 }]}>
                  2 Available
                </Text>
              </TouchableOpacity>

              {/* Notes */}
              <TouchableOpacity style={styles.materialCard}>
                <View style={[styles.materialIcon, { backgroundColor: "#E8F5E8" }]}>
                  <Ionicons name="document-text-outline" size={32} color="#388E3C" />
                </View>
                <Text style={[styles.materialTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                  Notes
                </Text>
                <Text style={[styles.materialCount, { fontSize: isSmallScreen ? 12 : 14 }]}>
                  2 Available
                </Text>
              </TouchableOpacity>

              {/* Sample Question Set - Only for Core Curriculum */}
              {isCoreCurriculum && (
                <TouchableOpacity style={styles.materialCard}>
                  <View style={[styles.materialIcon, { backgroundColor: "#FFF3E0" }]}>
                    <Ionicons name="help-circle-outline" size={32} color="#F57C00" />
                  </View>
                  <Text style={[styles.materialTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                    Sample Questions
                  </Text>
                  <Text style={[styles.materialCount, { fontSize: isSmallScreen ? 12 : 14 }]}>
                    2 Sets Available
                  </Text>
                </TouchableOpacity>
              )}

              {/* Previous Year Questions - Only for Core Curriculum */}
              {isCoreCurriculum && (
                <TouchableOpacity style={styles.materialCard}>
                  <View style={[styles.materialIcon, { backgroundColor: "#FCE4EC" }]}>
                    <Ionicons name="archive-outline" size={32} color="#C2185B" />
                  </View>
                  <Text style={[styles.materialTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                    Previous Year Questions
                  </Text>
                  <Text style={[styles.materialCount, { fontSize: isSmallScreen ? 12 : 14 }]}>
                    Solved PYQs
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

          {/* Course Completion Options Modal */}
          <Modal
            visible={showCompletionOptions}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowCompletionOptions(false)}
          >
            <View style={completionModalStyles.overlay}>
              <View style={[completionModalStyles.container, {
                width: screenData.width < 400 ? '85%' : '75%',
                paddingVertical: screenData.width < 400 ? 14 : 18
              }]}>
                <View style={completionModalStyles.header}>
                  <Text style={[completionModalStyles.title, {
                    fontSize: screenData.width < 400 ? 18 : 20
                  }]}>
                    Mark Course as Completed
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCompletionOptions(false)}
                    style={[completionModalStyles.closeButton, {
                      width: screenData.width < 400 ? 36 : 40,
                      height: screenData.width < 400 ? 36 : 40,
                    }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={screenData.width < 400 ? 20 : 24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <Text style={[completionModalStyles.subtitle, {
                  fontSize: screenData.width < 400 ? 14 : 16
                }]}>
                  Choose when to mark this course as completed:
                </Text>

                <View style={completionModalStyles.buttonContainer}>
                  <TouchableOpacity
                    style={[completionModalStyles.optionButton, completionModalStyles.nowButton]}
                    onPress={handleCompletionNow}
                    activeOpacity={0.8}
                  >
                    <View style={completionModalStyles.buttonContent}>
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                      <View style={completionModalStyles.buttonTextContainer}>
                        <Text style={[completionModalStyles.buttonTitle, {
                          fontSize: screenData.width < 400 ? 16 : 18
                        }]}>
                          Complete Now
                        </Text>
                        <Text style={[completionModalStyles.buttonSubtitle, {
                          fontSize: screenData.width < 400 ? 12 : 14
                        }]}>
                          Mark as completed immediately
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[completionModalStyles.optionButton, completionModalStyles.scheduleButton]}
                    onPress={handleCompletionSchedule}
                    activeOpacity={0.8}
                  >
                    <View style={completionModalStyles.buttonContent}>
                      <Ionicons name="calendar" size={24} color="#fff" />
                      <View style={completionModalStyles.buttonTextContainer}>
                        <Text style={[completionModalStyles.buttonTitle, {
                          fontSize: screenData.width < 400 ? 16 : 18
                        }]}>
                          Schedule Completion
                        </Text>
                        <Text style={[completionModalStyles.buttonSubtitle, {
                          fontSize: screenData.width < 400 ? 12 : 14
                        }]}>
                          Set a future completion date
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Schedule Completion Modal */}
          <Modal
            visible={showScheduleModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowScheduleModal(false)}
          >
            <View style={completionModalStyles.overlay}>
              <View style={[completionModalStyles.container, {
                width: screenData.width < 400 ? '90%' : '80%',
                paddingVertical: screenData.width < 400 ? 16 : 20
              }]}>
                <View style={completionModalStyles.header}>
                  <Text style={[completionModalStyles.title, {
                    fontSize: screenData.width < 400 ? 18 : 20
                  }]}>
                    Schedule Course Completion
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowScheduleModal(false)}
                    style={[completionModalStyles.closeButton, {
                      width: screenData.width < 400 ? 36 : 40,
                      height: screenData.width < 400 ? 36 : 40,
                    }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={screenData.width < 400 ? 20 : 24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <Text style={[completionModalStyles.subtitle, {
                  fontSize: screenData.width < 400 ? 14 : 16
                }]}>
                  Select the date and time when this course should be marked as completed:
                </Text>

                <View style={completionModalStyles.dateTimeContainer}>
                  <View style={[
                    completionModalStyles.dateTimeRow,
                    screenData.width < 400 && completionModalStyles.dateTimeColumn
                  ]}>
                    <TouchableOpacity
                      style={completionModalStyles.dateTimeButton}
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                      <Text style={[completionModalStyles.dateTimeText, {
                        fontSize: screenData.width < 400 ? 14 : 16
                      }]}>
                        {scheduledEndDate.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={completionModalStyles.dateTimeButton}
                      onPress={() => setShowTimePicker(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="time-outline" size={20} color="#3B82F6" />
                      <Text style={[completionModalStyles.dateTimeText, {
                        fontSize: screenData.width < 400 ? 14 : 16
                      }]}>
                        {scheduledEndDate.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={completionModalStyles.scheduleActions}>
                  <TouchableOpacity
                    style={[completionModalStyles.actionButton, completionModalStyles.cancelButton]}
                    onPress={() => setShowScheduleModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={[completionModalStyles.cancelButtonText, {
                      fontSize: screenData.width < 400 ? 14 : 16
                    }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      completionModalStyles.actionButton,
                      completionModalStyles.confirmButton,
                      savingCompletion && completionModalStyles.disabledButton
                    ]}
                    onPress={saveScheduledCompletion}
                    disabled={savingCompletion}
                    activeOpacity={0.8}
                  >
                    {savingCompletion ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[completionModalStyles.confirmButtonText, {
                        fontSize: screenData.width < 400 ? 14 : 16
                      }]}>
                        Schedule Completion
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={scheduledEndDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={getCurrentDate()}
            />
          )}

          {/* Time Picker */}
          {showTimePicker && (
            <DateTimePicker
              value={scheduledEndDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}

          {/* Schedule Editing Modal */}
          <Modal
            visible={editingSchedule}
            animationType="slide"
            transparent
            onRequestClose={cancelScheduleEdit}
          >
            <View style={scheduleStyles.modalOverlay}>
              <View style={scheduleStyles.modalContent}>
                {/* Header */}
                <View style={scheduleStyles.header}>
                  <Text style={scheduleStyles.modalTitle}>Edit Schedule</Text>
                  <TouchableOpacity
                    style={scheduleStyles.closeButton}
                    onPress={cancelScheduleEdit}
                  >
                    <Text style={scheduleStyles.closeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                {/* Schedule List */}
                <ScrollView
                  style={scheduleStyles.scheduleContainer}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {scheduleData.map((schedule, index) => (
                    <View key={index} style={scheduleStyles.scheduleItem}>
                      {scheduleData.length > 1 && (
                        <TouchableOpacity
                          style={scheduleStyles.removeButton}
                          onPress={() => removeSchedule(index)}
                        >
                          <Text style={scheduleStyles.removeButtonText}>×</Text>
                        </TouchableOpacity>
                      )}

                      {/* Day Picker */}
                      <View style={scheduleStyles.inputGroup}>
                        <Text style={scheduleStyles.label}>Day</Text>
                        <View style={scheduleStyles.dayDropdownWrapper}>
                          <TouchableOpacity
                            style={[
                              scheduleStyles.dayButton,
                              showDayPicker === index && scheduleStyles.dayButtonActive
                            ]}
                            onPress={() => setShowDayPicker(showDayPicker === index ? null : index)}
                          >
                            <Text style={scheduleStyles.dayText}>{schedule.day}</Text>
                            <Text style={[
                              scheduleStyles.dropdownArrow,
                              showDayPicker === index && scheduleStyles.dropdownArrowRotated
                            ]}>▼</Text>
                          </TouchableOpacity>

                          {showDayPicker === index && (
                            <ScrollView
                              style={scheduleStyles.dayDropdownContainer}
                              nestedScrollEnabled={true}
                              showsVerticalScrollIndicator={true}
                            >
                              {daysOfWeek.map((day) => (
                                <TouchableOpacity
                                  key={day}
                                  style={[
                                    scheduleStyles.dayDropdownItem,
                                    schedule.day === day && scheduleStyles.selectedDayDropdownItem,
                                    day === daysOfWeek[daysOfWeek.length - 1] && scheduleStyles.lastDayDropdownItem
                                  ]}
                                  onPress={() => {
                                    updateSchedule(index, "day", day);
                                    setShowDayPicker(null);
                                  }}
                                >
                                  <Text style={[
                                    scheduleStyles.dayDropdownItemText,
                                    schedule.day === day && scheduleStyles.selectedDayDropdownItemText
                                  ]}>
                                    {day}
                                  </Text>
                                  {schedule.day === day && (
                                    <Text style={scheduleStyles.checkmark}>✓</Text>
                                  )}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )}
                        </View>
                      </View>

                      {/* Time Inputs */}
                      <View style={scheduleStyles.timeRow}>
                        <View style={scheduleStyles.timeInput}>
                          <Text style={scheduleStyles.label}>Start Time</Text>
                          <TouchableOpacity
                            style={scheduleStyles.timeButton}
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
                            <Text style={scheduleStyles.timeText}>{schedule.startTime}</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={scheduleStyles.timeInput}>
                          <Text style={scheduleStyles.label}>End Time</Text>
                          <TouchableOpacity
                            style={scheduleStyles.timeButton}
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
                            <Text style={scheduleStyles.timeText}>{schedule.endTime}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Add Schedule Button */}
                  <TouchableOpacity style={scheduleStyles.addButton} onPress={addSchedule}>
                    <Text style={scheduleStyles.addButtonText}>+ Add Schedule</Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Action Buttons */}
                <View style={scheduleStyles.actionButtons}>
                  <TouchableOpacity
                    style={scheduleStyles.cancelButton}
                    onPress={cancelScheduleEdit}
                  >
                    <Text style={scheduleStyles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[scheduleStyles.saveButton, savingSchedule && scheduleStyles.disabledButton]}
                    onPress={saveSchedule}
                    disabled={savingSchedule}
                  >
                    <Text style={scheduleStyles.saveButtonText}>
                      {savingSchedule ? "Saving..." : "Save Changes"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View> {/* Close main content wrapper */}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  contentContainer: {
    paddingTop: 0,
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: "#1F2937",
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    zIndex: 1000,
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
    borderRadius: 8,
    padding: 8,
    minWidth: 180,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1001,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 10,
  },
  dropdownItemText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#4B5563",
    marginVertical: 4,
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
  },
  courseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 12,
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
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  approveButtonText: {
    color: "#fff",
    fontWeight: "600",
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
  // Course header styles for logo and instructor image
  courseHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  courseLogoContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignSelf: "stretch",
    justifyContent: "center",
    minWidth: 50,
    maxWidth: 70,
  },
  courseLogo: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "black",
  },
  instructorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  instructorSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorLabel: {
    color: "rgba(0, 0, 0, 0.6)",
    fontWeight: "500",
    marginBottom: 2,
  },
  instructorName: {
    color: "black",
    fontWeight: "bold",
  },
  instructorImageContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  instructorImage: {
    borderWidth: 1,
    borderColor: "black",
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
});

// Schedule editing styles
const scheduleStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: "#1F2937",
    borderRadius: 20,
    overflow: "hidden",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  scheduleContainer: {
    flex: 1,
    padding: 20,
    paddingBottom: 0,
    overflow: "visible",
  },
  scheduleItem: {
    backgroundColor: "#374151",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    position: "relative",
    overflow: "visible",
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  inputGroup: {
    marginBottom: 16,
    overflow: "visible",
  },
  label: {
    fontSize: 14,
    color: "#D1D5DB",
    marginBottom: 6,
    fontWeight: "500",
  },
  dayDropdownWrapper: {
    position: "relative",
    overflow: "visible",
  },
  dayButton: {
    backgroundColor: "#4B5563",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6B7280",
  },
  dayButtonActive: {
    borderColor: "#3B82F6",
    backgroundColor: "#1E3A8A",
  },
  dayText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#9CA3AF",
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
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#6B7280",
    zIndex: 999999,
    elevation: 9999,
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dayDropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    color: "#fff",
    fontWeight: "400",
  },
  selectedDayDropdownItemText: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "bold",
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
  },
  timeInput: {
    flex: 1,
  },
  timeButton: {
    backgroundColor: "#4B5563",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#6B7280",
  },
  timeText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  addButton: {
    backgroundColor: "#1E3A8A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 2,
    borderColor: "#3B82F6",
    borderStyle: "dashed",
  },
  addButtonText: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#6B7280",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#6B7280",
    opacity: 0.6,
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

// Completion Modal Styles
const completionModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#1F2937",
    borderRadius: 20,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "#F9FAFB",
    fontWeight: "700",
    letterSpacing: -0.5,
    flex: 1,
  },
  closeButton: {
    borderRadius: 20,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  subtitle: {
    color: "#9CA3AF",
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 8,
  },
  optionButton: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nowButton: {
    backgroundColor: "#059669",
  },
  scheduleButton: {
    backgroundColor: "#3B82F6",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  buttonTitle: {
    color: "#fff",
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  buttonSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
  },
  dateTimeContainer: {
    marginVertical: 20,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateTimeColumn: {
    flexDirection: "column",
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#374151",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    gap: 12,
  },
  dateTimeText: {
    color: "#D1D5DB",
    fontWeight: "600",
  },
  scheduleActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#4B5563",
  },
  confirmButton: {
    backgroundColor: "#3B82F6",
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: "#D1D5DB",
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default CourseDetailsPage;
