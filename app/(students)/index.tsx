import { supabase } from '@/lib/supabase';
import { authService } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface UserData {
    id?: string;
    email?: string;
    name?: string;
}


const StudentsDashboard = () => {
    const [userData, setUserData] = useState<UserData>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [formValue, setFormValue] = useState('');

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        setIsLoading(true);

        try {
            const id = await authService.getCurrentUserUID();
            const email = await authService.getCurrentUserEmail();
            
            if (!id || !email) {
                setIsLoading(false);
                return;
            }

            console.log('Fetching user data for ID:', id);

            const { data, error } = await supabase
                .from('users')
                .select('id, email, name')
                .eq('id', id)
                .maybeSingle();

            if (error) {
                console.error('Fetch error:', error);
                setIsLoading(false);
                return;
            }

            console.log('Fetched user data:', data);

            if (data) {
                setUserData(data);
            } else {
                // If no user data exists in database, use current auth info
                setUserData({ id, email, name: 'User' });
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Students Dashboard</Text>
            <View style={styles.userInfoContainer}>
                <Text style={styles.sectionTitle}>User Information</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>ID:</Text>
                    <Text style={styles.value}>{userData.id || 'Not available'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Name:</Text>
                    <Text style={styles.value}>{userData.name || 'Not set'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Email:</Text>
                    <Text style={styles.value}>{userData.email || 'Not available'}</Text>
                </View>
            </View>
            {/* Floating Action Button */}
            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.7}
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            {/* Modal for Form */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Item</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter something..."
                            value={formValue}
                            onChangeText={setFormValue}
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
                            <Button title="Cancel" onPress={() => setModalVisible(false)} color="#888" />
                            <View style={{ width: 12 }} />
                            <Button title="Submit" onPress={() => { setModalVisible(false); setFormValue(''); }} color="#2E4064" />
                        </View>
                    </View>
                </View>
            </Modal>
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
        color: '#333',
    },
    userInfoContainer: {
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e9ecef',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#2E4064',
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
});

export default StudentsDashboard;