import type { Transaction } from '@/payload-types'
import type { CollectionAfterReadHook, CollectionBeforeChangeHook } from 'payload'

/**
 * Auto-populates customerEmail from customer relationship if customerEmail is empty
 * Runs before change to ensure the email is saved
 * Throws an error if email cannot be populated (required for both create and update)
 */
export const autoPopulateCustomerEmail: CollectionBeforeChangeHook<Transaction> = async ({
  data,
  req,
}) => {
  // If customerEmail is already set, don't override it
  if (data.customerEmail) {
    return data
  }

  let customerEmail: string | undefined

  // Try to get email from customer relationship if it exists
  if (data.customer) {
    // If customer is already populated (object), get email directly
    if (typeof data.customer === 'object' && data.customer.email) {
      customerEmail = data.customer.email
    }
    // If customer is just an ID, fetch the user
    else if (typeof data.customer === 'number') {
      try {
        const customer = await req.payload.findByID({
          collection: 'users',
          id: data.customer,
          depth: 0,
        })
        customerEmail = customer.email
      } catch (error) {
        req.payload.logger.warn(
          `Could not fetch customer ${data.customer} to populate customerEmail: ${error}`,
        )
      }
    }
  }

  // If we successfully got an email, set it
  if (customerEmail) {
    return {
      ...data,
      customerEmail,
    }
  }

  // Customer email is required for both create and update operations
  throw new Error(
    'Customer email is required. Please provide customerEmail or ensure the customer relationship has a valid email address.',
  )
}

/**
 * Populates customerEmail in the document when reading (for admin panel display)
 * This ensures the field shows the correct value even if it wasn't saved
 */
export const populateCustomerEmailOnRead: CollectionAfterReadHook<Transaction> = async ({
  doc,
  req,
}) => {
  // If customerEmail is already set, return as is
  if (doc.customerEmail) {
    return doc
  }

  // If no customer relationship, nothing to populate
  if (!doc.customer) {
    return doc
  }

  let customerEmail: string | undefined

  // If customer is already populated (object), get email directly
  if (typeof doc.customer === 'object' && doc.customer.email) {
    customerEmail = doc.customer.email
  }
  // If customer is just an ID, fetch the user
  else if (typeof doc.customer === 'number') {
    try {
      const customer = await req.payload.findByID({
        collection: 'users',
        id: doc.customer,
        depth: 0,
      })
      customerEmail = customer.email
    } catch (error) {
      req.payload.logger.warn(
        `Could not fetch customer ${doc.customer} to populate customerEmail: ${error}`,
      )
    }
  }

  // Only set customerEmail if we successfully got an email
  if (customerEmail) {
    return {
      ...doc,
      customerEmail,
    }
  }

  return doc
}


