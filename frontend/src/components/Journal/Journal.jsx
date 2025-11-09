import { useState, useEffect } from 'react'
import axios from 'axios'
import Calendar from '../Calendar/Calendar'
import RichTextEditor from '../RichTextEditor/RichTextEditor'
import HeartIcon from '../HeartIcon/HeartIcon'
import { format } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext'
import notificationService from '../../services/notificationService'
import './Journal.css'

const Journal = () => {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedEntry, setExpandedEntry] = useState(null) // Track which entry is expanded

  const [lastEntryIds, setLastEntryIds] = useState(new Set())

  useEffect(() => {
    fetchEntries()
    
    // Set up polling to check for new journal entries from partner (every 30 seconds)
    const pollInterval = setInterval(() => {
      fetchEntries()
    }, 30000) // Poll every 30 seconds
    
    return () => clearInterval(pollInterval)
  }, [])

  useEffect(() => {
    if (selectedDate) {
      fetchEntryForDate(selectedDate)
    }
  }, [selectedDate])

  // Check for new journal entries and send notifications
  useEffect(() => {
    if (entries.length > 0 && lastEntryIds.size > 0) {
      // Find new entries (entries that weren't in lastEntryIds)
      const newEntries = entries.filter(entry => 
        !lastEntryIds.has(entry.id) && 
        entry.author?.id !== user?.id && // Only notify for partner's entries
        user?.partner
      )
      
      newEntries.forEach(entry => {
        // Check if it's a newly created entry (recently created)
        const entryDate = new Date(entry.created_at)
        const now = new Date()
        const minutesDiff = (now - entryDate) / (1000 * 60)
        
        // Only notify if entry was created in the last 5 minutes
        if (minutesDiff < 5) {
          // For Safari, trigger notification in a way that maintains user interaction context
          setTimeout(() => {
            const dateStr = format(new Date(entry.date), 'yyyy-MM-dd')
            notificationService.notifyJournalCreated(entry.author?.username || 'Your partner', dateStr)
          }, 0)
        }
      })
    }
    
    // Update lastEntryIds
    if (entries.length > 0) {
      setLastEntryIds(new Set(entries.map(e => e.id)))
    }
  }, [entries, user])

  const fetchEntries = async () => {
    try {
      const response = await axios.get('/api/journal/')
      setEntries(response.data)
    } catch (error) {
      console.error('Failed to fetch journal entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEntryForDate = async (date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const response = await axios.get(`/api/journal/by-date/?date=${dateStr}`)
      if (response.data.length > 0) {
        setSelectedEntry(response.data[0])
        setIsEditing(false)
      } else {
        setSelectedEntry(null)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Failed to fetch entry:', error)
    }
  }

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    setExpandedEntry(null) // Close expanded entry when date changes
  }
  
  const handleCardClick = (entry) => {
    if (expandedEntry?.id === entry.id) {
      setExpandedEntry(null) // Close if already expanded
    } else {
      setExpandedEntry(entry) // Expand this entry
    }
    setSelectedEntry(entry)
    setIsEditing(false)
  }

  const handleCreateEntry = () => {
    const newEntry = {
      id: null,
      title: '',
      content: '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      mood: '',
    }
    setSelectedEntry(newEntry)
    setExpandedEntry(null)
    setIsEditing(true)
  }
  
  const handleEditEntry = (entry, e) => {
    e.stopPropagation()
    setSelectedEntry(entry)
    setExpandedEntry(null)
    setIsEditing(true)
  }
  
  const handleDeleteEntryClick = (entryId, e) => {
    e.stopPropagation()
    handleDeleteEntry(entryId)
  }

  const handleSaveEntry = async (title, content, isShared) => {
    try {
      // Always share with partner
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      
      if (selectedEntry?.id) {
        const response = await axios.put(`/api/journal/${selectedEntry.id}/`, {
          title,
          content,
          date: dateStr,
          is_shared: true,
        })
        
        // Check if edit approval is needed
        if (response.data.edit_requested) {
          alert('Edit request sent. Waiting for partner approval.')
          await fetchEntries()
          await fetchEntryForDate(selectedDate)
          setIsEditing(false)
          return
        }
      } else {
        await axios.post('/api/journal/', {
          title,
          content,
          date: dateStr,
          is_shared: true,
        })
      }
      await fetchEntries()
      await fetchEntryForDate(selectedDate)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save entry:', error)
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to save journal entry'
      alert(errorMsg)
    }
  }
  
  const handleApproveEdit = async (entry, e) => {
    e.stopPropagation()
    
    if (!entry.edit_requested_by) return
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const response = await axios.put(`/api/journal/${entry.id}/`, {
        title: entry.pending_title || entry.title,
        content: entry.pending_content || entry.content,
        date: dateStr,
        is_shared: true,
      })
      
      if (response.data.message) {
        alert(response.data.message)
      }
      
      await fetchEntries()
      await fetchEntryForDate(selectedDate)
    } catch (error) {
      console.error('Failed to approve edit:', error)
      alert(error.response?.data?.error || 'Failed to approve edit')
    }
  }
  
  const handleDeleteEntry = async (entryId) => {
    const entry = entries.find(e => e.id === entryId)
    
    if (!entry) return
    
    // Check if deletion already requested
    if (entry.deletion_requested_by) {
      const confirmMessage = entry.deletion_requested_by.id === entry.author?.id 
        ? 'Your partner has requested to delete this entry. Do you want to approve?'
        : 'You have requested deletion. Waiting for partner approval.'
      
      if (!window.confirm(confirmMessage)) return
    } else {
      if (!window.confirm('Are you sure you want to delete this entry? Your partner will need to approve.')) return
    }

    try {
      const response = await axios.delete(`/api/journal/${entryId}/`)
      if (response.data.deletion_requested) {
        alert('Deletion request sent. Waiting for partner approval.')
      } else {
        alert('Journal entry deleted successfully!')
      }
      await fetchEntries()
      await fetchEntryForDate(selectedDate)
      setSelectedEntry(null)
      setExpandedEntry(null)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to delete entry:', error)
      alert(error.response?.data?.error || 'Failed to delete entry')
    }
  }


  const getEntriesWithDates = () => {
    return entries.map((entry) => new Date(entry.date))
  }

  if (loading) {
    return <div className="loading-container">Loading journal...</div>
  }

  const currentDateEntry = entries.find(entry => {
    const entryDate = format(new Date(entry.date), 'yyyy-MM-dd')
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
    return entryDate === selectedDateStr
  })

  return (
    <div className="journal-container">
      <div className="journal-calendar-section">
        <div className="calendar-header">
          <h2>Journal Calendar</h2>
          <button onClick={handleCreateEntry} className="create-entry-btn">
            <HeartIcon size="small" />
            New Entry
          </button>
        </div>
        <Calendar
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          markedDates={getEntriesWithDates()}
        />
      </div>
      <div className="journal-entries-section">
        <div className="entries-header">
          <h2>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h2>
        </div>
        
        {isEditing && selectedEntry ? (
          <div className="journal-editor-wrapper">
            <RichTextEditor
              initialTitle={selectedEntry.title}
              initialContent={selectedEntry.content}
              initialIsShared={true}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onSave={handleSaveEntry}
              onCancel={() => {
                setIsEditing(false)
                if (!selectedEntry.id) {
                  setSelectedEntry(null)
                } else {
                  fetchEntryForDate(selectedDate)
                  setExpandedEntry(selectedEntry)
                }
              }}
            />
          </div>
        ) : currentDateEntry ? (
          <div 
            className={`journal-entry-card ${expandedEntry?.id === currentDateEntry.id ? 'expanded' : ''} ${currentDateEntry.deletion_requested_by ? 'deletion-pending' : ''} ${currentDateEntry.edit_requested_by ? 'edit-pending' : ''}`}
            onClick={() => handleCardClick(currentDateEntry)}
          >
            <div className="entry-card-header">
              <div className="entry-card-title">
                <h3>{currentDateEntry.title || 'Untitled Entry'}</h3>
                <span className="entry-date">{format(new Date(currentDateEntry.date), 'MMM d, yyyy')}</span>
              </div>
              <div className="entry-card-actions" onClick={(e) => e.stopPropagation()}>
                {currentDateEntry.edit_requested_by && currentDateEntry.edit_requested_by.id !== currentDateEntry.author?.id && (
                  <button
                    onClick={(e) => handleApproveEdit(currentDateEntry, e)}
                    className="approve-edit-btn"
                    title="Approve Edit"
                  >
                    ✓ Approve
                  </button>
                )}
                <button
                  onClick={(e) => handleEditEntry(currentDateEntry, e)}
                  className="edit-entry-btn"
                  title={currentDateEntry.edit_requested_by ? "View/Edit Pending Changes" : "Edit Entry"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  onClick={(e) => handleDeleteEntryClick(currentDateEntry.id, e)}
                  className="delete-entry-btn"
                  title={currentDateEntry.deletion_requested_by ? "Approve deletion" : "Request deletion"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
            {currentDateEntry.edit_requested_by && (
              <div className="edit-status">
                {currentDateEntry.edit_requested_by.id === currentDateEntry.author?.id 
                  ? 'Edit requested - Waiting for your approval'
                  : 'Edit requested - Waiting for partner approval'}
                {currentDateEntry.pending_title && (
                  <div className="pending-preview">
                    <strong>Pending title:</strong> {currentDateEntry.pending_title}
                  </div>
                )}
              </div>
            )}
            {currentDateEntry.deletion_requested_by && (
              <div className="deletion-status">
                {currentDateEntry.deletion_requested_by.id === currentDateEntry.author?.id 
                  ? 'Deletion requested - Waiting for your approval'
                  : 'Deletion requested - Waiting for partner approval'}
              </div>
            )}
            {expandedEntry?.id === currentDateEntry.id && (
              <div 
                className="entry-card-content"
                dangerouslySetInnerHTML={{ __html: currentDateEntry.content }}
              />
            )}
            {!expandedEntry && currentDateEntry.content && (
              <div className="entry-card-preview">
                {currentDateEntry.content.replace(/<[^>]*>/g, '').substring(0, 150)}
                {currentDateEntry.content.replace(/<[^>]*>/g, '').length > 150 && '...'}
              </div>
            )}
          </div>
        ) : (
          <div className="empty-journal">
            <HeartIcon size="large" />
            <h3>No entry for this date</h3>
            <p>Click "New Entry" to start writing</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Journal

