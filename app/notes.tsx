import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Linking,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface Note {
    id: string;
    title: string;
    heading: string;
    file_url: string;
    file_size: string;
    upload_date: string;
}

const NotesPage = () => {
    const { courseId, courseName } = useLocalSearchParams<{ courseId: string; courseName: string }>();
    const [screenData, setScreenData] = useState(Dimensions.get("window"));
    const [activeTab, setActiveTab] = useState<'view' | 'update'>('view');
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    // Update states
    const [updating, setUpdating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newNote, setNewNote] = useState({
        title: '',
        heading: '',
        selectedFile: null as any
    });

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setScreenData(window);
        });
        return () => subscription?.remove();
    }, []);

    const fetchNotes = useCallback(async () => {
        if (!courseId) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('courses')
                .select('notes')
                .eq('id', courseId)
                .single();

            if (error) throw error;

            const notesData = data?.notes || [];
            setNotes(notesData);
        } catch (error) {
            console.error('Error fetching notes:', error);
            Alert.alert('Error', 'Failed to load notes');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleBack = () => {
        router.back();
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                setNewNote(prev => ({
                    ...prev,
                    selectedFile: file,
                    title: prev.title || file.name.replace('.pdf', '')
                }));
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to pick document');
        }
    };

    const uploadFile = async (file: any, fileName: string) => {
        try {
            setUploading(true);

            const fileExt = 'pdf';
            const filePath = `Course-data/${courseId}/Notes/${fileName}.${fileExt}`;

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', {
                uri: file.uri,
                type: 'application/pdf',
                name: `${fileName}.${fileExt}`
            } as any);

            // Upload to Supabase Storage
            const { error } = await supabase.storage
                .from('inside-inspiration-academy-assets')
                .upload(filePath, formData, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: publicData } = supabase.storage
                .from('inside-inspiration-academy-assets')
                .getPublicUrl(filePath);

            return publicData.publicUrl;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        } finally {
            setUploading(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.title.trim() || !newNote.heading.trim() || !newNote.selectedFile) {
            Alert.alert('Error', 'Please fill in all fields and select a PDF file');
            return;
        }

        try {
            setUpdating(true);

            // Upload file to storage
            const fileUrl = await uploadFile(newNote.selectedFile, newNote.title);

            // Create new note object
            const newNoteData = {
                id: Date.now().toString(),
                title: newNote.title.trim(),
                heading: newNote.heading.trim(),
                file_url: fileUrl,
                file_size: formatFileSize(newNote.selectedFile.size || 0),
                upload_date: new Date().toISOString()
            };

            // Get current notes
            const { data: currentData, error: fetchError } = await supabase
                .from('courses')
                .select('notes')
                .eq('id', courseId)
                .single();

            if (fetchError) throw fetchError;

            const currentNotes = currentData?.notes || [];
            const updatedNotes = [...currentNotes, newNoteData];

            // Update courses table
            const { error: updateError } = await supabase
                .from('courses')
                .update({ notes: updatedNotes })
                .eq('id', courseId);

            if (updateError) throw updateError;

            Alert.alert('Success', 'Note added successfully!');
            setNewNote({ title: '', heading: '', selectedFile: null });
            setShowAddModal(false);
            fetchNotes();
        } catch (error) {
            console.error('Error adding note:', error);
            Alert.alert('Error', 'Failed to add note');
        } finally {
            setUpdating(false);
        }
    };

    const handleEditNote = async () => {
        if (!editingNote || !editingNote.title.trim() || !editingNote.heading.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            setUpdating(true);

            // Get current notes
            const { data: currentData, error: fetchError } = await supabase
                .from('courses')
                .select('notes')
                .eq('id', courseId)
                .single();

            if (fetchError) throw fetchError;

            const currentNotes = currentData?.notes || [];
            const updatedNotes = currentNotes.map((note: Note) =>
                note.id === editingNote.id ? editingNote : note
            );

            // Update courses table
            const { error: updateError } = await supabase
                .from('courses')
                .update({ notes: updatedNotes })
                .eq('id', courseId);

            if (updateError) throw updateError;

            Alert.alert('Success', 'Note updated successfully!');
            setEditingNote(null);
            fetchNotes();
        } catch (error) {
            console.error('Error updating note:', error);
            Alert.alert('Error', 'Failed to update note');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteNote = (note: Note) => {
        Alert.alert(
            'Delete Note',
            `Are you sure you want to delete "${note.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Get current notes
                            const { data: currentData, error: fetchError } = await supabase
                                .from('courses')
                                .select('notes')
                                .eq('id', courseId)
                                .single();

                            if (fetchError) throw fetchError;

                            const currentNotes = currentData?.notes || [];
                            const updatedNotes = currentNotes.filter((n: Note) => n.id !== note.id);

                            // Update courses table
                            const { error: updateError } = await supabase
                                .from('courses')
                                .update({ notes: updatedNotes })
                                .eq('id', courseId);

                            if (updateError) throw updateError;

                            fetchNotes();
                        } catch (error) {
                            console.error('Error deleting note:', error);
                            Alert.alert('Error', 'Failed to delete note');
                        }
                    }
                }
            ]
        );
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleOpenFile = (url: string) => {
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Unable to open file');
        });
    };

    const isSmallScreen = screenData.width < 600;

    const renderViewContent = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2E4064" />
                    <Text style={[styles.loadingText, { fontSize: isSmallScreen ? 16 : 18 }]}>
                        Loading Notes...
                    </Text>
                </View>
            );
        }

        if (notes.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
                    <Text style={[styles.emptyTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                        No Notes Available
                    </Text>
                    <Text style={[styles.emptyDescription, { fontSize: isSmallScreen ? 14 : 16 }]}>
                        There are no notes uploaded for this course yet. Check back later or contact your instructor.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.notesList}>
                {notes.map((note) => (
                    <View key={note.id} style={styles.noteCard}>
                        <View style={styles.noteHeader}>
                            <View style={styles.noteIcon}>
                                <Ionicons name="document-text" size={24} color="#059669" />
                            </View>
                            <View style={styles.noteInfo}>
                                <Text style={[styles.noteTitle, { fontSize: isSmallScreen ? 16 : 18 }]}>
                                    {note.title}
                                </Text>
                                <Text style={[styles.noteHeading, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                    {note.heading}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.noteMeta}>
                            <View style={styles.metaItem}>
                                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                                <Text style={[styles.metaText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                    {new Date(note.upload_date).toLocaleDateString()}
                                </Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="document-outline" size={16} color="#6B7280" />
                                <Text style={[styles.metaText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                    {note.file_size}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.downloadButton}
                            onPress={() => handleOpenFile(note.file_url)}
                        >
                            <Ionicons name="download-outline" size={20} color="#fff" />
                            <Text style={[styles.downloadButtonText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                Download PDF
                            </Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        );
    };

    const renderUpdateContent = () => {
        return (
            <View style={styles.updateContent}>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddModal(true)}
                >
                    <Ionicons name="add-circle-outline" size={24} color="#fff" />
                    <Text style={[styles.addButtonText, { fontSize: isSmallScreen ? 16 : 18 }]}>
                        Add New Note
                    </Text>
                </TouchableOpacity>

                {notes.length > 0 && (
                    <View style={styles.manageSection}>
                        <Text style={[styles.sectionTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                            Manage Notes
                        </Text>
                        {notes.map((note) => (
                            <View key={note.id} style={styles.manageCard}>
                                <View style={styles.manageInfo}>
                                    <Text style={[styles.manageTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                        {note.title}
                                    </Text>
                                    <Text style={[styles.manageHeading, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                        {note.heading}
                                    </Text>
                                    <Text style={[styles.manageDate, { fontSize: isSmallScreen ? 10 : 12 }]}>
                                        {new Date(note.upload_date).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={styles.manageActions}>
                                    <TouchableOpacity
                                        style={styles.editButton}
                                        onPress={() => setEditingNote({ ...note })}
                                    >
                                        <Ionicons name="pencil" size={16} color="#2563EB" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDeleteNote(note)}
                                    >
                                        <Ionicons name="trash" size={16} color="#DC2626" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={[styles.headerTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                            Notes
                        </Text>
                        <Text style={[styles.headerSubtitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                            {courseName}
                        </Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'view' && styles.activeTab]}
                        onPress={() => setActiveTab('view')}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === 'view' && styles.activeTabText,
                            { fontSize: isSmallScreen ? 14 : 16 }
                        ]}>
                            View Notes
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'update' && styles.activeTab]}
                        onPress={() => setActiveTab('update')}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === 'update' && styles.activeTabText,
                            { fontSize: isSmallScreen ? 14 : 16 }
                        ]}>
                            Manage Notes
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {activeTab === 'view' ? (
                        <View style={styles.viewContent}>
                            {renderViewContent()}
                        </View>
                    ) : (
                        renderUpdateContent()
                    )}
                </ScrollView>

                {/* Add/Edit Modal */}
                <Modal
                    visible={showAddModal || editingNote !== null}
                    animationType="slide"
                    transparent
                    onRequestClose={() => {
                        setShowAddModal(false);
                        setEditingNote(null);
                        setNewNote({ title: '', heading: '', selectedFile: null });
                    }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { width: isSmallScreen ? '100%' : '80%' }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { fontSize: isSmallScreen ? 16 : 18 }]}>
                                    {editingNote ? 'Edit Note' : 'Add New Note'}
                                </Text>
                                <TouchableOpacity
                                    style={styles.modalCloseButton}
                                    onPress={() => {
                                        setShowAddModal(false);
                                        setEditingNote(null);
                                        setNewNote({ title: '', heading: '', selectedFile: null });
                                    }}
                                >
                                    <Ionicons name="close" size={20} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                        Title *
                                    </Text>
                                    <TextInput
                                        style={[styles.textInput, { fontSize: isSmallScreen ? 14 : 16 }]}
                                        value={editingNote ? editingNote.title : newNote.title}
                                        onChangeText={(text) => {
                                            if (editingNote) {
                                                setEditingNote(prev => prev ? { ...prev, title: text } : null);
                                            } else {
                                                setNewNote(prev => ({ ...prev, title: text }));
                                            }
                                        }}
                                        placeholder="Enter note title"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                        Heading *
                                    </Text>
                                    <TextInput
                                        style={[styles.textInput, { fontSize: isSmallScreen ? 14 : 16 }]}
                                        value={editingNote ? editingNote.heading : newNote.heading}
                                        onChangeText={(text) => {
                                            if (editingNote) {
                                                setEditingNote(prev => prev ? { ...prev, heading: text } : null);
                                            } else {
                                                setNewNote(prev => ({ ...prev, heading: text }));
                                            }
                                        }}
                                        placeholder="Enter note heading/description"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>

                                {!editingNote && (
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                            PDF File *
                                        </Text>
                                        <TouchableOpacity
                                            style={[styles.filePickerButton, newNote.selectedFile && styles.fileSelectedButton]}
                                            onPress={pickDocument}
                                        >
                                            <Ionicons
                                                name={newNote.selectedFile ? "document" : "document-attach-outline"}
                                                size={20}
                                                color={newNote.selectedFile ? "#10B981" : "#6B7280"}
                                            />
                                            <Text style={[
                                                styles.filePickerText,
                                                newNote.selectedFile && styles.fileSelectedText,
                                                { fontSize: isSmallScreen ? 14 : 16 }
                                            ]}>
                                                {newNote.selectedFile ? newNote.selectedFile.name : 'Select PDF File'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        setShowAddModal(false);
                                        setEditingNote(null);
                                        setNewNote({ title: '', heading: '', selectedFile: null });
                                    }}
                                >
                                    <Text style={[styles.cancelButtonText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.saveButton,
                                        (updating || uploading) && styles.disabledButton
                                    ]}
                                    onPress={editingNote ? handleEditNote : handleAddNote}
                                    disabled={updating || uploading}
                                >
                                    {(updating || uploading) ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={[styles.saveButtonText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                            {editingNote ? 'Update' : 'Add Note'}
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

const styles = {
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        backgroundColor: '#2E4064',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        marginRight: 16,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        color: '#fff',
        fontWeight: 'bold' as const,
    },
    headerSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row' as const,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center' as const,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#2E4064',
    },
    tabText: {
        color: '#6B7280',
        fontWeight: '500' as const,
    },
    activeTabText: {
        color: '#2E4064',
        fontWeight: 'bold' as const,
    },
    content: {
        flex: 1,
    },
    viewContent: {
        padding: 20,
    },
    updateContent: {
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 16,
        color: '#6B7280',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        paddingVertical: 60,
    },
    emptyTitle: {
        fontWeight: 'bold' as const,
        color: '#374151',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDescription: {
        color: '#6B7280',
        textAlign: 'center' as const,
        paddingHorizontal: 20,
    },
    notesList: {
        gap: 16,
    },
    noteCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    noteHeader: {
        flexDirection: 'row' as const,
        marginBottom: 16,
    },
    noteIcon: {
        width: 48,
        height: 48,
        backgroundColor: '#E8F5E8',
        borderRadius: 24,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        marginRight: 16,
    },
    noteInfo: {
        flex: 1,
    },
    noteTitle: {
        fontWeight: 'bold' as const,
        color: '#374151',
        marginBottom: 4,
    },
    noteHeading: {
        color: '#6B7280',
        lineHeight: 20,
    },
    noteMeta: {
        flexDirection: 'row' as const,
        marginBottom: 16,
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 4,
    },
    metaText: {
        color: '#6B7280',
    },
    downloadButton: {
        backgroundColor: '#2E4064',
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    downloadButtonText: {
        color: '#fff',
        fontWeight: '600' as const,
    },
    addButton: {
        backgroundColor: '#2E4064',
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 24,
        gap: 12,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold' as const,
    },
    manageSection: {
        gap: 12,
    },
    sectionTitle: {
        fontWeight: 'bold' as const,
        color: '#374151',
        marginBottom: 16,
    },
    manageCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    manageInfo: {
        flex: 1,
    },
    manageTitle: {
        fontWeight: '600' as const,
        color: '#374151',
        marginBottom: 4,
    },
    manageHeading: {
        color: '#059669',
        fontWeight: '500' as const,
        marginBottom: 4,
    },
    manageDate: {
        color: '#6B7280',
    },
    manageActions: {
        flexDirection: 'row' as const,
        gap: 12,
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        maxHeight: '80%' as const,
    },
    modalHeader: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontWeight: 'bold' as const,
        color: '#374151',
    },
    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
    },
    modalBody: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontWeight: '600' as const,
        color: '#374151',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    filePickerButton: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
    },
    fileSelectedButton: {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4',
    },
    filePickerText: {
        color: '#6B7280',
        flex: 1,
    },
    fileSelectedText: {
        color: '#059669',
        fontWeight: '500' as const,
    },
    modalActions: {
        flexDirection: 'row' as const,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        alignItems: 'center' as const,
    },
    cancelButtonText: {
        color: '#6B7280',
        fontWeight: '600' as const,
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#2E4064',
        alignItems: 'center' as const,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600' as const,
    },
    disabledButton: {
        opacity: 0.5,
    },
};

export default NotesPage;
