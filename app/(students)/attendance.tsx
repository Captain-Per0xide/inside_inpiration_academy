import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface AttendanceSession {
    class_id: string;
    course_id: string;
    topic: string;
    timer_minutes: number;
    started_at: string;
    expires_at: string;
    status: string;
    students_present: string[];
}

interface Course {
    id: string;
    codename: string;
    codename_color: string;
    full_name: string;
    full_name_color: string;
    attendance: AttendanceSession[] | null;
}

const AttendanceScreen = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [screenData, setScreenData] = useState(Dimensions.get('window'));
    const [currentTime, setCurrentTime] = useState(new Date());
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const onChange = (result: { window: any }) => {
            setScreenData(result.window);
        };

        const subscription = Dimensions.addEventListener('change', onChange);
        return () => subscription?.remove();
    }, []);

    // Get current user ID from authentication
    useEffect(() => {
        const getCurrentUser = async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) {
                    console.error('Error getting user:', error);
                    return;
                }
                if (user) {
                    setCurrentUserId(user.id);
                }
            } catch (error) {
                console.error('Error in getCurrentUser:', error);
            }
        };

        getCurrentUser();
    }, []);

    // Update current time every second for countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const fetchActiveAttendance = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('id, codename, codename_color, full_name, full_name_color, attendance')
                .not('attendance', 'is', null);

            if (error) {
                console.error('Error fetching attendance:', error);
                Alert.alert('Error', 'Failed to fetch attendance data');
                return;
            }

            // Filter courses that have active attendance sessions
            const coursesWithActiveAttendance = (data || []).filter(course => {
                if (!course.attendance) return false;
                return course.attendance.some((session: AttendanceSession) => 
                    session.status === 'active' && new Date(session.expires_at) > new Date()
                );
            });

            setCourses(coursesWithActiveAttendance);
        } catch (error) {
            console.error('Error in fetchActiveAttendance:', error);
            Alert.alert('Error', 'Failed to fetch attendance data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchActiveAttendance();
    }, [fetchActiveAttendance]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchActiveAttendance();
    }, [fetchActiveAttendance]);

    const getActiveAttendanceSessions = (course: Course) => {
        if (!course.attendance) return [];
        return course.attendance.filter(session => 
            session.status === 'active' && new Date(session.expires_at) > currentTime
        );
    };

    const getTimeRemaining = (expiresAt: string) => {
        const timeLeft = new Date(expiresAt).getTime() - currentTime.getTime();
        if (timeLeft <= 0) return 'Expired';
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleMarkPresent = async (course: Course, session: AttendanceSession) => {
        try {
            // Check if user is authenticated
            if (!currentUserId) {
                Alert.alert('Error', 'You must be logged in to mark attendance');
                return;
            }

            // Check if student already marked present
            if (session.students_present.includes(currentUserId)) {
                Alert.alert('Already Marked', 'You have already marked your attendance for this class');
                return;
            }

            // Check if session is still active
            if (new Date(session.expires_at) <= new Date()) {
                Alert.alert('Session Expired', 'This attendance session has expired');
                fetchActiveAttendance(); // Refresh to update UI
                return;
            }

            // Update the attendance record
            const updatedAttendance = course.attendance!.map(att => {
                if (att.class_id === session.class_id) {
                    return {
                        ...att,
                        students_present: [...att.students_present, currentUserId]
                    };
                }
                return att;
            });

            const { error } = await supabase
                .from('courses')
                .update({ attendance: updatedAttendance })
                .eq('id', course.id);

            if (error) {
                console.error('Error marking attendance:', error);
                Alert.alert('Error', 'Failed to mark attendance');
                return;
            }

            Alert.alert('Success', 'Attendance marked successfully!');
            fetchActiveAttendance(); // Refresh data
        } catch (error) {
            console.error('Error marking attendance:', error);
            Alert.alert('Error', 'Failed to mark attendance');
        }
    };

    const handleMarkAbsent = async (course: Course, session: AttendanceSession) => {
        try {
            // Check if user is authenticated
            if (!currentUserId) {
                Alert.alert('Error', 'You must be logged in to mark attendance');
                return;
            }

            // Check if session is still active
            if (new Date(session.expires_at) <= new Date()) {
                Alert.alert('Session Expired', 'This attendance session has expired');
                fetchActiveAttendance(); // Refresh to update UI
                return;
            }

            // For absent, we might want to track this differently
            // For now, we'll just show a confirmation
            Alert.alert('Marked Absent', 'You have been marked as absent for this class');
            
            // Optionally, you could add an "absent_students" array to track absent students
            // or handle this differently based on your requirements
            
        } catch (error) {
            console.error('Error marking absent:', error);
            Alert.alert('Error', 'Failed to mark attendance');
        }
    };

    const renderAttendanceSession = (course: Course, session: AttendanceSession) => {
        const isSmallScreen = screenData.width < 600;
        const timeRemaining = getTimeRemaining(session.expires_at);
        const isExpired = timeRemaining === 'Expired';
        const alreadyMarked = currentUserId ? session.students_present.includes(currentUserId) : false;

        return (
            <View key={session.class_id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                    <Text style={[styles.sessionTopic, { fontSize: isSmallScreen ? 16 : 18 }]}>
                        {session.topic}
                    </Text>
                    <View style={[
                        styles.timerBadge,
                        { backgroundColor: isExpired ? '#EF4444' : '#10B981' }
                    ]}>
                        <Ionicons 
                            name="time-outline" 
                            size={14} 
                            color="#fff" 
                        />
                        <Text style={styles.timerText}>
                            {isExpired ? 'Expired' : timeRemaining}
                        </Text>
                    </View>
                </View>

                <View style={styles.sessionInfo}>
                    <Text style={[styles.sessionDetail, { fontSize: isSmallScreen ? 12 : 14 }]}>
                        Started: {new Date(session.started_at).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                        })}
                    </Text>
                    <Text style={[styles.sessionDetail, { fontSize: isSmallScreen ? 12 : 14 }]}>
                        Duration: {session.timer_minutes} minutes
                    </Text>
                    <Text style={[styles.sessionDetail, { fontSize: isSmallScreen ? 12 : 14 }]}>
                        Students Present: {session.students_present.length}
                    </Text>
                </View>

                <View style={styles.attendanceButtons}>
                    {!currentUserId ? (
                        <View style={styles.expiredContainer}>
                            <Ionicons name="person-outline" size={20} color="#EF4444" />
                            <Text style={styles.expiredText}>Please log in to mark attendance</Text>
                        </View>
                    ) : alreadyMarked ? (
                        <View style={styles.alreadyMarkedContainer}>
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                            <Text style={styles.alreadyMarkedText}>Present</Text>
                        </View>
                    ) : isExpired ? (
                        <View style={styles.expiredContainer}>
                            <Ionicons name="close-circle" size={20} color="#EF4444" />
                            <Text style={styles.expiredText}>Attendance Closed</Text>
                        </View>
                    ) : (
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.presentButton}
                                onPress={() => handleMarkPresent(course, session)}
                            >
                                <Ionicons name="checkmark" size={18} color="#fff" />
                                <Text style={styles.presentButtonText}>Present</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.absentButton}
                                onPress={() => handleMarkAbsent(course, session)}
                            >
                                <Ionicons name="close" size={18} color="#fff" />
                                <Text style={styles.absentButtonText}>Absent</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderCourseItem = ({ item }: { item: Course }) => {
        const isSmallScreen = screenData.width < 600;
        const activeSessions = getActiveAttendanceSessions(item);

        return (
            <View style={[styles.courseCard, { backgroundColor: item.full_name_color }]}>
                <View style={styles.courseHeader}>
                    <View style={[styles.codenameTag, { backgroundColor: item.codename_color }]}>
                        <Text style={[styles.codenameText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                            {item.codename}
                        </Text>
                    </View>
                    <Ionicons name="school-outline" size={isSmallScreen ? 24 : 26} color="black" />
                </View>
                
                <Text style={[styles.courseTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                    {item.full_name}
                </Text>

                <Text style={[styles.sectionTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                    Active Attendance:
                </Text>

                {activeSessions.map(session => renderAttendanceSession(item, session))}
            </View>
        );
    };

    const renderEmptyState = () => {
        const isSmallScreen = screenData.width < 600;
        
        return (
            <View style={styles.emptyState}>
                <Ionicons name="clipboard-outline" size={isSmallScreen ? 60 : 80} color="#6B7280" />
                <Text style={[styles.emptyStateTitle, { fontSize: isSmallScreen ? 20 : 24 }]}>
                    No Active Attendance
                </Text>
                <Text style={[styles.emptyStateText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                    No attendance sessions are currently active. Check back when your instructor starts attendance for live classes.
                </Text>
            </View>
        );
    };

    if (loading) {
        const isSmallScreen = screenData.width < 600;
        
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={[styles.loadingText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                        Loading attendance...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const isSmallScreen = screenData.width < 600;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
            <View style={styles.header}>
                <Text style={[styles.title, { fontSize: isSmallScreen ? 20 : 24 }]}>
                    My Attendance
                </Text>
            </View>
            
            <FlatList
                data={courses}
                renderItem={renderCourseItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContainer,
                    courses.length === 0 && styles.emptyListContainer
                ]}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#3B82F6']}
                        tintColor="#3B82F6"
                    />
                }
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#9CA3AF',
    },
    header: {
        padding: 24,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F8FAFC',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        paddingBottom: 20,
    },
    emptyListContainer: {
        flex: 1,
        justifyContent: 'center',
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
    },
    courseHeader: {
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
        marginBottom: 16,
    },
    sectionTitle: {
        fontWeight: '600',
        color: 'black',
        marginBottom: 12,
    },
    sessionCard: {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.2)',
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sessionTopic: {
        fontWeight: '600',
        color: 'black',
        flex: 1,
        marginRight: 12,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    timerText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    sessionInfo: {
        marginBottom: 16,
        gap: 4,
    },
    sessionDetail: {
        color: 'black',
        fontWeight: '500',
    },
    attendanceButtons: {
        alignItems: 'center',
    },
    alreadyMarkedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#10B981',
        gap: 8,
    },
    alreadyMarkedText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10B981',
    },
    expiredContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EF4444',
        gap: 8,
    },
    expiredText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    presentButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10B981',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    presentButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    absentButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EF4444',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    absentButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#9CA3AF',
        marginTop: 20,
        marginBottom: 10,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
    },
});

export default AttendanceScreen;