import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
}

const MyBatchesScreen = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [screenData, setScreenData] = useState(Dimensions.get('window'));

    useEffect(() => {
        fetchEnrolledCourses();
    }, []);

    useEffect(() => {
        const onChange = (result: { window: any }) => {
            setScreenData(result.window);
        };

        const subscription = Dimensions.addEventListener('change', onChange);
        return () => subscription?.remove();
    }, []);

    const fetchEnrolledCourses = async () => {
        try {
            setLoading(true);
            
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

            // Fetch course details for enrolled courses
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select('*')
                .in('id', userData.enrolled_courses);

            if (coursesError) {
                console.error('Courses fetch error:', coursesError);
                Alert.alert('Error', 'Failed to fetch courses data');
                return;
            }

            setCourses(coursesData || []);
        } catch (error) {
            console.error('Error fetching enrolled courses:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const parseSchedule = (scheduleString: string) => {
        try {
            // Remove brackets and parse the schedule
            const cleanSchedule = scheduleString.replace(/[\[\]]/g, '').trim();
            return cleanSchedule;
        } catch (error) {
            return 'Schedule not available';
        }
    };

    const renderCourseItem = ({ item }: { item: Course }) => {
        const isSmallScreen = screenData.width < 600;
        
        return (
            <View style={[
                styles.courseCard, 
                { 
                    backgroundColor: item.full_name_color,
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
                        fontSize: isSmallScreen ? 18 : 20,
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
                            Course Fees: ₹{item.fees_monthly}/month
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
                    
                    <TouchableOpacity style={styles.viewButton}>
                        <Text style={[
                            styles.viewButtonText,
                            { fontSize: isSmallScreen ? 14 : 16 }
                        ]}>
                            View
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
            <Text style={[styles.title, { fontSize: screenData.width < 600 ? 20 : 24 }]}>My Batches</Text>
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
                </View>
            ) : (
                <FlatList
                    data={courses}
                    keyExtractor={item => item.id}
                    renderItem={renderCourseItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
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
        alignSelf: 'center',
        color: '#fff',
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
});

export default MyBatchesScreen;