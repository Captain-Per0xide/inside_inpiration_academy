import { supabase } from '@/lib/supabase';
import { authService } from '@/services/authService';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface UserData {
    id?: string;
    email?: string;
    name?: string;
}

const StudentsDashboard = () => {
    const [userData, setUserData] = useState<UserData>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);

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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
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
});

export default StudentsDashboard;