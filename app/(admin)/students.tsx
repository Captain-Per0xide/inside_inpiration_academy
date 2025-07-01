import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface EnrolledCourse {
    status: string;
    course_id: string;
    last_trigger_check?: string;
    reason?: string;
    restored_date?: string;
    overdue_months?: number;
    suspended_date?: string;
    restoration_reason?: string;
}

interface Student {
    id: string;
    name: string;
    email: string;
    role: string;
    phone_no?: string;
    alternative_phone_no?: string;
    address?: string;
    dob?: string;
    univ_name?: string;
    enrollment_date?: string;
    current_sem?: number;
    user_image?: string;
    gender?: string;
    enrolled_courses?: EnrolledCourse[];
    isActive?: boolean;
    created_at: string;
}

interface Course {
    id: string;
    codename: string;
    full_name: string;
    codename_color: string;
    full_name_color: string;
    instructor: string;
}

export default function StudentsAdminPage() {
    const [activeStudents, setActiveStudents] = useState<Student[]>([]);
    const [inactiveStudents, setInactiveStudents] = useState<Student[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
    const [loading, setLoading] = useState(false);
    const [showOptions, setShowOptions] = useState<string | null>(null);
    const [expandedCourses, setExpandedCourses] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        fetchStudents();
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*');

            if (error) throw error;
            setCourses(data || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'student');

            if (error) throw error;

            const students = data || [];
            setActiveStudents(students.filter(student => student.isActive === true));
            setInactiveStudents(students.filter(student => student.isActive === false));
        } catch (error) {
            console.error('Error fetching students:', error);
            Alert.alert('Error', 'Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };

    const getCourseInfo = (courseId: string) => {
        return courses.find(course => course.id === courseId);
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'success':
            case 'active':
                return '#4CAF50';
            case 'pending':
                return '#FF9800';
            case 'suspended':
            case 'failed':
                return '#F44336';
            default:
                return '#9E9E9E';
        }
    };

    const toggleCoursesVisibility = (studentId: string) => {
        setExpandedCourses(expandedCourses === studentId ? null : studentId);
    };

    const filterStudents = (students: Student[]) => {
        if (!searchQuery.trim()) return students;

        return students.filter(student =>
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (student.phone_no && student.phone_no.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    };

    const openStudentModal = (student: Student) => {
        setSelectedStudent(student);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedStudent(null);
    };

    const allowCourse = async (studentId: string, courseId: string) => {
        try {
            const student = [...activeStudents, ...inactiveStudents].find(s => s.id === studentId);
            if (!student) return;

            const updatedCourses = student.enrolled_courses?.map(course =>
                course.course_id === courseId
                    ? { ...course, status: 'success' }
                    : course
            ) || [];

            const { error } = await supabase
                .from('users')
                .update({ enrolled_courses: updatedCourses })
                .eq('id', studentId);

            if (error) throw error;

            Alert.alert('Success', 'Course access allowed');
            fetchStudents();
        } catch (error) {
            console.error('Error allowing course:', error);
            Alert.alert('Error', 'Failed to allow course access');
        }
    };

    const restrictCourse = async (studentId: string, courseId: string) => {
        try {
            const student = [...activeStudents, ...inactiveStudents].find(s => s.id === studentId);
            if (!student) return;

            const updatedCourses = student.enrolled_courses?.map(course =>
                course.course_id === courseId
                    ? { ...course, status: 'pending' }
                    : course
            ) || [];

            const { error } = await supabase
                .from('users')
                .update({ enrolled_courses: updatedCourses })
                .eq('id', studentId);

            if (error) throw error;

            Alert.alert('Success', 'Course access restricted');
            fetchStudents();
        } catch (error) {
            console.error('Error restricting course:', error);
            Alert.alert('Error', 'Failed to restrict course access');
        }
    };

    const banStudent = async (studentId: string) => {
        Alert.alert(
            'Confirm Ban',
            'Are you sure you want to ban this student?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Ban',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('users')
                                .update({ role: 'banned' })
                                .eq('id', studentId);

                            if (error) throw error;

                            Alert.alert('Success', 'Student has been banned');
                            fetchStudents();
                        } catch (error) {
                            console.error('Error banning student:', error);
                            Alert.alert('Error', 'Failed to ban student');
                        }
                    }
                }
            ]
        );
    };

    const deactivateStudent = async (studentId: string) => {
        Alert.alert(
            'Confirm Deactivation',
            'Are you sure you want to deactivate this student? This will also set all their enrolled courses to pending.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Deactivate',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const student = [...activeStudents, ...inactiveStudents].find(s => s.id === studentId);
                            if (!student) return;

                            const updatedCourses = student.enrolled_courses?.map(course => ({
                                ...course,
                                status: 'pending'
                            })) || [];

                            const { error } = await supabase
                                .from('users')
                                .update({
                                    isActive: false,
                                    enrolled_courses: updatedCourses
                                })
                                .eq('id', studentId);

                            if (error) throw error;

                            Alert.alert('Success', 'Student has been deactivated');
                            fetchStudents();
                        } catch (error) {
                            console.error('Error deactivating student:', error);
                            Alert.alert('Error', 'Failed to deactivate student');
                        }
                    }
                }
            ]
        );
    };

    const activateStudent = async (studentId: string) => {
        Alert.alert(
            'Confirm Activation',
            'Are you sure you want to activate this student?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Activate',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('users')
                                .update({ isActive: true })
                                .eq('id', studentId);

                            if (error) throw error;

                            Alert.alert('Success', 'Student has been activated');
                            fetchStudents();
                        } catch (error) {
                            console.error('Error activating student:', error);
                            Alert.alert('Error', 'Failed to activate student');
                        }
                    }
                }
            ]
        );
    };

    const renderCourseCard = (course: EnrolledCourse, studentId: string) => {
        const courseInfo = getCourseInfo(course.course_id);

        return (
            <View key={course.course_id} style={styles.courseCard}>
                <View style={styles.courseInfo}>
                    <Text style={styles.courseCodename}>
                        {courseInfo?.codename || 'Unknown Course'}
                    </Text>
                    <Text style={styles.courseFullName}>
                        {courseInfo?.full_name || 'Course not found'}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(course.status) }]}>
                        <Text style={styles.statusText}>{course.status.toUpperCase()}</Text>
                    </View>
                    {course.reason && (
                        <Text style={styles.courseReason} numberOfLines={2}>
                            {course.reason}
                        </Text>
                    )}
                </View>
                <View style={styles.courseActions}>
                    {course.status.toLowerCase() !== 'success' && (
                        <TouchableOpacity
                            style={styles.allowButton}
                            onPress={() => allowCourse(studentId, course.course_id)}
                        >
                            <Text style={styles.allowButtonText}>Allow</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.restrictButton}
                        onPress={() => restrictCourse(studentId, course.course_id)}
                    >
                        <Text style={styles.restrictButtonText}>Restrict</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderStudentItem = ({ item }: { item: Student }) => (
        <TouchableOpacity
            style={styles.studentCard}
            onPress={() => openStudentModal(item)}
            activeOpacity={0.7}
        >
            <View style={styles.studentHeader}>
                <View style={styles.studentImageContainer}>
                    <Image
                        source={{ uri: item.user_image || 'https://via.placeholder.com/60' }}
                        style={styles.studentImage}
                    />
                    {item.isActive && (
                        <View style={styles.studentStatusDot} />
                    )}
                </View>
                <View style={styles.studentBasicInfo}>
                    <Text style={styles.studentName}>{item.name}</Text>
                    <Text style={styles.studentEmail}>{item.email}</Text>
                    <Text style={styles.studentPhone}>{item.phone_no || 'No phone'}</Text>
                    <Text style={styles.studentUniversity}>{item.univ_name}</Text>
                </View>
                <TouchableOpacity
                    style={styles.optionsButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        setShowOptions(showOptions === item.id ? null : item.id);
                    }}
                >
                    <Text style={styles.optionsButtonText}>⋮</Text>
                </TouchableOpacity>
            </View>

            {showOptions === item.id && (
                <View style={styles.optionsMenu}>
                    <TouchableOpacity
                        style={[styles.optionButton, styles.banButton]}
                        onPress={() => banStudent(item.id)}
                    >
                        <Text style={styles.optionButtonText}>Ban Student</Text>
                    </TouchableOpacity>
                    {item.isActive ? (
                        <TouchableOpacity
                            style={[styles.optionButton, styles.deactivateButton]}
                            onPress={() => deactivateStudent(item.id)}
                        >
                            <Text style={styles.optionButtonText}>Deactivate</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.optionButton, styles.activateButton]}
                            onPress={() => activateStudent(item.id)}
                        >
                            <Text style={styles.optionButtonText}>Activate</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <View style={styles.coursesSection}>
                <View style={styles.coursesHeader}>
                    <Text style={styles.coursesHeaderText}>Enrolled Courses:</Text>
                    <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => toggleCoursesVisibility(item.id)}
                    >
                        <Text style={styles.toggleButtonText}>
                            {expandedCourses === item.id ? 'Hide' : 'Show'} ({item.enrolled_courses?.length || 0})
                        </Text>
                    </TouchableOpacity>
                </View>
                {expandedCourses === item.id && (
                    <View style={styles.coursesContent}>
                        {item.enrolled_courses && item.enrolled_courses.length > 0 ? (
                            item.enrolled_courses.map(course => renderCourseCard(course, item.id))
                        ) : (
                            <Text style={styles.noCoursesText}>No courses enrolled</Text>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Page Header */}
            <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>Student Management</Text>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'active' && styles.activeTab]}
                    onPress={() => setActiveTab('active')}
                >
                    <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
                        Active Students ({activeStudents.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'inactive' && styles.activeTab]}
                    onPress={() => setActiveTab('inactive')}
                >
                    <Text style={[styles.tabText, activeTab === 'inactive' && styles.activeTabText]}>
                        Inactive Students ({inactiveStudents.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, email, or phone..."
                    placeholderTextColor="#9ca3af"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <FlatList
                    data={filterStudents(activeTab === 'active' ? activeStudents : inactiveStudents)}
                    keyExtractor={item => item.id}
                    renderItem={renderStudentItem}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={fetchStudents}
                            colors={['#FF5734']}
                            tintColor="#FF5734"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No {activeTab} students found.</Text>
                            <Text style={styles.emptyStateSubtext}>
                                {searchQuery ? 'Try adjusting your search query' : 'Students will appear here once enrolled'}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            {/* Student Detail Modal */}
            <Modal
                animationType="slide"
                visible={modalVisible}
                onRequestClose={closeModal}
                presentationStyle="pageSheet"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Student Details</Text>
                            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {selectedStudent && (
                            <ScrollView
                                style={styles.modalScrollView}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.modalScrollContent}
                            >
                                {/* Student Profile Section */}
                                <View style={styles.profileSection}>
                                    <View style={styles.imageContainer}>
                                        <Image
                                            source={{ uri: selectedStudent.user_image || 'https://via.placeholder.com/120' }}
                                            style={styles.modalStudentImage}
                                        />
                                        {selectedStudent.isActive && (
                                            <View style={styles.statusDot} />
                                        )}
                                    </View>
                                    <View style={styles.profileInfo}>
                                        <Text style={styles.modalStudentName}>{selectedStudent.name}</Text>
                                        <Text style={styles.modalStudentRole}>
                                            Role: {selectedStudent.role} | Status: {selectedStudent.isActive ? 'Active' : 'Inactive'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Personal Information */}
                                <View style={styles.infoSection}>
                                    <Text style={styles.sectionTitle}>Personal Information</Text>

                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>📧 Email:</Text>
                                        <Text style={styles.infoValue}>{selectedStudent.email}</Text>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>📱 Phone:</Text>
                                        <Text style={styles.infoValue}>{selectedStudent.phone_no || 'Not provided'}</Text>
                                    </View>

                                    {selectedStudent.alternative_phone_no && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>📞 Alternative Phone:</Text>
                                            <Text style={styles.infoValue}>{selectedStudent.alternative_phone_no}</Text>
                                        </View>
                                    )}

                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>🏠 Address:</Text>
                                        <Text style={styles.infoValue}>{selectedStudent.address || 'Not provided'}</Text>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>🎂 Date of Birth:</Text>
                                        <Text style={styles.infoValue}>
                                            {selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : 'Not provided'}
                                        </Text>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>👤 Gender:</Text>
                                        <Text style={styles.infoValue}>{selectedStudent.gender || 'Not specified'}</Text>
                                    </View>
                                </View>

                                {/* Academic Information */}
                                <View style={styles.infoSection}>
                                    <Text style={styles.sectionTitle}>Academic Information</Text>

                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>🎓 University:</Text>
                                        <Text style={styles.infoValue}>{selectedStudent.univ_name}</Text>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>📚 Current Semester:</Text>
                                        <Text style={styles.infoValue}>{selectedStudent.current_sem || 'Not specified'}</Text>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>📅 Account Created:</Text>
                                        <Text style={styles.infoValue}>
                                            {new Date(selectedStudent.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
    },
    pageHeader: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        paddingTop: 20,
        backgroundColor: '#111827',
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f9fafb',
        textAlign: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#1f2937',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginHorizontal: 4,
        backgroundColor: '#374151',
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: '#FF5734',
        shadowColor: '#FF5734',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#d1d5db',
    },
    activeTabText: {
        color: '#ffffff',
    },
    content: {
        flex: 1,
        backgroundColor: '#111827',
    },
    listContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    studentCard: {
        backgroundColor: '#1f2937',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#374151',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    studentHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    studentImageContainer: {
        position: 'relative',
        marginRight: 12,
    },
    studentImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#374151',
        borderWidth: 2,
        borderColor: '#6b7280',
    },
    studentStatusDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderColor: '#1f2937',
    },
    studentBasicInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f9fafb',
        marginBottom: 4,
    },
    studentEmail: {
        fontSize: 14,
        color: '#d1d5db',
        marginBottom: 2,
    },
    studentPhone: {
        fontSize: 14,
        color: '#d1d5db',
        marginBottom: 2,
    },
    studentUniversity: {
        fontSize: 14,
        color: '#9ca3af',
    },
    optionsButton: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 15,
        backgroundColor: '#374151',
    },
    optionsButtonText: {
        fontSize: 18,
        color: '#d1d5db',
        fontWeight: 'bold',
    },
    optionsMenu: {
        position: 'absolute',
        top: 50,
        right: 16,
        backgroundColor: '#1f2937',
        borderRadius: 8,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 1000,
        minWidth: 120,
        borderWidth: 1,
        borderColor: '#374151',
    },
    optionButton: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginVertical: 2,
    },
    banButton: {
        backgroundColor: '#ef4444',
    },
    deactivateButton: {
        backgroundColor: '#f59e0b',
    },
    activateButton: {
        backgroundColor: '#10b981',
    },
    optionButtonText: {
        color: '#fff',
        fontWeight: '600',
        textAlign: 'center',
    },
    coursesSection: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#374151',
        paddingTop: 12,
    },
    coursesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    coursesHeaderText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f9fafb',
    },
    toggleButton: {
        backgroundColor: '#FF5734',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    toggleButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    coursesContent: {
        marginTop: 8,
    },
    courseCard: {
        backgroundColor: '#374151',
        borderRadius: 8,
        padding: 12,
        marginVertical: 4,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    courseInfo: {
        flex: 1,
    },
    courseCodename: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#f9fafb',
    },
    courseFullName: {
        fontSize: 12,
        color: '#d1d5db',
        marginVertical: 2,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginVertical: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    courseReason: {
        fontSize: 10,
        color: '#9ca3af',
        fontStyle: 'italic',
    },
    courseActions: {
        flexDirection: 'row',
        gap: 8,
    },
    allowButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    allowButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    restrictButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    restrictButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    noCoursesText: {
        fontSize: 14,
        color: '#9ca3af',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#d1d5db',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    // Search styles
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#111827',
    },
    searchInput: {
        backgroundColor: '#1f2937',
        borderWidth: 1,
        borderColor: '#374151',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#f9fafb',
        fontSize: 16,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: '#111827',
    },
    modalContent: {
        flex: 1,
        backgroundColor: '#1f2937',
        borderWidth: 1,
        borderColor: '#374151',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f9fafb',
    },
    closeButton: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 15,
        backgroundColor: '#374151',
    },
    closeButtonText: {
        fontSize: 18,
        color: '#f9fafb',
        fontWeight: 'bold',
    },
    modalScrollView: {
        flex: 1,
        paddingBottom: 20,
    },
    modalScrollContent: {
        flexGrow: 1,
        paddingBottom: 30,
    },
    profileSection: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    imageContainer: {
        position: 'relative',
        marginRight: 16,
    },
    modalStudentImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#374151',
        borderWidth: 3,
        borderColor: '#6b7280',
    },
    statusDot: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#10b981',
        borderWidth: 3,
        borderColor: '#1f2937',
    },
    profileInfo: {
        flex: 1,
    },
    modalStudentName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#f9fafb',
        marginBottom: 4,
    },
    modalStudentRole: {
        fontSize: 14,
        color: '#d1d5db',
        textTransform: 'capitalize',
    },
    infoSection: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f9fafb',
        marginBottom: 16,
    },
    infoRow: {
        marginBottom: 12,
        paddingVertical: 4,
    },
    infoLabel: {
        fontSize: 14,
        color: '#d1d5db',
        fontWeight: '600',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        color: '#f9fafb',
        lineHeight: 20,
    },
});