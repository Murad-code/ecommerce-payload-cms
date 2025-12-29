'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

type Props = {
  field?: any
  path?: string
  value?: any
  onChange?: (value: any) => void
  // Direct props (when used as standalone component)
  refundRequestId?: number
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
  orderId?: number
}

export const RefundRequestActions: React.FC<Props> = (props) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract data from props (either from field context or direct props)
  // In Payload 3.x, UI field components receive document via useDocument hook or field context
  const doc = props.field?.fieldSchema?.doc || props.field?.doc || props.value
  const refundRequestId = props.refundRequestId || doc?.id
  const status = props.status || doc?.status
  const orderId = props.orderId || (typeof doc?.order === 'object' ? doc?.order?.id : doc?.order)

  // Don't render if we don't have the required data
  if (!refundRequestId || !status || !orderId) {
    return null
  }

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this refund request?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/refund-requests/${refundRequestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to approve refund request')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    if (!confirm('Are you sure you want to reject this refund request?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/refund-requests/${refundRequestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reject refund request')
      }

      router.refresh()
      setShowRejectForm(false)
      setRejectionReason('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleProcessRefund = async () => {
    if (!confirm('Process this refund via Stripe? This will charge the customer back.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/refunds/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          refundRequestId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process refund')
      }

      const data = await response.json()
      alert(`Refund processed successfully! Stripe Refund ID: ${data.stripeRefund?.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'approved') {
    return (
      <div className="p-4 border border-border rounded bg-muted">
        <h3 className="mt-0 mb-4">Refund Request Approved</h3>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded text-destructive text-sm">
            {error}
          </div>
        )}
        <Button onClick={handleProcessRefund} disabled={loading}>
          {loading ? 'Processing...' : 'Process Refund'}
        </Button>
      </div>
    )
  }

  if (status === 'rejected' || status === 'cancelled') {
    return (
      <div className="p-4 border border-border rounded bg-muted">
        <p className="text-muted-foreground">
          This refund request has been {status}.
        </p>
      </div>
    )
  }

  if (status !== 'pending') {
    return null
  }

  return (
    <div className="p-4 border border-border rounded">
      <h3 className="mt-0 mb-4">Refund Request Actions</h3>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button onClick={handleApprove} disabled={loading} variant="default">
            {loading ? 'Processing...' : 'Approve Request'}
          </Button>
          <Button
            onClick={() => setShowRejectForm(!showRejectForm)}
            disabled={loading}
            variant="outline"
          >
            Reject Request
          </Button>
        </div>

        {showRejectForm && (
          <div className="p-4 bg-muted rounded">
            <Label className="block mb-2 font-medium">Rejection Reason</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="Enter reason for rejecting this refund request..."
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button onClick={handleReject} disabled={loading || !rejectionReason.trim()}>
                {loading ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
              <Button
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectionReason('')
                }}
                variant="outline"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

