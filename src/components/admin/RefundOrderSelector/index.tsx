'use client'

import { useState, useEffect } from 'react'
import type { Order } from '@/payload-types'
import { Price } from '@/components/Price'
import { formatDateTime } from '@/utilities/formatDateTime'

type Props = {
  field?: any
  path?: string
  value?: any
  onChange?: (value: any) => void
}

export const RefundOrderSelector: React.FC<Props> = (props) => {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)

  // Get order ID from field value
  const orderId = props.value || props.field?.value

  useEffect(() => {
    // Try to get order from field context first
    const doc = props.field?.fieldSchema?.doc || props.field?.doc
    const formData = props.field?.formState?.values

    // Get order ID from various sources
    const orderValue = orderId || formData?.order || doc?.order

    if (!orderValue) {
      setOrder(null)
      return
    }

    const orderIdValue = typeof orderValue === 'object' ? orderValue.id : orderValue

    if (!orderIdValue) {
      setOrder(null)
      return
    }

    // If we have the order object directly, use it
    if (typeof orderValue === 'object' && orderValue.id) {
      setOrder(orderValue as Order)
      return
    }

    // Otherwise fetch it
    const fetchOrder = async () => {
      setLoading(true)
      try {
        // Try to get from Payload API
        const response = await fetch(`/api/orders/${orderIdValue}`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setOrder(data.docs?.[0] || data)
        } else {
          // Fallback: try to get from form data if available
          if (formData?.order && typeof formData.order === 'object') {
            setOrder(formData.order as Order)
          }
        }
      } catch (error) {
        console.error('Failed to fetch order:', error)
        // Fallback: try to get from form data if available
        if (formData?.order && typeof formData.order === 'object') {
          setOrder(formData.order as Order)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, props.field])

  if (!orderId) {
    return (
      <div className="p-4 border border-border rounded bg-muted/50">
        <p className="text-sm text-muted-foreground mb-2">
          <strong>⚠️ Important:</strong> Please select an order above first.
        </p>
        <p className="text-xs text-muted-foreground">
          The transaction will be automatically selected from the order to ensure you refund the correct customer.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 border border-border rounded">
        <p className="text-sm">Loading order details...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-4 border border-destructive rounded bg-destructive/10">
        <p className="text-sm text-destructive">
          Failed to load order details. Please verify the order ID.
        </p>
      </div>
    )
  }

  // Get customer info
  const customerName =
    typeof order.customer === 'object' && order.customer
      ? order.customer.name || order.customer.email
      : order.customerEmail || 'Guest Customer'

  // Get transaction info
  const transactions = order.transactions || []
  const primaryTransaction = transactions.find(
    (tx) => typeof tx === 'object' && tx.status === 'succeeded',
  )

  return (
    <div className="p-4 border border-primary/20 rounded bg-primary/5">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <span>✅ Order Verification</span>
      </h4>
      <p className="text-xs text-muted-foreground mb-3 pb-3 border-b">
        Please verify these details match the customer you intend to refund:
      </p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Order ID:</span>
          <span className="font-medium">#{order.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Customer:</span>
          <span className="font-medium">{customerName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Order Date:</span>
          <span>{formatDateTime({ date: order.createdAt, format: 'MMM dd, yyyy' })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Order Amount:</span>
          <span className="font-medium">
            {order.amount ? <Price amount={order.amount} /> : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Already Refunded:</span>
          <span>{order.totalRefunded ? <Price amount={order.totalRefunded} /> : <Price amount={0} />}</span>
        </div>
        <div className="flex justify-between font-medium pt-2 border-t">
          <span>Refundable Amount:</span>
          <span className="text-primary">
            {order.amount && order.totalRefunded !== undefined ? (
              <Price amount={order.amount - (order.totalRefunded || 0)} />
            ) : (
              <Price amount={0} />
            )}
          </span>
        </div>
        {primaryTransaction && typeof primaryTransaction === 'object' && (
          <div className="pt-2 border-t mt-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Transaction:</span> #{primaryTransaction.id} (Status:{' '}
              {primaryTransaction.status})
            </p>
            {primaryTransaction.stripe?.paymentIntentID && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Payment Intent:</span>{' '}
                {primaryTransaction.stripe.paymentIntentID}
              </p>
            )}
          </div>
        )}
        {!primaryTransaction && (
          <div className="pt-2 border-t mt-2">
            <p className="text-xs text-destructive">
              ⚠️ No valid transaction found for this order
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

