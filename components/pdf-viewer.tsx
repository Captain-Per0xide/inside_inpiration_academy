import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { WebView } from 'react-native-webview';

interface PDFViewerProps {
  pdfUrl: string;
  title: string;
  onBack: () => void;
}

const PDFViewer = ({ pdfUrl, title, onBack }: PDFViewerProps) => {
  const [screenData, setScreenData] = useState(Dimensions.get("window"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  React.useEffect(() => {
    const onChange = (result: { window: any }) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener("change", onChange);
    return () => subscription?.remove();
  }, []);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  // Create a custom HTML viewer that prevents downloads and right-clicks
  const createPDFViewerHTML = (url: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>PDF Viewer</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              background-color: #111827;
              color: white;
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              overflow: hidden;
            }
            
            .container {
              width: 100vw;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            
            .pdf-container {
              flex: 1;
              width: 100%;
              height: 100%;
              border: none;
              background-color: #1F2937;
            }
            
            .error-container {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              padding: 20px;
              text-align: center;
            }
            
            .error-icon {
              font-size: 48px;
              margin-bottom: 16px;
              color: #EF4444;
            }
            
            .error-title {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 8px;
              color: #fff;
            }
            
            .error-text {
              font-size: 14px;
              color: #9CA3AF;
              line-height: 1.5;
            }
            
            /* Disable text selection and context menu */
            * {
              -webkit-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
              user-select: none;
              -webkit-touch-callout: none;
              -webkit-tap-highlight-color: transparent;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div id="pdf-viewer-container">
              <iframe 
                id="pdf-frame"
                src="${url}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&scrollbar=0&view=FitH"
                class="pdf-container"
                frameborder="0"
                allowfullscreen="false"
                webkitallowfullscreen="false"
                mozallowfullscreen="false"
                oncontextmenu="return false;"
                ondragstart="return false;"
                onselectstart="return false;"
              ></iframe>
            </div>
          </div>
          
          <script>
            // Disable right-click context menu
            document.addEventListener('contextmenu', function(e) {
              e.preventDefault();
              return false;
            });
            
            // Disable text selection
            document.addEventListener('selectstart', function(e) {
              e.preventDefault();
              return false;
            });
            
            // Disable drag and drop
            document.addEventListener('dragstart', function(e) {
              e.preventDefault();
              return false;
            });
            
            // Disable keyboard shortcuts for downloading/printing
            document.addEventListener('keydown', function(e) {
              // Disable Ctrl+S (Save), Ctrl+P (Print), F12 (DevTools), etc.
              if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
                e.preventDefault();
                return false;
              }
              if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                e.preventDefault();
                return false;
              }
            });
            
            // Handle PDF load error
            const pdfFrame = document.getElementById('pdf-frame');
            pdfFrame.onerror = function() {
              document.getElementById('pdf-viewer-container').innerHTML = \`
                <div class="error-container">
                  <div class="error-icon">📄</div>
                  <div class="error-title">Unable to load PDF</div>
                  <div class="error-text">
                    The PDF file could not be loaded. Please check your internet connection and try again.
                  </div>
                </div>
              \`;
            };
            
            // Prevent iframe from being accessed directly
            try {
              pdfFrame.onload = function() {
                try {
                  // Additional security measures can be added here
                  console.log('PDF loaded successfully');
                } catch (e) {
                  // Cross-origin restrictions prevent access, which is good for security
                }
              };
            } catch (e) {
              // Handle any errors
            }
          </script>
        </body>
      </html>
    `;
  };

  const isSmallScreen = screenData.width < 600;

  if (error) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { fontSize: isSmallScreen ? 16 : 18 }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.headerSubtitle, { fontSize: isSmallScreen ? 11 : 12 }]}>
              PDF Viewer
            </Text>
          </View>
        </View>

        {/* Error Content */}
        <View style={styles.errorContainer}>
          <Ionicons name="document-text-outline" size={80} color="#EF4444" />
          <Text style={[styles.errorTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
            Unable to load PDF
          </Text>
          <Text style={[styles.errorText, { fontSize: isSmallScreen ? 14 : 16 }]}>
            The PDF file could not be loaded. Please check your internet connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setError(false);
            setLoading(true);
          }}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={[styles.retryButtonText, { fontSize: isSmallScreen ? 14 : 16 }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { fontSize: isSmallScreen ? 16 : 18 }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.headerSubtitle, { fontSize: isSmallScreen ? 11 : 12 }]}>
            PDF Viewer
          </Text>
        </View>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5734" />
          <Text style={[styles.loadingText, { fontSize: isSmallScreen ? 14 : 16 }]}>
            Loading PDF...
          </Text>
        </View>
      )}

      {/* PDF Viewer */}
      <View style={[styles.pdfContainer, loading && styles.hidden]}>
        <WebView
          source={{ html: createPDFViewerHTML(pdfUrl) }}
          style={styles.webview}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          allowsInlineMediaPlayback={false}
          mediaPlaybackRequiresUserAction={true}
          allowsBackForwardNavigationGestures={false}
          bounces={false}
          scrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          javaScriptEnabled={true}
          domStorageEnabled={false}
          allowFileAccess={false}
          allowUniversalAccessFromFileURLs={false}
          mixedContentMode="never"
          onShouldStartLoadWithRequest={(request) => {
            // Only allow the initial PDF load and prevent navigation to other URLs
            return request.url.includes(pdfUrl) || request.url.startsWith('data:');
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    backgroundColor: "#1F2937",
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    zIndex: 1000,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#374151",
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "600",
    marginBottom: 2,
    textAlign: "center",
  },
  headerSubtitle: {
    color: "#9CA3AF",
    textAlign: "center",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
    zIndex: 999,
  },
  loadingText: {
    marginTop: 16,
    color: "#9CA3AF",
    textAlign: "center",
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: "#1F2937",
  },
  hidden: {
    opacity: 0,
  },
  webview: {
    flex: 1,
    backgroundColor: "#1F2937",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  errorTitle: {
    color: "#fff",
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  errorText: {
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: "#FF5734",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default PDFViewer;
