import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';

type Student = {
    id: string;
    name: string;
    marks: number;
};

const students: Student[] = [
    { id: '1', name: 'Alice Johnson', marks: 85 },
    { id: '2', name: 'Bob Smith', marks: 92 },
    { id: '3', name: 'Charlie Brown', marks: 78 },
    // Add more students as needed
];

const ResultPage: React.FC = () => {
    const renderItem = ({ item }: { item: Student }) => (
        <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.marks}>{item.marks}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Student Results</Text>
            <View style={styles.header}>
                <Text style={[styles.name, styles.headerText]}>Name</Text>
                <Text style={[styles.marks, styles.headerText]}>Marks</Text>
            </View>
            <FlatList
                data={students}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 16 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    header: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ccc', paddingBottom: 8, marginBottom: 8 },
    headerText: { fontWeight: 'bold' },
    list: { paddingBottom: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
    name: { flex: 2, fontSize: 16 },
    marks: { flex: 1, fontSize: 16, textAlign: 'right' },
});

export default ResultPage;