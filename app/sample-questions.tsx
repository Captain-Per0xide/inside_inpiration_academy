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

interface SampleQuestion {
    id: string;
    title: string;
    description: string;
    file_url: string;
    file_size: string;
    upload_date: string;
    course_id: string;
    question_type: string; // 'practice' | 'mock_test' | 'chapter_wise'
}

const SampleQuestionsPage = () => {
    const { courseId, courseName } = useLocalSearchParams<{ courseId: string; courseName: string }>();
    const [screenData, setScreenData] = useState(Dimensions.get("window"));
    const [activeTab, setActiveTab] = useState<'view' | 'update'>('view');
    const [questions, setQuestions] = useState<SampleQuestion[]>([]);
    const [loading, setLoading] = useState(true);

    // Update states
    const [updating, setUpdating] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        title: '',
        description: '',
        file_url: '',
        file_size: '',
        question_type: 'practice'
    });

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<SampleQuestion | null>(null);

    const questionTypes = [
        { value: 'practice', label: 'Practice Questions' },
        { value: 'mock_test', label: 'Mock Test' },
        { value: 'chapter_wise', label: 'Chapter-wise Questions' }
    ];

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setScreenData(window);
        });
        return () => subscription?.remove();
    }, []);

    const fetchQuestions = useCallback(async () => {
        if (!courseId) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('course_sample_questions')
                .select('*')
                .eq('course_id', courseId)
                .order('upload_date', { ascending: false });

            if (error) throw error;
            setQuestions(data || []);
        } catch (error) {
            console.error('Error fetching sample questions:', error);
            Alert.alert('Error', 'Failed to load sample questions');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    const handleBack = () => {
        router.back();
    };

    const handleAddQuestion = async () => {
        if (!newQuestion.title.trim() || !newQuestion.file_url.trim()) {
            Alert.alert('Error', 'Please fill in title and file URL');
            return;
        }

        try {
            setUpdating(true);
            const { error } = await supabase
                .from('course_sample_questions')
                .insert({
                    course_id: courseId,
                    title: newQuestion.title.trim(),
                    description: newQuestion.description.trim(),
                    file_url: newQuestion.file_url.trim(),
                    file_size: newQuestion.file_size.trim() || 'Unknown',
                    question_type: newQuestion.question_type,
                    upload_date: new Date().toISOString()
                });

            if (error) throw error;

            Alert.alert('Success', 'Sample question added successfully!');
            setNewQuestion({ title: '', description: '', file_url: '', file_size: '', question_type: 'practice' });
            setShowAddModal(false);
            fetchQuestions();
        } catch (error) {
            console.error('Error adding sample question:', error);
            Alert.alert('Error', 'Failed to add sample question');
        } finally {
            setUpdating(false);
        }
    };

    const handleEditQuestion = async () => {
        if (!editingQuestion || !editingQuestion.title.trim() || !editingQuestion.file_url.trim()) {
            Alert.alert('Error', 'Please fill in title and file URL');
            return;
        }

        try {
            setUpdating(true);
            const { error } = await supabase
                .from('course_sample_questions')
                .update({
                    title: editingQuestion.title.trim(),
                    description: editingQuestion.description.trim(),
                    file_url: editingQuestion.file_url.trim(),
                    file_size: editingQuestion.file_size.trim() || 'Unknown',
                    question_type: editingQuestion.question_type
                })
                .eq('id', editingQuestion.id);

            if (error) throw error;

            Alert.alert('Success', 'Sample question updated successfully!');
            setEditingQuestion(null);
            fetchQuestions();
        } catch (error) {
            console.error('Error updating sample question:', error);
            Alert.alert('Error', 'Failed to update sample question');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteQuestion = (question: SampleQuestion) => {
        Alert.alert(
            'Delete Sample Question',
            `Are you sure you want to delete "${question.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('course_sample_questions')
                                .delete()
                                .eq('id', question.id);

                            if (error) throw error;
                            fetchQuestions();
                        } catch (error) {
                            console.error('Error deleting sample question:', error);
                            Alert.alert('Error', 'Failed to delete sample question');
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

    const getQuestionTypeIcon = (type: string) => {
        switch (type) {
            case 'practice': return 'help-circle';
            case 'mock_test': return 'time';
            case 'chapter_wise': return 'library';
            default: return 'help-circle';
        }
    };

    const getQuestionTypeColor = (type: string) => {
        switch (type) {
            case 'practice': return '#F59E0B';
            case 'mock_test': return '#EF4444';
            case 'chapter_wise': return '#8B5CF6';
            default: return '#F59E0B';
        }
    };

    const getQuestionTypeBg = (type: string) => {
        switch (type) {
            case 'practice': return '#FFF3E0';
            case 'mock_test': return '#FEF2F2';
            case 'chapter_wise': return '#F5F3FF';
            default: return '#FFF3E0';
        }
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
                            Sample Questions
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
                            View Questions ({questions.length})
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
                            Manage Questions
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
                                    <Text style={styles.loadingText}>Loading sample questions...</Text>
                                </View>
                            ) : questions.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="help-circle-outline" size={80} color="#9CA3AF" />
                                    <Text style={[styles.emptyTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                                        No Sample Questions Available
                                    </Text>
                                    <Text style={[styles.emptyDescription, { fontSize: isSmallScreen ? 14 : 16 }]}>
                                        Sample questions will appear here once they are uploaded
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.questionsList}>
                                    {questions.map((question) => (
                                        <View key={question.id} style={styles.questionCard}>
                                            <View style={styles.questionHeader}>
                                                <View style={[styles.questionIcon, { backgroundColor: getQuestionTypeBg(question.question_type) }]}>
                                                    <Ionicons
                                                        name={getQuestionTypeIcon(question.question_type) as any}
                                                        size={24}
                                                        color={getQuestionTypeColor(question.question_type)}
                                                    />
                                                </View>
                                                <View style={styles.questionInfo}>
                                                    <Text style={[styles.questionTitle, { fontSize: isSmallScreen ? 16 : 18 }]}>
                                                        {question.title}
                                                    </Text>
                                                    {question.description && (
                                                        <Text style={[styles.questionDescription, { fontSize: isSmallScreen ? 14 : 15 }]}>
                                                            {question.description}
                                                        </Text>
                                                    )}
                                                    <View style={[styles.typeBadge, { backgroundColor: getQuestionTypeBg(question.question_type) }]}>
                                                        <Text style={[styles.typeText, {
                                                            color: getQuestionTypeColor(question.question_type),
                                                            fontSize: isSmallScreen ? 12 : 13
                                                        }]}>
                                                            {questionTypes.find(t => t.value === question.question_type)?.label || question.question_type}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                            <View style={styles.questionMeta}>
                                                <View style={styles.metaItem}>
                                                    <Ionicons name="download-outline" size={16} color="#6B7280" />
                                                    <Text style={[styles.metaText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                                        {question.file_size}
                                                    </Text>
                                                </View>
                                                <View style={styles.metaItem}>
                                                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                                                    <Text style={[styles.metaText, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                                        {new Date(question.upload_date).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                            </View>

                                            <TouchableOpacity
                                                style={styles.downloadButton}
                                                onPress={() => handleOpenFile(question.file_url)}
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
                                    Add New Sample Question
                                </Text>
                            </TouchableOpacity>

                            {questions.length > 0 && (
                                <View style={styles.manageSection}>
                                    <Text style={[styles.sectionTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                                        Manage Existing Questions
                                    </Text>
                                    {questions.map((question) => (
                                        <View key={question.id} style={styles.manageCard}>
                                            <View style={styles.manageInfo}>
                                                <Text style={[styles.manageTitle, { fontSize: isSmallScreen ? 16 : 18 }]}>
                                                    {question.title}
                                                </Text>
                                                <Text style={[styles.manageType, { fontSize: isSmallScreen ? 11 : 12 }]}>
                                                    {questionTypes.find(t => t.value === question.question_type)?.label}
                                                </Text>
                                                <Text style={[styles.manageDate, { fontSize: isSmallScreen ? 12 : 14 }]}>
                                                    Uploaded: {new Date(question.upload_date).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <View style={styles.manageActions}>
                                                <TouchableOpacity
                                                    style={styles.editButton}
                                                    onPress={() => setEditingQuestion(question)}
                                                >
                                                    <Ionicons name="pencil" size={16} color="#3B82F6" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.deleteButton}
                                                    onPress={() => handleDeleteQuestion(question)}
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
                    visible={showAddModal || editingQuestion !== null}
                    animationType="slide"
                    transparent
                    onRequestClose={() => {
                        setShowAddModal(false);
                        setEditingQuestion(null);
                    }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { maxWidth: isSmallScreen ? screenData.width - 40 : 500 }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
                                    {editingQuestion ? 'Edit Sample Question' : 'Add New Sample Question'}
                                </Text>
                                <TouchableOpacity
                                    style={styles.modalCloseButton}
                                    onPress={() => {
                                        setShowAddModal(false);
                                        setEditingQuestion(null);
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
                                        placeholder="Enter question set title"
                                        value={editingQuestion ? editingQuestion.title : newQuestion.title}
                                        onChangeText={(text) => {
                                            if (editingQuestion) {
                                                setEditingQuestion({ ...editingQuestion, title: text });
                                            } else {
                                                setNewQuestion({ ...newQuestion, title: text });
                                            }
                                        }}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Question Type *</Text>
                                    <View style={styles.typeSelector}>
                                        {questionTypes.map((type) => (
                                            <TouchableOpacity
                                                key={type.value}
                                                style={[
                                                    styles.typeOption,
                                                    (editingQuestion ? editingQuestion.question_type : newQuestion.question_type) === type.value && styles.selectedTypeOption
                                                ]}
                                                onPress={() => {
                                                    if (editingQuestion) {
                                                        setEditingQuestion({ ...editingQuestion, question_type: type.value });
                                                    } else {
                                                        setNewQuestion({ ...newQuestion, question_type: type.value });
                                                    }
                                                }}
                                            >
                                                <Text style={[
                                                    styles.typeOptionText,
                                                    (editingQuestion ? editingQuestion.question_type : newQuestion.question_type) === type.value && styles.selectedTypeOptionText
                                                ]}>
                                                    {type.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Description</Text>
                                    <TextInput
                                        style={[styles.textInput, styles.textArea]}
                                        placeholder="Enter question set description"
                                        multiline
                                        numberOfLines={4}
                                        value={editingQuestion ? editingQuestion.description : newQuestion.description}
                                        onChangeText={(text) => {
                                            if (editingQuestion) {
                                                setEditingQuestion({ ...editingQuestion, description: text });
                                            } else {
                                                setNewQuestion({ ...newQuestion, description: text });
                                            }
                                        }}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>File URL *</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter file download URL"
                                        value={editingQuestion ? editingQuestion.file_url : newQuestion.file_url}
                                        onChangeText={(text) => {
                                            if (editingQuestion) {
                                                setEditingQuestion({ ...editingQuestion, file_url: text });
                                            } else {
                                                setNewQuestion({ ...newQuestion, file_url: text });
                                            }
                                        }}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>File Size</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="e.g., 800 KB"
                                        value={editingQuestion ? editingQuestion.file_size : newQuestion.file_size}
                                        onChangeText={(text) => {
                                            if (editingQuestion) {
                                                setEditingQuestion({ ...editingQuestion, file_size: text });
                                            } else {
                                                setNewQuestion({ ...newQuestion, file_size: text });
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
                                        setEditingQuestion(null);
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveButton, updating && styles.disabledButton]}
                                    onPress={editingQuestion ? handleEditQuestion : handleAddQuestion}
                                    disabled={updating}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {updating ? 'Saving...' : editingQuestion ? 'Update' : 'Add'}
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
    questionsList: {
        gap: 16,
    },
    questionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    questionHeader: {
        flexDirection: 'row' as const,
        marginBottom: 16,
    },
    questionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        marginRight: 16,
    },
    questionInfo: {
        flex: 1,
    },
    questionTitle: {
        fontWeight: 'bold' as const,
        color: '#374151',
        marginBottom: 4,
    },
    questionDescription: {
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 8,
    },
    typeBadge: {
        alignSelf: 'flex-start' as const,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    typeText: {
        fontWeight: '600' as const,
    },
    questionMeta: {
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
        marginBottom: 2,
    },
    manageType: {
        color: '#8B5CF6',
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
    typeSelector: {
        gap: 8,
    },
    typeOption: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    selectedTypeOption: {
        borderColor: '#2E4064',
        backgroundColor: '#F0F4FF',
    },
    typeOptionText: {
        fontSize: 16,
        color: '#6B7280',
    },
    selectedTypeOptionText: {
        color: '#2E4064',
        fontWeight: '600' as const,
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

export default SampleQuestionsPage;
