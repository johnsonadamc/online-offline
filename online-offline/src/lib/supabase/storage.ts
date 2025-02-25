// src/lib/supabase/storage.ts

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function uploadMedia(file: File) {
  const supabase = createClientComponentClient();
  
  try {
    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('Attempting to upload file:', fileName); // Add this log

    // Upload file
    const { data, error: uploadError } = await supabase.storage
      .from('content-media')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error details:', uploadError); // Add this log
      throw uploadError;
    }

    console.log('Upload successful:', data); // Add this log

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('content-media')
      .getPublicUrl(filePath);

    console.log('Public URL:', urlData); // Add this log

    return { url: urlData.publicUrl, path: filePath };
    
  } catch (error) {
    console.error('Error uploading file:', JSON.stringify(error, null, 2)); // Modified error log
    throw error;
  }
}