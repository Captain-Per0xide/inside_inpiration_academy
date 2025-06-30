import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from "expo-file-system";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import PDFViewer from "./pdf-viewer";

// Test function
const testSupabaseConnection = async () => {
  console.log('🧪 Testing Supabase connection...');
  
  try {
    // First test: Check if we can list files (read access)
    console.log('Testing read access...');
    const { data: listData, error: listError } = await supabase.storage
      .from('inside-inspiration-academy-assets')
      .list('', { limit: 1 });
    
    if (listError) {
      console.error('❌ Read access failed:', listError);
      Alert.alert('Read Test Failed', `Cannot read from storage: ${listError.message}`);
      return;
    }
    
    console.log('✅ Read access working');
    
    // Second test: Try to upload a simple file
    console.log('Testing write access...');
    const testContent = 'test-content';
    const testPath = `test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('inside-inspiration-academy-assets')
      .upload(testPath, testContent, {
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
      
      // Specific error handling for RLS
      if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('Unauthorized')) {
        Alert.alert(
          'Permission Error', 
          'Storage permissions not configured properly. Please:\n\n1. Go to Supabase Dashboard\n2. Storage > Settings\n3. Edit your bucket\n4. Disable RLS or add proper policies\n\nSee STORAGE_RLS_FIX.md for details.'
        );
      } else {
        Alert.alert('Upload Test Failed', `Upload test failed: ${uploadError.message}`);
      }
      return;
    }
    
    console.log('✅ Test upload successful');
    Alert.alert('All Tests Passed! ✅', 'Supabase connection and upload working correctly!');
    
    // Clean up test file
    await supabase.storage
      .from('inside-inspiration-academy-assets')
      .remove([testPath]);
    
  } catch (error) {
    console.error('❌ Test error:', error);
    Alert.alert('Test Error', `Connection test failed: ${error}`);
  }
};

// File conversion function (same as in add-courses.tsx)
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

interface EBook {
  id: string;
  title: string;
  description?: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileExtension: string;
  uploaded_at: string;
  uploaded_by: string;
  metadata?: {
    originalName?: string;
    mimeType?: string;
    storagePath?: string;
  };
}

interface EBooksUploadProps {
  courseId: string;
  courseName: string;
  onBack: () => void;
}

const EBooksUpload = ({ courseId, courseName, onBack }: EBooksUploadProps) => {
  const [screenData, setScreenData] = useState(Dimensions.get("window"));
  const [activeTab, setActiveTab] = useState<'upload' | 'view'>('upload');
  const [eBooks, setEBooks] = useState<EBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewingPDF, setViewingPDF] = useState<{ url: string; title: string } | null>(null);
  
  // Upload form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);

  useEffect(() => {
    const onChange = (result: { window: any }) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener("change", onChange);
    return () => subscription?.remove();
  }, []);

  const fetchEBooks = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('courses')
        .select('eBooks')
        .eq('id', courseId)
        .single();

      if (error) {
        console.error('Error fetching eBooks:', error);
        Alert.alert('Error', 'Failed to fetch eBooks');
        return;
      }

      // Extract eBooks array from the course data and sort by upload timestamp
      const eBooksArray = data?.eBooks || [];
      const sortedEBooks = eBooksArray.sort((a: any, b: any) => 
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      );
      
      setEBooks(sortedEBooks);
    } catch (error) {
      console.error('Error in fetchEBooks:', error);
      Alert.alert('Error', 'Failed to fetch eBooks');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (activeTab === 'view') {
      fetchEBooks();
    }
  }, [activeTab, fetchEBooks]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Check if it's a PDF file
        if (!file.mimeType?.includes('pdf') && !file.name?.toLowerCase().endsWith('.pdf')) {
          Alert.alert('Invalid File Type', 'Please select a PDF file only.');
          return;
        }
        
        setSelectedFile(result);
        
        // Auto-fill title if not already set
        if (!title && file.name) {
          const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
          setTitle(nameWithoutExtension);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadEBook = async () => {
    if (!selectedFile || !selectedFile.assets || selectedFile.assets.length === 0) {
      Alert.alert('Error', 'Please select a file');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    // Test Supabase connection first
    try {
      console.log('Testing Supabase connection...');
      console.log('Supabase URL configured:', !!process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log('Supabase Key configured:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
      
      const { data: testData, error: testError } = await supabase.storage
        .from('inside-inspiration-academy-assets')
        .list('', { limit: 1 });
      
      if (testError) {
        console.error('Supabase connection test failed:', testError);
        Alert.alert('Connection Error', `Unable to connect to storage: ${testError.message}`);
        return;
      }
      
      console.log('Supabase connection successful, found items:', testData?.length || 0);
    } catch (connectionError) {
      console.error('Connection test error:', connectionError);
      Alert.alert('Connection Error', 'Unable to connect to storage. Please check your internet connection and try again.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Check if Supabase client is properly initialized
      if (!supabase) {
        Alert.alert('Configuration Error', 'Supabase client is not properly initialized');
        return;
      }
      
      console.log('Starting upload process...');
      
      const file = selectedFile.assets[0];
      
      // Create a unique filename
      const fileExtension = file.name?.split('.').pop()?.toLowerCase() || 'pdf';
      
      // Ensure it's a PDF file
      if (fileExtension !== 'pdf') {
        Alert.alert('Error', 'Only PDF files are supported');
        return;
      }
      
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      
      // Upload file to Supabase Storage with the specified path structure
      const storagePath = `Course-data/${courseId}/eBooks/${uniqueFileName}`;
      
      console.log('Uploading file to path:', storagePath);
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.mimeType,
        uri: file.uri
      });
      
      // Smart folder creation and navigation logic
      try {
        console.log('Checking folder structure and creating if needed...');
        
        // Step 1: Check if Course-data folder exists
        console.log('Checking Course-data folder...');
        const { data: courseFolderData, error: courseFolderError } = await supabase.storage
          .from('inside-inspiration-academy-assets')
          .list('Course-data', { limit: 1 });
        
        if (courseFolderError && courseFolderError.message?.includes('not found')) {
          console.log('Course-data folder does not exist, creating it...');
          // Create Course-data folder
          await supabase.storage
            .from('inside-inspiration-academy-assets')
            .upload('Course-data/.gitkeep', new Blob(['']), {
              upsert: true,
              contentType: 'text/plain'
            });
          console.log('Course-data folder created');
        } else {
          console.log('Course-data folder exists or accessible');
        }
        
        // Step 2: Check if specific course folder exists
        console.log(`Checking Course-data/${courseId} folder...`);
        const { data: specificCourseData, error: specificCourseError } = await supabase.storage
          .from('inside-inspiration-academy-assets')
          .list(`Course-data/${courseId}`, { limit: 1 });
        
        if (specificCourseError && specificCourseError.message?.includes('not found')) {
          console.log(`Course folder for ${courseId} does not exist, creating it...`);
          // Create specific course folder
          await supabase.storage
            .from('inside-inspiration-academy-assets')
            .upload(`Course-data/${courseId}/.gitkeep`, new Blob(['']), {
              upsert: true,
              contentType: 'text/plain'
            });
          console.log(`Course-data/${courseId} folder created`);
        } else {
          console.log(`Course-data/${courseId} folder exists or accessible`);
        }
        
        // Step 3: Check if eBooks folder exists
        console.log(`Checking Course-data/${courseId}/eBooks folder...`);
        const { data: eBooksData, error: eBooksError } = await supabase.storage
          .from('inside-inspiration-academy-assets')
          .list(`Course-data/${courseId}/eBooks`, { limit: 1 });
        
        if (eBooksError && eBooksError.message?.includes('not found')) {
          console.log(`eBooks folder does not exist, creating it...`);
          // Create eBooks folder
          await supabase.storage
            .from('inside-inspiration-academy-assets')
            .upload(`Course-data/${courseId}/eBooks/.gitkeep`, new Blob(['']), {
              upsert: true,
              contentType: 'text/plain'
            });
          console.log(`Course-data/${courseId}/eBooks folder created`);
        } else {
          console.log(`Course-data/${courseId}/eBooks folder exists and ready for upload`);
        }
        
        console.log('Folder structure verified and ready!');
        
      } catch (folderCreationError) {
        console.log('Folder creation process completed with notes:', folderCreationError);
        // Continue anyway - the main upload should still work
      }
      
      // Simulate upload progress since Supabase doesn't provide built-in progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) {
            return 85; // Stop at 85% until actual upload completes
          }
          // Slower progress as it gets higher (more realistic)
          const increment = prev < 30 ? Math.random() * 15 : 
                           prev < 60 ? Math.random() * 10 : 
                           Math.random() * 5;
          return Math.min(prev + increment, 85);
        });
      }, 150);
      
      // Use the proven file upload method from add-courses.tsx
      console.log('Converting PDF to ArrayBuffer...');
      const arrayBuffer = await uriToBlob(file.uri);
      
      console.log('Uploading PDF to Supabase...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('inside-inspiration-academy-assets')
        .upload(storagePath, arrayBuffer, {
          cacheControl: '3600',
          contentType: file.mimeType || 'application/pdf',
          upsert: false // Don't overwrite existing files
        });

      // Clear the progress interval
      clearInterval(progressInterval);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        console.error('Failed to upload to path:', storagePath);
        
        // Handle different types of errors
        let errorMessage = 'Failed to upload file';
        
        if (uploadError && typeof uploadError === 'object') {
          const error = uploadError as any;
          console.error('Error details:', {
            message: error.message,
            name: error.name
          });
          
          // Handle RLS/Permission errors specifically
          if (error.message?.includes('row-level security') || error.message?.includes('Unauthorized') || error.statusCode === 403) {
            errorMessage = 'Upload permission denied. Please check storage permissions in Supabase Dashboard. See STORAGE_RLS_FIX.md for help.';
          } else if (error.message?.includes('Duplicate')) {
            errorMessage = 'A file with this name already exists. Please try again.';
          } else if (error.message?.includes('size')) {
            errorMessage = 'File size is too large. Please select a smaller PDF file.';
          } else if (error.message?.includes('type')) {
            errorMessage = 'Invalid file type. Please select a PDF file only.';
          } else if (error.message) {
            errorMessage = `Upload failed: ${error.message}`;
          }
        } else if (typeof uploadError === 'string') {
          errorMessage = uploadError;
        }
        
        setUploadProgress(0);
        Alert.alert('Upload Error', errorMessage);
        return;
      }

      if (!uploadData) {
        console.error('Upload completed but no data returned');
        setUploadProgress(0);
        Alert.alert('Upload Error', 'Upload completed but no data returned');
        return;
      }

      console.log('File uploaded successfully:', uploadData);
      console.log('Upload path:', uploadData.path);

      // Set to 100% when upload is successful
      setUploadProgress(100);
      
      // Small delay to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 300));

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('inside-inspiration-academy-assets')
        .getPublicUrl(uploadData.path);

      console.log('Generated public URL:', urlData.publicUrl);
      console.log('Storage path used:', uploadData.path);

      // Create eBook object to add to the array
      const newEBook = {
        id: `ebook_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: title.trim(),
        description: description.trim() || null,
        filePath: urlData.publicUrl,
        fileName: uniqueFileName, // Use the actual uploaded filename for consistency
        fileSize: file.size || 0,
        fileExtension: fileExtension,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'admin', // TODO: Get from auth context
        metadata: {
          originalName: file.name,
          mimeType: file.mimeType || 'application/pdf',
          storagePath: storagePath
        }
      };

      // First, get the current eBooks array from the course
      const { data: courseData, error: fetchError } = await supabase
        .from('courses')
        .select('eBooks')
        .eq('id', courseId)
        .single();

      if (fetchError) {
        console.error('Fetch course error:', fetchError);
        Alert.alert('Error', 'Failed to fetch course data');
        return;
      }

      // Add new eBook to the existing array
      const currentEBooks = courseData?.eBooks || [];
      const updatedEBooks = [...currentEBooks, newEBook];

      // Update the course with the new eBooks array
      const { error: updateError } = await supabase
        .from('courses')
        .update({ eBooks: updatedEBooks })
        .eq('id', courseId);

      if (updateError) {
        console.error('Database update error:', updateError);
        console.error('Failed to save eBook metadata for course:', courseId);
        Alert.alert('Error', `Failed to save eBook metadata: ${updateError.message}`);
        return;
      }

      console.log('eBook metadata saved successfully to database');
      console.log('Updated eBooks array length:', updatedEBooks.length);

      Alert.alert('Success', 'eBook uploaded successfully!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Switch to view tab and refresh
      setActiveTab('view');
      fetchEBooks();
      
    } catch (error) {
      console.error('Error uploading eBook:', error);
      setUploadProgress(0);
      Alert.alert('Error', 'Failed to upload eBook');
    } finally {
      setUploading(false);
    }
  };

  const deleteEBook = async (eBook: EBook) => {
    Alert.alert(
      'Delete eBook',
      `Are you sure you want to delete "${eBook.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // First, get the current eBooks array from the course
              const { data: courseData, error: fetchError } = await supabase
                .from('courses')
                .select('eBooks')
                .eq('id', courseId)
                .single();

              if (fetchError) {
                console.error('Error fetching course data:', fetchError);
                Alert.alert('Error', 'Failed to fetch course data');
                return;
              }

              // Remove the eBook from the array
              const currentEBooks = courseData?.eBooks || [];
              const updatedEBooks = currentEBooks.filter((item: any) => item.id !== eBook.id);

              // Update the course with the filtered eBooks array
              const { error: updateError } = await supabase
                .from('courses')
                .update({ eBooks: updatedEBooks })
                .eq('id', courseId);

              if (updateError) {
                console.error('Error updating course:', updateError);
                Alert.alert('Error', 'Failed to delete eBook from database');
                return;
              }

              // Delete file from storage (extract path from metadata or filePath)
              const storagePath = eBook.metadata?.storagePath || `Course-data/${courseId}/eBooks/${eBook.fileName}`;
              
              await supabase.storage
                .from('inside-inspiration-academy-assets')
                .remove([storagePath]);

              Alert.alert('Success', 'eBook deleted successfully');
              fetchEBooks();
            } catch (error) {
              console.error('Error deleting eBook:', error);
              Alert.alert('Error', 'Failed to delete eBook');
            }
          }
        }
      ]
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderEBookCard = ({ item }: { item: EBook }) => {
    const isSmallScreen = screenData.width < 600;
    
    return (
      <View style={styles.eBookCard}>
        <View style={styles.eBookHeader}>
          <View style={styles.eBookIcon}>
            <Ionicons name="book" size={24} color="#1976D2" />
          </View>
          <View style={styles.eBookInfo}>
            <Text style={[styles.eBookTitle, { fontSize: isSmallScreen ? 16 : 18 }]} numberOfLines={2}>
              {item.title}
            </Text>
            {item.description && (
              <Text style={[styles.eBookDescription, { fontSize: isSmallScreen ? 12 : 14 }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.eBookMeta}>
              <Text style={[styles.eBookMetaText, { fontSize: isSmallScreen ? 11 : 12 }]}>
                {formatFileSize(item.fileSize)}
              </Text>
              <Text style={[styles.eBookMetaText, { fontSize: isSmallScreen ? 11 : 12 }]}>
                {new Date(item.uploaded_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.eBookActions}>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => {
              // Open PDF in custom viewer
              setViewingPDF({ url: item.filePath, title: item.title });
            }}
          >
            <Ionicons name="eye" size={16} color="#FF5734" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => deleteEBook(item)}
          >
            <Ionicons name="trash" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderUploadTab = () => {
    const isSmallScreen = screenData.width < 600;
    
    return (
      <ScrollView style={styles.uploadContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { fontSize: isSmallScreen ? 14 : 16 }]}>Title *</Text>
          <TextInput
            style={[styles.input, { fontSize: isSmallScreen ? 14 : 16 }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter eBook title"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { fontSize: isSmallScreen ? 14 : 16 }]}>Description</Text>
          <TextInput
            style={[styles.textArea, { fontSize: isSmallScreen ? 14 : 16 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter description (optional)"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { fontSize: isSmallScreen ? 14 : 16 }]}>File *</Text>
          <TouchableOpacity style={styles.filePicker} onPress={pickDocument}>
            <View style={styles.filePickerContent}>
              <Ionicons name="document" size={24} color="#6B7280" />
              <Text style={[styles.filePickerText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                {selectedFile && selectedFile.assets && selectedFile.assets[0]?.name 
                  ? selectedFile.assets[0].name 
                  : 'Select PDF file'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
          
          {selectedFile && selectedFile.assets && selectedFile.assets[0] && (
            <View style={styles.selectedFileInfo}>
              <Text style={[styles.selectedFileName, { fontSize: isSmallScreen ? 12 : 14 }]}>
                {selectedFile.assets[0].name}
              </Text>
              <Text style={[styles.selectedFileSize, { fontSize: isSmallScreen ? 11 : 12 }]}>
                {formatFileSize(selectedFile.assets[0].size || 0)}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={uploadEBook}
          disabled={uploading}
        >
          {/* Progress Bar Background */}
          {uploading && (
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${uploadProgress}%` }
                ]} 
              />
            </View>
          )}
          
          {/* Button Content */}
          <View style={styles.uploadButtonContent}>
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="cloud-upload" size={20} color="#fff" />
            )}
            <Text style={[styles.uploadButtonText, { fontSize: isSmallScreen ? 14 : 16 }]}>
              {uploading 
                ? `Uploading... ${Math.round(uploadProgress)}%` 
                : 'Upload eBook'
              }
            </Text>
          </View>
        </TouchableOpacity>

        {/* Test Button - Remove after debugging */}
        <TouchableOpacity 
          style={[styles.testButton]}
          onPress={testSupabaseConnection}
        >
          <Text style={[styles.testButtonText, { fontSize: isSmallScreen ? 14 : 16 }]}>
            🧪 Test Connection
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderViewTab = () => {
    const isSmallScreen = screenData.width < 600;
    
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5734" />
          <Text style={[styles.loadingText, { fontSize: isSmallScreen ? 14 : 16 }]}>
            Loading eBooks...
          </Text>
        </View>
      );
    }

    if (eBooks.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={60} color="#9CA3AF" />
          <Text style={[styles.emptyTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
            No eBooks uploaded yet
          </Text>
          <Text style={[styles.emptyText, { fontSize: isSmallScreen ? 14 : 16 }]}>
            Upload your first eBook to get started
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => setActiveTab('upload')}
          >
            <Text style={[styles.emptyButtonText, { fontSize: isSmallScreen ? 14 : 16 }]}>
              Upload eBook
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={eBooks}
        renderItem={renderEBookCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.eBooksList}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const isSmallScreen = screenData.width < 600;

  // If viewing PDF, show PDF viewer
  if (viewingPDF) {
    return (
      <PDFViewer 
        pdfUrl={viewingPDF.url}
        title={viewingPDF.title}
        onBack={() => setViewingPDF(null)}
      />
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
          <Text style={[styles.headerTitle, { fontSize: isSmallScreen ? 18 : 20 }]}>
            eBooks
          </Text>
          <Text style={[styles.headerSubtitle, { fontSize: isSmallScreen ? 12 : 14 }]}>
            {courseName}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upload' && styles.activeTab]}
          onPress={() => setActiveTab('upload')}
        >
          <Ionicons 
            name="cloud-upload" 
            size={18} 
            color={activeTab === 'upload' ? '#fff' : '#9CA3AF'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'upload' && styles.activeTabText,
            { fontSize: isSmallScreen ? 14 : 16 }
          ]}>
            Upload e-Books
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'view' && styles.activeTab]}
          onPress={() => setActiveTab('view')}
        >
          <Ionicons 
            name="library" 
            size={18} 
            color={activeTab === 'view' ? '#fff' : '#9CA3AF'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'view' && styles.activeTabText,
            { fontSize: isSmallScreen ? 14 : 16 }
          ]}>
            View eBooks
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'upload' ? renderUploadTab() : renderViewTab()}
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#374151",
    margin: 20,
    marginTop: 100, // Add more top margin to account for fixed header
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  activeTab: {
    backgroundColor: "#FF5734",
  },
  tabText: {
    color: "#9CA3AF",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20, // Reduce padding since tabs now have proper margin
  },
  
  // Upload Tab Styles
  uploadContainer: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: "#fff",
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#374151",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#4B5563",
  },
  textArea: {
    backgroundColor: "#374151",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#4B5563",
    minHeight: 100,
  },
  filePicker: {
    backgroundColor: "#374151",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#4B5563",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filePickerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  filePickerText: {
    color: "#9CA3AF",
    flex: 1,
  },
  selectedFileInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#1F2937",
    borderRadius: 6,
  },
  selectedFileName: {
    color: "#fff",
    fontWeight: "500",
  },
  selectedFileSize: {
    color: "#9CA3AF",
    marginTop: 2,
  },
  uploadButton: {
    backgroundColor: "#FF5734",
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    position: "relative",
    overflow: "hidden",
  },
  uploadButtonDisabled: {
    opacity: 0.8,
  },
  progressBarBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 8,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
  },
  uploadButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 1,
  },
  uploadButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  
  // Test button styles - Remove after debugging
  testButton: {
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    alignItems: "center",
  },
  testButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  
  // View Tab Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#9CA3AF",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: "#fff",
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#FF5734",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  eBooksList: {
    paddingBottom: 20,
  },
  eBookCard: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#374151",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eBookHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  eBookIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  eBookInfo: {
    flex: 1,
  },
  eBookTitle: {
    color: "#fff",
    fontWeight: "600",
    marginBottom: 4,
  },
  eBookDescription: {
    color: "#9CA3AF",
    marginBottom: 8,
  },
  eBookMeta: {
    flexDirection: "row",
    gap: 16,
  },
  eBookMetaText: {
    color: "#6B7280",
  },
  eBookActions: {
    flexDirection: "row",
    gap: 8,
  },
  viewButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#292524",
    borderWidth: 1,
    borderColor: "#FF5734",
  },
  downloadButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#065F46",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#7F1D1D",
  },
});

export default EBooksUpload;
