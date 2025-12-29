import type { CollectionAfterChangeHook } from 'payload'
import type { Refund } from '@/payload-types'

/**
 * Update order status and totalRefunded after refund is created
 */
export const updateOrderAfterRefund: CollectionAfterChangeHook<Refund> = async ({
  doc,
  req,
  operation,
}) => {
  // Only process on create
  if (operation !== 'create') {
    return doc
  }

  // Get order ID
  const orderId =
    typeof doc.order === 'object' ? doc.order.id : doc.order

  if (!orderId) {
    req.payload.logger?.warn('No order ID found in refund document')
    return doc
  }

  try {
    // Fetch current order
    const order = await req.payload.findByID({
      collection: 'orders',
      id: orderId,
    })

    // Calculate new total refunded
    const currentTotalRefunded = order.totalRefunded || 0
    const newTotalRefunded = currentTotalRefunded + doc.amount

    // Determine new order status
    let newStatus = order.status
    if (newTotalRefunded >= (order.amount || 0)) {
      // Fully refunded
      newStatus = 'refunded'
    } else if (newTotalRefunded > 0) {
      // Partially refunded
      newStatus = 'partially_refunded'
    }

    // Update order
    await req.payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        totalRefunded: newTotalRefunded,
        status: newStatus,
      },
    })

    // Update transaction status to refunded
    if (doc.transaction) {
      const transactionId =
        typeof doc.transaction === 'object'
          ? doc.transaction.id
          : doc.transaction

      await req.payload.update({
        collection: 'transactions',
        id: transactionId,
        data: {
          status: 'refunded',
        },
      })
    }

    req.payload.logger?.info(
      `✅ Updated order ${orderId}: totalRefunded=${newTotalRefunded}, status=${newStatus}`,
    )
  } catch (error) {
    req.payload.logger?.error(
      `❌ Error updating order after refund: ${error}`,
    )
    // Don't throw - refund was created, just log the error
  }

  return doc
}

