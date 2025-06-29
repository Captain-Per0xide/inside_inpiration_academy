# Test Date Configuration - September 15, 2025

## Overview
This document summarizes the changes made to configure the app to use September 15, 2025 as the test date for payment system testing.

## Changes Made

### 1. Created Test Date Utility (`utils/testDate.ts`)
- **Location**: `/utils/testDate.ts`
- **Purpose**: Centralized date management for testing
- **Test Date**: September 15, 2025
- **Test Mode**: Enabled (`TEST_MODE = true`)

**Key Functions:**
- `getCurrentDate()` - Returns test date (Sep 15, 2025) when TEST_MODE is true
- `getCurrentMonthName()` - Returns "Sept" for September
- `getCurrentYear()` - Returns 2025
- `getCurrentISOString()` - Returns ISO string for test date
- `getCurrentDateString()` - Returns YYYY-MM-DD format for test date

### 2. Updated Student Payment Component (`app/(students)/payment.tsx`)
- **Added import**: Test date utility functions
- **Removed**: Local `getCurrentMonthName()` and `getCurrentDate()` functions
- **Updated**: All date references to use centralized utility
- **Changed instances**: 8 date function calls updated

### 3. Updated Admin Payment Component (`app/(admin)/payment.tsx`)
- **Added import**: Test date utility functions
- **Updated**: All `new Date()` calls to use `getCurrentDate()`
- **Updated**: All `new Date().toISOString()` calls to use `getCurrentISOString()`
- **Updated**: Date string formatting to use `getCurrentDateString()`
- **Changed instances**: 6 date function calls updated

### 4. Updated Payment Component (`components/payment.tsx`)
- **Added import**: Test date utility functions
- **Modified**: `getCurrentMonthName()` renamed to `getPaymentMonthName()`
- **Updated**: Function to use centralized date utility
- **Updated**: Display text to use `getCurrentYear()`
- **Changed instances**: 4 date function calls updated

### 5. Updated Add-Courses Component (`components/add-courses.tsx`)
- **Added import**: Test date utility
- **Updated**: DateTimePicker default value to use `getCurrentDate()`
- **Changed instances**: 1 date function call updated

### 6. Updated Session Debug Utility (`utils/sessionDebug.ts`)
- **Added import**: Test date utility
- **Updated**: Timestamp generation to use `getCurrentISOString()`
- **Changed instances**: 1 date function call updated

## Test Date Impact

### Current Test Date: September 15, 2025
- **Month**: September (Sept)
- **Year**: 2025
- **Day**: 15th (Monday)

### Payment System Testing Benefits
1. **Consistent Testing Environment**: All components use the same test date
2. **Predictable Behavior**: Known date allows for reproducible test scenarios
3. **Easy Switching**: Toggle `TEST_MODE` in `utils/testDate.ts` to switch between test and real dates
4. **Comprehensive Coverage**: All date-sensitive functions updated

## Verification Steps

### 1. Check Current Month Display
- Student payment screen should show "Sept 2025"
- Payment forms should indicate "Payment for: Sept 2025"

### 2. Check Enrollment Status Logic
- Elective course duration calculations will use Sept 15, 2025 as reference
- Course enrollment months will be calculated from Sept 2025

### 3. Check Payment History
- New payments will be timestamped with Sept 15, 2025
- File paths will use "Sept" as the month folder

### 4. Check Admin Functions
- Payment approvals will use Sept 15, 2025 timestamps
- Auto-generated payments will use Sept 2025 as base month

## Switching Back to Real Date
To switch back to using real current date:
1. Open `/utils/testDate.ts`
2. Change `TEST_MODE = true` to `TEST_MODE = false`
3. All components will automatically use real current date

## Testing Scenarios Enabled

With September 15, 2025 as the test date:

### 1. Elective Course Duration Testing
- Test enrollment in Sept 2025
- Verify 6-month duration courses work until Feb 2026
- Check automatic payment generation for duration months

### 2. Monthly Payment Due Calculations
- Test September 2025 as current payment month
- Verify overdue calculations for previous months
- Check chronological payment ordering

### 3. Enrollment Status Restoration
- Test restoration logic with Sept 2025 as current date
- Verify background checks work correctly
- Test admin approval workflows

### 4. Payment History and File Organization
- Verify screenshots uploaded to "Sept" folders
- Check payment history displays correctly
- Test file path generation

## Technical Notes

### File Import Pattern
```typescript
import { getCurrentDate, getCurrentMonthName, getCurrentYear, getCurrentISOString, getCurrentDateString } from '@/utils/testDate';
```

### Usage Examples
```typescript
// Instead of: new Date()
const currentDate = getCurrentDate();

// Instead of: new Date().getMonth()
const currentMonth = getCurrentMonthName();

// Instead of: new Date().getFullYear()
const currentYear = getCurrentYear();

// Instead of: new Date().toISOString()
const timestamp = getCurrentISOString();
```

## Status
✅ **COMPLETE** - All date functions have been updated to use the centralized test date utility. The app is now configured to use September 15, 2025 as the test date for comprehensive payment system testing.
