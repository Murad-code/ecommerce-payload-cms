import { getPrimaryTransaction } from '@/lib/refunds/validation'
import { processFullRefund, processPartialRefund } from '@/lib/stripe/refunds'
import type { Refund } from '@/payload-types'
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Process refund via Stripe API BEFORE saving the refund record
 * If Stripe processing fails, the refund record will not be created
 * This ensures we only create refund records for successful Stripe refunds
 */
export const processStripeRefund: CollectionBeforeChangeHook<Refund> = async ({
  data,
  req,
  operation,
}) => {
  // Only process on create (not on update)
  if (operation !== 'create') {
    return data
  }

  req.payload.logger?.info(
    `🔄 Processing Stripe refund before saving refund record (operation: ${operation}) [${new Date().toISOString()}]`,
  )

  // Ensure we have required fields
  if (!data.order || !data.type || !data.amount) {
    const missingFields = []
    if (!data.order) missingFields.push('order')
    if (!data.type) missingFields.push('type')
    if (!data.amount) missingFields.push('amount')
    throw new Error(
      `Cannot process Stripe refund: missing required fields: ${missingFields.join(', ')}`,
    )
  }

  try {
    // Get order to fetch transaction
    const orderId = typeof data.order === 'object' ? data.order.id : data.order
    const order = await req.payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 2,
    })

    // Get primary transaction
    const transaction = getPrimaryTransaction(order)
    if (!transaction) {
      throw new Error(`Cannot process Stripe refund: no transaction found for order ${orderId}`)
    }

    if (!transaction.stripe?.paymentIntentID) {
      throw new Error(
        `Cannot process Stripe refund: transaction ${transaction.id} does not have a payment intent ID for order ${orderId}`,
      )
    }

    const paymentIntentId = transaction.stripe.paymentIntentID

    // Check if there's already a refund for this order
    // Since refunds are only created if Stripe succeeds, any refund with stripeRefundId is valid
    // This prevents duplicate refunds
    const existingSuccessfulRefunds = await req.payload.find({
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

    if (existingSuccessfulRefunds.docs.length > 0) {
      const existingRefund = existingSuccessfulRefunds.docs[0]
      const existingStripeRefundId = (existingRefund.technicalDetails as any)?.stripeRefundId
      throw new Error(
        `A refund for this order already exists (Refund #${existingRefund.id} with Stripe ID ${existingStripeRefundId}). Please check the refunds list instead of creating a new one.`,
      )
    }

    // Process refund via Stripe
    let stripeRefund
    // Amount should already be in pence
    const refundAmount = typeof data.amount === 'number' ? data.amount : 0
    const reason = data.reason || undefined

    req.payload.logger?.info(
      `🚀 Calling Stripe API for refund: amount=${refundAmount} pence (£${refundAmount / 100}), paymentIntentId=${paymentIntentId} [${new Date().toISOString()}]`,
    )

    try {
      if (data.type === 'full') {
        stripeRefund = await processFullRefund(paymentIntentId, reason)
        req.payload.logger?.info(
          `✅ Processed full refund via Stripe: ${stripeRefund.id} for payment intent ${paymentIntentId}`,
        )
      } else {
        // Partial refund
        if (!refundAmount || refundAmount <= 0) {
          throw new Error(`Partial refund amount must be greater than 0, got: ${refundAmount}`)
        }
        req.payload.logger?.info(
          `Processing partial refund: ${refundAmount} pence for payment intent ${paymentIntentId}`,
        )
        stripeRefund = await processPartialRefund(paymentIntentId, refundAmount, reason)
        req.payload.logger?.info(
          `✅ Processed partial refund via Stripe: ${stripeRefund.id} for payment intent ${paymentIntentId}, amount: ${refundAmount} pence`,
        )
      }
    } catch (stripeError: any) {
      req.payload.logger?.error(
        `❌ Stripe refund processing failed: ${stripeError.message}`,
        stripeError,
      )
      // Re-throw the error so the refund record is not created
      throw new Error(`Stripe refund failed: ${stripeError.message}`)
    }

    // Initialize technicalDetails if it doesn't exist
    if (!data.technicalDetails) {
      data.technicalDetails = {} as any
    }

    // Add Stripe information to the refund data before saving
    const technicalDetails = data.technicalDetails as any
    technicalDetails.stripeRefundId = stripeRefund.id
    technicalDetails.paymentIntentId = paymentIntentId
    technicalDetails.transaction = transaction.id

    if (stripeRefund.charge) {
      technicalDetails.stripeChargeId =
        typeof stripeRefund.charge === 'string' ? stripeRefund.charge : stripeRefund.charge.id
    }

    req.payload.logger?.info(
      `✅ Stripe refund processed successfully: ${stripeRefund.id}. Refund record will now be saved.`,
    )

    return data
  } catch (error: any) {
    req.payload.logger?.error(`Error processing Stripe refund: ${error.message}`, error)
    // Re-throw the error so the refund record is not created
    throw error
  }
}
