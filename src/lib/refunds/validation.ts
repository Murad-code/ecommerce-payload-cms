import type { Order, Transaction } from '@/payload-types'

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Get the refundable amount for an order
 * @param orderAmount - Total order amount
 * @param totalRefunded - Amount already refunded
 * @returns Refundable amount
 */
export function getRefundableAmount(
  orderAmount: number | null | undefined,
  totalRefunded: number | null | undefined,
): number {
  if (!orderAmount || orderAmount <= 0) {
    return 0
  }

  const refunded = totalRefunded || 0
  return Math.max(0, orderAmount - refunded)
}

/**
 * Validate that a refund amount is valid
 * @param orderAmount - Total order amount
 * @param totalRefunded - Amount already refunded
 * @param refundAmount - Amount to refund
 * @returns Validation result
 */
export function validateRefundAmount(
  orderAmount: number | null | undefined,
  totalRefunded: number | null | undefined,
  refundAmount: number,
): ValidationResult {
  if (!orderAmount || orderAmount <= 0) {
    return {
      valid: false,
      error: 'Order amount is invalid or zero',
    }
  }

  if (refundAmount <= 0) {
    return {
      valid: false,
      error: 'Refund amount must be greater than 0',
    }
  }

  const refundable = getRefundableAmount(orderAmount, totalRefunded)

  if (refundAmount > refundable) {
    return {
      valid: false,
      error: `Refund amount (${refundAmount}) exceeds refundable amount (${refundable})`,
    }
  }

  return { valid: true }
}

/**
 * Validate that an order can be refunded
 * @param order - Order object
 * @returns Validation result
 */
export function validateOrderCanBeRefunded(order: Order): ValidationResult {
  // Check order status
  if (order.status === 'cancelled') {
    return {
      valid: false,
      error: 'Cannot refund a cancelled order',
    }
  }

  if (order.status === 'refunded') {
    return {
      valid: false,
      error: 'Order has already been fully refunded',
    }
  }

  // Check if order has amount
  if (!order.amount || order.amount <= 0) {
    return {
      valid: false,
      error: 'Order has no amount to refund',
    }
  }

  // Check if order has transactions
  if (!order.transactions || order.transactions.length === 0) {
    return {
      valid: false,
      error: 'Order has no transactions to refund',
    }
  }

  return { valid: true }
}

/**
 * Validate that a transaction can be refunded
 * @param transaction - Transaction object
 * @returns Validation result
 */
export function validateTransactionCanBeRefunded(
  transaction: Transaction,
): ValidationResult {
  // Check transaction status
  if (transaction.status === 'refunded') {
    return {
      valid: false,
      error: 'Transaction has already been refunded',
    }
  }

  if (transaction.status !== 'succeeded') {
    return {
      valid: false,
      error: `Cannot refund transaction with status: ${transaction.status}`,
    }
  }

  // Check payment method
  if (transaction.paymentMethod !== 'stripe') {
    return {
      valid: false,
      error: 'Only Stripe payments can be refunded',
    }
  }

  // Check for payment intent ID
  if (!transaction.stripe?.paymentIntentID) {
    return {
      valid: false,
      error: 'Transaction does not have a payment intent ID',
    }
  }

  // Check transaction amount
  if (!transaction.amount || transaction.amount <= 0) {
    return {
      valid: false,
      error: 'Transaction has no amount to refund',
    }
  }

  return { valid: true }
}

/**
 * Get the primary transaction for an order (first succeeded transaction)
 * @param order - Order object
 * @returns Transaction or null
 */
export function getPrimaryTransaction(
  order: Order,
): Transaction | null {
  if (!order.transactions || order.transactions.length === 0) {
    return null
  }

  // Find first succeeded transaction
  for (const transaction of order.transactions) {
    const tx = typeof transaction === 'object' ? transaction : null
    if (tx && tx.status === 'succeeded') {
      return tx
    }
  }

  return null
}

