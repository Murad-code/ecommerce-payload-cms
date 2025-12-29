import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRole } from '@/access/utilities'
import { processFullRefund, processPartialRefund } from '@/lib/stripe/refunds'
import { getPrimaryTransaction } from '@/lib/refunds/validation'
import type { Order } from '@/payload-types'

/**
 * POST /api/refunds/process
 * Process a refund (admin only)
 * Can process from approved request or directly
 */
export async function POST(request: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })

    // Check admin access
    if (!user || !checkRole(['admin'], user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { orderId, refundRequestId, amount, reason, type } = body

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    // Fetch order
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 2,
    }) as Order

    // Get primary transaction
    const transaction = getPrimaryTransaction(order)
    if (!transaction || !transaction.stripe?.paymentIntentID) {
      return NextResponse.json(
        { error: 'No valid transaction with payment intent found' },
        { status: 400 },
      )
    }

    const paymentIntentId = transaction.stripe.paymentIntentID

    // Determine refund type and amount
    let refundType: 'full' | 'partial'
    let refundAmount: number

    if (refundRequestId) {
      // Process from approved request
      const refundRequest = await payload.findByID({
        collection: 'refund-requests',
        id: refundRequestId,
      })

      if (refundRequest.status !== 'approved') {
        return NextResponse.json(
          { error: 'Refund request must be approved before processing' },
          { status: 400 },
        )
      }

      refundType = refundRequest.type
      refundAmount = refundRequest.amount || order.amount || 0
    } else {
      // Direct refund
      if (!type || !amount) {
        return NextResponse.json(
          { error: 'type and amount are required for direct refunds' },
          { status: 400 },
        )
      }

      refundType = type
      refundAmount = amount
    }

    // Process refund via Stripe
    let stripeRefund
    try {
      if (refundType === 'full') {
        stripeRefund = await processFullRefund(paymentIntentId, reason)
      } else {
        stripeRefund = await processPartialRefund(paymentIntentId, refundAmount, reason)
      }
    } catch (stripeError: any) {
      return NextResponse.json(
        { error: `Stripe refund failed: ${stripeError.message}` },
        { status: 400 },
      )
    }

    // Create refund record
    const refund = await payload.create({
      collection: 'refunds',
      data: {
        order: orderId,
        transaction: transaction.id,
        amount: refundAmount,
        type: refundType,
        status: stripeRefund.status === 'succeeded' ? 'completed' : 'processing',
        stripeRefundId: stripeRefund.id,
        stripeChargeId: stripeRefund.charge as string,
        paymentIntentId,
        reason: reason || undefined,
        refundRequest: refundRequestId || undefined,
      },
      user,
    })

    // Update refund request if processed from request
    if (refundRequestId) {
      await payload.update({
        collection: 'refund-requests',
        id: refundRequestId,
        data: {
          refund: refund.id,
        },
      })
    }

    return NextResponse.json(
      {
        message: 'Refund processed successfully',
        refund,
        stripeRefund: {
          id: stripeRefund.id,
          status: stripeRefund.status,
          amount: stripeRefund.amount,
        },
      },
      { status: 201 },
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 400 },
    )
  }
}

