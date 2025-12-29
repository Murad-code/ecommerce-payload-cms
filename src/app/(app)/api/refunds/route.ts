import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRole } from '@/access/utilities'

/**
 * GET /api/refunds
 * List refunds (customer sees their own, admin sees all)
 */
export async function GET(request: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')

    // Build query
    const where: any = {}

    if (orderId) {
      where.order = { equals: parseInt(orderId) }
    }

    if (status) {
      where.status = { equals: status }
    }

    // Non-admin users can only see refunds for their own orders
    if (!user || !user.roles?.includes('admin')) {
      if (user) {
        // Get user's orders
        const userOrders = await payload.find({
          collection: 'orders',
          where: {
            customer: { equals: user.id },
          },
          limit: 1000,
        })

        const orderIds = userOrders.docs.map((o) => o.id)
        if (orderIds.length === 0) {
          return NextResponse.json({ refunds: [] })
        }

        where.order = { in: orderIds }
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const result = await payload.find({
      collection: 'refunds',
      where,
      depth: 2,
      sort: '-createdAt',
    })

    return NextResponse.json({ refunds: result.docs })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch refunds' },
      { status: 500 },
    )
  }
}

