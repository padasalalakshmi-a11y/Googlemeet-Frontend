import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SERVER_URL } from '../config'

function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token')
      const errorParam = searchParams.get('error')

      console.log('🔍 Auth Callback Debug:', { token: token ? 'exists' : 'missing', errorParam })

      if (errorParam) {
        console.error('❌ OAuth Error:', errorParam)
        setError(`Authentication failed: ${errorParam}`)
        setTimeout(() => navigate('/login'), 3000)
        return
      }

      if (!token) {
        console.error('❌ No token in URL')
        setError('No token received. Please try again.')
        setTimeout(() => navigate('/login'), 3000)
        return
      }

      try {
        console.log('📡 Fetching user data...')
        // Fetch user data with the token
        const response = await fetch(`${SERVER_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        console.log('📡 Response status:', response.status)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('❌ API Error:', errorData)
          throw new Error(errorData.message || 'Failed to fetch user data')
        }

        const data = await response.json()
        console.log('✅ User data received:', data.user?.email || data.user?.name || 'User authenticated')
        console.log('📦 Full user data:', data.user)

        // Save token and user data
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(data.user))

        // Check if there's a redirect URL
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin')
        sessionStorage.removeItem('redirectAfterLogin')

        console.log('✅ Redirecting to:', redirectUrl || '/dashboard')
        // Redirect to intended page or dashboard
        navigate(redirectUrl || '/dashboard')
      } catch (err) {
        console.error('❌ Auth callback error:', err)
        setError(`Failed to complete authentication: ${err.message}`)
        setTimeout(() => navigate('/login'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {error ? (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Authentication Failed
            </h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Completing Sign In
            </h1>
            <p className="text-gray-600">Please wait...</p>
          </>
        )}
      </div>
    </div>
  )
}

export default AuthCallback
