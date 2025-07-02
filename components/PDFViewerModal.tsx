import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useState } from 'react';
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
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleLoadComplete = (numberOfPages: number, filePath: string) => {
        console.log(`PDF loaded: ${numberOfPages} pages`);
    };

    const handleError = (error: any) => {
        console.error('PDF Error:', error);
        Alert.alert('Error', 'Failed to load PDF document');
    };

    const handleFullscreen = async () => {
        try {
            if (!isFullscreen) {
                // Enter fullscreen - landscape
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                setIsFullscreen(true);
            } else {
                // Exit fullscreen - portrait
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                setIsFullscreen(false);
            }
        } catch (error) {
            console.error('Error changing orientation:', error);
        }
    };

    const handleClose = async () => {
        if (isFullscreen) {
            // Make sure to reset orientation when closing
            try {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            } catch (error) {
                console.error('Error resetting orientation:', error);
            }
        }
        setIsFullscreen(false);
        onClose();
    };

    return (
        <>
            <Modal
                visible={visible && !isFullscreen}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={handleClose}
            >
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.titleContainer}>
                            <Text style={styles.title} numberOfLines={1}>
                                {title}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.fullscreenButton} onPress={handleFullscreen}>
                            <Ionicons name="expand" size={24} color="#fff" />
                        </TouchableOpacity>
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

            {/* Fullscreen Modal */}
            <Modal
                visible={visible && isFullscreen}
                animationType="fade"
                presentationStyle="fullScreen"
                supportedOrientations={['landscape', 'portrait']}
                onRequestClose={handleFullscreen}
            >
                <StatusBar hidden />
                <View style={styles.fullscreenContainer}>
                    {/* Fullscreen Header */}
                    <View style={styles.fullscreenHeader}>
                        <TouchableOpacity style={styles.fullscreenCloseButton} onPress={handleClose}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.fullscreenTitleContainer}>
                            <Text style={styles.fullscreenTitle} numberOfLines={1}>
                                {title}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.fullscreenExitButton} onPress={handleFullscreen}>
                            <Ionicons name="contract" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Fullscreen PDF Content */}
                    <View style={styles.fullscreenPdfContainer}>
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
        </>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 50, // Account for status bar
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
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
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    placeholder: {
        width: 40,
    },
    fullscreenButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
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
    // Fullscreen styles
    fullscreenContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    fullscreenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    fullscreenCloseButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenTitleContainer: {
        flex: 1,
        marginHorizontal: 16,
    },
    fullscreenTitle: {
        color: '#F1F5F9',
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    fullscreenExitButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenPdfContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
});

export default PDFViewerModal;
