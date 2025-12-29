import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import type { RefundRequest } from '@/payload-types'

/**
 * POST /api/refund-requests
 * Create a refund request (customer)
 */
export async function POST(request: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })

    const body = await request.json()
    const { orderId, type, amount, reason, items, email } = body

    // Validate required fields
    if (!orderId || !type || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, type, and reason are required' },
        { status: 400 },
      )
    }

    // Fetch order to verify access
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 1,
    })

    // Verify customer access (user must own order or provide matching email)
    if (user) {
      const orderCustomerId =
        typeof order.customer === 'object' ? order.customer.id : order.customer
      if (orderCustomerId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    } else {
      // Guest access - must provide email that matches order
      if (!email || email !== order.customerEmail) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    // Create refund request
    const refundRequest = await payload.create({
      collection: 'refund-requests',
      data: {
        order: orderId,
        type,
        amount: type === 'partial' ? amount : undefined,
        reason,
        items: type === 'partial' && items ? items : undefined,
        customerEmail: email || user?.email,
      },
      user,
    })

    return NextResponse.json(
      { message: 'Refund request created successfully', refundRequest },
      { status: 201 },
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create refund request' },
      { status: 400 },
    )
  }
}

/**
 * GET /api/refund-requests
 * List refund requests (customer sees their own, admin sees all)
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

    // Non-admin users can only see their own requests
    if (!user || !user.roles?.includes('admin')) {
      if (user) {
        where.customer = { equals: user.id }
      } else {
        // Guest users need email
        const email = searchParams.get('email')
        if (email) {
          where.customerEmail = { equals: email }
        } else {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }
      }
    }

    const result = await payload.find({
      collection: 'refund-requests',
      where,
      depth: 2,
      sort: '-createdAt',
    })

    return NextResponse.json({ refundRequests: result.docs })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch refund requests' },
      { status: 500 },
    )
  }
}

