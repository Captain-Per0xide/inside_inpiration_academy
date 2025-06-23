import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import CodenameIcon from './icons/CodenameIcon';

interface ClassSchedule {
    day: string;
    startTime: string;
    endTime: string;
}

interface Instructor {
    id: string;
    name: string;
    avatar?: string;
}

interface CourseFormData {
    codename: string;
    fullName: string;
    courseType: 'Core Curriculum' | 'Elective';
    instructor: string;
    semester: string;
    courseDuration: string;
    feesMonthly: string;
    feesTotal: string;
    classSchedules: ClassSchedule[];
    imageUri?: string;
    codenameColor: string;
    fullNameColor: string;
}

interface AddCoursesModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit?: (courseData: CourseFormData) => void;
}

// Color Picker Component
interface ColorPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onColorSelect: (color: string) => void;
    initialColor: string;
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
    visible,
    onClose,
    onColorSelect,
    initialColor
}) => {
    const [selectedColor, setSelectedColor] = useState(initialColor);

    const presetColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85929E', '#D7BDE2'
    ];

    const handleColorConfirm = () => {
        onColorSelect(selectedColor);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={colorPickerStyles.modalOverlay}>
                <View style={colorPickerStyles.modalContent}>
                    <View style={colorPickerStyles.header}>
                        <Text style={colorPickerStyles.title}>Choose Color</Text>
                        <TouchableOpacity onPress={onClose} style={colorPickerStyles.closeButton}>
                            <Text style={colorPickerStyles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    >
                        <View style={colorPickerStyles.presetsContainer}>
                            <Text style={colorPickerStyles.sectionTitle}>Preset Colors</Text>
                            <View style={colorPickerStyles.presetColors}>
                                {presetColors.map((color, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            colorPickerStyles.presetColor,
                                            { backgroundColor: color },
                                            selectedColor === color && colorPickerStyles.selectedPreset
                                        ]}
                                        onPress={() => setSelectedColor(color)}
                                    >
                                        {selectedColor === color && (
                                            <Text style={{ color: 'white', fontSize: 20, textAlign: 'center' }}>✓</Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={colorPickerStyles.previewContainer}>
                            <Text style={colorPickerStyles.previewLabel}>Selected Color:</Text>
                            <View style={[colorPickerStyles.colorPreview, { backgroundColor: selectedColor }]} />
                            <Text style={colorPickerStyles.colorText}>{selectedColor}</Text>
                        </View>
                        <View style={colorPickerStyles.buttonContainer}>
                            <TouchableOpacity
                                style={[colorPickerStyles.button, colorPickerStyles.cancelButton]}
                                onPress={onClose}
                            >
                                <Text style={colorPickerStyles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[colorPickerStyles.button, colorPickerStyles.confirmButton]}
                                onPress={handleColorConfirm}
                            >
                                <Text style={colorPickerStyles.confirmButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const AddCoursesModal: React.FC<AddCoursesModalProps> = ({ visible, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<CourseFormData>({
        codename: '',
        fullName: '',
        courseType: 'Core Curriculum',
        instructor: 'Biswajit Saha',
        semester: '1st Semester',
        courseDuration: '',
        feesMonthly: '',
        feesTotal: '',
        classSchedules: [{
            day: 'Sunday',
            startTime: '19:30',
            endTime: '21:30',
        }],
        codenameColor: '#FF6B6B',
        fullNameColor: '#4ECDC4',
    });

    const [instructors] = useState<Instructor[]>([
        { id: '1', name: 'Biswajit Saha', avatar: '👨‍🏫' },
        { id: '2', name: 'Dr. John Smith', avatar: '👨‍💼' },
        { id: '3', name: 'Prof. Jane Doe', avatar: '👩‍🏫' },
    ]);
    
    const [showTimePicker, setShowTimePicker] = useState<{
        show: boolean;
        scheduleIndex: number;
        type: 'start' | 'end';
    }>({ show: false, scheduleIndex: -1, type: 'start' });

    const [colorPickerState, setColorPickerState] = useState<{
        visible: boolean;
        field: 'codenameColor' | 'fullNameColor' | null;
    }>({ visible: false, field: null });

    const handleInputChange = (field: keyof CourseFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const openColorPicker = (field: 'codenameColor' | 'fullNameColor') => {
        setColorPickerState({ visible: true, field });
    };

    const handleColorSelect = (color: string) => {
        if (colorPickerState.field) {
            setFormData(prev => ({ ...prev, [colorPickerState.field!]: color }));
        }
        setColorPickerState({ visible: false, field: null });
    };

    const handleImagePicker = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert('Permission required', 'Permission to access camera roll is required!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                setFormData(prev => ({ ...prev, imageUri: result.assets[0].uri }));
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const addSchedule = () => {
        const newSchedule: ClassSchedule = {
            day: 'Sunday',
            startTime: '19:30',
            endTime: '21:30',
        };
        setFormData(prev => ({
            ...prev,
            classSchedules: [...prev.classSchedules, newSchedule]
        }));
    };

    const updateSchedule = (index: number, field: keyof ClassSchedule, value: string) => {
        setFormData(prev => ({
            ...prev,
            classSchedules: prev.classSchedules.map((schedule, i) =>
                i === index ? { ...schedule, [field]: value } : schedule
            )
        }));
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker({ show: false, scheduleIndex: -1, type: 'start' });

        if (selectedDate && showTimePicker.scheduleIndex !== -1) {
            const timeString = selectedDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            updateSchedule(
                showTimePicker.scheduleIndex,
                showTimePicker.type === 'start' ? 'startTime' : 'endTime',
                timeString
            );
        }
    };

    const showTimePickerModal = (scheduleIndex: number, type: 'start' | 'end') => {
        setShowTimePicker({ show: true, scheduleIndex, type });
    };

    const validateForm = (): boolean => {
        if (!formData.codename.trim()) {
            Alert.alert('Error', 'Please enter course code name');
            return false;
        }
        if (!formData.fullName.trim()) {
            Alert.alert('Error', 'Please enter course full name');
            return false;
        }
        return true;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        if (onSubmit) {
            onSubmit(formData);
        }
        
        setFormData({
            codename: '',
            fullName: '',
            courseType: 'Core Curriculum',
            instructor: 'Biswajit Saha',
            semester: '1st Semester',
            courseDuration: '',
            feesMonthly: '',
            feesTotal: '',
            classSchedules: [{
                day: 'Sunday',
                startTime: '19:30',
                endTime: '21:30',
            }],
            codenameColor: '#FF6B6B',
            fullNameColor: '#4ECDC4',
        });

        Alert.alert('Success', 'Course added successfully!');
        onClose();
    };

    const handleCancel = () => {
        setFormData({
            codename: '',
            fullName: '',
            courseType: 'Core Curriculum',
            instructor: 'Biswajit Saha',
            semester: '1st Semester',
            courseDuration: '',
            feesMonthly: '',
            feesTotal: '',
            classSchedules: [{
                day: 'Sunday',
                startTime: '19:30',
                endTime: '21:30',
            }],
            codenameColor: '#FF6B6B',
            fullNameColor: '#4ECDC4',
        });
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleImagePicker} style={styles.imageContainer}>
                            {formData.imageUri ? (
                                <Image source={{ uri: formData.imageUri }} style={styles.courseImage} />
                            ) : (
                                <View style={styles.placeholderImage}>
                                    <Text style={styles.uploadIcon}>☁</Text>
                                    <Text style={styles.uploadText}>Upload Course Logo</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Add New Course</Text>
                    </View>
                    <ScrollView
                        style={styles.formContainer}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        <View style={styles.inputGroup}>
                            <View style={styles.inputRow}>
                                <CodenameIcon height={24} width={24} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter the codename of course"
                                    value={formData.codename}
                                    onChangeText={(text) => handleInputChange('codename', text)}
                                />
                                <TouchableOpacity
                                    style={[styles.colorPickerButton, { backgroundColor: formData.codenameColor }]}
                                    onPress={() => openColorPicker('codenameColor')}
                                >
                                    <Text style={styles.colorPickerIcon}>🎨</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <View style={styles.inputRow}>
                                <Image
                                    source={require('../assets/images/fullname.png')}
                                    style={styles.inputImage}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter the full name of course"
                                    value={formData.fullName}
                                    onChangeText={(text) => handleInputChange('fullName', text)}
                                />
                                <TouchableOpacity
                                    style={[styles.colorPickerButton, { backgroundColor: formData.fullNameColor }]}
                                    onPress={() => openColorPicker('fullNameColor')}
                                >
                                    <Text style={styles.colorPickerIcon}>🎨</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Course Type */}
                        <View style={styles.sectionGroup}>
                            <Text style={styles.sectionTitle}>Define the type of the course</Text>
                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    formData.courseType === 'Core Curriculum' && styles.selectedTypeButton
                                ]}
                                onPress={() => handleInputChange('courseType', 'Core Curriculum')}
                            >
                                <Text style={styles.typeIcon}>🎓</Text>
                                <Text style={[
                                    styles.typeText,
                                    formData.courseType === 'Core Curriculum' && styles.selectedTypeText
                                ]}>
                                    Core{'\n'}Curriculum
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Instructor */}
                        <View style={styles.sectionGroup}>
                            <Text style={styles.sectionTitle}>Who will be the Instructor of the course?</Text>
                            <TouchableOpacity style={styles.instructorButton}>
                                <Text style={styles.instructorAvatar}>👨‍🏫</Text>
                                <Text style={styles.instructorName}>{formData.instructor}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Semester */}
                        <View style={styles.sectionGroup}>
                            <Text style={styles.sectionTitle}>Allocate the course for</Text>
                            <TouchableOpacity style={styles.semesterButton}>
                                <Text style={styles.semesterText}>{formData.semester}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Class Schedule */}
                        <View style={styles.sectionGroup}>
                            <Text style={styles.scheduleTitle}>Class Schedule:</Text>

                            {formData.classSchedules.map((schedule, index) => (
                                <View key={index} style={styles.scheduleContainer}>
                                    <View style={styles.scheduleRow}>
                                        <View style={styles.dayContainer}>
                                            <Text style={styles.dayLabel}>Day:</Text>
                                            <TouchableOpacity style={styles.dayButton}>
                                                <Text style={styles.dayText}>{schedule.day}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.timeContainer}>
                                            <Text style={styles.timeLabel}>Starting Time:</Text>
                                            <TouchableOpacity
                                                style={styles.timeButton}
                                                onPress={() => showTimePickerModal(index, 'start')}
                                            >
                                                <Text style={styles.timeText}>{schedule.startTime}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.timeContainer}>
                                            <Text style={styles.timeLabel}>Ending Time:</Text>
                                            <TouchableOpacity
                                                style={styles.timeButton}
                                                onPress={() => showTimePickerModal(index, 'end')}
                                            >
                                                <Text style={styles.timeText}>{schedule.endTime}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))}

                            <TouchableOpacity onPress={addSchedule} style={styles.addScheduleButton}>
                                <Text style={styles.addScheduleText}>+</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {/* Time Picker Modal */}
                        {showTimePicker.show && (
                            <DateTimePicker
                                value={new Date()}
                                mode="time"
                                is24Hour={true}
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleTimeChange}
                            />
                        )}
                    </ScrollView>
                    <ColorPickerModal
                        visible={colorPickerState.visible}
                        onClose={() => setColorPickerState({ visible: false, field: null })}
                        onColorSelect={handleColorSelect}
                        initialColor={colorPickerState.field ? formData[colorPickerState.field] : '#FF6B6B'}
                    />
                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                        <Text style={styles.submitButtonText}>Submit</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxHeight: '95%',
        minHeight: 800,
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 10,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        color: '#333',
        fontWeight: 'bold',
    },
    header: {
        alignItems: 'center',
        paddingTop: 30,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    imageContainer: {
        marginBottom: 16,
    },
    courseImage: {
        width: 150,
        height: 150,
        borderRadius: 50,
    },
    placeholderImage: {
        width: 150,
        height: 150,
        borderRadius: 50,
        backgroundColor: '#e8e8e8',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
    uploadIcon: {
        fontSize: 30,
        color: '#007AFF',
        marginBottom: 5,
    },
    uploadText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    formContainer: {
        flex: 1,
        maxHeight: 400,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 5,
        position: 'relative',
    },
    inputImage: {
        width: 30,
        height: 30,
        marginRight: 10,
        borderRadius: 4,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        paddingVertical: 15,
    },
    colorPickerButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ddd',
    },
    colorPickerIcon: {
        fontSize: 14,
    },
    submitButton: {
        backgroundColor: '#FF5722',
        margin: 20,
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionGroup: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    typeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        borderRadius: 15,
        padding: 16,
        borderWidth: 2,
        borderColor: '#e0e0e0',
    },
    selectedTypeButton: {
        backgroundColor: '#e3f2fd',
        borderColor: '#2196f3',
    },
    typeIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    typeText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    selectedTypeText: {
        color: '#2196f3',
        fontWeight: '600',
    },
    instructorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        borderRadius: 15,
        padding: 16,
    },
    instructorAvatar: {
        fontSize: 24,
        marginRight: 12,
    },
    instructorName: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    semesterButton: {
        backgroundColor: '#f8f8f8',
        borderRadius: 15,
        padding: 16,
        alignItems: 'center',
    },
    semesterText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    scheduleTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    scheduleContainer: {
        marginBottom: 16,
        backgroundColor: '#f8f8f8',
        borderRadius: 15,
        padding: 16,
    },
    scheduleRow: {
        gap: 12,
    },
    dayContainer: {
        marginBottom: 12,
    },
    dayLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
        fontWeight: '500',
    },
    dayButton: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    dayText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    timeContainer: {
        marginBottom: 12,
    },
    timeLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
        fontWeight: '500',
    },
    timeButton: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    timeText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    addScheduleButton: {
        backgroundColor: '#e3f2fd',
        borderRadius: 15,
        padding: 16,
        alignItems: 'center',
        marginTop: 12,
        borderWidth: 2,
        borderColor: '#2196f3',
        borderStyle: 'dashed',
    },
    addScheduleText: {
        fontSize: 24,
        color: '#2196f3',
        fontWeight: 'bold',
    },
});

const colorPickerStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
    },
    presetsContainer: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    presetColors: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    presetColor: {
        width: 40,
        height: 40,
        borderRadius: 20,
        margin: 5,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedPreset: {
        borderColor: '#333',
        borderWidth: 3,
    },
    previewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#f8f8f8',
        borderRadius: 10,
    },
    previewLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 10,
    },
    colorPreview: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    colorText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    cancelButtonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: '#007AFF',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default AddCoursesModal;
