import React from 'react';
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';

const CodingLeaguePage = () => {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Coding League</Text>
            <Text style={styles.subtitle}>Welcome to the Coding League!</Text>
            <Text style={styles.description}>
                Compete with others, solve challenges, and climb the leaderboard.
            </Text>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming Challenges</Text>
                {/* Placeholder for challenge list */}
                <Text>No challenges available yet.</Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Leaderboard</Text>
                {/* Placeholder for leaderboard */}
                <Text>Leaderboard coming soon.</Text>
            </View>
            <Button title="Join League" onPress={() => { /* Handle join action */ }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 24,
        backgroundColor: '#fff',
        flexGrow: 1,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginVertical: 16,
    },
    subtitle: {
        fontSize: 20,
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
    },
    section: {
        width: '100%',
        marginBottom: 24,
        padding: 16,
        backgroundColor: '#f2f2f2',
        borderRadius: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
});

export default CodingLeaguePage;