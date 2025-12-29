import Stripe from 'stripe'

/**
 * Initialize Stripe client
 */
const getStripeClient = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
  })
}

/**
 * Process a full refund via Stripe API
 * @param paymentIntentId - Stripe payment intent ID
 * @param reason - Optional reason for the refund
 * @returns Stripe refund object
 */
export async function processFullRefund(
  paymentIntentId: string,
  reason?: string,
): Promise<Stripe.Refund> {
  const stripe = getStripeClient()

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: reason as Stripe.RefundCreateParams.Reason | undefined,
    })

    return refund
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe refund error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Process a partial refund via Stripe API
 * @param paymentIntentId - Stripe payment intent ID
 * @param amount - Refund amount in smallest currency unit (e.g., pence for GBP)
 * @param reason - Optional reason for the refund
 * @returns Stripe refund object
 */
export async function processPartialRefund(
  paymentIntentId: string,
  amount: number,
  reason?: string,
): Promise<Stripe.Refund> {
  const stripe = getStripeClient()

  if (amount <= 0) {
    throw new Error('Refund amount must be greater than 0')
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason: reason as Stripe.RefundCreateParams.Reason | undefined,
    })

    return refund
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe refund error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Get refund details from Stripe
 * @param refundId - Stripe refund ID
 * @returns Stripe refund object
 */
export async function getRefund(refundId: string): Promise<Stripe.Refund> {
  const stripe = getStripeClient()

  try {
    const refund = await stripe.refunds.retrieve(refundId)
    return refund
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe error retrieving refund: ${error.message}`)
    }
    throw error
  }
}

/**
 * Get payment intent details from Stripe
 * @param paymentIntentId - Stripe payment intent ID
 * @returns Stripe payment intent object
 */
export async function getPaymentIntent(
  paymentIntentId: string,
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient()

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return paymentIntent
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe error retrieving payment intent: ${error.message}`)
    }
    throw error
  }
}

