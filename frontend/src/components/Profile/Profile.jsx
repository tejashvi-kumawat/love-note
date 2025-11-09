import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import HeartIcon from '../HeartIcon/HeartIcon'
import notificationService from '../../services/notificationService'
import './Profile.css'

const Profile = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    bio: '',
    birthday: '',
    location: '',
    phone: '',
    favorite_color: '',
    favorite_food: '',
    favorite_movie: '',
    favorite_song: '',
    favorite_place: '',
    hobbies: '',
    relationship_anniversary: '',
    love_language: '',
    personal_notes: '',
  })

  const [notificationSettings, setNotificationSettings] = useState({
    notifications_enabled: false,
    notify_note_created: true,
    notify_note_updated: true,
    notify_note_liked: true,
    notify_journal_created: true,
    notify_journal_updated: true,
    notify_journal_reminder: true,
    journal_reminder_time: '21:00',
  })

  const [notificationPermission, setNotificationPermission] = useState('default')

  useEffect(() => {
    fetchProfile()
    checkNotificationPermission()
  }, [user])

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    } else {
      setNotificationPermission('unsupported')
    }
  }

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/profile/')
      setProfile(response.data)
      setFormData({
        bio: response.data.bio || '',
        birthday: response.data.birthday || '',
        location: response.data.location || '',
        phone: response.data.phone || '',
        favorite_color: response.data.favorite_color || '',
        favorite_food: response.data.favorite_food || '',
        favorite_movie: response.data.favorite_movie || '',
        favorite_song: response.data.favorite_song || '',
        favorite_place: response.data.favorite_place || '',
        hobbies: response.data.hobbies || '',
        relationship_anniversary: response.data.relationship_anniversary || '',
        love_language: response.data.love_language || '',
        personal_notes: response.data.personal_notes || '',
      })

      // Load notification settings
      if (response.data.notifications_enabled !== undefined) {
        const reminderTime = response.data.journal_reminder_time 
          ? response.data.journal_reminder_time.substring(0, 5) // Convert "21:00:00" to "21:00"
          : '21:00'
        
        setNotificationSettings({
          notifications_enabled: response.data.notifications_enabled || false,
          notify_note_created: response.data.notify_note_created !== false,
          notify_note_updated: response.data.notify_note_updated !== false,
          notify_note_liked: response.data.notify_note_liked !== false,
          notify_journal_created: response.data.notify_journal_created !== false,
          notify_journal_updated: response.data.notify_journal_updated !== false,
          notify_journal_reminder: response.data.notify_journal_reminder !== false,
          journal_reminder_time: reminderTime,
        })

        // Sync to localStorage for notification service
        notificationService.updatePreferences({
          notifications_enabled: response.data.notifications_enabled || false,
          notify_note_created: response.data.notify_note_created !== false,
          notify_note_updated: response.data.notify_note_updated !== false,
          notify_note_liked: response.data.notify_note_liked !== false,
          notify_journal_created: response.data.notify_journal_created !== false,
          notify_journal_updated: response.data.notify_journal_updated !== false,
          notify_journal_reminder: response.data.notify_journal_reminder !== false,
          journal_reminder_time: reminderTime,
        })
      }
    } catch (error) {
      // Error handled silently('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await axios.put('/api/profile/', formData)
      setSuccess('Profile updated successfully!')
      await fetchProfile()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update profile')
      setTimeout(() => setError(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationChange = (e) => {
    const { name, type, checked, value } = e.target
    const newValue = type === 'checkbox' ? checked : value
    
    setNotificationSettings(prev => ({
      ...prev,
      [name]: newValue
    }))
  }

  const handleRequestPermission = async () => {
    const permission = await notificationService.requestPermission()
    setNotificationPermission(permission)
    
    if (permission === 'granted') {
      setNotificationSettings(prev => ({
        ...prev,
        notifications_enabled: true
      }))
      // Subscribe to push notifications for background support
      try {
        await notificationService.subscribeToPush()
      } catch (error) {
        // Push subscription failed, but continue
      }
    }
  }

  const handleSaveNotifications = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Convert time to HH:MM:SS format for backend
      const reminderTime = notificationSettings.journal_reminder_time + ':00'
      
      const notificationData = {
        ...notificationSettings,
        journal_reminder_time: reminderTime
      }

      await axios.put('/api/profile/', notificationData)
      
      // Update notification service preferences
      notificationService.updatePreferences(notificationSettings)
      
      // If notifications are enabled, ensure push subscription is active
      if (notificationSettings.notifications_enabled && notificationPermission === 'granted') {
        try {
          await notificationService.subscribeToPush()
        } catch (error) {
          // Push subscription failed, but continue
        }
      }
      
      setSuccess('Notification settings saved successfully!')
      await fetchProfile()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save notification settings')
      setTimeout(() => setError(''), 3000)
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return <div className="loading-container">Loading profile...</div>
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="header-icon">
            <HeartIcon size="large" filled />
          </div>
          <h2>My Profile</h2>
          <p>Manage your profile information</p>
        </div>

        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Birthday</label>
                <input
                  type="date"
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Favorites</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Favorite Color</label>
                <input
                  type="text"
                  name="favorite_color"
                  value={formData.favorite_color}
                  onChange={handleChange}
                  placeholder="e.g., Pink"
                />
              </div>

              <div className="form-group">
                <label>Favorite Food</label>
                <input
                  type="text"
                  name="favorite_food"
                  value={formData.favorite_food}
                  onChange={handleChange}
                  placeholder="e.g., Pizza"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Favorite Movie</label>
                <input
                  type="text"
                  name="favorite_movie"
                  value={formData.favorite_movie}
                  onChange={handleChange}
                  placeholder="Movie name"
                />
              </div>

              <div className="form-group">
                <label>Favorite Song</label>
                <input
                  type="text"
                  name="favorite_song"
                  value={formData.favorite_song}
                  onChange={handleChange}
                  placeholder="Song name"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Favorite Place</label>
              <input
                type="text"
                name="favorite_place"
                value={formData.favorite_place}
                onChange={handleChange}
                placeholder="e.g., Beach, Mountains"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Relationship & Personal</h3>
            <div className="form-group">
              <label>Hobbies</label>
              <textarea
                name="hobbies"
                value={formData.hobbies}
                onChange={handleChange}
                rows="3"
                placeholder="Your hobbies..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Relationship Anniversary</label>
                <input
                  type="date"
                  name="relationship_anniversary"
                  value={formData.relationship_anniversary}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Love Language</label>
                <select
                  name="love_language"
                  value={formData.love_language}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="Words of Affirmation">Words of Affirmation</option>
                  <option value="Acts of Service">Acts of Service</option>
                  <option value="Receiving Gifts">Receiving Gifts</option>
                  <option value="Quality Time">Quality Time</option>
                  <option value="Physical Touch">Physical Touch</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Personal Notes</label>
              <textarea
                name="personal_notes"
                value={formData.personal_notes}
                onChange={handleChange}
                rows="4"
                placeholder="Any personal notes or thoughts..."
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Notifications</h3>
            <div className="notification-info">
              {notificationPermission === 'unsupported' && (
                <div className="info-message">
                  Your browser does not support notifications.
                </div>
              )}
              {notificationPermission === 'default' && (
                <div className="info-message">
                  Enable notifications to receive updates from your partner and reminders.
                  <button 
                    type="button" 
                    className="enable-notifications-btn"
                    onClick={handleRequestPermission}
                  >
                    Enable Notifications
                  </button>
                </div>
              )}
              {notificationPermission === 'denied' && (
                <div className="error-message">
                  Notifications are blocked. Please enable them in your browser settings.
                </div>
              )}
              {notificationPermission === 'granted' && (
                <div className="success-message">
                  ✓ Notifications are enabled
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="notifications_enabled"
                  checked={notificationSettings.notifications_enabled}
                  onChange={handleNotificationChange}
                  disabled={notificationPermission !== 'granted'}
                />
                <span>Enable Browser Notifications</span>
              </label>
            </div>

            {notificationSettings.notifications_enabled && (
              <>
                <div className="notification-subsection">
                  <h4>Note Notifications</h4>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="notify_note_created"
                        checked={notificationSettings.notify_note_created}
                        onChange={handleNotificationChange}
                      />
                      <span>Notify when partner creates a note</span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="notify_note_updated"
                        checked={notificationSettings.notify_note_updated}
                        onChange={handleNotificationChange}
                      />
                      <span>Notify when partner updates a note</span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="notify_note_liked"
                        checked={notificationSettings.notify_note_liked}
                        onChange={handleNotificationChange}
                      />
                      <span>Notify when partner likes a note</span>
                    </label>
                  </div>
                </div>

                <div className="notification-subsection">
                  <h4>Journal Notifications</h4>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="notify_journal_created"
                        checked={notificationSettings.notify_journal_created}
                        onChange={handleNotificationChange}
                      />
                      <span>Notify when partner creates a journal entry</span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="notify_journal_updated"
                        checked={notificationSettings.notify_journal_updated}
                        onChange={handleNotificationChange}
                      />
                      <span>Notify when partner updates a journal entry</span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="notify_journal_reminder"
                        checked={notificationSettings.notify_journal_reminder}
                        onChange={handleNotificationChange}
                      />
                      <span>Enable nightly journal reminder</span>
                    </label>
                  </div>
                  {notificationSettings.notify_journal_reminder && (
                    <div className="form-group">
                      <label>Reminder Time (24-hour format)</label>
                      <input
                        type="time"
                        name="journal_reminder_time"
                        value={notificationSettings.journal_reminder_time}
                        onChange={handleNotificationChange}
                      />
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="save-btn" 
                    onClick={handleSaveNotifications}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Notification Settings'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Profile

