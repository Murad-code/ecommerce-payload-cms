'use client'

import { useField } from '@payloadcms/ui'
import React, { useEffect, useRef } from 'react'

type Props = {
  path: string
  field: {
    label?: string
    required?: boolean
    admin?: {
      description?: string
      readOnly?: boolean
      [key: string]: unknown
    }
    [key: string]: unknown
  }
}

/**
 * Amount field that becomes read-only for full refunds
 * Handles conversion between pounds (UI) and pence (storage)
 * Uses Payload's default number field with conditional readOnly
 */
export const ConditionalAmountField: React.FC<Props> = ({ path, field }) => {
  const { value: typeValue } = useField({ path: 'type' })
  const { value: orderValue } = useField({ path: 'order' })
  const { value: amountValue, setValue: setAmountValue } = useField({
    path: 'amount',
  })
  const hasConvertedRef = useRef(false) // Track if we've already converted the value

  // Calculate and set amount when type or order changes
  // Amount is stored in pence, but displayed in pounds
  useEffect(() => {
    if (orderValue && typeValue) {
      const orderId =
        typeof orderValue === 'object' && orderValue !== null && 'id' in orderValue
          ? (orderValue as { id: number }).id
          : orderValue
      if (orderId) {
        fetch(`/api/orders/${orderId}?depth=0`, {
          credentials: 'include',
        })
          .then((res) => res.json())
          .then((data) => {
            const order = data.docs?.[0] || data
            if (order.amount !== undefined && order.amount !== null) {
              const totalRefunded = order.totalRefunded || 0
              const refundableAmountPence = order.amount - totalRefunded
              // Convert from pence to pounds for display
              const refundableAmountPounds = refundableAmountPence / 100

              if (typeValue === 'full') {
                // For full refund, always set to refundable amount (in pounds for UI)
                // The hook will convert it back to pence when saving
                setAmountValue(refundableAmountPounds)
              }
              // For partial refund, don't auto-populate - let user enter amount in pounds
            }
          })
          .catch((error) => {
            console.error('Failed to fetch order for amount:', error)
          })
      }
    }
  }, [typeValue, orderValue, setAmountValue])

  // Convert amount from pence to pounds for display when form loads with existing value
  // This handles the case where the form is opened after save (amount is in pence)
  useEffect(() => {
    // Only convert once, when we first detect a pence value
    if (
      !hasConvertedRef.current &&
      amountValue !== null &&
      amountValue !== undefined &&
      typeof amountValue === 'number'
    ) {
      // If amount is >= 1000, it's likely in pence, convert to pounds
      // This happens when viewing an existing refund that was saved with amount in pence
      // Check if it looks like pence (>= 1000 and is a whole number when divided by 100)
      if (amountValue >= 1000) {
        const amountInPounds = amountValue / 100
        // Only convert if it's clearly pence (whole number of pounds)
        // and the converted value is different (avoid infinite loops)
        if (Number.isInteger(amountInPounds) && Math.abs(amountInPounds - amountValue) > 0.01) {
          setAmountValue(amountInPounds)
          hasConvertedRef.current = true // Mark as converted
        }
      }
    }
  }, [amountValue, setAmountValue]) // Run when amountValue changes

  const isReadOnly = typeValue === 'full' && orderValue
  const description =
    typeValue === 'full' && orderValue
      ? 'Full refund amount (automatically calculated from order total in GBP pounds)'
      : 'Refund amount in GBP pounds (e.g., 10.50 for £10.50)'

  // Access the default Payload number field component
  // In Payload 3.x, the default field component is available through field.components.Field
  // or we can use the field's internal structure
  const fieldAny = field as Record<string, unknown>
  const DefaultField =
    (fieldAny?.Field as React.ComponentType<{ path: string; field: typeof field }>) ||
    ((fieldAny?.components as Record<string, unknown>)?.Field as React.ComponentType<{
      path: string
      field: typeof field
    }>)

  // If we have the default field component, use it with modified props
  if (DefaultField && typeof DefaultField === 'function') {
    return (
      <DefaultField
        path={path}
        field={{
          ...field,
          admin: {
            ...(field.admin || {}),
            readOnly: isReadOnly as boolean,
            description: description as string,
          },
        }}
      />
    )
  }

  // If DefaultField is not available, we need to render the field ourselves
  // but we should try to match Payload's field structure
  // This should rarely happen, but provides a fallback
  return (
    <div className="field-type number">
      <div className="field-label">
        <label htmlFor={path}>
          {field.label || 'Amount'}
          {field.required && <span className="required">*</span>}
        </label>
      </div>
      {description && <div className="field-description">{description}</div>}
      <input
        id={path}
        name={path}
        type="number"
        step="0.01"
        value={
          amountValue !== null && amountValue !== undefined
            ? typeof amountValue === 'number'
              ? amountValue >= 1000
                ? amountValue / 100
                : amountValue
              : ''
            : ''
        }
        onChange={(e) => {
          const val = e.target.value === '' ? null : Number(e.target.value)
          setAmountValue(val)
        }}
        disabled={isReadOnly as boolean}
        readOnly={isReadOnly as boolean}
        required={Boolean(field.required) as boolean}
        className="field-type number"
      />
    </div>
  )
}
