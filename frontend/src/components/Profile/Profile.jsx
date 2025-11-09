import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import HeartIcon from '../HeartIcon/HeartIcon'
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

  useEffect(() => {
    fetchProfile()
  }, [user])

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
    } catch (error) {
      console.error('Failed to fetch profile:', error)
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

