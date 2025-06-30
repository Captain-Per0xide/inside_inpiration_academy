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

// Define consistent column width
const COLUMN_WIDTH = 200; // Fixed width for better consistency
const INSTRUCTOR_WIDTH = 200; // Same width as week selector for alignment

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
    const [selectedWeek, setSelectedWeek] = useState('Week 1');
    const [weekNumber, setWeekNumber] = useState(1);
    const [weekDateRange, setWeekDateRange] = useState('');
    const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());

    // Toggle expansion for a specific day column
    const toggleExpansion = (instructorName: string, day: string) => {
        const slotKey = `${instructorName}-${day}`;
        setExpandedSlots(prev => {
            const newSet = new Set(prev);
            if (newSet.has(slotKey)) {
                newSet.delete(slotKey);
            } else {
                newSet.add(slotKey);
            }
            return newSet;
        });
    };

    // Check if a slot is expanded
    const isSlotExpanded = (instructorName: string, day: string) => {
        return expandedSlots.has(`${instructorName}-${day}`);
    };

    // Convert 24-hour format to 12-hour format
    const formatTimeTo12Hour = (time24: string) => {
        if (!time24) return time24;
        
        const [hours, minutes] = time24.split(':');
        const hour24 = parseInt(hours, 10);
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        
        return `${hour12}:${minutes} ${ampm}`;
    };

    // Generate current week dates and calculate week number
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
        
        // Calculate week number (ISO week)
        const getWeekNumber = (date: Date) => {
            const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
            const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
            return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        };

        const currentWeekNum = getWeekNumber(today);
        setWeekNumber(currentWeekNum);
        setSelectedWeek(`Week ${currentWeekNum}`);

        // Format date range for the week
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const formatDate = (date: Date) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]} ${date.getDate().toString().padStart(2, '0')}`;
        };

        const dateRange = `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
        setWeekDateRange(dateRange);
        
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

    // Render course slot with stacking and expansion
    const renderDayColumn = (instructor: Instructor, weekDay: WeekDay) => {
        const daySchedule = getCoursesForDay(instructor, weekDay.day);
        const isExpanded = isSlotExpanded(instructor.name, weekDay.day);
        const hasMultipleCourses = daySchedule.length > 1;

        if (daySchedule.length === 0) {
            return (
                <View key={weekDay.day} style={styles.dayColumn}>
                    <View style={styles.emptySlot}>
                        <View style={styles.patternBackground}>
                            <View style={styles.diagonalPattern} />
                            <Text style={styles.emptySlotText}>No Class</Text>
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <TouchableOpacity 
                key={weekDay.day} 
                style={styles.dayColumn}
                onPress={() => hasMultipleCourses && toggleExpansion(instructor.name, weekDay.day)}
                disabled={!hasMultipleCourses}
            >
                <View style={[
                    styles.coursesContainer,
                    hasMultipleCourses && !isExpanded && styles.stackedContainer
                ]}>
                    {daySchedule.map((course, index) => {
                        const schedule = getScheduleForCourseAndDay(course, weekDay.day);
                        if (!schedule) return null;

                        const shouldStack = hasMultipleCourses && !isExpanded;
                        const stackOffset = shouldStack ? index * 4 : 0;
                        const zIndex = shouldStack ? daySchedule.length - index : 1;

                        return (
                            <View 
                                key={`${course.id}-${weekDay.day}`}
                                style={[
                                    styles.courseSlot,
                                    { 
                                        backgroundColor: course.fullname_color,
                                        transform: [{ translateY: stackOffset }],
                                        zIndex: zIndex,
                                        marginBottom: isExpanded ? 8 : (shouldStack ? -44 : 8)
                                    }
                                ]}
                            >
                                <View style={[styles.codenameContainer, { backgroundColor: course.codename_color }]}>
                                    <Text style={styles.courseCode}>{course.codename}</Text>
                                </View>
                                <Text style={styles.courseTime}>
                                    {formatTimeTo12Hour(schedule.startTime)} - {formatTimeTo12Hour(schedule.endTime)}
                                </Text>
                                {hasMultipleCourses && index === 0 && !isExpanded && (
                                    <View style={styles.stackIndicator}>
                                        <Text style={styles.stackCount}>
                                            +{daySchedule.length - 1}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text style={styles.loadingText}>Loading Schedule...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Page Header */}
            <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>Class Routine</Text>
            </View>
            
            {/* Main scrollable content */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mainScrollView}>
                <View style={styles.scheduleContainer}>
                    {/* Week Days Header */}
                    <View style={styles.daysHeaderRow}>
                        <View style={styles.instructorPlaceholder}>
                            <Text style={styles.weekText}>📅 {selectedWeek}</Text>
                            <Text style={styles.weekDates}>{weekDateRange}</Text>
                        </View>
                        {currentWeek.map((weekDay) => (
                            <View key={weekDay.day} style={styles.dayHeader}>
                                <Text style={styles.dayNumber}>{weekDay.date.toString().padStart(2, '0')}</Text>
                                <Text style={styles.dayName}>{weekDay.day}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Instructors and their schedules */}
                    <ScrollView showsVerticalScrollIndicator={false} style={styles.verticalScrollView}>
                        {instructors.map((instructor, index) => (
                            <View key={instructor.name + index} style={styles.instructorRow}>
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

                                {/* Schedule slots for each day */}
                                {currentWeek.map((weekDay) => {
                                    return renderDayColumn(instructor, weekDay);
                                })}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        color: '#e5e7eb',
    },
    header: {
        padding: 16,
        paddingTop: 60,
        backgroundColor: '#111827',
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f9fafb',
        textAlign: 'center',
    },
    weekSelector: {
        backgroundColor: '#e8e9ea',
        padding: 12,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    weekText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    weekDates: {
        fontSize: 14,
        color: '#c7d2fe',
        marginTop: 2,
    },
    daysHeader: {
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e1e5e9',
    },
    mainScrollView: {
        flex: 1,
    },
    scheduleContainer: {
        backgroundColor: '#111827',
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
    daysHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#1f2937',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    instructorPlaceholder: {
        width: INSTRUCTOR_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        marginRight: 4,
        backgroundColor: '#4f46e5',
        borderRadius: 8,
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    instructorHeaderText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#f9fafb',
    },
    verticalScrollView: {
        flex: 1,
    },
    instructorRow: {
        flexDirection: 'row',
        backgroundColor: '#111827',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
        alignItems: 'flex-start',
        minHeight: 120, // Fixed height for consistent rows
    },
    dayHeader: {
        width: COLUMN_WIDTH,
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        marginRight: 4,
        backgroundColor: '#1f2937',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#374151',
    },
    dayNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f9fafb',
    },
    dayName: {
        fontSize: 14,
        color: '#d1d5db',
        marginTop: 2,
    },
    instructorSection: {
        backgroundColor: '#111827',
        marginVertical: 4,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    instructorInfo: {
        width: INSTRUCTOR_WIDTH,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginRight: 4,
        backgroundColor: '#1f2937',
        borderRadius: 8,
        height: 120,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#374151',
    },
    instructorImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#374151',
        borderWidth: 2,
        borderColor: '#6b7280',
    },
    instructorDetails: {
        flex: 1,
        marginLeft: 8,
        marginRight: 8,
    },
    instructorName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f9fafb',
        marginBottom: 2,
        textAlign: 'left',
    },
    instructorAge: {
        fontSize: 12,
        color: '#d1d5db',
    },
    instructorCourses: {
        fontSize: 12,
        color: '#d1d5db',
    },
    statusIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10b981',
    },
    scheduleGrid: {
        flexDirection: 'row',
        paddingHorizontal: 16,
    },
    dayColumn: {
        width: COLUMN_WIDTH,
        marginRight: 4,
        minHeight: 100,
        justifyContent: 'flex-start',
    },
    coursesContainer: {
        flex: 1,
        position: 'relative',
    },
    stackedContainer: {
        height: 60, // Fixed height when stacked
        overflow: 'hidden',
    },
    courseSlot: {
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 8,
        minHeight: 50,
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
        position: 'relative',
        backgroundColor: '#fff',
    },
    codenameContainer: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        marginBottom: 4,
        alignSelf: 'center',
    },
    courseCode: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    courseTime: {
        fontSize: 12,
        color: '#000000',
        textAlign: 'center',
        marginTop: 2,
        fontWeight: '500',
    },
    stackIndicator: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderRadius: 8,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    stackCount: {
        fontSize: 10,
        color: '#ffffff',
        fontWeight: 'bold',
    },
    emptySlot: {
        flex: 1,
        minHeight: 100,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#1f2937',
        borderWidth: 2,
        borderColor: '#4b5563',
        borderStyle: 'dashed',
    },
    patternBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: 'rgba(31, 41, 55, 0.5)',
    },
    diagonalPattern: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        opacity: 0.1,
        transform: [{ rotate: '45deg' }],
        borderWidth: 1,
        borderColor: '#6b7280',
        borderStyle: 'solid',
    },
    emptySlotText: {
        fontSize: 12,
        color: '#9ca3af',
        fontStyle: 'italic',
        zIndex: 1,
        fontWeight: '500',
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