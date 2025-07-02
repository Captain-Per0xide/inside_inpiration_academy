import PDFViewer from '@/components/PDFViewer';
import VideoPlayer from '@/components/VideoPlayer';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Dimensions,
    FlatList,
    Linking,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeOutUp,
    SlideInRight
} from 'react-native-reanimated';

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
    eBooks?: any;
    notes?: any;
    sample_questions?: any;
    previous_year_questions?: any;
    scheduled_classes?: any;
}

interface ScheduledClass {
    id: string;
    topic: string;
    status: 'scheduled' | 'live' | 'completed' | 'cancelled';
    createdAt: string;
    createdBy: string;
    meetingLink: string;
    scheduledDateTime: string;
}

interface LiveClass {
    id: string;
    title: string;
    description?: string;
    scheduled_date: string;
    scheduled_time: string;
    duration?: number;
    meet_link?: string;
    status: 'scheduled' | 'live' | 'ongoing' | 'completed' | 'cancelled';
}

interface StudyMaterial {
    id: string;
    title: string;
    type: 'ebook' | 'note' | 'sample_question' | 'previous_year_question';
    file_url?: string;
    description?: string;
    category?: string;
    subject?: string;
    year?: string;
    exam_type?: string;
    author?: string;
    file_size?: string;
    upload_date?: string;
}

interface RecordedVideo {
    video_id: string;
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url?: string;
    class_notes_url?: string;
    assignment_url?: string;
    created_at: string;
    uploaded_at: string;
    scheduled_class_id?: string;
    is_from_scheduled_class: boolean;
}

const BatchDetailsScreen = () => {
    const { courseId } = useLocalSearchParams<{
        courseId: string;
    }>();

    const [course, setCourse] = useState<Course | null>(null);
    const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
    const [recordedClasses, setRecordedClasses] = useState<LiveClass[]>([]);
    const [recordedVideos, setRecordedVideos] = useState<RecordedVideo[]>([]);
    const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [screenData, setScreenData] = useState(Dimensions.get('window'));
    const [activeTab, setActiveTab] = useState<'classes' | 'recorded' | 'materials'>('classes');
    const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest');
    const [selectedPDF, setSelectedPDF] = useState<{ url: string; title: string; type: 'notes' | 'assignment' } | null>(null);
    const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set());

    useEffect(() => {
        const onChange = (result: { window: any }) => {
            setScreenData(result.window);
            // Log orientation changes for debugging
            const isLandscape = result.window.width > result.window.height;
            console.log('Orientation changed:', isLandscape ? 'Landscape' : 'Portrait', 
                       `${result.window.width}x${result.window.height}`);
        };

        const subscription = Dimensions.addEventListener('change', onChange);
        return () => subscription?.remove();
    }, []);

    // Screen orientation effect for PDF viewing
    useEffect(() => {
        if (selectedPDF) {
            // Allow all orientations when viewing PDF, don't lock to landscape
            ScreenOrientation.unlockAsync();
        } else {
            // Allow all orientations when not viewing PDF
            ScreenOrientation.unlockAsync();
        }

        return () => {
            // Cleanup: unlock orientation when component unmounts
            ScreenOrientation.unlockAsync();
        };
    }, [selectedPDF]);

    // Additional orientation listener specifically for PDF viewer
    useEffect(() => {
        if (!selectedPDF) return;

        const handleOrientationChange = (result: { window: any }) => {
            const isLandscape = result.window.width > result.window.height;
            console.log('PDF viewer orientation change:', isLandscape ? 'Landscape' : 'Portrait');
            // Force a small delay to ensure proper re-render
            setTimeout(() => {
                setScreenData(result.window);
            }, 100);
        };

        const subscription = Dimensions.addEventListener('change', handleOrientationChange);
        return () => subscription?.remove();
    }, [selectedPDF]);

    // Handle Android back button
    useEffect(() => {
        const backAction = () => {
            if (selectedPDF) {
                setSelectedPDF(null);
                return true; // Prevent default behavior
            }
            return false; // Allow default behavior
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction,
        );

        return () => backHandler.remove();
    }, [selectedPDF]);

    const handleBack = () => {
        console.log('handleBack called, selectedPDF:', selectedPDF ? 'exists' : 'null');
        if (selectedPDF) {
            setSelectedPDF(null);
        } else {
            router.back();
        }
    };

    const handlePDFBack = () => {
        console.log('PDF back button pressed');
        setSelectedPDF(null);
    };

    const handleViewPDF = (url: string, title: string, type: 'notes' | 'assignment') => {
        if (!url) {
            Alert.alert('Error', 'PDF file not available');
            return;
        }
        setSelectedPDF({ url, title, type });
    };

    const toggleVideoExpansion = (videoId: string) => {
        const newExpandedVideos = new Set(expandedVideos);
        if (newExpandedVideos.has(videoId)) {
            newExpandedVideos.delete(videoId);
        } else {
            newExpandedVideos.add(videoId);
        }
        setExpandedVideos(newExpandedVideos);
    };

    const fetchBatchDetails = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            // Fetch course details
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('*, recorded_classes')
                .eq('id', courseId)
                .single();

            if (courseError) {
                console.error('Course fetch error:', courseError);
                Alert.alert('Error', 'Failed to fetch course details');
                return;
            }

            setCourse(courseData);

            // Parse scheduled classes from course data
            const scheduledClasses: LiveClass[] = [];
            
            if (courseData.scheduled_classes) {
                const classes = Array.isArray(courseData.scheduled_classes) ? courseData.scheduled_classes : [];
                classes.forEach((scheduledClass: any) => {
                    // Only include classes that should be visible in Live Classes tab
                    if (isClassVisibleInLiveTab(scheduledClass.scheduledDateTime)) {
                        const scheduledDateTime = new Date(scheduledClass.scheduledDateTime);
                        const scheduledDate = scheduledDateTime.toISOString().split('T')[0];
                        const scheduledTime = scheduledDateTime.toTimeString().split(' ')[0].substring(0, 5);
                        
                        scheduledClasses.push({
                            id: scheduledClass.id,
                            title: scheduledClass.topic,
                            description: `Scheduled class on ${scheduledClass.topic}`,
                            scheduled_date: scheduledDate,
                            scheduled_time: scheduledTime,
                            duration: 90, // Default duration, you can add this to the database schema if needed
                            meet_link: scheduledClass.meetingLink,
                            status: scheduledClass.status
                        });
                    }
                });
            }

            setLiveClasses(scheduledClasses);

            // Filter completed classes as recorded classes (no time limit for recorded classes)
            const allCompletedClasses: LiveClass[] = [];
            if (courseData.scheduled_classes) {
                const classes = Array.isArray(courseData.scheduled_classes) ? courseData.scheduled_classes : [];
                classes.forEach((scheduledClass: any) => {
                    if (scheduledClass.status === 'completed') {
                        const scheduledDateTime = new Date(scheduledClass.scheduledDateTime);
                        const scheduledDate = scheduledDateTime.toISOString().split('T')[0];
                        const scheduledTime = scheduledDateTime.toTimeString().split(' ')[0].substring(0, 5);
                        
                        allCompletedClasses.push({
                            id: scheduledClass.id,
                            title: scheduledClass.topic,
                            description: `Recorded class on ${scheduledClass.topic}`,
                            scheduled_date: scheduledDate,
                            scheduled_time: scheduledTime,
                            duration: 90,
                            meet_link: scheduledClass.meetingLink,
                            status: scheduledClass.status
                        });
                    }
                });
            }
            setRecordedClasses(allCompletedClasses);

            // Parse recorded videos from recorded_classes column
            const videos: RecordedVideo[] = [];
            if (courseData.recorded_classes) {
                const recordedClassesData = Array.isArray(courseData.recorded_classes) ? courseData.recorded_classes : [];
                recordedClassesData.forEach((video: any) => {
                    videos.push({
                        video_id: video.video_id,
                        title: video.title,
                        description: video.description,
                        video_url: video.video_url,
                        thumbnail_url: video.thumbnail_url,
                        class_notes_url: video.class_notes_url,
                        assignment_url: video.assignment_url,
                        created_at: video.created_at || video.uploaded_at,
                        uploaded_at: video.uploaded_at || video.created_at,
                        scheduled_class_id: video.scheduled_class_id,
                        is_from_scheduled_class: video.is_from_scheduled_class || false
                    });
                });
            }
            
            // Sort videos by oldest first (default)
            const sortedVideos = videos.sort((a, b) => {
                const dateA = new Date(a.uploaded_at || a.created_at).getTime();
                const dateB = new Date(b.uploaded_at || b.created_at).getTime();
                return dateA - dateB;
            });
            
            setRecordedVideos(sortedVideos);

            // Parse study materials from course JSONB data
            const materials: StudyMaterial[] = [];

            // Parse eBooks
            if (courseData.eBooks) {
                const ebooks = Array.isArray(courseData.eBooks) ? courseData.eBooks : [];
                ebooks.forEach((ebook: any) => {
                    materials.push({
                        id: ebook.id || Math.random().toString(),
                        title: ebook.title,
                        type: 'ebook',
                        file_url: ebook.file_url,
                        description: ebook.description,
                        subject: ebook.subject,
                        author: ebook.author,
                        file_size: ebook.file_size,
                        upload_date: ebook.upload_date
                    });
                });
            }

            // Parse Notes
            if (courseData.notes) {
                const notes = Array.isArray(courseData.notes) ? courseData.notes : [];
                notes.forEach((note: any) => {
                    materials.push({
                        id: note.id || Math.random().toString(),
                        title: note.title,
                        type: 'note',
                        file_url: note.file_url,
                        description: note.description,
                        subject: note.subject,
                        author: note.author,
                        file_size: note.file_size,
                        upload_date: note.upload_date
                    });
                });
            }

            // Parse Sample Questions
            if (courseData.sample_questions) {
                const sampleQuestions = Array.isArray(courseData.sample_questions) ? courseData.sample_questions : [];
                sampleQuestions.forEach((sq: any) => {
                    materials.push({
                        id: sq.id || Math.random().toString(),
                        title: sq.title,
                        type: 'sample_question',
                        file_url: sq.file_url,
                        description: sq.description,
                        category: sq.category,
                        subject: sq.subject,
                        author: sq.author,
                        file_size: sq.file_size,
                        upload_date: sq.upload_date
                    });
                });
            }

            // Parse Previous Year Questions
            if (courseData.previous_year_questions) {
                const pyqs = Array.isArray(courseData.previous_year_questions) ? courseData.previous_year_questions : [];
                pyqs.forEach((pyq: any) => {
                    materials.push({
                        id: pyq.id || Math.random().toString(),
                        title: pyq.title,
                        type: 'previous_year_question',
                        file_url: pyq.file_url,
                        description: pyq.description,
                        year: pyq.year,
                        exam_type: pyq.exam_type,
                        author: pyq.author,
                        file_size: pyq.file_size,
                        upload_date: pyq.upload_date
                    });
                });
            }

            setStudyMaterials(materials);

        } catch (error) {
            console.error('Error fetching batch details:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            if (isRefresh) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    }, [courseId]);

    useEffect(() => {
        fetchBatchDetails();
    }, [fetchBatchDetails]);

    const onRefresh = () => {
        fetchBatchDetails(true);
    };

    // Helper function to check if a class should be shown in Live Classes tab
    const isClassVisibleInLiveTab = (scheduledDateTime: string): boolean => {
        const currentTime = new Date();
        const classTime = new Date(scheduledDateTime);
        const oneDayInMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const timeDifference = currentTime.getTime() - classTime.getTime();
        
        // Show classes that are:
        // - Upcoming (negative timeDifference)
        // - Currently happening
        // - Completed within the last 24 hours (positive timeDifference <= oneDayInMs)
        return timeDifference <= oneDayInMs;
    };

    const openMeetLink = (meetLink: string) => {
        Linking.openURL(meetLink).catch(err => {
            console.error('Failed to open meet link:', err);
            Alert.alert('Error', 'Failed to open meeting link');
        });
    };

    const openStudyMaterial = (material: StudyMaterial) => {
        let pathname: string = '';

        switch (material.type) {
            case 'ebook':
                pathname = '/materials/ebooks';
                break;
            case 'note':
                pathname = '/materials/notes';
                break;
            case 'sample_question':
                pathname = '/materials/sample-questions';
                break;
            case 'previous_year_question':
                pathname = '/materials/previous-year-questions';
                break;
            default:
                Alert.alert('Info', 'This material type is not supported yet');
                return;
        }

        router.push({
            pathname: pathname as any,
            params: { courseId, courseName: course?.full_name || '' }
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return '#3B82F6';
            case 'live': return '#10B981';
            case 'ongoing': return '#10B981';
            case 'completed': return '#6B7280';
            case 'cancelled': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'scheduled': return 'calendar-outline';
            case 'live': return 'radio-outline';
            case 'ongoing': return 'radio-outline';
            case 'completed': return 'checkmark-circle-outline';
            case 'cancelled': return 'close-circle-outline';
            default: return 'help-circle-outline';
        }
    };

    const getMaterialIcon = (type: string) => {
        switch (type) {
            case 'ebook': return 'book-outline';
            case 'note': return 'document-text-outline';
            case 'sample_question': return 'help-outline';
            case 'previous_year_question': return 'time-outline';
            default: return 'document-outline';
        }
    };

    const getMaterialTypeLabel = (type: string) => {
        switch (type) {
            case 'ebook': return 'eBook';
            case 'note': return 'Note';
            case 'sample_question': return 'Sample Question';
            case 'previous_year_question': return 'Previous Year Question';
            default: return 'Material';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (timeString: string) => {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getSortedVideos = () => {
        const sorted = [...recordedVideos].sort((a, b) => {
            const dateA = new Date(a.uploaded_at || a.created_at).getTime();
            const dateB = new Date(b.uploaded_at || b.created_at).getTime();
            
            return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
        });
        return sorted;
    };

    const renderLiveClassItem = ({ item }: { item: LiveClass }) => {
        const isSmallScreen = screenData.width < 600;

        return (
            <View style={styles.classCard}>
                <View style={styles.classHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Ionicons
                            name={getStatusIcon(item.status) as any}
                            size={12}
                            color="white"
                        />
                        <Text style={styles.statusText}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.classTitle, { fontSize: isSmallScreen ? 16 : 18 }]}>
                    {item.title}
                </Text>

                <Text style={[styles.classDescription, { fontSize: isSmallScreen ? 14 : 16 }]}>
                    {item.description}
                </Text>

                <View style={styles.classInfo}>
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                        <Text style={styles.infoText}>
                            {formatDate(item.scheduled_date)}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color="#6B7280" />
                        <Text style={styles.infoText}>
                            {formatTime(item.scheduled_time)} {item.duration && `(${item.duration} min)`}
                        </Text>
                    </View>
                </View>

                {/* Render different buttons based on class status */}
                {item.status === 'live' && item.meet_link && (
                    <TouchableOpacity
                        style={[styles.joinButton, { backgroundColor: '#10B981' }]}
                        onPress={() => openMeetLink(item.meet_link!)}
                    >
                        <Ionicons name="videocam-outline" size={16} color="white" />
                        <Text style={styles.joinButtonText}>Join Class</Text>
                    </TouchableOpacity>
                )}
                
                {item.status === 'scheduled' && (
                    <TouchableOpacity
                        style={[styles.joinButton, { backgroundColor: '#6B7280' }]}
                        disabled={true}
                    >
                        <Ionicons name="calendar-outline" size={16} color="white" />
                        <Text style={styles.joinButtonText}>Scheduled</Text>
                    </TouchableOpacity>
                )}

                {item.status === 'completed' && item.meet_link && (
                    <TouchableOpacity
                        style={[styles.joinButton, { backgroundColor: '#8B5CF6' }]}
                        onPress={() => openMeetLink(item.meet_link!)}
                    >
                        <Ionicons name="play-circle-outline" size={16} color="white" />
                        <Text style={styles.joinButtonText}>Watch Recording</Text>
                    </TouchableOpacity>
                )}

                {item.status === 'cancelled' && (
                    <TouchableOpacity
                        style={[styles.joinButton, { backgroundColor: '#EF4444' }]}
                        disabled={true}
                    >
                        <Ionicons name="close-circle-outline" size={16} color="white" />
                        <Text style={styles.joinButtonText}>Cancelled</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderStudyMaterialItem = ({ item }: { item: StudyMaterial }) => {
        const isSmallScreen = screenData.width < 600;

        return (
            <TouchableOpacity
                style={styles.materialCard}
                onPress={() => openStudyMaterial(item)}
            >
                <View style={styles.materialHeader}>
                    <View style={styles.materialIconContainer}>
                        <Ionicons
                            name={getMaterialIcon(item.type) as any}
                            size={24}
                            color="#F8FAFC"
                        />
                    </View>
                    <View style={styles.materialTypeContainer}>
                        <Text style={styles.materialType}>
                            {getMaterialTypeLabel(item.type)}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.materialTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                    {item.title}
                </Text>

                {item.description && (
                    <Text style={[styles.materialDescription, { fontSize: isSmallScreen ? 12 : 14 }]}>
                        {item.description}
                    </Text>
                )}

                <View style={styles.materialInfo}>
                    {item.subject && (
                        <View style={styles.materialTag}>
                            <Text style={styles.materialTagText}>{item.subject}</Text>
                        </View>
                    )}
                    {item.category && (
                        <View style={styles.materialTag}>
                            <Text style={styles.materialTagText}>{item.category}</Text>
                        </View>
                    )}
                    {item.year && (
                        <View style={styles.materialTag}>
                            <Text style={styles.materialTagText}>{item.year}</Text>
                        </View>
                    )}
                    {item.exam_type && (
                        <View style={styles.materialTag}>
                            <Text style={styles.materialTagText}>{item.exam_type}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.materialViewButton}>
                    <Ionicons name="eye-outline" size={16} color="#60A5FA" />
                    <Text style={styles.viewText}>Tap to view</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderRecordedVideoItem = ({ item }: { item: RecordedVideo }) => {
        const isSmallScreen = screenData.width < 600;
        const isExpanded = expandedVideos.has(item.video_id);

        return (
            <View style={styles.videoCard}>
                {/* Video Header - Always Visible */}
                <TouchableOpacity 
                    style={styles.videoHeader}
                    onPress={() => toggleVideoExpansion(item.video_id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.videoHeaderContent}>
                        <View style={styles.videoHeaderLeft}>
                            <Text style={[styles.videoCardTitle, { fontSize: isSmallScreen ? 14 : 16 }]} numberOfLines={2}>
                                {item.title}
                            </Text>
                            {item.description && (
                                <Text style={[styles.videoCardDescription, { fontSize: isSmallScreen ? 12 : 14 }]} numberOfLines={1}>
                                    {item.description}
                                </Text>
                            )}
                        </View>
                        <View style={styles.videoHeaderRight}>
                            {item.is_from_scheduled_class && (
                                <View style={styles.scheduledVideoBadge}>
                                    <Ionicons name="calendar" size={10} color="#10B981" />
                                </View>
                            )}
                            <Ionicons 
                                name={isExpanded ? "chevron-up" : "chevron-down"} 
                                size={20} 
                                color="#94A3B8" 
                            />
                        </View>
                    </View>

                    {/* Date and Upload Info */}
                    <View style={styles.videoMetaInfo}>
                        <View style={styles.videoMetaItem}>
                            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                            <Text style={[styles.videoMetaText, { fontSize: isSmallScreen ? 12 : 13 }]}>
                                {new Date(item.uploaded_at || item.created_at).toLocaleDateString('en-GB')} at {new Date(item.uploaded_at || item.created_at).toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                        {item.is_from_scheduled_class && item.scheduled_class_id && (
                            <View style={styles.videoMetaItem}>
                                <Ionicons name="link-outline" size={14} color="#10B981" />
                                <Text style={[styles.videoMetaText, { fontSize: isSmallScreen ? 11 : 12 }]}>
                                    Linked to scheduled class
                                </Text>
                            </View>
                        )}
                        {(item.class_notes_url || item.assignment_url) && (
                            <View style={styles.videoResourceIndicators}>
                                {item.class_notes_url && (
                                    <Ionicons name="document-text" size={14} color="#10B981" />
                                )}
                                {item.assignment_url && (
                                    <Ionicons name="document" size={14} color="#F59E0B" />
                                )}
                                <Text style={[styles.resourceIndicatorText, { fontSize: isSmallScreen ? 11 : 12 }]}>
                                    Resources available
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>

                {/* Expanded Content - Video Player and Resources */}
                {isExpanded && (
                    <Animated.View 
                        entering={FadeInDown.duration(300).springify()}
                        exiting={FadeOutUp.duration(200)}
                        style={styles.videoExpandedContent}
                    >
                        {/* Video Player */}
                        <VideoPlayer
                            videoUrl={item.video_url}
                            thumbnailUrl={item.thumbnail_url}
                            title=""
                            style={styles.videoPlayerCard}
                        />

                        {/* Resources Section */}
                        {(item.class_notes_url || item.assignment_url) && (
                            <View style={styles.resourcesSection}>
                                <Text style={[styles.resourcesSectionTitle, { fontSize: isSmallScreen ? 14 : 15 }]}>
                                    Resources:
                                </Text>
                                <View style={styles.resourceButtonsContainer}>
                                    {item.class_notes_url && (
                                        <TouchableOpacity
                                            style={styles.resourceActionButton}
                                            onPress={() => handleViewPDF(item.class_notes_url!, 'Class Notes - ' + item.title, 'notes')}
                                        >
                                            <Ionicons name="document-text" size={18} color="#10B981" />
                                            <Text style={styles.resourceActionButtonText}>Class Notes</Text>
                                        </TouchableOpacity>
                                    )}
                                    {item.assignment_url && (
                                        <TouchableOpacity
                                            style={styles.resourceActionButton}
                                            onPress={() => handleViewPDF(item.assignment_url!, 'Assignment - ' + item.title, 'assignment')}
                                        >
                                            <Ionicons name="document" size={18} color="#F59E0B" />
                                            <Text style={styles.resourceActionButtonText}>Assignment</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}
                    </Animated.View>
                )}
            </View>
        );
    };

    const renderStudyMaterialsGrid = () => {
        const isSmallScreen = screenData.width < 600;
        const isCoreCurriculum = course?.course_type === 'Core Curriculum';

        const ebooks = studyMaterials.filter(item => item.type === 'ebook');
        const notes = studyMaterials.filter(item => item.type === 'note');
        const sampleQuestions = studyMaterials.filter(item => item.type === 'sample_question');
        const previousYearQuestions = studyMaterials.filter(item => item.type === 'previous_year_question');

        return (
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                <View style={styles.studyMaterialsGrid}>
                    {/* eBooks */}
                    <Animated.View entering={FadeInUp.delay(100).springify()}>
                        <TouchableOpacity
                            style={[
                                styles.materialCategoryCard,
                                ebooks.length === 0 && { opacity: 0.6, borderColor: '#64748B' }
                            ]}
                            onPress={() => {
                                if (ebooks.length > 0) {
                                    router.push({
                                        pathname: '/materials/ebooks',
                                        params: { courseId, courseName: course?.full_name || '' }
                                    });
                                }
                            }}
                            disabled={ebooks.length === 0}
                        >
                            <View style={[styles.materialIcon, { backgroundColor: "#1E40AF" }]}>
                                <Ionicons name="book-outline" size={36} color="#60A5FA" />
                            </View>
                            <Text style={[styles.materialCategoryTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                eBooks
                            </Text>
                            <Text style={[styles.materialCount, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                {ebooks.length > 0 ? `${ebooks.length} available` : 'No materials yet'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Notes */}
                    <Animated.View entering={FadeInUp.delay(200).springify()}>
                        <TouchableOpacity
                            style={[
                                styles.materialCategoryCard,
                                notes.length === 0 && { opacity: 0.6, borderColor: '#64748B' }
                            ]}
                            onPress={() => {
                                if (notes.length > 0) {
                                    router.push({
                                        pathname: '/materials/notes',
                                        params: { courseId, courseName: course?.full_name || '' }
                                    });
                                }
                            }}
                            disabled={notes.length === 0}
                        >
                            <View style={[styles.materialIcon, { backgroundColor: "#15803D" }]}>
                                <Ionicons name="document-text-outline" size={36} color="#4ADE80" />
                            </View>
                            <Text style={[styles.materialCategoryTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                Notes
                            </Text>
                            <Text style={[styles.materialCount, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                {notes.length > 0 ? `${notes.length} available` : 'No materials yet'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Sample Questions - Only for Core Curriculum */}
                    {isCoreCurriculum && (
                        <Animated.View entering={FadeInUp.delay(300).springify()}>
                            <TouchableOpacity
                                style={[
                                    styles.materialCategoryCard,
                                    sampleQuestions.length === 0 && { opacity: 0.6, borderColor: '#64748B' }
                                ]}
                                onPress={() => {
                                    if (sampleQuestions.length > 0) {
                                        router.push({
                                            pathname: '/materials/sample-questions',
                                            params: { courseId, courseName: course?.full_name || '' }
                                        });
                                    }
                                }}
                                disabled={sampleQuestions.length === 0}
                            >
                                <View style={[styles.materialIcon, { backgroundColor: "#C2410C" }]}>
                                    <Ionicons name="help-circle-outline" size={36} color="#FB923C" />
                                </View>
                                <Text style={[styles.materialCategoryTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                    Sample Questions
                                </Text>
                                <Text style={[styles.materialCount, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                    {sampleQuestions.length > 0 ? `${sampleQuestions.length} available` : 'No materials yet'}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* Previous Year Questions - Only for Core Curriculum */}
                    {isCoreCurriculum && (
                        <Animated.View entering={FadeInUp.delay(400).springify()}>
                            <TouchableOpacity
                                style={[
                                    styles.materialCategoryCard,
                                    previousYearQuestions.length === 0 && { opacity: 0.6, borderColor: '#64748B' }
                                ]}
                                onPress={() => {
                                    if (previousYearQuestions.length > 0) {
                                        router.push({
                                            pathname: '/materials/previous-year-questions',
                                            params: { courseId, courseName: course?.full_name || '' }
                                        });
                                    }
                                }}
                                disabled={previousYearQuestions.length === 0}
                            >
                                <View style={[styles.materialIcon, { backgroundColor: "#BE185D" }]}>
                                    <Ionicons name="archive-outline" size={36} color="#F472B6" />
                                </View>
                                <Text style={[styles.materialCategoryTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                    Previous Year Questions
                                </Text>
                                <Text style={[styles.materialCount, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                    {previousYearQuestions.length > 0 ? `${previousYearQuestions.length} available` : 'No materials yet'}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>

                {!isCoreCurriculum && (
                    <View style={styles.limitedMaterialsNote}>
                        <Ionicons name="information-circle-outline" size={24} color="#F59E0B" />
                        <Text style={[styles.noteText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                            Additional materials (Sample Questions & PYQs) are available only for Core Curriculum courses
                        </Text>
                    </View>
                )}

                {/* All Materials List */}
                {studyMaterials.length > 0 && (
                    <View style={styles.allMaterialsSection}>
                        <Text style={styles.sectionTitle}>All Study Materials</Text>
                        {studyMaterials.map((material) => (
                            <View key={material.id} style={{ marginBottom: 12 }}>
                                {renderStudyMaterialItem({ item: material })}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        );
    };

    const renderPDFViewer = () => {
        if (!selectedPDF) return null;

        // Determine orientation and adjust layout accordingly
        const isLandscape = screenData.width > screenData.height;
        const statusBarHeight = isLandscape ? 0 : 44; // iOS status bar height
        const headerPaddingTop = isLandscape ? 16 : statusBarHeight + 16;
        const headerHeight = isLandscape ? 70 : 90;

        return (
            <View style={styles.pdfContainer}>
                <View style={[
                    styles.pdfHeader, 
                    { 
                        paddingTop: headerPaddingTop,
                        minHeight: headerHeight,
                        paddingHorizontal: isLandscape ? 16 : 20,
                        paddingBottom: isLandscape ? 12 : 16
                    }
                ]}>
                    <TouchableOpacity 
                        onPress={handlePDFBack} 
                        style={[
                            styles.pdfBackButton,
                            { 
                                minWidth: isLandscape ? 40 : 48,
                                minHeight: isLandscape ? 40 : 48,
                                padding: isLandscape ? 8 : 12
                            }
                        ]}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="arrow-back" size={isLandscape ? 20 : 24} color="#F8FAFC" />
                    </TouchableOpacity>
                    <View style={styles.pdfTitleContainer}>
                        <Text style={[
                            styles.pdfTitle, 
                            { 
                                fontSize: isLandscape ? 14 : 16,
                            }
                        ]} numberOfLines={1} ellipsizeMode="tail">
                            {selectedPDF.title}
                        </Text>
                    </View>
                    <View style={{ width: isLandscape ? 40 : 48 }} />
                </View>

                <PDFViewer
                    url={selectedPDF.url}
                    onLoadComplete={(numberOfPages, filePath) => {
                        console.log(`PDF loaded. Pages: ${numberOfPages}, Orientation: ${isLandscape ? 'Landscape' : 'Portrait'}`);
                    }}
                    onError={(error) => {
                        console.log('PDF Error:', error);
                        Alert.alert('Error', 'Failed to load PDF');
                    }}
                />
            </View>
        );
    };

    // Show PDF viewer if PDF is selected
    if (selectedPDF) {
        return (
            <>
                <Stack.Screen
                    options={{
                        title: "PDF Viewer",
                        headerShown: false,
                        statusBarStyle: 'light',
                        statusBarBackgroundColor: '#1E293B'
                    }}
                />
                {renderPDFViewer()}
            </>
        );
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Batch Details",
                        headerShown: false,
                        statusBarStyle: 'light',
                        statusBarBackgroundColor: '#0F172A'
                    }}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#667EEA" />
                    <Text style={styles.loadingText}>Loading batch details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!course) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Batch Details",
                        headerShown: false,
                        statusBarStyle: 'light',
                        statusBarBackgroundColor: '#0F172A'
                    }}
                />
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#F87171" />
                    <Text style={styles.errorText}>Course not found</Text>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    } return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen
                options={{
                    title: "Batch Details",
                    headerShown: false,
                    statusBarStyle: 'light',
                    statusBarBackgroundColor: '#0F172A'
                }}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButtonHeader}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text
                    style={[
                        styles.headerTitle,
                        { fontSize: screenData.width < 600 ? 18 : 20 }
                    ]}
                    numberOfLines={1}
                >
                    {course.full_name}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Course Info Card */}
            <Animated.View
                entering={FadeInDown.delay(200).springify()}
                style={[styles.courseInfoCard, { backgroundColor: course.full_name_color }]}
            >
                <View style={styles.courseInfoHeader}>
                    <View style={[styles.codenameTag, { backgroundColor: course.codename_color }]}>
                        <Text style={styles.codenameText}>{course.codename}</Text>
                    </View>
                    <Ionicons
                        name={course.course_type === "Core Curriculum" ? "school-outline" : "briefcase-outline"}
                        size={24}
                        color="black"
                    />
                </View>
                <Text style={styles.courseInfoTitle}>{course.full_name}</Text>
                <Text style={styles.courseInfoInstructor}>Instructor: {course.instructor}</Text>
            </Animated.View>

            {/* Tab Navigation */}
            <Animated.View
                entering={SlideInRight.delay(400).springify()}
                style={styles.tabContainer}
            >
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'classes' && styles.activeTab]}
                    onPress={() => setActiveTab('classes')}
                >
                    <Ionicons
                        name="videocam-outline"
                        size={18}
                        color={activeTab === 'classes' ? '#F8FAFC' : '#94A3B8'}
                    />
                    <Text style={[styles.tabText, activeTab === 'classes' && styles.activeTabText]}>
                        Live Classes
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'recorded' && styles.activeTab]}
                    onPress={() => setActiveTab('recorded')}
                >
                    <Ionicons
                        name="play-circle-outline"
                        size={18}
                        color={activeTab === 'recorded' ? '#F8FAFC' : '#94A3B8'}
                    />
                    <Text style={[styles.tabText, activeTab === 'recorded' && styles.activeTabText]}>
                        Resources
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'materials' && styles.activeTab]}
                    onPress={() => setActiveTab('materials')}
                >
                    <Ionicons
                        name="library-outline"
                        size={18}
                        color={activeTab === 'materials' ? '#F8FAFC' : '#94A3B8'}
                    />
                    <Text style={[styles.tabText, activeTab === 'materials' && styles.activeTabText]}>
                        Materials
                    </Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Content */}
            {activeTab === 'classes' ? (
                <FlatList
                    data={liveClasses}
                    keyExtractor={item => item.id}
                    renderItem={renderLiveClassItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#667EEA']}
                            tintColor="#667EEA"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={64} color="#94A3B8" />
                            <Text style={styles.emptyText}>No upcoming classes scheduled</Text>
                        </View>
                    }
                />
            ) : activeTab === 'recorded' ? (
                <View style={styles.container}>
                    {/* Sort Header */}
                    <View style={styles.sortHeader}>
                        <View style={styles.sortTitleContainer}>
                            <Ionicons name="videocam" size={20} color="#F8FAFC" />
                            <Text style={styles.sortTitle}>Recorded Videos ({recordedVideos.length})</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.sortButton}
                            onPress={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}
                        >
                            <Ionicons
                                name={sortOrder === 'oldest' ? 'arrow-up' : 'arrow-down'}
                                size={16}
                                color="#60A5FA"
                            />
                            <Text style={styles.sortButtonText}>
                                {sortOrder === 'oldest' ? 'Oldest First' : 'Newest First'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={getSortedVideos()}
                        keyExtractor={item => item.video_id}
                        renderItem={renderRecordedVideoItem}
                        contentContainerStyle={[styles.list, { paddingTop: 16 }]}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#667EEA']}
                                tintColor="#667EEA"
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="videocam-outline" size={64} color="#94A3B8" />
                                <Text style={styles.emptyText}>No recorded videos available</Text>
                                <Text style={styles.emptySubText}>
                                    Recorded videos will appear here once they are uploaded
                                </Text>
                            </View>
                        }
                    />
                </View>
            ) : (
                renderStudyMaterialsGrid()
            )}
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
        marginTop: 16,
        fontSize: 16,
        color: '#64748B',
        fontWeight: '500',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#0F172A',
    },
    errorText: {
        fontSize: 18,
        color: '#F87171',
        marginTop: 16,
        marginBottom: 24,
        fontWeight: '600',
    },
    backButton: {
        backgroundColor: '#667EEA',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingTop: 50,
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    backButtonHeader: {
        padding: 10,
        borderRadius: 12,
        backgroundColor: '#334155',
        borderWidth: 1,
        borderColor: '#475569',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontWeight: '700',
        color: '#F1F5F9',
    },
    courseInfoCard: {
        margin: 16,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    courseInfoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    codenameTag: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    codenameText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'white',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    courseInfoTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: 'black',
        marginBottom: 8,
    },
    courseInfoInstructor: {
        fontSize: 15,
        color: 'black',
        opacity: 0.8,
        fontWeight: '600',
        fontStyle: 'italic',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#1E293B',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    activeTab: {
        backgroundColor: '#667EEA',
    },
    tabText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
    },
    activeTabText: {
        color: '#F8FAFC',
        fontWeight: '700',
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    classCard: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    classHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        marginLeft: 6,
        fontSize: 11,
        fontWeight: '700',
        color: 'white',
        letterSpacing: 0.5,
    },
    classTitle: {
        fontWeight: '800',
        color: '#F8FAFC',
        marginBottom: 12,
        lineHeight: 24,
    },
    classDescription: {
        color: '#CBD5E1',
        marginBottom: 20,
        lineHeight: 22,
        fontWeight: '500',
    },
    classInfo: {
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: '#334155',
        padding: 12,
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#06B6D4',
    },
    infoText: {
        marginLeft: 12,
        fontSize: 14,
        color: '#E2E8F0',
        fontWeight: '600',
    },
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10B981',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#065F46',
    },
    joinButtonText: {
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
    materialCard: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
        borderTopWidth: 4,
        borderTopColor: '#8B5CF6',
    },
    materialHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    materialIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#8B5CF6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    materialTypeContainer: {
        flex: 1,
    },
    materialType: {
        fontSize: 13,
        fontWeight: '700',
        color: '#C4B5FD',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    materialTitle: {
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 12,
        lineHeight: 22,
    },
    materialDescription: {
        color: '#CBD5E1',
        marginBottom: 16,
        lineHeight: 20,
        fontWeight: '500',
    },
    materialInfo: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    materialTag: {
        backgroundColor: '#475569',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#64748B',
    },
    materialTagText: {
        fontSize: 12,
        color: '#E2E8F0',
        fontWeight: '600',
    },
    materialFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#334155',
        padding: 12,
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#06B6D4',
    },
    downloadText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#CBD5E1',
        fontStyle: 'italic',
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        backgroundColor: '#1E293B',
        borderRadius: 16,
        margin: 16,
        borderWidth: 2,
        borderColor: '#334155',
        borderStyle: 'dashed',
    },
    emptyText: {
        marginTop: 20,
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 24,
    },
    // New styles for study materials grid
    studyMaterialsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 24,
        gap: 20,
    },
    materialCategoryCard: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        width: 150,
        height: 180,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
        justifyContent: 'center',
    },
    materialIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    materialCategoryTitle: {
        color: '#F8FAFC',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
        fontSize: 15,
        lineHeight: 18,
        minHeight: 36,
        textAlignVertical: 'center',
    },
    materialCount: {
        color: '#94A3B8',
        textAlign: 'center',
        fontWeight: '600',
        fontSize: 14,
        lineHeight: 18,
        minHeight: 18,
    },
    limitedMaterialsNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        padding: 16,
        borderRadius: 12,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#334155',
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    noteText: {
        color: '#CBD5E1',
        marginLeft: 12,
        flex: 1,
        lineHeight: 20,
        fontWeight: '500',
    },
    allMaterialsSection: {
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#F8FAFC',
        marginBottom: 20,
        paddingLeft: 4,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    materialViewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#1E293B',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
    },
    viewText: {
        marginLeft: 6,
        fontSize: 13,
        color: '#60A5FA',
        fontWeight: '600',
    },
    // Video card styles
    videoCard: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 16,
    },
    videoPlayerCard: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    videoCardInfo: {
        padding: 16,
    },
    videoCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    videoCardTitle: {
        color: '#F9FAFB',
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
        lineHeight: 20,
    },
    scheduledVideoBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoCardDescription: {
        color: '#D1D5DB',
        lineHeight: 18,
        marginBottom: 12,
    },
    videoCardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    videoCardMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    videoCardMetaText: {
        color: '#9CA3AF',
    },
    videoCardResources: {
        flexDirection: 'row',
        gap: 6,
    },
    // Upload details styles
    uploadDetailsContainer: {
        backgroundColor: '#334155',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#60A5FA',
    },
    uploadDetailsTitle: {
        color: '#E2E8F0',
        fontWeight: '600',
        marginBottom: 8,
    },
    uploadDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    uploadDetailText: {
        color: '#CBD5E1',
        flex: 1,
        lineHeight: 16,
    },
    // Resources styles
    resourcesContainer: {
        backgroundColor: '#1E3A8A',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    resourcesTitle: {
        color: '#DBEAFE',
        fontWeight: '600',
        marginBottom: 8,
    },
    resourcesList: {
        flexDirection: 'row',
        gap: 8,
    },
    resourceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E40AF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        gap: 4,
        flex: 1,
    },
    resourceButtonText: {
        color: '#F8FAFC',
        fontSize: 12,
        fontWeight: '600',
    },
    // Sort header styles
    sortHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    sortTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sortTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E3A8A',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    sortButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#60A5FA',
    },
    emptySubText: {
        marginTop: 8,
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 20,
    },
    // Video card collapsible styles
    videoHeader: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        marginBottom: 4,
        overflow: 'hidden',
    },
    videoHeaderContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: 16,
    },
    videoHeaderLeft: {
        flex: 1,
        marginRight: 12,
    },
    videoHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    videoMetaInfo: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    videoMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    videoMetaText: {
        color: '#94A3B8',
        fontWeight: '500',
    },
    videoResourceIndicators: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    resourceIndicatorText: {
        color: '#94A3B8',
        fontWeight: '500',
        marginLeft: 4,
    },
    videoExpandedContent: {
        backgroundColor: '#0F172A',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        overflow: 'hidden',
    },
    resourcesSection: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    resourcesSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#F8FAFC',
        marginBottom: 12,
    },
    resourceButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    resourceActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#374151',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
        minWidth: 120,
        borderWidth: 1,
        borderColor: '#4B5563',
    },
    resourceActionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F8FAFC',
        textAlign: 'center',
    },
    // PDF viewer styles
    pdfContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        paddingTop: 0, // Remove any default padding
    },
    pdfHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        minHeight: 70,
        position: 'relative',
        zIndex: 1000,
    },
    pdfBackButton: {
        borderRadius: 8,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#4B5563',
    },
    pdfTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#F8FAFC',
        textAlign: 'center',
    },
    pdfTitleContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 12,
        paddingHorizontal: 8,
    },
    pdfViewer: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
});

export default BatchDetailsScreen;
