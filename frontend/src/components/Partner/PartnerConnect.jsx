import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import HeartIcon from '../HeartIcon/HeartIcon'
import './PartnerConnect.css'

const PartnerConnect = () => {
  const { user, connectPartner, fetchUser } = useAuth()
  const [partnerCode, setPartnerCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [partnerProfile, setPartnerProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  useEffect(() => {
    // Refresh user data when component mounts
    fetchUser()
  }, [])
  
  useEffect(() => {
    // Fetch partner profile only when partner changes
    if (user?.partner?.id) {
      fetchPartnerProfile()
    } else {
      setPartnerProfile(null)
    }
  }, [user?.partner?.id])
  
  const fetchPartnerProfile = async () => {
    if (!user?.partner?.id) {
      setPartnerProfile(null)
      return
    }
    // Prevent multiple simultaneous requests
    if (loadingProfile) return
    
    setLoadingProfile(true)
    try {
      const response = await axios.get('/api/profile/partner/')
      setPartnerProfile(response.data)
    } catch (error) {
      if (error.response?.status !== 404) {
        // Error handled silently('Failed to fetch partner profile:', error)
      }
      setPartnerProfile(null)
    } finally {
      setLoadingProfile(false)
    }
  }
  
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect from your partner?')) {
      return
    }

    try {
      await axios.post('/api/auth/disconnect-partner/')
      setSuccess('Partner disconnected successfully')
      setPartnerProfile(null)
      await fetchUser()
      setTimeout(() => {
        setSuccess('')
      }, 2000)
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to disconnect partner')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleConnect = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const result = await connectPartner(partnerCode)
    if (result.success) {
      setSuccess('Partner connected successfully!')
      setPartnerCode('')
      // Refresh user data - useEffect will automatically fetch partner profile
      await fetchUser()
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const copyPartnerCode = () => {
    navigator.clipboard.writeText(user?.partner_code)
    setSuccess('Partner code copied!')
    setTimeout(() => setSuccess(''), 2000)
  }

  return (
    <div className="partner-container">
      <div className="partner-card">
        <div className="partner-header">
          <div className="header-icon">
            <HeartIcon size="large" filled />
          </div>
          <h2>Connect with Your Partner</h2>
          <p>Share your partner code or enter theirs to connect</p>
        </div>

        {user?.partner ? (
          <div className="partner-connected">
            <div className="connected-badge">
              <div className="heart-animation">
                <HeartIcon size="large" filled />
              </div>
              <h3>Connected!</h3>
            </div>
            <div className="partner-info-card">
              <div className="partner-avatar">
                <HeartIcon size="medium" filled />
              </div>
              <div className="partner-details">
                <div className="partner-detail-item">
                  <span className="detail-label">Partner Name</span>
                  <span className="detail-value">{user.partner.username}</span>
                </div>
                <div className="partner-detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{user.partner.email}</span>
                </div>
              </div>
            </div>
            <div className="connected-message">
              <HeartIcon size="small" filled />
              <span>You can now see each other's shared notes!</span>
              <HeartIcon size="small" filled />
            </div>
            
            <button onClick={handleDisconnect} className="disconnect-btn">
              Disconnect Partner
            </button>
            
            {loadingProfile ? (
              <div className="profile-loading">Loading...</div>
            ) : partnerProfile && Object.keys(partnerProfile).length > 0 ? (
              <div className="partner-profile-section">
                <h3 className="profile-section-title">Partner's Profile</h3>
                
                {/* Long text fields - full width */}
                {partnerProfile.bio && (
                  <div className="profile-item-full">
                    <span className="profile-label-full">Bio</span>
                    <p className="profile-value-full">{partnerProfile.bio}</p>
                  </div>
                )}
                
                {partnerProfile.hobbies && (
                  <div className="profile-item-full">
                    <span className="profile-label-full">Hobbies</span>
                    <p className="profile-value-full">{partnerProfile.hobbies}</p>
                  </div>
                )}
                
                {/* Short fields - compact grid */}
                <div className="profile-items-compact">
                  {partnerProfile.birthday && (
                    <div className="profile-item-compact">
                      <span className="profile-label">Birthday</span>
                      <span className="profile-value">{new Date(partnerProfile.birthday).toLocaleDateString()}</span>
                    </div>
                  )}
                  {partnerProfile.location && (
                    <div className="profile-item-compact">
                      <span className="profile-label">Location</span>
                      <span className="profile-value">{partnerProfile.location}</span>
                    </div>
                  )}
                  {partnerProfile.favorite_color && (
                    <div className="profile-item-compact">
                      <span className="profile-label">Color</span>
                      <span className="profile-value">{partnerProfile.favorite_color}</span>
                    </div>
                  )}
                  {partnerProfile.favorite_food && (
                    <div className="profile-item-compact">
                      <span className="profile-label">Food</span>
                      <span className="profile-value">{partnerProfile.favorite_food}</span>
                    </div>
                  )}
                  {partnerProfile.favorite_movie && (
                    <div className="profile-item-compact">
                      <span className="profile-label">Movie</span>
                      <span className="profile-value">{partnerProfile.favorite_movie}</span>
                    </div>
                  )}
                  {partnerProfile.favorite_song && (
                    <div className="profile-item-compact">
                      <span className="profile-label">Song</span>
                      <span className="profile-value">{partnerProfile.favorite_song}</span>
                    </div>
                  )}
                  {partnerProfile.favorite_place && (
                    <div className="profile-item-compact">
                      <span className="profile-label">Place</span>
                      <span className="profile-value">{partnerProfile.favorite_place}</span>
                    </div>
                  )}
                  {partnerProfile.relationship_anniversary && (
                    <div className="profile-item-compact">
                      <span className="profile-label">Anniversary</span>
                      <span className="profile-value">{new Date(partnerProfile.relationship_anniversary).toLocaleDateString()}</span>
                    </div>
                  )}
                  {partnerProfile.love_language && (
                    <div className="profile-item-compact">
                      <span className="profile-label">Love Language</span>
                      <span className="profile-value">{partnerProfile.love_language}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : partnerProfile && Object.keys(partnerProfile).length === 0 ? (
              <div className="no-profile-message">No profile info yet</div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="partner-code-section">
              <h3>
                <HeartIcon size="medium" />
                Your Partner Code
              </h3>
              <div className="code-display">
                <code>{user?.partner_code}</code>
                <button onClick={copyPartnerCode} className="copy-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copy
                </button>
              </div>
              <p className="code-instruction">
                Share this code with your partner so they can connect with you
              </p>
            </div>

            <div className="partner-connect-section">
              <h3>
                <HeartIcon size="medium" />
                Enter Partner Code
              </h3>
              <form onSubmit={handleConnect} className="connect-form">
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                <div className="form-group">
                  <input
                    type="text"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value)}
                    placeholder="Enter partner code"
                    required
                    className="partner-code-input"
                  />
                </div>
                <button
                  type="submit"
                  className="connect-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <HeartIcon size="small" filled />
                      Connect
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default PartnerConnect

