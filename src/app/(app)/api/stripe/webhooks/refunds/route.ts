import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

/**
 * POST /api/stripe/webhooks/refunds
 * Handle Stripe refund webhook events
 * This should be called from the main Stripe webhook handler
 * or configured as a separate webhook endpoint in Stripe
 */
export async function POST(request: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const webhookSecret = process.env.STRIPE_WEBHOOKS_SIGNING_SECRET

    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 },
      )
    }

    const body = await request.text()
    const signature = headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 },
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia',
    })

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      payload.logger?.error(`Webhook signature verification failed: ${err.message}`)
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 },
      )
    }

    // Handle refund-related events
    switch (event.type) {
      case 'charge.refunded':
      case 'refund.created':
      case 'refund.updated': {
        const refund = event.data.object as Stripe.Refund

        // Find refund record by Stripe refund ID
        const refunds = await payload.find({
          collection: 'refunds',
          where: {
            stripeRefundId: {
              equals: refund.id,
            },
          },
          limit: 1,
        })

        if (refunds.docs.length === 0) {
          payload.logger?.warn(
            `Refund webhook received but no refund record found for Stripe refund ID: ${refund.id}`,
          )
          return NextResponse.json({ received: true })
        }

        const refundRecord = refunds.docs[0]

        // Update refund status based on Stripe status
        let newStatus: 'processing' | 'completed' | 'failed' = 'processing'
        if (refund.status === 'succeeded') {
          newStatus = 'completed'
        } else if (refund.status === 'failed' || refund.status === 'canceled') {
          newStatus = 'failed'
        }

        // Update refund record
        await payload.update({
          collection: 'refunds',
          id: refundRecord.id,
          data: {
            status: newStatus,
          },
        })

        payload.logger?.info(
          `✅ Updated refund ${refundRecord.id} status to ${newStatus} from Stripe webhook`,
        )

        // If refund is completed, ensure order status is updated
        if (newStatus === 'completed') {
          const orderId =
            typeof refundRecord.order === 'object'
              ? refundRecord.order.id
              : refundRecord.order

          if (orderId) {
            const order = await payload.findByID({
              collection: 'orders',
              id: orderId,
            })

            const totalRefunded = order.totalRefunded || 0
            const orderAmount = order.amount || 0

            // Update order status if needed
            let orderStatus = order.status
            if (totalRefunded >= orderAmount) {
              orderStatus = 'refunded'
            } else if (totalRefunded > 0) {
              orderStatus = 'partially_refunded'
            }

            if (orderStatus !== order.status) {
              await payload.update({
                collection: 'orders',
                id: orderId,
                data: {
                  status: orderStatus,
                },
              })

              payload.logger?.info(
                `✅ Updated order ${orderId} status to ${orderStatus}`,
              )
            }
          }
        }

        return NextResponse.json({ received: true })
      }

      default:
        // Not a refund event, ignore
        return NextResponse.json({ received: true })
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 },
    )
  }
}

