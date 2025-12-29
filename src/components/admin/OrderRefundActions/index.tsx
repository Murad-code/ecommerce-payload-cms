'use client'

import { useState, useEffect } from 'react'
import { ProcessRefundButton } from '@/components/admin/ProcessRefundButton'
import type { Order } from '@/payload-types'

type Props = {
  field?: any
  path?: string
  value?: any
  onChange?: (value: any) => void
}

export const OrderRefundActions: React.FC<Props> = (props) => {
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    // Get order data from field context
    // In Payload 3.x, UI field components receive document via field context
    const doc = props.field?.fieldSchema?.doc || props.field?.doc || props.value
    if (doc) {
      setOrder(doc as Order)
    }
  }, [props.field, props.value])

  if (!order) {
    return null
  }

  const orderAmount = order.amount || 0
  const totalRefunded = order.totalRefunded || 0
  const refundableAmount = orderAmount - totalRefunded

  // Don't show if order is already fully refunded or can't be refunded
  if (refundableAmount <= 0 || order.status === 'refunded' || order.status === 'cancelled') {
    return null
  }

  return (
    <div className="p-4 border border-border rounded">
      <h3 className="mt-0 mb-4">Refund Actions</h3>
      <div className="flex flex-col gap-2">
        <ProcessRefundButton
          orderId={order.id}
          orderAmount={orderAmount}
          totalRefunded={totalRefunded}
          refundableAmount={refundableAmount}
          type="full"
        />
        {refundableAmount > 0 && (
          <ProcessRefundButton
            orderId={order.id}
            orderAmount={orderAmount}
            totalRefunded={totalRefunded}
            refundableAmount={refundableAmount}
            type="partial"
          />
        )}
      </div>
    </div>
  )
}

