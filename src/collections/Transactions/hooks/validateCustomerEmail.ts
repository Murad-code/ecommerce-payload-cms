import type { CollectionBeforeChangeHook } from 'payload'
import type { Transaction } from '@/payload-types'

/**
 * Validates that customerEmail is set and valid for both create and update operations
 * This ensures critical workflows can function properly
 */
export const validateCustomerEmail: CollectionBeforeChangeHook<Transaction> = async ({
  data,
  operation,
}) => {
  // Validate on both create and update operations
  // Check if customerEmail is provided
  if (!data.customerEmail || data.customerEmail.trim() === '') {
    throw new Error(
      `Customer email is required to ${operation} a transaction. Please provide a customerEmail field.`,
    )
  }

  // Validate email format (basic validation)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.customerEmail)) {
    throw new Error('Customer email must be a valid email address.')
  }

  return data
}

