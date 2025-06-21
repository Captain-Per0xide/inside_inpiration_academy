import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';

const payments = [
    { id: '1', user: 'John Doe', amount: 100, status: 'Completed', date: '2024-06-01' },
    { id: '2', user: 'Jane Smith', amount: 50, status: 'Pending', date: '2024-06-02' },
    // Add more mock payments as needed
];

const PaymentItem = ({ payment }: { payment: typeof payments[0] }) => (
    <View style={styles.itemContainer}>
        <View>
            <Text style={styles.user}>{payment.user}</Text>
            <Text style={styles.details}>Amount: ${payment.amount}</Text>
            <Text style={styles.details}>Status: {payment.status}</Text>
            <Text style={styles.details}>Date: {payment.date}</Text>
        </View>
        <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>
    </View>
);

const PaymentManagementPage = () => {
    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Payment Management</Text>
            <FlatList
                data={payments}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <PaymentItem payment={item} />}
                contentContainerStyle={styles.listContent}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 16 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    listContent: { paddingBottom: 16 },
    itemContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    user: { fontSize: 18, fontWeight: '600' },
    details: { fontSize: 14, color: '#555' },
    actionButton: {
        backgroundColor: '#007bff',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 6,
    },
    actionText: { color: '#fff', fontWeight: 'bold' },
});

export default PaymentManagementPage;