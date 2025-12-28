'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

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
    <div className="p-4 border border-border rounded">
      <h3 className="mt-0 mb-4">Admin Notes</h3>

      {/* Existing Notes */}
      {currentValue.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-2">Notes History</h4>
          <div className="flex flex-col gap-3">
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
                  className="p-3 bg-muted border border-border rounded"
                >
                  {/* Note Content */}
                  <p className="m-0 mb-3 text-sm whitespace-pre-wrap">
                    {note.note}
                  </p>

                  {/* Metadata */}
                  <div className="flex flex-col gap-1 pt-3 border-t border-border text-xs text-muted-foreground">
                    <div className="flex gap-2">
                      <span className="font-medium min-w-[80px]">Created By:</span>
                      <span>{getUserDisplay()}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-[80px]">Date Added:</span>
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
      <div className="p-4 bg-muted rounded">
        <h4 className="mt-0 mb-4">Add New Note</h4>
        <div className="flex flex-col gap-4">
          <div>
            <Label className="block mb-1 font-medium">
              Note
            </Label>
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={4}
              placeholder="Enter your note here..."
            />
          </div>
          <Button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            className={newNote.trim() ? '' : 'opacity-50 cursor-not-allowed'}
          >
            Add Note
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AdminNotesField
