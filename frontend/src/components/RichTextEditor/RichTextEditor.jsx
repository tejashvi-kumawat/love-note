import { useState, useRef, useEffect } from 'react'
import HeartIcon from '../HeartIcon/HeartIcon'
import './RichTextEditor.css'

const RichTextEditor = ({
  initialTitle = '',
  initialContent = '',
  initialIsShared = true,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  noteId = null,
  isLiked = false,
  likeCount = 0,
  likes = [],
  onToggleLike = null,
}) => {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [isShared, setIsShared] = useState(initialIsShared)
  const [selectedFontSize, setSelectedFontSize] = useState('')
  const [selectedLineHeight, setSelectedLineHeight] = useState('')
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false
  })
  const editorRef = useRef(null)
  const viewerRef = useRef(null)
  const cursorPositionRef = useRef(null)

  useEffect(() => {
    setTitle(initialTitle)
    setContent(initialContent)
    setIsShared(initialIsShared)
    if (editorRef.current && isEditing) {
      if (editorRef.current.innerHTML !== initialContent) {
        editorRef.current.innerHTML = initialContent
      }
      setTimeout(() => {
        // Set default line-height if not set
        if (editorRef.current && !editorRef.current.style.lineHeight) {
          editorRef.current.style.lineHeight = '1.2'
          setSelectedLineHeight('1.2')
        }
        
        editorRef.current?.focus()
        // Move cursor to end
        const range = document.createRange()
        const selection = window.getSelection()
        range.selectNodeContents(editorRef.current)
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
        // Reset font size when starting to edit
        setSelectedFontSize('')
        // Check formats after a delay to ensure editor is ready
        setTimeout(() => {
          checkActiveFormats()
          detectCurrentLineHeight()
        }, 100)
      }, 0)
    } else {
      // Reset when not editing
      setSelectedFontSize('')
      setSelectedLineHeight('')
    }
  }, [initialTitle, initialContent, initialIsShared, isEditing])
  
  // Listen for selection changes
  useEffect(() => {
    if (isEditing && editorRef.current) {
      const handleSelectionChange = () => {
        if (editorRef.current && document.activeElement === editorRef.current) {
          checkActiveFormats()
          detectCurrentFontSize()
          detectCurrentLineHeight()
        }
      }
      
      document.addEventListener('selectionchange', handleSelectionChange)
      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange)
      }
    }
  }, [isEditing])

  // Make links clickable in viewer mode
  useEffect(() => {
    if (!isEditing && viewerRef.current) {
      const handleLinkClick = (e) => {
        // Check if clicked element is a link or inside a link
        let target = e.target
        while (target && target !== viewerRef.current) {
          if (target.tagName === 'A' && target.href) {
            e.preventDefault()
            e.stopPropagation()
            window.open(target.href, '_blank', 'noopener,noreferrer')
            return
          }
          target = target.parentElement
        }
      }
      
      viewerRef.current.addEventListener('click', handleLinkClick)
      
      return () => {
        if (viewerRef.current) {
          viewerRef.current.removeEventListener('click', handleLinkClick)
        }
      }
    }
  }, [content, isEditing])

  // Save cursor position
  const saveCursorPosition = () => {
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const preCaretRange = range.cloneRange()
      preCaretRange.selectNodeContents(editorRef.current)
      preCaretRange.setEnd(range.endContainer, range.endOffset)
      cursorPositionRef.current = preCaretRange.toString().length
    }
  }

  // Restore cursor position
  const restoreCursorPosition = () => {
    if (cursorPositionRef.current !== null && editorRef.current) {
      const range = document.createRange()
      const selection = window.getSelection()
      let charCount = 0
      let nodeStack = [editorRef.current]
      let node
      let foundStart = false

      while (!foundStart && (node = nodeStack.pop())) {
        if (node.nodeType === 3) {
          const nextCharCount = charCount + node.length
          if (cursorPositionRef.current >= charCount && cursorPositionRef.current <= nextCharCount) {
            range.setStart(node, cursorPositionRef.current - charCount)
            range.setEnd(node, cursorPositionRef.current - charCount)
            foundStart = true
          }
          charCount = nextCharCount
        } else {
          let i = node.childNodes.length
          while (i--) {
            nodeStack.push(node.childNodes[i])
          }
        }
      }

      if (foundStart) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }

  const checkActiveFormats = () => {
    if (!editorRef.current) return
    
    try {
      const bold = document.queryCommandState('bold')
      const italic = document.queryCommandState('italic')
      const underline = document.queryCommandState('underline')
      
      setActiveFormats({
        bold,
        italic,
        underline
      })
    } catch (e) {
      // Ignore errors
    }
  }

  const executeCommand = (command, value = null) => {
    if (!editorRef.current) return
    
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    
    // For formatting commands, check if already formatted
    if (command === 'bold' || command === 'italic' || command === 'underline') {
      try {
        // Check if the command is already active
        const isActive = document.queryCommandState(command)
        if (isActive) {
          // If already formatted, remove formatting
          document.execCommand(command, false, null)
        } else {
          // Apply formatting
          document.execCommand(command, false, null)
        }
        // Update active formats after a short delay
        setTimeout(checkActiveFormats, 10)
      } catch (e) {
        // Fallback to normal execution
        document.execCommand(command, false, null)
        setTimeout(checkActiveFormats, 10)
      }
    } else {
      // For other commands, execute normally
      document.execCommand(command, false, value)
    }
    
    editorRef.current.focus()
    // Update content state
    setContent(editorRef.current.innerHTML)
  }

  const insertLink = () => {
    if (!editorRef.current) return
    
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    
    // Check if selection is already a link
    let linkElement = null
    let node = range.commonAncestorContainer
    while (node && node !== editorRef.current) {
      if (node.nodeName === 'A') {
        linkElement = node
        break
      }
      node = node.parentNode
    }
    
    if (linkElement) {
      // Remove link
      const parent = linkElement.parentNode
      while (linkElement.firstChild) {
        parent.insertBefore(linkElement.firstChild, linkElement)
      }
      parent.removeChild(linkElement)
      editorRef.current.focus()
      setContent(editorRef.current.innerHTML)
      return
    }
    
    // Prompt for URL
    const url = prompt('Enter the URL:', linkElement ? linkElement.href : 'https://')
    if (!url) return
    
    // Create link
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = selectedText || url
    
    if (selectedText) {
      range.deleteContents()
    }
    range.insertNode(link)
    
    editorRef.current.focus()
    setContent(editorRef.current.innerHTML)
  }

  const changeFontSize = (size) => {
    if (!editorRef.current) return
    
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return
    
    setSelectedFontSize(size)
    
    // Better approach: wrap in span with style
    const range = selection.getRangeAt(0)
    const span = document.createElement('span')
    span.style.fontSize = size
    span.style.lineHeight = '1.2'
    try {
      if (range.collapsed) {
        // No selection, insert at cursor
        span.textContent = '\u200B' // Zero-width space
        range.insertNode(span)
        range.setStartAfter(span)
        range.setEndAfter(span)
        selection.removeAllRanges()
        selection.addRange(range)
      } else {
        // Wrap selection
        range.surroundContents(span)
      }
    } catch (e) {
      // If surroundContents fails, try alternative
      const contents = range.extractContents()
      span.appendChild(contents)
      range.insertNode(span)
    }
    
    editorRef.current.focus()
    setContent(editorRef.current.innerHTML)
  }

  const changeTextColor = (color) => {
    if (!editorRef.current) return
    
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    
    // If there's selected text, apply color to it
    if (!range.collapsed) {
      document.execCommand('foreColor', false, color)
      editorRef.current.focus()
      setContent(editorRef.current.innerHTML)
      return
    }
    
    // If cursor is at a position (no selection), create a span with the color
    // This ensures future typing will use this color
    const span = document.createElement('span')
    span.style.color = color
    span.textContent = '\u200B' // Zero-width space to maintain cursor position
    
    try {
      range.insertNode(span)
      // Move cursor after the span
      range.setStartAfter(span)
      range.setEndAfter(span)
      selection.removeAllRanges()
      selection.addRange(range)
    } catch (e) {
      // Fallback: use execCommand
      document.execCommand('foreColor', false, color)
    }
    
    editorRef.current.focus()
    setContent(editorRef.current.innerHTML)
    
    // Note: Zero-width space will be cleaned up in handleInput when user types
  }

  const changeLineHeight = (lineHeight) => {
    if (!editorRef.current) return
    
    setSelectedLineHeight(lineHeight)
    
    // Apply line-height to entire editor body
    editorRef.current.style.lineHeight = lineHeight
    
    // Also apply to all existing block elements
    const blockElements = editorRef.current.querySelectorAll('p, div, h1, h2, h3, li')
    blockElements.forEach(el => {
      el.style.lineHeight = lineHeight
    })
    
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      
      // If there's a selection, wrap it in a span with line-height
      if (!range.collapsed) {
        const span = document.createElement('span')
        span.style.lineHeight = lineHeight
        try {
          range.surroundContents(span)
        } catch (e) {
          const contents = range.extractContents()
          span.appendChild(contents)
          range.insertNode(span)
        }
      }
    }
    
    editorRef.current.focus()
    setContent(editorRef.current.innerHTML)
  }
  
  const detectCurrentLineHeight = () => {
    if (!editorRef.current) return
    
    // Check editor body first (most common case)
    const editorLineHeight = window.getComputedStyle(editorRef.current).lineHeight
    const normalizedHeight = parseFloat(editorLineHeight).toFixed(1)
    
    const heightMap = {
      '1.0': '1.0',
      '1.2': '1.2',
      '1.5': '1.5',
      '1.8': '1.8',
      '2.0': '2.0'
    }
    
    if (heightMap[normalizedHeight]) {
      setSelectedLineHeight(heightMap[normalizedHeight])
      return
    }
    
    // If not found in editor body, check selection
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      let node = range.commonAncestorContainer
      
      // Find the element with line-height style
      while (node && node !== editorRef.current) {
        if (node.nodeType === 1) {
          const lineHeight = window.getComputedStyle(node).lineHeight
          if (lineHeight) {
            const normalized = parseFloat(lineHeight).toFixed(1)
            if (heightMap[normalized]) {
              setSelectedLineHeight(heightMap[normalized])
              return
            }
          }
        }
        node = node.parentNode
      }
    }
    
    // Default to empty if not found
    setSelectedLineHeight('')
  }

  const handleInput = (e) => {
    // Ensure new content has proper line-height
    if (editorRef.current) {
      // Apply default line-height to editor if not set
      const currentLineHeight = window.getComputedStyle(editorRef.current).lineHeight
      if (!currentLineHeight || parseFloat(currentLineHeight) > 1.5) {
        editorRef.current.style.lineHeight = selectedLineHeight || '1.2'
      }
      
      // Ensure all new elements get proper line-height
      const selection = window.getSelection()
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        let node = range.commonAncestorContainer
        
        // Find parent block element and ensure line-height
        while (node && node !== editorRef.current) {
          if (node.nodeType === 1) {
            const computedStyle = window.getComputedStyle(node)
            if (!computedStyle.lineHeight || parseFloat(computedStyle.lineHeight) > 1.5) {
              node.style.lineHeight = selectedLineHeight || '1.2'
            }
            break
          }
          node = node.parentNode
        }
      }
      
      // Clean up zero-width spaces that might have been left from color changes
      const zeroWidthSpans = editorRef.current.querySelectorAll('span')
      zeroWidthSpans.forEach(span => {
        if (span.textContent === '\u200B' && span.children.length === 0) {
          const parent = span.parentNode
          if (parent) {
            parent.removeChild(span)
            parent.normalize()
          }
        }
      })
    }
    
    setContent(e.target.innerHTML)
    saveCursorPosition()
    detectCurrentFontSize()
    detectCurrentLineHeight()
    checkActiveFormats()
  }

  const detectCurrentFontSize = () => {
    if (!editorRef.current) return
    
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    let node = range.commonAncestorContainer
    
    // Find the element with font-size style
    while (node && node !== editorRef.current) {
      if (node.nodeType === 1) { // Element node
        const fontSize = window.getComputedStyle(node).fontSize
        if (fontSize && fontSize !== '17.6px') { // 17.6px is the default
          // Check if it matches one of our preset sizes
          const sizeMap = {
            '12px': '12px',
            '16px': '16px',
            '20px': '20px',
            '24px': '24px',
            '32px': '32px'
          }
          if (sizeMap[fontSize]) {
            setSelectedFontSize(sizeMap[fontSize])
            return
          }
        }
      }
      node = node.parentNode
    }
    
    // Reset if no custom font size found
    setSelectedFontSize('')
  }

  const handleSave = () => {
    const htmlContent = editorRef.current?.innerHTML || ''
    // Always share with partner
    onSave(title, htmlContent, true)
  }

  const handleLikeClick = async () => {
    if (noteId && onToggleLike) {
      await onToggleLike(noteId)
    }
  }

  if (!isEditing) {
    return (
      <div className="rich-text-viewer">
        <div className="viewer-header">
          <h1>{title || 'Untitled'}</h1>
          <div className="viewer-actions">
            {noteId && (
              <div className="viewer-like-section">
                <button 
                  onClick={handleLikeClick} 
                  className={`viewer-like-btn ${isLiked ? 'liked' : ''}`}
                  title={isLiked ? "Unlike" : "Like"}
                >
                  <HeartIcon size="small" filled={isLiked} />
                  {likeCount > 0 && <span>{likeCount}</span>}
                </button>
                {likes && likes.length > 0 && (
                  <span className="viewer-liked-by">
                    {likes.map((like, idx) => (
                      <span key={like.id}>
                        {like.user.username}
                        {idx < likes.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            )}
            <button onClick={onEdit} className="edit-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit
            </button>
          </div>
        </div>
        <div
          ref={viewerRef}
          className="viewer-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    )
  }

  return (
    <div className="rich-text-editor">
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className={`toolbar-btn ${activeFormats.bold ? 'active' : ''}`}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className={`toolbar-btn ${activeFormats.italic ? 'active' : ''}`}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            className={`toolbar-btn ${activeFormats.underline ? 'active' : ''}`}
            title="Underline"
          >
            <u>U</u>
          </button>
        </div>
        <div className="toolbar-group">
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', 'h2')}
            className="toolbar-btn"
            title="Heading"
          >
            H
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            className="toolbar-btn"
            title="Bullet List"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            className="toolbar-btn"
            title="Numbered List"
          >
            1.
          </button>
        </div>
        <div className="toolbar-group">
          <button
            type="button"
            onClick={() => executeCommand('justifyLeft')}
            className="toolbar-btn"
            title="Align Left"
          >
            ⬅
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyCenter')}
            className="toolbar-btn"
            title="Align Center"
          >
            ⬌
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyRight')}
            className="toolbar-btn"
            title="Align Right"
          >
            ➡
          </button>
        </div>
        <div className="toolbar-group">
          <select
            onChange={(e) => {
              if (e.target.value) {
                changeFontSize(e.target.value)
              }
            }}
            className="font-size-select"
            title="Font Size"
            value={selectedFontSize}
          >
            <option value="">Font Size</option>
            <option value="12px">Small (12px)</option>
            <option value="16px">Normal (16px)</option>
            <option value="20px">Large (20px)</option>
            <option value="24px">Extra Large (24px)</option>
            <option value="32px">Huge (32px)</option>
          </select>
          <select
            onChange={(e) => {
              if (e.target.value) {
                changeLineHeight(e.target.value)
              }
            }}
            className="font-size-select"
            title="Line Height"
            value={selectedLineHeight}
          >
            <option value="">Line Height</option>
            <option value="1.0">Tight (1.0)</option>
            <option value="1.2">Normal (1.2)</option>
            <option value="1.5">Relaxed (1.5)</option>
            <option value="1.8">Loose (1.8)</option>
            <option value="2.0">Very Loose (2.0)</option>
          </select>
          <input
            type="color"
            onFocus={saveCursorPosition}
            onMouseDown={saveCursorPosition}
            onChange={(e) => {
              changeTextColor(e.target.value)
            }}
            className="color-picker"
            title="Text Color"
          />
          <button
            type="button"
            onClick={insertLink}
            className="toolbar-btn"
            title="Insert Link"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </button>
        </div>
      </div>
      <div className="editor-content">
        <input
          type="text"
          className="editor-title"
          placeholder="Note title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div
          ref={editorRef}
          className="editor-body"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyUp={() => {
            saveCursorPosition()
            detectCurrentFontSize()
            detectCurrentLineHeight()
            checkActiveFormats()
          }}
          onMouseUp={() => {
            saveCursorPosition()
            detectCurrentFontSize()
            detectCurrentLineHeight()
            checkActiveFormats()
          }}
          onClick={() => {
            detectCurrentFontSize()
            detectCurrentLineHeight()
            checkActiveFormats()
          }}
        />
        <div className="editor-footer">
          <div className="shared-toggle">
            <input
              type="checkbox"
              id="shared-toggle"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
            />
            <label htmlFor="shared-toggle">Share with partner</label>
          </div>
          <div className="editor-actions">
            <button onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
            <button onClick={handleSave} className="save-btn">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RichTextEditor

