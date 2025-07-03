# YouTube-Style Video Player Implementation

## Overview

This implementation provides a YouTube-like video viewing experience with comments functionality for the Inside Inspiration Academy app. Users can now view videos in a full-screen layout with comments, descriptions, and suggested videos.

## Features

### 🎥 YouTube-Style Video Player

- **Full-screen video player** with responsive design
- **Landscape and portrait modes** with automatic orientation handling
- **Video information display** with title, description, and metadata
- **Resource access** to class notes and assignments
- **Suggested videos** sidebar/section
- **Professional UI** with dark theme matching YouTube's design

### 💬 Comments System

- **Public comments** on each video
- **Nested replies** to comments
- **Real-time comment display** with user profiles
- **Like functionality** for comments and replies
- **User avatars** and timestamps
- **Rich comment interactions** (reply, like, etc.)

### 📱 Responsive Design

- **Portrait mode**: Stacked layout with video on top, tabs below
- **Landscape mode**: Side-by-side layout with video and comments/suggestions
- **Adaptive UI** that works on all screen sizes
- **Touch-friendly** interactions and gestures

## Database Schema

### Video Comments Table

```sql
CREATE TABLE video_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id TEXT NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id),
    comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Comment Structure (JSONB)

```json
{
  "id": "unique_comment_id",
  "user_id": "user_uuid",
  "user_name": "John Doe",
  "user_image": "profile_image_url",
  "comment_text": "Great explanation!",
  "timestamp": "2025-07-03T10:30:00Z",
  "likes": 0,
  "replies": [
    {
      "id": "reply_id",
      "user_id": "user_uuid",
      "user_name": "Jane Smith",
      "user_image": "profile_image_url",
      "reply_text": "I agree!",
      "timestamp": "2025-07-03T11:00:00Z",
      "likes": 0
    }
  ]
}
```

## Setup Instructions

### 1. Database Setup

```bash
# Run the setup script to create the video_comments table
./setup-video-comments.sh
```

Alternatively, you can manually run the SQL from `create_video_comments_table.sql` in your Supabase dashboard.

### 2. Row Level Security (RLS)

The setup automatically configures RLS policies:

- **Read access**: All authenticated users can read comments
- **Insert access**: Authenticated users can add comments
- **Update access**: Users can update comments (for likes, etc.)

### 3. Required Permissions

Ensure your Supabase project has:

- `authenticated` role with access to `video_comments` table
- `users` table with `id`, `name`, and `user_image` columns
- Proper foreign key relationships

## Component Usage

### YouTubeVideoPlayer Component

```tsx
import YouTubeVideoPlayer from "@/components/YouTubeVideoPlayer";

<YouTubeVideoPlayer
  video={selectedVideo}
  courseId={courseId}
  courseName="Course Name"
  onBack={() => setSelectedVideo(null)}
  suggestedVideos={otherVideos}
  onVideoSelect={setSelectedVideo}
/>;
```

### Props

- `video`: The video object to display
- `courseId`: Course ID for comments context
- `courseName`: Display name for the course
- `onBack`: Callback when user goes back
- `suggestedVideos`: Array of other videos to suggest
- `onVideoSelect`: Callback when user selects a suggested video

## File Structure

```
components/
├── YouTubeVideoPlayer.tsx     # Main YouTube-style video player
└── VideoPlayer.tsx            # Basic video player component

app/
├── all-videos.tsx            # Updated to use YouTube player
└── course-details.tsx        # Course details with video thumbnails

database/
├── create_video_comments_table.sql  # Database schema
└── setup-video-comments.sh         # Setup script
```

## Features in Detail

### 🎬 Video Player Experience

- **Auto-rotation support** for landscape video viewing
- **Touch controls** with play/pause, seek, fullscreen
- **Thumbnail previews** before video loads
- **Smooth transitions** between videos
- **Professional styling** with gradient overlays

### 💭 Comments System

- **Threaded conversations** with nested replies
- **User authentication** integration
- **Real-time updates** when new comments are added
- **Responsive comment UI** that works in both orientations
- **Comment timestamps** with "time ago" formatting
- **User profile integration** with avatars and names

### 📋 Content Organization

- **Tabbed interface** for Comments and Suggested Videos
- **Smart video suggestions** excluding currently playing video
- **Video metadata display** with upload dates and class info
- **Resource links** to class notes and assignments
- **Course context** maintained throughout navigation

### 🎨 Design System

- **Dark theme** optimized for video viewing
- **Consistent typography** and spacing
- **Interactive elements** with proper touch targets
- **Loading states** and error handling
- **Accessibility considerations** with proper contrast and text sizing

## Navigation Flow

1. **Course Details** → Click video thumbnail
2. **YouTube Player** → Full-screen video with comments
3. **Comments Tab** → View and add comments
4. **Suggested Videos** → Discover more content
5. **Video Selection** → Seamless transition to new video

## Technical Implementation

### State Management

- React hooks for component state
- Supabase real-time subscriptions for comments
- Orientation handling with expo-screen-orientation
- Responsive design with Dimensions API

### Performance Optimizations

- Lazy loading of comments
- Efficient JSONB queries for comment data
- Optimized rendering for large comment threads
- Smooth animations and transitions

### Error Handling

- Network error recovery
- Invalid video URL handling
- Comment submission failures
- User authentication errors

## Future Enhancements

### Potential Features

- **Video reactions** (like/dislike for videos)
- **Comment moderation** tools for instructors
- **Live chat** during scheduled classes
- **Video bookmarks** and timestamps
- **Subtitle support** for accessibility
- **Video speed controls** and quality selection
- **Offline video caching** for mobile
- **Social sharing** of videos and comments

### Analytics Integration

- Video watch time tracking
- Comment engagement metrics
- User behavior analytics
- Course completion tracking

## Security Considerations

- **Input sanitization** for comment text
- **XSS prevention** in comment rendering
- **Rate limiting** for comment submissions
- **Content moderation** capabilities
- **User permission validation**

## Testing

### Manual Testing Checklist

- [ ] Video plays correctly in both orientations
- [ ] Comments load and display properly
- [ ] Comment submission works
- [ ] Replies to comments function
- [ ] Suggested videos navigation works
- [ ] Back navigation preserves state
- [ ] Resource links open correctly
- [ ] User authentication is respected
- [ ] Error states display appropriately
- [ ] Loading states work smoothly

### Automated Testing

Consider adding tests for:

- Comment CRUD operations
- Video player state management
- Navigation flow integrity
- Database query performance
- UI component rendering

## Support

For issues or questions about this implementation:

1. Check the console for error messages
2. Verify database setup is complete
3. Ensure user authentication is working
4. Test with different video formats
5. Check network connectivity for comments

## License

This implementation is part of the Inside Inspiration Academy project and follows the same licensing terms.
