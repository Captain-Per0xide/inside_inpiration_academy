import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PaymentInfo {
  id: number;
  phone_number: string;
  upi_id: string;
  qr_code: string;
  created_at: string;
}

interface PendingPayment {
  user_id: string;
  txn_id: string;
  ss_uploaded_path: string;
  email_id: string;
  phone_number: string;
  status: string;
  course_id: string;
  course_name: string;
  month: string;
  user_name: string;
  user_role: string;
}

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
}

interface PaymentHistoryEntry {
  user_id: string;
  txn_id: string;
  ss_uploaded_path: string;
  email_id: string;
  phone_number: string;
  status: string;
  user_name: string;
}

const PaymentManagementPage = () => {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get("window"));

  // Form state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [upiId, setUpiId] = useState("");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [pickedQrImage, setPickedQrImage] = useState<string | null>(null);

  // Pending payments state
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"config" | "pending" | "history">(
    "config"
  );
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [approving, setApproving] = useState(false);

  // Payment History state
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [monthsModalVisible, setMonthsModalVisible] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryEntry[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredPaymentHistory, setFilteredPaymentHistory] = useState<PaymentHistoryEntry[]>([]);

  useEffect(() => {
    const onChange = (result: { window: any }) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener("change", onChange);
    return () => subscription?.remove();
  }, []);

  const fetchPaymentInfo = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("payment_info")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching payment info:", error);
        Alert.alert("Error", "Failed to fetch payment information");
        return;
      }

      if (data) {
        setPaymentInfo(data);
        setPhoneNumber(data.phone_number);
        setUpiId(data.upi_id);
        setQrImage(data.qr_code);
      } else {
        // No payment info exists yet
        setPaymentInfo(null);
        setPhoneNumber("");
        setUpiId("");
        setQrImage(null);
      }
    } catch (error) {
      console.error("Error in fetchPaymentInfo:", error);
      Alert.alert("Error", "Failed to fetch payment information");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingPayments = useCallback(async () => {
    try {
      setPendingLoading(true);

      // Get all fees data
      const { data: feesData, error: feesError } = await supabase
        .from("fees")
        .select(
          "id, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sept, Oct, Nov, Dec"
        );

      if (feesError) {
        console.error("Error fetching fees:", feesError);
        return;
      }

      // Get courses data for course names
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, full_name, fees_monthly");

      if (coursesError) {
        console.error("Error fetching courses:", coursesError);
        return;
      }

      // Get users data for user names and roles
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, role");

      if (usersError) {
        console.error("Error fetching users:", usersError);
        return;
      }

      const pendingList: PendingPayment[] = [];
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sept",
        "Oct",
        "Nov",
        "Dec",
      ];

      // Process each fee record
      feesData?.forEach((fee) => {
        const course = coursesData?.find((c) => c.id === fee.id);

        months.forEach((month) => {
          const monthData = fee[month as keyof typeof fee] as any[];
          if (monthData && Array.isArray(monthData)) {
            monthData.forEach((payment: any) => {
              if (payment.status === "pending") {
                const user = usersData?.find((u) => u.id === payment.user_id);
                pendingList.push({
                  user_id: payment.user_id,
                  txn_id: payment.txn_id,
                  ss_uploaded_path: payment.ss_uploaded_path,
                  email_id: payment.email_id,
                  phone_number: payment.phone_number,
                  status: payment.status,
                  course_id: fee.id,
                  course_name: course?.full_name || "Unknown Course",
                  month: month,
                  user_name: user?.name || "Unknown User",
                  user_role: user?.role || "unknown",
                });
              }
            });
          }
        });
      });

      setPendingPayments(pendingList);
    } catch (error) {
      console.error("Error in fetchPendingPayments:", error);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      setCoursesLoading(true);

      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching courses:", error);
        Alert.alert("Error", "Failed to fetch courses");
        return;
      }

      setCourses(data || []);
    } catch (error) {
      console.error("Error in fetchCourses:", error);
      Alert.alert("Error", "Failed to fetch courses");
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  const fetchPaymentHistory = useCallback(async (courseId: string, month: string) => {
    try {
      setHistoryLoading(true);

      // Fetch the specific month data from fees table
      const { data: feeData, error: feeError } = await supabase
        .from("fees")
        .select(`"${month}"`)
        .eq("id", courseId)
        .single();

      if (feeError) {
        console.error("Error fetching fee data:", feeError);
        Alert.alert("Error", "Failed to fetch payment history");
        return;
      }

      const monthData = feeData[month] as any[];
      if (!monthData || !Array.isArray(monthData)) {
        setPaymentHistory([]);
        return;
      }

      // Filter for successful payments only
      const successfulPayments = monthData.filter((payment: any) => payment.status === "success");

      // Get user names for each payment
      const userIds = successfulPayments.map((payment: any) => payment.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name")
        .in("id", userIds);

      if (usersError) {
        console.error("Error fetching users:", usersError);
      }

      // Map payments with user names
      const historyWithUserNames = successfulPayments.map((payment: any) => {
        const user = usersData?.find((u) => u.id === payment.user_id);
        return {
          ...payment,
          user_name: user?.name || "Unknown User",
        };
      });

      setPaymentHistory(historyWithUserNames);
      setFilteredPaymentHistory(historyWithUserNames);
    } catch (error) {
      console.error("Error in fetchPaymentHistory:", error);
      Alert.alert("Error", "Failed to fetch payment history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Filter payment history based on search query
  const filterPaymentHistory = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredPaymentHistory(paymentHistory);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = paymentHistory.filter((payment) => 
      payment.user_name.toLowerCase().includes(query) ||
      payment.email_id.toLowerCase().includes(query)
    );
    setFilteredPaymentHistory(filtered);
  }, [paymentHistory, searchQuery]);

  // Update filtered results when search query or payment history changes
  useEffect(() => {
    filterPaymentHistory();
  }, [filterPaymentHistory]);

  useEffect(() => {
    fetchPaymentInfo();
    fetchPendingPayments();
    if (selectedTab === "history") {
      fetchCourses();
    }
  }, [fetchPaymentInfo, fetchPendingPayments, fetchCourses, selectedTab]);

  const uriToBlob = async (uri: string): Promise<ArrayBuffer> => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to binary string
    const binaryString = atob(base64);

    // Create ArrayBuffer from binary string
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
  };

  const uploadQrImage = async (): Promise<string | null> => {
    if (!pickedQrImage) return qrImage;

    const path = "Payment-Info/qr.png";

    try {
      // Delete old QR image first if it exists
      console.log("Removing previous QR image if exists...");
      await supabase.storage
        .from("inside-inspiration-academy-assets")
        .remove([path]);

      console.log("Converting QR image to ArrayBuffer...");
      const arrayBuffer = await uriToBlob(pickedQrImage);

      console.log("Uploading new QR image...");
      const { error } = await supabase.storage
        .from("inside-inspiration-academy-assets")
        .upload(path, arrayBuffer, {
          cacheControl: "3600",
          contentType: "image/png",
          upsert: true,
        });

      if (error) {
        console.error("QR image upload error:", error);
        return qrImage ?? null;
      }

      const { data } = supabase.storage
        .from("inside-inspiration-academy-assets")
        .getPublicUrl(path);

      console.log("QR Upload successful, public URL:", data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error("QR Image upload error:", error);
      return qrImage ?? null;
    }
  };

  const pickQrImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload QR code image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setPickedQrImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking QR image:", error);
      Alert.alert("Error", "Failed to pick QR image");
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!phoneNumber.trim()) {
      errors.push("Phone number is required");
    } else if (phoneNumber.trim().length < 10) {
      errors.push("Phone number must be at least 10 digits");
    }

    if (!upiId.trim()) {
      errors.push("UPI ID is required");
    } else if (!upiId.trim().includes("@")) {
      errors.push("UPI ID must contain @ symbol");
    }

    if (!qrImage && !pickedQrImage) {
      errors.push("QR code image is required");
    }

    if (errors.length > 0) {
      Alert.alert("Validation Error", errors.join("\n"));
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      // Upload QR image if a new one was picked
      let qrCodeUrl = qrImage;
      if (pickedQrImage) {
        const uploadedUrl = await uploadQrImage();
        if (!uploadedUrl) {
          Alert.alert("Error", "Failed to upload QR code image");
          setSaving(false);
          return;
        }
        qrCodeUrl = uploadedUrl;
      }

      const paymentData = {
        phone_number: phoneNumber.trim(),
        upi_id: upiId.trim(),
        qr_code: qrCodeUrl!,
      };

      if (paymentInfo) {
        // Update existing payment info
        const { error } = await supabase
          .from("payment_info")
          .update(paymentData)
          .eq("id", paymentInfo.id);

        if (error) {
          console.error("Error updating payment info:", error);
          Alert.alert("Error", "Failed to update payment information");
          return;
        }
      } else {
        // Insert new payment info
        const { error } = await supabase
          .from("payment_info")
          .insert([paymentData]);

        if (error) {
          console.error("Error inserting payment info:", error);
          Alert.alert("Error", "Failed to save payment information");
          return;
        }
      }

      // Update local state
      setQrImage(qrCodeUrl);
      if (pickedQrImage) {
        setPickedQrImage(null);
      }

      Alert.alert("Success", "Payment information updated successfully!", [
        {
          text: "OK",
          onPress: () => fetchPaymentInfo(),
        },
      ]);
    } catch (error) {
      console.error("Error in handleSave:", error);
      Alert.alert("Error", "Failed to save payment information");
    } finally {
      setSaving(false);
    }
  };

  const approvePayment = async (payment: PendingPayment) => {
    try {
      setApproving(true);

      // Update the payment status in fees table
      const { data: feeData, error: fetchError } = await supabase
        .from("fees")
        .select(`"${payment.month}"`)
        .eq("id", payment.course_id)
        .single();

      if (fetchError) {
        console.error("Error fetching fee data:", fetchError);
        Alert.alert("Error", "Failed to update payment status");
        return;
      }

      const monthData = feeData[payment.month] as any[];
      const currentTimestamp = new Date().toISOString();
      
      const updatedMonthData = monthData.map((p: any) => {
        if (p.user_id === payment.user_id && p.txn_id === payment.txn_id) {
          return { 
            ...p, 
            status: "success",
            approved_timestamp: currentTimestamp
          };
        }
        return p;
      });

      // Update the fees table
      const { error: updateError } = await supabase
        .from("fees")
        .update({ [payment.month]: updatedMonthData })
        .eq("id", payment.course_id);

      if (updateError) {
        console.error("Error updating payment status:", updateError);
        Alert.alert("Error", "Failed to update payment status");
        return;
      }

      // Update enrolled_students in courses table
      const { data: courseData, error: fetchCourseError } = await supabase
        .from("courses")
        .select("enrolled_students")
        .eq("id", payment.course_id)
        .single();

      if (fetchCourseError) {
        console.error("Error fetching course data:", fetchCourseError);
        // Don't fail the approval if we can't update enrolled_students
      } else {
        const currentEnrolledStudents = courseData.enrolled_students || [];
        
        // Check if student is already enrolled
        const isAlreadyEnrolled = currentEnrolledStudents.some(
          (student: any) => student.user_id === payment.user_id
        );

        if (!isAlreadyEnrolled) {
          // Add new student enrollment record
          const newStudentRecord = {
            user_id: payment.user_id,
            approve_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
            approving_time: new Date().toISOString() // Full timestamp
          };

          const updatedEnrolledStudents = [...currentEnrolledStudents, newStudentRecord];

          const { error: updateCourseError } = await supabase
            .from("courses")
            .update({ enrolled_students: updatedEnrolledStudents })
            .eq("id", payment.course_id);

          if (updateCourseError) {
            console.error("Error updating enrolled students:", updateCourseError);
            // Don't fail the approval if we can't update enrolled_students
          }
        }
      }

      // Update user based on their current role
      if (payment.user_role === "guest") {
        // For guests: update role to student and add course to enrolled_courses
        const { error: userUpdateError } = await supabase
          .from("users")
          .update({ 
            role: "student",
            enrolled_courses: [payment.course_id]
          })
          .eq("id", payment.user_id);

        if (userUpdateError) {
          console.error("Error updating user role:", userUpdateError);
          Alert.alert(
            "Warning",
            "Payment approved but failed to update user role"
          );
        }
      } else if (payment.user_role === "student") {
        // For existing students: add course to enrolled_courses array
        const { data: userData, error: fetchUserError } = await supabase
          .from("users")
          .select("enrolled_courses")
          .eq("id", payment.user_id)
          .single();

        if (fetchUserError) {
          console.error("Error fetching user data:", fetchUserError);
          Alert.alert(
            "Warning",
            "Payment approved but failed to update enrolled courses"
          );
        } else {
          const currentEnrolledCourses = userData.enrolled_courses || [];
          
          // Add the new course if not already enrolled
          if (!currentEnrolledCourses.includes(payment.course_id)) {
            const updatedEnrolledCourses = [...currentEnrolledCourses, payment.course_id];
            
            const { error: updateCoursesError } = await supabase
              .from("users")
              .update({ enrolled_courses: updatedEnrolledCourses })
              .eq("id", payment.user_id);

            if (updateCoursesError) {
              console.error("Error updating enrolled courses:", updateCoursesError);
              Alert.alert(
                "Warning",
                "Payment approved but failed to update enrolled courses"
              );
            }
          }
        }
      }

      Alert.alert("Success", "Payment approved successfully!", [
        {
          text: "OK",
          onPress: () => {
            setModalVisible(false);
            setSelectedPayment(null);
            fetchPendingPayments();
          },
        },
      ]);
    } catch (error) {
      console.error("Error in approvePayment:", error);
      Alert.alert("Error", "Failed to approve payment");
    } finally {
      setApproving(false);
    }
  };

  const rejectPayment = async (payment: PendingPayment) => {
    try {
      setApproving(true);

      // Show confirmation dialog first
      Alert.alert(
        "Reject Payment",
        `Are you sure you want to reject this payment from ${payment.user_name}? This action cannot be undone.`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setApproving(false),
          },
          {
            text: "Reject",
            style: "destructive",
            onPress: async () => {
              try {
                // Fetch current month data from fees table
                const { data: feeData, error: fetchError } = await supabase
                  .from("fees")
                  .select(`"${payment.month}"`)
                  .eq("id", payment.course_id)
                  .single();

                if (fetchError) {
                  console.error("Error fetching fee data:", fetchError);
                  Alert.alert("Error", "Failed to reject payment");
                  return;
                }

                const monthData = feeData[payment.month] as any[];

                // Remove the specific payment entry from the array
                const updatedMonthData = monthData.filter((p: any) =>
                  !(p.user_id === payment.user_id && p.txn_id === payment.txn_id)
                );

                // Update the fees table with the filtered array
                const { error: updateError } = await supabase
                  .from("fees")
                  .update({ [payment.month]: updatedMonthData })
                  .eq("id", payment.course_id);

                if (updateError) {
                  console.error("Error updating fees table:", updateError);
                  Alert.alert("Error", "Failed to reject payment");
                  return;
                }

                Alert.alert("Success", "Payment rejected and removed successfully!", [
                  {
                    text: "OK",
                    onPress: () => {
                      setModalVisible(false);
                      setSelectedPayment(null);
                      fetchPendingPayments();
                    },
                  },
                ]);
              } catch (error) {
                console.error("Error in reject payment process:", error);
                Alert.alert("Error", "Failed to reject payment");
              } finally {
                setApproving(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in rejectPayment:", error);
      setApproving(false);
    }
  };

  const viewPaymentDetails = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setModalVisible(true);
  };

  const handleCourseViewPress = (course: Course) => {
    setSelectedCourse(course);
    setMonthsModalVisible(true);
  };

  const handleMonthPress = async (month: string) => {
    if (!selectedCourse) return;
    
    setSelectedMonth(month);
    setMonthsModalVisible(false);
    setHistoryModalVisible(true);
    await fetchPaymentHistory(selectedCourse.id, month);
  };

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
  ];

  // Calculate responsive columns and card width for course cards
  const getResponsiveLayout = useCallback(() => {
    const { width } = screenData;
    
    // Define breakpoints
    if (width < 600) {
      // Mobile: 1 column
      return { numColumns: 1, cardWidth: width - 40 };
    } else if (width < 900) {
      // Tablet portrait: 2 columns
      return { numColumns: 2, cardWidth: (width - 60) / 2 };
    } else if (width < 1200) {
      // Tablet landscape: 3 columns
      return { numColumns: 3, cardWidth: (width - 80) / 3 };
    } else {
      // Desktop: 4 columns
      return { numColumns: 4, cardWidth: (width - 100) / 4 };
    }
  }, [screenData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E4064" />
        <Text style={styles.loadingText}>Loading payment information...</Text>
      </View>
    );
  }

  const isSmallScreen = screenData.width < 600;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={[styles.title, { fontSize: isSmallScreen ? 24 : 28 }]}>
        Payment Management
      </Text>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === "config" && styles.activeTabButton,
          ]}
          onPress={() => setSelectedTab("config")}
        >
          <Text
            style={[
              styles.tabButtonText,
              { fontSize: isSmallScreen ? 14 : 16 },
              selectedTab === "config" && styles.activeTabButtonText,
            ]}
          >
            Payment Configuration
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === "pending" && styles.activeTabButton,
          ]}
          onPress={() => setSelectedTab("pending")}
        >
          <Text
            style={[
              styles.tabButtonText,
              { fontSize: isSmallScreen ? 14 : 16 },
              selectedTab === "pending" && styles.activeTabButtonText,
            ]}
          >
            Pending Payments ({pendingPayments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === "history" && styles.activeTabButton,
          ]}
          onPress={() => setSelectedTab("history")}
        >
          <Text
            style={[
              styles.tabButtonText,
              { fontSize: isSmallScreen ? 14 : 16 },
              selectedTab === "history" && styles.activeTabButtonText,
            ]}
          >
            Payment History
          </Text>
        </TouchableOpacity>
      </View>

      {selectedTab === "config" ? (
        <>
          <Text
            style={[styles.subtitle, { fontSize: isSmallScreen ? 14 : 16 }]}
          >
            Configure payment details for student payments
          </Text>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Phone Number */}
            <View style={styles.inputContainer}>
              <Text
                style={[
                  styles.inputLabel,
                  { fontSize: isSmallScreen ? 14 : 16 },
                ]}
              >
                Phone Number
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { fontSize: isSmallScreen ? 14 : 16 },
                ]}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            {/* UPI ID */}
            <View style={styles.inputContainer}>
              <Text
                style={[
                  styles.inputLabel,
                  { fontSize: isSmallScreen ? 14 : 16 },
                ]}
              >
                UPI ID
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { fontSize: isSmallScreen ? 14 : 16 },
                ]}
                value={upiId}
                onChangeText={setUpiId}
                placeholder="Enter UPI ID (e.g., user@paytm)"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
            </View>

            {/* QR Code Upload */}
            <View style={styles.inputContainer}>
              <Text
                style={[
                  styles.inputLabel,
                  { fontSize: isSmallScreen ? 14 : 16 },
                ]}
              >
                QR Code Image
              </Text>

              <TouchableOpacity
                onPress={pickQrImage}
                style={styles.uploadButton}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={24}
                  color="#2E4064"
                />
                <Text
                  style={[
                    styles.uploadButtonText,
                    { fontSize: isSmallScreen ? 14 : 16 },
                  ]}
                >
                  {pickedQrImage || qrImage
                    ? "Change QR Code"
                    : "Upload QR Code"}
                </Text>
              </TouchableOpacity>

              {(pickedQrImage || qrImage) && (
                <View style={styles.imagePreview}>
                  <Image
                    source={{
                      uri: pickedQrImage || qrImage || "",
                    }}
                    style={[
                      styles.previewImage,
                      {
                        width: isSmallScreen ? 150 : 200,
                        height: isSmallScreen ? 150 : 200,
                      },
                    ]}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => {
                      setPickedQrImage(null);
                      if (!paymentInfo) {
                        setQrImage(null);
                      }
                    }}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="save-outline" size={20} color="#fff" />
              )}
              <Text
                style={[
                  styles.saveButtonText,
                  { fontSize: isSmallScreen ? 14 : 16 },
                ]}
              >
                {saving
                  ? "Saving..."
                  : paymentInfo
                  ? "Update Information"
                  : "Save Information"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Current Info Display */}
          {paymentInfo && (
            <View style={styles.currentInfoCard}>
              <Text
                style={[
                  styles.currentInfoTitle,
                  { fontSize: isSmallScreen ? 16 : 18 },
                ]}
              >
                Current Payment Information
              </Text>

              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color="#10B981" />
                <Text
                  style={[
                    styles.infoText,
                    { fontSize: isSmallScreen ? 14 : 16, color: "#fff" },
                  ]}
                >
                  {paymentInfo.phone_number}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={16} color="#10B981" />
                <Text
                  style={[
                    styles.infoText,
                    { fontSize: isSmallScreen ? 14 : 16, color: "#fff" },
                  ]}
                >
                  {paymentInfo.upi_id}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                <Text
                  style={[
                    styles.infoDateText,
                    { fontSize: isSmallScreen ? 12 : 14 },
                  ]}
                >
                  Last updated:{" "}
                  {new Date(paymentInfo.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
        </>
      ) : selectedTab === "pending" ? (
        <>
          <Text
            style={[styles.subtitle, { fontSize: isSmallScreen ? 14 : 16 }]}
          >
            Review and approve pending payments
          </Text>

          {pendingLoading ? (
            <View style={styles.pendingLoadingContainer}>
              <ActivityIndicator size="large" color="#2E4064" />
              <Text style={styles.loadingText}>
                Loading pending payments...
              </Text>
            </View>
          ) : pendingPayments.length === 0 ? (
            <View style={styles.noPendingContainer}>
              <Ionicons
                name="checkmark-circle-outline"
                size={60}
                color="#10B981"
              />
              <Text style={styles.noPendingText}>No pending payments</Text>
            </View>
          ) : (
            <View style={styles.pendingPaymentsContainer}>
              {pendingPayments.map((payment, index) => (
                <View
                  key={`${payment.user_id}-${payment.txn_id}`}
                  style={styles.pendingPaymentCard}
                >
                  <View style={styles.pendingPaymentHeader}>
                    <Text
                      style={[
                        styles.pendingPaymentTitle,
                        { fontSize: isSmallScreen ? 16 : 18 },
                      ]}
                    >
                      {payment.user_name}
                    </Text>
                    <View style={styles.pendingPaymentStatus}>
                      <Text style={styles.pendingStatusText}>PENDING</Text>
                    </View>
                  </View>

                  <View style={styles.pendingPaymentDetails}>
                    <View style={styles.pendingDetailRow}>
                      <Ionicons name="book-outline" size={16} color="#9CA3AF" />
                      <Text
                        style={[
                          styles.pendingDetailText,
                          { fontSize: isSmallScreen ? 14 : 16 },
                        ]}
                      >
                        {payment.course_name}
                      </Text>
                    </View>

                    <View style={styles.pendingDetailRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#9CA3AF"
                      />
                      <Text
                        style={[
                          styles.pendingDetailText,
                          { fontSize: isSmallScreen ? 14 : 16 },
                        ]}
                      >
                        Payment for: {payment.month}
                      </Text>
                    </View>

                    <View style={styles.pendingDetailRow}>
                      <Ionicons name="card-outline" size={16} color="#9CA3AF" />
                      <Text
                        style={[
                          styles.pendingDetailText,
                          { fontSize: isSmallScreen ? 14 : 16 },
                        ]}
                      >
                        TXN ID: {payment.txn_id}
                      </Text>
                    </View>

                    <View style={styles.pendingDetailRow}>
                      <Ionicons name="mail-outline" size={16} color="#9CA3AF" />
                      <Text
                        style={[
                          styles.pendingDetailText,
                          { fontSize: isSmallScreen ? 14 : 16 },
                        ]}
                      >
                        {payment.email_id}
                      </Text>
                    </View>

                    <View style={styles.pendingDetailRow}>
                      <Ionicons name="call-outline" size={16} color="#9CA3AF" />
                      <Text
                        style={[
                          styles.pendingDetailText,
                          { fontSize: isSmallScreen ? 14 : 16 },
                        ]}
                      >
                        {payment.phone_number}
                      </Text>
                    </View>

                    {payment.user_role === "guest" && (
                      <View style={styles.pendingDetailRow}>
                        <Ionicons
                          name="person-outline"
                          size={16}
                          color="#F59E0B"
                        />
                        <Text
                          style={[
                            styles.pendingDetailText,
                            {
                              fontSize: isSmallScreen ? 14 : 16,
                              color: "#F59E0B",
                            },
                          ]}
                        >
                          Will be promoted to Student upon approval
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => viewPaymentDetails(payment)}
                  >
                    <Ionicons name="eye-outline" size={20} color="#2E4064" />
                    <Text
                      style={[
                        styles.viewDetailsButtonText,
                        { fontSize: isSmallScreen ? 16 : 18 },
                      ]}
                    >
                      View Details
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      ) : selectedTab === "history" ? (
        <>
          {/* Payment History Tab */}
          {coursesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2E4064" />
              <Text style={[styles.loadingText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                Loading courses...
              </Text>
            </View>
          ) : (
            <View style={styles.historyContainer}>
              <Text style={[styles.subtitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                View payment history by course and month
              </Text>

              {courses.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="school-outline" size={80} color="#666" />
                  <Text style={[styles.emptyStateTitle, { fontSize: isSmallScreen ? 20 : 24 }]}>
                    No Courses Available
                  </Text>
                  <Text style={[styles.emptyStateText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                    Create courses to view payment history
                  </Text>
                </View>
              ) : (
                <View style={styles.coursesGrid}>
                  {(() => {
                    const { numColumns, cardWidth } = getResponsiveLayout();
                    const isMediumScreen = screenData.width < 900;
                    
                    return courses.map((course) => (
                      <View key={course.id} style={[
                        styles.courseCard, 
                        { 
                          backgroundColor: course.full_name_color,
                          width: numColumns === 1 ? '100%' : cardWidth,
                          minHeight: isSmallScreen ? 220 : isMediumScreen ? 260 : 280,
                        }
                      ]}>
                        <View style={styles.cardHeader}>
                          <View style={[styles.codenameTag, { backgroundColor: course.codename_color }]}>
                            <Text style={[styles.codenameText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                              {course.codename}
                            </Text>
                          </View>
                          <Ionicons 
                            name={course.course_type === "Core Curriculum" ? "school-outline" : "briefcase-outline"}
                            size={isSmallScreen ? 24 : 26}
                            color="black"
                          />
                        </View>
                        
                        <Text style={[styles.courseTitle, { 
                          fontSize: isSmallScreen ? 18 : isMediumScreen ? 19 : 20,
                          marginBottom: isSmallScreen ? 12 : 16
                        }]}>
                          {course.full_name}
                        </Text>
                        
                        <View style={styles.courseInfo}>
                          <View style={styles.infoRow}>
                            <Ionicons name="time-outline" size={isSmallScreen ? 14 : 16} color="black" />
                            <Text style={[styles.infoText, { fontSize: isSmallScreen ? 14 : 16, color: 'black' }]}>
                              Course Duration: {course.course_duration ? `${course.course_duration} months` : 'Ongoing'}
                            </Text>
                          </View>
                          
                          <View style={styles.infoRow}>
                            <Ionicons name="cash-outline" size={isSmallScreen ? 14 : 16} color="black" />
                            <Text style={[styles.infoText, { fontSize: isSmallScreen ? 14 : 16, color: 'black' }]}>
                              Course Fees: ₹{course.fees_monthly}/month
                            </Text>
                          </View>
                          
                          <View style={styles.infoRow}>
                            <Text style={{ fontSize: isSmallScreen ? 14 : 16, fontWeight: '400', color: 'black' }}>
                              Includes 2 eBooks, 2 Notes & 2 Sample Question Set with PYQ solved
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.instructorSection}>
                          <View style={styles.instructorInfo}>
                            {course.instructor_image ? (
                              <Image 
                                source={{ uri: course.instructor_image }} 
                                style={[styles.instructorImage, { 
                                  width: isSmallScreen ? 36 : 44,
                                  height: isSmallScreen ? 36 : 44,
                                  borderRadius: isSmallScreen ? 18 : 22
                                }]}
                              />
                            ) : (
                              <View style={[styles.instructorImagePlaceholder, { 
                                width: isSmallScreen ? 32 : 40,
                                height: isSmallScreen ? 32 : 40,
                                borderRadius: isSmallScreen ? 16 : 20
                              }]}>
                                <Ionicons name="person" size={isSmallScreen ? 16 : 20} color="#666" />
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.instructorLabel, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                Instructor
                              </Text>
                              <Text style={[styles.instructorName, { fontSize: isSmallScreen ? 14 : 16 }]} numberOfLines={1}>
                                {course.instructor}
                              </Text>
                            </View>
                          </View>
                          
                          <TouchableOpacity 
                            style={styles.viewButton}
                            onPress={() => handleCourseViewPress(course)}
                          >
                            <Text style={[styles.viewButtonText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                              View
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ));
                  })()}
                </View>
              )}
            </View>
          )}
        </>
      ) : (
        <></>
      )}

      {/* Payment Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>Payment Details</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedPayment && (
              <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Student Information
                  </Text>
                  <Text style={styles.modalText}>
                    Name: {selectedPayment.user_name}
                  </Text>
                  <Text style={styles.modalText}>
                    Email: {selectedPayment.email_id}
                  </Text>
                  <Text style={styles.modalText}>
                    Phone: {selectedPayment.phone_number}
                  </Text>
                  <Text style={styles.modalText}>
                    Current Role: {selectedPayment.user_role}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Course Information
                  </Text>
                  <Text style={styles.modalText}>
                    Course: {selectedPayment.course_name}
                  </Text>
                  <Text style={styles.modalText}>
                    Payment Month: {selectedPayment.month}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Payment Information
                  </Text>
                  <Text style={styles.modalText}>
                    Transaction ID: {selectedPayment.txn_id}
                  </Text>
                  <Text style={styles.modalText}>
                    Status: {selectedPayment.status}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Payment Screenshot
                  </Text>
                  <TouchableOpacity
                    style={styles.screenshotContainer}
                    onPress={() =>
                      Linking.openURL(selectedPayment.ss_uploaded_path)
                    }
                  >
                    <Image
                      source={{ uri: selectedPayment.ss_uploaded_path }}
                      style={styles.screenshotImage}
                    />
                    <Text style={styles.screenshotText}>
                      Tap to view full size
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[
                      styles.rejectButton,
                      approving && styles.rejectButtonDisabled,
                    ]}
                    onPress={() => rejectPayment(selectedPayment)}
                    disabled={approving}
                  >
                    {approving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons
                        name="close-outline"
                        size={20}
                        color="#fff"
                      />
                    )}
                    <Text style={styles.rejectButtonText}>
                      {approving ? "Rejecting..." : "Reject Payment"}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.approveButton,
                      approving && styles.approveButtonDisabled,
                    ]}
                    onPress={() => approvePayment(selectedPayment)}
                    disabled={approving}
                  >
                    {approving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons
                        name="checkmark-outline"
                        size={20}
                        color="#fff"
                      />
                    )}
                    <Text style={styles.approveButtonText}>
                      {approving ? "Approving..." : "Approve Payment"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Months Selection Modal */}
      <Modal
        visible={monthsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMonthsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  Select Month - {selectedCourse?.full_name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setMonthsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.monthsGrid}>
              {months.map((month) => (
                <TouchableOpacity
                  key={month}
                  style={styles.monthCard}
                  onPress={() => handleMonthPress(month)}
                >
                  <Text style={styles.monthText}>{month}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment History Modal */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  Payment History - {selectedCourse?.full_name} ({selectedMonth})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setHistoryModalVisible(false);
                  setSearchQuery("");
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or email..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearSearchButton}
                    onPress={() => setSearchQuery("")}
                  >
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {historyLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2E4064" />
                <Text style={styles.loadingText}>Loading payment history...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
                {filteredPaymentHistory.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons 
                      name={searchQuery ? "search-outline" : "receipt-outline"} 
                      size={60} 
                      color="#666" 
                    />
                    <Text style={styles.emptyStateTitle}>
                      {searchQuery ? "No Matching Results" : "No Payments Found"}
                    </Text>
                    <Text style={styles.emptyStateText}>
                      {searchQuery 
                        ? `No payments found matching "${searchQuery}"`
                        : `No successful payments recorded for ${selectedMonth}`
                      }
                    </Text>
                  </View>
                ) : (
                  <>
                    {searchQuery && (
                      <Text style={styles.searchResultsText}>
                        Found {filteredPaymentHistory.length} result{filteredPaymentHistory.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                    {filteredPaymentHistory.map((payment, index) => (
                      <View key={`${payment.user_id}-${payment.txn_id}`} style={styles.historyPaymentCard}>
                        <View style={styles.historyCardHeader}>
                          <Text style={styles.historyUserName}>{payment.user_name}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: "#D1FAE5" }]}>
                            <Text style={[styles.statusText, { color: "#065F46" }]}>Success</Text>
                          </View>
                        </View>

                        <View style={styles.historyDetailsContainer}>
                          <View style={styles.historyDetailRow}>
                            <Ionicons name="card-outline" size={16} color="#9CA3AF" />
                            <Text style={styles.historyDetailText}>TXN ID: {payment.txn_id}</Text>
                          </View>

                          <View style={styles.historyDetailRow}>
                            <Ionicons name="mail-outline" size={16} color="#9CA3AF" />
                            <Text style={styles.historyDetailText}>{payment.email_id}</Text>
                          </View>

                          <View style={styles.historyDetailRow}>
                            <Ionicons name="call-outline" size={16} color="#9CA3AF" />
                            <Text style={styles.historyDetailText}>{payment.phone_number}</Text>
                          </View>

                          {payment.ss_uploaded_path && (
                            <TouchableOpacity
                              style={styles.viewScreenshotButton}
                              onPress={() => Linking.openURL(payment.ss_uploaded_path)}
                            >
                              <Ionicons name="image-outline" size={16} color="#2E4064" />
                              <Text style={styles.viewScreenshotText}>View Screenshot</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

     
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  contentContainer: {
    padding: 20,
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
    fontSize: 16,
    color: "#9CA3AF",
  },
  title: {
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: "#1F2937",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "#fff",
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#374151",
    borderWidth: 1,
    borderColor: "#4B5563",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
  },
  uploadButton: {
    backgroundColor: "#374151",
    borderWidth: 2,
    borderColor: "#2E4064",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  uploadButtonText: {
    color: "#2E4064",
    fontWeight: "600",
    marginLeft: 8,
  },
  imagePreview: {
    marginTop: 12,
    position: "relative",
    alignItems: "center",
  },
  previewImage: {
    borderRadius: 8,
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#1F2937",
    borderRadius: 12,
  },
  saveButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#6B7280",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  currentInfoCard: {
    backgroundColor: "#1F2937",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  currentInfoTitle: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 8,
    fontWeight: "500",
    flex: 1,
    flexWrap: 'wrap',
  },
  infoDateText: {
    color: "#9CA3AF",
    marginLeft: 8,
  },
  // Tab styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  activeTabButton: {
    backgroundColor: "#2E4064",
  },
  tabButtonText: {
    color: "#9CA3AF",
    fontWeight: "600",
  },
  activeTabButtonText: {
    color: "#fff",
  },
  // Pending payments styles
  pendingLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  noPendingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  noPendingText: {
    color: "#9CA3AF",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  pendingPaymentsContainer: {
    gap: 16,
  },
  pendingPaymentTitle: {
    color: "#fff",
    fontWeight: "bold",
  },
  pendingPaymentStatus: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingStatusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  pendingPaymentDetails: {
    gap: 8,
    marginBottom: 16,
  },
  pendingDetailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pendingDetailText: {
    color: "#fff",
    marginLeft: 8,
    flex: 1,
  },
  viewDetailsButton: {
    backgroundColor: "#FF5734",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2E4064",
  },
  viewDetailsButtonText: {
    color: "#000",
    fontWeight: "600",
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1F2937",
    margin: 20,
    borderRadius: 12,
    maxHeight: "80%",
    width: "90%",
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    minHeight: 60,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 24,
  },
  modalCloseButton: {
    padding: 8,
    backgroundColor: '#BB2626',
    borderRadius: 20,
    marginLeft: 8,
    flexShrink: 0,
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginBottom: 4,
  },
  screenshotContainer: {
    alignItems: "center",
    backgroundColor: "#374151",
    borderRadius: 8,
    padding: 16,
  },
  screenshotImage: {
    width: 200,
    height: 300,
    borderRadius: 8,
    resizeMode: "contain",
  },
  screenshotText: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  modalActions: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#374151",
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    flex: 1,
  },
  approveButtonDisabled: {
    backgroundColor: "#6B7280",
  },
  approveButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  rejectButton: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    flex: 1,
  },
  rejectButtonDisabled: {
    backgroundColor: "#6B7280",
  },
  rejectButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  pendingPaymentsSection: {
    backgroundColor: "#1F2937",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    marginTop: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 16,
  },
  // Additional pending payment styles
  pendingPaymentCard: {
    backgroundColor: "#1F2937",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#374151",
  },
  pendingPaymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pendingInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  pendingLabel: {
    color: "#9CA3AF",
    fontWeight: "500",
    marginRight: 8,
  },
  pendingValue: {
    color: "#fff",
    fontWeight: "500",
  },
  pendingActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  detailsButton: {
    backgroundColor: "#2E4064",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  detailsButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  // Payment History Styles
  historyContainer: {
    flex: 1,
  },
  coursesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
    marginTop: 16,
  },
  courseCard: {
    margin: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
    maxWidth: 400, // Prevent cards from becoming too wide on large screens
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codenameTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    maxWidth: '60%',
  },
  codenameText: {
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
  },
  courseTitle: {
    fontWeight: 'bold',
    color: 'black',
    lineHeight: 22,
    marginBottom: 12,
  },
  courseInfo: {
    marginBottom: 16,
  },
  instructorSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  instructorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  instructorImage: {
    marginRight: 12,
  },
  instructorImagePlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  instructorLabel: {
    color: 'black',
    marginBottom: 2,
  },
  instructorName: {
    fontWeight: '600',
    color: 'black',
  },
  viewButton: {
    backgroundColor: '#FF5734',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'black',
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Months Grid Styles
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 20,
  },
  monthCard: {
    width: '22%',
    minWidth: 80,
    aspectRatio: 1,
    backgroundColor: '#2E4064',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  monthText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Payment History Modal Styles
  historyPaymentCard: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  historyDetailsContainer: {
    marginTop: 8,
  },
  historyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDetailText: {
    color: '#D1D5DB',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  viewScreenshotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  viewScreenshotText: {
    color: '#2E4064',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  searchContainer: {
    padding: 16,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchResultsText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default PaymentManagementPage;
