import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { authService } from '../../services/authService';

const AppointTeacher: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [userStatus, setUserStatus] = useState<string | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        expertise: '',
        experience: '',
        message: ''
    });

    // Check user status on component mount
    const checkUserStatus = async () => {
        try {
            setCheckingStatus(true);
            const userId = await authService.getCurrentUserUID();
            
            if (!userId) {
                setUserStatus(null);
                return;
            }

            const { data: existingUser, error } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error checking user status:', error);
                setUserStatus(null);
                return;
            }

            setUserStatus(existingUser?.role || null);
        } catch (error) {
            console.error('Error in checkUserStatus:', error);
            setUserStatus(null);
        } finally {
            setCheckingStatus(false);
        }
    };

    // Auto-refresh user status
    React.useEffect(() => {
        checkUserStatus();
    }, []);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleApplyAsTeacher = async () => {
        // Validate required fields
        if (!formData.expertise || !formData.experience) {
            Alert.alert('Error', 'Please fill in all required fields (Subject Expertise and Teaching Experience)');
            return;
        }

        setLoading(true);

        try {
            // Check if user is logged in
            const userId = await authService.getCurrentUserUID();
            const userEmail = await authService.getCurrentUserEmail();
            
            if (!userId || !userEmail) {
                // If not logged in, show login prompt
                Alert.alert(
                    'Login Required',
                    'You need to be logged in to apply as a teacher. Would you like to login now?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Login', onPress: () => router.push('/(auth)') }
                    ]
                );
                return;
            }

            // Check if user already applied
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking user status:', checkError);
                Alert.alert('Error', 'Failed to check application status');
                return;
            }

            if (existingUser && existingUser.role === 'req-teacher') {
                Alert.alert('Already Applied', 'You have already submitted a teacher application. Please wait for admin approval.');
                // Refresh status to show the waiting card
                await checkUserStatus();
                return;
            }

            if (existingUser && (existingUser.role === 'teacher' || existingUser.role === 'admin')) {
                Alert.alert('Already a Teacher', 'You are already registered as a teacher in our system.');
                return;
            }

            // Update user profile with teacher request
            const { error } = await supabase
                .from('users')
                .upsert({
                    id: userId,
                    email: userEmail,
                    expertise: formData.expertise,
                    experience: formData.experience,
                    add_message: formData.message,
                    role: 'req-teacher',
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error('Error submitting application:', error);
                Alert.alert('Error', 'Failed to submit application. Please try again.');
                return;
            }

            Alert.alert(
                'Application Submitted!',
                'Your teacher application has been submitted successfully. Our admin team will review your application and get back to you soon.',
                [
                    { 
                        text: 'OK', 
                        onPress: () => {
                            // Clear form
                            setFormData({
                                name: '',
                                email: '',
                                phone: '',
                                expertise: '',
                                experience: '',
                                message: ''
                            });
                            // Refresh status to show waiting card
                            checkUserStatus();
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('Error in teacher application:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Render waiting for approval card
    const renderWaitingCard = () => (
        <View style={styles.waitingContainer}>
            <View style={styles.waitingCard}>
                <Ionicons name="hourglass-outline" size={60} color="#FCCC42" />
                <Text style={styles.waitingTitle}>Application Under Review</Text>
                <Text style={styles.waitingSubtitle}>
                    Your teacher application has been submitted successfully and is currently being reviewed by our admin team.
                </Text>
                <View style={styles.waitingStatusContainer}>
                    <View style={styles.statusItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                        <Text style={styles.statusText}>Application Submitted</Text>
                    </View>
                    <View style={styles.statusItem}>
                        <Ionicons name="time-outline" size={20} color="#FCCC42" />
                        <Text style={styles.statusText}>Waiting for Admin Approval</Text>
                    </View>
                    <View style={styles.statusItemPending}>
                        <Ionicons name="ellipse-outline" size={20} color="#6b7280" />
                        <Text style={styles.statusTextPending}>Approval Pending</Text>
                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={checkUserStatus}
                >
                    <Ionicons name="refresh" size={16} color="#111827" />
                    <Text style={styles.refreshButtonText}>Refresh Status</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (checkingStatus) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FCCC42" />
                <Text style={styles.loadingText}>Checking application status...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Banner Section */}
            <View style={styles.bannerContainer}>
                <View style={styles.bannerContent}>
                    <Ionicons name="school" size={60} color="#FCCC42" />
                    <Text style={styles.bannerTitle}>Join Our Teaching Team!</Text>
                    <Text style={styles.bannerSubtitle}>
                        Share your knowledge and inspire the next generation of learners at Inside Inspiration Academy
                    </Text>
                    <View style={styles.benefitsList}>
                        <View style={styles.benefitItem}>
                            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                            <Text style={styles.benefitText}>Flexible teaching schedules</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                            <Text style={styles.benefitText}>Competitive compensation</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                            <Text style={styles.benefitText}>Professional development opportunities</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                            <Text style={styles.benefitText}>Modern teaching tools and resources</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Application Form or Waiting Card */}
            {userStatus === 'req-teacher' ? (
                renderWaitingCard()
            ) : (
                <View style={styles.formContainer}>
                    <Text style={styles.formTitle}>Teacher Application Form</Text>
                    <Text style={styles.formSubtitle}>
                        Fill out the form below to apply as a teacher
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Subject Expertise *</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g., Mathematics, Physics, Computer Science"
                            placeholderTextColor="#9ca3af"
                            value={formData.expertise}
                            onChangeText={(value) => handleInputChange('expertise', value)}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Teaching Experience *</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Years of experience and previous institutions"
                            placeholderTextColor="#9ca3af"
                            value={formData.experience}
                            onChangeText={(value) => handleInputChange('experience', value)}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Additional Message</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            placeholder="Tell us why you want to join our academy..."
                            placeholderTextColor="#9ca3af"
                            value={formData.message}
                            onChangeText={(value) => handleInputChange('message', value)}
                            multiline={true}
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    <Text style={styles.requiredNote}>* Required fields</Text>

                    {/* Call to Action Button */}
                    <TouchableOpacity
                        style={[styles.applyButton, loading && styles.applyButtonDisabled]}
                        onPress={handleApplyAsTeacher}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#111827" />
                        ) : (
                            <>
                                <Ionicons name="person-add" size={20} color="#111827" />
                                <Text style={styles.applyButtonText}>Join as a Teacher</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
    },
    bannerContainer: {
        backgroundColor: '#1f2937',
        margin: 16,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
    },
    bannerContent: {
        alignItems: 'center',
    },
    bannerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    bannerSubtitle: {
        fontSize: 16,
        color: '#d1d5db',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    benefitsList: {
        width: '100%',
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
        gap: 8,
    },
    benefitText: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '500',
        lineHeight: 22,
    },
    formContainer: {
        margin: 16,
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 24,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    formSubtitle: {
        fontSize: 14,
        color: '#9ca3af',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e5e7eb',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#374151',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: '#4b5563',
    },
    textArea: {
        minHeight: 100,
        paddingTop: 12,
    },
    requiredNote: {
        fontSize: 12,
        color: '#9ca3af',
        fontStyle: 'italic',
        marginBottom: 24,
    },
    applyButton: {
        backgroundColor: '#FCCC42',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    applyButtonDisabled: {
        backgroundColor: '#6b7280',
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111827',
        paddingVertical: 100,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#ffffff',
        textAlign: 'center',
    },
    waitingContainer: {
        margin: 16,
    },
    waitingCard: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FCCC42',
    },
    waitingTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 12,
    },
    waitingSubtitle: {
        fontSize: 16,
        color: '#d1d5db',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    waitingStatusContainer: {
        width: '100%',
        marginBottom: 24,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 8,
    },
    statusItemPending: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 8,
        opacity: 0.6,
    },
    statusText: {
        fontSize: 16,
        color: '#ffffff',
        marginLeft: 12,
        fontWeight: '500',
    },
    statusTextPending: {
        fontSize: 16,
        color: '#9ca3af',
        marginLeft: 12,
        fontWeight: '400',
    },
    refreshButton: {
        backgroundColor: '#FCCC42',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    refreshButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginLeft: 6,
    },
});

export default AppointTeacher;
