// lib/supabase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Log environment variables for debugging (remove in production)
console.log("Environment check:", {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlValue: supabaseUrl ? supabaseUrl.substring(0, 20) + "..." : "undefined",
});

if (!supabaseUrl) {
  console.error("EXPO_PUBLIC_SUPABASE_URL is missing");
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL is required. Please add it to your environment variables."
  );
}

if (!supabaseAnonKey) {
  console.error("EXPO_PUBLIC_SUPABASE_ANON_KEY is missing");
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY is required. Please add it to your environment variables."
  );
}

console.log("Supabase client initializing...");

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

console.log("Supabase client initialized successfully");
