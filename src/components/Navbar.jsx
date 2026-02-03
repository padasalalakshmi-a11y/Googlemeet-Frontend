import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  
  // Check if user is logged in
  const token = localStorage.getItem('token')
  const user = token ? JSON.parse(localStorage.getItem('user') || '{}') : null

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogin = () => {
    navigate('/login')
  }

  const handleDashboard = () => {
    navigate('/dashboard')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.reload()
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-lg shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <motion.div
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-3xl">🎥</span>
            <span className="text-xl font-bold gradient-text">
              Video Translation Meet
            </span>
          </motion.div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-700 hover:text-primary transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-primary transition-colors">
              How it Works
            </a>
            <a href="#about" className="text-gray-700 hover:text-primary transition-colors">
              About
            </a>
            
            {user ? (
              // Logged in user
              <div className="flex items-center space-x-4">
                <div className="credits-badge">
                  <span className="credit-icon">💎</span>
                  <span className="credit-count">{user.credits || 0}</span>
                </div>
                <motion.button
                  onClick={handleDashboard}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2"
                >
                  <div className="user-avatar">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-700 font-medium">{user.name}</span>
                </motion.button>
                <button
                  onClick={handleLogout}
                  className="logout-button"
                >
                  Logout
                </button>
              </div>
            ) : (
              // Guest user
              <div className="flex items-center space-x-4">
                <motion.button
                  onClick={handleLogin}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="login-button"
                >
                  Login
                </motion.button>
                <motion.button
                  onClick={handleLogin}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-shadow"
                >
                  Sign Up
                </motion.button>
              </div>
            )}
          </div>

          <button 
            className="md:hidden text-2xl text-gray-700 hover:text-primary transition-colors p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={{
          height: mobileMenuOpen ? 'auto' : 0,
          opacity: mobileMenuOpen ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
        className="md:hidden overflow-hidden bg-white/95 backdrop-blur-lg border-t border-gray-200"
      >
        <div className="px-4 py-4 space-y-4">
          {/* Navigation Links */}
          <a 
            href="#features" 
            className="block text-gray-700 hover:text-primary transition-colors py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Features
          </a>
          <a 
            href="#how-it-works" 
            className="block text-gray-700 hover:text-primary transition-colors py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            How it Works
          </a>
          <a 
            href="#about" 
            className="block text-gray-700 hover:text-primary transition-colors py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            About
          </a>
          
          {/* User Section */}
          {user ? (
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="user-avatar">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-gray-700 font-medium">{user.name}</p>
                  <div className="credits-badge inline-flex mt-1">
                    <span className="credit-icon">💎</span>
                    <span className="credit-count">{user.credits || 0}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  handleDashboard()
                  setMobileMenuOpen(false)
                }}
                className="w-full px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-full font-semibold shadow-lg"
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  handleLogout()
                  setMobileMenuOpen(false)
                }}
                className="w-full logout-button"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <button
                onClick={() => {
                  handleLogin()
                  setMobileMenuOpen(false)
                }}
                className="w-full login-button"
              >
                Login
              </button>
              <button
                onClick={() => {
                  handleLogin()
                  setMobileMenuOpen(false)
                }}
                className="w-full px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-full font-semibold shadow-lg"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.nav>
  )
}
