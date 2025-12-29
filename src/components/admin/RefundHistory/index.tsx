'use client'

import { useState, useEffect } from 'react'
import type { Refund } from '@/payload-types'
import { formatDateTime } from '@/utilities/formatDateTime'
import { Price } from '@/components/Price'
import Link from 'next/link'

type Props = {
  field?: any
  path?: string
  value?: any
  onChange?: (value: any) => void
  // Direct props (when used as standalone component)
  refunds?: Refund[]
  orderId?: number
}

export const RefundHistory: React.FC<Props> = (props) => {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [orderId, setOrderId] = useState<number | undefined>()

  useEffect(() => {
    // Get data from field context or direct props
    const doc = props.field?.fieldSchema?.doc || props.value
    if (doc) {
      const orderRefunds = doc.refunds || []
      setRefunds(Array.isArray(orderRefunds) ? orderRefunds : [])
      setOrderId(doc.id)
    } else if (props.refunds) {
      setRefunds(props.refunds)
      setOrderId(props.orderId)
    }
  }, [props.field, props.value, props.refunds, props.orderId])

  if (!refunds || refunds.length === 0) {
    return (
      <div className="p-4 border border-border rounded">
        <h3 className="mt-0 mb-2">Refund History</h3>
        <p className="text-muted-foreground text-sm">No refunds for this order</p>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground'
      case 'processing':
        return 'bg-primary/10 text-primary'
      case 'failed':
        return 'bg-destructive/10 text-destructive'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="p-4 border border-border rounded">
      <h3 className="mt-0 mb-4">Refund History</h3>
      <div className="flex flex-col gap-3">
        {refunds.map((refund) => {
          const refundId = typeof refund === 'object' ? refund.id : refund
          const refundData = typeof refund === 'object' ? refund : null

          if (!refundData) {
            return null
          }

          return (
            <div
              key={refundId}
              className="p-3 bg-muted border border-border rounded"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/admin/collections/refunds/${refundId}`}
                      className="font-medium hover:underline"
                    >
                      Refund #{refundId}
                    </Link>
                    <span
                      className={`text-xs px-2 py-0.5 rounded uppercase ${getStatusColor(
                        refundData.status || 'processing',
                      )}`}
                    >
                      {refundData.status || 'processing'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Type:</span> {refundData.type}
                    {refundData.type === 'partial' && refundData.amount && (
                      <>
                        {' • '}
                        <span className="font-medium">Amount:</span>{' '}
                        <Price amount={refundData.amount} />
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {refundData.processedAt && (
                    <div>
                      {formatDateTime({
                        date: refundData.processedAt,
                        format: 'MMM dd, yyyy HH:mm',
                      })}
                    </div>
                  )}
                </div>
              </div>

              {refundData.reason && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-1">
                    <span className="font-medium">Reason:</span> {refundData.reason}
                  </p>
                </div>
              )}

              {refundData.stripeRefundId && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Stripe Refund ID:</span> {refundData.stripeRefundId}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

