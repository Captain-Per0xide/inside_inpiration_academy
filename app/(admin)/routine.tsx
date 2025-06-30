import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

// Get screen dimensions
const { width: screenWidth } = Dimensions.get('window');

// Types and interfaces
interface ClassSchedule {
    day: string;
    startTime: string;
    endTime: string;
}

interface Course {
    id: string;
    codename: string;
    fullName: string;
    instructor: string;
    codename_color: string;
    fullname_color: string;
    classSchedules: ClassSchedule[];
}

interface Instructor {
    name: string;
    instructor_image: string;
    courses: Course[];
}

interface WeekDay {
    date: number;
    day: string;
    fullDate: string;
}

const Routine: React.FC = () => {
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentWeek, setCurrentWeek] = useState<WeekDay[]>([]);
    const [selectedWeek, setSelectedWeek] = useState('Week 19');

    // Generate current week dates
    const generateWeekDates = useCallback(() => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - currentDay);

        const week: WeekDay[] = [];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            
            week.push({
                date: date.getDate(),
                day: dayNames[i],
                fullDate: date.toISOString().split('T')[0]
            });
        }
        
        setCurrentWeek(week);
    }, []);

    // Fetch instructors and their courses from Supabase
    const fetchInstructorsAndCourses = useCallback(async () => {
        try {
            setLoading(true);

            // Get all courses with their schedules and instructor information
            const { data: courses, error: coursesError } = await supabase
                .from('courses')
                .select('id, codename, full_name, instructor, instructor_image, codename_color, full_name_color, class_schedule');

            if (coursesError) {
                console.error('Error fetching courses:', coursesError);
                Alert.alert('Error', 'Failed to fetch courses');
                return;
            }

            if (!courses) {
                setInstructors([]);
                return;
            }

            // Group courses by instructor to avoid duplicates
            const instructorMap = new Map<string, Instructor>();

            courses.forEach(course => {
                if (!course.instructor) return;

                // Parse class_schedule JSON
                let classSchedules: ClassSchedule[] = [];
                try {
                    if (course.class_schedule) {
                        classSchedules = JSON.parse(course.class_schedule);
                    }
                } catch (error) {
                    console.error('Error parsing class_schedule for course:', course.id, error);
                    classSchedules = [];
                }

                const courseData: Course = {
                    id: course.id,
                    codename: course.codename,
                    fullName: course.full_name,
                    instructor: course.instructor,
                    codename_color: course.codename_color || '#007AFF',
                    fullname_color: course.full_name_color || '#007AFF',
                    classSchedules: classSchedules
                };

                if (instructorMap.has(course.instructor)) {
                    // Add course to existing instructor
                    instructorMap.get(course.instructor)!.courses.push(courseData);
                } else {
                    // Create new instructor entry
                    instructorMap.set(course.instructor, {
                        name: course.instructor,
                        instructor_image: course.instructor_image || 'https://via.placeholder.com/60',
                        courses: [courseData]
                    });
                }
            });

            // Convert map to array
            const instructorsArray = Array.from(instructorMap.values());
            setInstructors(instructorsArray);
        } catch (error) {
            console.error('Error in fetchInstructorsAndCourses:', error);
            Alert.alert('Error', 'Failed to load routine data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        generateWeekDates();
        fetchInstructorsAndCourses();
    }, [generateWeekDates, fetchInstructorsAndCourses]);

    // Get courses for a specific day and instructor
    const getCoursesForDay = (instructor: Instructor, day: string) => {
        return instructor.courses.filter(course => 
            course.classSchedules.some(schedule => 
                schedule.day.toLowerCase() === day.toLowerCase()
            )
        );
    };

    // Get schedule for a specific course and day
    const getScheduleForCourseAndDay = (course: Course, day: string) => {
        return course.classSchedules.find(schedule => 
            schedule.day.toLowerCase() === day.toLowerCase()
        );
    };

    // Render course slot
    const renderCourseSlot = (course: Course, day: string) => {
        const schedule = getScheduleForCourseAndDay(course, day);
        if (!schedule) return null;

        return (
            <View 
                key={`${course.id}-${day}`}
                style={[
                    styles.courseSlot,
                    { backgroundColor: course.codename_color }
                ]}
            >
                <Text style={styles.courseCode}>{course.codename}</Text>
                <Text style={styles.courseTime}>
                    {schedule.startTime} - {schedule.endTime}
                </Text>
                {course.codename !== course.fullName && (
                    <Text style={styles.courseFullName}>{course.fullName}</Text>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading Schedule...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.weekSelector}>
                    <Text style={styles.weekText}>📅 {selectedWeek}</Text>
                    <Text style={styles.weekDates}>May 04 - May 10</Text>
                </TouchableOpacity>
            </View>

            {/* Week Days Header */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysHeader}>
                {currentWeek.map((weekDay) => (
                    <View key={weekDay.day} style={styles.dayHeader}>
                        <Text style={styles.dayNumber}>{weekDay.date.toString().padStart(2, '0')}</Text>
                        <Text style={styles.dayName}>{weekDay.day}</Text>
                    </View>
                ))}
            </ScrollView>

            {/* Instructors and their schedules */}
            {instructors.map((instructor, index) => (
                <View key={instructor.name + index} style={styles.instructorSection}>
                    {/* Instructor Info */}
                    <View style={styles.instructorInfo}>
                        <Image 
                            source={{ uri: instructor.instructor_image || 'https://via.placeholder.com/60' }}
                            style={styles.instructorImage}
                        />
                        <View style={styles.instructorDetails}>
                            <Text style={styles.instructorName}>{instructor.name}</Text>
                            <Text style={styles.instructorCourses}>{instructor.courses.length} course(s)</Text>
                        </View>
                        <View style={styles.statusIndicator} />
                    </View>

                    {/* Schedule Grid */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.scheduleGrid}>
                            {currentWeek.map((weekDay) => {
                                const daySchedule = getCoursesForDay(instructor, weekDay.day);
                                
                                return (
                                    <View key={weekDay.day} style={styles.dayColumn}>
                                        {daySchedule.length > 0 ? (
                                            daySchedule.map(course => 
                                                renderCourseSlot(course, weekDay.day)
                                            )
                                        ) : (
                                            <View style={styles.emptySlot}>
                                                <View style={styles.patternBackground} />
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            ))}

            {/* Add button at bottom */}
            <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Add Schedule</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    header: {
        padding: 16,
        paddingTop: 60,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e1e5e9',
    },
    weekSelector: {
        backgroundColor: '#e8e9ea',
        padding: 12,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    weekText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    weekDates: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    daysHeader: {
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e1e5e9',
    },
    dayHeader: {
        minWidth: (screenWidth - 120) / 7,
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        marginRight: 4,
        backgroundColor: '#e8e9ea',
        borderRadius: 8,
    },
    dayNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    dayName: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    instructorSection: {
        backgroundColor: '#fff',
        marginVertical: 4,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e1e5e9',
    },
    instructorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    instructorImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#e1e5e9',
    },
    instructorDetails: {
        flex: 1,
        marginLeft: 12,
    },
    instructorName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    instructorAge: {
        fontSize: 12,
        color: '#666',
    },
    instructorCourses: {
        fontSize: 12,
        color: '#666',
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff4444',
    },
    scheduleGrid: {
        flexDirection: 'row',
        paddingHorizontal: 16,
    },
    dayColumn: {
        minWidth: (screenWidth - 120) / 7,
        marginRight: 4,
        minHeight: 100,
    },
    courseSlot: {
        marginBottom: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        minHeight: 45,
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    courseCode: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    courseTime: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginTop: 2,
    },
    courseFullName: {
        fontSize: 8,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 1,
    },
    emptySlot: {
        flex: 1,
        minHeight: 100,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
    },
    patternBackground: {
        flex: 1,
        opacity: 0.3,
        backgroundColor: 'transparent',
        // Add diagonal pattern effect
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    addButton: {
        margin: 16,
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 32,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default Routine;