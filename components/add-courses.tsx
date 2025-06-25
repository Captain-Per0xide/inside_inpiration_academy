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
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  visible,
  onClose,
  onColorSelect,
  initialColor,
}) => {
  const [selectedColor, setSelectedColor] = useState(initialColor);

  const presetColors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
    "#F8C471",
    "#82E0AA",
    "#F1948A",
    "#85929E",
    "#D7BDE2",
  ];

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
              <View style={colorPickerStyles.presetColors}>
                {presetColors.map((color, index) => (
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
                  showInstructorPicker && { marginBottom: 450 },
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxHeight: "95%",
    minHeight: 800,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "bold",
  },
  header: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  imageContainer: {
    marginBottom: 16,
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
    backgroundColor: "#e8e8e8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  uploadIcon: {
    fontSize: 30,
    color: "#007AFF",
    marginBottom: 5,
  },
  uploadText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  formContainer: {
    flex: 1,
    maxHeight: 400,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
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
    color: "#333",
    paddingVertical: 15,
  },
  colorPickerButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ddd",
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
    backgroundColor: "#f5f5f5",
    color: "#888",
  },
  calculationHint: {
    fontSize: 12,
    color: "#666",
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
    color: "#333",
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
    backgroundColor: "#f8f8f8",
    borderRadius: 15,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  selectedTypeButton: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196f3",
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  typeText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedTypeText: {
    color: "#2196f3",
    fontWeight: "600",
  },
  typeHint: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  instructorButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  instructorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  instructorName: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  semesterButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  semesterButtonActive: {
    borderColor: "#2196f3",
    backgroundColor: "#f0f8ff",
    shadowColor: "#2196f3",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  semesterText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#666",
    transform: [{ rotate: "0deg" }],
  },
  dropdownArrowRotated: {
    transform: [{ rotate: "180deg" }],
    color: "#2196f3",
  },
  dropdownContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    zIndex: 150,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    backgroundColor: "transparent",
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  selectedDropdownItem: {
    backgroundColor: "#f0f8ff",
    borderLeftWidth: 3,
    borderLeftColor: "#2196f3",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "400",
    flex: 1,
  },
  selectedDropdownItemText: {
    color: "#2196f3",
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 16,
    color: "#2196f3",
    fontWeight: "bold",
    marginLeft: 8,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  scheduleContainer: {
    marginBottom: 16,
    backgroundColor: "#f8f8f8",
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
    color: "#666",
    marginBottom: 6,
    fontWeight: "500",
  },
  dayButton: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayButtonActive: {
    borderColor: "#2196f3",
    backgroundColor: "#f0f8ff",
    shadowColor: "#2196f3",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  dayDropdownContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    zIndex: 301,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dayDropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    backgroundColor: "transparent",
  },
  selectedDayDropdownItem: {
    backgroundColor: "#f0f8ff",
    borderLeftWidth: 3,
    borderLeftColor: "#2196f3",
  },
  lastDayDropdownItem: {
    borderBottomWidth: 0,
  },
  dayDropdownItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "400",
    flex: 1,
  },
  selectedDayDropdownItemText: {
    color: "#2196f3",
    fontWeight: "600",
  },
  timeContainer: {
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
    fontWeight: "500",
  },
  timeButton: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  timeText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  addScheduleButton: {
    backgroundColor: "#e3f2fd",
    borderRadius: 15,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#2196f3",
    borderStyle: "dashed",
  },
  addScheduleText: {
    fontSize: 24,
    color: "#2196f3",
    fontWeight: "bold",
  },
  // Instructor dropdown styles
  instructorDropdownWrapper: {
    position: "relative",
    zIndex: 200,
  },
  instructorButtonActive: {
    borderColor: "#2196f3",
    backgroundColor: "#f0f8ff",
    shadowColor: "#2196f3",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    zIndex: 201,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  instructorDropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    backgroundColor: "transparent",
  },
  selectedInstructorDropdownItem: {
    backgroundColor: "#f0f8ff",
    borderLeftWidth: 3,
    borderLeftColor: "#2196f3",
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
    color: "#333",
    fontWeight: "400",
    flex: 1,
  },
  selectedInstructorDropdownText: {
    color: "#2196f3",
    fontWeight: "600",
  },
  noInstructorsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    padding: 20,
    alignItems: "center",
    zIndex: 201,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  noInstructorsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});

const colorPickerStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
  },
  presetsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
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
    borderColor: "#333",
    borderWidth: 3,
  },
  previewContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
  },
  previewLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 10,
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  colorText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
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
