/**
 * Notification Service
 * Handles browser notifications for Love Notes app
 * Works in Safari, Chrome, and PWA mode
 */

class NotificationService {
  constructor() {
    this.permission = null
    this.reminderInterval = null
    this.checkPermission()
  }

  /**
   * Check current notification permission status
   */
  checkPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      this.permission = 'unsupported'
      return 'unsupported'
    }
    
    this.permission = Notification.permission
    return this.permission
  }

  /**
   * Request notification permission from user
   * @returns {Promise<string>} Permission status ('granted', 'denied', 'default')
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
      
      // Save permission status to localStorage
      localStorage.setItem('notificationPermission', permission)
      
      return permission
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      this.permission = 'denied'
      return 'denied'
    }
  }

  /**
   * Send a notification
   * @param {string} title - Notification title
   * @param {object} options - Notification options (body, icon, badge, tag, etc.)
   */
  async sendNotification(title, options = {}) {
    // Check if notifications are enabled in user preferences
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true'
    if (!notificationsEnabled) {
      return false
    }

    // Check permission
    if (this.permission !== 'granted') {
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
      // Use Service Worker registration if available (for PWA)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        if (registration.showNotification) {
          await registration.showNotification(title, defaultOptions)
          return true
        }
      }

      // Fallback to regular Notification API
      const notification = new Notification(title, defaultOptions)
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close()
      }, 5000)

      return true
    } catch (error) {
      console.error('Error sending notification:', error)
      return false
    }
  }

  /**
   * Notify when partner creates a note
   * @param {string} partnerName - Partner's username
   * @param {string} noteTitle - Note title
   */
  async notifyNoteCreated(partnerName, noteTitle) {
    const enabled = localStorage.getItem('notify_note_created') !== 'false'
    if (!enabled) return false

    return await this.sendNotification(
      '💕 New Note from ' + partnerName,
      {
        body: `"${noteTitle}"`,
        tag: 'note-created',
        requireInteraction: true
      }
    )
  }

  /**
   * Notify when partner updates a note
   * @param {string} partnerName - Partner's username
   * @param {string} noteTitle - Note title
   */
  async notifyNoteUpdated(partnerName, noteTitle) {
    const enabled = localStorage.getItem('notify_note_updated') !== 'false'
    if (!enabled) return false

    return await this.sendNotification(
      '✏️ Note Updated by ' + partnerName,
      {
        body: `"${noteTitle}"`,
        tag: 'note-updated',
        requireInteraction: true
      }
    )
  }

  /**
   * Notify when partner likes a note
   * @param {string} partnerName - Partner's username
   * @param {string} noteTitle - Note title
   */
  async notifyNoteLiked(partnerName, noteTitle) {
    const enabled = localStorage.getItem('notify_note_liked') !== 'false'
    if (!enabled) return false

    return await this.sendNotification(
      '❤️ ' + partnerName + ' liked your note',
      {
        body: `"${noteTitle}"`,
        tag: 'note-liked',
        requireInteraction: false
      }
    )
  }

  /**
   * Notify when partner creates a journal entry
   * @param {string} partnerName - Partner's username
   * @param {string} date - Journal date
   */
  async notifyJournalCreated(partnerName, date) {
    const enabled = localStorage.getItem('notify_journal_created') !== 'false'
    if (!enabled) return false

    return await this.sendNotification(
      '📔 New Journal Entry from ' + partnerName,
      {
        body: `Entry for ${date}`,
        tag: 'journal-created',
        requireInteraction: true
      }
    )
  }

  /**
   * Notify when partner updates a journal entry
   * @param {string} partnerName - Partner's username
   * @param {string} date - Journal date
   */
  async notifyJournalUpdated(partnerName, date) {
    const enabled = localStorage.getItem('notify_journal_updated') !== 'false'
    if (!enabled) return false

    return await this.sendNotification(
      '✏️ Journal Updated by ' + partnerName,
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
   * @param {string} time - Time in HH:MM format (24-hour)
   */
  scheduleJournalReminder(time = '21:00') {
    // Clear existing reminder
    this.clearJournalReminder()

    const enabled = localStorage.getItem('notify_journal_reminder') !== 'false'
    if (!enabled) return

    const [hours, minutes] = time.split(':').map(Number)
    
    const scheduleNext = () => {
      const now = new Date()
      const reminderTime = new Date()
      reminderTime.setHours(hours, minutes, 0, 0)

      // If time has passed today, schedule for tomorrow
      if (reminderTime <= now) {
        reminderTime.setDate(reminderTime.getDate() + 1)
      }

      const msUntilReminder = reminderTime.getTime() - now.getTime()

      this.reminderInterval = setTimeout(() => {
        this.sendJournalReminder()
        // Schedule next reminder for tomorrow
        scheduleNext()
      }, msUntilReminder)

      console.log(`Journal reminder scheduled for ${reminderTime.toLocaleString()}`)
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
   * Loads preferences and schedules reminders
   */
  async initialize() {
    // Check permission on load
    this.checkPermission()

    // Load notification preferences from localStorage
    // These will be synced from backend profile settings
    const reminderTime = localStorage.getItem('journal_reminder_time') || '21:00'
    
    // Schedule reminder if enabled
    if (this.permission === 'granted') {
      this.scheduleJournalReminder(reminderTime)
    }
  }

  /**
   * Update notification preferences
   * @param {object} preferences - Notification preferences object
   */
  updatePreferences(preferences) {
    Object.keys(preferences).forEach(key => {
      if (preferences[key] !== undefined) {
        localStorage.setItem(key, preferences[key].toString())
      }
    })

    // Reschedule reminder if time changed
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

