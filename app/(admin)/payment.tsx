import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PaymentInfo {
  id: number;
  phone_number: string;
  upi_id: string;
  qr_code: string;
  created_at: string;
}

const PaymentManagementPage = () => {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get("window"));

  // Form state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [upiId, setUpiId] = useState("");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [pickedQrImage, setPickedQrImage] = useState<string | null>(null);

  useEffect(() => {
    const onChange = (result: { window: any }) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener("change", onChange);
    return () => subscription?.remove();
  }, []);

  const fetchPaymentInfo = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("payment_info")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching payment info:", error);
        Alert.alert("Error", "Failed to fetch payment information");
        return;
      }

      if (data) {
        setPaymentInfo(data);
        setPhoneNumber(data.phone_number);
        setUpiId(data.upi_id);
        setQrImage(data.qr_code);
      } else {
        // No payment info exists yet
        setPaymentInfo(null);
        setPhoneNumber("");
        setUpiId("");
        setQrImage(null);
      }
    } catch (error) {
      console.error("Error in fetchPaymentInfo:", error);
      Alert.alert("Error", "Failed to fetch payment information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentInfo();
  }, [fetchPaymentInfo]);

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

  const uploadQrImage = async (): Promise<string | null> => {
    if (!pickedQrImage) return qrImage;

    const path = "Payment-Info/qr.png";

    try {
      // Delete old QR image first if it exists
      console.log("Removing previous QR image if exists...");
      await supabase.storage
        .from("inside-inspiration-academy-assets")
        .remove([path]);

      console.log("Converting QR image to ArrayBuffer...");
      const arrayBuffer = await uriToBlob(pickedQrImage);

      console.log("Uploading new QR image...");
      const { error } = await supabase.storage
        .from("inside-inspiration-academy-assets")
        .upload(path, arrayBuffer, {
          cacheControl: "3600",
          contentType: "image/png",
          upsert: true,
        });

      if (error) {
        console.error("QR image upload error:", error);
        return qrImage ?? null;
      }

      const { data } = supabase.storage
        .from("inside-inspiration-academy-assets")
        .getPublicUrl(path);

      console.log("QR Upload successful, public URL:", data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error("QR Image upload error:", error);
      return qrImage ?? null;
    }
  };

  const pickQrImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload QR code image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setPickedQrImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking QR image:", error);
      Alert.alert("Error", "Failed to pick QR image");
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!phoneNumber.trim()) {
      errors.push("Phone number is required");
    } else if (phoneNumber.trim().length < 10) {
      errors.push("Phone number must be at least 10 digits");
    }

    if (!upiId.trim()) {
      errors.push("UPI ID is required");
    } else if (!upiId.trim().includes("@")) {
      errors.push("UPI ID must contain @ symbol");
    }

    if (!qrImage && !pickedQrImage) {
      errors.push("QR code image is required");
    }

    if (errors.length > 0) {
      Alert.alert("Validation Error", errors.join("\n"));
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      // Upload QR image if a new one was picked
      let qrCodeUrl = qrImage;
      if (pickedQrImage) {
        const uploadedUrl = await uploadQrImage();
        if (!uploadedUrl) {
          Alert.alert("Error", "Failed to upload QR code image");
          setSaving(false);
          return;
        }
        qrCodeUrl = uploadedUrl;
      }

      const paymentData = {
        phone_number: phoneNumber.trim(),
        upi_id: upiId.trim(),
        qr_code: qrCodeUrl!,
      };

      if (paymentInfo) {
        // Update existing payment info
        const { error } = await supabase
          .from("payment_info")
          .update(paymentData)
          .eq("id", paymentInfo.id);

        if (error) {
          console.error("Error updating payment info:", error);
          Alert.alert("Error", "Failed to update payment information");
          return;
        }
      } else {
        // Insert new payment info
        const { error } = await supabase
          .from("payment_info")
          .insert([paymentData]);

        if (error) {
          console.error("Error inserting payment info:", error);
          Alert.alert("Error", "Failed to save payment information");
          return;
        }
      }

      // Update local state
      setQrImage(qrCodeUrl);
      if (pickedQrImage) {
        setPickedQrImage(null);
      }

      Alert.alert("Success", "Payment information updated successfully!", [
        {
          text: "OK",
          onPress: () => fetchPaymentInfo(),
        },
      ]);
    } catch (error) {
      console.error("Error in handleSave:", error);
      Alert.alert("Error", "Failed to save payment information");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E4064" />
        <Text style={styles.loadingText}>Loading payment information...</Text>
      </View>
    );
  }

  const isSmallScreen = screenData.width < 600;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={[styles.title, { fontSize: isSmallScreen ? 24 : 28 }]}>
        Payment Information
      </Text>

      <Text style={[styles.subtitle, { fontSize: isSmallScreen ? 14 : 16 }]}>
        Configure payment details for student payments
      </Text>

      {/* Form Card */}
      <View style={styles.formCard}>
        {/* Phone Number */}
        <View style={styles.inputContainer}>
          <Text
            style={[styles.inputLabel, { fontSize: isSmallScreen ? 14 : 16 }]}
          >
            Phone Number
          </Text>
          <TextInput
            style={[styles.textInput, { fontSize: isSmallScreen ? 14 : 16 }]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter phone number"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />
        </View>

        {/* UPI ID */}
        <View style={styles.inputContainer}>
          <Text
            style={[styles.inputLabel, { fontSize: isSmallScreen ? 14 : 16 }]}
          >
            UPI ID
          </Text>
          <TextInput
            style={[styles.textInput, { fontSize: isSmallScreen ? 14 : 16 }]}
            value={upiId}
            onChangeText={setUpiId}
            placeholder="Enter UPI ID (e.g., user@paytm)"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
          />
        </View>

        {/* QR Code Upload */}
        <View style={styles.inputContainer}>
          <Text
            style={[styles.inputLabel, { fontSize: isSmallScreen ? 14 : 16 }]}
          >
            QR Code Image
          </Text>

          <TouchableOpacity onPress={pickQrImage} style={styles.uploadButton}>
            <Ionicons name="cloud-upload-outline" size={24} color="#2E4064" />
            <Text
              style={[
                styles.uploadButtonText,
                { fontSize: isSmallScreen ? 14 : 16 },
              ]}
            >
              {pickedQrImage || qrImage ? "Change QR Code" : "Upload QR Code"}
            </Text>
          </TouchableOpacity>

          {(pickedQrImage || qrImage) && (
            <View style={styles.imagePreview}>
              <Image
                source={{
                  uri: pickedQrImage || qrImage || "",
                }}
                style={[
                  styles.previewImage,
                  {
                    width: isSmallScreen ? 150 : 200,
                    height: isSmallScreen ? 150 : 200,
                  },
                ]}
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  setPickedQrImage(null);
                  if (!paymentInfo) {
                    setQrImage(null);
                  }
                }}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="save-outline" size={20} color="#fff" />
          )}
          <Text
            style={[
              styles.saveButtonText,
              { fontSize: isSmallScreen ? 14 : 16 },
            ]}
          >
            {saving
              ? "Saving..."
              : paymentInfo
              ? "Update Information"
              : "Save Information"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Current Info Display */}
      {paymentInfo && (
        <View style={styles.currentInfoCard}>
          <Text
            style={[
              styles.currentInfoTitle,
              { fontSize: isSmallScreen ? 16 : 18 },
            ]}
          >
            Current Payment Information
          </Text>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color="#10B981" />
            <Text
              style={[styles.infoText, { fontSize: isSmallScreen ? 14 : 16 }]}
            >
              {paymentInfo.phone_number}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={16} color="#10B981" />
            <Text
              style={[styles.infoText, { fontSize: isSmallScreen ? 14 : 16 }]}
            >
              {paymentInfo.upi_id}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#9CA3AF" />
            <Text
              style={[
                styles.infoDateText,
                { fontSize: isSmallScreen ? 12 : 14 },
              ]}
            >
              Last updated:{" "}
              {new Date(paymentInfo.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#9CA3AF",
  },
  title: {
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: "#1F2937",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "#fff",
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#374151",
    borderWidth: 1,
    borderColor: "#4B5563",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
  },
  uploadButton: {
    backgroundColor: "#374151",
    borderWidth: 2,
    borderColor: "#2E4064",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  uploadButtonText: {
    color: "#2E4064",
    fontWeight: "600",
    marginLeft: 8,
  },
  imagePreview: {
    marginTop: 12,
    position: "relative",
    alignItems: "center",
  },
  previewImage: {
    borderRadius: 8,
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#1F2937",
    borderRadius: 12,
  },
  saveButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#6B7280",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  currentInfoCard: {
    backgroundColor: "#1F2937",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  currentInfoTitle: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "500",
  },
  infoDateText: {
    color: "#9CA3AF",
    marginLeft: 8,
  },
});

export default PaymentManagementPage;
