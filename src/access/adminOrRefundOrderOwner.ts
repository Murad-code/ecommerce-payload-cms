import type { Access } from 'payload'

import { checkRole } from '@/access/utilities'

/**
 * Access control for refunds: Admin can access all, customers can access refunds for their own orders
 */
export const adminOrRefundOrderOwner: Access = async ({ req: { user } }) => {
  if (user && checkRole(['admin'], user)) {
    return true
  }

  if (user?.id) {
    return {
      order: {
        customer: {
          equals: user.id,
        },
      },
    }
  }

  return false
}


