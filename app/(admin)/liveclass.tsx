import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert } from 'react-native';

const LiveClassAdminPage = () => {
    const [title, setTitle] = useState('');
    const [dateTime, setDateTime] = useState('');
    const [description, setDescription] = useState('');

    const handleCreateClass = () => {
        // Placeholder for create class logic
        Alert.alert('Live Class Created', `Title: ${title}\nDate & Time: ${dateTime}\nDescription: ${description}`);
        setTitle('');
        setDateTime('');
        setDescription('');
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.heading}>Create Live Class</Text>
            <TextInput
                style={styles.input}
                placeholder="Class Title"
                value={title}
                onChangeText={setTitle}
            />
            <TextInput
                style={styles.input}
                placeholder="Date & Time (e.g., 2024-06-10 10:00 AM)"
                value={dateTime}
                onChangeText={setDateTime}
            />
            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
            />
            <Button title="Create Live Class" onPress={handleCreateClass} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 24,
        backgroundColor: '#fff',
        flexGrow: 1,
        justifyContent: 'center',
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
});

export default LiveClassAdminPage;