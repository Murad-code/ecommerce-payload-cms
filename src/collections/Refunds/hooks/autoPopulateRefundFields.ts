import { getPrimaryTransaction } from '@/lib/refunds/validation'
import type { Refund } from '@/payload-types'
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Auto-populate refund fields from order when order is selected
 * This includes: transaction, amount, currency, and paymentIntentId
 */
export const autoPopulateRefundFields: CollectionBeforeChangeHook<Refund> = async ({
  data,
  req,
  operation,
}) => {
  // Only run on create or update
  if (operation !== 'create' && operation !== 'update') {
    return data
  }

  // If order is set, auto-populate related fields
  if (data.order) {
    const orderId = typeof data.order === 'object' ? data.order.id : data.order

    try {
      const order = await req.payload.findByID({
        collection: 'orders',
        id: orderId,
        depth: 2,
      })

      // Initialize technicalDetails group if it doesn't exist
      if (!data.technicalDetails) {
        data.technicalDetails = {} as any
      }

      // Auto-populate transaction
      const transactionValue =
        (data.technicalDetails as any)?.transaction || (data as any).transaction
      if (!transactionValue) {
        const primaryTransaction = getPrimaryTransaction(order)
        if (primaryTransaction) {
          // Set in both places for compatibility
          if (data.technicalDetails) {
            data.technicalDetails.transaction = primaryTransaction.id
          }
          // Also set at root level for backward compatibility
          ;(data as any).transaction = primaryTransaction.id
          req.payload.logger?.info(
            `Auto-populated transaction ${primaryTransaction.id} for order ${orderId}`,
          )
        }
      }

      // Auto-populate currency from order
      if (order.currency && !data.currency) {
        data.currency = order.currency
      }

      // Auto-populate paymentIntentId from transaction
      const currentTransaction =
        transactionValue || data.technicalDetails?.transaction || (data as any).transaction
      const currentPaymentIntentId =
        data.technicalDetails?.paymentIntentId || (data as any).paymentIntentId

      if (currentTransaction && !currentPaymentIntentId) {
        const transactionId =
          typeof currentTransaction === 'object' ? currentTransaction.id : currentTransaction

        try {
          const transaction = await req.payload.findByID({
            collection: 'transactions',
            id: transactionId,
            depth: 0,
          })

          if (transaction.stripe?.paymentIntentID) {
            if (data.technicalDetails) {
              data.technicalDetails.paymentIntentId = transaction.stripe.paymentIntentID
            }
            // Also set at root level for backward compatibility
            ;(data as any).paymentIntentId = transaction.stripe.paymentIntentID
            req.payload.logger?.info(
              `Auto-populated paymentIntentId ${transaction.stripe.paymentIntentID} from transaction ${transactionId}`,
            )
          }
        } catch (error) {
          req.payload.logger?.warn(
            `Could not fetch transaction ${transactionId} to populate paymentIntentId: ${error}`,
          )
        }
      }

      // Auto-populate amount based on refund type
      // Amount is stored in pence, but user enters in pounds
      // Only auto-populate if amount is not already set
      if (data.amount === undefined || data.amount === null) {
        if (order.amount !== undefined && order.amount !== null) {
          if (data.type === 'full') {
            // For full refund, use the remaining refundable amount (in pence)
            const totalRefunded = order.totalRefunded || 0
            const refundableAmountPence = order.amount - totalRefunded
            // Store in pence (will be converted to pounds in UI component)
            data.amount = refundableAmountPence
            req.payload.logger?.info(
              `Auto-populated full refund amount: ${refundableAmountPence} pence (£${refundableAmountPence / 100})`,
            )
          } else if (data.type === 'partial') {
            // For partial refund, don't auto-populate - admin should specify
            req.payload.logger?.info(
              `Partial refund - amount should be specified by admin in pounds. Remaining refundable: £${(order.amount - (order.totalRefunded || 0)) / 100}`,
            )
          }
        }
      } else {
        // Convert pounds to pence before saving
        // User enters in pounds in the UI, but we store in pence
        // Check if amount is likely in pounds (less than 1000) or already in pence
        const amountValue =
          typeof data.amount === 'number' ? data.amount : parseFloat(data.amount as string)
        if (!isNaN(amountValue)) {
          // If amount is less than 1000, assume it's in pounds and convert to pence
          // Otherwise, assume it's already in pence (from auto-population or existing record)
          if (amountValue < 1000 && amountValue > 0) {
            data.amount = Math.round(amountValue * 100) // Convert to pence
            req.payload.logger?.info(
              `Converted refund amount from £${amountValue} to ${data.amount} pence`,
            )
          } else {
            // Already in pence, keep as is
            req.payload.logger?.info(`Refund amount already in pence: ${data.amount}`)
          }
        }
      }
    } catch (error) {
      req.payload.logger?.error(
        `Failed to auto-populate refund fields for order ${orderId}: ${error}`,
      )
    }
  }

  return data
}
