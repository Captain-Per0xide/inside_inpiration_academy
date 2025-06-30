# eBooks Upload Implementation

## Overview
The eBooks upload functionality allows administrators to upload and manage course-specific eBooks. This feature is integrated into the course details page and provides a dedicated interface for eBook management.

## Components

### 1. eBooks-upload.tsx
**Location**: `components/eBooks-upload.tsx`

**Purpose**: Dedicated component for eBook management with two main tabs:
- **Upload eBook**: Interface for uploading new eBooks
- **View eBooks**: List of uploaded eBooks with management options

**Features**:
- File selection (PDF and EPUB formats)
- Title and description input
- File size validation and display
- Upload progress indication
- eBook listing with metadata
- Delete functionality
- Responsive design for different screen sizes

**Props**:
```typescript
interface EBooksUploadProps {
  courseId: string;     // Course ID for which eBooks are being managed
  courseName: string;   // Course name for display
  onBack: () => void;   // Callback function to return to course details
}
```

### 2. Course Details Integration
**File**: `components/course-details.tsx`

**Changes Made**:
- Added import for `EBooksUpload` component
- Added state management for current view (`course-details` | `ebooks`)
- Added click handler to eBooks material card
- Implemented conditional rendering to switch between views
- Updated navigation logic to handle back button appropriately

## Database Schema

### eBooks Table
```sql
CREATE TABLE public.ebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT DEFAULT 0,
    course_id UUID NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT fk_ebooks_course_id 
        FOREIGN KEY (course_id) 
        REFERENCES public.courses(id) 
        ON DELETE CASCADE
);
```

### Storage Bucket
- **Bucket Name**: `ebooks`
- **File Size Limit**: 50MB per file
- **Allowed MIME Types**: 
  - `application/pdf`
  - `application/epub+zip`
- **Public Access**: Enabled for reading

## Features Implemented

### Upload Tab
1. **Form Fields**:
   - Title (required)
   - Description (optional)
   - File picker (required)

2. **File Selection**:
   - Supports PDF and EPUB formats
   - Shows selected file name and size
   - Auto-fills title from filename

3. **Upload Process**:
   - Uploads file to Supabase Storage
   - Saves metadata to database
   - Shows upload progress
   - Provides success/error feedback

### View Tab
1. **eBook Listing**:
   - Card-based layout
   - Shows title, description, file size, upload date
   - Responsive design

2. **Management Actions**:
   - Download button (placeholder for future implementation)
   - Delete button with confirmation
   - Real-time count in tab header

3. **Empty State**:
   - Informative message when no eBooks exist
   - Call-to-action button to switch to upload tab

## Navigation Flow

1. **Course Details** → **eBooks Upload**:
   - User clicks on "eBooks" material card
   - Component switches to eBooks upload view
   - Header updates to show eBooks context

2. **eBooks Upload** → **Course Details**:
   - User clicks back button
   - Component returns to course details view
   - Maintains course data and state

## File Upload Process

1. User selects file using expo-document-picker
2. File validation (type and size)
3. Upload to Supabase Storage bucket
4. Generate unique filename to prevent conflicts
5. Save metadata to database
6. Update UI with success/error status

## Security Considerations

1. **Row Level Security (RLS)**:
   - Enabled on eBooks table
   - Policies for admin access

2. **Storage Policies**:
   - Upload, view, and delete permissions for eBooks bucket
   - File type restrictions

3. **File Validation**:
   - MIME type checking
   - File size limits
   - Unique filename generation

## Dependencies

### New Package
- `expo-document-picker`: For file selection functionality

### Existing Dependencies
- React Native core components
- Expo Router for navigation
- Supabase for database and storage
- Ionicons for icons

## Usage

### For Administrators
1. Navigate to any course details page
2. Click on the "eBooks" material card
3. Use the "Upload eBook" tab to add new eBooks
4. Use the "View eBooks" tab to manage existing eBooks
5. Use the back button to return to course details

### File Requirements
- **Supported Formats**: PDF (.pdf), EPUB (.epub)
- **Maximum Size**: 50MB per file
- **Required Fields**: Title, File selection
- **Optional Fields**: Description

## Future Enhancements

1. **Download Functionality**: Implement actual file download
2. **Preview Feature**: Add eBook preview capabilities
3. **Bulk Upload**: Support multiple file uploads
4. **Search/Filter**: Add search and filtering for eBooks
5. **Access Control**: Different permissions for different user roles
6. **Analytics**: Track eBook downloads and usage

## Error Handling

1. **File Upload Errors**: Network issues, storage quota
2. **Database Errors**: Connection issues, constraint violations
3. **Validation Errors**: Invalid file types, missing required fields
4. **Permission Errors**: Access denied, authentication issues

All errors are handled with appropriate user feedback through Alert dialogs.

## Testing Considerations

1. **File Upload**: Test with various file types and sizes
2. **Network Conditions**: Test with poor connectivity
3. **Storage Limits**: Test approaching storage quotas
4. **Database Constraints**: Test foreign key relationships
5. **UI Responsiveness**: Test on various screen sizes
6. **Navigation**: Test back button behavior and view switching
