/**
 * Service Worker for Love Notes
 * Handles background notifications for Safari PWA
 */

const CACHE_NAME = 'love-notes-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/apple-touch-icon.svg'
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
  )
})

// Push event - handle push notifications from backend
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Love Notes',
    body: 'You have a new notification',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: 'love-notes',
    requireInteraction: false
  }

  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = { ...notificationData, ...data }
    } catch (e) {
      notificationData.body = event.data.text() || notificationData.body
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (let client of clientList) {
          if (client.url === self.location.origin && 'focus' in client) {
            return client.focus()
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/')
        }
      })
  )
})

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data
    event.waitUntil(
      self.registration.showNotification(title, options)
    )
  }
})

