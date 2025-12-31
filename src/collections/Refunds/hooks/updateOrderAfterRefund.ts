import type { Refund } from '@/payload-types'
import type { CollectionAfterChangeHook } from 'payload'

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
    req.payload.logger?.info(
      `Skipping updateOrderAfterRefund for refund ${doc.id} - operation is '${operation}', not 'create'`,
    )
    return doc
  }

  req.payload.logger?.info(
    `🔄 Running updateOrderAfterRefund hook for refund ${doc.id} (operation: ${operation}) [${new Date().toISOString()}]`,
  )

  // Log that the refund document exists (confirms it was saved)
  req.payload.logger?.info(
    `✅ Refund document ${doc.id} exists in database. Amount: ${doc.amount}, Type: ${doc.type}, Order: ${typeof doc.order === 'object' ? doc.order.id : doc.order}`,
  )

  // Get order ID
  const orderId = typeof doc.order === 'object' ? doc.order.id : doc.order

  if (!orderId) {
    req.payload.logger?.warn('No order ID found in refund document')
    return doc
  }

  try {
    req.payload.logger?.info(`Fetching order ${orderId} to update refund status`)

    // Fetch current order
    const order = await req.payload.findByID({
      collection: 'orders',
      id: orderId,
    })

    // Calculate new total refunded
    const currentTotalRefunded = order.totalRefunded || 0
    // Ensure doc.amount is a number (it should be in pence)
    const refundAmount = typeof doc.amount === 'number' ? doc.amount : 0
    const newTotalRefunded = currentTotalRefunded + refundAmount

    req.payload.logger?.info(
      `Calculating refund totals: current=${currentTotalRefunded}, refund=${refundAmount}, new=${newTotalRefunded}`,
    )

    // Determine new order status
    let newStatus = order.status
    const orderAmount = order.amount || 0
    if (newTotalRefunded >= orderAmount) {
      // Fully refunded
      newStatus = 'refunded'
    } else if (newTotalRefunded > 0) {
      // Partially refunded
      newStatus = 'partially_refunded'
    }

    req.payload.logger?.info(
      `Updating order ${orderId}: totalRefunded=${newTotalRefunded}, status=${newStatus}`,
    )

    // Get existing refunds for this order
    const existingRefunds = order.refunds || []
    const existingRefundIds = existingRefunds.map((refund) =>
      typeof refund === 'object' ? refund.id : refund,
    )

    // Add this refund to the order's refunds relationship if not already present
    const refundId = doc.id
    const updatedRefundIds = existingRefundIds.includes(refundId)
      ? existingRefundIds
      : [...existingRefundIds, refundId]

    req.payload.logger?.info(
      `Linking refund ${refundId} to order ${orderId}. Total refunds: ${updatedRefundIds.length}`,
    )

    req.payload.logger?.info(
      `🔄 About to update order ${orderId} with refund data [${new Date().toISOString()}]`,
    )

    // Update order with refund relationship, totalRefunded, and status
    // Use Promise.race with timeout to prevent hanging
    // This ensures the hook completes even if order update takes too long
    try {
      const updatePromise = req.payload.update({
        collection: 'orders',
        id: orderId,
        data: {
          refunds: updatedRefundIds,
          totalRefunded: newTotalRefunded,
          status: newStatus,
        },
      })

      // Add 5 second timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Order update timeout after 5 seconds')), 5000),
      )

      await Promise.race([updatePromise, timeoutPromise])
      req.payload.logger?.info(`✅ Successfully updated order ${orderId}`)
    } catch (orderUpdateError: any) {
      req.payload.logger?.error(
        `⚠️ Failed to update order ${orderId} after refund ${doc.id}: ${orderUpdateError.message}`,
        orderUpdateError,
      )
      // Don't throw - refund was created successfully, order update can be done manually if needed
      // Continue execution so hook completes
    }

    // Update transaction status to refunded
    // Note: Transaction updates require customerEmail due to validation hooks
    // We fetch the transaction first to preserve existing data
    const transactionValue = (doc.technicalDetails as any)?.transaction || (doc as any).transaction
    if (transactionValue) {
      const transactionId =
        typeof transactionValue === 'object' ? transactionValue.id : transactionValue

      req.payload.logger?.info(`Updating transaction ${transactionId} status to refunded`)

      try {
        // Fetch transaction first to get existing customerEmail (required by validation hooks)
        const existingTransaction = await req.payload.findByID({
          collection: 'transactions',
          id: transactionId,
          depth: 0,
        })

        // Get customerEmail from transaction, or fall back to order if not available
        // This is required by validateCustomerEmail hook
        const customerEmail = existingTransaction.customerEmail || order.customerEmail || undefined

        if (!customerEmail) {
          req.payload.logger?.warn(
            `⚠️ Cannot update transaction ${transactionId} - no customerEmail found in transaction or order. Skipping transaction status update.`,
          )
          // Skip transaction update if no customerEmail (validation will fail)
          // Continue to hook completion
        } else {
          // Update with status and customerEmail to satisfy validation hooks
          const updatePromise = req.payload.update({
            collection: 'transactions',
            id: transactionId,
            data: {
              status: 'refunded',
              customerEmail, // Required by validateCustomerEmail hook
            },
          })

          // Add 3 second timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Transaction update timeout after 3 seconds')), 3000),
          )

          await Promise.race([updatePromise, timeoutPromise])
          req.payload.logger?.info(`✅ Successfully updated transaction ${transactionId}`)
        }
      } catch (transactionUpdateError: any) {
        req.payload.logger?.error(
          `⚠️ Failed to update transaction ${transactionId} after refund ${doc.id}: ${transactionUpdateError.message}`,
          transactionUpdateError,
        )
        // Don't throw - refund was created successfully, transaction update can be done manually if needed
        // The transaction status update is not critical for the refund to function
      }
    }

    req.payload.logger?.info(
      `✅ Updated order ${orderId}: totalRefunded=${newTotalRefunded}, status=${newStatus}`,
    )
  } catch (error: any) {
    req.payload.logger?.error(
      `❌ Error updating order after refund ${doc.id}: ${error.message}`,
      error,
    )
    // Log full error details
    if (error.stack) {
      req.payload.logger?.error(`Error stack: ${error.stack}`)
    }
    // CRITICAL: Don't throw - refund was created, just log the error
    // Throwing here would prevent the response from being sent and could cause form to hang
  }

  req.payload.logger?.info(
    `✅ updateOrderAfterRefund hook completed for refund ${doc.id} [${new Date().toISOString()}]`,
  )

  // Always return doc - never throw from afterChange hooks
  return doc
}
