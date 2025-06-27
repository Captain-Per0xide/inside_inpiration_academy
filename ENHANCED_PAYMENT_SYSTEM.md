# Enhanced Payment System Implementation

## Overview

This enhanced payment system integrates with the fees table structure and provides user session-based payment processing. The system includes:

1. **Session-based Authentication**: Fetches user data from active session
2. **Monthly Payment Tracking**: Stores payments in month-specific columns
3. **Supabase Storage Integration**: Structured file upload system
4. **Reusable Payment Component**: Can be used across different parts of the app

## Features

### Updated Payment Flow

1. User must be logged in to make payments
2. User details auto-filled from session and users table
3. Payment stored in fees table under current month column
4. Screenshot uploaded to structured Supabase Storage path
5. Payment status set to 'pending' by default

### Database Schema

#### Fees Table Structure

```sql
CREATE TABLE public.fees (
  id text PRIMARY KEY,           -- Course ID (foreign key to courses)
  "Jan" text[] NULL,            -- January payments array
  "Feb" text[] NULL,            -- February payments array
  "Mar" text[] NULL,            -- March payments array
  "Apr" text[] NULL,            -- April payments array
  "May" text[] NULL,            -- May payments array
  "Jun" text[] NULL,            -- June payments array
  "Jul" text[] NULL,            -- July payments array
  "Aug" text[] NULL,            -- August payments array
  "Sept" text[] NULL,           -- September payments array
  "Oct" text[] NULL,            -- October payments array
  "Nov" text[] NULL,            -- November payments array
  "Dec" text[] NULL,            -- December payments array
  fees_total numeric NULL,      -- Total monthly fee
  CONSTRAINT fees_id_fkey FOREIGN KEY (id) REFERENCES courses (id)
);
```

#### Payment Data Structure

Each month column contains an array of JSON objects:

```json
[
  {
    "user_id": "user-uuid",
    "txn_id": "transaction-id",
    "ss_uploaded_path": "https://storage-url/path/to/screenshot",
    "email_id": "user@email.com",
    "phone_number": "+91xxxxxxxxxx",
    "status": "pending"
  }
]
```

#### Users Table (For Auto-fill)

```sql
CREATE TABLE public.users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone_no text NOT NULL,
  role text DEFAULT 'guest',
  -- ... other fields
);
```

## File Upload Structure

### Supabase Storage Path

```
inside-inspiration-academy-assets/
└── Payment-Data/
    └── {user_id}/
        └── {current_month}/
            └── ss.png
```

### Example URL

```
https://xzamcjamwbcvhtapfszg.supabase.co/storage/v1/object/public/inside-inspiration-academy-assets/Payment-Data/8d824ca5-67c2-48e5-b258-287fe908333a/Jan/ss.png
```

## Implementation

### 1. Reusable Payment Component (`/components/payment.tsx`)

#### Key Features:

- **Session Management**: Automatically fetches user session and data
- **Auto-fill Form**: Pre-populates user details from users table
- **Monthly Tracking**: Determines current month for payment storage
- **Storage Upload**: Uploads screenshot with structured naming
- **Database Integration**: Updates fees table with payment data

#### Props Interface:

```typescript
interface PaymentComponentProps {
  courseId: string;
  onPaymentSuccess?: () => void;
  onBack?: () => void;
}
```

#### Usage Example:

```typescript
import PaymentComponent from "@/components/payment";

<PaymentComponent
  courseId="course-uuid"
  onPaymentSuccess={() => router.push("/success")}
  onBack={() => router.back()}
/>;
```

### 2. Guest Payment Page (`/app/(guest)/payment.tsx`)

- Simplified wrapper around PaymentComponent
- Handles navigation and success callbacks
- Maintains existing route structure

## Setup Instructions

### 1. Database Setup

Execute the SQL script in your Supabase SQL editor:

```bash
# Run the updated script
/database/payments_table.sql
```

### 2. Create Storage Bucket

In Supabase Storage:

1. Create bucket: `inside-inspiration-academy-assets`
2. Set as public bucket
3. Configure appropriate policies for uploads

### 3. Update Payment Configuration

In `/components/payment.tsx`, update:

```typescript
const UPI_ID = "your-actual-upi-id";
const PHONE_NUMBER = "+91 your-phone-number";
const QR_CODE_URL = "url-to-your-qr-code";
```

## Authentication Requirements

### User Session

- Users must be logged in to access payment functionality
- Session data fetched using `supabase.auth.getSession()`
- User details retrieved from users table using session user ID

### Auto-fill Process

1. Get current user session
2. Query users table with session user ID
3. Auto-populate form fields:
   - Full Name (from users.name)
   - Email (from users.email)
   - Phone (from users.phone_no)

## Payment Processing Flow

### 1. Data Collection

```typescript
const paymentData = {
  user_id: user.id,
  txn_id: transactionId.trim(),
  ss_uploaded_path: screenshotUrl,
  email_id: studentEmail.trim(),
  phone_number: studentPhone.trim(),
  status: "pending",
};
```

### 2. Screenshot Upload

```typescript
// Path: Payment-Data/{userId}/{currentMonth}/ss.png
const filePath = `Payment-Data/${userId}/${currentMonth}/ss.png`;
await supabase.storage
  .from("inside-inspiration-academy-assets")
  .upload(filePath, blob, { upsert: true });
```

### 3. Database Update

```typescript
// Get current month data
const currentMonth = getCurrentMonthName();
const existingData = existingFees[currentMonth] || [];

// Add new payment
existingData.push(paymentData);

// Update fees table
await supabase
  .from("fees")
  .update({ [currentMonth]: existingData })
  .eq("id", course.id);
```

## Admin Functions

### 1. Payment Status Update

```sql
SELECT update_payment_status(
    'course-id',
    'Jan',
    'user-id',
    'verified'
);
```

### 2. View Payment History

```sql
SELECT * FROM get_user_payment_history('user-id');
```

### 3. Admin Verification View

```sql
SELECT * FROM payment_verification_view;
```

## Security Features

### Row Level Security (RLS)

- **Fees Table**: Users can read/update their course fees
- **Users Table**: Users can view/update own profile
- **Admin Access**: Admins can view/modify all data

### Data Validation

- Client-side form validation
- Server-side data structure validation
- File upload security checks

## Error Handling

### Authentication Errors

- Session not found → Redirect to login
- User data not found → Show error message
- Permission denied → Show unauthorized message

### Upload Errors

- Storage permission issues
- File size/format validation
- Network connectivity problems

### Database Errors

- Constraint violations
- Connection timeouts
- Transaction failures

## Testing

### Test Scenarios

1. **Authenticated User Payment**:

   - Login → Select Course → Complete Payment
   - Verify data in fees table
   - Check storage upload

2. **Guest User Attempt**:

   - Try payment without login
   - Should redirect to authentication

3. **Existing Course Payment**:

   - Pay for course with existing fees record
   - Verify payment added to existing month data

4. **New Course Payment**:
   - Pay for course without fees record
   - Verify new fees record created

### Debug Queries

```sql
-- Check payment data for a course
SELECT id, "Jan", "Feb", "Mar" FROM fees WHERE id = 'course-id';

-- Check user payment history
SELECT * FROM get_user_payment_history('user-id');

-- View all pending payments
SELECT * FROM payment_verification_view;
```

## File Structure

```
components/
├── payment.tsx              # Reusable payment component

app/(guest)/
├── payment.tsx              # Guest payment page wrapper

database/
├── payments_table.sql       # Updated database schema

Storage Structure:
inside-inspiration-academy-assets/
└── Payment-Data/
    └── {user_id}/
        └── {month}/
            └── ss.png
```

## Dependencies

- `@supabase/supabase-js`: Database and storage operations
- `expo-image-picker`: Image selection and upload
- `expo-router`: Navigation management
- Authentication system for user sessions

## Troubleshooting

### Common Issues

1. **Storage Upload Fails**: Check bucket permissions and file size
2. **Auto-fill Not Working**: Verify user session and users table data
3. **Payment Not Saved**: Check fees table structure and constraints
4. **Authentication Errors**: Verify Supabase auth configuration

### Debug Steps

1. Check browser console for errors
2. Verify Supabase connection
3. Test with different user accounts
4. Validate database constraints
5. Check storage bucket policies
