import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
    description: string;
    file_url: string;
    file_size: string;
    upload_date: string;
    course_id: string;
}

const EbooksPage = () => {
    const { courseId, courseName } = useLocalSearchParams<{ courseId: string; courseName: string }>();
    const [screenData, setScreenData] = useState(Dimensions.get("window"));
    const [activeTab, setActiveTab] = useState<'view' | 'update'>('view');
    const [ebooks, setEbooks] = useState<Ebook[]>([]);
    const [loading, setLoading] = useState(true);

    // Update states
    const [updating, setUpdating] = useState(false);
    const [newEbook, setNewEbook] = useState({
        title: '',
        description: '',
        file_url: '',
        file_size: ''
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
                .from('course_ebooks')
                .select('*')
                .eq('course_id', courseId)
                .order('upload_date', { ascending: false });

            if (error) throw error;
            setEbooks(data || []);
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

    const handleAddEbook = async () => {
        if (!newEbook.title.trim() || !newEbook.file_url.trim()) {
            Alert.alert('Error', 'Please fill in title and file URL');
            return;
        }

        try {
            setUpdating(true);
            const { error } = await supabase
                .from('course_ebooks')
                .insert({
                    course_id: courseId,
                    title: newEbook.title.trim(),
                    description: newEbook.description.trim(),
                    file_url: newEbook.file_url.trim(),
                    file_size: newEbook.file_size.trim() || 'Unknown',
                    upload_date: new Date().toISOString()
                });

            if (error) throw error;

            Alert.alert('Success', 'eBook added successfully!');
            setNewEbook({ title: '', description: '', file_url: '', file_size: '' });
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
        if (!editingEbook || !editingEbook.title.trim() || !editingEbook.file_url.trim()) {
            Alert.alert('Error', 'Please fill in title and file URL');
            return;
        }

        try {
            setUpdating(true);
            const { error } = await supabase
                .from('course_ebooks')
                .update({
                    title: editingEbook.title.trim(),
                    description: editingEbook.description.trim(),
                    file_url: editingEbook.file_url.trim(),
                    file_size: editingEbook.file_size.trim() || 'Unknown'
                })
                .eq('id', editingEbook.id);

            if (error) throw error;

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
                            const { error } = await supabase
                                .from('course_ebooks')
                                .delete()
                                .eq('id', ebook.id);

                            if (error) throw error;
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

    const handleOpenFile = (url: string) => {
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Unable to open file');
        });
    };

    const isSmallScreen = screenData.width < 600;

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
                        <Text style={[styles.headerSubtitle, { fontSize: isSmallScreen ? 12 : 14 }]}>
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
                            View eBooks ({ebooks.length})
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
                        // View Tab Content
                        <View style={styles.viewContent}>
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#2E4064" />
                                    <Text style={styles.loadingText}>Loading eBooks...</Text>
                                </View>
                            ) : ebooks.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="book-outline" size={80} color="#9CA3AF" />
                                    <Text style={[styles.emptyTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                                        No eBooks Available
                                    </Text>
                                    <Text style={[styles.emptyDescription, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                        eBooks will appear here once they are uploaded
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.ebooksList}>
                                    {ebooks.map((ebook, index) => (
                                        <View key={ebook.id} style={styles.ebookCard}>
                                            <View style={styles.ebookHeader}>
                                                <View style={styles.ebookIcon}>
                                                    <Ionicons name="book" size={24} color="#1976D2" />
                                                </View>
                                                <View style={styles.ebookInfo}>
                                                    <Text style={[styles.ebookTitle, { fontSize: isSmallScreen ? 16 : 18 }]}>
                                                        {ebook.title}
                                                    </Text>
                                                    {ebook.description && (
                                                        <Text style={[styles.ebookDescription, { fontSize: isSmallScreen ? 14 : 15 }]}>
                                                            {ebook.description}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>

                                            <View style={styles.ebookMeta}>
                                                <View style={styles.metaItem}>
                                                    <Ionicons name="download-outline" size={16} color="#6B7280" />
                                                    <Text style={[styles.metaText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                                        {ebook.file_size}
                                                    </Text>
                                                </View>
                                                <View style={styles.metaItem}>
                                                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                                                    <Text style={[styles.metaText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                                        {new Date(ebook.upload_date).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                            </View>

                                            <TouchableOpacity
                                                style={styles.downloadButton}
                                                onPress={() => handleOpenFile(ebook.file_url)}
                                            >
                                                <Ionicons name="download" size={16} color="#fff" />
                                                <Text style={[styles.downloadButtonText, { fontSize: isSmallScreen ? 14 : 15 }]}>
                                                    Download
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ) : (
                        // Update Tab Content
                        <View style={styles.updateContent}>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => setShowAddModal(true)}
                            >
                                <Ionicons name="add-circle" size={24} color="#fff" />
                                <Text style={[styles.addButtonText, { fontSize: isSmallScreen ? 16 : 18 }]}>
                                    Add New eBook
                                </Text>
                            </TouchableOpacity>

                            {ebooks.length > 0 && (
                                <View style={styles.manageSection}>
                                    <Text style={[styles.sectionTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                                        Manage Existing eBooks
                                    </Text>
                                    {ebooks.map((ebook) => (
                                        <View key={ebook.id} style={styles.manageCard}>
                                            <View style={styles.manageInfo}>
                                                <Text style={[styles.manageTitle, { fontSize: isSmallScreen ? 16 : 18 }]}>
                                                    {ebook.title}
                                                </Text>
                                                <Text style={[styles.manageDate, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                                    Uploaded: {new Date(ebook.upload_date).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <View style={styles.manageActions}>
                                                <TouchableOpacity
                                                    style={styles.editButton}
                                                    onPress={() => setEditingEbook(ebook)}
                                                >
                                                    <Ionicons name="pencil" size={16} color="#3B82F6" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.deleteButton}
                                                    onPress={() => handleDeleteEbook(ebook)}
                                                >
                                                    <Ionicons name="trash" size={16} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
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
                    }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { maxWidth: isSmallScreen ? screenData.width - 40 : 500 }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                                    {editingEbook ? 'Edit eBook' : 'Add New eBook'}
                                </Text>
                                <TouchableOpacity
                                    style={styles.modalCloseButton}
                                    onPress={() => {
                                        setShowAddModal(false);
                                        setEditingEbook(null);
                                    }}
                                >
                                    <Ionicons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Title *</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter eBook title"
                                        value={editingEbook ? editingEbook.title : newEbook.title}
                                        onChangeText={(text) => {
                                            if (editingEbook) {
                                                setEditingEbook({ ...editingEbook, title: text });
                                            } else {
                                                setNewEbook({ ...newEbook, title: text });
                                            }
                                        }}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Description</Text>
                                    <TextInput
                                        style={[styles.textInput, styles.textArea]}
                                        placeholder="Enter eBook description"
                                        multiline
                                        numberOfLines={4}
                                        value={editingEbook ? editingEbook.description : newEbook.description}
                                        onChangeText={(text) => {
                                            if (editingEbook) {
                                                setEditingEbook({ ...editingEbook, description: text });
                                            } else {
                                                setNewEbook({ ...newEbook, description: text });
                                            }
                                        }}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>File URL *</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter file download URL"
                                        value={editingEbook ? editingEbook.file_url : newEbook.file_url}
                                        onChangeText={(text) => {
                                            if (editingEbook) {
                                                setEditingEbook({ ...editingEbook, file_url: text });
                                            } else {
                                                setNewEbook({ ...newEbook, file_url: text });
                                            }
                                        }}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>File Size</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="e.g., 2.5 MB"
                                        value={editingEbook ? editingEbook.file_size : newEbook.file_size}
                                        onChangeText={(text) => {
                                            if (editingEbook) {
                                                setEditingEbook({ ...editingEbook, file_size: text });
                                            } else {
                                                setNewEbook({ ...newEbook, file_size: text });
                                            }
                                        }}
                                    />
                                </View>
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        setShowAddModal(false);
                                        setEditingEbook(null);
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveButton, updating && styles.disabledButton]}
                                    onPress={editingEbook ? handleEditEbook : handleAddEbook}
                                    disabled={updating}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {updating ? 'Saving...' : editingEbook ? 'Update' : 'Add'}
                                    </Text>
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
        fontSize: 16,
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
    ebooksList: {
        gap: 16,
    },
    ebookCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    ebookHeader: {
        flexDirection: 'row' as const,
        marginBottom: 16,
    },
    ebookIcon: {
        width: 48,
        height: 48,
        backgroundColor: '#E3F2FD',
        borderRadius: 24,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        marginRight: 16,
    },
    ebookInfo: {
        flex: 1,
    },
    ebookTitle: {
        fontWeight: 'bold' as const,
        color: '#374151',
        marginBottom: 4,
    },
    ebookDescription: {
        color: '#6B7280',
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
        width: '100%' as const,
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
        fontSize: 16,
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
        fontSize: 16,
        backgroundColor: '#fff',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top' as const,
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
        fontSize: 16,
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
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.5,
    },
};

export default EbooksPage;
