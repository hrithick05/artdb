import { Link } from 'react-router-dom'
import '../styles/Navigation.css'

function Navigation() {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="brand">
          <span className="brand-logo">🎨</span>
          Artispahar DB
        </Link>
        <ul className="nav-links">
          <li>
            <Link to="/product-upload">Product Upload</Link>
          </li>
          <li>
            <Link to="/workshop-planner">Workshop Planner</Link>
          </li>
          <li>
            <Link to="/workshop-bookings">Workshop Bookings</Link>
          </li>
          <li>
            <Link to="/blog">Blog</Link>
          </li>
          <li>
            <Link to="/messages">Messages</Link>
          </li>
          <li>
            <Link to="/orders-booked">Orders Booked</Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Navigation
