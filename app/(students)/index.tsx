import { supabase } from '@/lib/supabase';
import { authService } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Dimensions, FlatList, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface UserData {
    id?: string;
    email?: string;
    name?: string;
    enrolled_courses?: string[];
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
    const [modalVisible, setModalVisible] = useState(false);
    const [formValue, setFormValue] = useState('');
    const [otherCourses, setOtherCourses] = useState<Course[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [screenData, setScreenData] = useState(Dimensions.get('window'));
    const [pendingPayments, setPendingPayments] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchUserData();
    }, []);

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

    const fetchUserData = async () => {
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
    };

    const fetchOtherCourses = async (enrolledCourses: string[] = []) => {
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

            // Filter out enrolled courses
            const availableCourses = data?.filter(course => 
                !enrolledCourses.includes(course.id)
            ) || [];

            setOtherCourses(availableCourses);
        } catch (error) {
            console.error('Error fetching other courses:', error);
        } finally {
            setCoursesLoading(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchUserData().finally(() => setRefreshing(false));
    }, []);

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

        // Navigate to course purchase page with course ID
        router.push({
            pathname: '/(students)/course-purchase',
            params: { courseId: course.id },
        });
    };

    // Calculate responsive layout
    const getResponsiveLayout = useCallback(() => {
        const { width } = screenData;
        
        if (width < 600) {
            return { numColumns: 1, cardWidth: width - 40 };
        } else if (width < 900) {
            return { numColumns: 2, cardWidth: (width - 60) / 2 };
        } else if (width < 1200) {
            return { numColumns: 3, cardWidth: (width - 80) / 3 };
        } else {
            return { numColumns: 4, cardWidth: (width - 100) / 4 };
        }
    }, [screenData]);

    const { numColumns, cardWidth } = getResponsiveLayout();

    const renderCourseCard = ({ item }: { item: Course }) => {
        const isSmallScreen = screenData.width < 600;
        const isMediumScreen = screenData.width < 900;
        const hasPendingPayment = pendingPayments.has(item.id);

        return (
            <View style={[
                styles.courseCard,
                {
                    backgroundColor: item.full_name_color,
                    width: numColumns === 1 ? '100%' : cardWidth,
                    minHeight: isSmallScreen ? 220 : isMediumScreen ? 260 : 280,
                }
            ]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.codenameTag, { backgroundColor: item.codename_color }]}>
                        <Text style={[
                            styles.codenameText,
                            { fontSize: isSmallScreen ? 12 : 14 }
                        ]}>
                            {item.codename}
                        </Text>
                    </View>
                    <Ionicons 
                        name={item.course_type === "Core Curriculum" ? "school-outline" : "briefcase-outline"}
                        size={isSmallScreen ? 24 : 26}
                        color="black"
                    />
                </View>
                
                <Text style={[
                    styles.courseTitle,
                    { 
                        fontSize: isSmallScreen ? 18 : isMediumScreen ? 19 : 20,
                        marginBottom: isSmallScreen ? 12 : 16
                    }
                ]}>
                    {item.full_name}
                </Text>
                
                <View style={styles.courseInfo}>
                    <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={isSmallScreen ? 14 : 16} color="black" />
                        <Text style={[
                            styles.infoText,
                            { fontSize: isSmallScreen ? 14 : 16 }
                        ]}>
                           Course Duration: {item.course_duration ? `${item.course_duration} months` : 'Ongoing'}
                        </Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Ionicons name="cash-outline" size={isSmallScreen ? 14 : 16} color="black" />
                        <Text style={[
                            styles.infoText,
                            { fontSize: isSmallScreen ? 14 : 16 }
                        ]}>
                            {getFeeLabel(item)}: {getFeeDisplay(item)}
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
                        {item.instructor_image ? (
                            <Image 
                                source={{ uri: item.instructor_image }} 
                                style={[
                                    styles.instructorImage,
                                    { 
                                        width: isSmallScreen ? 36 : 44,
                                        height: isSmallScreen ? 36 : 44,
                                        borderRadius: isSmallScreen ? 18 : 22
                                    }
                                ]}
                            />
                        ) : (
                            <View style={[
                                styles.instructorImagePlaceholder,
                                { 
                                    width: isSmallScreen ? 32 : 40,
                                    height: isSmallScreen ? 32 : 40,
                                    borderRadius: isSmallScreen ? 16 : 20
                                }
                            ]}>
                                <Ionicons name="person" size={isSmallScreen ? 16 : 20} color="#666" />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={[
                                styles.instructorLabel,
                                { fontSize: isSmallScreen ? 12 : 14 }
                            ]}>
                                Instructor
                            </Text>
                            <Text style={[
                                styles.instructorName,
                                { fontSize: isSmallScreen ? 14 : 16 }
                            ]} numberOfLines={1}>
                                {item.instructor}
                            </Text>
                        </View>
                    </View>
                    
                    <TouchableOpacity
                        style={[
                            hasPendingPayment ? styles.pendingButton : styles.buyNowButton,
                            hasPendingPayment && styles.disabledButton,
                        ]}
                        onPress={() => handleBuyNow(item)}
                        disabled={hasPendingPayment}
                    >
                        {hasPendingPayment ? (
                            <>
                                <Ionicons
                                    name="time-outline"
                                    size={isSmallScreen ? 12 : 14}
                                    color="#6B7280"
                                    style={{ marginRight: 4 }}
                                />
                                <Text style={[
                                    styles.pendingButtonText,
                                    { fontSize: isSmallScreen ? 12 : 14 }
                                ]}>
                                    Waiting for verification
                                </Text>
                            </>
                        ) : (
                            <Text style={[
                                styles.buyNowButtonText,
                                { fontSize: isSmallScreen ? 14 : 16 }
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
            <Text style={styles.title}>Welcome to Students Dashboard</Text>
            
            {/* User Information Section */}
            <View style={styles.userInfoContainer}>
                <Text style={styles.sectionTitle}>User Information</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>ID:</Text>
                    <Text style={styles.value}>{userData.id || 'Not available'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Name:</Text>
                    <Text style={styles.value}>{userData.name || 'Not set'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Email:</Text>
                    <Text style={styles.value}>{userData.email || 'Not available'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Enrolled:</Text>
                    <Text style={styles.value}>
                        {userData.enrolled_courses?.length || 0} course{(userData.enrolled_courses?.length || 0) !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>

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
                            You're enrolled in all available courses!
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
                        contentContainerStyle={styles.coursesListContainer}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.7}
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            {/* Modal for Form */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Item</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter something..."
                            value={formValue}
                            onChangeText={setFormValue}
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
                            <Button title="Cancel" onPress={() => setModalVisible(false)} color="#888" />
                            <View style={{ width: 12 }} />
                            <Button title="Submit" onPress={() => { setModalVisible(false); setFormValue(''); }} color="#2E4064" />
                        </View>
                    </View>
                </View>
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
        color: '#333',
    },
    userInfoContainer: {
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#495057',
        textAlign: 'center',
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
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#495057',
        width: 60,
        marginRight: 10,
    },
    value: {
        fontSize: 16,
        color: '#212529',
        flex: 1,
        flexWrap: 'wrap',
    },

    fab: {
        position: 'absolute',
        right: 24,
        bottom: 32,
        width: 60,
        height: 60,
        borderRadius: 15,
        backgroundColor: '#2E4064',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#2E4064',
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    coursesContainer: {
        marginTop: 30,
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
        maxWidth: 400,
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