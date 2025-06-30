import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    course_duration: number;
    fees_monthly: number;
    fees_total: number;
    instructor: string;
    instructor_image: string;
    enrollmentStatus?: string;
    suspensionReason?: string;
    overdueMonths?: number;
    suspendedDate?: string;
    course_end?: {
        type: 'now' | 'scheduled';
        status: 'completed' | 'scheduled_for_completion';
        marked_at: string;
        marked_by: string;
        completed_date: string;
    };
}

interface EnrollmentData {
    status: string;
    course_id: string;
    reason?: string;
    overdue_months?: number;
    suspended_date?: string;
    last_trigger_check?: string;
}

const MyBatchesScreen = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [screenData, setScreenData] = useState(Dimensions.get('window'));

    // Helper functions for course completion status
    const isCourseCompleted = (course: Course) => {
        return course.course_end?.status === 'completed';
    };

    const isCourseScheduledForCompletion = (course: Course) => {
        return course.course_end?.status === 'scheduled_for_completion';
    };

    const getCompletionDate = (course: Course) => {
        if (!course.course_end?.completed_date) return null;
        return new Date(course.course_end.completed_date);
    };

    const isCompletionDatePassed = (course: Course) => {
        const completionDate = getCompletionDate(course);
        if (!completionDate) return false;
        return new Date() >= completionDate;
    };

    const shouldShowCourse = (course: Course) => {
        // Don't show if course is completed immediately
        if (isCourseCompleted(course)) {
            return false;
        }

        // Show if not scheduled for completion
        if (!isCourseScheduledForCompletion(course)) {
            return true;
        }

        // For scheduled completion, show only if completion date hasn't passed
        return !isCompletionDatePassed(course);
    };

    const getCompletionWarningMessage = (course: Course) => {
        if (!isCourseScheduledForCompletion(course)) return null;

        const completionDate = getCompletionDate(course);
        if (!completionDate) return null;

        const now = new Date();
        const timeDiff = completionDate.getTime() - now.getTime();
        const daysUntilCompletion = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysUntilCompletion <= 0) {
            return "This course has been completed and will no longer be accessible.";
        } else if (daysUntilCompletion <= 7) {
            return `This course will be completed in ${daysUntilCompletion} day${daysUntilCompletion > 1 ? 's' : ''}. Please complete any pending work.`;
        } else {
            const completionDateStr = completionDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            return `This course is scheduled to be completed on ${completionDateStr}.`;
        }
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
        fetchEnrolledCourses();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const onChange = (result: { window: any }) => {
            setScreenData(result.window);
        };

        const subscription = Dimensions.addEventListener('change', onChange);
        return () => subscription?.remove();
    }, []);

    const fetchEnrolledCourses = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            // Get current user session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error('Session error:', sessionError);
                Alert.alert('Error', 'Failed to get user session');
                return;
            }

            if (!session?.user?.id) {
                Alert.alert('Error', 'No user session found');
                return;
            }

            // Fetch user's enrolled courses
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('enrolled_courses')
                .eq('id', session.user.id)
                .single();

            if (userError) {
                console.error('User fetch error:', userError);
                Alert.alert('Error', 'Failed to fetch user data');
                return;
            }

            if (!userData?.enrolled_courses || userData.enrolled_courses.length === 0) {
                setCourses([]);
                return;
            }

            // Extract course IDs from the new JSONB structure
            const enrollmentData: EnrollmentData[] = userData.enrolled_courses;
            const courseIds = enrollmentData.map((enrollment) => enrollment.course_id);

            // Fetch course details for enrolled courses
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select('*, course_end')
                .in('id', courseIds);

            if (coursesError) {
                console.error('Courses fetch error:', coursesError);
                Alert.alert('Error', 'Failed to fetch courses data');
                return;
            }

            // Add enrollment status to each course and filter based on completion status
            const coursesWithStatus = (coursesData || []).map((course) => {
                const enrollment = enrollmentData.find((enroll) => enroll.course_id === course.id);
                return {
                    ...course,
                    enrollmentStatus: enrollment?.status || 'pending',
                    suspensionReason: enrollment?.reason || null,
                    overdueMonths: enrollment?.overdue_months || 0,
                    suspendedDate: enrollment?.suspended_date || null
                };
            }).filter(course => shouldShowCourse(course)); // Filter out completed courses

            setCourses(coursesWithStatus);
        } catch (error) {
            console.error('Error fetching enrolled courses:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            if (isRefresh) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    };

    const onRefresh = () => {
        fetchEnrolledCourses(true);
    };

    const handleManualRefresh = () => {
        fetchEnrolledCourses(true);
    };

    const renderCourseItem = ({ item }: { item: Course }) => {
        const isSmallScreen = screenData.width < 600;
        const isPending = item.enrollmentStatus === 'pending';
        const completionWarning = getCompletionWarningMessage(item);

        return (
            <View style={[
                styles.courseCard,
                {
                    backgroundColor: item.full_name_color,
                    opacity: isPending ? 0.7 : 1,
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
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isPending && (
                            <View style={styles.pendingBadge}>
                                <Ionicons name="ban" size={12} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={styles.pendingBadgeText}>SUSPENDED</Text>
                            </View>
                        )}
                        {isCourseScheduledForCompletion(item) && (
                            <View style={[styles.pendingBadge, { backgroundColor: '#F59E0B', borderColor: '#D97706', marginLeft: isPending ? 8 : 0 }]}>
                                <Ionicons name="time" size={12} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={styles.pendingBadgeText}>COMPLETING SOON</Text>
                            </View>
                        )}
                        <Ionicons
                            name={item.course_type === "Core Curriculum" ? "school-outline" : "briefcase-outline"}
                            size={isSmallScreen ? 24 : 26}
                            color="black"
                            style={{ marginLeft: (isPending || isCourseScheduledForCompletion(item)) ? 8 : 0 }}
                        />
                    </View>
                </View>

                <Text style={[
                    styles.courseTitle,
                    {
                        fontSize: isSmallScreen ? 18 : 20,
                        marginBottom: isSmallScreen ? 12 : 16
                    }
                ]}>
                    {item.full_name}
                </Text>

                {/* Completion Warning */}
                {completionWarning && (
                    <View style={styles.completionWarningContainer}>
                        <View style={styles.completionWarningHeader}>
                            <Ionicons name="warning" size={20} color="#F59E0B" />
                            <Text style={styles.completionWarningTitle}>COURSE COMPLETION NOTICE</Text>
                        </View>
                        <Text style={styles.completionWarningText}>
                            {completionWarning}
                        </Text>
                    </View>
                )}

                {isPending && (
                    <View style={styles.suspensionContainer}>
                        <View style={styles.suspensionHeader}>
                            <Ionicons name="warning" size={20} color="#DC2626" />
                            <Text style={styles.suspensionTitle}>ACCESS SUSPENDED</Text>
                        </View>

                        {item.suspensionReason ? (
                            <View style={styles.reasonContainer}>
                                <Text style={styles.reasonLabel}>Reason:</Text>
                                <Text style={styles.reasonText}>
                                    {item.suspensionReason}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.defaultSuspensionText}>
                                Payment overdue - Contact admin or clear your dues immediately
                            </Text>
                        )}

                        {(item.overdueMonths ?? 0) > 0 && (
                            <View style={styles.overdueInfo}>
                                <Ionicons name="time" size={16} color="#DC2626" />
                                <Text style={styles.overdueText}>
                                    {item.overdueMonths} month{(item.overdueMonths ?? 0) > 1 ? 's' : ''} behind on payments
                                </Text>
                            </View>
                        )}

                        <View style={styles.urgentAction}>
                            <Ionicons name="flash" size={16} color="#DC2626" />
                            <Text style={styles.urgentActionText}>
                                Immediate payment required to restore access
                            </Text>
                        </View>
                    </View>
                )}

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
                            styles.viewButton,
                            isPending && styles.viewButtonDisabled
                        ]}
                        disabled={isPending}
                    >
                        <Text style={[
                            styles.viewButtonText,
                            { fontSize: isSmallScreen ? 14 : 16 },
                            isPending && styles.viewButtonTextDisabled
                        ]}>
                            {isPending ? 'Clear your dues' : 'View'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>Loading your courses...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { fontSize: screenData.width < 600 ? 20 : 24 }]}>My Batches</Text>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleManualRefresh}
                    disabled={refreshing}
                >
                    <Ionicons
                        name="refresh-outline"
                        size={screenData.width < 600 ? 22 : 24}
                        color="#6366F1"
                        style={{
                            transform: [{ rotate: refreshing ? '360deg' : '0deg' }]
                        }}
                    />
                </TouchableOpacity>
            </View>

            {courses.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons
                        name="school-outline"
                        size={screenData.width < 600 ? 60 : 80}
                        color="#666"
                    />
                    <Text style={[styles.emptyText, { fontSize: screenData.width < 600 ? 18 : 20 }]}>
                        No batches enrolled yet
                    </Text>
                    <Text style={[styles.emptySubText, { fontSize: screenData.width < 600 ? 14 : 16 }]}>
                        Contact admin to enroll in courses
                    </Text>
                    <TouchableOpacity
                        style={styles.refreshEmptyButton}
                        onPress={handleManualRefresh}
                        disabled={refreshing}
                    >
                        <Ionicons name="refresh-outline" size={20} color="#6366F1" />
                        <Text style={styles.refreshEmptyText}>
                            {refreshing ? 'Refreshing...' : 'Tap to refresh'}
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={courses}
                    keyExtractor={item => item.id}
                    renderItem={renderCourseItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#6366F1']}
                            tintColor="#6366F1"
                            title="Pull to refresh enrollment status"
                            titleColor="#666"
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 16,
        color: '#fff',
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    refreshButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    list: {
        paddingBottom: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
    },
    emptySubText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
    },
    refreshEmptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    refreshEmptyText: {
        fontSize: 16,
        color: '#6366F1',
        marginLeft: 8,
        fontWeight: '500',
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
        maxWidth: 400,
        minHeight: 220,
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
    courseTitle: {
        fontWeight: 'bold',
        color: 'black',
        lineHeight: 22,
    },
    courseInfo: {
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    infoText: {
        color: 'black',
        fontWeight: '500',
        marginLeft: 8,
        flex: 1,
        flexWrap: 'wrap',
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
    schedule: {
        fontSize: 12,
        color: '#E5E7EB',
        fontStyle: 'italic',
    },
    pendingBadge: {
        backgroundColor: '#DC2626',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#991B1B',
    },
    pendingBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    pendingNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        padding: 8,
        borderRadius: 8,
        marginBottom: 12,
    },
    pendingNoticeText: {
        color: '#F59E0B',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 6,
    },
    viewButtonDisabled: {
        backgroundColor: '#DC2626',
        borderColor: '#991B1B',
        opacity: 1,
    },
    viewButtonTextDisabled: {
        color: '#fff',
        fontWeight: 'bold',
    },
    suspensionContainer: {
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        borderLeftWidth: 4,
        borderLeftColor: '#DC2626',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    suspensionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    suspensionTitle: {
        color: '#DC2626',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
        textTransform: 'uppercase',
    },
    reasonContainer: {
        backgroundColor: 'rgba(220, 38, 38, 0.05)',
        padding: 8,
        borderRadius: 6,
        marginBottom: 8,
    },
    reasonLabel: {
        color: '#DC2626',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    reasonText: {
        color: '#7F1D1D',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 18,
        fontStyle: 'italic',
    },
    defaultSuspensionText: {
        color: '#DC2626',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    overdueInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(220, 38, 38, 0.08)',
        padding: 6,
        borderRadius: 4,
        marginBottom: 6,
    },
    overdueText: {
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    urgentAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(220, 38, 38, 0.15)',
        padding: 6,
        borderRadius: 4,
    },
    urgentActionText: {
        color: '#991B1B',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 6,
        textTransform: 'uppercase',
    },
    completionWarningContainer: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    completionWarningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    completionWarningTitle: {
        color: '#F59E0B',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
        textTransform: 'uppercase',
    },
    completionWarningText: {
        color: '#D97706',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 18,
    },
});

export default MyBatchesScreen;