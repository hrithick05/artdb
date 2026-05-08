import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { uploadImage } from '../lib/storageHelper'
import '../styles/WorkshopPlanner.css'

function WorkshopPlanner() {
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    price: '',
    venue: '',
    description: '',
  })
  const [photo, setPhoto] = useState(null)
  const [workshops, setWorkshops] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchWorkshops()
  }, [])

  const fetchWorkshops = async () => {
    try {
      const { data, error } = await supabase
        .from('workshops')
        .select('*')
        .order('date', { ascending: true })
      
      if (error) throw error
      setWorkshops(data || [])
    } catch (err) {
      console.error('Error fetching workshops:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setPhoto({
        file,
        preview: URL.createObjectURL(file)
      })
    }
  }

  const removePhoto = () => {
    setPhoto(null)
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleAddWorkshop = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime || !formData.venue || !formData.price) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      if (editingId) {
        // Update existing workshop
        const updateData = {
          title: formData.title,
          date: formData.date,
          start_time: formData.startTime,
          end_time: formData.endTime,
          price: parseFloat(formData.price),
          venue: formData.venue,
          description: formData.description,
        }

        // Upload new photo only if selected
        if (photo) {
          const fileName = `${Date.now()}-${photo.file.name}`
          const { publicUrl, error: uploadError } = await uploadImage(
            photo.file,
            'workshops',
            fileName
          )
          if (uploadError) throw new Error(`Failed to upload photo: ${uploadError.message}`)
          updateData.photo_url = publicUrl
          updateData.photo_path = fileName
        }

        const { error: dbError } = await supabase
          .from('workshops')
          .update(updateData)
          .eq('id', editingId)
          .select()

        if (dbError) throw dbError
        await fetchWorkshops()
        clearForm()
      } else {
        // Insert new workshop
        let photoUrl = null
        let photoPath = null

        if (photo) {
          const fileName = `${Date.now()}-${photo.file.name}`
          const { publicUrl, error: uploadError } = await uploadImage(
            photo.file,
            'workshops',
            fileName
          )

          if (uploadError) {
            throw new Error(`Failed to upload photo: ${uploadError.message}`)
          }

          photoUrl = publicUrl
          photoPath = fileName
        }

        const { data, error: dbError } = await supabase
          .from('workshops')
          .insert({
            title: formData.title,
            date: formData.date,
            start_time: formData.startTime,
            end_time: formData.endTime,
            price: parseFloat(formData.price),
            venue: formData.venue,
            description: formData.description,
            photo_url: photoUrl,
            photo_path: photoPath
          })
          .select()

        if (dbError) throw dbError
        await fetchWorkshops()
        clearForm()
      }
    } catch (err) {
      setError(err.message || (editingId ? 'Failed to update workshop' : 'Failed to add workshop'))
      console.error('Workshop error:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearForm = () => {
    setFormData({
      title: '',
      date: '',
      startTime: '',
      endTime: '',
      price: '',
      venue: '',
      description: '',
    })
    setPhoto(null)
    setError('')
    setEditingId(null)
  }

  const handleEdit = (workshop) => {
    setFormData({
      title: workshop.title,
      date: workshop.date,
      startTime: workshop.start_time,
      endTime: workshop.end_time,
      price: workshop.price,
      venue: workshop.venue,
      description: workshop.description || '',
    })
    setEditingId(workshop.id)
    setPhoto(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteWorkshop = async (workshopId) => {
    if (!window.confirm('Are you sure you want to delete this workshop? This action cannot be undone.')) return

    try {
      setError('')
      console.log('🗑️ Deleting workshop:', workshopId)

      // Get workshop data to find photo path
      const { data: workshopData, error: fetchError } = await supabase
        .from('workshops')
        .select('photo_path')
        .eq('id', workshopId)
        .single()

      if (fetchError) console.warn('Error fetching workshop:', fetchError)

      // Delete photo from storage if it exists
      if (workshopData?.photo_path) {
        try {
          await supabase.storage
            .from('workshops')
            .remove([workshopData.photo_path])
          console.log(`✅ Deleted photo: ${workshopData.photo_path}`)
        } catch (storageErr) {
          console.warn(`Could not delete photo from storage: ${workshopData.photo_path}`, storageErr)
        }
      }

      // Delete workshop from database
      const { error: deleteError, data } = await supabase
        .from('workshops')
        .delete()
        .eq('id', workshopId)
        .select()

      if (deleteError) throw deleteError
      if (!data || data.length === 0) throw new Error('Delete blocked. Check Supabase RLS policies.')
      console.log('✅ Workshop deleted successfully')

      await fetchWorkshops()
    } catch (err) {
      console.error('❌ Error deleting workshop:', err)
      setError(err.message || 'Failed to delete workshop')
    }
  }

  return (
    <div className="workshop-planner-container">
      <div className="form-card">
        <h1 className="page-title">Workshop Planner</h1>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleAddWorkshop}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="title">Workshop Title *</label>
              <input
                id="title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter workshop title"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="date">Date *</label>
              <input
                id="date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="startTime">Start Time *</label>
              <input
                id="startTime"
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="endTime">End Time *</label>
              <input
                id="endTime"
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-grid">
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
              <label htmlFor="venue">Venue *</label>
              <input
                id="venue"
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleInputChange}
                placeholder="Enter venue"
                required
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
              placeholder="Enter workshop description"
              rows="4"
            ></textarea>
          </div>

          <div className="form-group">
            <label>Workshop Photo</label>
            <div className="file-input-wrapper">
              <label className="file-input-label">
                Choose Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {photo && (
              <div className="photo-preview-container">
                <img src={photo.preview} alt="workshop preview" />
                <button
                  type="button"
                  className="remove-photo-btn"
                  onClick={removePhoto}
                >
                  Remove Photo
                </button>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Workshop' : 'Add Workshop')}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={clearForm}>
                Cancel Edit
              </button>
            )}
            {!editingId && (
              <button type="button" className="btn btn-secondary" onClick={clearForm}>
                Clear Form
              </button>
            )}
          </div>
        </form>
      </div>

      {workshops.length > 0 && (
        <div className="workshops-section">
          <h2>Scheduled Workshops</h2>
          <div className="workshops-grid">
            {workshops.map(workshop => (
              <div key={workshop.id} className="workshop-card">
                {workshop.photo_url && (
                  <div className="workshop-photo">
                    <img src={workshop.photo_url} alt={workshop.title} />
                  </div>
                )}
                <div className="workshop-info">
                  <h3>{workshop.title}</h3>
                  <div className="workshop-details">
                    <div className="detail-item">
                      <span className="label">📅 Date:</span>
                      <span>{formatDate(workshop.date)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">⏰ Time:</span>
                      <span>{workshop.start_time} - {workshop.end_time}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">📍 Venue:</span>
                      <span>{workshop.venue}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">💰 Price:</span>
                      <span>₹{workshop.price}</span>
                    </div>
                  </div>
                  {workshop.description && (
                    <p className="workshop-description">{workshop.description}</p>
                  )}
                  <button
                    onClick={() => handleEdit(workshop)}
                    className="edit-btn"
                    title="Edit workshop"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteWorkshop(workshop.id)}
                    className="delete-btn"
                    title="Delete workshop"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkshopPlanner
