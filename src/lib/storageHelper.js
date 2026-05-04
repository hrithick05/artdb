import { supabase } from './supabaseClient'

export const initializeStorage = async () => {
  console.log('✅ Storage buckets pre-created in database (products, workshops, blogs)')
}

export const uploadImage = async (file, bucketName, fileName) => {
  try {
    console.log(`🔄 Uploading to bucket: ${bucketName}, file: ${fileName}`)
    console.log(`📄 File details: name=${file.name}, size=${file.size}, type=${file.type}`)
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError)
      throw uploadError
    }
    
    console.log(`✅ Upload successful:`, uploadData)
    
    // Get public URL from storage
    const publicUrl = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)?.data?.publicUrl
    
    console.log(`📸 Generated public URL: ${publicUrl}`)
    
    if (!publicUrl) {
      throw new Error('Failed to generate public URL')
    }
    
    return { data: uploadData, publicUrl, error: null }
  } catch (error) {
    console.error(`❌ Upload failed:`, error)
    return { data: null, publicUrl: null, error }
  }
}

export const deleteImage = async (bucketName, fileName) => {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([fileName])
    
    if (error) throw error
    console.log(`✅ Image deleted: ${fileName}`)
    return { error: null }
  } catch (error) {
    console.error(`❌ Delete failed:`, error)
    return { error }
  }
}
