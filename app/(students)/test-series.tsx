import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

const testSeriesData = [
    { id: '1', title: 'Math Test 1', date: '2024-07-01' },
    { id: '2', title: 'Science Test 1', date: '2024-07-05' },
    { id: '3', title: 'English Test 1', date: '2024-07-10' },
];

const TestSeries = () => {
    const renderItem = ({ item }: { item: typeof testSeriesData[0] }) => (
        <TouchableOpacity style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.date}>Date: {item.date}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Test Series</Text>
            <FlatList
                data={testSeriesData}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 40,
        paddingHorizontal: 16,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    list: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: '#f2f2f2',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
    },
    date: {
        fontSize: 16,
        color: '#555',
        marginTop: 8,
    },
});

export default TestSeries;