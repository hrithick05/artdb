import { supabase } from './supabaseClient'

export const testSupabaseConnection = async () => {
  try {
    console.log('🧪 Testing Supabase connection...')
    
    // Test database connection
    const { data, error: dbError } = await supabase
      .from('products')
      .select('count(*)', { count: 'exact', head: true })
    
    if (dbError) {
      console.error('❌ Database connection failed:', dbError)
      return false
    }
    
    console.log('✅ Database connection OK')
    
    // Test storage connection
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets()
    
    if (storageError) {
      console.error('❌ Storage connection failed:', storageError)
      return false
    }
    
    console.log('✅ Storage connection OK')
    console.log('📦 Available buckets:', buckets?.map(b => b.name))
    
    return true
  } catch (err) {
    console.error('❌ Connection test failed:', err)
    return false
  }
}

export const testImageUpload = async () => {
  try {
    console.log('🧪 Testing image upload...')
    
    // Create a simple test image
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#667eea'
    ctx.fillRect(0, 0, 100, 100)
    
    const blob = await new Promise(resolve => canvas.toBlob(resolve))
    const testFile = new File([blob], 'test-image.png', { type: 'image/png' })
    
    const { data, error } = await supabase.storage
      .from('products')
      .upload(`test/${Date.now()}-test.png`, testFile)
    
    if (error) {
      console.error('❌ Upload test failed:', error)
      return false
    }
    
    console.log('✅ Upload test successful:', data)
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(`test/${data.path}`)
    
    console.log('✅ Public URL generated:', publicUrl)
    
    return true
  } catch (err) {
    console.error('❌ Upload test failed:', err)
    return false
  }
}
