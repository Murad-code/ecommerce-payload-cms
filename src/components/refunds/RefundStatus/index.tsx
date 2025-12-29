'use client'

import type { RefundRequest } from '@/payload-types'
import { formatDateTime } from '@/utilities/formatDateTime'
import { cn } from '@/utilities/cn'

type Props = {
  refundRequest: RefundRequest
  className?: string
}

export const RefundStatus: React.FC<Props> = ({ refundRequest, className }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success text-success-foreground'
      case 'rejected':
        return 'bg-destructive text-destructive-foreground'
      case 'cancelled':
        return 'bg-muted text-muted-foreground'
      case 'pending':
      default:
        return 'bg-primary/10 text-primary'
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Your refund request is being reviewed. We will respond within 2-3 business days.'
      case 'approved':
        return 'Your refund request has been approved. The refund will be processed shortly.'
      case 'rejected':
        return refundRequest.rejectionReason
          ? `Your refund request was rejected: ${refundRequest.rejectionReason}`
          : 'Your refund request was rejected. Please contact support for more information.'
      case 'cancelled':
        return 'This refund request has been cancelled.'
      default:
        return ''
    }
  }

  return (
    <div className={cn('p-4 border rounded-lg', className)}>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-lg font-semibold">Refund Request Status</h3>
        <span
          className={cn(
            'text-xs px-2 py-1 rounded uppercase font-medium',
            getStatusColor(refundRequest.status),
          )}
        >
          {refundRequest.status}
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{getStatusMessage(refundRequest.status)}</p>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Request Date:</span>
          <span>{formatDateTime({ date: refundRequest.createdAt, format: 'MMM dd, yyyy' })}</span>
        </div>

        {refundRequest.approvedAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Approved:</span>
            <span>{formatDateTime({ date: refundRequest.approvedAt, format: 'MMM dd, yyyy' })}</span>
          </div>
        )}

        {refundRequest.rejectedAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rejected:</span>
            <span>{formatDateTime({ date: refundRequest.rejectedAt, format: 'MMM dd, yyyy' })}</span>
          </div>
        )}

        {refundRequest.refund && typeof refundRequest.refund === 'object' && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Refund Status:</span>
            <span className="font-medium">
              {refundRequest.refund.status === 'completed' ? 'Completed' : 'Processing'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

