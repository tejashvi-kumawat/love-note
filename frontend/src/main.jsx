import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Register Service Worker EARLY for PWA support (before React app loads)
// This ensures SW is ready when notification service tries to subscribe
if ('serviceWorker' in navigator) {
  // Register immediately, don't wait for window load
  let registrationAttempts = 0
  const MAX_REGISTRATION_ATTEMPTS = 3
  
  const registerServiceWorker = async () => {
    if (registrationAttempts >= MAX_REGISTRATION_ATTEMPTS) {
      return
    }
    
    registrationAttempts++
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready
      
      // Store registration globally for notification service
      window.serviceWorkerRegistration = registration
    } catch (error) {
      // Silently handle errors - service worker is optional
      // Retry with exponential backoff (max 3 attempts)
      if (registrationAttempts < MAX_REGISTRATION_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, registrationAttempts - 1), 5000)
        setTimeout(registerServiceWorker, delay)
      }
    }
  }
  
  // Start registration immediately
  registerServiceWorker()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

