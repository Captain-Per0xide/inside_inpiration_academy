# Payment System Implementation

## Overview

This payment system allows guest users to purchase courses by making UPI payments and submitting payment confirmations. The system includes:

1. **Payment Page**: Displays course details, QR code, and form for payment submission
2. **Database Integration**: Stores payment details for admin verification
3. **Image Upload**: Allows users to upload payment screenshots
4. **Navigation**: Seamless navigation from course listing to payment

## Features

### Guest Payment Flow

1. User browses available courses
2. Clicks "Buy Now" on desired course
3. Redirected to payment page with course details
4. Sees QR code and payment information
5. Makes payment via UPI
6. Fills form with payment details and uploads screenshot
7. Submits for verification

### Payment Information Displayed

- **QR Code**: For easy UPI payments
- **UPI ID**: inspiration@paytm
- **Phone Number**: +91 9876543210 (for Google Pay/PhonePe)

### Form Fields

- Full Name (required)
- Email Address (required)
- Phone Number (required)
- Transaction ID (required)
- Payment Screenshot (required)

## Database Setup

### 1. Run SQL Script

Execute the SQL script in `/database/payments_table.sql` in your Supabase SQL editor:

```sql
-- The script creates:
-- - payments table with proper schema
-- - Indexes for performance
-- - Row Level Security policies
-- - Triggers for updated_at
-- - Views for statistics
```

### 2. Configure Storage (Optional)

If you want to store payment screenshots in Supabase Storage:

1. Create a storage bucket named "payment-screenshots"
2. Set up appropriate policies for uploads
3. Update the payment submission code to upload images

## Configuration

### Update Payment Details

In `/app/(guest)/payment.tsx`, update these constants:

```typescript
const UPI_ID = "your-actual-upi-id";
const PHONE_NUMBER = "+91 your-phone-number";
const QR_CODE_URL = "url-to-your-actual-qr-code";
```

### QR Code Generation

1. Generate a UPI QR code with your payment details
2. Upload it to a accessible URL or use Supabase Storage
3. Update the `QR_CODE_URL` constant

## File Structure

```
app/(guest)/
├── _layout.tsx          # Updated to include payment route
├── index.tsx            # Updated buy now navigation
└── payment.tsx          # New payment page

database/
└── payments_table.sql   # Database schema script
```

## Key Components

### 1. Payment Page (`/app/(guest)/payment.tsx`)

- Responsive design for all screen sizes
- Course details display
- QR code and payment information
- Form validation
- Image picker integration
- Database submission

### 2. Navigation Update (`/app/(guest)/index.tsx`)

- Updated `handleBuyNow` function
- Passes course ID to payment page
- Removed alert dialog

### 3. Layout Update (`/app/(guest)/_layout.tsx`)

- Added payment route to drawer
- Hidden from drawer menu (accessed only via navigation)

## Admin Verification Process

### Database Queries for Admins

```sql
-- View all pending payments
SELECT * FROM payments WHERE payment_status = 'pending' ORDER BY created_at DESC;

-- Update payment status
UPDATE payments
SET payment_status = 'verified',
    verified_at = NOW(),
    verified_by = 'admin-user-id',
    notes = 'Payment verified successfully'
WHERE id = 'payment-id';
```

### Payment Status Options

- `pending`: Newly submitted payments
- `verified`: Approved payments
- `rejected`: Rejected payments with notes

## Security Features

### Row Level Security (RLS)

- Guests can only insert payment records
- Users can view their own payments when logged in
- Admins can view/update all payments

### Validation

- Client-side form validation
- Required field checking
- Email format validation
- Phone number length validation

## Error Handling

### Common Scenarios

1. **Course not found**: Redirects back with error message
2. **Database errors**: Shows user-friendly error messages
3. **Image picker errors**: Handles permission issues
4. **Network errors**: Provides retry options

## Testing

### Test Cases

1. **Navigation**: Verify buy now button navigates correctly
2. **Course Loading**: Test with valid and invalid course IDs
3. **Form Validation**: Test all validation scenarios
4. **Image Upload**: Test image picker functionality
5. **Database Submission**: Verify payment records are created

### Test Data

```typescript
// Test with existing course ID from your courses table
const testCourseId = "your-course-id-here";
```

## Future Enhancements

### Potential Improvements

1. **Payment Gateway Integration**: Direct UPI payment processing
2. **Email Notifications**: Send confirmation emails
3. **Admin Dashboard**: Web interface for payment verification
4. **Student Portal**: Track payment history
5. **Automated Verification**: OCR for transaction ID verification

### Integration Points

- Course enrollment system
- Student management system
- Notification system
- Reporting dashboard

## Troubleshooting

### Common Issues

1. **Navigation not working**: Check route configuration in layout
2. **Database errors**: Verify SQL script execution
3. **Image upload fails**: Check permissions and expo-image-picker setup
4. **Styling issues**: Check responsive design breakpoints

### Debug Tips

- Check console logs for errors
- Verify Supabase connection
- Test with different screen sizes
- Validate form data before submission

## Dependencies Used

- `expo-router`: Navigation
- `expo-image-picker`: Image selection
- `@supabase/supabase-js`: Database operations
- `@expo/vector-icons`: Icons
- `react-native`: UI components
