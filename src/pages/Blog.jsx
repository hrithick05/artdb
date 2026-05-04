import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { uploadImage } from '../lib/storageHelper'
import '../styles/Blog.css'

function Blog() {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  })
  const [featuredImage, setFeaturedImage] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('published_at', { ascending: false })
      
      if (error) throw error
      setPosts(data || [])
    } catch (err) {
      console.error('Error fetching posts:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setFeaturedImage({
        file,
        preview: URL.createObjectURL(file)
      })
    }
  }

  const removeImage = () => {
    setFeaturedImage(null)
  }

  const getExcerpt = (content, length = 150) => {
    return content.length > length ? content.substring(0, length) + '...' : content
  }

  const formatDate = (date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handlePublish = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.title || !formData.content) {
      setError('Please fill in title and content')
      return
    }

    if (!featuredImage) {
      setError('Please upload a featured image')
      return
    }

    setLoading(true)
    try {
      // Upload featured image
      const fileName = `${Date.now()}-${featuredImage.file.name}`
      const { publicUrl, error: uploadError } = await uploadImage(
        featuredImage.file,
        'blogs',
        fileName
      )
      
      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`)
      }
      
      // Insert blog post into database
      const { data, error: dbError } = await supabase
        .from('blog_posts')
        .insert({
          title: formData.title,
          content: formData.content,
          featured_image_url: publicUrl,
          featured_image_path: fileName,
          published_at: new Date().toISOString()
        })
        .select()
      
      if (dbError) throw dbError
      
      // Refresh posts list
      await fetchPosts()
      clearForm()
    } catch (err) {
      setError(err.message || 'Failed to publish blog post')
      console.error('Blog error:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearForm = () => {
    setFormData({
      title: '',
      content: '',
    })
    setFeaturedImage(null)
    setError('')
  }

  return (
    <div className="blog-container">
      <div className="form-card">
        <h1 className="page-title">Blog</h1>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handlePublish}>
          <div className="form-group">
            <label htmlFor="title">Blog Title *</label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter blog title"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Blog Content *</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="Enter your blog content here"
              rows="8"
              required
            ></textarea>
          </div>

          <div className="form-group">
            <label>Featured Image *</label>
            <div className="upload-area-blog">
              <label className="file-input-label">
                Choose Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {featuredImage && (
              <div className="featured-image-preview">
                <img src={featuredImage.preview} alt="featured" />
                <button
                  type="button"
                  className="remove-image-btn"
                  onClick={removeImage}
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Publishing...' : 'Publish Blog Post'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={clearForm}>
              Clear Form
            </button>
          </div>
        </form>
      </div>

      {posts.length > 0 && (
        <div className="blog-posts-section">
          <h2>Blog Posts</h2>
          <div className="blog-posts-grid">
            {posts.map(post => (
              <article key={post.id} className="blog-post-card">
                <div className="post-featured-image">
                  <img src={post.featured_image_url} alt={post.title} />
                </div>
                <div className="post-content">
                  <time className="post-date">{formatDate(new Date(post.published_at))}</time>
                  <h3 className="post-title">{post.title}</h3>
                  <p className="post-excerpt">{getExcerpt(post.content)}</p>
                  <button className="read-more-btn">Read More</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Blog
