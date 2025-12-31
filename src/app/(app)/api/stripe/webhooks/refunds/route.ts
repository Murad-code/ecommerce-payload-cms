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

        // Find refund record by Stripe refund ID (check both root level and technicalDetails)
        const refunds = await payload.find({
          collection: 'refunds',
          where: {
            or: [
              {
                'technicalDetails.stripeRefundId': {
                  equals: refund.id,
                },
              },
              {
                stripeRefundId: {
                  equals: refund.id,
                },
              },
            ],
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

        // Prepare update data - ensure stripeRefundId and stripeChargeId are set
        // (Refunds are now only created if Stripe succeeds, so we just ensure technical details are complete)
        const updateData: {
          technicalDetails?: {
            stripeRefundId?: string
            stripeChargeId?: string
          }
        } = {}

        // Check if technicalDetails exists, initialize if needed
        const technicalDetails = (refundRecord as any).technicalDetails || {}
        let needsTechnicalUpdate = false

        // Update stripeRefundId if missing (edge case: refund created outside system)
        if (!technicalDetails.stripeRefundId && !(refundRecord as any).stripeRefundId && refund.id) {
          technicalDetails.stripeRefundId = refund.id
          needsTechnicalUpdate = true
        }

        // Update stripeChargeId if missing and available from refund object
        if (!technicalDetails.stripeChargeId && !(refundRecord as any).stripeChargeId && refund.charge) {
          technicalDetails.stripeChargeId =
            typeof refund.charge === 'string' ? refund.charge : refund.charge.id
          needsTechnicalUpdate = true
        }

        if (needsTechnicalUpdate) {
          updateData.technicalDetails = technicalDetails
          // Update refund record if needed
          await payload.update({
            collection: 'refunds',
            id: refundRecord.id,
            data: updateData,
          })
          payload.logger?.info(
            `✅ Updated refund ${refundRecord.id} technical details from Stripe webhook`,
          )
        }

        // Ensure order status is updated if refund succeeded
        if (refund.status === 'succeeded') {
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

