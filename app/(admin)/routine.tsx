import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

const Routine: React.FC = () => {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Admin Routine Page</Text>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today&apos;s Routine</Text>
                {/* Placeholder for routine items */}
                <Text style={styles.placeholder}>No routines scheduled for today.</Text>
            </View>
            <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Add New Routine</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
        backgroundColor: '#fff',
        alignItems: 'stretch',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    section: {
        marginBottom: 32,
        padding: 16,
        backgroundColor: '#f2f2f2',
        borderRadius: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 12,
    },
    placeholder: {
        color: '#888',
        fontStyle: 'italic',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});

export default Routine;