import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Notes from '../Notes/Notes'
import Journal from '../Journal/Journal'
import PartnerConnect from '../Partner/PartnerConnect'
import Profile from '../Profile/Profile'
import HeartIcon from '../HeartIcon/HeartIcon'
import './Dashboard.css'

const Dashboard = () => {
  // Load active tab from localStorage, default to 'notes'
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'notes'
  })
  const { user, logout } = useAuth()

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab)
  }, [activeTab])

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <HeartIcon size="medium" filled />
          <h1>Love Notes</h1>
        </div>
        <div className="nav-tabs">
          <button
            className={activeTab === 'notes' ? 'active' : ''}
            onClick={() => setActiveTab('notes')}
          >
            <HeartIcon size="small" />
            Notes
          </button>
          <button
            className={activeTab === 'journal' ? 'active' : ''}
            onClick={() => setActiveTab('journal')}
          >
            <HeartIcon size="small" />
            Journal
          </button>
          <button
            className={activeTab === 'partner' ? 'active' : ''}
            onClick={() => setActiveTab('partner')}
          >
            <HeartIcon size="small" filled />
            Partner
          </button>
          <button
            className={activeTab === 'profile' ? 'active' : ''}
            onClick={() => setActiveTab('profile')}
          >
            <HeartIcon size="small" filled />
            Profile
          </button>
        </div>
        <div className="nav-user">
          <span className="username">{user?.username}</span>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </nav>
      <main className="dashboard-content">
        {activeTab === 'notes' && <Notes />}
        {activeTab === 'journal' && <Journal />}
        {activeTab === 'partner' && <PartnerConnect />}
        {activeTab === 'profile' && <Profile />}
      </main>
    </div>
  )
}

export default Dashboard

