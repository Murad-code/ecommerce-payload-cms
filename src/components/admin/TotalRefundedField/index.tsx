'use client'

import { useField } from '@payloadcms/ui'
import React from 'react'

type Props = {
  path: string
  field: {
    label?: string
    admin?: {
      description?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
}

/**
 * Custom field component for totalRefunded that displays the value in GBP format
 * The value is stored in pence but displayed as pounds with currency symbol
 */
export const TotalRefundedField: React.FC<Props> = ({ path, field }) => {
  const { value: totalRefundedValue } = useField({ path })

  // Convert pence to pounds for display
  const amountInPence = typeof totalRefundedValue === 'number' ? totalRefundedValue : 0
  const amountInPounds = amountInPence / 100

  // Format as currency
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInPounds)

  return (
    <div className="field-type number">
      <div className="field-label">
        <label htmlFor={path}>{field.label || 'Total Refunded'}</label>
      </div>
      {field.admin?.description && (
        <div className="field-description">{field.admin.description as string}</div>
      )}
      <div className="field-component">
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--theme-elevation-100)',
            border: '1px solid var(--theme-elevation-200)',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--theme-elevation-600)',
            opacity: 0.6,
          }}
        >
          {formattedAmount}
        </div>
        {/* Hidden input to maintain field value for form submission */}
        <input type="hidden" name={path} value={amountInPence} />
      </div>
    </div>
  )
}
