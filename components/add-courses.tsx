import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import CodenameIcon from "./icons/CodenameIcon";

// Generate UUID function
const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface ClassSchedule {
  day: string;
  startTime: string;
  endTime: string;
}

interface Instructor {
  id: string;
  name: string;
  user_image: string;
}

interface CourseFormData {
  codename: string;
  fullName: string;
  courseType: "Core Curriculum" | "Elective";
  instructor: string;
  semester: string;
  courseDuration: string;
  feesMonthly: string;
  feesTotal: string;
  classSchedules: ClassSchedule[];
  imageUri?: string;
  codenameColor: string;
  fullNameColor: string;
}

interface AddCoursesModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (courseData: CourseFormData) => void;
}

// Color Picker Component
interface ColorPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onColorSelect: (color: string) => void;
  initialColor: string;
  excludeColor?: string; // Color to exclude from selection
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  visible,
  onClose,
  onColorSelect,
  initialColor,
  excludeColor,
}) => {
  const [selectedColor, setSelectedColor] = useState(initialColor);

  const presetColors = [
    // Reds
    "#FF6B6B", "#FF5733", "#E74C3C", "#C0392B", "#8E44AD", "#922B21",
    "#F1948A", "#EC7063", "#CD6155", "#A93226", "#FF4757", "#FF3838",
    "#DC143C", "#B22222", "#8B0000", "#FF1744", "#D50000", "#B71C1C",
    
    // Oranges
    "#F39C12", "#E67E22", "#D35400", "#FF7043", "#FF5722", "#F4511E",
    "#FF8A65", "#FFAB40", "#FF9800", "#FB8C00", "#F57C00", "#E65100",
    "#FF6F00", "#FF8F00", "#FFA000", "#FFB300", "#FFC107", "#FFCA28",
    
    // Yellows
    "#FFEAA7", "#F7DC6F", "#F1C40F", "#F39800", "#FDD835", "#FFEB3B",
    "#FFEE58", "#FFF176", "#FFF59D", "#FFF9C4", "#FFFDE7", "#F8BBD9",
    "#F5B041", "#F8C471", "#FCDC00", "#FFD700", "#FFFF00", "#FFFFE0",
    
    // Greens
    "#96CEB4", "#82E0AA", "#58D68D", "#52C41A", "#389E0D", "#237804",
    "#135200", "#52C41A", "#73D13D", "#95DE64", "#B7EB8F", "#D9F7BE",
    "#4CAF50", "#66BB6A", "#81C784", "#A5D6A7", "#C8E6C9", "#E8F5E8",
    
    // Blues
    "#4ECDC4", "#45B7D1", "#85C1E9", "#5DADE2", "#3498DB", "#2980B9",
    "#2471A3", "#1B4F72", "#2196F3", "#42A5F5", "#64B5F6", "#90CAF9",
    "#BBDEFB", "#E3F2FD", "#03A9F4", "#29B6F6", "#4FC3F7", "#81D4FA",
    
    // Purples
    "#DDA0DD", "#BB8FCE", "#A569BD", "#8E44AD", "#7B68EE", "#6A5ACD",
    "#483D8B", "#4B0082", "#9C27B0", "#AB47BC", "#BA68C8", "#CE93D8",
    "#E1BEE7", "#F3E5F5", "#673AB7", "#7986CB", "#9575CD", "#B39DDB",
    
    // Pinks
    "#F8BBD9", "#F48FB1", "#F06292", "#EC407A", "#E91E63", "#C2185B",
    "#AD1457", "#880E4F", "#FF4081", "#FF80AB", "#FFAB91", "#FFCDD2",
    "#FCE4EC", "#F8BBD9", "#E1BEE7", "#D1C4E9", "#C5CAE9", "#BBDEFB",
    
    // Grays
    "#85929E", "#95A5A6", "#BDC3C7", "#D5DBDB", "#EAEDED", "#F8F9FA",
    "#212529", "#343A40", "#495057", "#6C757D", "#ADB5BD", "#CED4DA",
    "#DEE2E6", "#E9ECEF", "#F8F9FA", "#FFFFFF", "#000000", "#2C3E50"
  ];

  // Filter out the excluded color
  const availableColors = excludeColor 
    ? presetColors.filter(color => color !== excludeColor)
    : presetColors;

  const handleColorConfirm = () => {
    onColorSelect(selectedColor);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={colorPickerStyles.modalOverlay}>
        <View style={colorPickerStyles.modalContent}>
          <View style={colorPickerStyles.header}>
            <Text style={colorPickerStyles.title}>Choose Color</Text>
            <TouchableOpacity
              onPress={onClose}
              style={colorPickerStyles.closeButton}
            >
              <Text style={colorPickerStyles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View style={colorPickerStyles.presetsContainer}>
              <Text style={colorPickerStyles.sectionTitle}>Preset Colors</Text>
              {excludeColor && (
                <Text style={colorPickerStyles.excludeHint}>
                  Note: Some colors are hidden to avoid duplication with other fields
                </Text>
              )}
              <View style={colorPickerStyles.presetColors}>
                {availableColors.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      colorPickerStyles.presetColor,
                      { backgroundColor: color },
                      selectedColor === color &&
                        colorPickerStyles.selectedPreset,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <Text
                        style={{
                          color: "white",
                          fontSize: 20,
                          textAlign: "center",
                        }}
                      >
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={colorPickerStyles.previewContainer}>
              <Text style={colorPickerStyles.previewLabel}>
                Selected Color:
              </Text>
              <View
                style={[
                  colorPickerStyles.colorPreview,
                  { backgroundColor: selectedColor },
                ]}
              />
              <Text style={colorPickerStyles.colorText}>{selectedColor}</Text>
            </View>
            <View style={colorPickerStyles.buttonContainer}>
              <TouchableOpacity
                style={[
                  colorPickerStyles.button,
                  colorPickerStyles.cancelButton,
                ]}
                onPress={onClose}
              >
                <Text style={colorPickerStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  colorPickerStyles.button,
                  colorPickerStyles.confirmButton,
                ]}
                onPress={handleColorConfirm}
              >
                <Text style={colorPickerStyles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const AddCoursesModal: React.FC<AddCoursesModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<CourseFormData>({
    codename: "",
    fullName: "",
    courseType: "Core Curriculum",
    instructor: "",
    semester: "1st Semester",
    courseDuration: "",
    feesMonthly: "",
    feesTotal: "",
    classSchedules: [
      {
        day: "Sunday",
        startTime: "19:30",
        endTime: "21:30",
      },
    ],
    codenameColor: "#FF6B6B",
    fullNameColor: "#4ECDC4",
  });

  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [showInstructorPicker, setShowInstructorPicker] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  const [showTimePicker, setShowTimePicker] = useState<{
    show: boolean;
    scheduleIndex: number;
    type: "start" | "end";
  }>({ show: false, scheduleIndex: -1, type: "start" });

  const [colorPickerState, setColorPickerState] = useState<{
    visible: boolean;
    field: "codenameColor" | "fullNameColor" | null;
  }>({ visible: false, field: null });

  const [showSemesterPicker, setShowSemesterPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState<number | null>(null); // Track which schedule's day picker is open

  const semesters = [
    "1st Semester",
    "2nd Semester",
    "3rd Semester",
    "4th Semester",
    "5th Semester",
    "6th Semester",
    "7th Semester",
    "8th Semester",
  ];

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Fetch instructors from Supabase
  const fetchInstructors = useCallback(async () => {
    // Skip if not in browser environment (SSR)
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      setLoadingInstructors(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, name, user_image")
        .in("role", ["teacher", "admin"]);

      if (error) {
        console.error("Error fetching instructors:", error);
        Alert.alert("Error", "Failed to fetch instructors");
        return;
      }

      if (data) {
        const formattedInstructors: Instructor[] = data.map((user) => ({
          id: user.id,
          name: user.name,
          user_image:
            user.user_image ||
            "https://ideogram.ai/assets/image/lossless/response/SkOxfnd_TdKmbNfTZ1ObbA",
        }));
        setInstructors(formattedInstructors);

        // Set first instructor as default if none selected
        if (formattedInstructors.length > 0 && !formData.instructor) {
          setFormData((prev) => ({
            ...prev,
            instructor: formattedInstructors[0].name,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching instructors:", error);
      Alert.alert("Error", "Failed to fetch instructors");
    } finally {
      setLoadingInstructors(false);
    }
  }, [formData.instructor]);

  // Fetch instructors when modal opens
  useEffect(() => {
    if (visible) {
      fetchInstructors();
    }
  }, [visible, fetchInstructors]);

  const handleInputChange = (field: keyof CourseFormData, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Auto-calculate total fees for elective courses
      if (field === "feesMonthly" || field === "courseDuration") {
        if (
          newData.courseType === "Elective" &&
          newData.feesMonthly &&
          newData.courseDuration
        ) {
          const monthly = parseFloat(newData.feesMonthly) || 0;
          const duration = parseFloat(newData.courseDuration) || 0;
          newData.feesTotal = (monthly * duration).toString();
        }
      }

      // Clear total fees if switching to Core Curriculum
      if (field === "courseType" && value === "Core Curriculum") {
        newData.feesTotal = "";
      }

      return newData;
    });
  };

  const openColorPicker = (field: "codenameColor" | "fullNameColor") => {
    setColorPickerState({ visible: true, field });
  };

  const getExcludeColor = (field: "codenameColor" | "fullNameColor" | null): string | undefined => {
    if (field === "codenameColor") {
      return formData.fullNameColor;
    } else if (field === "fullNameColor") {
      return formData.codenameColor;
    }
    return undefined;
  };

  const handleColorSelect = (color: string) => {
    if (colorPickerState.field) {
      setFormData((prev) => ({ ...prev, [colorPickerState.field!]: color }));
    }
    setColorPickerState({ visible: false, field: null });
  };

  const handleImagePicker = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission required",
          "Permission to access camera roll is required!"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setFormData((prev) => ({ ...prev, imageUri: result.assets[0].uri }));
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const addSchedule = () => {
    const newSchedule: ClassSchedule = {
      day: "Sunday",
      startTime: "19:30",
      endTime: "21:30",
    };
    setFormData((prev) => ({
      ...prev,
      classSchedules: [...prev.classSchedules, newSchedule],
    }));
  };

  const removeSchedule = (index: number) => {
    if (formData.classSchedules.length > 1) {
      setFormData((prev) => ({
        ...prev,
        classSchedules: prev.classSchedules.filter((_, i) => i !== index),
      }));
      // Close day picker if it was open for the removed schedule
      if (showDayPicker === index) {
        setShowDayPicker(null);
      } else if (showDayPicker !== null && showDayPicker > index) {
        setShowDayPicker(showDayPicker - 1);
      }
    }
  };

  const updateSchedule = (
    index: number,
    field: keyof ClassSchedule,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      classSchedules: prev.classSchedules.map((schedule, i) =>
        i === index ? { ...schedule, [field]: value } : schedule
      ),
    }));
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker({ show: false, scheduleIndex: -1, type: "start" });

    if (selectedDate && showTimePicker.scheduleIndex !== -1) {
      const timeString = selectedDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      updateSchedule(
        showTimePicker.scheduleIndex,
        showTimePicker.type === "start" ? "startTime" : "endTime",
        timeString
      );
    }
  };

  const showTimePickerModal = (
    scheduleIndex: number,
    type: "start" | "end"
  ) => {
    setShowTimePicker({ show: true, scheduleIndex, type });
  };

  const validateForm = (): boolean => {
    if (!formData.codename.trim()) {
      Alert.alert("Error", "Please enter course code name");
      return false;
    }
    if (!formData.fullName.trim()) {
      Alert.alert("Error", "Please enter course full name");
      return false;
    }
    if (!formData.instructor.trim()) {
      Alert.alert("Error", "Please select an instructor");
      return false;
    }
    if (!formData.feesMonthly.trim()) {
      Alert.alert("Error", "Please enter monthly fees");
      return false;
    }
    if (formData.courseType === "Elective" && !formData.courseDuration.trim()) {
      Alert.alert("Error", "Please enter course duration for elective courses");
      return false;
    }
    return true;
  };

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

  const uploadCourseImage = async (
    courseId: string,
    imageUri: string
  ): Promise<string | null> => {
    if (!imageUri) return null;

    const path = `Course-data/${courseId}/course_logo.jpg`;

    try {
      console.log("Converting image to ArrayBuffer...");
      const arrayBuffer = await uriToBlob(imageUri);

      console.log("Uploading course image...");
      const { error } = await supabase.storage
        .from("inside-inspiration-academy-assets")
        .upload(path, arrayBuffer, {
          cacheControl: "3600",
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("inside-inspiration-academy-assets")
        .getPublicUrl(path);

      console.log(
        "Course image upload successful, public URL:",
        data.publicUrl
      );
      return data.publicUrl;
    } catch (error) {
      console.error("Course image upload error:", error);
      return null;
    }
  };

  const submitCourse = async (): Promise<boolean> => {
    // Skip if not in browser environment (SSR)
    if (typeof window === 'undefined') {
      return false;
    }
    
    try {
      // Generate UUID for the course
      const courseId = generateUUID();

      console.log("Starting course submission with ID:", courseId);

      // Try to upload image, but don't let it block course creation
      let courseLogoUrl =
        "https://images.unsplash.com/photo-1523289333742-be1143f6b766?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      let imageUploadSuccess = false;

      if (formData.imageUri) {
        try {
          console.log("Attempting course image upload...");
          const uploadedUrl = await uploadCourseImage(
            courseId,
            formData.imageUri
          );
          if (uploadedUrl) {
            courseLogoUrl = uploadedUrl;
            imageUploadSuccess = true;
            console.log("Course image upload successful");
          }
        } catch (imageError) {
          console.warn(
            "Course image upload failed, continuing with course creation:",
            imageError
          );
          // Continue with course creation even if image upload fails
        }
      }

      // Get instructor image
      const selectedInstructor = instructors.find(
        (inst) => inst.name === formData.instructor
      );
      const instructorImage = selectedInstructor?.user_image || null;

      // Format class schedule
      const classScheduleJson = JSON.stringify(
        formData.classSchedules.map((schedule) => ({
          day: schedule.day,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        }))
      );

      // Prepare course data for database
      const courseData = {
        id: courseId,
        codename: formData.codename,
        codename_color: formData.codenameColor,
        full_name: formData.fullName,
        full_name_color: formData.fullNameColor,
        course_type: formData.courseType,
        semester: parseInt(
          formData.semester.split("st")[0] ||
            formData.semester.split("nd")[0] ||
            formData.semester.split("rd")[0] ||
            formData.semester.split("th")[0]
        ),
        class_schedule: classScheduleJson,
        course_logo: courseLogoUrl,
        course_duration: formData.courseDuration
          ? parseFloat(formData.courseDuration)
          : null,
        fees_monthly: parseFloat(formData.feesMonthly),
        fees_total: formData.feesTotal ? parseFloat(formData.feesTotal) : null,
        instructor: formData.instructor,
        instructor_image: instructorImage,
      };

      console.log("Submitting course data:", courseData);

      // Insert into Supabase
      const { error } = await supabase.from("courses").insert([courseData]);

      if (error) {
        console.error("Error inserting course:", error);
        Alert.alert("Error", "Failed to create course. Please try again.");
        return false;
      }

      console.log("Course creation successful");

      // Show appropriate success message
      const successMessage = imageUploadSuccess
        ? "Course created successfully!"
        : "Course created successfully! (Image upload failed, but your course was saved with default image)";

      Alert.alert("Success", successMessage);
      return true;
    } catch (error) {
      console.error("Error submitting course:", error);
      Alert.alert("Error", "Failed to create course. Please try again.");
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Show loading state
    Alert.alert("Creating Course", "Please wait...");

    const success = await submitCourse();

    if (success) {
      if (onSubmit) {
        onSubmit(formData);
      }

      // Reset form
      setFormData({
        codename: "",
        fullName: "",
        courseType: "Core Curriculum",
        instructor: "",
        semester: "1st Semester",
        courseDuration: "",
        feesMonthly: "",
        feesTotal: "",
        classSchedules: [
          {
            day: "Sunday",
            startTime: "19:30",
            endTime: "21:30",
          },
        ],
        codenameColor: "#FF6B6B",
        fullNameColor: "#4ECDC4",
        imageUri: undefined,
      });

      onClose();
    }
  };

  const handleCancel = () => {
    setFormData({
      codename: "",
      fullName: "",
      courseType: "Core Curriculum",
      instructor: "",
      semester: "1st Semester",
      courseDuration: "",
      feesMonthly: "",
      feesTotal: "",
      classSchedules: [
        {
          day: "Sunday",
          startTime: "19:30",
          endTime: "21:30",
        },
      ],
      codenameColor: "#FF6B6B",
      fullNameColor: "#4ECDC4",
      imageUri: undefined,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      style={{ pointerEvents: 'auto'}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleImagePicker}
              style={styles.imageContainer}
            >
              {formData.imageUri ? (
                <Image
                  source={{ uri: formData.imageUri }}
                  style={styles.courseImage}
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.uploadIcon}>☁</Text>
                  <Text style={styles.uploadText}>Upload Course Logo</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New Course</Text>
          </View>
          <ScrollView
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <CodenameIcon height={24} width={24} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter the codename of course"
                  value={formData.codename}
                  onChangeText={(text) => handleInputChange("codename", text)}
                />
                <TouchableOpacity
                  style={[
                    styles.colorPickerButton,
                    { backgroundColor: formData.codenameColor },
                  ]}
                  onPress={() => openColorPicker("codenameColor")}
                >
                  <Text style={styles.colorPickerIcon}>🎨</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <Image
                  source={require("../assets/images/fullname.png")}
                  style={styles.inputImage}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter the full name of course"
                  value={formData.fullName}
                  onChangeText={(text) => handleInputChange("fullName", text)}
                />
                <TouchableOpacity
                  style={[
                    styles.colorPickerButton,
                    { backgroundColor: formData.fullNameColor },
                  ]}
                  onPress={() => openColorPicker("fullNameColor")}
                >
                  <Text style={styles.colorPickerIcon}>🎨</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Course Type */}
            <View style={styles.sectionGroup}>
              <Text style={styles.sectionTitle}>
                Define the type of the course
              </Text>
              <View style={styles.typeOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.courseType === "Core Curriculum" &&
                      styles.selectedTypeButton,
                  ]}
                  onPress={() =>
                    handleInputChange("courseType", "Core Curriculum")
                  }
                >
                  <Text style={styles.typeIcon}>🎓</Text>
                  <Text
                    style={[
                      styles.typeText,
                      formData.courseType === "Core Curriculum" &&
                        styles.selectedTypeText,
                    ]}
                  >
                    Core{"\n"}Curriculum
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.courseType === "Elective" &&
                      styles.selectedTypeButton,
                  ]}
                  onPress={() => handleInputChange("courseType", "Elective")}
                >
                  <Text style={styles.typeIcon}>📚</Text>
                  <Text
                    style={[
                      styles.typeText,
                      formData.courseType === "Elective" &&
                        styles.selectedTypeText,
                    ]}
                  >
                    Elective{"\n"}Courses
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.typeHint}>
                {formData.courseType === "Core Curriculum"
                  ? "Core courses require only monthly fees"
                  : "Elective courses require duration and auto-calculate total fees"}
              </Text>
            </View>

            {/* Instructor */}
            <View style={[styles.sectionGroup, styles.dropdownSection]}>
              <Text style={styles.sectionTitle}>
                Who will be the Instructor of the course?
              </Text>
              <View
                style={[
                  styles.instructorDropdownWrapper,
                  showInstructorPicker && { marginBottom: 250 },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.instructorButton,
                    showInstructorPicker && styles.instructorButtonActive,
                  ]}
                  onPress={() => {
                    setShowInstructorPicker(!showInstructorPicker);
                    setShowSemesterPicker(false); // Close semester dropdown
                    setShowDayPicker(null); // Close day dropdown
                  }}
                  disabled={loadingInstructors}
                >
                  <View style={styles.instructorContent}>
                    <Image
                      source={{
                        uri:
                          instructors.find(
                            (inst) => inst.name === formData.instructor
                          )?.user_image ||
                          "https://ideogram.ai/assets/image/lossless/response/SkOxfnd_TdKmbNfTZ1ObbA",
                      }}
                      style={styles.instructorAvatar}
                    />
                    <Text style={styles.instructorName}>
                      {loadingInstructors
                        ? "Loading..."
                        : formData.instructor || "Select Instructor"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.dropdownArrow,
                      showInstructorPicker && styles.dropdownArrowRotated,
                    ]}
                  >
                    ▼
                  </Text>
                </TouchableOpacity>

                {showInstructorPicker && instructors.length > 0 && (
                  <View style={styles.instructorDropdownContainer}>
                    {instructors.map((instructor, index) => (
                      <TouchableOpacity
                        key={instructor.id}
                        style={[
                          styles.instructorDropdownItem,
                          formData.instructor === instructor.name &&
                            styles.selectedInstructorDropdownItem,
                          index === instructors.length - 1 &&
                            styles.lastInstructorDropdownItem,
                        ]}
                        onPress={() => {
                          handleInputChange("instructor", instructor.name);
                          setShowInstructorPicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.instructorDropdownContent}>
                          <Image
                            source={{ uri: instructor.user_image }}
                            style={styles.instructorDropdownAvatar}
                          />
                          <Text
                            style={[
                              styles.instructorDropdownText,
                              formData.instructor === instructor.name &&
                                styles.selectedInstructorDropdownText,
                            ]}
                          >
                            {instructor.name}
                          </Text>
                        </View>
                        {formData.instructor === instructor.name && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {showInstructorPicker &&
                  instructors.length === 0 &&
                  !loadingInstructors && (
                    <View style={styles.noInstructorsContainer}>
                      <Text style={styles.noInstructorsText}>
                        No instructors found
                      </Text>
                    </View>
                  )}
              </View>
            </View>

            {/* Semester */}
            <View style={[styles.sectionGroup, styles.dropdownSection]}>
              <Text style={styles.sectionTitle}>Allocate the course for</Text>
              <View
                style={[
                  styles.semesterDropdownWrapper,
                  showSemesterPicker && { marginBottom: 450 },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.semesterButton,
                    showSemesterPicker && styles.semesterButtonActive,
                  ]}
                  onPress={() => {
                    setShowSemesterPicker(!showSemesterPicker);
                    setShowInstructorPicker(false); // Close instructor dropdown
                    setShowDayPicker(null); // Close day dropdown
                  }}
                >
                  <Text style={styles.semesterText}>{formData.semester}</Text>
                  <Text
                    style={[
                      styles.dropdownArrow,
                      showSemesterPicker && styles.dropdownArrowRotated,
                    ]}
                  >
                    ▼
                  </Text>
                </TouchableOpacity>

                {showSemesterPicker && (
                  <View style={styles.dropdownContainer}>
                    {semesters.map((semester, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dropdownItem,
                          formData.semester === semester &&
                            styles.selectedDropdownItem,
                          index === semesters.length - 1 &&
                            styles.lastDropdownItem,
                        ]}
                        onPress={() => {
                          handleInputChange("semester", semester);
                          setShowSemesterPicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            formData.semester === semester &&
                              styles.selectedDropdownItemText,
                          ]}
                        >
                          {semester}
                        </Text>
                        {formData.semester === semester && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Course Duration and Fees */}
            <View style={styles.sectionGroup}>
              <Text style={styles.sectionTitle}>Course Duration & Fees</Text>

              {/* Course Duration - Only for Elective */}
              {formData.courseType === "Elective" && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputIcon}>⏱️</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Course duration (in months)"
                      value={formData.courseDuration}
                      onChangeText={(text) =>
                        handleInputChange("courseDuration", text)
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              {/* Monthly Fees */}
              <View style={styles.inputGroup}>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>💰</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Monthly fees (₹)"
                    value={formData.feesMonthly}
                    onChangeText={(text) =>
                      handleInputChange("feesMonthly", text)
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Total Fees - Only for Elective and Auto-calculated */}
              {formData.courseType === "Elective" && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputIcon}>💸</Text>
                    <TextInput
                      style={[styles.input, styles.disabledInput]}
                      placeholder="Total fees (Auto-calculated)"
                      value={formData.feesTotal ? `₹${formData.feesTotal}` : ""}
                      editable={false}
                    />
                  </View>
                  {formData.feesTotal && (
                    <Text style={styles.calculationHint}>
                      ₹{formData.feesMonthly} × {formData.courseDuration} months
                      = ₹{formData.feesTotal}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Class Schedule */}
            <View style={styles.sectionGroup}>
              <Text style={styles.scheduleTitle}>Class Schedule:</Text>

              {formData.classSchedules.map((schedule, index) => (
                <View key={index} style={styles.scheduleContainer}>
                  {formData.classSchedules.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeScheduleButton}
                      onPress={() => removeSchedule(index)}
                    >
                      <Text style={styles.removeScheduleText}>✕</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.scheduleRow}>
                    <View style={styles.dayContainer}>
                      <Text style={styles.dayLabel}>Day:</Text>
                      <View
                        style={[
                          styles.dayDropdownWrapper,
                          showDayPicker === index && { marginBottom: 280 },
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            styles.dayButton,
                            showDayPicker === index && styles.dayButtonActive,
                          ]}
                          onPress={() => {
                            setShowDayPicker(
                              showDayPicker === index ? null : index
                            );
                            setShowInstructorPicker(false); // Close instructor dropdown
                            setShowSemesterPicker(false); // Close semester dropdown
                          }}
                        >
                          <Text style={styles.dayText}>{schedule.day}</Text>
                          <Text
                            style={[
                              styles.dropdownArrow,
                              showDayPicker === index &&
                                styles.dropdownArrowRotated,
                            ]}
                          >
                            ▼
                          </Text>
                        </TouchableOpacity>

                        {showDayPicker === index && (
                          <View style={styles.dayDropdownContainer}>
                            {daysOfWeek.map((day, dayIndex) => (
                              <TouchableOpacity
                                key={dayIndex}
                                style={[
                                  styles.dayDropdownItem,
                                  schedule.day === day &&
                                    styles.selectedDayDropdownItem,
                                  dayIndex === daysOfWeek.length - 1 &&
                                    styles.lastDayDropdownItem,
                                ]}
                                onPress={() => {
                                  updateSchedule(index, "day", day);
                                  setShowDayPicker(null);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[
                                    styles.dayDropdownItemText,
                                    schedule.day === day &&
                                      styles.selectedDayDropdownItemText,
                                  ]}
                                >
                                  {day}
                                </Text>
                                {schedule.day === day && (
                                  <Text style={styles.checkmark}>✓</Text>
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.timeContainer}>
                      <Text style={styles.timeLabel}>Starting Time:</Text>
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => showTimePickerModal(index, "start")}
                      >
                        <Text style={styles.timeText}>
                          {schedule.startTime}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.timeContainer}>
                      <Text style={styles.timeLabel}>Ending Time:</Text>
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => showTimePickerModal(index, "end")}
                      >
                        <Text style={styles.timeText}>{schedule.endTime}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                onPress={addSchedule}
                style={styles.addScheduleButton}
              >
                <Text style={styles.addScheduleText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Time Picker Modal */}
            {showTimePicker.show && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                is24Hour={true}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleTimeChange}
              />
            )}
          </ScrollView>
          <ColorPickerModal
            visible={colorPickerState.visible}
            onClose={() => setColorPickerState({ visible: false, field: null })}
            onColorSelect={handleColorSelect}
            initialColor={
              colorPickerState.field
                ? formData[colorPickerState.field]
                : "#FF6B6B"
            }
            excludeColor={getExcludeColor(colorPickerState.field)}
          />
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    pointerEvents: "auto",
  },
  modalContent: {
    width: "100%",
    maxHeight: "95%",
    backgroundColor: "#29395A",
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    pointerEvents: "auto",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  header: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  imageContainer: {
    marginBottom: 12,
  },
  courseImage: {
    width: 150,
    height: 150,
    borderRadius: 50,
  },
  placeholderImage: {
    width: 150,
    height: 150,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderStyle: "dashed",
  },
  uploadIcon: {
    fontSize: 30,
    color: "#4A9EFF",
    marginBottom: 5,
  },
  uploadText: {
    fontSize: 12,
    color: "#B8C5D6",
    textAlign: "center",
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  formContainer: {
    flex: 1,
    maxHeight: 400,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 5,
    position: "relative",
  },
  inputImage: {
    width: 30,
    height: 30,
    marginRight: 10,
    borderRadius: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
    paddingVertical: 15,
  },
  colorPickerButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  colorPickerIcon: {
    fontSize: 14,
  },
  inputIcon: {
    fontSize: 24,
    marginRight: 10,
    width: 30,
    textAlign: "center",
  },
  disabledInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "#B8C5D6",
  },
  calculationHint: {
    fontSize: 12,
    color: "#B8C5D6",
    marginTop: 4,
    textAlign: "center",
    fontStyle: "italic",
  },
  submitButton: {
    backgroundColor: "#FF5722",
    margin: 20,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  sectionGroup: {
    marginBottom: 20,
  },
  dropdownSection: {
    zIndex: 100,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  semesterDropdownWrapper: {
    position: "relative",
    zIndex: 150,
  },
  typeOptionsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  selectedTypeButton: {
    backgroundColor: "rgba(74, 158, 255, 0.2)",
    borderColor: "#4A9EFF",
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  typeText: {
    fontSize: 14,
    color: "#B8C5D6",
    fontWeight: "500",
  },
  selectedTypeText: {
    color: "#4A9EFF",
    fontWeight: "600",
  },
  typeHint: {
    fontSize: 12,
    color: "#B8C5D6",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  instructorButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  instructorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  instructorName: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  semesterButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  semesterButtonActive: {
    borderColor: "#4A9EFF",
    backgroundColor: "rgba(74, 158, 255, 0.1)",
    boxShadow: "0 2px 4px rgba(74, 158, 255, 0.1)",
    elevation: 2,
  },
  semesterText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#B8C5D6",
    // Use CSS transform for better web compatibility
    ...(Platform.OS === 'web' 
      ? { transform: "rotate(0deg)" }
      : { transform: [{ rotate: "0deg" }] }
    ),
  },
  dropdownArrowRotated: {
    // Use CSS transform for better web compatibility  
    ...(Platform.OS === 'web'
      ? { transform: "rotate(180deg)" }
      : { transform: [{ rotate: "180deg" }] }
    ),
    color: "#4A9EFF",
  },
  dropdownContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#1E2A3A",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 150,
    boxShadow: "0 8px 12px rgba(0, 0, 0, 0.3)",
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "transparent",
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  selectedDropdownItem: {
    backgroundColor: "rgba(74, 158, 255, 0.2)",
    borderLeftWidth: 3,
    borderLeftColor: "#4A9EFF",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "400",
    flex: 1,
  },
  selectedDropdownItemText: {
    color: "#4A9EFF",
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 16,
    color: "#4A9EFF",
    fontWeight: "bold",
    marginLeft: 8,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  scheduleContainer: {
    marginBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 16,
    position: "relative",
  },
  removeScheduleButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  removeScheduleText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  scheduleRow: {
    gap: 12,
  },
  dayContainer: {
    marginBottom: 12,
  },
  dayDropdownWrapper: {
    position: "relative",
    zIndex: 300,
  },
  dayLabel: {
    fontSize: 14,
    color: "#B8C5D6",
    marginBottom: 6,
    fontWeight: "500",
  },
  dayButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayButtonActive: {
    borderColor: "#4A9EFF",
    backgroundColor: "rgba(74, 158, 255, 0.1)",
    boxShadow: "0 2px 4px rgba(74, 158, 255, 0.1)",
    elevation: 2,
  },
  dayText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  dayDropdownContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#1E2A3A",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 301,
    boxShadow: "0 8px 12px rgba(0, 0, 0, 0.3)",
    elevation: 8,
  },
  dayDropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "transparent",
  },
  selectedDayDropdownItem: {
    backgroundColor: "rgba(74, 158, 255, 0.2)",
    borderLeftWidth: 3,
    borderLeftColor: "#4A9EFF",
  },
  lastDayDropdownItem: {
    borderBottomWidth: 0,
  },
  dayDropdownItemText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "400",
    flex: 1,
  },
  selectedDayDropdownItemText: {
    color: "#4A9EFF",
    fontWeight: "600",
  },
  timeContainer: {
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    color: "#B8C5D6",
    marginBottom: 6,
    fontWeight: "500",
  },
  timeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  timeText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  addScheduleButton: {
    backgroundColor: "rgba(74, 158, 255, 0.2)",
    borderRadius: 15,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#4A9EFF",
    borderStyle: "dashed",
  },
  addScheduleText: {
    fontSize: 24,
    color: "#4A9EFF",
    fontWeight: "bold",
  },
  // Instructor dropdown styles
  instructorDropdownWrapper: {
    position: "relative",
    zIndex: 200,
  },
  instructorButtonActive: {
    borderColor: "#4A9EFF",
    backgroundColor: "rgba(74, 158, 255, 0.1)",
    boxShadow: "0 2px 4px rgba(74, 158, 255, 0.1)",
    elevation: 2,
  },
  instructorContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  instructorDropdownContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#1E2A3A",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 201,
    boxShadow: "0 8px 12px rgba(0, 0, 0, 0.3)",
    elevation: 8,
  },
  instructorDropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "transparent",
  },
  selectedInstructorDropdownItem: {
    backgroundColor: "rgba(74, 158, 255, 0.2)",
    borderLeftWidth: 3,
    borderLeftColor: "#4A9EFF",
  },
  lastInstructorDropdownItem: {
    borderBottomWidth: 0,
  },
  instructorDropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  instructorDropdownAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  instructorDropdownText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "400",
    flex: 1,
  },
  selectedInstructorDropdownText: {
    color: "#4A9EFF",
    fontWeight: "600",
  },
  noInstructorsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#1E2A3A",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    padding: 20,
    alignItems: "center",
    zIndex: 201,
    boxShadow: "0 8px 12px rgba(0, 0, 0, 0.3)",
    elevation: 8,
  },
  noInstructorsText: {
    fontSize: 16,
    color: "#B8C5D6",
    textAlign: "center",
  },
});

const colorPickerStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    pointerEvents: "auto",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#29395A",
    borderRadius: 20,
    padding: 20,
    pointerEvents: "auto",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  presetsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 10,
  },
  excludeHint: {
    fontSize: 12,
    color: "#B8C5D6",
    marginBottom: 10,
    fontStyle: "italic",
    textAlign: "center",
  },
  presetColors: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  presetColor: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 5,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedPreset: {
    borderColor: "#fff",
    borderWidth: 3,
  },
  previewContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
  },
  previewLabel: {
    fontSize: 14,
    color: "#B8C5D6",
    marginRight: 10,
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  colorText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#007AFF",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AddCoursesModal;
