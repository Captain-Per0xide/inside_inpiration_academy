import React, { useState } from 'react';
import { Button, Modal, StyleSheet, Text, TextInput, View } from 'react-native';

interface AddCoursesModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit?: (value: string) => void;
}

const AddCoursesModal: React.FC<AddCoursesModalProps> = ({ visible, onClose, onSubmit }) => {
    const [formValue, setFormValue] = useState('');

    const handleSubmit = () => {
        if (onSubmit) {
            onSubmit(formValue);
        }
        setFormValue('');
        onClose();
    };

    const handleCancel = () => {
        setFormValue('');
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
                    <Text style={styles.modalTitle}>Add New Course</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter course name..."
                        value={formValue}
                        onChangeText={setFormValue}
                    />
                    <View style={styles.buttonContainer}>
                        <Button title="Cancel" onPress={handleCancel} color="#888" />
                        <View style={styles.buttonSpacer} />
                        <Button title="Submit" onPress={handleSubmit} color="#2E4064" />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#2E4064',
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
    },
    buttonSpacer: {
        width: 12,
    },
});

export default AddCoursesModal;
