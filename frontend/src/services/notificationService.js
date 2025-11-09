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
    console.log('sendNotification called:', title, options)
    
    // Check if notifications are enabled in user preferences (check both key formats)
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true' || 
                                  localStorage.getItem('notifications_enabled') === 'true'
    
    console.log('Notifications enabled check:', {
      notificationsEnabled,
      'notificationsEnabled': localStorage.getItem('notificationsEnabled'),
      'notifications_enabled': localStorage.getItem('notifications_enabled')
    })
    
    if (!notificationsEnabled) {
      console.log('Notifications disabled in preferences - skipping')
      return false
    }

    // Check permission - update it first
    this.checkPermission()
    console.log('Current permission:', this.permission, 'Notification.permission:', Notification.permission)
    
    // Use Notification.permission directly as it's the source of truth
    if (Notification.permission !== 'granted') {
      console.log('Permission not granted, requesting...', Notification.permission)
      const permission = await this.requestPermission()
      console.log('Permission after request:', permission)
      if (permission !== 'granted') {
        console.log('Permission denied:', permission)
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
      // Check if Notification API is available
      if (!('Notification' in window)) {
        console.error('Notifications not supported in this browser')
        return false
      }

      // Check permission one more time before sending
      if (Notification.permission !== 'granted') {
        console.error('Notification permission not granted:', Notification.permission)
        return false
      }

      // Try Service Worker first (for PWA)
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready.catch(() => null)
          if (registration && registration.showNotification) {
            console.log('Attempting Service Worker notification...')
            await registration.showNotification(title, defaultOptions)
            console.log('✅ Notification sent via Service Worker')
            return true
          }
        } catch (swError) {
          console.log('Service Worker notification failed, using fallback:', swError)
        }
      }

      // Fallback to regular Notification API (works in Safari, Chrome, etc.)
      console.log('Attempting Notification API...')
      const notification = new Notification(title, defaultOptions)
      console.log('✅ Notification sent via Notification API')
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close()
      }, 5000)

      // Handle click event
      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      return true
    } catch (error) {
      console.error('❌ Error sending notification:', error)
      return false
    }
  }

  /**
   * Notify when partner creates a note
   * @param {string} partnerName - Partner's username
   * @param {string} noteTitle - Note title
   */
  async notifyNoteCreated(partnerName, noteTitle) {
    const enabled = localStorage.getItem('notify_note_created') !== 'false' &&
                    localStorage.getItem('notifyNoteCreated') !== 'false'
    if (!enabled) {
      console.log('Note created notification disabled')
      return false
    }

    console.log('Sending note created notification:', partnerName, noteTitle)
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
    const enabled = localStorage.getItem('notify_note_updated') !== 'false' &&
                    localStorage.getItem('notifyNoteUpdated') !== 'false'
    if (!enabled) {
      console.log('Note updated notification disabled')
      return false
    }

    console.log('Sending note updated notification:', partnerName, noteTitle)
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
    const enabled = localStorage.getItem('notify_note_liked') !== 'false' &&
                    localStorage.getItem('notifyNoteLiked') !== 'false'
    if (!enabled) {
      console.log('Note liked notification disabled')
      return false
    }

    console.log('Sending note liked notification:', partnerName, noteTitle)
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
    const enabled = localStorage.getItem('notify_journal_created') !== 'false' &&
                    localStorage.getItem('notifyJournalCreated') !== 'false'
    if (!enabled) {
      console.log('Journal created notification disabled')
      return false
    }

    console.log('Sending journal created notification:', partnerName, date)
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
    const enabled = localStorage.getItem('notify_journal_updated') !== 'false' &&
                    localStorage.getItem('notifyJournalUpdated') !== 'false'
    if (!enabled) {
      console.log('Journal updated notification disabled')
      return false
    }

    console.log('Sending journal updated notification:', partnerName, date)
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
    const enabled = localStorage.getItem('notify_journal_reminder') !== 'false' &&
                    localStorage.getItem('notifyJournalReminder') !== 'false'
    if (!enabled) {
      console.log('Journal reminder disabled')
      return false
    }

    console.log('Sending journal reminder notification')
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

    const enabled = localStorage.getItem('notify_journal_reminder') !== 'false' &&
                    localStorage.getItem('notifyJournalReminder') !== 'false'
    if (!enabled) {
      console.log('Journal reminder scheduling disabled')
      return
    }

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
   * Test notification - for debugging
   * Call this from browser console: notificationService.testNotification()
   */
  async testNotification() {
    console.log('Testing notification...')
    console.log('Permission:', Notification.permission)
    console.log('Notifications enabled:', localStorage.getItem('notifications_enabled'))
    
    // Temporarily enable notifications for testing
    const originalEnabled = localStorage.getItem('notifications_enabled')
    localStorage.setItem('notifications_enabled', 'true')
    
    const result = await this.sendNotification('Test Notification', {
      body: 'This is a test notification from Love Notes! 💕',
      tag: 'test',
      requireInteraction: false
    })
    
    // Restore original setting
    if (originalEnabled !== null) {
      localStorage.setItem('notifications_enabled', originalEnabled)
    } else {
      localStorage.removeItem('notifications_enabled')
    }
    
    console.log('Test notification result:', result)
    return result
  }

  /**
   * Update notification preferences
   * @param {object} preferences - Notification preferences object
   */
  updatePreferences(preferences) {
    Object.keys(preferences).forEach(key => {
      if (preferences[key] !== undefined) {
        // Store both formats for compatibility
        localStorage.setItem(key, preferences[key].toString())
        // Also store without underscore for backward compatibility
        if (key.includes('_')) {
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
          localStorage.setItem(camelKey, preferences[key].toString())
        }
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

