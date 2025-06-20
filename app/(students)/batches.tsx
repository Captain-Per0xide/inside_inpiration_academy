import React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView } from 'react-native';

const batches = [
    { id: '1', name: 'Batch A', schedule: 'Mon, Wed, Fri - 10:00 AM' },
    { id: '2', name: 'Batch B', schedule: 'Tue, Thu - 2:00 PM' },
];

const MyBatchesScreen = () => {
    const renderItem = ({ item }: { item: typeof batches[0] }) => (
        <View style={styles.batchItem}>
            <Text style={styles.batchName}>{item.name}</Text>
            <Text style={styles.batchSchedule}>{item.schedule}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>My Batches</Text>
            <FlatList
                data={batches}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 16,
        alignSelf: 'center',
    },
    list: {
        paddingBottom: 16,
    },
    batchItem: {
        backgroundColor: '#f2f2f2',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    batchName: {
        fontSize: 18,
        fontWeight: '600',
    },
    batchSchedule: {
        fontSize: 14,
        color: '#555',
        marginTop: 4,
    },
});

export default MyBatchesScreen;