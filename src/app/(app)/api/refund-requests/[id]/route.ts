import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRole } from '@/access/utilities'

/**
 * GET /api/refund-requests/[id]
 * Get refund request details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })

    const { id } = await params

    const refundRequest = await payload.findByID({
      collection: 'refund-requests',
      id: parseInt(id),
      depth: 2,
    })

    // Check access
    if (!user || !checkRole(['admin'], user)) {
      const requestCustomerId =
        typeof refundRequest.customer === 'object'
          ? refundRequest.customer?.id
          : refundRequest.customer

      if (!user || requestCustomerId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    return NextResponse.json({ refundRequest })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch refund request' },
      { status: 404 },
    )
  }
}

/**
 * DELETE /api/refund-requests/[id]
 * Cancel a pending refund request (customer only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })

    const { id } = await params

    const refundRequest = await payload.findByID({
      collection: 'refund-requests',
      id: parseInt(id),
    })

    // Only customers can cancel their own pending requests
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const requestCustomerId =
      typeof refundRequest.customer === 'object'
        ? refundRequest.customer?.id
        : refundRequest.customer

    if (requestCustomerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (refundRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending requests can be cancelled' },
        { status: 400 },
      )
    }

    // Update status to cancelled
    await payload.update({
      collection: 'refund-requests',
      id: parseInt(id),
      data: {
        status: 'cancelled',
      },
    })

    return NextResponse.json({ message: 'Refund request cancelled' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to cancel refund request' },
      { status: 400 },
    )
  }
}

