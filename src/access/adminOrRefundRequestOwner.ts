import type { Access } from 'payload'

import { checkRole } from '@/access/utilities'

/**
 * Access control for refund requests: Admin can access all, customers can access their own requests
 */
export const adminOrRefundRequestOwner: Access = async ({ req: { user } }) => {
  if (user && checkRole(['admin'], user)) {
    return true
  }

  if (user?.id) {
    return {
      customer: {
        equals: user.id,
      },
    }
  }

  return false
}


