import type { CollectionBeforeChangeHook } from 'payload'
import type { Refund } from '@/payload-types'
import {
  validateOrderCanBeRefunded,
  validateRefundAmount,
  validateTransactionCanBeRefunded,
  getPrimaryTransaction,
} from '@/lib/refunds/validation'

/**
 * Validate refund before creation
 */
export const validateRefund: CollectionBeforeChangeHook<Refund> = async ({
  data,
  req,
  operation,
}) => {
  // Only validate on create
  if (operation !== 'create') {
    return data
  }

  // Fetch order
  if (!data.order) {
    throw new Error('Order is required')
  }

  const orderId = typeof data.order === 'object' ? data.order.id : data.order
  const order = await req.payload.findByID({
    collection: 'orders',
    id: orderId,
    depth: 2,
  })

  // Validate order can be refunded
  const orderValidation = validateOrderCanBeRefunded(order)
  if (!orderValidation.valid) {
    throw new Error(orderValidation.error)
  }

  // Get primary transaction
  const transaction = getPrimaryTransaction(order)
  if (!transaction) {
    throw new Error('No valid transaction found for refund')
  }

  // Validate transaction can be refunded
  const transactionValidation = validateTransactionCanBeRefunded(transaction)
  if (!transactionValidation.valid) {
    throw new Error(transactionValidation.error)
  }

  // Always auto-populate transaction from order (prevent manual selection errors)
  data.transaction = transaction.id

  // Validate that manually selected transaction (if any) belongs to the order
  if (data.transaction && typeof data.transaction === 'number') {
    const selectedTransactionId = data.transaction
    const orderTransactionIds = order.transactions
      ?.map((tx) => (typeof tx === 'object' ? tx.id : tx))
      .filter(Boolean) || []

    if (!orderTransactionIds.includes(selectedTransactionId)) {
      throw new Error(
        `Selected transaction (${selectedTransactionId}) does not belong to order ${orderId}. Using primary transaction instead.`,
      )
    }
  }

  // Set payment intent ID from transaction
  if (!data.paymentIntentId && transaction.stripe?.paymentIntentID) {
    data.paymentIntentId = transaction.stripe.paymentIntentID
  }

  // Validate refund amount
  const amountValidation = validateRefundAmount(
    order.amount,
    order.totalRefunded || 0,
    data.amount,
  )
  if (!amountValidation.valid) {
    throw new Error(amountValidation.error)
  }

  // Set currency from order if not set
  if (!data.currency && order.currency) {
    data.currency = order.currency
  }

  // Determine type if not set
  if (!data.type) {
    const refundableAmount = order.amount! - (order.totalRefunded || 0)
    data.type = data.amount === refundableAmount ? 'full' : 'partial'
  }

  return data
}

