import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import ProductUpload from './pages/ProductUpload'
import WorkshopPlanner from './pages/WorkshopPlanner'
import Blog from './pages/Blog'
import Messages from './pages/Messages'
import OrdersBooked from './pages/OrdersBooked'
import { initializeStorage } from './lib/storageHelper'
import { testSupabaseConnection } from './lib/debugHelper'

function App() {
  useEffect(() => {
    initializeStorage()
    
    // Test Supabase connection on app load
    setTimeout(() => {
      console.log('🔍 Running connection test...')
      testSupabaseConnection()
    }, 1000)
  }, [])

  return (
    <BrowserRouter>
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ProductUpload />} />
          <Route path="/product-upload" element={<ProductUpload />} />
          <Route path="/workshop-planner" element={<WorkshopPlanner />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/orders-booked" element={<OrdersBooked />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
