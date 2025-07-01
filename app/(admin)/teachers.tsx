import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    user_image: string;
    expertise?: string;
    phone_no?: string;
    alternative_phone_no?: string;
    address?: string;
    dob?: string;
    univ_name?: string;
    hire_date?: string;
    gender?: string;
    experience?: string;
    add_message?: string;
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

type TabType = 'teachers' | 'appoint';

const TeacherManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('teachers');
    const [teachers, setTeachers] = useState<User[]>([]);
    const [teacherRequests, setTeacherRequests] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
    const [selectedTeacherRequest, setSelectedTeacherRequest] = useState<User | null>(null);
    const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [requestModalVisible, setRequestModalVisible] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    // Fetch current teachers (admin and teacher roles)
    const fetchTeachers = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, role, user_image, expertise, phone_no, alternative_phone_no, address, dob, univ_name, hire_date, gender, created_at')
                .in('role', ['admin', 'teacher'])
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching teachers:', error);
                Alert.alert('Error', 'Failed to fetch teachers');
                return;
            }

            setTeachers(data || []);
        } catch (error) {
            console.error('Error in fetchTeachers:', error);
            Alert.alert('Error', 'Failed to load teachers');
        }
    }, []);

    // Fetch teacher appointment requests
    const fetchTeacherRequests = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, role, user_image, expertise, phone_no, experience, add_message, created_at')
                .eq('role', 'req-teacher')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching teacher requests:', error);
                Alert.alert('Error', 'Failed to fetch teacher requests');
                return;
            }

            setTeacherRequests(data || []);
        } catch (error) {
            console.error('Error in fetchTeacherRequests:', error);
            Alert.alert('Error', 'Failed to load teacher requests');
        }
    }, []);

    // Load data on component mount
    const loadData = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchTeachers(), fetchTeacherRequests()]);
        setLoading(false);
    }, [fetchTeachers, fetchTeacherRequests]);

    // Refresh data
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    // Appoint a teacher (change role from req-teacher to teacher)
    const appointTeacher = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ 
                    role: 'teacher',
                    hire_date: new Date().toISOString().split('T')[0]
                })
                .eq('id', userId);

            if (error) {
                console.error('Error appointing teacher:', error);
                Alert.alert('Error', 'Failed to appoint teacher');
                return;
            }

            Alert.alert('Success', 'Teacher appointed successfully!');
            // Refresh data to reflect changes
            await loadData();
        } catch (error) {
            console.error('Error in appointTeacher:', error);
            Alert.alert('Error', 'Failed to appoint teacher');
        }
    };

    // Reject a teacher request (delete or change role)
    const rejectTeacherRequest = async (userId: string) => {
        Alert.alert(
            'Reject Request',
            'Are you sure you want to reject this teacher request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('users')
                                .update({ role: 'guest' })
                                .eq('id', userId);

                            if (error) {
                                console.error('Error rejecting teacher request:', error);
                                Alert.alert('Error', 'Failed to reject request');
                                return;
                            }

                            Alert.alert('Success', 'Teacher request rejected');
                            await loadData();
                        } catch (error) {
                            console.error('Error in rejectTeacherRequest:', error);
                            Alert.alert('Error', 'Failed to reject request');
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Fetch teacher details and their courses
    const fetchTeacherDetails = async (teacher: User) => {
        try {
            setDetailLoading(true);
            setSelectedTeacher(teacher);
            setModalVisible(true);

            // Fetch courses taught by this teacher
            const { data: courses, error } = await supabase
                .from('courses')
                .select('id, codename, full_name, codename_color, full_name_color, instructor')
                .eq('instructor', teacher.name);

            if (error) {
                console.error('Error fetching teacher courses:', error);
                setTeacherCourses([]);
            } else {
                setTeacherCourses(courses || []);
            }
        } catch (error) {
            console.error('Error in fetchTeacherDetails:', error);
            setTeacherCourses([]);
        } finally {
            setDetailLoading(false);
        }
    };

    // Close modal
    const closeModal = () => {
        setModalVisible(false);
        setSelectedTeacher(null);
        setTeacherCourses([]);
    };

    // Render teacher card
    const renderTeacherCard = ({ item }: { item: User }) => (
        <TouchableOpacity 
            style={styles.teacherCard}
            onPress={() => fetchTeacherDetails(item)}
        >
            <Image 
                source={{ uri: item.user_image || 'https://via.placeholder.com/60' }}
                style={styles.teacherImage}
            />
            <View style={styles.teacherInfo}>
                <Text style={styles.teacherName}>{item.name}</Text>
                <Text style={styles.teacherEmail}>{item.email}</Text>
                <Text style={styles.teacherRole}>Role: {item.role}</Text>
                {item.expertise && (
                    <Text style={styles.teacherExpertise}>Expertise: {item.expertise}</Text>
                )}
                {item.hire_date && (
                    <Text style={styles.teacherHireDate}>
                        Hired: {new Date(item.hire_date).toLocaleDateString()}
                    </Text>
                )}
            </View>
            <View style={styles.statusBadge}>
                {item.role === 'admin' ? (
                    <Ionicons name="medal-outline" size={16} color="#fbbf24" />
                ) : (
                    <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                )}
            </View>
        </TouchableOpacity>
    );

    // Render teacher request card
    const renderTeacherRequestCard = ({ item }: { item: User }) => (
        <View style={styles.requestCard}>
            <Image 
                source={{ uri: item.user_image || 'https://via.placeholder.com/60' }}
                style={styles.teacherImage}
            />
            <View style={styles.teacherInfo}>
                <Text style={styles.teacherName}>{item.name}</Text>
                <Text style={styles.teacherEmail}>{item.email}</Text>
                {item.expertise && (
                    <Text style={styles.teacherExpertise}>Expertise: {item.expertise}</Text>
                )}
                {item.phone_no && (
                    <Text style={styles.teacherPhone}>Phone: {item.phone_no}</Text>
                )}
                <Text style={styles.requestDate}>
                    Requested: {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={styles.viewDetailsButton}
                    onPress={() => {
                        setSelectedTeacherRequest(item);
                        setRequestModalVisible(true);
                    }}
                >
                    <Text style={styles.viewDetailsButtonText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.approveButton}
                    onPress={() => appointTeacher(item.id)}
                >
                    <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.rejectButton}
                    onPress={() => rejectTeacherRequest(item.id)}
                >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Render teacher detail modal
    const renderTeacherDetailModal = () => (
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
                        <Text style={styles.modalTitle}>Teacher Details</Text>
                        <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#f9fafb" />
                        </TouchableOpacity>
                    </View>

                    {selectedTeacher && (
                        <ScrollView 
                            style={styles.modalScrollView} 
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalScrollContent}
                        >
                            {/* Teacher Profile Section */}
                            <View style={styles.profileSection}>
                                <Image 
                                    source={{ uri: selectedTeacher.user_image || 'https://via.placeholder.com/120' }}
                                    style={styles.modalTeacherImage}
                                />
                                <View style={styles.profileInfo}>
                                    <Text style={styles.modalTeacherName}>{selectedTeacher.name}</Text>
                                    <View style={styles.roleContainer}>
                                        <Text style={styles.modalTeacherRole}>{selectedTeacher.role}</Text>
                                        {selectedTeacher.role === 'admin' ? (
                                            <Ionicons name="medal-outline" size={20} color="#fbbf24" style={styles.roleIcon} />
                                        ) : (
                                            <View style={[styles.modalStatusDot, { backgroundColor: '#10b981' }]} />
                                        )}
                                    </View>
                                </View>
                            </View>

                            {/* Personal Information */}
                            <View style={styles.infoSection}>
                                <Text style={styles.sectionTitle}>Personal Information</Text>
                                
                                <View style={styles.infoRow}>
                                    <View style={styles.infoHeader}>
                                        <Ionicons name="mail-outline" size={16} color="#9ca3af" />
                                        <Text style={styles.infoLabel}>Email</Text>
                                    </View>
                                    <Text style={styles.infoValue}>{selectedTeacher.email}</Text>
                                </View>

                                {selectedTeacher.phone_no && (
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoHeader}>
                                            <Ionicons name="call-outline" size={16} color="#9ca3af" />
                                            <Text style={styles.infoLabel}>Phone</Text>
                                        </View>
                                        <Text style={styles.infoValue}>{selectedTeacher.phone_no}</Text>
                                    </View>
                                )}

                                {selectedTeacher.alternative_phone_no && (
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoHeader}>
                                            <Ionicons name="call-outline" size={16} color="#9ca3af" />
                                            <Text style={styles.infoLabel}>Alt Phone</Text>
                                        </View>
                                        <Text style={styles.infoValue}>{selectedTeacher.alternative_phone_no}</Text>
                                    </View>
                                )}

                                {selectedTeacher.address && (
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoHeader}>
                                            <Ionicons name="location-outline" size={16} color="#9ca3af" />
                                            <Text style={styles.infoLabel}>Address</Text>
                                        </View>
                                        <Text style={styles.infoValue}>{selectedTeacher.address}</Text>
                                    </View>
                                )}

                                {selectedTeacher.dob && (
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoHeader}>
                                            <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
                                            <Text style={styles.infoLabel}>Date of Birth</Text>
                                        </View>
                                        <Text style={styles.infoValue}>
                                            {new Date(selectedTeacher.dob).toLocaleDateString()}
                                        </Text>
                                    </View>
                                )}

                                {selectedTeacher.gender && (
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoHeader}>
                                            <Ionicons name="person-outline" size={16} color="#9ca3af" />
                                            <Text style={styles.infoLabel}>Gender</Text>
                                        </View>
                                        <Text style={styles.infoValue}>{selectedTeacher.gender}</Text>
                                    </View>
                                )}

                                {selectedTeacher.univ_name && (
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoHeader}>
                                            <Ionicons name="school-outline" size={16} color="#9ca3af" />
                                            <Text style={styles.infoLabel}>University</Text>
                                        </View>
                                        <Text style={styles.infoValue}>{selectedTeacher.univ_name}</Text>
                                    </View>
                                )}

                                {selectedTeacher.expertise && (
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoHeader}>
                                            <Ionicons name="bulb-outline" size={16} color="#9ca3af" />
                                            <Text style={styles.infoLabel}>Expertise</Text>
                                        </View>
                                        <Text style={styles.infoValue}>{selectedTeacher.expertise}</Text>
                                    </View>
                                )}

                                {selectedTeacher.hire_date && (
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoHeader}>
                                            <Ionicons name="briefcase-outline" size={16} color="#9ca3af" />
                                            <Text style={styles.infoLabel}>Hire Date</Text>
                                        </View>
                                        <Text style={styles.infoValue}>
                                            {new Date(selectedTeacher.hire_date).toLocaleDateString()}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Courses Section */}
                            <View style={styles.coursesSection}>
                                <Text style={styles.sectionTitle}>Courses Teaching</Text>
                                {detailLoading ? (
                                    <View style={styles.coursesLoading}>
                                        <ActivityIndicator size="small" color="#FF5734" />
                                        <Text style={styles.loadingText}>Loading courses...</Text>
                                    </View>
                                ) : teacherCourses.length > 0 ? (
                                    teacherCourses.map((course) => (
                                        <View key={course.id} style={styles.courseCard}>
                                            <View style={[styles.courseCodeSection, { backgroundColor: course.codename_color }]}>
                                                <Text style={styles.courseCode}>{course.codename}</Text>
                                            </View>
                                            <View style={[styles.courseNameSection, { backgroundColor: course.full_name_color }]}>
                                                <Text style={styles.courseName}>{course.full_name}</Text>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <View style={styles.noCoursesContainer}>
                                        <Ionicons name="book-outline" size={24} color="#6b7280" />
                                        <Text style={styles.noCoursesText}>No courses assigned</Text>
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );

    // Render requested teacher detail modal
    const renderRequestedTeacherDetailModal = () => (
        <Modal
            animationType="slide"
            visible={requestModalVisible}
            onRequestClose={() => setRequestModalVisible(false)}
            presentationStyle="pageSheet"
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Requested Teacher Details</Text>
                        <TouchableOpacity onPress={() => setRequestModalVisible(false)} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#f9fafb" />
                        </TouchableOpacity>
                    </View>

                    {selectedTeacherRequest && (
                        <ScrollView 
                            style={styles.modalScrollView} 
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalScrollContent}
                        >
                            {/* Teacher Profile Section */}
                            <View style={styles.profileSection}>
                                <Image 
                                    source={{ uri: selectedTeacherRequest.user_image || 'https://via.placeholder.com/120' }}
                                    style={styles.modalTeacherImage}
                                />
                                <View style={styles.profileInfo}>
                                    <Text style={styles.modalTeacherName}>{selectedTeacherRequest.name}</Text>
                                    <View style={styles.roleContainer}>
                                        <Text style={styles.modalTeacherRole}>Teacher Request</Text>
                                        <View style={[styles.modalStatusDot, { backgroundColor: '#fbbf24' }]} />
                                    </View>
                                </View>
                            </View>

                            {/* Personal Information */}
                            <View style={styles.infoSection}>
                                <Text style={styles.sectionTitle}>Personal Information</Text>
                                
                                <View style={styles.infoRow}>
                                    <View style={styles.infoHeader}>
                                        <Ionicons name="mail-outline" size={16} color="#9ca3af" />
                                        <Text style={styles.infoLabel}>Email</Text>
                                    </View>
                                    <Text style={styles.infoValue}>{selectedTeacherRequest.email}</Text>
                                </View>

                                {selectedTeacherRequest.phone_no && (
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoHeader}>
                                            <Ionicons name="call-outline" size={16} color="#9ca3af" />
                                            <Text style={styles.infoLabel}>Phone</Text>
                                        </View>
                                        <Text style={styles.infoValue}>{selectedTeacherRequest.phone_no}</Text>
                                    </View>
                                )}

                                <View style={styles.infoRow}>
                                    <View style={styles.infoHeader}>
                                        <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
                                        <Text style={styles.infoLabel}>Request Date</Text>
                                    </View>
                                    <Text style={styles.infoValue}>
                                        {new Date(selectedTeacherRequest.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>

                            {/* Expertise Section */}
                            {selectedTeacherRequest.expertise && (
                                <View style={styles.infoSection}>
                                    <Text style={styles.sectionTitle}>Expertise</Text>
                                    <View style={styles.messageContainer}>
                                        <Text style={styles.messageText}>{selectedTeacherRequest.expertise}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Experience Section */}
                            {selectedTeacherRequest.experience && (
                                <View style={styles.infoSection}>
                                    <Text style={styles.sectionTitle}>Experience</Text>
                                    <View style={styles.messageContainer}>
                                        <Text style={styles.messageText}>{selectedTeacherRequest.experience}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Additional Message Section */}
                            {selectedTeacherRequest.add_message && (
                                <View style={styles.infoSection}>
                                    <Text style={styles.sectionTitle}>Additional Message</Text>
                                    <View style={styles.messageContainer}>
                                        <Text style={styles.messageText}>{selectedTeacherRequest.add_message}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Action Buttons */}
                            <View style={styles.modalActionButtons}>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.approveModalButton]}
                                    onPress={() => {
                                        appointTeacher(selectedTeacherRequest.id);
                                        setRequestModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.modalButtonText}>Approve Teacher</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.rejectModalButton]}
                                    onPress={() => {
                                        rejectTeacherRequest(selectedTeacherRequest.id);
                                        setRequestModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.modalButtonText}>Reject Request</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF5734" />
                <Text style={styles.loadingText}>Loading Teachers...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Page Header */}
            <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>Teacher Management</Text>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'teachers' && styles.activeTab]}
                    onPress={() => setActiveTab('teachers')}
                >
                    <Text style={[styles.tabText, activeTab === 'teachers' && styles.activeTabText]}>
                        Teachers ({teachers.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'appoint' && styles.activeTab]}
                    onPress={() => setActiveTab('appoint')}
                >
                    <Text style={[styles.tabText, activeTab === 'appoint' && styles.activeTabText]}>
                        Appoint Teacher ({teacherRequests.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {activeTab === 'teachers' ? (
                    <FlatList
                        data={teachers}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTeacherCard}
                        refreshControl={
                            <RefreshControl 
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#FF5734']}
                                tintColor="#FF5734"
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No teachers found</Text>
                                <Text style={styles.emptyStateSubtext}>
                                    Teachers will appear here once appointed
                                </Text>
                            </View>
                        }
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <FlatList
                        data={teacherRequests}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTeacherRequestCard}
                        refreshControl={
                            <RefreshControl 
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#FF5734']}
                                tintColor="#FF5734"
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No teacher requests</Text>
                                <Text style={styles.emptyStateSubtext}>
                                    Teacher appointment requests will appear here
                                </Text>
                            </View>
                        }
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* Teacher Detail Modal */}
            {renderTeacherDetailModal()}

            {/* Requested Teacher Detail Modal */}
            {renderRequestedTeacherDetailModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#111827' 
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
        color: '#e5e7eb',
    },
    pageHeader: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        paddingTop: 60, // Add top padding for status bar
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
    teacherCard: {
        flexDirection: 'row',
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
    requestCard: {
        flexDirection: 'row',
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
    teacherImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#374151',
        borderWidth: 2,
        borderColor: '#6b7280',
    },
    teacherInfo: {
        flex: 1,
        marginLeft: 16,
        marginRight: 8,
    },
    teacherName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f9fafb',
        marginBottom: 4,
    },
    teacherEmail: {
        fontSize: 14,
        color: '#d1d5db',
        marginBottom: 2,
    },
    teacherRole: {
        fontSize: 12,
        color: '#c7d2fe',
        marginBottom: 2,
        textTransform: 'capitalize',
    },
    teacherExpertise: {
        fontSize: 12,
        color: '#a3a3a3',
        marginBottom: 2,
    },
    teacherPhone: {
        fontSize: 12,
        color: '#a3a3a3',
        marginBottom: 2,
    },
    teacherHireDate: {
        fontSize: 11,
        color: '#10b981',
        fontWeight: '500',
    },
    requestDate: {
        fontSize: 11,
        color: '#fbbf24',
        fontWeight: '500',
    },
    statusBadge: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    actionButtons: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 8,
    },
    viewDetailsButton: {
        backgroundColor: '#FF5734',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        marginBottom: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    viewDetailsButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    approveButton: {
        backgroundColor: '#10b981',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        marginBottom: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    rejectButton: {
        backgroundColor: '#ef4444',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        minWidth: 80,
        alignItems: 'center',
    },
    approveButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    rejectButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
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
    // Legacy styles (keeping for compatibility)
    header: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        marginBottom: 20,
        color: '#f9fafb',
    },
    inputContainer: { 
        marginBottom: 20 
    },
    input: { 
        borderWidth: 1, 
        borderColor: '#374151', 
        padding: 10, 
        marginBottom: 10, 
        borderRadius: 5,
        backgroundColor: '#1f2937',
        color: '#f9fafb',
    },
    teacherItem: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 10, 
        borderBottomWidth: 1, 
        borderColor: '#374151',
        backgroundColor: '#1f2937',
    },
    removeText: { 
        color: '#ef4444' 
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
        padding: 4,
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
    modalTeacherImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#374151',
        borderWidth: 3,
        borderColor: '#6b7280',
    },
    profileInfo: {
        flex: 1,
        marginLeft: 16,
    },
    modalTeacherName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#f9fafb',
        marginBottom: 4,
    },
    roleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalTeacherRole: {
        fontSize: 16,
        color: '#c7d2fe',
        textTransform: 'capitalize',
        marginRight: 8,
    },
    roleIcon: {
        marginLeft: 4,
    },
    modalStatusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 8,
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
        marginBottom: 16,
        paddingVertical: 4,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    infoLabel: {
        fontSize: 14,
        color: '#d1d5db',
        marginLeft: 8,
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 14,
        color: '#f9fafb',
        marginLeft: 24,
        lineHeight: 20,
    },
    coursesSection: {
        padding: 20,
    },
    coursesLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    courseCard: {
        flexDirection: 'row',
        marginBottom: 12,
        borderRadius: 25,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    courseCodeSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        minWidth: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    courseCode: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
    },
    courseNameSection: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        justifyContent: 'center',
    },
    courseName: {
        fontSize: 14,
        color: '#000000',
        fontWeight: '500',
    },
    noCoursesContainer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    noCoursesText: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
        fontStyle: 'italic',
    },
    messageContainer: {
        backgroundColor: '#1f2937',
        padding: 16,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#FF5734',
    },
    messageText: {
        fontSize: 14,
        color: '#f9fafb',
        lineHeight: 20,
    },
    modalActionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 20,
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    approveModalButton: {
        backgroundColor: '#10b981',
    },
    rejectModalButton: {
        backgroundColor: '#ef4444',
    },
    modalButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default TeacherManagement;