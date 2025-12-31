'use client'

import Link from 'next/link'
import React from 'react'

type Props = {
  cellData: unknown
  field?: unknown
  rowData?: unknown
}

export const OrderLinkCell: React.FC<Props> = ({ cellData }) => {
  // Handle single order relationship
  if (cellData) {
    const orderId =
      typeof cellData === 'object' && cellData !== null && 'id' in cellData
        ? (cellData as { id: number }).id
        : typeof cellData === 'number' || typeof cellData === 'string'
          ? cellData
          : null

    if (orderId) {
      return (
        <Link
          href={`/admin/collections/orders/${orderId}`}
          className="text-primary hover:underline"
        >
          #{orderId}
        </Link>
      )
    }
  }

  return <span>—</span>
}

