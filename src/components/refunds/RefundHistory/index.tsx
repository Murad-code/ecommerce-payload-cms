'use client'

import type { Refund } from '@/payload-types'
import { formatDateTime } from '@/utilities/formatDateTime'
import { Price } from '@/components/Price'
import { cn } from '@/utilities/cn'

type Props = {
  refunds: Refund[]
  className?: string
}

export const RefundHistory: React.FC<Props> = ({ refunds, className }) => {
  if (!refunds || refunds.length === 0) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground'
      case 'processing':
        return 'bg-primary/10 text-primary'
      case 'failed':
        return 'bg-destructive text-destructive-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-lg font-semibold">Refund History</h3>
      <div className="space-y-3">
        {refunds.map((refund) => {
          const refundData = typeof refund === 'object' ? refund : null
          if (!refundData) return null

          return (
            <div key={refundData.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">Refund #{refundData.id}</span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded uppercase',
                        getStatusColor(refundData.status || 'processing'),
                      )}
                    >
                      {refundData.status || 'processing'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      <span className="font-medium">Type:</span> {refundData.type}
                    </div>
                    {refundData.amount && (
                      <div>
                        <span className="font-medium">Amount:</span>{' '}
                        <Price amount={refundData.amount} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {refundData.processedAt && (
                    <div>
                      {formatDateTime({
                        date: refundData.processedAt,
                        format: 'MMM dd, yyyy',
                      })}
                    </div>
                  )}
                </div>
              </div>

              {refundData.reason && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Reason:</span> {refundData.reason}
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


