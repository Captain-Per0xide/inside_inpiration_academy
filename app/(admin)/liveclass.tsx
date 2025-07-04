import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface ScheduledClass {
    id: string;
    topic: string;
    status: 'scheduled' | 'live' | 'ended';
    createdAt: string;
    createdBy: string;
    meetingLink: string;
    scheduledDateTime: string;
}

interface Course {
    id: string;
    codename: string;
    codename_color: string;
    full_name: string;
    full_name_color: string;
    scheduled_classes: ScheduledClass[] | null;
    attendance: any[] | null;
}

interface User {
    id: string;
    name: string;
    email: string;
    user_image: string;
}

interface AttendanceRecord {
    topic: string;
    status: string;
    class_id: string;
    course_id: string;
    expires_at: string;
    started_at: string;
    timer_minutes: number;
    students_present: string[];
}

const LiveClassAdminPage = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [screenData, setScreenData] = useState(Dimensions.get('window'));
    
    // Tab state
    const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
    
    // Attendance modal states
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState<{course: Course, classItem: ScheduledClass} | null>(null);
    const [attendanceTimer, setAttendanceTimer] = useState('');
    
    // History states
    const [attendanceHistory, setAttendanceHistory] = useState<{course: Course, record: AttendanceRecord, students: User[]}[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        const onChange = (result: { window: any }) => {
            setScreenData(result.window);
        };

        const subscription = Dimensions.addEventListener('change', onChange);
        return () => subscription?.remove();
    }, []);

    const fetchCourses = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('id, codename, codename_color, full_name, full_name_color, scheduled_classes, attendance')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching courses:', error);
                Alert.alert('Error', 'Failed to fetch courses');
                return;
            }

            setCourses(data || []);
        } catch (error) {
            console.error('Error in fetchCourses:', error);
            Alert.alert('Error', 'Failed to fetch courses');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchAttendanceHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select('id, codename, codename_color, full_name, full_name_color, attendance')
                .order('created_at', { ascending: false });

            if (coursesError) {
                console.error('Error fetching courses for history:', coursesError);
                Alert.alert('Error', 'Failed to fetch attendance history');
                return;
            }

            const historyData: {course: Course, record: AttendanceRecord, students: User[]}[] = [];

            for (const course of coursesData || []) {
                if (!course.attendance) continue;

                for (const attendanceRecord of course.attendance) {
                    if (attendanceRecord.students_present && attendanceRecord.students_present.length > 0) {
                        // Fetch student details
                        const { data: studentsData, error: studentsError } = await supabase
                            .from('users')
                            .select('id, name, email, user_image')
                            .in('id', attendanceRecord.students_present);

                        if (studentsError) {
                            console.error('Error fetching students:', studentsError);
                            continue;
                        }

                        historyData.push({
                            course: { ...course, scheduled_classes: null },
                            record: attendanceRecord,
                            students: studentsData || []
                        });
                    }
                }
            }

            // Sort by started_at date (most recent first)
            historyData.sort((a, b) => new Date(b.record.started_at).getTime() - new Date(a.record.started_at).getTime());
            setAttendanceHistory(historyData);

        } catch (error) {
            console.error('Error in fetchAttendanceHistory:', error);
            Alert.alert('Error', 'Failed to fetch attendance history');
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCourses();
        
        // Set up interval to check for expired attendance sessions
        const interval = setInterval(() => {
            courses.forEach(course => {
                if (!course.attendance) return;
                
                const expiredSessions = course.attendance.filter((att: any) => 
                    att.status === 'active' && new Date(att.expires_at) <= new Date()
                );
                
                expiredSessions.forEach(session => {
                    updateExpiredAttendance(course, session);
                });
            });
        }, 30000); // Check every 30 seconds
        
        return () => clearInterval(interval);
    }, [fetchCourses]);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchAttendanceHistory();
        }
    }, [activeTab, fetchAttendanceHistory]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        if (activeTab === 'live') {
            fetchCourses();
        } else {
            fetchAttendanceHistory();
            setRefreshing(false);
        }
    }, [fetchCourses, fetchAttendanceHistory, activeTab]);

    const handleStartAttendance = (course: Course, classItem: ScheduledClass) => {
        setSelectedClass({ course, classItem });
        setShowAttendanceModal(true);
    };

    const handleSaveAttendance = async () => {
        if (!selectedClass || !attendanceTimer) {
            Alert.alert('Error', 'Please enter attendance timer in minutes');
            return;
        }

        const timer = parseInt(attendanceTimer);
        if (isNaN(timer) || timer <= 0) {
            Alert.alert('Error', 'Please enter a valid timer in minutes');
            return;
        }

        try {
            const attendanceData = {
                class_id: selectedClass.classItem.id,
                course_id: selectedClass.course.id,
                topic: selectedClass.classItem.topic,
                timer_minutes: timer,
                started_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + timer * 60 * 1000).toISOString(),
                status: 'active',
                students_present: []
            };

            // Get existing attendance data
            const existingAttendance = selectedClass.course.attendance || [];
            const updatedAttendance = [...existingAttendance, attendanceData];

            const { error } = await supabase
                .from('courses')
                .update({ attendance: updatedAttendance })
                .eq('id', selectedClass.course.id);

            if (error) {
                console.error('Error saving attendance:', error);
                Alert.alert('Error', 'Failed to start attendance');
                return;
            }

            Alert.alert('Success', `Attendance started for ${timer} minutes`);
            setShowAttendanceModal(false);
            setSelectedClass(null);
            setAttendanceTimer('');
            fetchCourses();
        } catch (error) {
            console.error('Error starting attendance:', error);
            Alert.alert('Error', 'Failed to start attendance');
        }
    };

    const getLiveClasses = (course: Course) => {
        if (!course.scheduled_classes) return [];
        return course.scheduled_classes.filter(cls => cls.status === 'live');
    };

    const getActiveAttendance = (course: Course, classId: string) => {
        if (!course.attendance) return null;
        return course.attendance.find((att: any) => 
            att.class_id === classId && 
            att.status === 'active' && 
            new Date(att.expires_at) > new Date()
        );
    };

    const getExpiredAttendance = (course: Course, classId: string) => {
        if (!course.attendance) return null;
        const expiredActive = course.attendance.find((att: any) => 
            att.class_id === classId && 
            att.status === 'active' && 
            new Date(att.expires_at) <= new Date()
        );
        if (expiredActive) return expiredActive;
        
        // Also check for recently set inactive sessions (within last hour)
        return course.attendance.find((att: any) => 
            att.class_id === classId && 
            att.status === 'inactive' && 
            new Date(att.expires_at) > new Date(Date.now() - 60 * 60 * 1000) // Within last hour
        );
    };

    const updateExpiredAttendance = async (course: Course, attendanceItem: any) => {
        try {
            // Only update if status is still 'active'
            if (attendanceItem.status !== 'active') return;
            
            const updatedAttendance = course.attendance?.map((att: any) => 
                att.class_id === attendanceItem.class_id && 
                att.started_at === attendanceItem.started_at &&
                att.status === 'active'
                    ? { ...att, status: 'inactive' }
                    : att
            ) || [];

            await supabase
                .from('courses')
                .update({ attendance: updatedAttendance })
                .eq('id', course.id);

            // Refresh courses to update UI
            fetchCourses();
        } catch (error) {
            console.error('Error updating expired attendance:', error);
        }
    };

    const renderHistoryItem = ({ item }: { item: {course: Course, record: AttendanceRecord, students: User[]} }) => {
        const isSmallScreen = screenData.width < 600;
        const startedDate = new Date(item.record.started_at);
        const expiredDate = new Date(item.record.expires_at);

        return (
            <View style={[styles.historyCard, { backgroundColor: item.course.full_name_color }]}>
                <View style={styles.historyHeader}>
                    <View style={[styles.codenameTag, { backgroundColor: item.course.codename_color }]}>
                        <Text style={[styles.codenameText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                            {item.course.codename}
                        </Text>
                    </View>
                    <View style={styles.historyDateInfo}>
                        <Text style={[styles.historyDate, { fontSize: isSmallScreen ? 12 : 14 }]}>
                            {startedDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                            })}
                        </Text>
                        <Text style={[styles.historyTime, { fontSize: isSmallScreen ? 10 : 12 }]}>
                            {startedDate.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true 
                            })}
                        </Text>
                    </View>
                </View>
                
                <Text style={[styles.courseTitle, { fontSize: isSmallScreen ? 16 : 18 }]}>
                    {item.course.full_name}
                </Text>

                <View style={styles.historyTopicContainer}>
                    <Text style={[styles.historyTopic, { fontSize: isSmallScreen ? 14 : 16 }]}>
                        Topic: {item.record.topic}
                    </Text>
                    <View style={styles.historyStats}>
                        <Text style={[styles.historyDuration, { fontSize: isSmallScreen ? 12 : 14 }]}>
                            Duration: {item.record.timer_minutes}m
                        </Text>
                        <Text style={[styles.historyStudentCount, { fontSize: isSmallScreen ? 12 : 14 }]}>
                            Students: {item.students.length}
                        </Text>
                    </View>
                </View>

                {item.students.length > 0 && (
                    <View style={styles.studentsContainer}>
                        <Text style={[styles.studentsLabel, { fontSize: isSmallScreen ? 14 : 16 }]}>
                            Students Present:
                        </Text>
                        <View style={styles.studentsList}>
                            {item.students.map((student) => (
                                <View key={student.id} style={styles.studentItem}>
                                    <Image
                                        source={{ uri: student.user_image }}
                                        style={styles.studentImage}
                                        defaultSource={{ uri: 'https://ideogram.ai/assets/image/lossless/response/SkOxfnd_TdKmbNfTZ1ObbA' }}
                                    />
                                    <Text style={[styles.studentName, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                        {student.name}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const renderHistoryEmptyState = () => {
        const isSmallScreen = screenData.width < 600;
        
        return (
            <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={isSmallScreen ? 60 : 80} color="#6B7280" />
                <Text style={[styles.emptyStateTitle, { fontSize: isSmallScreen ? 20 : 24 }]}>
                    No Attendance History
                </Text>
                <Text style={[styles.emptyStateText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                    No attendance records found for any courses
                </Text>
            </View>
        );
    };

    const renderCourseItem = ({ item }: { item: Course }) => {
        const isSmallScreen = screenData.width < 600;
        const liveClasses = getLiveClasses(item);

        if (liveClasses.length === 0) return null;

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
                    Live Classes:
                </Text>

                {liveClasses.map((classItem) => {
                    const activeAttendance = getActiveAttendance(item, classItem.id);
                    const expiredAttendance = getExpiredAttendance(item, classItem.id);
                    const scheduledTime = new Date(classItem.scheduledDateTime);
                    
                    return (
                        <View key={classItem.id} style={styles.classItem}>
                            <View style={styles.classInfo}>
                                <View style={styles.classDetails}>
                                    <Text style={[styles.classTopic, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                        {classItem.topic}
                                    </Text>
                                    <View style={styles.classMetaInfo}>
                                        <View style={styles.statusBadge}>
                                            <View style={styles.liveIndicator} />
                                            <Text style={styles.statusText}>LIVE</Text>
                                        </View>
                                        <Text style={[styles.classTime, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                            {scheduledTime.toLocaleTimeString('en-US', { 
                                                hour: '2-digit', 
                                                minute: '2-digit',
                                                hour12: true 
                                            })}
                                        </Text>
                                    </View>
                                </View>
                                
                                {activeAttendance ? (
                                    <View style={styles.attendanceActive}>
                                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                        <Text style={styles.attendanceActiveText}>
                                            Active ({Math.ceil((new Date(activeAttendance.expires_at).getTime() - Date.now()) / 60000)}m left)
                                        </Text>
                                    </View>
                                ) : expiredAttendance ? (
                                    <View style={styles.attendanceSaved}>
                                        <Ionicons name="save-outline" size={20} color="#E5E7EB" />
                                        <Text style={styles.attendanceSavedText}>
                                            Attendance saved
                                        </Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.startAttendanceButton}
                                        onPress={() => handleStartAttendance(item, classItem)}
                                    >
                                        <Ionicons name="time-outline" size={16} color="#fff" />
                                        <Text style={styles.startAttendanceButtonText}>Start Attendance</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderEmptyState = () => {
        const isSmallScreen = screenData.width < 600;
        
        return (
            <View style={styles.emptyState}>
                <Ionicons name="videocam-outline" size={isSmallScreen ? 60 : 80} color="#6B7280" />
                <Text style={[styles.emptyStateTitle, { fontSize: isSmallScreen ? 20 : 24 }]}>
                    No Live Classes
                </Text>
                <Text style={[styles.emptyStateText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                    No courses have live classes at the moment
                </Text>
            </View>
        );
    };

    if (loading) {
        const isSmallScreen = screenData.width < 600;
        
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={[styles.loadingText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                    Loading live classes...
                </Text>
            </View>
        );
    }

    const isSmallScreen = screenData.width < 600;
    const coursesWithLiveClasses = courses.filter(course => getLiveClasses(course).length > 0);

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { fontSize: isSmallScreen ? 20 : 24 }]}>
                Live Class Management
            </Text>
            
            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'live' && styles.activeTab]}
                    onPress={() => setActiveTab('live')}
                >
                    <Ionicons 
                        name="videocam" 
                        size={20} 
                        color={activeTab === 'live' ? '#fff' : '#9CA3AF'} 
                    />
                    <Text style={[
                        styles.tabText, 
                        activeTab === 'live' && styles.activeTabText,
                        { fontSize: isSmallScreen ? 14 : 16 }
                    ]}>
                        Live Attendance
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                    onPress={() => setActiveTab('history')}
                >
                    <Ionicons 
                        name="time" 
                        size={20} 
                        color={activeTab === 'history' ? '#fff' : '#9CA3AF'} 
                    />
                    <Text style={[
                        styles.tabText, 
                        activeTab === 'history' && styles.activeTabText,
                        { fontSize: isSmallScreen ? 14 : 16 }
                    ]}>
                        Attendance History
                    </Text>
                </TouchableOpacity>
            </View>
            
            {/* Tab Content */}
            {activeTab === 'live' ? (
                <FlatList
                    data={coursesWithLiveClasses}
                    renderItem={renderCourseItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.listContainer,
                        coursesWithLiveClasses.length === 0 && styles.emptyListContainer
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
            ) : (
                <>
                    {historyLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#3B82F6" />
                            <Text style={[styles.loadingText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                Loading attendance history...
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={attendanceHistory}
                            renderItem={renderHistoryItem}
                            keyExtractor={(item) => `${item.course.id}-${item.record.class_id}-${item.record.started_at}`}
                            contentContainerStyle={[
                                styles.listContainer,
                                attendanceHistory.length === 0 && styles.emptyListContainer
                            ]}
                            ListEmptyComponent={renderHistoryEmptyState}
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
                    )}
                </>
            )}

            {/* Attendance Timer Modal */}
            <Modal
                visible={showAttendanceModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAttendanceModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Start Attendance</Text>
                            <TouchableOpacity
                                onPress={() => setShowAttendanceModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Ionicons name="close" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        {selectedClass && (
                            <View style={styles.modalBody}>
                                <Text style={styles.modalClassInfo}>
                                    {selectedClass.course.full_name} - {selectedClass.classItem.topic}
                                </Text>
                                
                                <Text style={styles.modalLabel}>Attendance Timer (minutes):</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Enter minutes (e.g., 5, 10, 15)"
                                    placeholderTextColor="#9CA3AF"
                                    value={attendanceTimer}
                                    onChangeText={setAttendanceTimer}
                                    keyboardType="numeric"
                                />
                                
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={styles.modalCancelButton}
                                        onPress={() => setShowAttendanceModal(false)}
                                    >
                                        <Text style={styles.modalCancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        style={styles.modalSaveButton}
                                        onPress={handleSaveAttendance}
                                    >
                                        <Text style={styles.modalSaveButtonText}>Start Attendance</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 10,
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
        color: '#9CA3AF',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#F9FAFB',
    },
    
    // Tab styles
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
    },
    activeTab: {
        backgroundColor: '#3B82F6',
    },
    tabText: {
        fontWeight: '500',
        color: '#9CA3AF',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: '600',
    },
    
    listContainer: {
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
    
    // History card styles
    historyCard: {
        margin: 8,
        padding: 16,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    historyDateInfo: {
        alignItems: 'flex-end',
    },
    historyDate: {
        fontWeight: '600',
        color: 'black',
    },
    historyTime: {
        color: 'black',
        opacity: 0.7,
    },
    historyTopicContainer: {
        marginBottom: 16,
    },
    historyTopic: {
        fontWeight: '600',
        color: 'black',
        marginBottom: 8,
    },
    historyStats: {
        flexDirection: 'row',
        gap: 16,
    },
    historyDuration: {
        color: 'black',
        fontWeight: '500',
    },
    historyStudentCount: {
        color: 'black',
        fontWeight: '500',
    },
    studentsContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 8,
        padding: 12,
    },
    studentsLabel: {
        fontWeight: '600',
        color: 'black',
        marginBottom: 12,
    },
    studentsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    studentItem: {
        alignItems: 'center',
        marginBottom: 8,
        minWidth: 80,
    },
    studentImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginBottom: 4,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    studentName: {
        fontWeight: '500',
        color: 'black',
        textAlign: 'center',
        maxWidth: 80,
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
    classItem: {
        backgroundColor: '#27395C',
        borderRadius: 18,
        padding: 24,
        marginBottom: 8,
    },
    classInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    classDetails: {
        flex: 1,
        marginRight: 12,
    },
    classTopic: {
        fontWeight: '600',
        color: 'white',
        marginBottom: 4,
    },
    classMetaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    liveIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#EF4444',
        marginRight: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#EF4444',
        textTransform: 'uppercase',
    },
    classTime: {
        color: 'white',
        fontWeight: '500',
    },
    attendanceActive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#10B981',
    },
    attendanceActiveText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
        marginLeft: 4,
    },
    attendanceSaved: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2D3748',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#4A5568',
    },
    attendanceSavedText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#E5E7EB',
        marginLeft: 4,
    },
    startAttendanceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    startAttendanceButtonText: {
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
    
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: '#1F2937',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#F9FAFB',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalBody: {
        padding: 20,
    },
    modalClassInfo: {
        fontSize: 16,
        fontWeight: '500',
        color: '#D1D5DB',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#F9FAFB',
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: '#374151',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#F9FAFB',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#4B5563',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        backgroundColor: '#374151',
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#4B5563',
    },
    modalCancelButtonText: {
        color: '#D1D5DB',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    modalSaveButton: {
        flex: 1,
        backgroundColor: '#3B82F6',
        paddingVertical: 12,
        borderRadius: 8,
    },
    modalSaveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default LiveClassAdminPage;