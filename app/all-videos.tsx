import PDFViewer from "@/components/PDFViewer";
import VideoPlayer from "@/components/VideoPlayer";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

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

const AllVideosPage = () => {
    const { courseId, courseName } = useLocalSearchParams<{ courseId: string; courseName: string }>();
    const [videos, setVideos] = useState<RecordedVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [screenData, setScreenData] = useState(Dimensions.get("window"));
    const [editingVideo, setEditingVideo] = useState<RecordedVideo | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [selectedPDF, setSelectedPDF] = useState<{ url: string; title: string; type: 'notes' | 'assignment' } | null>(null);

    useEffect(() => {
        const onChange = (result: { window: any }) => {
            setScreenData(result.window);
        };

        const subscription = Dimensions.addEventListener("change", onChange);
        return () => subscription?.remove();
    }, []);

    const fetchVideos = useCallback(async () => {
        if (!courseId) {
            router.back();
            return;
        }

        try {
            setLoading(true);

            const { data, error } = await supabase
                .from("courses")
                .select("recorded_classes")
                .eq("id", courseId)
                .single();

            if (error) {
                console.error("Error fetching videos:", error);
                Alert.alert("Error", "Failed to fetch videos");
                return;
            }

            const recordedClasses = data?.recorded_classes || [];
            // Sort by uploaded_at or created_at (newest first)
            const sortedVideos = recordedClasses.sort((a: RecordedVideo, b: RecordedVideo) => {
                const dateA = new Date(a.uploaded_at || a.created_at);
                const dateB = new Date(b.uploaded_at || b.created_at);
                return dateB.getTime() - dateA.getTime();
            });

            setVideos(sortedVideos);
        } catch (error) {
            console.error("Error in fetchVideos:", error);
            Alert.alert("Error", "Something went wrong while fetching videos");
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    // Handle automatic orientation for PDF viewing
    useEffect(() => {
        const handleOrientation = async () => {
            if (selectedPDF) {
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
    }, [selectedPDF]);

    const handleBack = () => {
        if (selectedPDF) {
            setSelectedPDF(null);
        } else {
            router.back();
        }
    };

    const handleEditVideo = (video: RecordedVideo) => {
        setEditingVideo(video);
        setEditTitle(video.title);
        setEditDescription(video.description || '');
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingVideo || !editTitle.trim()) {
            Alert.alert("Error", "Title is required");
            return;
        }

        try {
            setSaving(true);

            // Update the video in the recorded_classes array
            const updatedVideos = videos.map(video => {
                if (video.video_id === editingVideo.video_id) {
                    return {
                        ...video,
                        title: editTitle.trim(),
                        description: editDescription.trim(),
                    };
                }
                return video;
            });

            // Update in database
            const { error } = await supabase
                .from("courses")
                .update({ recorded_classes: updatedVideos })
                .eq("id", courseId);

            if (error) {
                throw error;
            }

            // Update local state
            setVideos(updatedVideos);
            setShowEditModal(false);
            setEditingVideo(null);
            Alert.alert("Success", "Video updated successfully");

        } catch (error) {
            console.error("Error updating video:", error);
            Alert.alert("Error", "Failed to update video");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteVideo = async (video: RecordedVideo) => {
        Alert.alert(
            "Delete Video",
            "Are you sure you want to delete this video? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Remove video from the array
                            const updatedVideos = videos.filter(v => v.video_id !== video.video_id);

                            // Update in database
                            const { error } = await supabase
                                .from("courses")
                                .update({ recorded_classes: updatedVideos })
                                .eq("id", courseId);

                            if (error) {
                                throw error;
                            }

                            // Update local state
                            setVideos(updatedVideos);
                            Alert.alert("Success", "Video deleted successfully");

                        } catch (error) {
                            console.error("Error deleting video:", error);
                            Alert.alert("Error", "Failed to delete video");
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleViewPDF = (url: string, title: string, type: 'notes' | 'assignment' = 'notes') => {
        if (!url) {
            Alert.alert("Error", "PDF URL not available");
            return;
        }
        setSelectedPDF({ url, title, type });
    };

    const isSmallScreen = screenData.width < 600;

    const renderPDFViewer = () => {
        if (!selectedPDF) return null;

        // Adjust header padding based on orientation
        const isLandscape = screenData.width > screenData.height;
        const headerPaddingTop = isLandscape ? 20 : 50;

        return (
            <SafeAreaView style={styles.pdfContainer}>
                <View style={[styles.pdfHeader, { paddingTop: headerPaddingTop }]}>
                    <TouchableOpacity onPress={handleBack} style={styles.pdfBackButton}>
                        <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
                    </TouchableOpacity>
                    <Text style={styles.pdfTitle} numberOfLines={1}>
                        {selectedPDF.title}
                    </Text>
                    <View style={{ width: 24 }} />
                </View>

                <PDFViewer
                    url={selectedPDF.url}
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

    // If PDF is selected, show PDF viewer
    if (selectedPDF) {
        return (
            <>
                <Stack.Screen
                    options={{
                        headerShown: false,
                        statusBarStyle: 'light',
                        statusBarBackgroundColor: '#1F2937',
                        statusBarHidden: false,
                    }}
                />
                {renderPDFViewer()}
            </>
        );
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={[styles.loadingText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                    Loading videos...
                </Text>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                            Course Videos
                        </Text>
                        <Text style={[styles.headerSubtitle, { fontSize: isSmallScreen ? 12 : 14 }]}>
                            {courseName && decodeURIComponent(courseName)}
                        </Text>
                    </View>
                    <View style={styles.videoCount}>
                        <Text style={[styles.videoCountText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                            {videos.length} video{videos.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                    {videos.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="videocam-outline" size={80} color="#6B7280" />
                            <Text style={[styles.emptyTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                                No Videos Available
                            </Text>
                            <Text style={[styles.emptySubtitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                Upload your first recorded class to get started
                            </Text>
                        </View>
                    ) : (
                        videos.map((video, index) => (
                            <View key={video.video_id} style={styles.videoCard}>
                                {/* Video Player */}
                                <VideoPlayer
                                    videoUrl={video.video_url}
                                    thumbnailUrl={video.thumbnail_url}
                                    title={video.title}
                                    style={styles.videoPlayer}
                                />

                                {/* Video Info */}
                                <View style={styles.videoInfo}>
                                    <View style={styles.videoHeader}>
                                        <View style={styles.videoTitleContainer}>
                                            <Text style={[styles.videoTitle, { fontSize: isSmallScreen ? 16 : 18 }]}>
                                                {video.title}
                                            </Text>
                                            {video.is_from_scheduled_class && (
                                                <View style={styles.scheduledBadge}>
                                                    <Ionicons name="calendar" size={12} color="#10B981" />
                                                    <Text style={styles.scheduledBadgeText}>Scheduled Class</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.videoActions}>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleEditVideo(video)}
                                            >
                                                <Ionicons name="pencil" size={16} color="#3B82F6" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleDeleteVideo(video)}
                                            >
                                                <Ionicons name="trash" size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {video.description && (
                                        <Text style={[styles.videoDescription, { fontSize: isSmallScreen ? 14 : 15 }]}>
                                            {video.description}
                                        </Text>
                                    )}

                                    <View style={styles.videoMeta}>
                                        <View style={styles.metaItem}>
                                            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                                            <Text style={[styles.metaText, { fontSize: isSmallScreen ? 12 : 13 }]}>
                                                Uploaded: {formatDate(video.uploaded_at || video.created_at)}
                                            </Text>
                                        </View>
                                        <View style={styles.metaItem}>
                                            <Ionicons name="key-outline" size={14} color="#9CA3AF" />
                                            <Text style={[styles.metaText, { fontSize: isSmallScreen ? 12 : 13 }]}>
                                                ID: {video.video_id}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Additional Resources */}
                                    {(video.class_notes_url || video.assignment_url) && (
                                        <View style={styles.resourcesContainer}>
                                            <Text style={[styles.resourcesTitle, { fontSize: isSmallScreen ? 14 : 15 }]}>
                                                Resources:
                                            </Text>
                                            <View style={styles.resourcesList}>
                                                {video.class_notes_url && (
                                                    <TouchableOpacity
                                                        style={styles.resourceButton}
                                                        onPress={() => handleViewPDF(video.class_notes_url!, 'Class Notes - ' + video.title, 'notes')}
                                                    >
                                                        <Ionicons name="document-text" size={16} color="#10B981" />
                                                        <Text style={styles.resourceButtonText}>Class Notes</Text>
                                                    </TouchableOpacity>
                                                )}
                                                {video.assignment_url && (
                                                    <TouchableOpacity
                                                        style={styles.resourceButton}
                                                        onPress={() => handleViewPDF(video.assignment_url!, 'Assignment - ' + video.title, 'assignment')}
                                                    >
                                                        <Ionicons name="document" size={16} color="#F59E0B" />
                                                        <Text style={styles.resourceButtonText}>Assignment</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* Edit Modal */}
                <Modal
                    visible={showEditModal}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setShowEditModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[
                            styles.modalContent,
                            {
                                maxWidth: screenData.width < 400 ? screenData.width - 32 : 500,
                                width: screenData.width < 400 ? "95%" : "90%",
                            }
                        ]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                                    Edit Video
                                </Text>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setShowEditModal(false)}
                                >
                                    <Ionicons name="close" size={24} color="#D1D5DB" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalForm}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                        Title *
                                    </Text>
                                    <TextInput
                                        style={[styles.input, { fontSize: isSmallScreen ? 14 : 16 }]}
                                        value={editTitle}
                                        onChangeText={setEditTitle}
                                        placeholder="Enter video title"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                        Description
                                    </Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea, { fontSize: isSmallScreen ? 14 : 16 }]}
                                        value={editDescription}
                                        onChangeText={setEditDescription}
                                        placeholder="Enter video description"
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        numberOfLines={4}
                                    />
                                </View>
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setShowEditModal(false)}
                                    disabled={saving}
                                >
                                    <Text style={[styles.cancelButtonText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.saveButton, saving && styles.disabledButton]}
                                    onPress={handleSaveEdit}
                                    disabled={saving || !editTitle.trim()}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={[styles.saveButtonText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                            Save Changes
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#111827",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#111827",
    },
    loadingText: {
        marginTop: 10,
        color: "#9CA3AF",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingTop: 50,
        backgroundColor: "#1F2937",
        borderBottomWidth: 1,
        borderBottomColor: "#374151",
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "#374151",
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 16,
    },
    headerTitle: {
        color: "#fff",
        fontWeight: "600",
    },
    headerSubtitle: {
        color: "#9CA3AF",
        marginTop: 2,
    },
    videoCount: {
        backgroundColor: "#374151",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    videoCountText: {
        color: "#9CA3AF",
        fontWeight: "500",
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
    },
    emptyTitle: {
        color: "#F9FAFB",
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        color: "#9CA3AF",
        textAlign: "center",
        lineHeight: 22,
    },
    videoCard: {
        backgroundColor: "#1F2937",
        borderRadius: 16,
        marginBottom: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#374151",
    },
    videoPlayer: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    videoInfo: {
        padding: 20,
    },
    videoHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    videoTitleContainer: {
        flex: 1,
        marginRight: 12,
    },
    videoTitle: {
        color: "#F9FAFB",
        fontWeight: "600",
        marginBottom: 8,
        lineHeight: 24,
    },
    scheduledBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#D1FAE5",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: "flex-start",
    },
    scheduledBadgeText: {
        color: "#10B981",
        fontSize: 12,
        fontWeight: "600",
        marginLeft: 4,
    },
    videoActions: {
        flexDirection: "row",
        gap: 8,
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#374151",
        justifyContent: "center",
        alignItems: "center",
    },
    videoDescription: {
        color: "#D1D5DB",
        lineHeight: 20,
        marginBottom: 16,
    },
    videoMeta: {
        gap: 8,
        marginBottom: 16,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    metaText: {
        color: "#9CA3AF",
    },
    resourcesContainer: {
        borderTopWidth: 1,
        borderTopColor: "#374151",
        paddingTop: 16,
    },
    resourcesTitle: {
        color: "#F9FAFB",
        fontWeight: "600",
        marginBottom: 12,
    },
    resourcesList: {
        flexDirection: "row",
        gap: 12,
    },
    resourceButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#374151",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    resourceButtonText: {
        color: "#D1D5DB",
        fontSize: 14,
        fontWeight: "500",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#1F2937",
        borderRadius: 16,
        maxHeight: "80%",
        borderWidth: 1,
        borderColor: "#374151",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#374151",
    },
    modalTitle: {
        color: "#F9FAFB",
        fontWeight: "600",
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#374151",
        justifyContent: "center",
        alignItems: "center",
    },
    modalForm: {
        padding: 20,
        maxHeight: 300,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: "#F9FAFB",
        fontWeight: "600",
        marginBottom: 8,
    },
    input: {
        borderWidth: 2,
        borderColor: "#4B5563",
        borderRadius: 12,
        padding: 16,
        backgroundColor: "#374151",
        color: "#F9FAFB",
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    modalActions: {
        flexDirection: "row",
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: "#374151",
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#6B7280",
        alignItems: "center",
    },
    cancelButtonText: {
        color: "#F9FAFB",
        fontWeight: "600",
    },
    saveButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#3B82F6",
        alignItems: "center",
    },
    saveButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    disabledButton: {
        opacity: 0.6,
    },
    // PDF Viewer Styles
    pdfContainer: {
        flex: 1,
        backgroundColor: '#111827',
    },
    pdfHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#1F2937',
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    pdfBackButton: {
        padding: 10,
        borderRadius: 12,
        backgroundColor: '#374151',
        borderWidth: 1,
        borderColor: '#4B5563',
    },
    pdfTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#F9FAFB',
        textAlign: 'center',
        marginHorizontal: 16,
    },
});

export default AllVideosPage;
