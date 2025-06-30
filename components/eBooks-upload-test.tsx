// TEST FILE - Delete after debugging
import { supabase } from "@/lib/supabase";

export const testUpload = async () => {
  console.log('🧪 Testing upload functionality...');
  
  try {
    // Test 1: Check Supabase connection
    console.log('1️⃣ Testing Supabase connection...');
    const { data, error } = await supabase.storage
      .from('inside-inspiration-academy-assets')
      .list('', { limit: 1 });
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return;
    }
    console.log('✅ Supabase connection successful');
    
    // Test 2: Try to upload a simple text file
    console.log('2️⃣ Testing simple file upload...');
    const testContent = 'This is a test file';
    const testPath = `test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('inside-inspiration-academy-assets')
      .upload(testPath, testContent, {
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.error('❌ Simple upload failed:', uploadError);
      return;
    }
    
    console.log('✅ Simple upload successful');
    
    // Clean up test file
    await supabase.storage
      .from('inside-inspiration-academy-assets')
      .remove([testPath]);
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};
