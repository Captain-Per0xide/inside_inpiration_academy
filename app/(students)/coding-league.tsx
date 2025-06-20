import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, StatusBar } from 'react-native';

const CodingLeague = () => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Coding League</Text>
                <Text style={styles.subtitle}>
                    Welcome to the Coding League! Compete, learn, and grow your coding skills.
                </Text>
                {/* Add more components or features here */}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    content: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 18,
        color: '#334155',
        textAlign: 'center',
    },
});

export default CodingLeague;