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
      // First verify the service worker file exists and is JavaScript
      const swUrl = '/sw.js'
      const response = await fetch(swUrl, { method: 'HEAD' })
      
      // Check if response is actually JavaScript (not HTML)
      const contentType = response.headers.get('content-type')
      if (contentType && !contentType.includes('javascript') && !contentType.includes('application/javascript')) {
        // If server returns HTML (like 404 page), skip registration
        return
      }
      
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/'
      })
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready
      
      // Store registration globally for notification service
      window.serviceWorkerRegistration = registration
    } catch (error) {
      // Check if error is MIME type related
      if (error.message && error.message.includes('MIME type')) {
        // Service worker file not found or wrong MIME type - skip registration
        return
      }
      
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

