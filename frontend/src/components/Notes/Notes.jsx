import { useState, useEffect } from 'react'
import axios from 'axios'
import Calendar from '../Calendar/Calendar'
import RichTextEditor from '../RichTextEditor/RichTextEditor'
import HeartIcon from '../HeartIcon/HeartIcon'
import { format } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext'
import notificationService from '../../services/notificationService'
import './Notes.css'

const Notes = () => {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('both') // 'title', 'content', 'both'
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showCalendar, setShowCalendar] = useState(false)
  const [filterByDate, setFilterByDate] = useState(false) // Track if filtering by date

  const fetchNotes = async () => {
    try {
      let url = '/api/notes/'
      if (searchQuery) {
        url += `?search=${encodeURIComponent(searchQuery)}&search_type=${searchType}`
      }
      const response = await axios.get(url)
      setNotes(response.data)
    } catch (error) {
      console.error('Failed to fetch notes:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const [lastNoteIds, setLastNoteIds] = useState(new Set())

  useEffect(() => {
    fetchNotes()
    
    // Set up polling to check for new notes from partner (every 30 seconds)
    const pollInterval = setInterval(() => {
      fetchNotes()
    }, 30000) // Poll every 30 seconds
    
    return () => clearInterval(pollInterval)
  }, []) // Fetch notes on mount

  useEffect(() => {
    if (searchQuery || searchType) {
      const timeoutId = setTimeout(() => {
        fetchNotes()
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      fetchNotes()
    }
  }, [searchQuery, searchType])

  // Check for new notes and send notifications
  useEffect(() => {
    if (notes.length > 0 && lastNoteIds.size > 0) {
      // Find new notes (notes that weren't in lastNoteIds)
      const newNotes = notes.filter(note => 
        !lastNoteIds.has(note.id) && 
        note.author?.id !== user?.id && // Only notify for partner's notes
        user?.partner
      )
      
      newNotes.forEach(note => {
        // Check if it's a newly created note (recently created)
        const noteDate = new Date(note.created_at)
        const now = new Date()
        const minutesDiff = (now - noteDate) / (1000 * 60)
        
        // Only notify if note was created in the last 5 minutes (to avoid old notes triggering notifications)
        if (minutesDiff < 5) {
          // For Safari, trigger notification in a way that maintains user interaction context
          // Use setTimeout with 0 delay to ensure it's in the event loop
          setTimeout(() => {
            notificationService.notifyNoteCreated(note.author?.username || 'Your partner', note.title)
          }, 0)
        }
      })
    }
    
    // Update lastNoteIds
    if (notes.length > 0) {
      setLastNoteIds(new Set(notes.map(n => n.id)))
    }
  }, [notes, user])

  const handleCreateNote = () => {
    const newNote = {
      id: null,
      title: 'New Note',
      content: '',
      is_shared: true, // Always shared
    }
    setSelectedNote(newNote)
    setIsEditing(true)
  }

  const handleSaveNote = async (title, content, isShared) => {
    try {
      let savedNote
      
      // Always share with partner
      if (selectedNote?.id) {
        const response = await axios.put(`/api/notes/${selectedNote.id}/`, {
          title,
          content,
          is_shared: true,
        })
        
        // Check if edit approval is needed
        if (response.data.edit_requested) {
          alert('Edit request sent. Waiting for partner approval.')
          await fetchNotes()
          setIsEditing(false)
          return
        }
        
        savedNote = response.data
      } else {
        const response = await axios.post('/api/notes/', {
          title,
          content,
          is_shared: true,
        })
        savedNote = response.data
      }
      
      // Fetch all notes (without search filter) to ensure new note appears
      const response = await axios.get('/api/notes/')
      setNotes(response.data)
      
      setIsEditing(false)
      // Select the newly created/updated note
      setSelectedNote(savedNote)
    } catch (error) {
      console.error('Failed to save note:', error)
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to save note'
      alert(errorMsg)
    }
  }

  const handleToggleLike = async (noteId, e) => {
    e.stopPropagation()
    try {
      // Get the note before toggling to check author
      const note = notes.find(n => n.id === noteId)
      
      const response = await axios.post(`/api/notes/${noteId}/like/`)
      
      // Send notification to note author if liked (not if unliked)
      // Only send if: note was liked, note exists, current user is not the author, user has a partner
      if (response.data.is_liked && note && note.author?.id !== user?.id && user?.partner) {
        // Use setTimeout to ensure notification is sent in user interaction context (important for Safari)
        setTimeout(() => {
          notificationService.notifyNoteLiked(user.username, note.title)
        }, 0)
      }
      
      // Refresh notes to get updated like status
      await fetchNotes()
      // Update selected note if it's the one being liked
      if (selectedNote?.id === noteId) {
        const updatedNotes = await axios.get('/api/notes/')
        const updatedNote = updatedNotes.data.find(n => n.id === noteId)
        if (updatedNote) {
          setSelectedNote(updatedNote)
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      alert(error.response?.data?.error || 'Failed to toggle like')
    }
  }

  const handleDeleteNote = async (noteId, e) => {
    e.stopPropagation()
    const note = notes.find(n => n.id === noteId)
    
    if (!note) return
    
    // Check if deletion already requested
    if (note.deletion_requested_by) {
      const confirmMessage = note.deletion_requested_by.id === note.author?.id 
        ? 'Your partner has requested to delete this note. Do you want to approve?'
        : 'You have requested deletion. Waiting for partner approval.'
      
      if (!window.confirm(confirmMessage)) return
    } else {
      if (!window.confirm('Are you sure you want to delete this note? Your partner will need to approve.')) return
    }

    try {
      const response = await axios.delete(`/api/notes/${noteId}/`)
      if (response.data.deletion_requested) {
        alert('Deletion request sent. Waiting for partner approval.')
      } else {
        alert('Note deleted successfully!')
      }
      await fetchNotes()
      if (selectedNote?.id === noteId) {
        setSelectedNote(null)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
      alert(error.response?.data?.error || 'Failed to delete note')
    }
  }

  const handleSelectNote = (note) => {
    setSelectedNote(note)
    setIsEditing(false)
  }
  
  const handleCardClick = (note) => {
    // Toggle: if clicking the same note, deselect it; otherwise select the new note
    if (selectedNote?.id === note.id) {
      setSelectedNote(null)
    } else {
      setSelectedNote(note)
    }
    setIsEditing(false)
  }
  
  const handleEditNote = (note, e) => {
    e.stopPropagation()
    
    // If there's a pending edit request from partner and user is author, approve it
    if (note.edit_requested_by && note.edit_requested_by.id !== note.author?.id) {
      // This will be handled by the save function when user edits
      setSelectedNote(note)
      setIsEditing(true)
      return
    }
    
    setSelectedNote(note)
    setIsEditing(true)
  }
  
  const handleApproveEdit = async (note, e) => {
    e.stopPropagation()
    
    if (!note.edit_requested_by) return
    
    try {
      // Approve by saving with pending changes
      const response = await axios.put(`/api/notes/${note.id}/`, {
        title: note.pending_title || note.title,
        content: note.pending_content || note.content,
        is_shared: true,
      })
      
      if (response.data.message) {
        alert(response.data.message)
      }
      
      await fetchNotes()
      if (response.data.id) {
        setSelectedNote(response.data)
      }
    } catch (error) {
      console.error('Failed to approve edit:', error)
      alert(error.response?.data?.error || 'Failed to approve edit')
    }
  }
  
  const handleDateSelect = (date) => {
    setSelectedDate(date)
    setFilterByDate(true)
    // Filter notes by date
    const dateStr = format(date, 'yyyy-MM-dd')
    const notesForDate = notes.filter(note => {
      const noteDate = format(new Date(note.created_at), 'yyyy-MM-dd')
      return noteDate === dateStr
    })
    if (notesForDate.length > 0) {
      setSelectedNote(notesForDate[0])
      setIsEditing(false)
    } else {
      setSelectedNote(null)
    }
  }
  
  const clearDateFilter = () => {
    setFilterByDate(false)
    setSelectedDate(new Date())
    setSelectedNote(null)
  }
  
  const getNotesWithDates = () => {
    return notes.map((note) => new Date(note.created_at))
  }
  
  const getFilteredNotes = () => {
    if (filterByDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      return notes.filter(note => {
        const noteDate = format(new Date(note.created_at), 'yyyy-MM-dd')
        return noteDate === dateStr
      })
    }
    return notes
  }

  if (loading) {
    return <div className="loading-container">Loading notes...</div>
  }

  return (
    <div className="notes-container">
      <div className="notes-sidebar">
        <div className="notes-header">
          <h2>Your Notes</h2>
          <div className="header-actions">
            <button 
              onClick={() => setShowCalendar(!showCalendar)} 
              className="calendar-toggle-btn"
              title="Toggle Calendar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </button>
            <button onClick={handleCreateNote} className="create-note-btn">
              + New Note
            </button>
          </div>
        </div>
        
        {showCalendar && (
          <div className="notes-calendar-section">
            <div className="calendar-header-notes">
              <h3>Filter by Date</h3>
              {filterByDate && (
                <button onClick={clearDateFilter} className="clear-filter-btn">
                  Clear Filter
                </button>
              )}
            </div>
            <Calendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              markedDates={getNotesWithDates()}
            />
          </div>
        )}
        <div className="search-box">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <div className="search-options">
              <label className="search-option">
                <input
                  type="radio"
                  name="searchType"
                  value="title"
                  checked={searchType === 'title'}
                  onChange={(e) => setSearchType(e.target.value)}
                />
                Title Only
              </label>
              <label className="search-option">
                <input
                  type="radio"
                  name="searchType"
                  value="content"
                  checked={searchType === 'content'}
                  onChange={(e) => setSearchType(e.target.value)}
                />
                Content Only
              </label>
              <label className="search-option">
                <input
                  type="radio"
                  name="searchType"
                  value="both"
                  checked={searchType === 'both'}
                  onChange={(e) => setSearchType(e.target.value)}
                />
                Both
              </label>
            </div>
          )}
        </div>
        <div className="notes-list">
          {getFilteredNotes().length === 0 ? (
            <div className="empty-state">
              <p>{filterByDate ? 'No notes found for this date' : 'No notes found'}</p>
            </div>
          ) : (
            getFilteredNotes().map((note) => (
              <div
                key={note.id}
                className={`note-item ${selectedNote?.id === note.id ? 'active' : ''} ${note.deletion_requested_by ? 'deletion-pending' : ''} ${note.edit_requested_by ? 'edit-pending' : ''}`}
                onClick={() => handleCardClick(note)}
              >
                <div className="note-item-header">
                  <h3>{note.title}</h3>
                  {note.is_shared && (
                    <span className="shared-badge">
                      <HeartIcon size="small" filled />
                    </span>
                  )}
                </div>
                {note.edit_requested_by && (
                  <div className="edit-status">
                    {note.edit_requested_by.id === note.author?.id 
                      ? 'Edit requested - Waiting for your approval'
                      : 'Edit requested - Waiting for partner approval'}
                    {note.pending_title && (
                      <div className="pending-preview">
                        <strong>Pending title:</strong> {note.pending_title}
                      </div>
                    )}
                  </div>
                )}
                {note.deletion_requested_by && (
                  <div className="deletion-status">
                    {note.deletion_requested_by.id === note.author?.id 
                      ? 'Deletion requested - Waiting for your approval'
                      : 'Deletion requested - Waiting for partner approval'}
                  </div>
                )}
                <div className="note-meta">
                  <div className="note-meta-left">
                    <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                    {note.like_count > 0 && (
                      <div className="note-likes-info">
                        <HeartIcon size="small" filled={note.is_liked_by_current_user} />
                        <span>{note.like_count}</span>
                        {note.likes && note.likes.length > 0 && (
                          <span className="liked-by">
                            {note.likes.map((like, idx) => (
                              <span key={like.id}>
                                {like.user.username}
                                {idx < note.likes.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="note-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleToggleLike(note.id, e)}
                      className={`like-btn ${note.is_liked_by_current_user ? 'liked' : ''}`}
                      title={note.is_liked_by_current_user ? "Unlike" : "Like"}
                    >
                      <HeartIcon size="small" filled={note.is_liked_by_current_user} />
                    </button>
                    {note.edit_requested_by && note.edit_requested_by.id !== note.author?.id && (
                      <button
                        onClick={(e) => handleApproveEdit(note, e)}
                        className="approve-edit-btn"
                        title="Approve Edit"
                      >
                        ✓ Approve
                      </button>
                    )}
                    <button
                      onClick={(e) => handleEditNote(note, e)}
                      className="edit-note-btn"
                      title={note.edit_requested_by ? "View/Edit Pending Changes" : "Edit Note"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="delete-btn"
                      title={note.deletion_requested_by ? "Approve deletion" : "Request deletion"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="notes-editor">
        {isEditing && selectedNote ? (
          <RichTextEditor
            initialTitle={selectedNote.title}
            initialContent={selectedNote.content}
            initialIsShared={selectedNote.is_shared}
            isEditing={isEditing}
            onEdit={() => setIsEditing(true)}
            onSave={handleSaveNote}
            onCancel={() => {
              setIsEditing(false)
              if (!selectedNote.id) {
                setSelectedNote(null)
              }
            }}
          />
        ) : selectedNote ? (
          <RichTextEditor
            initialTitle={selectedNote.title}
            initialContent={selectedNote.content}
            initialIsShared={selectedNote.is_shared}
            isEditing={isEditing}
            onEdit={() => setIsEditing(true)}
            onSave={handleSaveNote}
            onCancel={() => {
              setIsEditing(false)
              if (!selectedNote.id) {
                setSelectedNote(null)
              }
            }}
            noteId={selectedNote.id}
            isLiked={selectedNote.is_liked_by_current_user}
            likeCount={selectedNote.like_count || 0}
            likes={selectedNote.likes || []}
            onToggleLike={async (noteId) => {
              try {
                // Get the note before toggling to check author
                const note = notes.find(n => n.id === noteId)
                
                const response = await axios.post(`/api/notes/${noteId}/like/`)
                
                // Send notification to note author if liked (not if unliked)
                if (response.data.is_liked && note && note.author?.id !== user?.id && user?.partner) {
                  setTimeout(() => {
                    notificationService.notifyNoteLiked(user.username, note.title)
                  }, 0)
                }
                
                await fetchNotes()
                if (selectedNote?.id === noteId) {
                  const updatedNotes = await axios.get('/api/notes/')
                  const updatedNote = updatedNotes.data.find(n => n.id === noteId)
                  if (updatedNote) {
                    setSelectedNote(updatedNote)
                  }
                }
              } catch (error) {
                console.error('Failed to toggle like:', error)
                alert(error.response?.data?.error || 'Failed to toggle like')
              }
            }}
          />
        ) : (
          <div className="empty-editor">
            <HeartIcon size="large" />
            <h2>Select a note or create a new one</h2>
            <p>Start writing your love notes here</p>
            {filterByDate && (
              <p className="filter-info">Showing notes for {format(selectedDate, 'MMMM d, yyyy')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Notes

