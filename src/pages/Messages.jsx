import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/Messages.css'

function Messages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterSender, setFilterSender] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchError } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (fetchError) throw fetchError
      setMessages(data || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Failed to load messages')
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

  const deleteMessage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return
    
    try {
      const { error: deleteError } = await supabase
        .from('contact_submissions')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      await fetchMessages()
    } catch (err) {
      console.error('Error deleting message:', err)
      setError('Failed to delete message')
    }
  }

  const filteredMessages = messages.filter(msg => {
    const senderName = `${msg.first_name || ''} ${msg.last_name || ''}`.trim()
    const matchesSender = !filterSender || senderName.toLowerCase().includes(filterSender.toLowerCase()) || (msg.email || '').toLowerCase().includes(filterSender.toLowerCase())
    const matchesSearch = !searchQuery || 
      (msg.message || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      senderName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSender && matchesSearch
  })

  return (
    <div className="messages-container">
      <div className="messages-header">
        <h1 className="page-title">Messages</h1>
        <button onClick={fetchMessages} className="refresh-btn">🔄 Refresh</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="filters-section">
        <input
          type="text"
          placeholder="Search by message content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <input
          type="text"
          placeholder="Filter by name or email..."
          value={filterSender}
          onChange={(e) => setFilterSender(e.target.value)}
          className="filter-input"
        />
      </div>

      {loading ? (
        <div className="loading-state">Loading messages...</div>
      ) : filteredMessages.length === 0 ? (
        <div className="empty-state">
          <p>No messages found</p>
        </div>
      ) : (
        <div className="messages-list">
          <div className="messages-grid">
            {filteredMessages.map((msg) => (
              <div key={msg.id} className="message-card">
                <div className="message-header">
                  <h3 className="message-subject">Contact Form Submission</h3>
                  <span className="message-date">{formatDate(msg.created_at)}</span>
                </div>
                
                <div className="message-sender">
                  <strong>From:</strong> {msg.first_name} {msg.last_name}
                  {msg.email && <span className="message-email">({msg.email})</span>}
                </div>

                <div className="message-content">
                  {msg.message || 'No message content'}
                </div>

                {msg.submission_status && (
                  <div className="message-status">
                    <span className={`status-badge ${msg.submission_status}`}>
                      {msg.submission_status}
                    </span>
                  </div>
                )}

                <div className="message-actions">
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="delete-btn"
                    title="Delete message"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="messages-footer">
        <p>Total Messages: <strong>{filteredMessages.length}</strong></p>
      </div>
    </div>
  )
}

export default Messages
