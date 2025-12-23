'use client'

import { useState } from 'react'

const AdminNotesField = ({ value, onChange }: { value?: any; onChange?: (value: any) => void }) => {
  const [newNote, setNewNote] = useState('')

  const handleAddNote = () => {
    if (!newNote.trim()) {
      return
    }

    // Only include the note text - addedBy and addedAt will be auto-populated by the hook
    const note = {
      note: newNote.trim(),
      // addedBy and addedAt will be auto-populated by autoPopulateAdminNotes hook
      internal: true, // Admin notes are always internal
    }

    const currentValue = value || []
    const updatedValue = [...currentValue, note]

    if (onChange) {
      onChange(updatedValue)
    }

    // Reset form
    setNewNote('')
  }

  const currentValue = value || []

  return (
    <div style={{ padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Admin Notes</h3>

      {/* Existing Notes */}
      {currentValue.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>Notes History</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {currentValue.map((note: any, index: number) => {
              // Get user display name
              const getUserDisplay = () => {
                if (typeof note.addedBy === 'object' && note.addedBy) {
                  return note.addedBy.email || note.addedBy.name || 'Unknown'
                }
                if (typeof note.addedBy === 'number') {
                  return `User ID: ${note.addedBy}`
                }
                return 'Unknown'
              }

              // Get formatted date
              const getFormattedDate = () => {
                if (note.addedAt) {
                  return new Date(note.addedAt).toLocaleString()
                }
                if (note.createdAt) {
                  return new Date(note.createdAt).toLocaleString()
                }
                return 'Not available'
              }

              return (
                <div
                  key={index}
                  style={{
                    padding: '0.75rem',
                    background: '#f9f9f9',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                  }}
                >
                  {/* Note Content */}
                  <p
                    style={{
                      margin: '0 0 0.75rem 0',
                      fontSize: '0.875rem',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {note.note}
                  </p>

                  {/* Metadata */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #e0e0e0',
                      fontSize: '0.75rem',
                      color: '#666',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '500', minWidth: '80px' }}>Created By:</span>
                      <span>{getUserDisplay()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '500', minWidth: '80px' }}>Date Added:</span>
                      <span>{getFormattedDate()}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add New Note */}
      <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '4px' }}>
        <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Add New Note</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
              Note
            </label>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontFamily: 'inherit',
              }}
              placeholder="Enter your note here..."
            />
          </div>
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            style={{
              padding: '0.5rem 1rem',
              background: newNote.trim() ? '#28a745' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: newNote.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Add Note
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminNotesField
