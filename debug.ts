// Debug script to test database operations
import { supabase } from './lib/supabase';

export async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Check authentication
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error:', authError);
      return;
    }
    
    console.log('Current user:', authData.user?.id, authData.user?.email);
    
    if (!authData.user) {
      console.log('No authenticated user');
      return;
    }
    
    // Test 2: Try to read from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();
    
    if (userError) {
      console.error('User fetch error:', userError);
    } else {
      console.log('User data:', userData);
    }
    
    // Test 3: Try to upsert test data
    const testData = {
      id: authData.user.id,
      email: authData.user.email,
      name: 'Test User',
      phone_no: '+1234567890',
      address: 'Test Address',
      dob: '2000-01-01',
      univ_name: 'Test University',
      gender: 'Other',
      user_image: 'https://example.com/image.jpg'
    };
    
    const { error: upsertError } = await supabase
      .from('users')
      .upsert(testData, { onConflict: 'id' });
    
    if (upsertError) {
      console.error('Upsert error:', upsertError);
    } else {
      console.log('Upsert successful');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}
