import { supabase } from "@/lib/supabase";
import { getCurrentDate, getCurrentMonthName, getCurrentYear } from '@/utils/testDate';
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Course {
  id: string;
  full_name: string;
  fees_monthly: number;
  fees_total?: number;
  course_type: string;
  codename: string;
  instructor: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone_no: string;
}

interface PaymentComponentProps {
  courseId: string;
  paymentMonth?: string; // Optional specific month to pay for
  onPaymentSuccess?: () => void;
  onBack?: () => void;
}

interface PaymentInfo {
  id: number;
  phone_number: string;
  upi_id: string;
  qr_code: string;
}

const PaymentComponent: React.FC<PaymentComponentProps> = ({
  courseId,
  paymentMonth,
  onPaymentSuccess,
  onBack,
}) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get("window"));

  // Form state - will be auto-filled from user session
  const [transactionId, setTransactionId] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(
    null
  );
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");

  // Get current month name (or specific payment month)
  const getPaymentMonthName = () => {
    // If a specific payment month is provided, use that
    if (paymentMonth) {
      return paymentMonth;
    }

    // Use centralized date utility
    return getCurrentMonthName();
  };

  // Helper functions for course type-based fee rendering
  const getCourseFee = (course: Course) => {
    return course.course_type === 'Core Curriculum' ? course.fees_monthly : course.fees_total || 0;
  };

  const getFeeLabel = (course: Course) => {
    return course.course_type === 'Core Curriculum' ? 'Monthly Fee' : 'Total Fee';
  };

  const getFeeDisplay = (course: Course) => {
    const fee = getCourseFee(course);
    const feeType = course.course_type === 'Core Curriculum' ? '/month' : '';
    return `₹${fee}${feeType}`;
  };

  useEffect(() => {
    const onChange = (result: { window: any }) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener("change", onChange);
    return () => subscription?.remove();
  }, []);

  const fetchUserSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError);
        Alert.alert(
          "Authentication Error",
          "Please login to continue with payment"
        );
        return null;
      }

      if (!session?.user) {
        Alert.alert(
          "Authentication Required",
          "Please login to continue with payment"
        );
        return null;
      }

      // Fetch user details from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, name, email, phone_no")
        .eq("id", session.user.id)
        .single();

      if (userError) {
        console.error("Error fetching user:", userError);
        Alert.alert("Error", "Failed to fetch user details");
        return null;
      }

      return userData;
    } catch (error) {
      console.error("Error in fetchUserSession:", error);
      Alert.alert("Error", "Failed to fetch user session");
      return null;
    }
  }, []);

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      Alert.alert("Error", "No course selected");
      onBack?.();
      return;
    }

    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, full_name, fees_monthly, fees_total, course_type, codename, instructor")
        .eq("id", courseId)
        .single();

      if (error) {
        console.error("Error fetching course:", error);
        Alert.alert("Error", "Failed to fetch course details");
        onBack?.();
        return;
      }

      setCourse(data);
    } catch (error) {
      console.error("Error in fetchCourse:", error);
      Alert.alert("Error", "Failed to fetch course details");
      onBack?.();
    }
  }, [courseId, onBack]);

  const fetchPaymentInfo = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("payment_info")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching payment info:", error);
        // Don't show alert, just use default values
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in fetchPaymentInfo:", error);
      return null;
    }
  }, []);

  const initializeComponent = useCallback(async () => {
    setLoading(true);

    // Fetch user session, course details, and payment info
    const [userData, , paymentData] = await Promise.all([
      fetchUserSession(),
      fetchCourse(),
      fetchPaymentInfo(),
    ]);

    if (userData) {
      setUser(userData);
      // Auto-fill form with user data
      setStudentName(userData.name);
      setStudentEmail(userData.email);
      setStudentPhone(userData.phone_no);
    }

    if (paymentData) {
      setPaymentInfo(paymentData);
    }

    setLoading(false);
  }, [fetchUserSession, fetchCourse, fetchPaymentInfo]);

  useEffect(() => {
    initializeComponent();
  }, [initializeComponent]);

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

  const uploadScreenshotToStorage = async (
    imageUri: string,
    userId: string
  ): Promise<string | null> => {
    try {
      const currentMonth = getPaymentMonthName();

      // Create file path: Payment-Data/{userId}/{currentMonth}/ss.png
      const filePath = `Payment-Data/${userId}/${currentMonth}/ss.png`;

      // Delete old image first if it exists
      console.log("Removing previous screenshot if exists...");
      await supabase.storage
        .from("inside-inspiration-academy-assets")
        .remove([filePath]);

      console.log("Converting image to ArrayBuffer...");
      const arrayBuffer = await uriToBlob(imageUri);

      console.log("Uploading new screenshot...");
      // Upload to Supabase storage
      const { error } = await supabase.storage
        .from("inside-inspiration-academy-assets")
        .upload(filePath, arrayBuffer, {
          cacheControl: "3600",
          contentType: "image/png",
          upsert: true, // Replace if exists
        });

      if (error) {
        console.error("Storage upload error:", error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("inside-inspiration-academy-assets")
        .getPublicUrl(filePath);

      console.log("Upload successful, public URL:", urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading screenshot:", error);
      return null;
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload payment screenshot."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [9, 16], // 9:16 aspect ratio instead of 4:3
        quality: 1, // Higher quality like profile
      });

      if (!result.canceled && result.assets[0]) {
        setPaymentScreenshot(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleSubmitPayment = async () => {
    if (!course || !user) return;

    // Validation
    if (!studentName.trim()) {
      Alert.alert("Validation Error", "Please enter your name");
      return;
    }
    if (!studentEmail.trim() || !studentEmail.includes("@")) {
      Alert.alert("Validation Error", "Please enter a valid email address");
      return;
    }
    if (!studentPhone.trim() || studentPhone.length < 10) {
      Alert.alert("Validation Error", "Please enter a valid phone number");
      return;
    }
    if (!transactionId.trim()) {
      Alert.alert("Validation Error", "Please enter the transaction ID");
      return;
    }
    if (!paymentScreenshot) {
      Alert.alert("Validation Error", "Please upload the payment screenshot");
      return;
    }

    setSubmitting(true);

    try {
      // Upload screenshot to storage
      const screenshotUrl = await uploadScreenshotToStorage(
        paymentScreenshot,
        user.id
      );

      if (!screenshotUrl) {
        Alert.alert(
          "Error",
          "Failed to upload payment screenshot. Please try again."
        );
        setSubmitting(false);
        return;
      }

      const currentMonth = getPaymentMonthName();

      // Prepare payment data object
      const paymentData = {
        user_id: user.id,
        txn_id: transactionId.trim(),
        ss_uploaded_path: screenshotUrl,
        email_id: studentEmail.trim(),
        phone_number: studentPhone.trim(),
        status: "pending",
      };

      // Check if fees record exists for this course
      const { data: existingFees, error: fetchError } = await supabase
        .from("fees")
        .select(`id, "${currentMonth}"`)
        .eq("id", course.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching fees:", fetchError);
        Alert.alert("Error", "Failed to process payment. Please try again.");
        setSubmitting(false);
        return;
      }

      let currentMonthData = [];

      if (existingFees) {
        // Get existing data for current month
        currentMonthData = existingFees[currentMonth] || [];

        // Add new payment data
        currentMonthData.push(paymentData);

        // Update existing record
        const { error: updateError } = await supabase
          .from("fees")
          .update({ [currentMonth]: currentMonthData })
          .eq("id", course.id);

        if (updateError) {
          console.error("Error updating fees:", updateError);
          Alert.alert(
            "Error",
            "Failed to submit payment details. Please try again."
          );
          setSubmitting(false);
          return;
        }
      } else {
        // Create new fees record
        currentMonthData.push(paymentData);

        const { error: insertError } = await supabase.from("fees").insert({
          id: course.id,
          [currentMonth]: currentMonthData,
          fees_total: getCourseFee(course),
        });

        if (insertError) {
          console.error("Error inserting fees:", insertError);
          Alert.alert(
            "Error",
            "Failed to submit payment details. Please try again."
          );
          setSubmitting(false);
          return;
        }
      }

      Alert.alert(
        "Payment Submitted",
        "Your payment details have been submitted successfully. We will verify your payment and activate your course access within 24 hours.",
        [
          {
            text: "OK",
            onPress: () => {
              // Clear form data after successful submission
              setTransactionId("");
              setPaymentScreenshot(null);

              onPaymentSuccess?.();
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in handleSubmitPayment:", error);
      Alert.alert(
        "Error",
        "Failed to submit payment details. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E4064" />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  if (!course || !user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text style={styles.errorText}>
          {!user ? "Please login to continue" : "Course not found"}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSmallScreen = screenData.width < 600;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.title, { fontSize: isSmallScreen ? 20 : 24 }]}>
          Complete Payment
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Course Details */}
      <View style={styles.courseCard}>
        <Text
          style={[styles.courseTitle, { fontSize: isSmallScreen ? 18 : 20 }]}
        >
          {course.full_name}
        </Text>
        <View style={styles.courseTypeContainer}>
          <Text
            style={[
              styles.courseTypeBadge,
              course.course_type === 'Core Curriculum'
                ? styles.coreTypeBadge
                : styles.electiveTypeBadge
            ]}
          >
            {course.course_type}
          </Text>
        </View>
        <Text
          style={[styles.courseCode, { fontSize: isSmallScreen ? 14 : 16 }]}
        >
          Course Code: {course.codename}
        </Text>
        <Text
          style={[styles.instructor, { fontSize: isSmallScreen ? 14 : 16 }]}
        >
          Instructor: {course.instructor}
        </Text>
        <Text style={[styles.monthInfo, { fontSize: isSmallScreen ? 14 : 16 }]}>
          Payment for: {getPaymentMonthName()} {getCurrentYear()}
          {paymentMonth && paymentMonth !== getCurrentDate().toLocaleString('default', { month: 'short' }) && (
            <Text style={styles.chronologicalNote}> (Chronological Payment)</Text>
          )}
        </Text>
        <View style={styles.amountContainer}>
          <Text
            style={[styles.amountLabel, { fontSize: isSmallScreen ? 16 : 18 }]}
          >
            {getFeeLabel(course)}:
          </Text>
          <Text style={[styles.amount, { fontSize: isSmallScreen ? 20 : 24 }]}>
            {getFeeDisplay(course)}
          </Text>
        </View>
      </View>

      {/* Payment Information */}
      <View style={styles.paymentInfoCard}>
        <Text
          style={[styles.sectionTitle, { fontSize: isSmallScreen ? 16 : 18 }]}
        >
          Payment Information
        </Text>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <Image
            source={{
              uri:
                paymentInfo?.qr_code ||
                "https://via.placeholder.com/200x200/2E4064/FFFFFF?text=QR+CODE",
            }}
            style={[
              styles.qrCode,
              {
                width: isSmallScreen ? 160 : 200,
                height: isSmallScreen ? 160 : 200,
              },
            ]}
          />
        </View>

        {/* Payment Details */}
        <View style={styles.paymentDetails}>
          <View style={styles.paymentRow}>
            <Ionicons name="card-outline" size={20} color="#2E4064" />
            <View style={styles.paymentTextContainer}>
              <Text
                style={[
                  styles.paymentLabel,
                  { fontSize: isSmallScreen ? 14 : 16 },
                ]}
              >
                UPI ID:
              </Text>
              <Text
                style={[
                  styles.paymentValue,
                  { fontSize: isSmallScreen ? 14 : 16 },
                ]}
              >
                {paymentInfo?.upi_id || "inspiration@paytm"}
              </Text>
            </View>
          </View>

          <View style={styles.paymentRow}>
            <Ionicons name="call-outline" size={20} color="#2E4064" />
            <View style={styles.paymentTextContainer}>
              <Text
                style={[
                  styles.paymentLabel,
                  { fontSize: isSmallScreen ? 14 : 16 },
                ]}
              >
                Google Pay / PhonePe:
              </Text>
              <Text
                style={[
                  styles.paymentValue,
                  { fontSize: isSmallScreen ? 14 : 16 },
                ]}
              >
                {paymentInfo?.phone_number || "+91 9876543210"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Form */}
      <View style={styles.formCard}>
        <Text
          style={[styles.sectionTitle, { fontSize: isSmallScreen ? 16 : 18 }]}
        >
          Payment Confirmation
        </Text>

        {/* Auto-filled Student Details */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={styles.textInput}
            value={studentName}
            onChangeText={setStudentName}
            placeholder="Enter your full name"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address *</Text>
          <TextInput
            style={styles.textInput}
            value={studentEmail}
            onChangeText={setStudentEmail}
            placeholder="Enter your email address"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.textInput}
            value={studentPhone}
            onChangeText={setStudentPhone}
            placeholder="Enter your phone number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Transaction ID *</Text>
          <TextInput
            style={styles.textInput}
            value={transactionId}
            onChangeText={setTransactionId}
            placeholder="Enter transaction ID from your payment app"
            placeholderTextColor="#999"
          />
        </View>

        {/* Screenshot Upload */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Payment Screenshot *</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Ionicons name="cloud-upload-outline" size={24} color="#2E4064" />
            <Text style={styles.uploadButtonText}>
              {paymentScreenshot ? "Change Screenshot" : "Upload Screenshot"}
            </Text>
          </TouchableOpacity>

          {paymentScreenshot && (
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: paymentScreenshot }}
                style={styles.previewImage}
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setPaymentScreenshot(null)}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitPayment}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#fff"
              />
              <Text style={styles.submitButtonText}>
                Submit Payment Details
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.noteText}>
          * After submitting, your payment will be verified within 24 hours and
          course access will be activated.
        </Text>
      </View>
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
    color: "#666",
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
  title: {
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#fff",
  },
  courseCard: {
    backgroundColor: "#1F2937",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#374151",
  },
  courseTitle: {
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  courseTypeContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  courseTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  coreTypeBadge: {
    backgroundColor: "#10B981",
    color: "#fff",
  },
  electiveTypeBadge: {
    backgroundColor: "#F59E0B",
    color: "#fff",
  },
  courseCode: {
    color: "#9CA3AF",
    marginBottom: 4,
  },
  instructor: {
    color: "#9CA3AF",
    marginBottom: 4,
  },
  monthInfo: {
    color: "#10B981",
    marginBottom: 16,
    fontWeight: "600",
  },
  amountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  amountLabel: {
    color: "#fff",
    fontWeight: "600",
  },
  amount: {
    color: "#10B981",
    fontWeight: "bold",
  },
  paymentInfoCard: {
    backgroundColor: "#1F2937",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#374151",
  },
  sectionTitle: {
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  qrCode: {
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  paymentDetails: {
    gap: 12,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#374151",
    padding: 12,
    borderRadius: 8,
  },
  paymentTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  paymentLabel: {
    color: "#9CA3AF",
    marginBottom: 2,
  },
  paymentValue: {
    color: "#fff",
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: "#1F2937",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#374151",
    borderWidth: 1,
    borderColor: "#4B5563",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  imagePreview: {
    marginTop: 12,
    position: "relative",
    alignItems: "center",
  },
  previewImage: {
    width: 180,
    height: 320, // 9:16 aspect ratio (180 * 16/9 = 320)
    borderRadius: 8,
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: 10, // Adjusted for new image width
    backgroundColor: "#1F2937",
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: "#6B7280",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  noteText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  placeholder: {
    width: 24, // Same width as back button for centering
  },
  chronologicalNote: {
    color: "#F59E0B",
    fontWeight: "600",
    fontSize: 12,
  },
});

export default PaymentComponent;
