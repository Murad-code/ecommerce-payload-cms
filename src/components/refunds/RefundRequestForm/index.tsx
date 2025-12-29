'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { FormItem } from '@/components/forms/FormItem'
import { FormError } from '@/components/forms/FormError'
import { Message } from '@/components/Message'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { Order, Product, Variant } from '@/payload-types'
import { Price } from '@/components/Price'

type Props = {
  order: Order
  userEmail?: string
}

type FormData = {
  type: 'full' | 'partial'
  reason: string
  amount?: number
  items?: Array<{
    product: number
    variant?: number
    quantity: number
    amount: number
  }>
}

export const RefundRequestForm: React.FC<Props> = ({ order, userEmail }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Map<string, { quantity: number; amount: number }>>(new Map())

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      type: 'full',
      reason: '',
    },
  })

  const watchedType = watch('type')

  const orderAmount = order.amount || 0
  const totalRefunded = order.totalRefunded || 0
  const refundableAmount = orderAmount - totalRefunded

  // Check if order can be refunded
  const canRefund =
    (order.status === 'completed' || order.status === 'partially_refunded') &&
    refundableAmount > 0

  if (!canRefund) {
    return null
  }

  const handleItemToggle = (itemId: string, product: Product | number, variant?: Variant | number | null) => {
    if (watchedType === 'full') return

    const productId = typeof product === 'object' ? product.id : product
    const variantId = variant && typeof variant === 'object' ? variant.id : variant

    const key = `${productId}-${variantId || 'no-variant'}`

    setSelectedItems((prev) => {
      const newMap = new Map(prev)
      if (newMap.has(key)) {
        newMap.delete(key)
      } else {
        // Calculate amount for this item
        const orderItem = order.items?.find((i) => {
          const itemProductId = typeof i.product === 'object' ? i.product.id : i.product
          const itemVariantId = i.variant && typeof i.variant === 'object' ? i.variant.id : i.variant
          return itemProductId === productId && itemVariantId === variantId
        })

        if (orderItem) {
          const itemAmount = (orderItem.total || 0) / (orderItem.quantity || 1)
          newMap.set(key, {
            quantity: orderItem.quantity || 1,
            amount: itemAmount,
          })
        }
      }
      return newMap
    })
  }

  const onSubmit = async (data: FormData) => {
    setError(null)
    setLoading(true)

    try {
      const requestData: any = {
        orderId: order.id,
        type: data.type,
        reason: data.reason,
      }

      if (data.type === 'partial') {
        if (selectedItems.size === 0) {
          setError('Please select at least one item to refund')
          setLoading(false)
          return
        }

        // Calculate total amount from selected items
        let totalAmount = 0
        const items: Array<{
          product: number
          variant?: number
          quantity: number
          amount: number
        }> = []

        selectedItems.forEach((value, key) => {
          const [productId, variantIdStr] = key.split('-')
          const variantId = variantIdStr === 'no-variant' ? undefined : parseInt(variantIdStr)

          const orderItem = order.items?.find((i) => {
            const itemProductId = typeof i.product === 'object' ? i.product.id : i.product
            const itemVariantId = i.variant && typeof i.variant === 'object' ? i.variant.id : i.variant
            return itemProductId === parseInt(productId) && itemVariantId === variantId
          })

          if (orderItem) {
            const productIdNum = typeof orderItem.product === 'object' ? orderItem.product.id : orderItem.product
            items.push({
              product: productIdNum,
              variant: variantId,
              quantity: value.quantity,
              amount: value.amount,
            })
            totalAmount += value.amount * value.quantity
          }
        })

        requestData.amount = totalAmount
        requestData.items = items
      }

      if (userEmail) {
        requestData.email = userEmail
      }

      const response = await fetch('/api/refund-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create refund request')
      }

      const result = await response.json()
      alert('Refund request submitted successfully! We will review it and get back to you soon.')
      setOpen(false)
      reset()
      setSelectedItems(new Map())
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
        <Button variant="outline">Request Refund</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>
            Submit a refund request for Order #{order.id}. Our team will review it and respond within 2-3 business days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && <Message error={error} />}

          <div className="space-y-2">
            <Label>Refund Type *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="full"
                  {...register('type', { required: true })}
                  defaultChecked
                />
                <span>Full Refund</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="partial"
                  {...register('type', { required: true })}
                />
                <span>Partial Refund</span>
              </label>
            </div>
            {errors.type && <FormError message="Please select a refund type" />}
          </div>

          {watchedType === 'partial' && order.items && (
            <div className="space-y-2">
              <Label>Select Items to Refund *</Label>
              <div className="border rounded p-4 space-y-3 max-h-60 overflow-y-auto">
                {order.items.map((item) => {
                  if (typeof item.product !== 'object') return null

                  const productId = item.product.id
                  const variantId = item.variant && typeof item.variant === 'object' ? item.variant.id : item.variant
                  const key = `${productId}-${variantId || 'no-variant'}`

                  const isSelected = selectedItems.has(key)
                  const itemAmount = (item.total || 0) / (item.quantity || 1)

                  return (
                    <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleItemToggle(key, item.product, item.variant)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{item.product.title}</div>
                        {item.variant && typeof item.variant === 'object' && (
                          <div className="text-sm text-muted-foreground">
                            {item.variant.title || 'Variant'}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} • <Price amount={itemAmount} /> each
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
              {selectedItems.size === 0 && (
                <p className="text-sm text-muted-foreground">Please select at least one item</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Refund *</Label>
            <Textarea
              id="reason"
              rows={4}
              {...register('reason', { required: 'Please provide a reason for the refund request' })}
              placeholder="Please explain why you are requesting a refund..."
            />
            {errors.reason && <FormError message={errors.reason.message} />}
          </div>

          <div className="p-4 bg-muted rounded">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Order Total:</span>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (watchedType === 'partial' && selectedItems.size === 0)}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

