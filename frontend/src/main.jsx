import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  // Wait for window load to ensure all resources are ready
  window.addEventListener('load', () => {
    let registrationAttempts = 0
    const MAX_REGISTRATION_ATTEMPTS = 3
    
    const registerServiceWorker = async () => {
      if (registrationAttempts >= MAX_REGISTRATION_ATTEMPTS) {
        console.warn('Service Worker registration failed after max attempts')
        return
      }
      
      registrationAttempts++
      
      try {
        // Check if service worker file exists first
        const swUrl = '/sw.js'
        const response = await fetch(swUrl, { method: 'HEAD' })
        
        if (!response.ok) {
          console.warn('Service Worker file not found, skipping registration')
          return
        }
        
        const registration = await navigator.serviceWorker.register(swUrl, {
          scope: '/'
        })
        
        console.log('Service Worker registered successfully:', registration.scope)
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready
        
        // Store registration globally for notification service
        window.serviceWorkerRegistration = registration
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New Service Worker available')
              }
            })
          }
        })
      } catch (error) {
        console.error('Service Worker registration error:', error)
        // Retry with exponential backoff (max 3 attempts)
        if (registrationAttempts < MAX_REGISTRATION_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, registrationAttempts - 1), 5000)
          setTimeout(registerServiceWorker, delay)
        }
      }
    }
    
    // Start registration after page load
    registerServiceWorker()
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
