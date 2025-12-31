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
  const [totalRefunded, setTotalRefunded] = useState<number>(0)

  useEffect(() => {
    // Get data from field context or direct props
    const doc = props.field?.fieldSchema?.doc || props.value
    if (doc) {
      const orderRefunds = doc.refunds || []
      setRefunds(Array.isArray(orderRefunds) ? orderRefunds : [])
      setOrderId(doc.id)
      setTotalRefunded(doc.totalRefunded || 0)
    } else if (props.refunds) {
      setRefunds(props.refunds)
      setOrderId(props.orderId)
    }
  }, [props.field, props.value, props.refunds, props.orderId])

  // Show component if there are refunds OR totalRefunded > 0
  // (condition in collection config also checks status === 'refunded')
  if ((!refunds || refunds.length === 0) && totalRefunded <= 0) {
    return null // Don't render anything if no refunds and no totalRefunded
  }

  // Format totalRefunded from pence to GBP
  const totalRefundedInPounds = totalRefunded / 100
  const formattedTotalRefunded = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalRefundedInPounds)

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
      
      {/* Total Refunded Summary */}
      <div className="mb-4 p-3 bg-muted/50 border border-border rounded">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Refunded</p>
            <p className="text-2xl font-semibold">{formattedTotalRefunded}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Refunds</p>
            <p className="text-2xl font-semibold">{refunds.length}</p>
          </div>
        </div>
      </div>

      {/* Refunds List */}
      {refunds && refunds.length > 0 ? (
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
      ) : (
        <div className="p-3 bg-muted/30 border border-border rounded">
          <p className="text-sm text-muted-foreground">
            No refund records found, but total refunded amount is {formattedTotalRefunded}
          </p>
        </div>
      )}
    </div>
  )
}

