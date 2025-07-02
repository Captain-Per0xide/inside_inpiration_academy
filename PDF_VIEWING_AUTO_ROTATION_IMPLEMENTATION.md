# PDF Viewing with Auto-Rotation Implementation

## Overview

Implemented a new PDF viewing experience for the `all-videos.tsx` page that matches the eBooks page pattern, featuring direct navigation to a full PDF viewer (no modal) with automatic screen orientation based on device sensor.

## Key Changes Made

### 1. Import Updates

```tsx
// Replaced PDFViewerModal with PDFViewer and added SafeAreaView
import PDFViewer from "@/components/PDFViewer";
import * as ScreenOrientation from "expo-screen-orientation";
import { SafeAreaView } from "react-native";
```

### 2. State Management Refactoring

**Removed:**

- `showPDFModal`
- `currentPDFUrl`
- `currentPDFTitle`

**Added:**

```tsx
const [selectedPDF, setSelectedPDF] = useState<{
  url: string;
  title: string;
  type: "notes" | "assignment";
} | null>(null);
```

### 3. Navigation Pattern (Similar to eBooks)

**Conditional Rendering:**

```tsx
// If PDF is selected, show PDF viewer
if (selectedPDF) {
    return renderPDFViewer();
}

// Otherwise show video list
return (
    // Main video list component
);
```

**Back Button Handling:**

```tsx
const handleBack = () => {
  if (selectedPDF) {
    setSelectedPDF(null); // Close PDF viewer
  } else {
    router.back(); // Navigate back to previous screen
  }
};
```

### 4. Auto-Rotation Implementation

**Orientation Control:**

```tsx
useEffect(() => {
  const handleOrientation = async () => {
    if (selectedPDF) {
      // Allow all orientations when PDF is open
      await ScreenOrientation.unlockAsync();
    } else {
      // Lock to portrait when not viewing PDF
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    }
  };

  handleOrientation();

  // Cleanup function to reset orientation when component unmounts
  return () => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  };
}, [selectedPDF]);
```

### 5. PDF Viewer Component

**Direct PDF Rendering:**

```tsx
const renderPDFViewer = () => {
    if (!selectedPDF) return null;

    return (
        <SafeAreaView style={styles.pdfContainer}>
            <View style={styles.pdfHeader}>
                <TouchableOpacity onPress={handleBack} style={styles.pdfBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
                </TouchableOpacity>
                <Text style={styles.pdfTitle} numberOfLines={1}>
                    {selectedPDF.title}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <PDFViewer
                url={selectedPDF.url}
                onLoadComplete={(numberOfPages, filePath) => {
                    console.log(\`PDF loaded. Pages: \${numberOfPages}\`);
                }}
                onError={(error) => {
                    console.error('PDF load error: ', error);
                    Alert.alert('Error', 'Failed to load PDF. Please try again.');
                }}
            />
        </SafeAreaView>
    );
};
```

### 6. Enhanced Resource Button Handlers

**Updated PDF Handling:**

```tsx
const handleViewPDF = (url: string, title: string, type: 'notes' | 'assignment' = 'notes') => {
    if (!url) {
        Alert.alert("Error", "PDF URL not available");
        return;
    }
    setSelectedPDF({ url, title, type });
};

// Class Notes Button
onPress={() => handleViewPDF(video.class_notes_url!, 'Class Notes - ' + video.title, 'notes')}

// Assignment Button
onPress={() => handleViewPDF(video.assignment_url!, 'Assignment - ' + video.title, 'assignment')}
```

### 7. Styling for PDF Viewer

**Added Styles:**

```tsx
pdfContainer: {
    flex: 1,
    backgroundColor: '#111827',
},
pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
},
pdfBackButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
},
pdfTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
    textAlign: 'center',
    marginHorizontal: 16,
},
```

## User Experience Improvements

### 1. **No Modal Interruption**

- Direct navigation similar to eBooks page
- Seamless transition between video list and PDF viewing
- Consistent UI/UX pattern across the app

### 2. **Automatic Orientation**

- Device sensor-based rotation when viewing PDFs
- Unlocks all orientations for optimal PDF reading
- Automatically locks back to portrait when returning to video list

### 3. **Enhanced Navigation**

- Back button intelligently handles PDF viewing state
- Clean state management with proper cleanup
- Smooth transitions without modal animations

### 4. **Type Safety**

- Added PDF type distinction ('notes' | 'assignment')
- Proper TypeScript interfaces
- Enhanced error handling

## Dependencies

- `expo-screen-orientation`: For automatic rotation control
- `@/components/PDFViewer`: Core PDF viewing component
- `react-native`: SafeAreaView for proper screen handling

## Orientation Behavior

1. **Video List View**: Locked to portrait orientation
2. **PDF View**: All orientations unlocked, responds to device sensor
3. **Component Unmount**: Automatically resets to portrait orientation

## Error Handling

- URL validation before opening PDF
- Proper error alerts for failed PDF loads
- Loading state management
- Graceful fallbacks for missing resources

This implementation provides a native, sensor-responsive PDF viewing experience that matches the established eBooks pattern while eliminating modal complexity and ensuring optimal user experience across different device orientations.
