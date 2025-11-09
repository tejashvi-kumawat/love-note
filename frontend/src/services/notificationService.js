/**
 * Notification Service
 * Handles browser notifications for Love Notes app
 * Works in Safari, Chrome, and PWA mode
 */

class NotificationService {
  constructor() {
    this.permission = null
    this.reminderInterval = null
    this.isSafari = this.detectSafari()
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
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      return 'unsupported'
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted'
      return 'granted'
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
      console.error('Error sending notification:', error)
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
  }

  /**
   * Clear scheduled journal reminder
   */
  clearJournalReminder() {
    if (this.reminderInterval) {
      clearTimeout(this.reminderInterval)
      this.reminderInterval = null
    }
  }

  /**
   * Initialize notification service
   */
  async initialize() {
    this.checkPermission()
    const reminderTime = localStorage.getItem('journal_reminder_time') || '21:00'
    
    if (this.permission === 'granted') {
      this.scheduleJournalReminder(reminderTime)
    }
  }

  /**
   * Update notification preferences
   */
  updatePreferences(preferences) {
    Object.keys(preferences).forEach(key => {
      if (preferences[key] !== undefined) {
        localStorage.setItem(key, preferences[key].toString())
        if (key.includes('_')) {
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
          localStorage.setItem(camelKey, preferences[key].toString())
        }
      }
    })

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
