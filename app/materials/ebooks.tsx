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

interface Ebook {
    id: string;
    title: string;
    author?: string;
    file_url: string;
    file_size?: string;
    upload_date?: string;
    description?: string;
    subject?: string;
}

const StudentEbooksPage = () => {
    const { courseId, courseName } = useLocalSearchParams<{
        courseId: string;
        courseName: string;
    }>();

    const [ebooks, setEbooks] = useState<Ebook[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedEbook, setSelectedEbook] = useState<Ebook | null>(null);
    const [screenData, setScreenData] = useState(Dimensions.get('window'));

    useEffect(() => {
        const onChange = (result: { window: any }) => {
            setScreenData(result.window);
        };

        const subscription = Dimensions.addEventListener('change', onChange);
        return () => subscription?.remove();
    }, []);

    const fetchEbooks = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const { data: courseData, error } = await supabase
                .from('courses')
                .select('eBooks')
                .eq('id', courseId)
                .single();

            if (error) {
                console.error('Error fetching eBooks:', error);
                Alert.alert('Error', 'Failed to fetch eBooks');
                return;
            }

            if (courseData?.eBooks && Array.isArray(courseData.eBooks)) {
                setEbooks(courseData.eBooks);
            } else {
                setEbooks([]);
            }

        } catch (error) {
            console.error('Error fetching eBooks:', error);
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
        fetchEbooks();
    }, [fetchEbooks]);

    // Handle automatic orientation for PDF viewing
    useEffect(() => {
        const handleOrientation = async () => {
            if (selectedEbook) {
                // Allow all orientations when PDF is open
                await ScreenOrientation.unlockAsync();
            } else {
                // Lock to portrait when not viewing PDF
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            }
        };

        handleOrientation();

        // Cleanup function to reset orientation when component unmounts
        return () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        };
    }, [selectedEbook]);

    const onRefresh = () => {
        fetchEbooks(true);
    };

    const handleBack = () => {
        if (selectedEbook) {
            setSelectedEbook(null);
        } else {
            router.back();
        }
    };

    const openEbook = (ebook: Ebook) => {
        setSelectedEbook(ebook);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const renderEbookItem = ({ item, index }: { item: Ebook; index: number }) => {
        const isSmallScreen = screenData.width < 600;

        return (
            <Animated.View entering={FadeInUp.delay(index * 100).springify()}>
                <TouchableOpacity
                    style={styles.ebookCard}
                    onPress={() => openEbook(item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.ebookHeader}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="book" size={32} color="#60A5FA" />
                        </View>
                        <View style={styles.ebookMeta}>
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

                    <Text style={[styles.ebookTitle, { fontSize: isSmallScreen ? 16 : 18 }]}>
                        {item.title}
                    </Text>

                    {item.author && (
                        <Text style={[styles.ebookAuthor, { fontSize: isSmallScreen ? 13 : 14 }]}>
                            by {item.author}
                        </Text>
                    )}

                    {item.description && (
                        <Text style={[styles.ebookDescription, { fontSize: isSmallScreen ? 12 : 14 }]}>
                            {item.description}
                        </Text>
                    )}

                    {item.subject && (
                        <View style={styles.subjectTag}>
                            <Text style={styles.subjectText}>{item.subject}</Text>
                        </View>
                    )}

                    <View style={styles.viewButton}>
                        <Ionicons name="eye-outline" size={16} color="white" />
                        <Text style={styles.viewButtonText}>View PDF</Text>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderPDFViewer = () => {
        if (!selectedEbook) return null;

        // Adjust header padding based on orientation
        const isLandscape = screenData.width > screenData.height;
        const headerPaddingTop = isLandscape ? 20 : 50;
        const pdfUrl = selectedEbook.file_url;

        return (
            <SafeAreaView style={styles.pdfContainer}>
                <View style={[styles.pdfHeader, { paddingTop: headerPaddingTop }]}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
                    </TouchableOpacity>
                    <Text style={styles.pdfTitle} numberOfLines={1}>
                        {selectedEbook.title}
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
                        Alert.alert('Error', 'Failed to load PDF. Please try again.');
                    }}
                />
            </SafeAreaView>
        );
    };


    if (selectedEbook) {
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
                        title: "eBooks",
                        headerShown: false,
                        statusBarStyle: 'light',
                        statusBarBackgroundColor: '#0F172A'
                    }}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#667EEA" />
                    <Text style={styles.loadingText}>Loading eBooks...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen
                options={{
                    title: "eBooks",
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
                    <Text style={styles.headerTitle}>eBooks</Text>
                    <Text style={styles.headerSubtitle}>{courseName}</Text>
                </View>
                <View style={{ width: 24 }} />
            </Animated.View>

            {/* Content */}
            <FlatList
                data={ebooks}
                keyExtractor={item => item.id}
                renderItem={renderEbookItem}
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
                        <Ionicons name="book-outline" size={64} color="#94A3B8" />
                        <Text style={styles.emptyText}>No eBooks available</Text>
                        <Text style={styles.emptySubtext}>
                            Check back later for new eBooks
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
        fontSize: 20,
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
    ebookCard: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    ebookHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1E40AF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ebookMeta: {
        alignItems: 'flex-end',
    },
    fileSize: {
        fontSize: 12,
        color: '#60A5FA',
        fontWeight: '700',
        backgroundColor: '#1E40AF',
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
    ebookTitle: {
        fontWeight: '800',
        color: '#F8FAFC',
        marginBottom: 8,
        lineHeight: 24,
    },
    ebookAuthor: {
        color: '#60A5FA',
        marginBottom: 12,
        fontWeight: '600',
        fontStyle: 'italic',
    },
    ebookDescription: {
        color: '#CBD5E1',
        marginBottom: 16,
        lineHeight: 20,
        fontWeight: '500',
    },
    subjectTag: {
        alignSelf: 'flex-start',
        backgroundColor: '#475569',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#64748B',
    },
    subjectText: {
        fontSize: 12,
        color: '#E2E8F0',
        fontWeight: '600',
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1E40AF',
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

export default StudentEbooksPage;
