import React from 'react';
import { View, Text, Button, FlatList, StyleSheet, TouchableOpacity } from 'react-native';

const mockTests = [
    { id: '1', name: 'Math Test', date: '2024-06-10' },
    { id: '2', name: 'Science Test', date: '2024-06-15' },
];

const TestManagementPage = () => {
    const handleAddTest = () => {
        // Logic to add a new test
    };

    const handleEditTest = (id: string) => {
        // Logic to edit test
    };

    const handleDeleteTest = (id: string) => {
        // Logic to delete test
    };

    const renderItem = ({ item }: { item: typeof mockTests[0] }) => (
        <View style={styles.testItem}>
            <View>
                <Text style={styles.testName}>{item.name}</Text>
                <Text style={styles.testDate}>{item.date}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleEditTest(item.id)} style={styles.actionButton}>
                    <Text>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteTest(item.id)} style={styles.actionButton}>
                    <Text>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Test Management</Text>
            <Button title="Add New Test" onPress={handleAddTest} />
            <FlatList
                data={mockTests}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                style={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    list: { marginTop: 20 },
    testItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    testName: { fontSize: 18, fontWeight: '500' },
    testDate: { fontSize: 14, color: '#888' },
    actions: { flexDirection: 'row' },
    actionButton: { marginLeft: 10, padding: 6, backgroundColor: '#eee', borderRadius: 4 },
});

export default TestManagementPage;