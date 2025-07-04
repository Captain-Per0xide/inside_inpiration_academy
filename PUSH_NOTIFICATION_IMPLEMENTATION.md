# Push Notification System Implementation

## Overview

This implementation adds comprehensive push notification support to your app, allowing admins to send notifications to all enrolled students when scheduling classes.

## Key Components Added

### 1. Enhanced NotifService.js

**New Features:**

- `getExpoPushToken()` - Gets Expo push token for the current device
- `sendPushNotifications()` - Sends push notifications to multiple users via Expo's push service

**Important:** Uses your Expo project ID: `9ea8f217-50aa-4501-ab8a-7f0653ea3e91`

### 2. PushTokenService (services/pushTokenService.js)

**Purpose:** Centralized service for managing push tokens across the app

**Key Functions:**

- `registerPushToken()` - Registers push token for current user
- `removePushToken()` - Removes push token (useful for logout)

### 3. Database Schema Update

**File:** `add_push_token_to_users.sql`

**What it does:**

- Adds `push_token` column to users table
- Creates index for better query performance
- Stores Expo push tokens for each user

### 4. Modified course-details.tsx

**Enhanced Features:**

- Registers push token for admin users
- Fetches push tokens of enrolled students
- Sends individual push notifications to each student's device
- Shows detailed success messages with notification count

## How It Works

### For Students:

1. When a student opens the app, their push token is automatically registered
2. Token is stored in the `users` table linked to their user ID
3. They'll receive push notifications on their device when classes are scheduled

### For Admins:

1. When admin schedules a class, the system:
   - Gets all enrolled students with 'success' status
   - Fetches their push tokens from the database
   - Sends individual push notifications to each device
   - Shows success message with count of notifications sent

## Notification Content

**Title:** "New Class Scheduled - [Course Code]"
**Body:** "[Topic] scheduled for [Date] at [Time]"
**Data:** Includes courseId, courseName, classId, scheduledDateTime, and type

## Database Changes Required

Run this SQL in your Supabase database:

```sql
-- Add push_token column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_push_token ON public.users(push_token);

-- Add comment
COMMENT ON COLUMN public.users.push_token IS 'Expo push token for sending push notifications to user devices';
```

## Automatic Token Registration

Push tokens are automatically registered in:

- Student layout (`app/(students)/_layout.tsx`)
- Guest layout (`app/(guest)/_layout.tsx`)
- Admin layout (`app/(admin)/_layout.tsx`)
- Course details page (`app/course-details.tsx`)

## Testing

### To Test Notifications:

1. **Database Setup:**

   - Run the SQL migration to add push_token column
   - Ensure students have opened the app to register their tokens

2. **Schedule a Class:**

   - Go to course details as admin
   - Click the "Schedule Class" button
   - Fill in class details and save
   - Check the success message - it will show how many notifications were sent

3. **Verify Notifications:**
   - Students should receive push notifications on their devices
   - Check console logs for detailed information about the process

### Console Logs to Watch:

- "Push token registered successfully: [token]"
- "Fetching push tokens for X enrolled students..."
- "Push notifications sent to X students"
- "No valid push tokens found for enrolled students" (if students haven't registered)

## Success Message Examples:

- "Class scheduled successfully! Push notifications sent to 5 out of 8 enrolled students."
- "Class scheduled successfully! Note: Students need to enable notifications to receive alerts."
- "Class scheduled successfully!" (if no enrolled students)

## Error Handling

- If push notification sending fails, the class scheduling still succeeds
- Detailed error logs are available in console
- Users see appropriate messages based on notification success/failure

## Important Notes

1. **Push tokens are device-specific** - Students need to open the app on each device they want to receive notifications on
2. **Expo push service limitations** - There are rate limits for sending notifications
3. **Permission required** - Users must grant notification permissions for tokens to be generated
4. **Token refresh** - Push tokens can change and are automatically updated when the app is opened

## Future Enhancements

- Add notification history tracking
- Implement notification preferences for students
- Add different notification types (reminders, announcements, etc.)
- Batch notification sending for large student counts
