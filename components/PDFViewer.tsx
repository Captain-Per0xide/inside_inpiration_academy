import React, { useEffect, useState } from 'react';
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
    const [screenData, setScreenData] = useState(Dimensions.get('window'));

    useEffect(() => {
        const onChange = (result: { window: any, screen: any }) => {
            setScreenData(result.window);
        };

        const subscription = Dimensions.addEventListener('change', onChange);
        return () => subscription?.remove();
    }, []);

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

    // Calculate if we're in landscape mode
    const isLandscape = screenData.width > screenData.height;
    const pageIndicatorHeight = totalPages > 1 ? 50 : 0;

    return (
        <View style={styles.container}>
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
                style={[styles.pdf, {
                    width: screenData.width,
                    height: screenData.height - pageIndicatorHeight - (isLandscape ? 60 : 100), // Adjust for header
                }]}
                trustAllCerts={false}
                enablePaging={true}
                spacing={0}
                minScale={0.25}
                maxScale={8.0}
                scale={isLandscape ? 0.8 : 1.0}
                horizontal={false}
                showsHorizontalScrollIndicator={true}
                showsVerticalScrollIndicator={true}
                enableRTL={false}
                enableDoubleTapZoom={true}
                singlePage={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    pdf: {
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
