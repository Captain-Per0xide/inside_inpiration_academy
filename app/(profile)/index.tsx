import { supabase } from '@/lib/supabase';
import { authService } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { determineUserRoute, isProfileComplete } from '../../utils/routingUtils';

import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface UserData {
    id?: string;
    email?: string;
    name?: string;
    phone_no?: string;
    alternative_phone_no?: string | null;
    address?: string;
    dob?: string;
    univ_name?: string;
    enrollment_date?: string | null;
    current_sem?: number | null;
    gender?: string;
    user_image?: string | null;
    role?: string;
}

export default function ProfilePage() {
    const [formData, setFormData] = useState<UserData>({});
    const [selectedGender, setSelectedGender] = useState<string>('Other');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [pickedImage, setPickedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showDobPicker, setShowDobPicker] = useState<boolean>(false);
    const [dobDate, setDobDate] = useState<Date>(new Date(2006, 0, 1));
    const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

    const genderOptions = ['Male', 'Female', 'Other'];

    useEffect(() => {
        fetchUserData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkAndRedirectIfComplete = async () => {
        try {
            const id = await authService.getCurrentUserUID();
            if (!id) return;

            const profileComplete = await isProfileComplete(id);
            if (profileComplete) {
                const route = await determineUserRoute(id);
                router.replace(route as any);
            }
        } catch (error) {
            console.error('Error checking profile completion:', error);
        }
    }; const fetchUserData = async () => {
        setIsLoading(true);

        try {
            const id = await authService.getCurrentUserUID();
            if (!id) {
                Alert.alert('Error', 'User not authenticated');
                setIsLoading(false);
                return;
            }

            console.log('Fetching user data for ID:', id); // Debug log

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) {
                console.error('Fetch error:', error);
                throw error;
            }

            console.log('Fetched user data:', data); // Debug log

            if (data) {
                setFormData(data);
                setSelectedGender(data.gender || 'Other');
                setImageUrl(data.user_image);

                // Handle phone number formatting
                if (data.phone_no && !data.phone_no.startsWith('+91 ')) {
                    setFormData(prev => ({ ...prev, phone_no: '+91 ' + data.phone_no }));
                }
                if (data.alternative_phone_no && !data.alternative_phone_no.startsWith('+91 ')) {
                    setFormData(prev => ({ ...prev, alternative_phone_no: '+91 ' + data.alternative_phone_no }));
                }

                if (data.dob) {
                    setDobDate(new Date(data.dob));
                }

                // Check if profile is complete and redirect if it is
                await checkAndRedirectIfComplete();
            } else {
                // If no user data exists, create initial record with current user's email
                const email = await authService.getCurrentUserEmail();
                if (email) {
                    const initialData = {
                        id,
                        email,
                        name: '',
                        phone_no: '+91 ',
                        alternative_phone_no: '+91 ',
                        address: '',
                        dob: '',
                        univ_name: '',
                        gender: 'Other',
                        user_image: ''
                    };
                    setFormData(initialData);
                    setSelectedGender('Other'); // Ensure Other is selected
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch user data');
            console.error('Error fetching user data:', error);
        } finally {
            setIsLoading(false);
        }
    }; const uriToBlob = async (uri: string): Promise<ArrayBuffer> => {
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Convert base64 to binary string
        const binaryString = atob(base64);

        // Create ArrayBuffer from binary string
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes.buffer;
    };

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Permission to access camera roll is required!');
                return;
            } const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (!result.canceled && result.assets[0]) {
                setPickedImage(result.assets[0].uri);
                // Clear validation error when user picks an image
                setValidationErrors(prev => ({ ...prev, image: false }));
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
            console.error('Error picking image:', error);
        }
    };
    const uploadImage = async (userId: string): Promise<string | null> => {
        if (!pickedImage) return imageUrl;

        const path = `User-data/${userId}/profile.jpg`;

        try {
            // Delete old image first if it exists
            if (imageUrl) {
                console.log('Deleting previous image...');
                await supabase.storage
                    .from('inside-inspiration-academy-assets')
                    .remove([path]);
            } console.log('Converting image to ArrayBuffer...');
            const arrayBuffer = await uriToBlob(pickedImage);

            console.log('Uploading new image...');
            const { error } = await supabase.storage
                .from('inside-inspiration-academy-assets')
                .upload(path, arrayBuffer, {
                    cacheControl: '3600',
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (error) throw error;

            const { data } = supabase.storage
                .from('inside-inspiration-academy-assets')
                .getPublicUrl(path);

            console.log('Upload successful, public URL:', data.publicUrl);
            return data.publicUrl;
        } catch (error) {
            console.error('Image upload error:', error);
            return imageUrl ?? null;
        }
    };


    const validateForm = (): boolean => {
        const errors: Record<string, boolean> = {};
        let hasErrors = false;

        if (!formData.name?.trim()) {
            errors.name = true;
            hasErrors = true;
        }
        if (!formData.phone_no?.trim() || formData.phone_no === '+91 ') {
            errors.phone_no = true;
            hasErrors = true;
        }
        if (!formData.alternative_phone_no?.trim() || formData.alternative_phone_no === '+91 ') {
            errors.alternative_phone_no = true;
            hasErrors = true;
        }
        if (!formData.address?.trim()) {
            errors.address = true;
            hasErrors = true;
        }
        if (!formData.dob?.trim()) {
            errors.dob = true;
            hasErrors = true;
        }
        if (!formData.univ_name?.trim()) {
            errors.univ_name = true;
            hasErrors = true;
        }
        if (!selectedGender || selectedGender.trim() === '') {
            errors.gender = true;
            hasErrors = true;
        }
        if (!imageUrl && !pickedImage) {
            errors.image = true;
            hasErrors = true;
        }

        setValidationErrors(errors);

        if (hasErrors) {
            Alert.alert('Validation Error', 'Please fill in all required fields (marked in red)');
            return false;
        }

        return true;
    };
    const submitProfile = async () => {
        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const id = await authService.getCurrentUserUID();
            const email = await authService.getCurrentUserEmail();

            if (!id || !email) {
                Alert.alert('Error', 'User not logged in');
                setIsLoading(false);
                return;
            }

            console.log('Starting profile submission for user:', id);

            // Try to upload image, but don't let it block profile update
            let uploadedImageUrl = imageUrl; // Keep existing image as fallback
            let imageUploadSuccess = false;

            if (pickedImage) {
                try {
                    console.log('Attempting image upload...');
                    const newImageUrl = await uploadImage(id);
                    if (newImageUrl) {
                        uploadedImageUrl = newImageUrl;
                        imageUploadSuccess = true;
                        console.log('Image upload successful');
                    }
                } catch (imageError) {
                    console.warn('Image upload failed, continuing with profile update:', imageError);
                    // Continue with profile update even if image upload fails
                }
            } const data = {
                id,
                email,
                name: formData.name?.trim(),
                phone_no: formData.phone_no?.trim(),
                alternative_phone_no: formData.alternative_phone_no?.trim() || null,
                address: formData.address?.trim(),
                dob: formData.dob?.trim(),
                univ_name: formData.univ_name?.trim(),
                current_sem: formData.current_sem ? parseInt(formData.current_sem.toString()) : null,
                gender: selectedGender,
                user_image: uploadedImageUrl,
                role: formData.role, // Include role in the data
            };

            console.log('Submitting profile data:', data);

            const { error } = await supabase.from('users').upsert(data, {
                onConflict: 'id'
            });

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            console.log('Profile update successful');

            // Update local state with new data
            setFormData(data);
            setImageUrl(uploadedImageUrl);
            if (pickedImage && imageUploadSuccess) {
                setPickedImage(null); // Clear picked image since it's been uploaded
            }

            // Use the routing utility to determine the appropriate route
            const redirectRoute = await determineUserRoute(id);
            router.replace(redirectRoute as any);

            // Alert.alert('Success', successMessage, [
            //     {
            //         text: 'OK',
            //         onPress: () => {
            //             setTimeout(() => {
            //                 router.replace(redirectRoute);
            //             }, 400);
            //         },
            //     },
            // ]);
        } catch (error) {
            Alert.alert('Error', `Failed to update profile: ${error}`);
            console.error('Error updating profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    const onDobChange = (event: any, selectedDate?: Date) => {
        setShowDobPicker(false);
        if (selectedDate) {
            setDobDate(selectedDate);
            setFormData(prev => ({ ...prev, dob: formatDate(selectedDate) }));
            // Clear validation error when user selects a date
            setValidationErrors(prev => ({ ...prev, dob: false }));
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    } return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.welcomeText}>Complete Your Profile</Text>
            <Text style={styles.subtitleText}>Please fill in all required fields to continue</Text>

            <TouchableOpacity
                onPress={pickImage}
                style={[
                    styles.imageContainer,
                    validationErrors.image && styles.errorBorder
                ]}
            >
                <Image
                    source={
                        pickedImage
                            ? { uri: pickedImage }
                            : imageUrl
                                ? { uri: imageUrl }
                                : require('@/assets/images/icon.png')
                    }
                    style={styles.profileImage}
                />
                <View style={styles.editIcon}>
                    <Ionicons name="pencil" size={18} color="#000" />
                </View>
                {validationErrors.image && (
                    <Text style={styles.errorText}>Profile image is required</Text>
                )}
            </TouchableOpacity>

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, validationErrors.name && styles.errorLabel]}>
                        Full Name *
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            validationErrors.name && styles.errorInput
                        ]}
                        placeholder="Enter your full name"
                        placeholderTextColor="#9CA3AF"
                        value={formData.name || ''}
                        onChangeText={(text) => {
                            setFormData(prev => ({ ...prev, name: text }));
                            if (text.trim()) {
                                setValidationErrors(prev => ({ ...prev, name: false }));
                            }
                        }}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, validationErrors.phone_no && styles.errorLabel]}>
                        Phone Number *
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            validationErrors.phone_no && styles.errorInput
                        ]}
                        placeholder="Enter your phone number"
                        placeholderTextColor="#9CA3AF"
                        value={formData.phone_no || '+91 '}
                        onChangeText={(text) => {
                            if (!text.startsWith('+91 ')) {
                                text = '+91 ' + text.replace('+91 ', '');
                            }
                            setFormData(prev => ({ ...prev, phone_no: text }));
                            if (text.trim() && text !== '+91 ') {
                                setValidationErrors(prev => ({ ...prev, phone_no: false }));
                            }
                        }}
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, validationErrors.alternative_phone_no && styles.errorLabel]}>
                        Alternative Phone *
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            validationErrors.alternative_phone_no && styles.errorInput
                        ]}
                        placeholder="Enter alternative phone number"
                        placeholderTextColor="#9CA3AF"
                        value={formData.alternative_phone_no || '+91 '}
                        onChangeText={(text) => {
                            if (!text.startsWith('+91 ')) {
                                text = '+91 ' + text.replace('+91 ', '');
                            }
                            setFormData(prev => ({ ...prev, alternative_phone_no: text }));
                            if (text.trim() && text !== '+91 ') {
                                setValidationErrors(prev => ({ ...prev, alternative_phone_no: false }));
                            }
                        }}
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, validationErrors.address && styles.errorLabel]}>
                        Address *
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            styles.textArea,
                            validationErrors.address && styles.errorInput
                        ]}
                        placeholder="Enter your complete address"
                        placeholderTextColor="#9CA3AF"
                        value={formData.address || ''}
                        onChangeText={(text) => {
                            setFormData(prev => ({ ...prev, address: text }));
                            if (text.trim()) {
                                setValidationErrors(prev => ({ ...prev, address: false }));
                            }
                        }}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, validationErrors.dob && styles.errorLabel]}>
                        Date of Birth *
                    </Text>
                    <TouchableOpacity
                        style={[
                            styles.dateInput,
                            validationErrors.dob && styles.errorInput
                        ]}
                        onPress={() => setShowDobPicker(true)}
                    >
                        <Text style={formData.dob ? styles.dateText : styles.placeholderText}>
                            {formData.dob || 'Select your date of birth'}
                        </Text>
                        <Ionicons name="calendar" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, validationErrors.univ_name && styles.errorLabel]}>
                        University Name *
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            validationErrors.univ_name && styles.errorInput
                        ]}
                        placeholder="Enter your university name"
                        placeholderTextColor="#9CA3AF"
                        value={formData.univ_name || ''}
                        onChangeText={(text) => {
                            setFormData(prev => ({ ...prev, univ_name: text }));
                            if (text.trim()) {
                                setValidationErrors(prev => ({ ...prev, univ_name: false }));
                            }
                        }}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Current Semester (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your current semester"
                        placeholderTextColor="#9CA3AF"
                        value={formData.current_sem?.toString() || ''}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, current_sem: parseInt(text) || undefined }))}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, validationErrors.gender && styles.errorLabel]}>
                        Gender *
                    </Text>
                    <View style={[
                        styles.pickerContainer,
                        validationErrors.gender && styles.errorInput
                    ]}>
                        <Picker
                            selectedValue={selectedGender}
                            onValueChange={(itemValue) => {
                                setSelectedGender(itemValue);
                                if (itemValue && itemValue.trim()) {
                                    setValidationErrors(prev => ({ ...prev, gender: false }));
                                }
                            }}
                            style={styles.picker}
                            dropdownIconColor="#9CA3AF"
                        >
                            {genderOptions.map((option) => (
                                <Picker.Item
                                    key={option}
                                    label={option}
                                    value={option}
                                    color="#fff"
                                />
                            ))}
                        </Picker>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={submitProfile}
                    disabled={isLoading}
                >
                    <Text style={styles.submitButtonText}>
                        {isLoading ? 'Saving Profile...' : 'Complete Profile & Continue'}
                    </Text>
                </TouchableOpacity>
            </View>

            {showDobPicker && (
                <DateTimePicker
                    value={dobDate}
                    mode="date"
                    display="default"
                    onChange={onDobChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                />
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
    },
    contentContainer: {
        padding: 16,
        paddingTop: 60, // Added proper top padding
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
        color: '#fff',
    },
    subtitleText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
        color: '#9CA3AF',
    },
    imageContainer: {
        alignSelf: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    editIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 16,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ddd',
    },
    form: {
        gap: 20, // Increased gap between form elements
    },
    inputGroup: {
        gap: 8, // Space between label and input
    },
    inputLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#374151',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#fff',
        backgroundColor: '#1F2937',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    dateInput: {
        borderWidth: 1,
        borderColor: '#374151',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1F2937',
    },
    dateText: {
        fontSize: 16,
        color: '#fff',
    },
    placeholderText: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#374151',
        borderRadius: 8,
        backgroundColor: '#1F2937',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        color: '#fff',
        backgroundColor: '#1F2937',
    },
    submitButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    submitButtonDisabled: {
        backgroundColor: '#ccc',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    // Error styles
    errorInput: {
        borderColor: '#ef4444',
        borderWidth: 2,
    },
    errorLabel: {
        color: '#ef4444',
    },
    errorBorder: {
        borderWidth: 2,
        borderColor: '#ef4444',
        borderRadius: 50,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
        textAlign: 'center',
    },
});