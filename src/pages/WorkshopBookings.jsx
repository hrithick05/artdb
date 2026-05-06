import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/WorkshopBookings.css'

function WorkshopBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: bookingsData, error: fetchError } = await supabase
        .from('workshop_bookings')
        .select(`
          id,
          workshop_id,
          student_name,
          student_email,
          student_phone,
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          amount,
          currency,
          payment_status,
          booking_status,
          created_at,
          updated_at,
          workshops:workshop_id(id, title, date, start_time, end_time, venue, price, description)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setBookings(bookingsData || [])
    } catch (err) {
      console.error('Error fetching bookings:', err)
      setError('Failed to load workshop bookings')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price) => {
    if (!price) return '₹0'
    return `₹${parseFloat(price).toFixed(2)}`
  }

  const updateBookingStatus = async (id, newStatus, type) => {
    try {
      const updateData = type === 'booking'
        ? { booking_status: newStatus }
        : { payment_status: newStatus }

      const { error: updateError } = await supabase
        .from('workshop_bookings')
        .update(updateData)
        .eq('id', id)

      if (updateError) throw updateError
      await fetchBookings()
    } catch (err) {
      console.error('Error updating booking:', err)
      setError('Failed to update booking status')
    }
  }

  const deleteBooking = async (id) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return

    try {
      const { error: deleteError } = await supabase
        .from('workshop_bookings')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      await fetchBookings()
    } catch (err) {
      console.error('Error deleting booking:', err)
      setError('Failed to delete booking')
    }
  }

  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = !filterStatus || booking.booking_status === filterStatus
    const matchesSearch = !searchQuery ||
      (booking.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.student_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.student_phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.workshops?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const bookingStatuses = ['pending', 'confirmed', 'cancelled']
  const paymentStatuses = ['pending', 'success', 'failed']
  const totalRevenue = filteredBookings.reduce((sum, booking) => sum + (parseFloat(booking.amount) || 0), 0)

  return (
    <div className="bookings-container">
      <div className="bookings-header">
        <h1 className="page-title">Workshop Bookings</h1>
        <button onClick={fetchBookings} className="refresh-btn">🔄 Refresh</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="filters-section">
        <input
          type="text"
          placeholder="Search by student name, email, phone, or workshop name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="">All Booking Status</option>
          {bookingStatuses.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-state">Loading workshop bookings...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="empty-state">
          <p>No bookings found</p>
        </div>
      ) : (
        <>
          <div className="revenue-summary">
            <div className="summary-card">
              <div className="summary-label">Total Bookings</div>
              <div className="summary-value">{filteredBookings.length}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Revenue</div>
              <div className="summary-value">{formatPrice(totalRevenue)}</div>
            </div>
          </div>

          <div className="bookings-list">
            <div className="bookings-grid">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-header">
                    <div>
                      <h3 className="booking-id">Booking #{booking.id}</h3>
                      <p className="booking-date">{formatDate(booking.created_at)}</p>
                    </div>
                    <div className="status-badges">
                      <span className={`status-badge booking-${booking.booking_status}`}>
                        {booking.booking_status ? booking.booking_status.charAt(0).toUpperCase() + booking.booking_status.slice(1) : 'Unknown'}
                      </span>
                      <span className={`status-badge payment-${booking.payment_status}`}>
                        {booking.payment_status ? booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1) : 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="workshop-section">
                    <h4 className="section-title">🎨 Workshop Details</h4>
                    {booking.workshops ? (
                      <>
                        <div className="detail-row">
                          <strong>Workshop Name:</strong>
                          <span>{booking.workshops.title || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <strong>Date:</strong>
                          <span>{booking.workshops.date ? new Date(booking.workshops.date).toLocaleDateString('en-IN') : 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <strong>Time:</strong>
                          <span>{booking.workshops.start_time && booking.workshops.end_time ? `${booking.workshops.start_time} - ${booking.workshops.end_time}` : 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <strong>Venue:</strong>
                          <span>{booking.workshops.venue || 'N/A'}</span>
                        </div>
                        {booking.workshops.description && (
                          <div className="detail-row">
                            <strong>Description:</strong>
                            <span>{booking.workshops.description}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="no-data">Workshop information unavailable</p>
                    )}
                  </div>

                  <div className="student-section">
                    <h4 className="section-title">👤 Student Details</h4>
                    <div className="detail-row">
                      <strong>Name:</strong>
                      <span>{booking.student_name || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <strong>Email:</strong>
                      <span className="text-link">{booking.student_email || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <strong>Phone:</strong>
                      <span>{booking.student_phone || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="payment-section">
                    <h4 className="section-title">💳 Payment Details</h4>
                    <div className="detail-row">
                      <strong>Amount:</strong>
                      <span className="amount-value">{formatPrice(booking.amount)}</span>
                    </div>
                    <div className="detail-row">
                      <strong>Currency:</strong>
                      <span>{booking.currency || 'INR'}</span>
                    </div>
                    {booking.razorpay_order_id && (
                      <div className="detail-row">
                        <strong>Order ID:</strong>
                        <span className="payment-id">{booking.razorpay_order_id}</span>
                      </div>
                    )}
                    {booking.razorpay_payment_id && (
                      <div className="detail-row">
                        <strong>Payment ID:</strong>
                        <span className="payment-id">{booking.razorpay_payment_id}</span>
                      </div>
                    )}
                  </div>

                  <div className="booking-actions">
                    <select
                      value={booking.booking_status || ''}
                      onChange={(e) => updateBookingStatus(booking.id, e.target.value, 'booking')}
                      className="action-select booking"
                    >
                      <option value="">Set Booking Status</option>
                      {bookingStatuses.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>

                    <select
                      value={booking.payment_status || ''}
                      onChange={(e) => updateBookingStatus(booking.id, e.target.value, 'payment')}
                      className="action-select payment"
                    >
                      <option value="">Set Payment Status</option>
                      {paymentStatuses.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => deleteBooking(booking.id)}
                      className="delete-btn"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default WorkshopBookings
