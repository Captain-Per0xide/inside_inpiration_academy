# Environment Setup

## Required Environment Variables

Create a `.env` file in the root directory of your project with the following variables:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## How to get your Supabase credentials:

1. Go to [supabase.com](https://supabase.com)
2. Sign in and go to your project dashboard
3. Click on "Settings" in the sidebar
4. Click on "API" 
5. Copy the "Project URL" and paste it as EXPO_PUBLIC_SUPABASE_URL
6. Copy the "anon public" key and paste it as EXPO_PUBLIC_SUPABASE_ANON_KEY

## Example .env file:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

After creating the .env file:
1. Restart your development server
2. Run `npx expo start --clear` to clear the cache
