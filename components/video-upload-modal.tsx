import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface VideoUploadModalProps {
    visible: boolean;
    onClose: () => void;
    courseId: string;
    onSuccess: () => void;
}

interface ScheduledClass {
    id: string;
    topic: string;
    scheduledDateTime: string;
    meetingLink: string;
    status: 'scheduled' | 'live' | 'ended';
    createdAt: string;
    createdBy: string;
}

const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
    visible,
    onClose,
    courseId,
    onSuccess,
}) => {
    const [videoId, setVideoId] = useState('');
    const [videoTitle, setVideoTitle] = useState('');
    const [videoDescription, setVideoDescription] = useState('');
    const [videoFile, setVideoFile] = useState<any>(null);
    const [thumbnail, setThumbnail] = useState<any>(null);
    const [classNotes, setClassNotes] = useState<any>(null);
    const [assignment, setAssignment] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [recentClass, setRecentClass] = useState<ScheduledClass | null>(null);

    const generateVideoId = () => {
        const timestamp = Date.now();
        setVideoId(timestamp.toString());
    };

    const fetchRecentScheduledClass = useCallback(async () => {
        try {
            const { data: course, error } = await supabase
                .from('courses')
                .select('scheduled_classes, recorded_classes')
                .eq('id', courseId)
                .single();

            if (error) {
                console.error('Error fetching course data:', error);
                // Generate ID if database error
                generateVideoId();
                return;
            }

            if (course?.scheduled_classes && Array.isArray(course.scheduled_classes)) {
                // Find classes with status "ended" only
                const endedClasses = course.scheduled_classes
                    .filter((cls: any) => cls.status === 'ended')
                    .sort((a: any, b: any) => new Date(b.scheduledDateTime).getTime() - new Date(a.scheduledDateTime).getTime());

                // Get existing recorded video IDs
                const existingVideoIds = new Set();
                if (course.recorded_classes && Array.isArray(course.recorded_classes)) {
                    course.recorded_classes.forEach((recording: any) => {
                        if (recording.video_id) {
                            existingVideoIds.add(recording.video_id);
                        }
                    });
                }

                if (endedClasses.length > 0) {
                    // Find the most recent ended class that doesn't have a recording yet
                    let recentUnrecordedClass = null;
                    for (const endedClass of endedClasses) {
                        if (!existingVideoIds.has(endedClass.id)) {
                            recentUnrecordedClass = endedClass;
                            break;
                        }
                    }

                    if (recentUnrecordedClass) {
                        // Use the most recent unrecorded ended class
                        setRecentClass(recentUnrecordedClass);
                        setVideoTitle(recentUnrecordedClass.topic || ''); // Pre-fill but editable
                        setVideoId(recentUnrecordedClass.id); // Use the scheduled class ID
                        console.log('Found unrecorded ended class, using ID:', recentUnrecordedClass.id);
                    } else {
                        // All ended classes already have recordings, generate new ID
                        console.log('All ended classes already recorded, generating new ID');
                        generateVideoId();
                        setRecentClass(null);
                    }
                } else {
                    // No ended classes found, generate new ID
                    console.log('No ended classes found, generating new ID');
                    generateVideoId();
                    setRecentClass(null);
                }
            } else {
                // No scheduled classes at all, generate new ID
                console.log('No scheduled classes found, generating new ID');
                generateVideoId();
                setRecentClass(null);
            }
        } catch (error) {
            console.error('Error in fetchRecentScheduledClass:', error);
            // Generate ID on any error
            generateVideoId();
            setRecentClass(null);
        }
    }, [courseId]);

    useEffect(() => {
        if (visible) {
            // Reset states when modal opens
            setVideoId('');
            setVideoTitle('');
            setVideoDescription('');
            setRecentClass(null);

            // Fetch recent class first, which will set the video ID
            fetchRecentScheduledClass();
        }
    }, [visible, fetchRecentScheduledClass]);

    const pickVideoFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'video/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];

                // Check file size (limit to 500MB)
                const maxSize = 500 * 1024 * 1024; // 500MB in bytes
                if (file.size && file.size > maxSize) {
                    Alert.alert('Error', 'Video file size must be less than 500MB');
                    return;
                }

                console.log('Selected video file:', file.name, 'Size:', file.size ? (file.size / (1024 * 1024)).toFixed(2) : 'Unknown', 'MB');
                setVideoFile(file);
            }
        } catch (error) {
            console.error('Error picking video file:', error);
            Alert.alert('Error', 'Failed to pick video file');
        }
    };

    const pickThumbnail = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setThumbnail(result.assets[0]);
            }
        } catch (error) {
            console.error('Error picking thumbnail:', error);
            Alert.alert('Error', 'Failed to pick thumbnail');
        }
    };

    const pickClassNotes = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setClassNotes(result.assets[0]);
            }
        } catch (error) {
            console.error('Error picking class notes:', error);
            Alert.alert('Error', 'Failed to pick class notes');
        }
    };

    const pickAssignment = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setAssignment(result.assets[0]);
            }
        } catch (error) {
            console.error('Error picking assignment:', error);
            Alert.alert('Error', 'Failed to pick assignment');
        }
    };

    const sanitizeFileName = (fileName: string): string => {
        // Remove or replace problematic characters
        const sanitized = fileName
            .replace(/[^\w\s.-]/g, '') // Remove special characters, keep alphanumeric, spaces, dots, dashes
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
            .substring(0, 100); // Limit length to 100 characters

        // Ensure we have a valid filename
        return sanitized || `file_${Date.now()}`;
    }; const uploadFile = async (file: any, path: string, isVideo: boolean = false, onProgress?: (progress: number) => void) => {
        try {
            // Extract directory path and original filename
            const pathParts = path.split('/');
            const originalFileName = pathParts.pop() || file.name;
            const directoryPath = pathParts.join('/');

            let finalFileName: string;

            if (isVideo) {
                // For video files, rename to videoplayback.extension
                const fileExtension = originalFileName.split('.').pop() || 'mp4';
                finalFileName = `videoplayback.${fileExtension}`;
            } else {
                // For other files, sanitize the original name
                finalFileName = sanitizeFileName(originalFileName);
            }

            // Reconstruct the full path with the final filename
            const fileName = directoryPath ? `${directoryPath}/${finalFileName}` : finalFileName;

            console.log('Original filename:', originalFileName);
            console.log('Final filename:', finalFileName);
            console.log('Full path:', fileName);

            const formData = new FormData();
            formData.append('file', {
                uri: file.uri,
                type: file.mimeType,
                name: finalFileName, // Use final name
            } as any);

            const { data, error } = await supabase.storage
                .from('inside-inspiration-academy-assets')
                .upload(fileName, formData, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (error) {
                throw error;
            }

            return data.path;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    };

    const handleSubmit = async () => {
        if (!videoTitle.trim()) {
            Alert.alert('Error', 'Please enter a video title');
            return;
        }

        if (!videoFile) {
            Alert.alert('Error', 'Please select a video file to upload');
            return;
        }

        // Video ID should always be available (either from ended class or generated)
        if (!videoId) {
            Alert.alert('Error', 'Video ID not available. Please try again.');
            return;
        }

        setLoading(true);
        setUploadProgress(0);

        try {
            const basePath = `Course-data/${courseId}/Recorded Class/${videoId}`;
            const uploadTimestamp = new Date().toISOString();
            const urls: any = {
                video_id: videoId,
                title: videoTitle,
                description: videoDescription,
                created_at: new Date().toISOString(),
                uploaded_at: uploadTimestamp, // Add upload timestamp
                scheduled_class_id: recentClass?.id || null, // Reference to scheduled class if available
                is_from_scheduled_class: !!recentClass, // Boolean flag to indicate source
            };

            // Upload video file first (main content)
            setUploadProgress(10);
            const videoPath = await uploadFile(
                videoFile,
                `${basePath}/Class Recording/${videoFile.name}`,
                true // isVideo = true
            );
            const { data: videoUrl } = supabase.storage
                .from('inside-inspiration-academy-assets')
                .getPublicUrl(videoPath);
            urls.video_url = videoUrl.publicUrl;

            setUploadProgress(60);

            // Upload thumbnail if provided
            if (thumbnail) {
                setUploadProgress(65);
                const thumbnailExtension = thumbnail.name.split('.').pop() || 'jpg';
                const thumbnailPath = await uploadFile(thumbnail, `${basePath}/Class Recording/thumbnail.${thumbnailExtension}`, false);
                const { data: thumbnailUrl } = supabase.storage
                    .from('inside-inspiration-academy-assets')
                    .getPublicUrl(thumbnailPath);
                urls.thumbnail_url = thumbnailUrl.publicUrl;
                setUploadProgress(75);
            }

            // Upload class notes if provided
            if (classNotes) {
                setUploadProgress(80);
                const notesPath = await uploadFile(classNotes, `${basePath}/Class Notes/${classNotes.name}`, false);
                const { data: notesUrl } = supabase.storage
                    .from('inside-inspiration-academy-assets')
                    .getPublicUrl(notesPath);
                urls.class_notes_url = notesUrl.publicUrl;
                setUploadProgress(90);
            }

            // Upload assignment if provided
            if (assignment) {
                setUploadProgress(95);
                const assignmentPath = await uploadFile(assignment, `${basePath}/Assignments/${assignment.name}`, false);
                const { data: assignmentUrl } = supabase.storage
                    .from('inside-inspiration-academy-assets')
                    .getPublicUrl(assignmentPath);
                urls.assignment_url = assignmentUrl.publicUrl;
            }

            // Update the course's recorded_classes column
            setUploadProgress(98);
            const { data: existingCourse, error: fetchError } = await supabase
                .from('courses')
                .select('recorded_classes')
                .eq('id', courseId)
                .single();

            if (fetchError) {
                throw fetchError;
            }

            const existingClasses = existingCourse?.recorded_classes || [];
            const updatedClasses = [...existingClasses, urls];

            const { error: updateError } = await supabase
                .from('courses')
                .update({ recorded_classes: updatedClasses })
                .eq('id', courseId);

            if (updateError) {
                throw updateError;
            }

            setUploadProgress(100);
            Alert.alert('Success', 'Video and related files uploaded successfully!');
            onSuccess();
            handleClose();
        } catch (error) {
            console.error('Error uploading video data:', error);
            Alert.alert('Error', 'Failed to upload video data');
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const handleClose = () => {
        setVideoId('');
        setVideoTitle('');
        setVideoDescription('');
        setVideoFile(null);
        setThumbnail(null);
        setClassNotes(null);
        setAssignment(null);
        setUploadProgress(0);
        setRecentClass(null);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Upload Recorded Class</Text>
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                        <Ionicons name="close" size={24} color="#D1D5DB" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    {recentClass ? (
                        <View style={styles.recentClassInfo}>
                            <Ionicons name="information-circle" size={20} color="#3B82F6" />
                            <Text style={styles.recentClassText}>
                                Auto-filled from ended class: {recentClass.topic}
                                {'\n'}Using Class ID: {recentClass.id}
                            </Text>
                        </View>
                    ) : (
                        <View style={[styles.recentClassInfo, styles.warningInfo]}>
                            <Ionicons name="information-circle" size={20} color="#F59E0B" />
                            <Text style={[styles.recentClassText, styles.warningText]}>
                                {recentClass === null
                                    ? "No unrecorded ended classes found. Generated new Video ID."
                                    : "Generated new Video ID for manual upload."
                                }
                            </Text>
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Video ID</Text>
                        <TextInput
                            style={[styles.input, styles.disabledInput]}
                            value={videoId}
                            editable={false}
                            placeholder={
                                videoId
                                    ? (recentClass ? "From ended class" : "Auto-generated")
                                    : "Loading..."
                            }
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Video Title *</Text>
                        <TextInput
                            style={styles.input}
                            value={videoTitle}
                            onChangeText={setVideoTitle}
                            placeholder="Enter video title"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Video Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={videoDescription}
                            onChangeText={setVideoDescription}
                            placeholder="Enter video description"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Video File *</Text>
                        <TouchableOpacity style={styles.filePickerButton} onPress={pickVideoFile}>
                            <Ionicons name="videocam" size={20} color="#EF4444" />
                            <Text style={styles.filePickerText}>
                                {videoFile ? videoFile.name : 'Pick video file (MP4, MOV, AVI)'}
                            </Text>
                        </TouchableOpacity>
                        {videoFile && (
                            <View style={styles.fileInfo}>
                                <Text style={styles.fileInfoText}>
                                    Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                                </Text>
                            </View>
                        )}
                    </View>

                    {loading && uploadProgress > 0 && (
                        <View style={styles.progressContainer}>
                            <Text style={styles.progressText}>Uploading... {uploadProgress}%</Text>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                            </View>
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Thumbnail</Text>
                        <TouchableOpacity style={styles.filePickerButton} onPress={pickThumbnail}>
                            <Ionicons name="image-outline" size={20} color="#3B82F6" />
                            <Text style={styles.filePickerText}>
                                {thumbnail ? thumbnail.name : 'Pick thumbnail image'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Class Notes (PDF)</Text>
                        <TouchableOpacity style={styles.filePickerButton} onPress={pickClassNotes}>
                            <Ionicons name="document-text-outline" size={20} color="#10B981" />
                            <Text style={styles.filePickerText}>
                                {classNotes ? classNotes.name : 'Pick class notes PDF'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Assignment (PDF) - Optional</Text>
                        <TouchableOpacity style={styles.filePickerButton} onPress={pickAssignment}>
                            <Ionicons name="document-outline" size={20} color="#F59E0B" />
                            <Text style={styles.filePickerText}>
                                {assignment ? assignment.name : 'Pick assignment PDF'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleClose}
                        disabled={loading}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={loading || !videoTitle.trim() || !videoFile}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Upload Video</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1F2937',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
        backgroundColor: '#111827',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#F9FAFB',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    recentClassInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E3A8A',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    recentClassText: {
        marginLeft: 8,
        color: '#DBEAFE',
        fontSize: 14,
        flex: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F3F4F6',
        marginBottom: 8,
    },
    input: {
        borderWidth: 2,
        borderColor: '#4B5563',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: '#374151',
        color: '#F9FAFB',
    },
    disabledInput: {
        backgroundColor: '#2D3748',
        color: '#9CA3AF',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    filePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#4B5563',
        borderRadius: 12,
        padding: 16,
        backgroundColor: '#374151',
        borderStyle: 'dashed',
    },
    filePickerText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#F9FAFB',
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#374151',
        backgroundColor: '#111827',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#6B7280',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#F9FAFB',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#FF5734',
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    disabledButton: {
        opacity: 0.6,
    },
    fileInfo: {
        marginTop: 8,
        padding: 8,
        backgroundColor: '#2D3748',
        borderRadius: 6,
    },
    fileInfoText: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '500',
    },
    progressContainer: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#1E3A8A',
        borderRadius: 12,
    },
    progressText: {
        color: '#DBEAFE',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    progressBar: {
        height: 8,
        backgroundColor: '#1E40AF',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 4,
    },
    warningInfo: {
        backgroundColor: '#92400E',
    },
    warningText: {
        color: '#FEF3C7',
    },
});

export default VideoUploadModal;
