import CoursePurchase from '@/components/course-purchase';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface UserData {
    id?: string;
    email?: string;
    name?: string;
    enrolled_courses?: {
        status: string;
        course_id: string;
    }[];
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


const StudentsDashboard = () => {
    const [userData, setUserData] = useState<UserData>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [otherCourses, setOtherCourses] = useState<Course[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [screenData, setScreenData] = useState(Dimensions.get('window'));
    const [pendingPayments, setPendingPayments] = useState<Set<string>>(new Set());
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

    useEffect(() => {
        const onChange = (result: { window: any }) => {
            setScreenData(result.window);
        };

        const subscription = Dimensions.addEventListener('change', onChange);
        return () => subscription?.remove();
    }, []);

    // Get current month name
    const getCurrentMonthName = useCallback(() => {
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
        ];
        return months[new Date().getMonth()];
    }, []);

    // Helper functions for course type-based fee rendering
    const getCourseFee = useCallback((course: Course) => {
        return course.course_type === 'Core Curriculum' ? course.fees_monthly : course.fees_total || 0;
    }, []);

    const getFeeLabel = useCallback((course: Course) => {
        return course.course_type === 'Core Curriculum' ? 'Monthly Fee' : 'Total Fee';
    }, []);

    const getFeeDisplay = useCallback((course: Course) => {
        const fee = getCourseFee(course);
        const feeType = course.course_type === 'Core Curriculum' ? '/month' : '';
        return `₹${fee}${feeType}`;
    }, [getCourseFee]);

    // Get time-based greeting
    const getTimeBasedGreeting = useCallback(() => {
        const hour = new Date().getHours();
        if (hour < 12) {
            return 'Good Morning';
        } else if (hour < 17) {
            return 'Good Afternoon';
        } else {
            return 'Good Evening';
        }
    }, []);

    const checkPendingPayments = useCallback(async (userId: string) => {
        try {
            const currentMonth = getCurrentMonthName();

            // Fetch all fees records to check for pending payments
            const { data: feesData, error } = await supabase
                .from('fees')
                .select(`id, "${currentMonth}"`);

            if (error) {
                console.error('Error fetching fees data:', error);
                return;
            }

            const pendingCourseIds = new Set<string>();

            feesData?.forEach((fee) => {
                const monthData = fee[currentMonth];
                if (monthData && Array.isArray(monthData)) {
                    monthData.forEach((payment: any) => {
                        if (payment.user_id === userId && payment.status === 'pending') {
                            pendingCourseIds.add(fee.id);
                        }
                    });
                }
            });

            setPendingPayments(pendingCourseIds);
        } catch (error) {
            console.error('Error checking pending payments:', error);
        }
    }, [getCurrentMonthName]);

    const fetchOtherCourses = useCallback(async (enrolledCourses: { status: string; course_id: string }[] = []) => {
        try {
            setCoursesLoading(true);

            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching courses:', error);
                return;
            }

            // Extract course IDs from the new JSONB structure
            const enrolledCourseIds = enrolledCourses.map(enrollment => enrollment.course_id);

            // Filter out enrolled courses (both success and pending)
            const availableCourses = data?.filter(course =>
                !enrolledCourseIds.includes(course.id)
            ) || [];

            setOtherCourses(availableCourses);
        } catch (error) {
            console.error('Error fetching other courses:', error);
        } finally {
            setCoursesLoading(false);
        }
    }, []);

    const fetchUserData = useCallback(async () => {
        setIsLoading(true);

        try {
            const id = await authService.getCurrentUserUID();
            const email = await authService.getCurrentUserEmail();

            if (!id || !email) {
                setIsLoading(false);
                return;
            }

            console.log('Fetching user data for ID:', id);

            const { data, error } = await supabase
                .from('users')
                .select('id, email, name, enrolled_courses')
                .eq('id', id)
                .maybeSingle();

            if (error) {
                console.error('Fetch error:', error);
                setIsLoading(false);
                return;
            }

            console.log('Fetched user data:', data);

            if (data) {
                setUserData(data);
                await checkPendingPayments(id);
                await fetchOtherCourses(data.enrolled_courses || []);
            } else {
                // If no user data exists in database, use current auth info
                setUserData({ id, email, name: 'User', enrolled_courses: [] });
                await checkPendingPayments(id);
                await fetchOtherCourses([]);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [checkPendingPayments, fetchOtherCourses]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchUserData().finally(() => setRefreshing(false));
    }, [fetchUserData]);

    // Effect to fetch user data on component mount
    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleBuyNow = (course: Course) => {
        // Check if there's a pending payment for this course
        if (pendingPayments.has(course.id)) {
            Alert.alert(
                'Pending Payment',
                'You already have a pending payment for this course. Please wait for verification before making another payment.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Check if user is logged in
        if (!userData.id) {
            Alert.alert('Login Required', 'Please login to purchase a course.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Login', onPress: () => router.push('/(auth)') },
            ]);
            return;
        }

        // Open course purchase modal
        setSelectedCourseId(course.id);
        setShowPurchaseModal(true);
    };

    const handlePaymentSuccess = () => {
        setShowPurchaseModal(false);
        setSelectedCourseId(null);
        // Refresh the data to update enrolled courses
        fetchUserData();
    };

    const handlePaymentBack = () => {
        setShowPurchaseModal(false);
        setSelectedCourseId(null);
    };

    // Calculate responsive layout
    const getResponsiveLayout = useCallback(() => {
        const { width } = screenData;

        // More responsive breakpoints for better mobile experience
        if (width < 400) {
            // Very small phones (iPhone SE, etc.)
            return { numColumns: 1, cardWidth: width - 40, cardPadding: 12 };
        } else if (width < 650) {
            // Small to medium phones (most mobile devices including 720px width)
            return { numColumns: 1, cardWidth: width - 40, cardPadding: 16 };
        } else if (width < 900) {
            // Large phones/small tablets (landscape phones, iPad mini)
            return { numColumns: 2, cardWidth: (width - 60) / 2, cardPadding: 16 };
        } else if (width < 1200) {
            // Tablets
            return { numColumns: 2, cardWidth: (width - 80) / 2, cardPadding: 20 };
        } else if (width < 1600) {
            // Large tablets/small desktops
            return { numColumns: 3, cardWidth: (width - 100) / 3, cardPadding: 20 };
        } else {
            // Large desktops
            return { numColumns: 4, cardWidth: (width - 120) / 4, cardPadding: 24 };
        }
    }, [screenData]);

    const { numColumns, cardWidth, cardPadding } = getResponsiveLayout();

    const renderCourseCard = ({ item }: { item: Course }) => {
        const isVerySmallScreen = screenData.width < 400;
        const isSmallScreen = screenData.width < 650; // Updated breakpoint to include 720px
        const isMediumScreen = screenData.width < 900; // Updated breakpoint
        const hasPendingPayment = pendingPayments.has(item.id);

        // Responsive sizing based on screen width
        const cardStyle = {
            width: numColumns === 1 ? '100%' : cardWidth,
            minHeight: isVerySmallScreen ? 200 : isSmallScreen ? 220 : isMediumScreen ? 240 : 260,
            padding: cardPadding,
            margin: isVerySmallScreen ? 4 : isSmallScreen ? 6 : 8,
        };

        const textSizes = {
            codename: isVerySmallScreen ? 10 : isSmallScreen ? 12 : 14,
            title: isVerySmallScreen ? 16 : isSmallScreen ? 18 : isMediumScreen ? 19 : 20,
            info: isVerySmallScreen ? 12 : isSmallScreen ? 14 : 16,
            instructor: isVerySmallScreen ? 12 : isSmallScreen ? 14 : 16,
            instructorLabel: isVerySmallScreen ? 10 : isSmallScreen ? 12 : 14,
            button: isVerySmallScreen ? 12 : isSmallScreen ? 14 : 16,
        };

        const iconSizes = {
            courseType: isVerySmallScreen ? 20 : isSmallScreen ? 24 : 26,
            info: isVerySmallScreen ? 12 : isSmallScreen ? 14 : 16,
            instructor: isVerySmallScreen ? 32 : isSmallScreen ? 36 : 44,
            buttonIcon: isVerySmallScreen ? 10 : isSmallScreen ? 12 : 14,
        };

        return (
            <View style={[
                styles.courseCard,
                {
                    backgroundColor: item.full_name_color,
                    width: numColumns === 1 ? '100%' : cardWidth,
                    minHeight: cardStyle.minHeight,
                    padding: cardStyle.padding,
                    margin: cardStyle.margin,
                }
            ]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.codenameTag, {
                        backgroundColor: item.codename_color,
                        paddingHorizontal: isVerySmallScreen ? 8 : 12,
                        paddingVertical: isVerySmallScreen ? 4 : 6,
                    }]}>
                        <Text style={[
                            styles.codenameText,
                            { fontSize: textSizes.codename }
                        ]}>
                            {item.codename}
                        </Text>
                    </View>
                    <Ionicons
                        name={item.course_type === "Core Curriculum" ? "school-outline" : "briefcase-outline"}
                        size={iconSizes.courseType}
                        color="black"
                    />
                </View>

                <Text style={[
                    styles.courseTitle,
                    {
                        fontSize: textSizes.title,
                        marginBottom: isVerySmallScreen ? 8 : isSmallScreen ? 12 : 16,
                        lineHeight: textSizes.title + 4,
                    }
                ]} numberOfLines={isVerySmallScreen ? 2 : 3}>
                    {item.full_name}
                </Text>

                <View style={[styles.courseInfo, {
                    marginBottom: isVerySmallScreen ? 8 : isSmallScreen ? 12 : 16
                }]}>
                    <View style={[styles.infoRow, { marginBottom: isVerySmallScreen ? 6 : 8 }]}>
                        <Ionicons name="time-outline" size={iconSizes.info} color="black" />
                        <Text style={[
                            styles.infoText,
                            {
                                fontSize: textSizes.info,
                                lineHeight: textSizes.info + 2,
                            }
                        ]}>
                            Duration: {item.course_duration ? `${item.course_duration} months` : 'Ongoing'}
                        </Text>
                    </View>

                    <View style={[styles.infoRow, { marginBottom: isVerySmallScreen ? 6 : 8 }]}>
                        <Ionicons name="cash-outline" size={iconSizes.info} color="black" />
                        <Text style={[
                            styles.infoText,
                            {
                                fontSize: textSizes.info,
                                lineHeight: textSizes.info + 2,
                            }
                        ]}>
                            {getFeeLabel(item)}: {getFeeDisplay(item)}
                        </Text>
                    </View>

                    {!isVerySmallScreen && (
                        <View style={styles.infoRow}>
                            <Text style={{
                                fontSize: textSizes.info - 2,
                                fontWeight: '400',
                                color: 'black',
                                lineHeight: textSizes.info,
                            }} numberOfLines={isSmallScreen ? 2 : 3}>
                                Includes 2 eBooks, 2 Notes & 2 Sample Question Set with PYQ solved
                            </Text>
                        </View>
                    )}
                </View>

                <View style={[styles.instructorSection, { marginTop: 'auto' }]}>
                    <View style={[styles.instructorInfo, { flex: 1, marginRight: 8 }]}>
                        {item.instructor_image ? (
                            <Image
                                source={{ uri: item.instructor_image }}
                                style={[
                                    styles.instructorImage,
                                    {
                                        width: iconSizes.instructor,
                                        height: iconSizes.instructor,
                                        borderRadius: iconSizes.instructor / 2,
                                        marginRight: isVerySmallScreen ? 8 : 12,
                                    }
                                ]}
                            />
                        ) : (
                            <View style={[
                                styles.instructorImagePlaceholder,
                                {
                                    width: iconSizes.instructor,
                                    height: iconSizes.instructor,
                                    borderRadius: iconSizes.instructor / 2,
                                    marginRight: isVerySmallScreen ? 8 : 12,
                                }
                            ]}>
                                <Ionicons name="person" size={iconSizes.instructor / 2} color="#666" />
                            </View>
                        )}
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[
                                styles.instructorLabel,
                                { fontSize: textSizes.instructorLabel }
                            ]}>
                                Instructor
                            </Text>
                            <Text style={[
                                styles.instructorName,
                                { fontSize: textSizes.instructor }
                            ]} numberOfLines={1}>
                                {item.instructor}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            hasPendingPayment ? styles.pendingButton : styles.buyNowButton,
                            hasPendingPayment && styles.disabledButton,
                            {
                                paddingHorizontal: isVerySmallScreen ? 12 : 16,
                                paddingVertical: isVerySmallScreen ? 6 : 8,
                                minWidth: isVerySmallScreen ? 80 : 100,
                            }
                        ]}
                        onPress={() => handleBuyNow(item)}
                        disabled={hasPendingPayment}
                    >
                        {hasPendingPayment ? (
                            <>
                                <Ionicons
                                    name="time-outline"
                                    size={iconSizes.buttonIcon}
                                    color="#6B7280"
                                    style={{ marginRight: 4 }}
                                />
                                <Text style={[
                                    styles.pendingButtonText,
                                    { fontSize: textSizes.button - 2 }
                                ]} numberOfLines={isVerySmallScreen ? 2 : 1}>
                                    {isVerySmallScreen ? 'Waiting' : 'Waiting for verification'}
                                </Text>
                            </>
                        ) : (
                            <Text style={[
                                styles.buyNowButtonText,
                                { fontSize: textSizes.button }
                            ]}>
                                Buy Now
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#2E4064']}
                    tintColor="#2E4064"
                />
            }
        >
            <Text style={styles.title}>
                {getTimeBasedGreeting()}, {userData.name || 'Student'}!
            </Text>

            {/* Browse Other Courses Section */}
            <View style={styles.coursesSection}>
                <Text style={styles.coursesTitle}>Browse Other Courses</Text>
                <Text style={styles.coursesSubtitle}>
                    Discover new courses to expand your learning journey
                </Text>

                {coursesLoading ? (
                    <View style={styles.coursesLoadingContainer}>
                        <ActivityIndicator size="large" color="#2E4064" />
                        <Text style={styles.loadingText}>Loading courses...</Text>
                    </View>
                ) : otherCourses.length === 0 ? (
                    <View style={styles.emptyCoursesContainer}>
                        <Ionicons name="school-outline" size={60} color="#666" />
                        <Text style={styles.emptyCoursesText}>
                            No other courses available at the moment
                        </Text>
                        <Text style={styles.emptyCoursesSubText}>
                            You&apos;re enrolled in all available courses!
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={otherCourses}
                        renderItem={renderCourseCard}
                        keyExtractor={(item) => item.id}
                        numColumns={numColumns}
                        key={numColumns}
                        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
                        contentContainerStyle={[
                            styles.coursesListContainer,
                            numColumns === 1 && { alignItems: 'center' }
                        ]}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* Course Purchase Modal */}
            <Modal
                visible={showPurchaseModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handlePaymentBack}
            >
                {selectedCourseId && (
                    <CoursePurchase
                        courseId={selectedCourseId}
                        onPaymentSuccess={handlePaymentSuccess}
                        onBack={handlePaymentBack}
                    />
                )}
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#111827',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111827',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        color: '#fff',
    },
    coursesContainer: {
        marginTop: 30,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    infoText: {
        color: 'black',
        fontWeight: '500',
        marginLeft: 8,
        flex: 1,
        flexWrap: 'wrap',
    },
    coursesSection: {
        marginTop: 30,
        marginBottom: 80,
    },
    coursesTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    coursesSubtitle: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 20,
    },
    coursesLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
    },
    emptyCoursesContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#1F2937',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#374151',
    },
    emptyCoursesText: {
        color: '#9CA3AF',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },
    emptyCoursesSubText: {
        color: '#6B7280',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    coursesListContainer: {
        paddingBottom: 20,
    },
    row: {
        justifyContent: 'space-around',
        paddingHorizontal: 5,
    },
    // Course Card Styles
    courseCard: {
        margin: 8,
        padding: 16,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        maxWidth: '100%',
        alignSelf: 'stretch',
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
    buyNowButton: {
        backgroundColor: '#10B981',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    buyNowButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    pendingButton: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    pendingButtonText: {
        color: '#6B7280',
        fontWeight: '500',
    },
    disabledButton: {
        opacity: 0.6,
    },
});

export default StudentsDashboard;