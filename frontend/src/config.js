// API Configuration
// For production: https://lovenotes.pythonanywhere.com
// For local development: http://localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? 'https://lovenotes.pythonanywhere.com' : 'http://localhost:8000')

export default {
  API_BASE_URL,
}

