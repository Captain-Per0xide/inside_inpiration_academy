import { supabase } from "@/lib/supabase";
import { authService } from "@/services/authService";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface UserData {
    id?: string;
    email?: string;
    name?: string;
    user_image?: string | null;
    phone_no?: string | null;
    alternative_phone_no?: string | null;
    address?: string | null;
    dob?: string | null;
    univ_name?: string | null;
    gender?: string | null;
}

const ProfileScreen = () => {
    const [userData, setUserData] = useState<UserData>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // Form fields
    const [name, setName] = useState('');
    const [phoneNo, setPhoneNo] = useState('');
    const [alternativePhoneNo, setAlternativePhoneNo] = useState('');
    const [address, setAddress] = useState('');
    const [dob, setDob] = useState('');
    const [univName, setUnivName] = useState('');
    const [userImage, setUserImage] = useState('');
    const [gender, setGender] = useState('');
    
    // Image picker states
    const [pickedImage, setPickedImage] = useState<string | null>(null);

    useEffect(() => {
        fetchUserData();
    }, []);

    const uriToBlob = async (uri: string): Promise<ArrayBuffer> => {
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
            }

            const result = await ImagePicker.launchImageLibraryAsync({
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
        if (!pickedImage) return userImage;

        const path = `User-data/${userId}/profile.jpg`;

        try {
            // Delete old image first if it exists
            if (userImage) {
                console.log('Deleting previous image...');
                await supabase.storage
                    .from('inside-inspiration-academy-assets')
                    .remove([path]);
            }

            console.log('Converting image to ArrayBuffer...');
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
            return userImage ?? null;
        }
    };

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const id = await authService.getCurrentUserUID();
            const email = await authService.getCurrentUserEmail();

            if (!id || !email) {
                Alert.alert("Error", "User not authenticated");
                router.back();
                return;
            }

            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, user_image, phone_no, alternative_phone_no, address, dob, univ_name, gender')
                .eq('id', id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching user data:', error);
                Alert.alert("Error", "Failed to fetch user data");
                return;
            }

            if (data) {
                setUserData(data);
                setName(data.name || '');
                setPhoneNo(data.phone_no || '');
                setAlternativePhoneNo(data.alternative_phone_no || '');
                setAddress(data.address || '');
                setDob(data.dob || '');
                setUnivName(data.univ_name || '');
                setUserImage(data.user_image || '');
                setGender(data.gender || '');
            } else {
                // If no user data exists, create basic profile
                const basicData = { id, email, name: 'User' };
                setUserData(basicData);
                setName('User');
            }
        } catch (error) {
            console.error('Error in fetchUserData:', error);
            Alert.alert("Error", "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            // Try to upload image if a new one was picked
            let uploadedImageUrl = userImage;
            if (pickedImage) {
                try {
                    console.log('Attempting image upload...');
                    const newImageUrl = await uploadImage(userData.id!);
                    if (newImageUrl) {
                        uploadedImageUrl = newImageUrl;
                        console.log('Image upload successful');
                    }
                } catch (imageError) {
                    console.warn('Image upload failed, continuing with profile update:', imageError);
                    // Continue with profile update even if image upload fails
                }
            }
            
            const updateData = {
                phone_no: phoneNo.trim() || null,
                alternative_phone_no: alternativePhoneNo.trim() || null,
                address: address.trim() || null,
                dob: dob.trim() || null,
                univ_name: univName.trim() || null,
                user_image: uploadedImageUrl || null,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', userData.id);

            if (error) {
                throw error;
            }

            // Update local state
            setUserData({ ...userData, ...updateData });
            setUserImage(uploadedImageUrl || '');
            if (pickedImage) {
                setPickedImage(null); // Clear picked image since it's been uploaded
            }
            setEditMode(false);
            
            Alert.alert("Success", "Profile updated successfully", [
                {
                    text: "OK",
                    onPress: () => {
                        // Go back to the previous screen to refresh the drawer
                        router.back();
                    }
                }
            ]);

        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert("Error", "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (editMode) {
            // Reset form fields to original values
            setName(userData.name || '');
            setPhoneNo(userData.phone_no || '');
            setAlternativePhoneNo(userData.alternative_phone_no || '');
            setAddress(userData.address || '');
            setDob(userData.dob || '');
            setUnivName(userData.univ_name || '');
            setUserImage(userData.user_image || '');
            setGender(userData.gender || '');
            setPickedImage(null); // Reset picked image
            setEditMode(false);
        } else {
            // Go back to previous screen
            router.back();
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen
                    options={{
                        headerShown: false,
                    }}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {editMode ? 'Edit Profile' : 'Profile'}
                </Text>
                <TouchableOpacity 
                    style={styles.editButton} 
                    onPress={() => setEditMode(!editMode)}
                >
                    <Ionicons 
                        name={editMode ? "close" : "pencil"} 
                        size={20} 
                        color="#fff" 
                    />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Profile Image Section */}
                <View style={styles.imageSection}>
                    <TouchableOpacity
                        onPress={editMode ? pickImage : undefined}
                        style={styles.imageContainer}
                        disabled={!editMode}
                    >
                        {(pickedImage || userData.user_image) ? (
                            <Image
                                source={{ uri: pickedImage || userData.user_image! }}
                                style={styles.profileImage}
                            />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Text style={styles.placeholderText}>
                                    {userData.name?.charAt(0).toUpperCase() || 'U'}
                                </Text>
                            </View>
                        )}
                        
                        {editMode && (
                            <View style={styles.editIcon}>
                                <Ionicons name="camera" size={18} color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>
                    
                    {editMode && (
                        <Text style={styles.imageHelpText}>
                            Tap the image to change your profile picture
                        </Text>
                    )}
                </View>

                {/* Form Fields */}
                <View style={styles.formSection}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Name *</Text>
                        <Text style={[styles.valueText, styles.disabledText]}>
                            {userData.name || 'Not available'}
                        </Text>
                        <Text style={styles.helperText}>Name cannot be changed</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <Text style={[styles.valueText, styles.disabledText]}>
                            {userData.email || 'Not available'}
                        </Text>
                        <Text style={styles.helperText}>Email cannot be changed</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Gender</Text>
                        <Text style={[styles.valueText, styles.disabledText]}>
                            {userData.gender || 'Not set'}
                        </Text>
                        <Text style={styles.helperText}>Gender cannot be changed</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        {editMode ? (
                            <TextInput
                                style={styles.input}
                                value={phoneNo}
                                onChangeText={setPhoneNo}
                                placeholder="Enter your phone number"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="phone-pad"
                            />
                        ) : (
                            <Text style={styles.valueText}>{userData.phone_no || 'Not set'}</Text>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Alternative Phone Number</Text>
                        {editMode ? (
                            <TextInput
                                style={styles.input}
                                value={alternativePhoneNo}
                                onChangeText={setAlternativePhoneNo}
                                placeholder="Enter alternative phone number"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="phone-pad"
                            />
                        ) : (
                            <Text style={styles.valueText}>{userData.alternative_phone_no || 'Not set'}</Text>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Address</Text>
                        {editMode ? (
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={address}
                                onChangeText={setAddress}
                                placeholder="Enter your address"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={3}
                            />
                        ) : (
                            <Text style={styles.valueText}>{userData.address || 'Not set'}</Text>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Birth</Text>
                        {editMode ? (
                            <TextInput
                                style={styles.input}
                                value={dob}
                                onChangeText={setDob}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#9CA3AF"
                            />
                        ) : (
                            <Text style={styles.valueText}>
                                {userData.dob ? new Date(userData.dob).toLocaleDateString() : 'Not set'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>University Name</Text>
                        {editMode ? (
                            <TextInput
                                style={styles.input}
                                value={univName}
                                onChangeText={setUnivName}
                                placeholder="Enter university name"
                                placeholderTextColor="#9CA3AF"
                            />
                        ) : (
                            <Text style={styles.valueText}>{userData.univ_name || 'Not set'}</Text>
                        )}
                    </View>
                </View>

                {/* Action Buttons */}
                {editMode && (
                    <View style={styles.actionSection}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancel}
                            disabled={saving}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#111827",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 10,
        color: "#9CA3AF",
        fontSize: 16,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingTop: 50,
        backgroundColor: "#1F2937",
        borderBottomWidth: 1,
        borderBottomColor: "#374151",
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "#374151",
    },
    headerTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "600",
        flex: 1,
        textAlign: "center",
    },
    editButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "#3B82F6",
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    imageSection: {
        alignItems: "center",
        marginBottom: 30,
    },
    imageContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#e0e0e0',
    },
    placeholderImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FCCC42',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#fff',
    },
    editIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#3B82F6',
        borderRadius: 16,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#111827',
    },
    imageHelpText: {
        color: "#9CA3AF",
        fontSize: 12,
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 5,
    },
    imageInputSection: {
        width: '100%',
    },
    formSection: {
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: "#F9FAFB",
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
    },
    input: {
        borderWidth: 2,
        borderColor: "#4B5563",
        borderRadius: 12,
        padding: 16,
        backgroundColor: "#374151",
        color: "#F9FAFB",
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    valueText: {
        color: "#D1D5DB",
        fontSize: 16,
        padding: 16,
        backgroundColor: "#374151",
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#4B5563",
    },
    disabledText: {
        opacity: 0.6,
    },
    helperText: {
        color: "#9CA3AF",
        fontSize: 12,
        marginTop: 4,
        fontStyle: 'italic',
    },
    actionSection: {
        flexDirection: "row",
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#6B7280",
        alignItems: "center",
    },
    cancelButtonText: {
        color: "#F9FAFB",
        fontSize: 16,
        fontWeight: "600",
    },
    saveButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#3B82F6",
        alignItems: "center",
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    disabledButton: {
        opacity: 0.6,
    },
});

export default ProfileScreen;
