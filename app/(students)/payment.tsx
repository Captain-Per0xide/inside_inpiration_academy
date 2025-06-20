import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const PaymentScreen = () => {
    const handlePayment = () => {
        // Handle payment logic here
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Payment</Text>
            <View style={styles.card}>
                <Text style={styles.label}>Amount Due:</Text>
                <Text style={styles.amount}>$100.00</Text>
                <TouchableOpacity style={styles.button} onPress={handlePayment}>
                    <Text style={styles.buttonText}>Pay Now</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default PaymentScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f6fa',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 32,
    },
    card: {
        width: '80%',
        padding: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        elevation: 3,
        alignItems: 'center',
    },
    label: {
        fontSize: 18,
        marginBottom: 8,
    },
    amount: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#4e8cff',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});