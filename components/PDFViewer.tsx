import React, { useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, View } from 'react-native';
import PDF from 'react-native-pdf';

interface PDFViewerProps {
    url: string;
    onLoadComplete?: (numberOfPages: number, filePath: string) => void;
    onError?: (error: any) => void;
}

const PDFViewer = ({ url, onLoadComplete, onError }: PDFViewerProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    const handleLoadComplete = (numberOfPages: number, filePath: string) => {
        console.log(`PDF loaded. Pages: ${numberOfPages}`);
        setTotalPages(numberOfPages);
        onLoadComplete?.(numberOfPages, filePath);
    };

    const handleError = (error: any) => {
        console.error('PDF load error: ', error);
        Alert.alert('Error', 'Failed to load PDF. Please try again.');
        onError?.(error);
    };

    const handlePageChanged = (page: number, numberOfPages: number) => {
        setCurrentPage(page);
    };

    const handlePressLink = (uri: string) => {
        console.log(`Link pressed: ${uri}`);
    };

    return (
        <View style={{ flex: 1 }}>
            {totalPages > 1 && (
                <View style={styles.pageIndicator}>
                    <Text style={styles.pageText}>
                        Page {currentPage} of {totalPages}
                    </Text>
                </View>
            )}
            <PDF
                source={{ uri: url, cache: true }}
                onLoadComplete={handleLoadComplete}
                onPageChanged={handlePageChanged}
                onError={handleError}
                onPressLink={handlePressLink}
                style={styles.pdf}
                trustAllCerts={false}
                enablePaging={true}
                spacing={0}
                minScale={1.0}
                maxScale={3.0}
                scale={1.0}
                horizontal={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                enableRTL={false}
                enableDoubleTapZoom={true}
                singlePage={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    pdf: {
        flex: 1,
        width: Dimensions.get('window').width,
        backgroundColor: '#0F172A',
    },
    pageIndicator: {
        backgroundColor: '#1E293B',
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    pageText: {
        fontSize: 14,
        color: '#F1F5F9',
        fontWeight: '600',
    },
});

export default PDFViewer;
