import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRole } from '@/access/utilities'

/**
 * GET /api/refunds/[id]
 * Get refund details
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

    const refund = await payload.findByID({
      collection: 'refunds',
      id: parseInt(id),
      depth: 2,
    })

    // Check access - customers can only see refunds for their own orders
    if (!user || !checkRole(['admin'], user)) {
      const order = await payload.findByID({
        collection: 'orders',
        id: typeof refund.order === 'object' ? refund.order.id : refund.order,
      })

      const orderCustomerId =
        typeof order.customer === 'object' ? order.customer?.id : order.customer

      if (!user || orderCustomerId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    return NextResponse.json({ refund })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch refund' },
      { status: 404 },
    )
  }
}


