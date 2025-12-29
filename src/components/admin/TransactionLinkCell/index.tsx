'use client'

import Link from 'next/link'
import React from 'react'

type Props = {
  cellData: unknown
  field?: unknown
  rowData?: unknown
}

export const TransactionLinkCell: React.FC<Props> = ({ cellData }) => {
  // Handle array of transactions (hasMany relationship)
  if (Array.isArray(cellData)) {
    if (cellData.length === 0) {
      return <span>—</span>
    }

    return (
      <div className="flex flex-col gap-1">
        {cellData.map((transaction, index) => {
          const transactionId =
            typeof transaction === 'object' && transaction !== null && 'id' in transaction
              ? (transaction as { id: number }).id
              : transaction
          if (!transactionId) return null

          return (
            <Link key={index} href={`/admin/collections/transactions/${transactionId}`}>
              #{transactionId}
            </Link>
          )
        })}
      </div>
    )
  }

  // Handle single transaction
  if (cellData) {
    const transactionId =
      typeof cellData === 'object' && cellData !== null && 'id' in cellData
        ? (cellData as { id: number }).id
        : typeof cellData === 'number' || typeof cellData === 'string'
          ? cellData
          : null

    if (transactionId) {
      return <Link href={`/admin/collections/transactions/${transactionId}`}>#{transactionId}</Link>
    }
  }

  return <span>—</span>
}
