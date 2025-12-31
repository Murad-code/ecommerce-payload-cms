import type { CollectionBeforeChangeHook } from 'payload'
import type { Refund } from '@/payload-types'
import { getPrimaryTransaction } from '@/lib/refunds/validation'

/**
 * Auto-populate transaction from order when order is selected
 * This prevents admins from selecting the wrong transaction
 */
export const autoPopulateTransaction: CollectionBeforeChangeHook<Refund> = async ({
  data,
  req,
  operation,
}) => {
  // Only run on create or update
  if (operation !== 'create' && operation !== 'update') {
    return data
  }

  // If order is set but transaction is not, auto-populate
  if (data.order && !data.transaction) {
    const orderId = typeof data.order === 'object' ? data.order.id : data.order

    try {
      const order = await req.payload.findByID({
        collection: 'orders',
        id: orderId,
        depth: 2,
      })

      const primaryTransaction = getPrimaryTransaction(order)
      if (primaryTransaction) {
        data.transaction = primaryTransaction.id
        req.payload.logger?.info(
          `Auto-populated transaction ${primaryTransaction.id} for order ${orderId}`,
        )
      }
    } catch (error) {
      req.payload.logger?.error(
        `Failed to auto-populate transaction for order ${orderId}: ${error}`,
      )
    }
  }

  return data
}


