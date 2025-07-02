import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import React from 'react';
import {
    Alert,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import PDFViewer from './PDFViewer';

interface PDFViewerModalProps {
    visible: boolean;
    pdfUrl: string;
    title: string;
    onClose: () => void;
}

const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
    visible,
    pdfUrl,
    title,
    onClose,
}) => {
    const handleLoadComplete = (numberOfPages: number, filePath: string) => {
        console.log(`PDF loaded: ${numberOfPages} pages`);
    };

    const handleError = (error: any) => {
        console.error('PDF Error:', error);
        Alert.alert('Error', 'Failed to load PDF document');
    };

    // Auto-rotate: unlock all orientations when modal opens
    React.useEffect(() => {
        if (visible) {
            // Allow all orientations when PDF is open
            ScreenOrientation.unlockAsync();
        } else {
            // Lock to portrait when not viewing PDF
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }
    }, [visible]);

    const handleClose = async () => {
        // Reset orientation to portrait when closing
        try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        } catch (error) {
            console.error('Error resetting orientation:', error);
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            supportedOrientations={['landscape', 'portrait']}
            onRequestClose={handleClose}
        >
            <StatusBar hidden />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title} numberOfLines={1}>
                            {title}
                        </Text>
                    </View>
                    <View style={styles.placeholder} />
                </View>

                {/* PDF Content */}
                <View style={styles.pdfContainer}>
                    {pdfUrl ? (
                        <PDFViewer
                            url={pdfUrl}
                            onLoadComplete={handleLoadComplete}
                            onError={handleError}
                        />
                    ) : (
                        <View style={styles.errorContainer}>
                            <Ionicons name="document-outline" size={64} color="#6B7280" />
                            <Text style={styles.errorText}>No PDF URL provided</Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    closeButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        flex: 1,
        marginHorizontal: 16,
    },
    title: {
        color: '#F1F5F9',
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    placeholder: {
        width: 48,
    },
    pdfContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorText: {
        color: '#9CA3AF',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 16,
    },
});

export default PDFViewerModal;
