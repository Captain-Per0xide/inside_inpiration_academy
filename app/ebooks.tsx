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

interface Ebook {
    id: string;
    title: string;
    author: string;
    file_url: string;
    file_size: string;
    upload_date: string;
}

const EbooksPage = () => {
    const { courseId, courseName } = useLocalSearchParams<{ courseId: string; courseName: string }>();
    const [screenData, setScreenData] = useState(Dimensions.get("window"));
    const [activeTab, setActiveTab] = useState<'view' | 'update'>('view');
    const [ebooks, setEbooks] = useState<Ebook[]>([]);
    const [loading, setLoading] = useState(true);

    // Update states
    const [updating, setUpdating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newEbook, setNewEbook] = useState({
        title: '',
        author: '',
        selectedFile: null as any
    });

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingEbook, setEditingEbook] = useState<Ebook | null>(null);

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setScreenData(window);
        });
        return () => subscription?.remove();
    }, []);

    const fetchEbooks = useCallback(async () => {
        if (!courseId) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('courses')
                .select('eBooks')
                .eq('id', courseId)
                .single();

            if (error) throw error;

            const ebooksData = data?.eBooks || [];
            setEbooks(ebooksData);
        } catch (error) {
            console.error('Error fetching ebooks:', error);
            Alert.alert('Error', 'Failed to load ebooks');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchEbooks();
    }, [fetchEbooks]);

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
                setNewEbook(prev => ({
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
            const filePath = `Course-data/${courseId}/Ebooks/${fileName}.${fileExt}`;

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', {
                uri: file.uri,
                type: 'application/pdf',
                name: `${fileName}.${fileExt}`
            } as any);

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
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

    const handleAddEbook = async () => {
        if (!newEbook.title.trim() || !newEbook.author.trim() || !newEbook.selectedFile) {
            Alert.alert('Error', 'Please fill in all fields and select a PDF file');
            return;
        }

        try {
            setUpdating(true);

            // Upload file to storage
            const fileUrl = await uploadFile(newEbook.selectedFile, newEbook.title);

            // Create new ebook object
            const newEbookData = {
                id: Date.now().toString(),
                title: newEbook.title.trim(),
                author: newEbook.author.trim(),
                file_url: fileUrl,
                file_size: formatFileSize(newEbook.selectedFile.size || 0),
                upload_date: new Date().toISOString()
            };

            // Get current ebooks
            const { data: currentData, error: fetchError } = await supabase
                .from('courses')
                .select('eBooks')
                .eq('id', courseId)
                .single();

            if (fetchError) throw fetchError;

            const currentEbooks = currentData?.eBooks || [];
            const updatedEbooks = [...currentEbooks, newEbookData];

            // Update courses table
            const { error: updateError } = await supabase
                .from('courses')
                .update({ eBooks: updatedEbooks })
                .eq('id', courseId);

            if (updateError) throw updateError;

            Alert.alert('Success', 'eBook added successfully!');
            setNewEbook({ title: '', author: '', selectedFile: null });
            setShowAddModal(false);
            fetchEbooks();
        } catch (error) {
            console.error('Error adding ebook:', error);
            Alert.alert('Error', 'Failed to add ebook');
        } finally {
            setUpdating(false);
        }
    };

    const handleEditEbook = async () => {
        if (!editingEbook || !editingEbook.title.trim() || !editingEbook.author.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            setUpdating(true);

            // Get current ebooks
            const { data: currentData, error: fetchError } = await supabase
                .from('courses')
                .select('eBooks')
                .eq('id', courseId)
                .single();

            if (fetchError) throw fetchError;

            const currentEbooks = currentData?.eBooks || [];
            const updatedEbooks = currentEbooks.map((ebook: Ebook) =>
                ebook.id === editingEbook.id ? editingEbook : ebook
            );

            // Update courses table
            const { error: updateError } = await supabase
                .from('courses')
                .update({ eBooks: updatedEbooks })
                .eq('id', courseId);

            if (updateError) throw updateError;

            Alert.alert('Success', 'eBook updated successfully!');
            setEditingEbook(null);
            fetchEbooks();
        } catch (error) {
            console.error('Error updating ebook:', error);
            Alert.alert('Error', 'Failed to update ebook');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteEbook = (ebook: Ebook) => {
        Alert.alert(
            'Delete eBook',
            `Are you sure you want to delete "${ebook.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Get current ebooks
                            const { data: currentData, error: fetchError } = await supabase
                                .from('courses')
                                .select('eBooks')
                                .eq('id', courseId)
                                .single();

                            if (fetchError) throw fetchError;

                            const currentEbooks = currentData?.eBooks || [];
                            const updatedEbooks = currentEbooks.filter((e: Ebook) => e.id !== ebook.id);

                            // Update courses table
                            const { error: updateError } = await supabase
                                .from('courses')
                                .update({ eBooks: updatedEbooks })
                                .eq('id', courseId);

                            if (updateError) throw updateError;

                            fetchEbooks();
                        } catch (error) {
                            console.error('Error deleting ebook:', error);
                            Alert.alert('Error', 'Failed to delete ebook');
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
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={[styles.loadingText, { fontSize: isSmallScreen ? 16 : 18 }]}>
                        Loading eBooks...
                    </Text>
                </View>
            );
        }

        if (ebooks.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="book-outline" size={64} color="#D1D5DB" />
                    <Text style={[styles.emptyTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                        No eBooks Available
                    </Text>
                    <Text style={[styles.emptyDescription, { fontSize: isSmallScreen ? 14 : 16 }]}>
                        There are no eBooks uploaded for this course yet. Check back later or contact your instructor.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.ebooksList}>
                {ebooks.map((ebook) => (
                    <View key={ebook.id} style={styles.ebookCard}>
                        <View style={styles.ebookHeader}>
                            <View style={styles.ebookIcon}>
                                <Ionicons name="book" size={24} color="#1976D2" />
                            </View>
                            <View style={styles.ebookInfo}>
                                <Text style={[styles.ebookTitle, { fontSize: isSmallScreen ? 16 : 18 }]}>
                                    {ebook.title}
                                </Text>
                                <Text style={[styles.ebookAuthor, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                    By {ebook.author}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.ebookMeta}>
                            <View style={styles.metaItem}>
                                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                                <Text style={[styles.metaText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                    {new Date(ebook.upload_date).toLocaleDateString()}
                                </Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="document-outline" size={16} color="#6B7280" />
                                <Text style={[styles.metaText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                    {ebook.file_size}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.downloadButton}
                            onPress={() => handleOpenFile(ebook.file_url)}
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
                        Add New eBook
                    </Text>
                </TouchableOpacity>

                {ebooks.length > 0 && (
                    <View style={styles.manageSection}>
                        <Text style={[styles.sectionTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                            Manage eBooks
                        </Text>
                        {ebooks.map((ebook) => (
                            <View key={ebook.id} style={styles.manageCard}>
                                <View style={styles.manageInfo}>
                                    <Text style={[styles.manageTitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                        {ebook.title}
                                    </Text>
                                    <Text style={[styles.manageAuthor, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                        By {ebook.author}
                                    </Text>
                                    <Text style={[styles.manageDate, { fontSize: isSmallScreen ? 10 : 12 }]}>
                                        {new Date(ebook.upload_date).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={styles.manageActions}>
                                    <TouchableOpacity
                                        style={styles.editButton}
                                        onPress={() => setEditingEbook({ ...ebook })}
                                    >
                                        <Ionicons name="pencil" size={16} color="#2563EB" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDeleteEbook(ebook)}
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
                            eBooks
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
                            View eBooks
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
                            Manage eBooks
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
                    visible={showAddModal || editingEbook !== null}
                    animationType="slide"
                    transparent
                    onRequestClose={() => {
                        setShowAddModal(false);
                        setEditingEbook(null);
                        setNewEbook({ title: '', author: '', selectedFile: null });
                    }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { width: isSmallScreen ? '100%' : '80%' }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { fontSize: isSmallScreen ? 16 : 18 }]}>
                                    {editingEbook ? 'Edit eBook' : 'Add New eBook'}
                                </Text>
                                <TouchableOpacity
                                    style={styles.modalCloseButton}
                                    onPress={() => {
                                        setShowAddModal(false);
                                        setEditingEbook(null);
                                        setNewEbook({ title: '', author: '', selectedFile: null });
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
                                        value={editingEbook ? editingEbook.title : newEbook.title}
                                        onChangeText={(text) => {
                                            if (editingEbook) {
                                                setEditingEbook(prev => prev ? { ...prev, title: text } : null);
                                            } else {
                                                setNewEbook(prev => ({ ...prev, title: text }));
                                            }
                                        }}
                                        placeholder="Enter eBook title"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                        Author *
                                    </Text>
                                    <TextInput
                                        style={[styles.textInput, { fontSize: isSmallScreen ? 14 : 16 }]}
                                        value={editingEbook ? editingEbook.author : newEbook.author}
                                        onChangeText={(text) => {
                                            if (editingEbook) {
                                                setEditingEbook(prev => prev ? { ...prev, author: text } : null);
                                            } else {
                                                setNewEbook(prev => ({ ...prev, author: text }));
                                            }
                                        }}
                                        placeholder="Enter author name"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>

                                {!editingEbook && (
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                            PDF File *
                                        </Text>
                                        <TouchableOpacity
                                            style={[styles.filePickerButton, newEbook.selectedFile && styles.fileSelectedButton]}
                                            onPress={pickDocument}
                                        >
                                            <Ionicons
                                                name={newEbook.selectedFile ? "document" : "document-attach-outline"}
                                                size={20}
                                                color={newEbook.selectedFile ? "#10B981" : "#6B7280"}
                                            />
                                            <Text style={[
                                                styles.filePickerText,
                                                newEbook.selectedFile && styles.fileSelectedText,
                                                { fontSize: isSmallScreen ? 14 : 16 }
                                            ]}>
                                                {newEbook.selectedFile ? newEbook.selectedFile.name : 'Select PDF File'}
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
                                        setEditingEbook(null);
                                        setNewEbook({ title: '', author: '', selectedFile: null });
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
                                    onPress={editingEbook ? handleEditEbook : handleAddEbook}
                                    disabled={updating || uploading}
                                >
                                    {(updating || uploading) ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={[styles.saveButtonText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                            {editingEbook ? 'Update' : 'Add eBook'}
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
        backgroundColor: '#0F172A',
    },
    header: {
        backgroundColor: '#1E293B',
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
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        marginRight: 16,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        color: '#F8FAFC',
        fontWeight: 'bold' as const,
    },
    headerSubtitle: {
        color: 'rgba(248, 250, 252, 0.7)',
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row' as const,
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center' as const,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#3B82F6',
    },
    tabText: {
        color: '#94A3B8',
        fontWeight: '500' as const,
    },
    activeTabText: {
        color: '#3B82F6',
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
        color: '#94A3B8',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        paddingVertical: 60,
    },
    emptyTitle: {
        fontWeight: 'bold' as const,
        color: '#F8FAFC',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDescription: {
        color: '#94A3B8',
        textAlign: 'center' as const,
        paddingHorizontal: 20,
    },
    ebooksList: {
        gap: 16,
    },
    ebookCard: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#334155',
    },
    ebookHeader: {
        flexDirection: 'row' as const,
        marginBottom: 16,
    },
    ebookIcon: {
        width: 48,
        height: 48,
        backgroundColor: '#0F172A',
        borderRadius: 24,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#3B82F6',
    },
    ebookInfo: {
        flex: 1,
    },
    ebookTitle: {
        fontWeight: 'bold' as const,
        color: '#F8FAFC',
        marginBottom: 4,
    },
    ebookAuthor: {
        color: '#94A3B8',
        lineHeight: 20,
    },
    ebookMeta: {
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
        color: '#94A3B8',
    },
    downloadButton: {
        backgroundColor: '#3B82F6',
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
        backgroundColor: '#3B82F6',
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
        color: '#F8FAFC',
        marginBottom: 16,
    },
    manageCard: {
        backgroundColor: '#1E293B',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#334155',
    },
    manageInfo: {
        flex: 1,
    },
    manageTitle: {
        fontWeight: '600' as const,
        color: '#F8FAFC',
        marginBottom: 4,
    },
    manageAuthor: {
        color: '#8B5CF6',
        fontWeight: '500' as const,
        marginBottom: 4,
    },
    manageDate: {
        color: '#94A3B8',
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        maxHeight: '80%' as const,
        borderWidth: 1,
        borderColor: '#334155',
    },
    modalHeader: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    modalTitle: {
        fontWeight: 'bold' as const,
        color: '#F8FAFC',
    },
    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#374151',
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
        color: '#F8FAFC',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#475569',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
    },
    filePickerButton: {
        borderWidth: 1,
        borderColor: '#475569',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#0F172A',
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
    },
    fileSelectedButton: {
        borderColor: '#10B981',
        backgroundColor: '#064E3B',
    },
    filePickerText: {
        color: '#94A3B8',
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
        borderTopColor: '#334155',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#475569',
        alignItems: 'center' as const,
        backgroundColor: '#374151',
    },
    cancelButtonText: {
        color: '#94A3B8',
        fontWeight: '600' as const,
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#3B82F6',
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

export default EbooksPage;
