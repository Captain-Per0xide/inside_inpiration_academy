import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import React, { useEffect } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import NotifService from '../../NotifService';


const AdminHome = () => {

    useEffect(() => {
        // Request notification permissions
        const requestPermissions = async () => {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            
            if (finalStatus !== 'granted') {
                console.log('Failed to get notification permissions!');
                return;
            }
            
            console.log('Notification permissions granted!');
        };

        requestPermissions();
    }, []);

    const handleSendNotification = async () => {
        try {
            await NotifService.showNotification(
                'Admin Notification',
                'This is a test notification from Admin Dashboard!',
                {},
                {}
            );
            
            Alert.alert('Success', 'Notification sent successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to send notification');
            console.error('Notification error:', error);
        }
    };

    const handleSendScheduledNotification = async () => {
        try {
            const scheduleDate = new Date(Date.now() + 10 * 1000); // 10 seconds from now
            await NotifService.showScheduledNotification(
                'Scheduled Notification',
                'This notification was scheduled 10 seconds ago!',
                scheduleDate
            );
            
            Alert.alert('Success', 'Scheduled notification set for 10 seconds from now!');
        } catch (error) {
            Alert.alert('Error', 'Failed to schedule notification');
            console.error('Scheduled notification error:', error);
        }
    };

    const handleCancelAllNotifications = async () => {
        try {
            await NotifService.cancelAllNotifications();
            Alert.alert('Success', 'All notifications cancelled!');
        } catch (error) {
            Alert.alert('Error', 'Failed to cancel notifications');
            console.error('Cancel notifications error:', error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Admin Dashboard</Text>
            
            <TouchableOpacity style={styles.notificationButton} onPress={handleSendNotification}>
                <Ionicons name="notifications" size={24} color="#fff" />
                <Text style={styles.buttonText}>Send Push Notification</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.notificationButton, styles.scheduledButton]} onPress={handleSendScheduledNotification}>
                <Ionicons name="time" size={24} color="#fff" />
                <Text style={styles.buttonText}>Send Scheduled Notification</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.notificationButton, styles.cancelButton]} onPress={handleCancelAllNotifications}>
                <Ionicons name="close-circle" size={24} color="#fff" />
                <Text style={styles.buttonText}>Cancel All Notifications</Text>
            </TouchableOpacity>
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
    notificationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 10,
        marginTop: 20,
        gap: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    scheduledButton: {
        backgroundColor: '#10B981',
    },
    cancelButton: {
        backgroundColor: '#EF4444',
    },
});
export default AdminHome;