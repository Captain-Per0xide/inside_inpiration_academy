import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import PDFViewer from '../components/PDFViewer';

const TestPDFViewer = () => {
    const testPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>PDF Viewer Test</Text>
            </View>
            <PDFViewer
                url={testPdfUrl}
                onLoadComplete={(numberOfPages, filePath) => {
                    console.log(`PDF loaded successfully. Pages: ${numberOfPages}`);
                }}
                onError={(error) => {
                    console.error('Failed to load PDF:', error);
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    header: {
        padding: 16,
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F1F5F9',
        textAlign: 'center',
    },
});

export default TestPDFViewer;
