import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRole } from '@/access/utilities'

/**
 * POST /api/refund-requests/[id]/approve
 * Approve a refund request (admin only)
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

    const refundRequest = await payload.findByID({
      collection: 'refund-requests',
      id: parseInt(id),
    })

    if (refundRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending requests can be approved' },
        { status: 400 },
      )
    }

    // Update status to approved
    const updated = await payload.update({
      collection: 'refund-requests',
      id: parseInt(id),
      data: {
        status: 'approved',
      },
    })

    return NextResponse.json({
      message: 'Refund request approved',
      refundRequest: updated,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to approve refund request' },
      { status: 400 },
    )
  }
}


