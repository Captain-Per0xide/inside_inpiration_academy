import { supabase } from '@/lib/supabase';
import { authService } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';

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
}

export default function ProfilePage() {
    const [formData, setFormData] = useState<UserData>({});
    const [selectedGender, setSelectedGender] = useState<string>('Other');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [pickedImage, setPickedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showDobPicker, setShowDobPicker] = useState<boolean>(false);
    const [showEnrollPicker, setShowEnrollPicker] = useState<boolean>(false);
    const [dobDate, setDobDate] = useState<Date>(new Date(2006, 0, 1));
    const [enrollDate, setEnrollDate] = useState<Date>(new Date());

    const genderOptions = ['Male', 'Female', 'Other'];
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        const loadUserEmail = async () => {
            const email = await authService.getCurrentUserEmail();
            setUserEmail(email);
        };
        loadUserEmail();
        fetchUserData();
    }, []); const fetchUserData = async () => {
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

                if (data.dob) {
                    setDobDate(new Date(data.dob));
                }
                if (data.enrollment_date) {
                    setEnrollDate(new Date(data.enrollment_date));
                }
            } else {
                // If no user data exists, create initial record with current user's email
                const email = await authService.getCurrentUserEmail();
                if (email) {
                    const initialData = {
                        id,
                        email,
                        name: '',
                        phone_no: '',
                        address: '',
                        dob: '',
                        univ_name: '',
                        gender: 'Other',
                        user_image: ''
                    };
                    setFormData(initialData);
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch user data');
            console.error('Error fetching user data:', error);
        } finally {
            setIsLoading(false);
        }
    };    const uriToBlob = async (uri: string): Promise<ArrayBuffer> => {
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
            }            console.log('Converting image to ArrayBuffer...');
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
        const errors: string[] = [];

        if (!formData.name?.trim()) {
            errors.push('Name is required');
        }
        if (!formData.phone_no?.trim()) {
            errors.push('Phone number is required');
        }
        if (!formData.address?.trim()) {
            errors.push('Address is required');
        }
        if (!formData.dob?.trim()) {
            errors.push('Date of birth is required');
        }
        if (!formData.univ_name?.trim()) {
            errors.push('University name is required');
        }

        if (errors.length > 0) {
            Alert.alert('Validation Error', errors.join('\n'));
            return false;
        }

        return true;
    }; const submitProfile = async () => {
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
            }

            const data = {
                id,
                email,
                name: formData.name?.trim(),
                phone_no: formData.phone_no?.trim(),
                alternative_phone_no: formData.alternative_phone_no?.trim() || null,
                address: formData.address?.trim(),
                dob: formData.dob?.trim(),
                univ_name: formData.univ_name?.trim(),
                enrollment_date: formData.enrollment_date || null,
                current_sem: formData.current_sem ? parseInt(formData.current_sem.toString()) : null,
                gender: selectedGender,
                user_image: uploadedImageUrl,
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

            const successMessage = imageUploadSuccess
                ? 'Profile updated successfully!'
                : 'Profile updated successfully! (Image upload failed, but your other changes were saved)';

            Alert.alert('Success', successMessage, [
                {
                    text: 'OK',
                    onPress: () => {
                        setTimeout(() => {
                            router.replace('/(tabs)');
                        }, 400);
                    },
                },
            ]);
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
        }
    }; const testAuth = async () => {
        try {
            const id = await authService.getCurrentUserUID();
            const email = await authService.getCurrentUserEmail();

            Alert.alert('Auth Info', `ID: ${id}\nEmail: ${email}`);
            console.log('Current User ID:', id);
            console.log('Current User Email:', email);
        } catch (error) {
            console.error('Auth test error:', error);
            Alert.alert('Auth Error', error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const testImageUpload = async () => {
        if (!pickedImage) {
            Alert.alert('No Image', 'Please select an image first');
            return;
        }

        try {
            const id = await authService.getCurrentUserUID();
            if (!id) {
                Alert.alert('Error', 'User not authenticated');
                return;
            }

            setIsLoading(true);
            const uploadedUrl = await uploadImage(id);

            if (uploadedUrl) {
                Alert.alert('Success', 'Image uploaded successfully!');
                setImageUrl(uploadedUrl);
                setPickedImage(null);
            } else {
                Alert.alert('Failed', 'Image upload failed');
            }
        } catch (error) {
            Alert.alert('Error', `Image upload test failed: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    const onEnrollChange = (event: any, selectedDate?: Date) => {
        setShowEnrollPicker(false);
        if (selectedDate) {
            setEnrollDate(selectedDate);
            setFormData(prev => ({ ...prev, enrollment_date: formatDate(selectedDate) }));
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
            <Text style={styles.welcomeText}>Welcome {userEmail}</Text>
            <TouchableOpacity onPress={testAuth} style={styles.testButton}>
                <Text style={styles.testButtonText}>Test Auth</Text>
            </TouchableOpacity>

            {pickedImage && (
                <TouchableOpacity onPress={testImageUpload} style={[styles.testButton, { backgroundColor: '#6f42c1' }]}>
                    <Text style={styles.testButtonText}>Test Image Upload</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
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
            </TouchableOpacity>

            <View style={styles.form}>
                <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={formData.name || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    value={formData.phone_no || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, phone_no: text }))}
                    keyboardType="phone-pad"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Alternative Phone"
                    value={formData.alternative_phone_no || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, alternative_phone_no: text }))}
                    keyboardType="phone-pad"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Address"
                    value={formData.address || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                    multiline
                />

                <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDobPicker(true)}
                >
                    <Text style={formData.dob ? styles.dateText : styles.placeholderText}>
                        {formData.dob || 'Date of Birth'}
                    </Text>
                    <Ionicons name="calendar" size={20} color="#666" />
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="University Name"
                    value={formData.univ_name || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, univ_name: text }))}
                />

                <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowEnrollPicker(true)}
                >
                    <Text style={formData.enrollment_date ? styles.dateText : styles.placeholderText}>
                        {formData.enrollment_date || 'Enrollment Date'}
                    </Text>
                    <Ionicons name="calendar" size={20} color="#666" />
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="Current Semester"
                    value={formData.current_sem?.toString() || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, current_sem: parseInt(text) || undefined }))}
                    keyboardType="numeric"
                />

                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedGender}
                        onValueChange={(itemValue) => setSelectedGender(itemValue)}
                        style={styles.picker}
                    >
                        {genderOptions.map((option) => (
                            <Picker.Item key={option} label={option} value={option} />
                        ))}
                    </Picker>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={submitProfile}
                    disabled={isLoading}
                >
                    <Text style={styles.submitButtonText}>Submit</Text>
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

            {showEnrollPicker && (
                <DateTimePicker
                    value={enrollDate}
                    mode="date"
                    display="default"
                    onChange={onEnrollChange}
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
        backgroundColor: '#fff',
    },
    contentContainer: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }, welcomeText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
        color: '#333',
    },
    testButton: {
        backgroundColor: '#28a745',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignSelf: 'center',
        marginBottom: 16,
    },
    testButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
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
        gap: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    dateInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    dateText: {
        fontSize: 16,
        color: '#000',
    },
    placeholderText: {
        fontSize: 16,
        color: '#999',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    picker: {
        height: 50,
    },
    submitButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#ccc',
    }, submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});