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

  // Initialize technicalDetails group if it doesn't exist
  if (!(data as any).technicalDetails) {
    ;(data as any).technicalDetails = {}
  }

  // Always auto-populate transaction from order (prevent manual selection errors)
  const technicalDetails = (data as any).technicalDetails
  technicalDetails.transaction = transaction.id
  // Also set at root level for backward compatibility
  ;(data as any).transaction = transaction.id

  // Validate that manually selected transaction (if any) belongs to the order
  const currentTransaction = technicalDetails.transaction || (data as any).transaction
  if (currentTransaction && typeof currentTransaction === 'number') {
    const selectedTransactionId = currentTransaction
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
  if (!technicalDetails.paymentIntentId && !(data as any).paymentIntentId && transaction.stripe?.paymentIntentID) {
    technicalDetails.paymentIntentId = transaction.stripe.paymentIntentID
    // Also set at root level for backward compatibility
    ;(data as any).paymentIntentId = transaction.stripe.paymentIntentID
  }

  // Check for existing refunds for this order to prevent duplicates
  // Since refunds are only created if Stripe succeeds, any refund with stripeRefundId is valid
  // This prevents duplicate refund attempts if the form is submitted twice
  const existingRefunds = await req.payload.find({
    collection: 'refunds',
    where: {
      and: [
        {
          order: {
            equals: orderId,
          },
        },
        {
          'technicalDetails.stripeRefundId': {
            exists: true,
          },
        },
      ],
    },
    limit: 1,
  })

  if (existingRefunds.docs.length > 0) {
    const existingRefund = existingRefunds.docs[0]
    const existingStripeRefundId =
      (existingRefund.technicalDetails as any)?.stripeRefundId ||
      (existingRefund as any).stripeRefundId

    if (existingStripeRefundId) {
      throw new Error(
        `A refund for this order already exists (Refund #${existingRefund.id}). Please check the refunds list instead of creating a new one.`,
      )
    }
  }

  // Validate refund amount
  const orderAmount = order.amount || 0
  const totalRefunded = order.totalRefunded || 0
  const refundableAmount = orderAmount - totalRefunded

  // Check if there's anything left to refund
  if (refundableAmount <= 0) {
    throw new Error(
      `This order has already been fully refunded. Total refunded: £${(totalRefunded / 100).toFixed(2)} of £${(orderAmount / 100).toFixed(2)}`,
    )
  }

  const amountValidation = validateRefundAmount(
    orderAmount,
    totalRefunded,
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

