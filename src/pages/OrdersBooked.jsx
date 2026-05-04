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
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      await fetchOrders()
    } catch (err) {
      console.error('Error deleting order:', err)
      setError('Failed to delete order')
    }
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

                  {order.shipping_address && typeof order.shipping_address === 'object' && (
                    <div className="shipping-section">
                      <h4 className="section-title">📍 Shipping Address</h4>
                      <div className="address-content">
                        {order.shipping_address.street && (
                          <div className="address-line">{order.shipping_address.street}</div>
                        )}
                        <div className="address-line">
                          {order.shipping_address.city && `${order.shipping_address.city}, `}
                          {order.shipping_address.state && `${order.shipping_address.state} `}
                          {order.shipping_address.pincode && order.shipping_address.pincode}
                        </div>
                        {order.shipping_address.country && (
                          <div className="address-line">{order.shipping_address.country}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {order.notes && (
                    <div className="notes-section">
                      <h4 className="section-title">📝 Notes</h4>
                      <p className="notes-content">{order.notes}</p>
                    </div>
                  )}

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
