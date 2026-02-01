import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SERVER_URL } from '../config'
import '../styles/Dashboard.css'

function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState(0)
  const [usageStats, setUsageStats] = useState(null)
  const [usageHistory, setUsageHistory] = useState([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [processingPayment, setProcessingPayment] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    
    if (!token || !userData) {
      navigate('/login')
      return
    }
    
    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    setLoading(false)
    
    // Fetch credits and usage data
    fetchCredits(token)
    fetchUsageStats(token)
    fetchUsageHistory(token)
  }, [navigate])

  const fetchCredits = async (token) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/credits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setCredits(data.credits)
        // Update user data in localStorage
        const userData = JSON.parse(localStorage.getItem('user'))
        userData.credits = data.credits
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error)
    }
  }

  const fetchUsageStats = async (token) => {
    try {
      setLoadingStats(true)
      const response = await fetch(`${SERVER_URL}/api/credits/stats?period=30d`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setUsageStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch usage stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchUsageHistory = async (token) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/credits/history?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setUsageHistory(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch usage history:', error)
    }
  }

  const handleStartMeeting = () => {
    if (!user?.credits || user.credits <= 0) {
      alert('⚠️ You need credits to start a meeting!\n\nPlease purchase credits to continue.')
      return
    }
    navigate('/meet')
  }

  const handleBuyCredits = (packageId) => {
    setSelectedPackage(packageId)
    setShowPaymentModal(true)
  }

  const handlePayment = async () => {
    if (!selectedPackage) return

    setProcessingPayment(true)

    try {
      const token = localStorage.getItem('token')
      
      // Create payment order
      const response = await fetch(`${SERVER_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          packageId: selectedPackage,
          currency: 'INR'  // Razorpay supports INR, USD, and more
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to create order')
      }

      // Razorpay checkout options
      const options = {
        key: data.key, // Razorpay key from backend
        amount: data.amount, // Amount in paise
        currency: data.currency,
        name: 'TranslateMeet',
        description: `${data.package} Package - ${data.credits} Credits`,
        order_id: data.orderId,
        handler: async function (response) {
          // Payment successful, verify on backend
          console.log('✅ Payment successful:', response)
          await verifyPayment(response)
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone || ''
        },
        theme: {
          color: '#667eea'
        },
        modal: {
          ondismiss: function() {
            console.log('Payment cancelled by user')
            setProcessingPayment(false)
            setShowPaymentModal(false)
          }
        }
      }

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options)
      razorpay.open()

      razorpay.on('payment.failed', function (response) {
        console.error('❌ Payment failed:', response.error)
        alert('Payment failed: ' + response.error.description)
        setProcessingPayment(false)
        setShowPaymentModal(false)
      })

    } catch (error) {
      console.error('Payment error:', error)
      alert('Failed to initiate payment: ' + error.message)
      setProcessingPayment(false)
      setShowPaymentModal(false)
    }
  }

  const verifyPayment = async (paymentResponse) => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${SERVER_URL}/api/payments/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`🎉 Payment successful! ${data.creditsAdded} credits added to your account.`)
        // Refresh credits
        fetchCredits(token)
        fetchUsageHistory(token)
      } else {
        alert('❌ Payment verification failed. Please contact support.')
      }

    } catch (error) {
      console.error('Verification error:', error)
      alert('Failed to verify payment. Please contact support.')
    } finally {
      setProcessingPayment(false)
      setShowPaymentModal(false)
      setSelectedPackage(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner-large"></div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <nav className="dashboard-nav">
        <div className="nav-left">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#navGradient1)" />
              <path d="M2 17L12 22L22 17V7L12 12L2 7V17Z" fill="url(#navGradient2)" opacity="0.7" />
              <defs>
                <linearGradient id="navGradient1" x1="2" y1="2" x2="22" y2="12">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
                <linearGradient id="navGradient2" x1="2" y1="7" x2="22" y2="22">
                  <stop offset="0%" stopColor="#f093fb" />
                  <stop offset="100%" stopColor="#f5576c" />
                </linearGradient>
              </defs>
            </svg>
            <span>TranslateMeet</span>
          </div>
        </div>
        <div className="nav-right">
          <div className="credits-badge">
            <span className="credit-icon">💎</span>
            <span className="credit-count">{user?.credits || 0}</span>
          </div>
          <div className="user-menu">
            <button className="user-button">
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span>{user?.name}</span>
            </button>
            <div className="user-dropdown">
              <button onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1 className="welcome-title">Welcome back, {user?.name}! 👋</h1>
          <p className="welcome-subtitle">Ready to break language barriers?</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">💎</div>
            <div className="stat-content">
              <div className="stat-value">{credits}</div>
              <div className="stat-label">Credits Available</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{usageStats?.totalSessions || 0}</div>
              <div className="stat-label">Total Sessions</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-value">{usageStats?.totalCreditsUsed || 0} min</div>
              <div className="stat-label">Total Time Used</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-value">{usageStats?.avgCreditsPerSession || 0} min</div>
              <div className="stat-label">Avg Per Session</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-section">
          <button 
            className={`action-button primary ${(!user?.credits || user.credits <= 0) ? 'disabled' : ''}`}
            onClick={handleStartMeeting}
            disabled={!user?.credits || user.credits <= 0}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>
              {(!user?.credits || user.credits <= 0) ? 'No Credits Available' : 'Start New Meeting'}
            </span>
          </button>
          
          <button className="action-button secondary" onClick={() => {
            // Scroll to credit packages section
            document.querySelector('.credit-packages')?.scrollIntoView({ behavior: 'smooth' })
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Buy More Credits</span>
          </button>
        </div>

        {/* Recent Meetings */}
        <div className="recent-section">
          <h2 className="section-title">Recent Translation Sessions</h2>
          {usageHistory.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>No translation sessions yet</p>
              <span>Start your first meeting to see usage history here</span>
            </div>
          ) : (
            <div className="usage-history">
              {usageHistory.map((log) => (
                <div key={log.id} className="usage-item">
                  <div className="usage-icon">💬</div>
                  <div className="usage-details">
                    <div className="usage-room">Room: {log.roomCode}</div>
                    <div className="usage-time">
                      {new Date(log.startTime).toLocaleString()}
                      {log.endTime && ` - ${new Date(log.endTime).toLocaleTimeString()}`}
                    </div>
                  </div>
                  <div className="usage-credits">
                    <span className="credits-used">{log.creditsUsed} credits</span>
                    <span className="credits-label">({log.creditsUsed} min)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Credit Packages */}
        <div className="recent-section">
          <h2 className="section-title">💰 Credit Packages</h2>
          <div className="credit-packages">
            <div className="package-card">
              <div className="package-header">
                <div className="package-icon">🎯</div>
                <div className="package-name">Starter</div>
              </div>
              <div className="package-credits">100 credits</div>
              <div className="package-price">$10</div>
              <div className="package-rate">$0.10/minute</div>
              <button className="package-button" onClick={() => handleBuyCredits('starter')}>
                Buy Now
              </button>
            </div>
            
            <div className="package-card popular">
              <div className="package-badge">Most Popular</div>
              <div className="package-header">
                <div className="package-icon">🚀</div>
                <div className="package-name">Pro</div>
              </div>
              <div className="package-credits">500 credits</div>
              <div className="package-price">$40</div>
              <div className="package-rate">$0.08/minute</div>
              <div className="package-discount">20% OFF</div>
              <button className="package-button" onClick={() => handleBuyCredits('pro')}>
                Buy Now
              </button>
            </div>
            
            <div className="package-card">
              <div className="package-header">
                <div className="package-icon">💎</div>
                <div className="package-name">Business</div>
              </div>
              <div className="package-credits">1000 credits</div>
              <div className="package-price">$70</div>
              <div className="package-rate">$0.07/minute</div>
              <div className="package-discount">30% OFF</div>
              <button className="package-button" onClick={() => handleBuyCredits('business')}>
                Buy Now
              </button>
            </div>
            
            <div className="package-card">
              <div className="package-header">
                <div className="package-icon">⭐</div>
                <div className="package-name">Enterprise</div>
              </div>
              <div className="package-credits">5000 credits</div>
              <div className="package-price">$300</div>
              <div className="package-rate">$0.06/minute</div>
              <div className="package-discount">40% OFF</div>
              <button className="package-button" onClick={() => handleBuyCredits('enterprise')}>
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="modal-overlay" onClick={() => !processingPayment && setShowPaymentModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>💳 Complete Payment</h2>
                <button 
                  className="modal-close" 
                  onClick={() => !processingPayment && setShowPaymentModal(false)}
                  disabled={processingPayment}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="payment-info">
                  <p className="payment-package">
                    Package: <strong>{selectedPackage}</strong>
                  </p>
                  <p className="payment-note">
                    You will be redirected to Razorpay secure payment page
                  </p>
                </div>
                <button 
                  className="payment-button"
                  onClick={handlePayment}
                  disabled={processingPayment}
                >
                  {processingPayment ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
