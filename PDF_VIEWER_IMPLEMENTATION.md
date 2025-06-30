# PDF Viewer Implementation

## Overview

This project now includes a fully functional PDF viewer using `react-native-pdf` as recommended in the React Native community. The implementation follows the tutorial best practices and includes all necessary configurations.

## Changes Made

### 1. Package Installation

- Added `react-native-blob-util` - Required dependency for file system access
- Added `@config-plugins/react-native-blob-util` - Config plugin for Expo
- Added `@config-plugins/react-native-pdf` - Config plugin for react-native-pdf

### 2. Configuration Updates

Updated `app.json` to include the required config plugins:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "@config-plugins/react-native-blob-util",
      "@config-plugins/react-native-pdf"
    ]
  }
}
```

### 3. PDFViewer Component

Created a reusable `PDFViewer` component at `components/PDFViewer.tsx` with features:

- Full PDF rendering with native performance
- Page navigation and current page indicator
- Zoom and pan functionality (pinch to zoom, double-tap zoom)
- Error handling with user-friendly messages
- Loading callbacks for integration
- Link press handling
- Configurable scaling and orientation

### 4. Integration with eBooks

Updated `app/materials/ebooks.tsx` to use the new PDFViewer component:

- Replaced WebView-based fallback with native PDF viewer
- Maintained all existing functionality (header, back navigation, etc.)
- Improved user experience with proper PDF rendering

## Features

### PDF Viewer Features

- **Native Performance**: Uses native PDF rendering for smooth scrolling
- **Zoom & Pan**: Supports pinch-to-zoom and double-tap zoom
- **Page Navigation**: Shows current page and total pages
- **Caching**: Automatic PDF caching for faster subsequent loads
- **Error Handling**: Graceful error handling with user feedback
- **Link Support**: Handles PDF internal links and external URLs

### Implementation Benefits

- **Better Performance**: Native rendering vs WebView-based solutions
- **Offline Support**: Cached PDFs work without internet
- **Touch Gestures**: Full touch gesture support for navigation
- **Memory Efficient**: Optimized for mobile memory constraints
- **Customizable**: Easy to theme and customize appearance

## Usage Example

```tsx
import PDFViewer from "@/components/PDFViewer";

const MyComponent = () => {
  return (
    <PDFViewer
      url="https://example.com/document.pdf"
      onLoadComplete={(pages, path) => {
        console.log(`Loaded ${pages} pages`);
      }}
      onError={(error) => {
        console.error("PDF Error:", error);
      }}
    />
  );
};
```

## Development Build Required

Since `react-native-pdf` is a native module, you need to:

1. Run `npx expo prebuild --clean` to generate native code
2. Build a development build using `npx expo run:android` or `npx expo run:ios`
3. Cannot use Expo Go - requires custom development build

## Testing

A test component is available at `components/TestPDFViewer.tsx` for testing the PDF viewer with a sample PDF.

## Next Steps

1. Test on physical devices to ensure performance
2. Add additional PDF viewer controls if needed (e.g., search, annotations)
3. Implement offline PDF download and storage
4. Add PDF sharing and export functionality

## Troubleshooting

### Common Issues

1. **"Cannot read property 'getConstants' of null"**: Ensure you're using a development build, not Expo Go
2. **PDF not loading**: Check network connectivity and PDF URL validity
3. **Build errors**: Run `npx expo prebuild --clean` and rebuild

### Performance Tips

- Enable caching for frequently accessed PDFs
- Use appropriate minScale/maxScale values
- Consider implementing pagination for very large PDFs
