import type { CollectionBeforeChangeHook } from 'payload'
import type { RefundRequest } from '@/payload-types'
import { validateOrderCanBeRefunded, getRefundableAmount } from '@/lib/refunds/validation'

/**
 * Validate refund request before creation
 */
export const validateRefundRequest: CollectionBeforeChangeHook<RefundRequest> = async ({
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
    depth: 1,
  })

  // Validate order can be refunded
  const orderValidation = validateOrderCanBeRefunded(order)
  if (!orderValidation.valid) {
    throw new Error(orderValidation.error)
  }

  // Check for existing pending/approved requests for this order
  const existingRequests = await req.payload.find({
    collection: 'refund-requests',
    where: {
      and: [
        {
          order: {
            equals: orderId,
          },
        },
        {
          status: {
            in: ['pending', 'approved'],
          },
        },
      ],
    },
    limit: 1,
  })

  if (existingRequests.docs.length > 0) {
    throw new Error(
      'There is already a pending or approved refund request for this order',
    )
  }

  // Validate partial refund amount if type is partial
  if (data.type === 'partial') {
    if (!data.amount || data.amount <= 0) {
      throw new Error('Partial refund amount is required and must be greater than 0')
    }

    const refundable = getRefundableAmount(order.amount, order.totalRefunded || 0)
    if (data.amount > refundable) {
      throw new Error(
        `Requested refund amount (${data.amount}) exceeds refundable amount (${refundable})`,
      )
    }
  }

  // Set currency from order if not set
  if (!data.currency && order.currency) {
    data.currency = order.currency
  }

  // Auto-set amount for full refunds
  if (data.type === 'full' && !data.amount) {
    const refundable = getRefundableAmount(order.amount, order.totalRefunded || 0)
    data.amount = refundable
  }

  return data
}

