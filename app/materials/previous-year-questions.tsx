import PDFViewer from '@/components/PDFViewer';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp
} from 'react-native-reanimated';

interface PreviousYearQuestion {
    id: string;
    title: string;
    author?: string;
    file_url: string;
    file_size?: string;
    upload_date?: string;
    description?: string;
    year?: string;
    exam_type?: string;
}

const StudentPreviousYearQuestionsPage = () => {
    const { courseId, courseName } = useLocalSearchParams<{
        courseId: string;
        courseName: string;
    }>();

    const [previousYearQuestions, setPreviousYearQuestions] = useState<PreviousYearQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<PreviousYearQuestion | null>(null);
    const [screenData, setScreenData] = useState(Dimensions.get('window'));

    useEffect(() => {
        const onChange = (result: { window: any }) => {
            setScreenData(result.window);
        };

        const subscription = Dimensions.addEventListener('change', onChange);
        return () => subscription?.remove();
    }, []);

    const fetchPreviousYearQuestions = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const { data: courseData, error } = await supabase
                .from('courses')
                .select('previous_year_questions')
                .eq('id', courseId)
                .single();

            if (error) {
                console.error('Error fetching previous year questions:', error);
                Alert.alert('Error', 'Failed to fetch previous year questions');
                return;
            }

            if (courseData?.previous_year_questions && Array.isArray(courseData.previous_year_questions)) {
                setPreviousYearQuestions(courseData.previous_year_questions);
            } else {
                setPreviousYearQuestions([]);
            }

        } catch (error) {
            console.error('Error fetching previous year questions:', error);
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
        fetchPreviousYearQuestions();
    }, [fetchPreviousYearQuestions]);

    // Auto-rotation effect
    useEffect(() => {
        if (selectedQuestion) {
            // Unlock orientation when viewing PDF
            ScreenOrientation.unlockAsync();
        } else {
            // Lock to portrait when in list view
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }

        return () => {
            // Cleanup: lock to portrait when component unmounts
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        };
    }, [selectedQuestion]);

    const onRefresh = () => {
        fetchPreviousYearQuestions(true);
    };

    const handleBack = () => {
        if (selectedQuestion) {
            setSelectedQuestion(null);
        } else {
            router.back();
        }
    };

    const openQuestion = (question: PreviousYearQuestion) => {
        setSelectedQuestion(question);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const renderQuestionItem = ({ item, index }: { item: PreviousYearQuestion; index: number }) => {
        const isSmallScreen = screenData.width < 600;

        return (
            <Animated.View entering={FadeInUp.delay(index * 100).springify()}>
                <TouchableOpacity
                    style={styles.questionCard}
                    onPress={() => openQuestion(item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.questionHeader}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="archive" size={32} color="#F472B6" />
                        </View>
                        <View style={styles.questionMeta}>
                            {item.file_size && (
                                <Text style={styles.fileSize}>{item.file_size}</Text>
                            )}
                            {item.upload_date && (
                                <Text style={styles.uploadDate}>
                                    {formatDate(item.upload_date)}
                                </Text>
                            )}
                        </View>
                    </View>

                    <Text style={[styles.questionTitle, { fontSize: isSmallScreen ? 16 : 18 }]}>
                        {item.title}
                    </Text>

                    {item.author && (
                        <Text style={[styles.questionAuthor, { fontSize: isSmallScreen ? 13 : 14 }]}>
                            by {item.author}
                        </Text>
                    )}

                    {item.description && (
                        <Text style={[styles.questionDescription, { fontSize: isSmallScreen ? 12 : 14 }]}>
                            {item.description}
                        </Text>
                    )}

                    <View style={styles.tagsContainer}>
                        {item.year && (
                            <View style={styles.yearTag}>
                                <Text style={styles.tagText}>{item.year}</Text>
                            </View>
                        )}
                        {item.exam_type && (
                            <View style={styles.examTypeTag}>
                                <Text style={styles.tagText}>{item.exam_type}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.viewButton}>
                        <Ionicons name="eye-outline" size={16} color="white" />
                        <Text style={styles.viewButtonText}>View Paper</Text>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderPDFViewer = () => {
        if (!selectedQuestion) return null;

        // Adjust header padding based on orientation
        const isLandscape = screenData.width > screenData.height;
        const headerPaddingTop = isLandscape ? 20 : 50;
        const pdfUrl = selectedQuestion.file_url;

        return (
            <SafeAreaView style={styles.pdfContainer}>
                <View style={[styles.pdfHeader, { paddingTop: headerPaddingTop }]}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
                    </TouchableOpacity>
                    <Text style={styles.pdfTitle} numberOfLines={1}>
                        {selectedQuestion.title}
                    </Text>
                    <View style={{ width: 24 }} />
                </View>

                <PDFViewer
                    url={pdfUrl}
                    onLoadComplete={(numberOfPages, filePath) => {
                        console.log(`PDF loaded. Pages: ${numberOfPages}`);
                    }}
                    onError={(error) => {
                        console.error('PDF load error: ', error);
                        Alert.alert('Error', 'Failed to load paper. Please try again.');
                    }}
                />
            </SafeAreaView>
        );
    };

    if (selectedQuestion) {
        return (
            <>
                <Stack.Screen
                    options={{
                        headerShown: false,
                        statusBarStyle: 'light',
                        statusBarBackgroundColor: '#1E293B',
                        statusBarHidden: false,
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
                        title: "Previous Year Questions",
                        headerShown: false,
                        statusBarStyle: 'light',
                        statusBarBackgroundColor: '#0F172A'
                    }}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#667EEA" />
                    <Text style={styles.loadingText}>Loading Previous Year Questions...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen
                options={{
                    title: "Previous Year Questions",
                    headerShown: false,
                    statusBarStyle: 'light',
                    statusBarBackgroundColor: '#0F172A'
                }}
            />

            {/* Header */}
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButtonHeader}>
                    <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Previous Year Questions</Text>
                    <Text style={styles.headerSubtitle}>{courseName}</Text>
                </View>
                <View style={{ width: 24 }} />
            </Animated.View>

            {/* Content */}
            <FlatList
                data={previousYearQuestions}
                keyExtractor={item => item.id}
                renderItem={renderQuestionItem}
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
                    <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.emptyContainer}>
                        <Ionicons name="archive-outline" size={64} color="#94A3B8" />
                        <Text style={styles.emptyText}>No Previous Year Questions available</Text>
                        <Text style={styles.emptySubtext}>
                            Check back later for past exam papers
                        </Text>
                    </Animated.View>
                }
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
        marginTop: 16,
        fontSize: 16,
        color: '#64748B',
        fontWeight: '500',
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
    headerContent: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#F1F5F9',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 2,
    },
    list: {
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    questionCard: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
        borderLeftWidth: 4,
        borderLeftColor: '#EC4899',
    },
    questionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#BE185D',
        alignItems: 'center',
        justifyContent: 'center',
    },
    questionMeta: {
        alignItems: 'flex-end',
    },
    fileSize: {
        fontSize: 12,
        color: '#F472B6',
        fontWeight: '700',
        backgroundColor: '#BE185D',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 4,
    },
    uploadDate: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
    questionTitle: {
        fontWeight: '800',
        color: '#F8FAFC',
        marginBottom: 8,
        lineHeight: 24,
    },
    questionAuthor: {
        color: '#F472B6',
        marginBottom: 12,
        fontWeight: '600',
        fontStyle: 'italic',
    },
    questionDescription: {
        color: '#CBD5E1',
        marginBottom: 16,
        lineHeight: 20,
        fontWeight: '500',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    yearTag: {
        backgroundColor: '#7C2D12',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#C2410C',
    },
    examTypeTag: {
        backgroundColor: '#881337',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#BE185D',
    },
    tagText: {
        fontSize: 12,
        color: '#E2E8F0',
        fontWeight: '600',
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EC4899',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BE185D',
    },
    viewButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 20,
    },
    emptyText: {
        marginTop: 20,
        fontSize: 18,
        color: '#F8FAFC',
        textAlign: 'center',
        fontWeight: '700',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        fontWeight: '500',
    },
    // PDF Viewer Styles
    pdfContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    pdfHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    backButton: {
        padding: 10,
        borderRadius: 12,
        backgroundColor: '#334155',
        borderWidth: 1,
        borderColor: '#475569',
    },
    pdfTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#F1F5F9',
        textAlign: 'center',
        marginHorizontal: 16,
    },
});

export default StudentPreviousYearQuestionsPage;
