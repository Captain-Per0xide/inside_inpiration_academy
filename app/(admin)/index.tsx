import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AdminHome = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Hello, Admin!</Text>
            <Text>Welcome to the Admin Dashboard.</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 12,
    },
});

export default AdminHome;