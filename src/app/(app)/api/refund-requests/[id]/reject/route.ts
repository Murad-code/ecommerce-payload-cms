import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRole } from '@/access/utilities'

/**
 * POST /api/refund-requests/[id]/reject
 * Reject a refund request (admin only)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })

    // Check admin access
    if (!user || !checkRole(['admin'], user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { rejectionReason } = body

    const refundRequest = await payload.findByID({
      collection: 'refund-requests',
      id: parseInt(id),
    })

    if (refundRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending requests can be rejected' },
        { status: 400 },
      )
    }

    // Update status to rejected
    const updated = await payload.update({
      collection: 'refund-requests',
      id: parseInt(id),
      data: {
        status: 'rejected',
        rejectionReason: rejectionReason || 'Refund request rejected',
      },
    })

    return NextResponse.json({
      message: 'Refund request rejected',
      refundRequest: updated,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to reject refund request' },
      { status: 400 },
    )
  }
}

