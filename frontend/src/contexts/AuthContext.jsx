import { createContext, useState, useEffect, useContext } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me/')
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login/', {
        username,
        password,
      })
      const { access, user: userData } = response.data
      localStorage.setItem('token', access)
      setToken(access)
      setUser(userData)
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      }
    }
  }

  const register = async (username, email, password, password2) => {
    try {
      const response = await axios.post('/api/auth/register/', {
        username,
        email,
        password,
        password2,
      })
      const { access, user: userData } = response.data
      localStorage.setItem('token', access)
      setToken(access)
      setUser(userData)
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
  }

  const connectPartner = async (partnerCode) => {
    try {
      const response = await axios.post('/api/auth/connect-partner/', {
        partner_code: partnerCode,
      })
      await fetchUser()
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to connect partner',
      }
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    connectPartner,
    fetchUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

