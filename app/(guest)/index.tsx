import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

const GuestCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get("window"));

  const fetchCourses = useCallback(async () => {
    try {
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
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    const onChange = (result: { window: any }) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener("change", onChange);
    return () => subscription?.remove();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCourses();
  }, [fetchCourses]);

  const handleBuyNow = (course: Course) => {
    // Navigate to payment page with course ID
    router.push({
      pathname: "/(guest)/payment",
      params: { courseId: course.id },
    });
  };

  // Calculate responsive columns and card width
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

  const { numColumns, cardWidth } = getResponsiveLayout();

  const renderCourseCard = ({ item }: { item: Course }) => {
    const isSmallScreen = screenData.width < 600;
    const isMediumScreen = screenData.width < 900;

    return (
      <View
        style={[
          styles.courseCard,
          {
            backgroundColor: item.full_name_color,
            width: numColumns === 1 ? "100%" : cardWidth,
            minHeight: isSmallScreen ? 220 : isMediumScreen ? 260 : 280,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.codenameTag,
              { backgroundColor: item.codename_color },
            ]}
          >
            <Text
              style={[
                styles.codenameText,
                { fontSize: isSmallScreen ? 12 : 14 },
              ]}
            >
              {item.codename}
            </Text>
          </View>
          <Ionicons
            name={
              item.course_type === "Core Curriculum"
                ? "school-outline"
                : "briefcase-outline"
            }
            size={isSmallScreen ? 24 : 26}
            color="black"
          />
        </View>

        <Text
          style={[
            styles.courseTitle,
            {
              fontSize: isSmallScreen ? 18 : isMediumScreen ? 19 : 20,
              marginBottom: isSmallScreen ? 12 : 16,
            },
          ]}
        >
          {item.full_name}
        </Text>

        <View style={styles.courseInfo}>
          <View style={styles.infoRow}>
            <Ionicons
              name="time-outline"
              size={isSmallScreen ? 14 : 16}
              color="black"
            />
            <Text
              style={[styles.infoText, { fontSize: isSmallScreen ? 14 : 16 }]}
            >
              Course Duration:{" "}
              {item.course_duration
                ? `${item.course_duration} months`
                : "Ongoing"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="cash-outline"
              size={isSmallScreen ? 14 : 16}
              color="black"
            />
            <Text
              style={[styles.infoText, { fontSize: isSmallScreen ? 14 : 16 }]}
            >
              Course Fees: ₹{item.fees_monthly}/month
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text
              style={{ fontSize: isSmallScreen ? 14 : 16, fontWeight: "400" }}
            >
              Includes 2 eBooks, 2 Notes & 2 Sample Question Set with PYQ solved
            </Text>
          </View>
        </View>

        <View style={styles.instructorSection}>
          <View style={styles.instructorInfo}>
            {item.instructor_image ? (
              <Image
                source={{ uri: item.instructor_image }}
                style={[
                  styles.instructorImage,
                  {
                    width: isSmallScreen ? 36 : 44,
                    height: isSmallScreen ? 36 : 44,
                    borderRadius: isSmallScreen ? 18 : 22,
                  },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.instructorImagePlaceholder,
                  {
                    width: isSmallScreen ? 32 : 40,
                    height: isSmallScreen ? 32 : 40,
                    borderRadius: isSmallScreen ? 16 : 20,
                  },
                ]}
              >
                <Ionicons
                  name="person"
                  size={isSmallScreen ? 16 : 20}
                  color="#666"
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.instructorLabel,
                  { fontSize: isSmallScreen ? 12 : 14 },
                ]}
              >
                Instructor
              </Text>
              <Text
                style={[
                  styles.instructorName,
                  { fontSize: isSmallScreen ? 14 : 16 },
                ]}
                numberOfLines={1}
              >
                {item.instructor}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.buyNowButton}
            onPress={() => handleBuyNow(item)}
          >
            <Text
              style={[
                styles.buyNowButtonText,
                { fontSize: isSmallScreen ? 14 : 16 },
              ]}
            >
              Buy Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    const isSmallScreen = screenData.width < 600;

    return (
      <View style={styles.emptyState}>
        <Ionicons
          name="school-outline"
          size={isSmallScreen ? 60 : 80}
          color="#666"
        />
        <Text
          style={[
            styles.emptyStateTitle,
            { fontSize: isSmallScreen ? 20 : 24 },
          ]}
        >
          No Courses Available
        </Text>
        <Text
          style={[styles.emptyStateText, { fontSize: isSmallScreen ? 14 : 16 }]}
        >
          Check back later for new courses and learning opportunities
        </Text>
      </View>
    );
  };

  if (loading) {
    const isSmallScreen = screenData.width < 600;

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E4064" />
        <Text
          style={[styles.loadingText, { fontSize: isSmallScreen ? 14 : 16 }]}
        >
          Loading courses...
        </Text>
      </View>
    );
  }

  const isSmallScreen = screenData.width < 600;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: isSmallScreen ? 20 : 24 }]}>
        Available Courses
      </Text>

      <FlatList
        data={courses}
        renderItem={renderCourseCard}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns} // Force re-render when numColumns changes
        columnWrapperStyle={
          numColumns > 1 && courses.length > 0 ? styles.row : undefined
        }
        contentContainerStyle={[
          styles.listContainer,
          courses.length === 0 && styles.emptyListContainer,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2E4064"]}
            tintColor="#2E4064"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#111827",
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#fff",
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
  },
  row: {
    justifyContent: "space-around",
    paddingHorizontal: 5,
  },
  courseCard: {
    margin: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxWidth: 400, // Prevent cards from becoming too wide on large screens
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  codenameTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    maxWidth: "60%",
  },
  codenameText: {
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
  },
  buyNowButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "black",
  },
  buyNowButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  courseTitle: {
    fontWeight: "bold",
    color: "black",
    lineHeight: 22,
  },
  courseInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoText: {
    color: "black",
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
    flexWrap: "wrap",
  },
  instructorSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: "auto",
  },
  instructorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  instructorImage: {
    marginRight: 12,
  },
  instructorImagePlaceholder: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  instructorLabel: {
    color: "black",
    marginBottom: 2,
  },
  instructorName: {
    fontWeight: "600",
    color: "black",
  },
  courseLogo: {
    borderRadius: 8,
    resizeMode: "contain",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#666",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#495057",
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
    width: 60,
    marginRight: 10,
  },
  value: {
    fontSize: 16,
    color: "#212529",
    flex: 1,
    flexWrap: "wrap",
  },
});

export default GuestCourses;
