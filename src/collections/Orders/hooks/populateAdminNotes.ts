import type { CollectionAfterReadHook } from 'payload'
import type { Order } from '@/payload-types'

export const populateAdminNotes: CollectionAfterReadHook<Order> = async ({
  doc,
  req,
}) => {
  if (!doc.adminNotes || !Array.isArray(doc.adminNotes)) {
    return doc
  }

  // Populate addedBy relationship for each note
  const populatedNotes = await Promise.all(
    doc.adminNotes.map(async (note: any) => {
      if (note.addedBy && typeof note.addedBy === 'number') {
        try {
          const user = await req.payload.findByID({
            collection: 'users',
            id: note.addedBy,
            depth: 0, // Only get basic user info
          })
          return {
            ...note,
            addedBy: user,
          }
        } catch (error) {
          // If user not found, keep the ID
          return note
        }
      }
      return note
    })
  )

  return {
    ...doc,
    adminNotes: populatedNotes,
  }
}


