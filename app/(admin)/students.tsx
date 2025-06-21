import React, { useState } from 'react';
import { View, Text, FlatList, Button, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

type Student = {
    id: string;
    name: string;
    email: string;
};

const initialStudents: Student[] = [
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com' },
];

export default function StudentsAdminPage() {
    const [students, setStudents] = useState<Student[]>(initialStudents);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    const addStudent = () => {
        if (name && email) {
            setStudents([
                ...students,
                { id: Date.now().toString(), name, email }
            ]);
            setName('');
            setEmail('');
        }
    };

    const removeStudent = (id: string) => {
        setStudents(students.filter(student => student.id !== id));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Student Management</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Name"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                />
                <TextInput
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    keyboardType="email-address"
                />
                <Button title="Add Student" onPress={addStudent} />
            </View>
            <FlatList
                data={students}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.studentItem}>
                        <View>
                            <Text style={styles.studentName}>{item.name}</Text>
                            <Text style={styles.studentEmail}>{item.email}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeStudent(item.id)}>
                            <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={<Text>No students found.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    inputContainer: { marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 10 },
    studentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
    studentName: { fontSize: 16, fontWeight: '500' },
    studentEmail: { fontSize: 14, color: '#666' },
    removeText: { color: 'red', fontWeight: 'bold' },
});