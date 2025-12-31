'use client'

import { useEffect } from 'react'
import { useField } from '@payloadcms/ui'

type Props = {
  path: string
  field: any
}

/**
 * Auto-populates all fields from order and transaction when order is selected
 * This includes: transaction, currency, paymentIntentId, and amount
 */
export const AutoPopulateTransaction: React.FC<Props> = ({ path, field }) => {
  const { value: orderValue } = useField({ path: 'order' })
  const { value: typeValue } = useField({ path: 'type' })
  const { value: transactionValue, setValue: setTransactionValue } = useField({
    path: 'technicalDetails.transaction',
  })
  const { setValue: setCurrencyValue } = useField({ path: 'currency' })
  const { value: amountValue, setValue: setAmountValue } = useField({ path: 'amount' })
  const { setValue: setPaymentIntentValue } = useField({ path: 'technicalDetails.paymentIntentId' })

  useEffect(() => {
    // Only populate if order is set
    if (orderValue) {
      const orderId = typeof orderValue === 'object' ? orderValue.id : orderValue

      if (orderId) {
        // Fetch order with full depth to get transaction details
        fetch(`/api/orders/${orderId}?depth=2`, {
          credentials: 'include',
        })
          .then((res) => res.json())
          .then((data) => {
            const order = data.docs?.[0] || data

            // Auto-populate transaction
            if (!transactionValue) {
              const transactions = order.transactions || []
              const primaryTransaction = transactions.find(
                (tx) => typeof tx === 'object' && tx.status === 'succeeded',
              )

              if (primaryTransaction && typeof primaryTransaction === 'object') {
                setTransactionValue(primaryTransaction.id)

                // Auto-populate paymentIntentId from transaction
                if (primaryTransaction.stripe?.paymentIntentID) {
                  setPaymentIntentValue(primaryTransaction.stripe.paymentIntentID)
                }
              }
            }

            // Auto-populate currency from order
            if (order.currency) {
              setCurrencyValue(order.currency)
            }

            // Auto-populate amount based on refund type
            if (order.amount !== undefined && order.amount !== null) {
              const totalRefunded = order.totalRefunded || 0
              const refundableAmount = order.amount - totalRefunded

              if (typeValue === 'full') {
                // For full refund, always set to refundable amount
                setAmountValue(refundableAmount)
              } else if (typeValue === 'partial' && !amountValue) {
                // For partial refund, only set if not already set (let user specify)
                // Don't auto-populate for partial
              }
            }
          })
          .catch((error) => {
            console.error('Failed to fetch order:', error)
          })
      }
    }
  }, [
    orderValue,
    typeValue,
    transactionValue,
    amountValue,
    setTransactionValue,
    setCurrencyValue,
    setAmountValue,
    setPaymentIntentValue,
  ])

  // Also update amount when type changes to full
  useEffect(() => {
    if (typeValue === 'full' && orderValue) {
      const orderId = typeof orderValue === 'object' ? orderValue.id : orderValue
      if (orderId) {
        fetch(`/api/orders/${orderId}?depth=0`, {
          credentials: 'include',
        })
          .then((res) => res.json())
          .then((data) => {
            const order = data.docs?.[0] || data
            if (order.amount !== undefined && order.amount !== null) {
              const totalRefunded = order.totalRefunded || 0
              const refundableAmount = order.amount - totalRefunded
              setAmountValue(refundableAmount)
            }
          })
          .catch((error) => {
            console.error('Failed to fetch order for amount:', error)
          })
      }
    }
  }, [typeValue, orderValue, setAmountValue])

  // This component doesn't render anything - it just handles side effects
  return null
}
