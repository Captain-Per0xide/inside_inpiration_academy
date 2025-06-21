import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, TouchableOpacity } from 'react-native';

interface Teacher {
    id: string;
    name: string;
    subject: string;
}

const TeacherManagement: React.FC = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');

    const addTeacher = () => {
        if (name && subject) {
            setTeachers([
                ...teachers,
                { id: Date.now().toString(), name, subject }
            ]);
            setName('');
            setSubject('');
        }
    };

    const removeTeacher = (id: string) => {
        setTeachers(teachers.filter(t => t.id !== id));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Teacher Management</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Teacher Name"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                />
                <TextInput
                    placeholder="Subject"
                    value={subject}
                    onChangeText={setSubject}
                    style={styles.input}
                />
                <Button title="Add Teacher" onPress={addTeacher} />
            </View>
            <FlatList
                data={teachers}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.teacherItem}>
                        <Text>{item.name} - {item.subject}</Text>
                        <TouchableOpacity onPress={() => removeTeacher(item.id)}>
                            <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={<Text>No teachers added yet.</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    inputContainer: { marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
    teacherItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
    removeText: { color: 'red' },
});

export default TeacherManagement;