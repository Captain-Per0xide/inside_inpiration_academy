# Smart Routing System

This app implements a comprehensive routing system that handles user onboarding, authentication, and role-based navigation.

## How It Works

### On App Start/Refresh

The main `app/index.tsx` file implements the following logic:

1. **Onboarding Check**: 
   - If user hasn't seen onboarding → Show onboarding screens
   - If user has seen onboarding → Continue to authentication check

2. **Authentication Check**:
   - If user is not authenticated → Navigate to auth screen
   - If user is authenticated → Continue to profile/role check

3. **Profile & Role Check**:
   - If user profile is incomplete → Navigate to profile setup
   - If user profile is complete → Navigate based on role:
     - `admin` → `/(admin)` 
     - `student` → `/(students)`
     - `other/default` → `/(guest)`

### Key Files

- **`app/index.tsx`**: Main routing logic for app initialization
- **`app/onboarding.tsx`**: Marks onboarding as completed when user finishes
- **`app/(auth)/index.tsx`**: Smart routing after successful login
- **`app/(profile)/index.tsx`**: Smart routing after profile completion
- **`utils/routingUtils.ts`**: Centralized routing utility functions
- **`services/authService.ts`**: Enhanced with onboarding management
- **`utils/testUtils.ts`**: Testing utilities for different app states

### Features

✅ **Onboarding Prevention**: Users never see onboarding twice  
✅ **Session Persistence**: Authenticated users stay logged in  
✅ **Role-based Routing**: Automatic navigation based on user role  
✅ **Profile Completion**: Ensures users complete their profiles  
✅ **Error Handling**: Graceful fallbacks for all scenarios  
✅ **Testing Support**: Utilities to test different app states  

### Testing Different States

```typescript
import { TestUtils } from '../utils/testUtils';

// Check current app state
await TestUtils.checkAppState();

// Reset to first-time user (shows onboarding)
await TestUtils.resetToFirstTimeUser();

// Reset only onboarding (keep user logged in)
await TestUtils.resetOnboardingOnly();

// Simulate app refresh to see where it would navigate
const route = await TestUtils.simulateAppRefresh();
```

### Flow Diagram

```
App Start
    ↓
Has seen onboarding?
    ↓ No → Show Onboarding → Mark as seen → Auth Screen
    ↓ Yes
Is authenticated?
    ↓ No → Auth Screen
    ↓ Yes
Profile complete?
    ↓ No → Profile Setup
    ↓ Yes
Route by role:
    • Admin → /(admin)
    • Student → /(students)
    • Guest → /(guest)
```

This ensures a smooth user experience where users are always directed to the right place based on their current state.
