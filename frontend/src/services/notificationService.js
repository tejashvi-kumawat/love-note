/**
 * Notification Service
 * Handles browser notifications for Love Notes app
 * Works in Safari, Chrome, and PWA mode
 */

import config from '../config'

class NotificationService {
  constructor() {
    this.permission = null
    this.reminderInterval = null
    this.isSafari = this.detectSafari()
    this.isChrome = this.detectChrome()
    this.isChromePWA = this.detectChromePWA()
    this.subscriptionRetryCount = 0
    this.maxSubscriptionRetries = 3
    this.checkPermission()
  }

  /**
   * Detect if browser is Safari
   */
  detectSafari() {
    const ua = navigator.userAgent.toLowerCase()
    return /safari/.test(ua) && !/chrome/.test(ua) && !/chromium/.test(ua)
  }

  /**
   * Detect if browser is Chrome
   */
  detectChrome() {
    const ua = navigator.userAgent.toLowerCase()
    return /chrome/.test(ua) && !/edg/.test(ua) && !/opr/.test(ua)
  }

  /**
   * Detect if app is installed as Chrome PWA
   */
  detectChromePWA() {
    // Check for standalone display mode (Chrome PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true
    }
    
    // Check if running in Chrome and has service worker
    if (this.isChrome && 'serviceWorker' in navigator) {
      // Check if window is not in browser tabs (PWA mode)
      return window.navigator.standalone === false && 
             !window.matchMedia('(display-mode: browser)').matches
    }
    
    return false
  }

  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
  }

  isStandalone() {
    // Check if app is running in standalone mode (PWA)
    return (window.navigator.standalone === true) || 
           (window.matchMedia('(display-mode: standalone)').matches) ||
           (document.referrer.includes('android-app://'))
  }

  /**
   * Check current notification permission status
   */
  checkPermission() {
    if (!('Notification' in window)) {
      this.permission = 'unsupported'
      return 'unsupported'
    }
    this.permission = Notification.permission
    return this.permission
  }

  /**
   * Request notification permission from user
   * Chrome PWA requires explicit permission before push subscription
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      return 'unsupported'
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted'
      return 'granted'
    }

    // For Chrome PWA, ensure we request permission explicitly
    if (this.isChromePWA && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission()
        this.permission = permission
        localStorage.setItem('notificationPermission', permission)
        return permission
      } catch (error) {
        this.permission = 'denied'
        return 'denied'
      }
    }

    try {
      const permission = await Notification.requestPermission()
      this.permission = permission
      localStorage.setItem('notificationPermission', permission)
      return permission
    } catch (error) {
      this.permission = 'denied'
      return 'denied'
    }
  }

  /**
   * Send a notification
   */
  async sendNotification(title, options = {}) {
    // Check if notifications are enabled
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true' || 
                                  localStorage.getItem('notifications_enabled') === 'true'
    
    if (!notificationsEnabled) {
      return false
    }

    // Check permission
    this.checkPermission()
    
    if (Notification.permission !== 'granted') {
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        return false
      }
    }

    // Default options
    const defaultOptions = {
      body: '',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: 'love-notes',
      requireInteraction: false,
      silent: false,
      ...options
    }

    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return false
      }

      // Try Service Worker first (for PWA)
      if ('serviceWorker' in navigator) {
        try {
          const registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
          ])
          
          if (registration && typeof registration.showNotification === 'function') {
            await registration.showNotification(title, defaultOptions)
            return true
          }
        } catch (error) {
          // Fall through to Notification API
        }
      }

      // Fallback to Notification API
      const notification = new Notification(title, defaultOptions)
      
      setTimeout(() => {
        notification.close()
      }, this.isSafari ? 10000 : 5000)

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Notify when partner creates a note
   */
  async notifyNoteCreated(partnerName, noteTitle) {
    const enabled = localStorage.getItem('notify_note_created') !== 'false'
    if (!enabled) return false

    return await this.sendNotification(
      `💕 New Note from ${partnerName}`,
      {
        body: `"${noteTitle}"`,
        tag: 'note-created',
        requireInteraction: true
      }
    )
  }

  /**
   * Notify when partner updates a note
   */
  async notifyNoteUpdated(partnerName, noteTitle) {
    const enabled = localStorage.getItem('notify_note_updated') !== 'false'
    if (!enabled) return false

    return await this.sendNotification(
      `✏️ Note Updated by ${partnerName}`,
      {
        body: `"${noteTitle}"`,
        tag: 'note-updated',
        requireInteraction: true
      }
    )
  }

  /**
   * Notify when partner likes a note
   */
  async notifyNoteLiked(partnerName, noteTitle) {
    const enabled = localStorage.getItem('notify_note_liked') !== 'false'
    if (!enabled) return false

    return await this.sendNotification(
      `❤️ ${partnerName} liked your note`,
      {
        body: `"${noteTitle}"`,
        tag: 'note-liked',
        requireInteraction: false
      }
    )
  }

  /**
   * Notify when partner creates a journal entry
   */
  async notifyJournalCreated(partnerName, date) {
    const enabled = localStorage.getItem('notify_journal_created') !== 'false'
    if (!enabled) return false

    return await this.sendNotification(
      `📔 New Journal Entry from ${partnerName}`,
      {
        body: `Entry for ${date}`,
        tag: 'journal-created',
        requireInteraction: true
      }
    )
  }

  /**
   * Notify when partner updates a journal entry
   */
  async notifyJournalUpdated(partnerName, date) {
    const enabled = localStorage.getItem('notify_journal_updated') !== 'false'
    if (!enabled) return false

    return await this.sendNotification(
      `✏️ Journal Updated by ${partnerName}`,
      {
        body: `Entry for ${date}`,
        tag: 'journal-updated',
        requireInteraction: true
      }
    )
  }

  /**
   * Send nightly journal reminder
   */
  async sendJournalReminder() {
    const enabled = localStorage.getItem('notify_journal_reminder') !== 'false'
    if (!enabled) return false

    return await this.sendNotification(
      '📔 Time to Write Your Journal',
      {
        body: 'Don\'t forget to add today\'s journal entry! 💕',
        tag: 'journal-reminder',
        requireInteraction: true
      }
    )
  }

  /**
   * Schedule nightly journal reminder
   * Note: This only works when the app is open. For background reminders,
   * the backend cron job sends push notifications.
   */
  scheduleJournalReminder(time = '21:00') {
    this.clearJournalReminder()

    const enabled = localStorage.getItem('notify_journal_reminder') !== 'false'
    if (!enabled) return

    const [hours, minutes] = time.split(':').map(Number)
    
    const scheduleNext = () => {
      const now = new Date()
      const reminderTime = new Date()
      reminderTime.setHours(hours, minutes, 0, 0)

      if (reminderTime <= now) {
        reminderTime.setDate(reminderTime.getDate() + 1)
      }

      const msUntilReminder = reminderTime.getTime() - now.getTime()

      this.reminderInterval = setTimeout(() => {
        this.sendJournalReminder()
        scheduleNext()
      }, msUntilReminder)
    }

    scheduleNext()
    
    // Reschedule when page becomes visible again (user comes back to app)
    if (typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          // Page is visible again, reschedule reminder
          this.scheduleJournalReminder(time)
        }
      }
      
      // Remove old listener if exists
      if (this.visibilityHandler) {
        document.removeEventListener('visibilitychange', this.visibilityHandler)
      }
      
      this.visibilityHandler = handleVisibilityChange
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
  }

  /**
   * Clear scheduled journal reminder
   */
  clearJournalReminder() {
    if (this.reminderInterval) {
      clearTimeout(this.reminderInterval)
      this.reminderInterval = null
    }
    
    // Remove visibility change listener
    if (typeof document !== 'undefined' && this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = null
    }
  }

  /**
   * Subscribe to Web Push API for background notifications
   * Enhanced for Chrome PWA with retry logic (limited to prevent loops)
   */
  async subscribeToPush(retryCount = 0) {
    // Prevent infinite retry loops
    if (retryCount >= this.maxSubscriptionRetries) {
      return null
    }
    
    // iOS Safari requires the app to be added to home screen (PWA mode)
    if (this.isIOS() && !this.isStandalone()) {
      // On iOS, push notifications only work in standalone mode
      // Return null but don't throw error - user needs to add to home screen
      return null
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null
    }

    // For Chrome PWA, ensure notification permission is granted first
    if (this.isChromePWA) {
      const permission = this.checkPermission()
      if (permission !== 'granted') {
        const requestedPermission = await this.requestPermission()
        if (requestedPermission !== 'granted') {
          return null
        }
      }
    }

    try {
      // Try to get registration from global (set by main.jsx) or wait for ready
      let registration = window.serviceWorkerRegistration
      
      if (!registration) {
        // Wait for service worker to be ready (with timeout and retry)
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SW timeout')), 5000)
          )
        ])
      }
      
      // Verify registration has pushManager
      if (!registration || !registration.pushManager) {
        throw new Error('Service Worker registration or PushManager not available')
      }
      
      // Get API base URL from config (same as axios uses)
      const API_BASE_URL = config.API_BASE_URL
      
      // Get auth token
      const token = localStorage.getItem('token')
      if (!token) {
        return null
      }
      
      // Check if already subscribed locally
      let subscription = await registration.pushManager.getSubscription()
      
      // Always ensure we have a subscription (create if doesn't exist)
      if (!subscription) {
        // Request VAPID public key from backend
        const response = await fetch(`${API_BASE_URL}/api/push/vapid-public-key/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (!response.ok) {
          // Retry with backoff if not max retries
          if (retryCount < this.maxSubscriptionRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
            return this.subscribeToPush(retryCount + 1)
          }
          return null
        }
        
        const { publicKey } = await response.json()
        
        if (!publicKey) {
          return null
        }
        
        // Convert base64url to Uint8Array
        const applicationServerKey = this.urlBase64ToUint8Array(publicKey)
        
        // Subscribe to push
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
          })
        } catch (subscribeError) {
          // If subscription fails, retry once with delay
          if (retryCount < this.maxSubscriptionRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)))
            return this.subscribeToPush(retryCount + 1)
          }
          throw subscribeError
        }
      }

      // ALWAYS send subscription to backend (even if it exists locally)
      // This ensures each device/browser gets its own subscription saved
      // The backend uses (user, endpoint) as unique_together, so different devices
      // with different endpoints will create separate subscriptions
      const subData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: this.arrayBufferToBase64(subscription.getKey('auth'))
        }
      }

      const subscribeResponse = await fetch(`${API_BASE_URL}/api/push/subscribe/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subData)
      })

      if (!subscribeResponse.ok) {
        // Retry once if backend save fails
        if (retryCount < this.maxSubscriptionRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
          return this.subscribeToPush(retryCount + 1)
        }
        return null
      }

      // Reset retry count on success
      this.subscriptionRetryCount = 0
      const result = await subscribeResponse.json()
      return subscription
    } catch (error) {
      // Retry with exponential backoff if not max retries
      if (retryCount < this.maxSubscriptionRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.subscribeToPush(retryCount + 1)
      }
      return null
    }
  }

  /**
   * Convert base64url to Uint8Array for VAPID public key
   * VAPID public key should be 65 bytes (uncompressed point: 0x04 + 64 bytes)
   * But we store it as 64 bytes, so we need to add the 0x04 prefix
   */
  urlBase64ToUint8Array(base64String) {
    // Add padding if needed
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    
    // VAPID public key should be 65 bytes (0x04 + 64 bytes for uncompressed point)
    // But our key is 64 bytes, so we need to add 0x04 prefix
    const outputArray = new Uint8Array(65)
    outputArray[0] = 0x04 // Uncompressed point indicator
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i + 1] = rawData.charCodeAt(i)
    }
    
    return outputArray
  }

  /**
   * Convert ArrayBuffer to base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  /**
   * Initialize notification service
   */
  async initialize() {
    this.checkPermission()
    const reminderTime = localStorage.getItem('journal_reminder_time') || '21:00'
    
    if (this.permission === 'granted') {
      this.scheduleJournalReminder(reminderTime)
      
      // Subscribe to push notifications for background support
      // Works for Safari PWA, Chrome PWA, and regular browsers
      // Wait a bit for service worker to be ready (especially for Chrome PWA)
      setTimeout(async () => {
        try {
          await this.subscribeToPush()
        } catch (error) {
          // Push subscription failed, but continue with regular notifications
        }
      }, this.isChromePWA ? 2000 : 1000) // Chrome PWA needs more time
    } else if (this.isChromePWA) {
      // For Chrome PWA, try to request permission and subscribe
      setTimeout(async () => {
        const permission = await this.requestPermission()
        if (permission === 'granted') {
          this.scheduleJournalReminder(reminderTime)
          try {
            await this.subscribeToPush()
          } catch (error) {
            // Push subscription failed
          }
        }
      }, 1000)
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences) {
    Object.keys(preferences).forEach(key => {
      if (preferences[key] !== undefined) {
        localStorage.setItem(key, preferences[key].toString())
        if (key.includes('_')) {
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
          localStorage.setItem(camelKey, preferences[key].toString())
        }
      }
    })

    // If notifications are enabled and permission is granted, ensure push subscription
    if (preferences.notifications_enabled && this.permission === 'granted') {
      try {
        await this.subscribeToPush()
      } catch (error) {
        // Push subscription failed, but continue
      }
    }

    if (preferences.journal_reminder_time) {
      this.scheduleJournalReminder(preferences.journal_reminder_time)
    } else if (preferences.notify_journal_reminder === false) {
      this.clearJournalReminder()
    } else if (preferences.notify_journal_reminder === true && this.permission === 'granted') {
      const reminderTime = localStorage.getItem('journal_reminder_time') || '21:00'
      this.scheduleJournalReminder(reminderTime)
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService()

export default notificationService
