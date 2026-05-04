import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { uploadImage } from '../lib/storageHelper'
import '../styles/ProductUpload.css'

function ProductUpload() {
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    numPictures: '',
    price: '',
    discount: '',
    description: '',
  })
  const [images, setImages] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      console.log('📦 Fetching products from database...')
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ Error fetching products:', error)
        throw error
      }
      
      console.log('✅ Products fetched:', data)
      
      // Fetch images for each product
      const productsWithImages = await Promise.all(
        data.map(async (product) => {
          console.log(`📷 Fetching images for product ${product.id}...`)
          const { data: images, error: imgError } = await supabase
            .from('product_images')
            .select('image_url')
            .eq('product_id', product.id)
          
          if (imgError) console.error(`Error fetching images for product ${product.id}:`, imgError)
          
          const imageUrls = images?.map(img => img.image_url) || []
          console.log(`✅ Product ${product.id} has ${imageUrls.length} images`)
          
          return {
            ...product,
            images: imageUrls
          }
        })
      )
      
      console.log('🎉 All products loaded with images:', productsWithImages)
      setProducts(productsWithImages)
    } catch (err) {
      console.error('❌ Error fetching products:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.classList.add('drag-active')
  }

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-active')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-active')
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    handleFiles(files)
  }

  const handleFiles = (files) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    const newImages = imageFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      preview: URL.createObjectURL(file)
    }))
    setImages(prev => [...prev, ...newImages])
  }

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id))
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.category || !formData.title || !formData.price || !formData.numPictures) {
      setError('Please fill in all required fields')
      return
    }

    const requiredPics = parseInt(formData.numPictures)
    if (images.length !== requiredPics) {
      setError(`You specified ${requiredPics} picture(s) but uploaded ${images.length}. Please match the number.`)
      return
    }

    setLoading(true)
    try {
      console.log('🚀 Starting product upload...')
      
      // Insert product into database
      console.log('📝 Inserting product into database...')
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert({
          category: formData.category,
          title: formData.title,
          price: parseFloat(formData.price),
          discount: parseFloat(formData.discount) || 0,
          description: formData.description,
          num_pictures: requiredPics
        })
        .select()
      
      if (productError) {
        console.error('❌ Product insert error:', productError)
        throw productError
      }
      
      console.log('✅ Product inserted:', productData)
      const productId = productData[0].id
      
      // Upload images and save to product_images table
      console.log('📸 Starting image uploads...')
      const imageUrls = []
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 9)
        const ext = img.file.name.split('.').pop()
        const fileName = `product-${productId}-${timestamp}-${randomStr}.${ext}`
        
        console.log(`⬆️ Uploading image ${i + 1}/${images.length}: ${fileName}`)
        
        const { publicUrl, error: uploadError } = await uploadImage(
          img.file,
          'products',
          fileName
        )
        
        if (uploadError) {
          console.error(`❌ Error uploading image ${i + 1}:`, uploadError)
          throw new Error(`Failed to upload image ${i + 1}: ${uploadError.message}`)
        }
        
        if (!publicUrl) {
          throw new Error(`No public URL returned for image ${i + 1}`)
        }
        
        console.log(`✅ Image ${i + 1} uploaded. URL: ${publicUrl}`)
        
        // Save image URL to product_images table
        console.log(`💾 Saving image reference to database...`)
        const { data: insertedImage, error: imageError } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: publicUrl,
            image_path: fileName
          })
          .select()
        
        if (imageError) {
          console.error(`❌ Error saving image reference ${i + 1}:`, imageError)
          throw new Error(`Failed to save image reference: ${imageError.message}`)
        }
        
        console.log(`✅ Image reference saved:`, insertedImage)
        imageUrls.push(publicUrl)
      }
      
      console.log('✅ All images uploaded and saved to database')
      console.log('📊 Image URLs:', imageUrls)
      
      console.log('✅ All images uploaded successfully')
      
      // Refresh products list
      await fetchProducts()
      clearForm()
      console.log('🎉 Product upload complete!')
    } catch (err) {
      const errorMsg = err.message || 'Failed to upload product'
      setError(errorMsg)
      console.error('❌ Upload error:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearForm = () => {
    setFormData({
      category: '',
      title: '',
      numPictures: '',
      price: '',
      discount: '',
      description: '',
    })
    setImages([])
    setError('')
  }

  return (
    <div className="product-upload-container">
      <div className="form-card">
        <h1 className="page-title">Upload Products</h1>
        
        {error && <div className="error-banner">{error}</div>}
        
        <form onSubmit={handleUpload}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Category</option>
                <option value="handicrafts">Handicrafts</option>
                <option value="textiles">Textiles</option>
                <option value="pottery">Pottery</option>
                <option value="jewelry">Jewelry</option>
                <option value="woodwork">Woodwork</option>
                <option value="keychain">Key Chain</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="title">Product Title *</label>
              <input
                id="title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter product title"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="numPictures">Number of Pictures *</label>
              <input
                id="numPictures"
                type="number"
                name="numPictures"
                value={formData.numPictures}
                onChange={handleInputChange}
                placeholder="Enter number of pictures to upload"
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">Price *</label>
              <input
                id="price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="Enter price"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="discount">Discount (%)</label>
              <input
                id="discount"
                type="number"
                name="discount"
                value={formData.discount}
                onChange={handleInputChange}
                placeholder="Enter discount percentage"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter product description"
              rows="4"
            ></textarea>
          </div>

          <div className="form-group">
            <label>Upload Images *</label>
            <div
              className="upload-area"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <p>Drag and drop images here or</p>
              <label className="file-input-label">
                click to select
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {images.length > 0 && (
              <div className="image-preview-grid">
                {images.map(img => (
                  <div key={img.id} className="image-preview">
                    <img src={img.preview} alt="preview" />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImage(img.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Uploading...' : 'Upload Product'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={clearForm}>
              Clear Form
            </button>
          </div>
        </form>
      </div>

      {products.length > 0 && (
        <div className="products-section">
          <h2>Uploaded Products</h2>
          <div className="products-grid">
            {products && products.map(product => (
              <div key={product.id} className="product-card">
                <div className="product-images">
                  {product.images && product.images.length > 0 ? (
                    product.images.slice(0, 3).map((img, idx) => (
                      <img 
                        key={idx} 
                        src={img} 
                        alt={`${product.title} ${idx + 1}`}
                        onError={(e) => {
                          console.error(`Failed to load image: ${img}`)
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E'
                        }}
                      />
                    ))
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999',
                      fontSize: '12px'
                    }}>
                      No Images
                    </div>
                  )}
                </div>
                <div className="product-info">
                  <span className="product-category">{product.category}</span>
                  <h3>{product.title}</h3>
                  <p className="product-description">{product.description}</p>
                  <div className="product-pricing">
                    <span className="price">₹{product.price}</span>
                    {product.discount && (
                      <span className="discount">{product.discount}% off</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductUpload
