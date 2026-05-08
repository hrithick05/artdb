import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/OrdersBooked.css'

function OrdersBooked() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (fetchError) throw fetchError
      console.log('Fetched orders:', data)
      setOrders(data || [])
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('Failed to load orders')
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

  const updateOrderStatus = async (id, newStatus, type) => {
    try {
      const updateData = type === 'order' 
        ? { order_status: newStatus }
        : { payment_status: newStatus }
      
      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
      
      if (updateError) throw updateError
      await fetchOrders()
    } catch (err) {
      console.error('Error updating order:', err)
      setError('Failed to update order status')
    }
  }

  const deleteOrder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return

    try {
      const { error: deleteError, data } = await supabase
        .from('orders')
        .delete()
        .eq('id', id)
        .select()

      if (deleteError) throw deleteError
      if (!data || data.length === 0) throw new Error('Delete blocked. Check Supabase RLS policies.')
      await fetchOrders()
    } catch (err) {
      console.error('Error deleting order:', err)
      setError(err.message || 'Failed to delete order')
    }
  }

  const parseShippingAddress = (addressData) => {
    if (!addressData) return null
    
    // If it's a string, try to parse it as JSON
    if (typeof addressData === 'string') {
      try {
        return JSON.parse(addressData)
      } catch (e) {
        console.error('Failed to parse shipping address:', e)
        return null
      }
    }
    
    // If it's already an object, return it
    return addressData
  }

  const filteredOrders = orders.filter(order => {
    const matchesOrderStatus = !filterStatus || order.order_status === filterStatus
    const matchesPaymentStatus = !filterPaymentStatus || order.payment_status === filterPaymentStatus
    const matchesSearch = !searchQuery || 
      (order.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.razorpay_order_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer_email || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesOrderStatus && matchesPaymentStatus && matchesSearch
  })

  const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
  const paymentStatuses = ['pending', 'completed', 'failed', 'refunded']
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0)

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h1 className="page-title">Orders Booked</h1>
        <button onClick={fetchOrders} className="refresh-btn">🔄 Refresh</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="filters-section">
        <input
          type="text"
          placeholder="Search by customer name, email, or order ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="">All Order Status</option>
          {orderStatuses.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={filterPaymentStatus}
          onChange={(e) => setFilterPaymentStatus(e.target.value)}
          className="filter-select"
        >
          <option value="">All Payment Status</option>
          {paymentStatuses.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-state">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">
          <p>No orders found</p>
        </div>
      ) : (
        <>
          <div className="orders-list">
            <div className="orders-grid">
              {filteredOrders.map((order) => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div>
                      <h3 className="order-id">Order #{order.razorpay_order_id || order.id.slice(0, 8)}</h3>
                      <p className="order-date">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="status-badges">
                      <span className={`status-badge order-${order.order_status}`}>
                        {order.order_status ? order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1) : 'Unknown'}
                      </span>
                      <span className={`status-badge payment-${order.payment_status}`}>
                        {order.payment_status ? order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1) : 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="customer-section">
                    <h4 className="section-title">👤 Customer Details</h4>
                    <div className="detail-row">
                      <strong>Name:</strong>
                      <span>{order.customer_name || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <strong>Email:</strong>
                      <span className="text-link">{order.customer_email || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <strong>Phone:</strong>
                      <span>{order.customer_phone || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="items-section">
                    <h4 className="section-title">📦 Items</h4>
                    {order.items && Array.isArray(order.items) ? (
                      <div className="items-list">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="item-row">
                            <span className="item-name">{item.name}</span>
                            <span className="item-qty">Qty: {item.quantity}</span>
                            <span className="item-price">{formatPrice(item.price)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-items">No items information</p>
                    )}
                  </div>

                  <div className="amount-section">
                    <div className="detail-row total">
                      <strong>Total Amount:</strong>
                      <span className="total-price">{formatPrice(order.total_amount)}</span>
                    </div>
                  </div>

                  {order.shipping_address && (
                    <div className="shipping-section">
                      <h4 className="section-title">📍 Shipping Address</h4>
                      <div className="address-content">
                        {(() => {
                          const address = parseShippingAddress(order.shipping_address)
                          if (!address) {
                            return <p className="no-address">No address information</p>
                          }
                          return (
                            <>
                              {(address.street || address.address) && (
                                <div className="address-line">{address.street || address.address}</div>
                              )}
                              <div className="address-line">
                                {address.city && `${address.city}, `}
                                {address.state && `${address.state} `}
                                {address.pincode && address.pincode}
                              </div>
                              {address.country && (
                                <div className="address-line">{address.country}</div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )}

                  {order.notes && (
                    <div className="notes-section">
                      <h4 className="section-title">📝 Notes</h4>
                      <p className="notes-content">{order.notes}</p>
                    </div>
                  )}

                  <div className="customization-section">
                    <h4 className="section-title">🎨 Customization</h4>
                    {order.customization_notes && (
                      <div className="detail-row">
                        <strong>Notes:</strong>
                        <span>{order.customization_notes}</span>
                      </div>
                    )}
                    {order.customization_image_url && (
                      <div className="customization-image-container">
                        <img 
                          src={order.customization_image_url} 
                          alt="Customization preview" 
                          className="customization-image"
                          onError={(e) => {
                            console.error('Image load error:', e)
                            e.target.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    {!order.customization_notes && !order.customization_image_url && (
                      <p className="no-items">No customization details</p>
                    )}
                  </div>

                  <div className="razorpay-section">
                    {order.razorpay_payment_id && (
                      <div className="detail-row">
                        <strong>Payment ID:</strong>
                        <span className="payment-id">{order.razorpay_payment_id}</span>
                      </div>
                    )}
                  </div>

                  <div className="order-actions">
                    <select
                      value={order.order_status || ''}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value, 'order')}
                      className="status-select"
                      title="Update Order Status"
                    >
                      <option value="" disabled>Order Status</option>
                      {orderStatuses.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={order.payment_status || ''}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value, 'payment')}
                      className="status-select"
                      title="Update Payment Status"
                    >
                      <option value="" disabled>Payment Status</option>
                      {paymentStatuses.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="delete-btn"
                      title="Delete order"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="orders-footer">
            <div className="footer-stats">
              <p>Total Orders: <strong>{filteredOrders.length}</strong></p>
              <p>Total Revenue: <strong>{formatPrice(totalRevenue)}</strong></p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default OrdersBooked
