'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { Price } from '@/components/Price'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type Props = {
  orderId: number
  orderAmount: number
  totalRefunded: number
  refundableAmount: number
  type: 'full' | 'partial'
}

export const ProcessRefundButton: React.FC<Props> = ({
  orderId,
  orderAmount,
  totalRefunded,
  refundableAmount,
  type,
}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState(type === 'full' ? refundableAmount : '')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleProcessRefund = async () => {
    setError(null)

    const refundAmount = type === 'full' ? refundableAmount : parseFloat(amount as string)

    if (type === 'partial' && (!amount || refundAmount <= 0)) {
      setError('Please enter a valid refund amount')
      return
    }

    if (type === 'partial' && refundAmount > refundableAmount) {
      setError(`Refund amount cannot exceed ${refundableAmount}`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/refunds/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          type,
          amount: refundAmount,
          reason: reason.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process refund')
      }

      const data = await response.json()
      alert(`Refund processed successfully! Stripe Refund ID: ${data.stripeRefund?.id}`)
      setOpen(false)
      setAmount('')
      setReason('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={type === 'full' ? 'default' : 'outline'}>
          {type === 'full' ? 'Refund Order' : 'Partial Refund'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {type === 'full' ? 'Process Full Refund' : 'Process Partial Refund'}
          </DialogTitle>
          <DialogDescription>
            {type === 'full'
              ? `This will refund the full amount of ${refundableAmount} to the customer.`
              : `Enter the amount to refund (max: ${refundableAmount}).`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Order Information</Label>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Order Amount:</span>
                <Price amount={orderAmount} />
              </div>
              <div className="flex justify-between">
                <span>Already Refunded:</span>
                <Price amount={totalRefunded} />
              </div>
              <div className="flex justify-between font-medium">
                <span>Refundable Amount:</span>
                <Price amount={refundableAmount} />
              </div>
            </div>
          </div>

          {type === 'partial' && (
            <div className="space-y-2">
              <Label htmlFor="amount">Refund Amount *</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                max={refundableAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter refund amount"
              />
              <p className="text-xs text-muted-foreground">
                Maximum refundable: <Price amount={refundableAmount} />
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Enter reason for refund..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleProcessRefund} disabled={loading}>
            {loading ? 'Processing...' : `Process ${type === 'full' ? 'Full' : 'Partial'} Refund`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

