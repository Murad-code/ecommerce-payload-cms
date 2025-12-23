import type { CollectionBeforeChangeHook } from 'payload'
import type { Order } from '@/payload-types'

export const autoPopulateAdminNotes: CollectionBeforeChangeHook<Order> = async ({
  data,
  operation,
  req,
}) => {
  // Only process if adminNotes exist
  if (!data.adminNotes || !Array.isArray(data.adminNotes)) {
    return data
  }

  const currentUser = req.user

  // Auto-populate addedBy and addedAt for new notes
  const updatedNotes = data.adminNotes.map((note: any) => {
    // If note is a new object (has note text but no addedBy/addedAt)
    if (note.note && (!note.addedBy || !note.addedAt)) {
      return {
        ...note,
        addedBy: currentUser?.id || note.addedBy,
        addedAt: note.addedAt || new Date().toISOString(),
        internal: true, // Always internal for admin notes
      }
    }
    return note
  })

  return {
    ...data,
    adminNotes: updatedNotes,
  }
}


