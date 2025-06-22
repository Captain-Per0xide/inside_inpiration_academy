import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AddCoursesModal from '@/components/add-courses';

const Courses = () => {
    const [modalVisible, setModalVisible] = useState(false);




    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Course Management Section</Text>
                        
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.7}
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            <AddCoursesModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSubmit={(value) => {
                    console.log('Course added:', value);
                    // Handle course submission logic here
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#111827',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111827',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        color: '#fff',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#495057',
        textAlign: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#495057',
        width: 60,
        marginRight: 10,
    },
    value: {
        fontSize: 16,
        color: '#212529',
        flex: 1,
        flexWrap: 'wrap',
    },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 32,
        width: 60,
        height: 60,
        borderRadius: 15,
        backgroundColor: '#2E4064',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
});

export default Courses;