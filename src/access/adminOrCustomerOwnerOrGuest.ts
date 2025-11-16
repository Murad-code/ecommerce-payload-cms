import type { Access } from 'payload'

import { checkRole } from '@/access/utilities'

/**
 * Access control that allows:
 * - Admins: Full access
 * - Customers: Access to their own records
 * - Guests: Can read/update/create carts and transactions/orders (needed for checkout)
 *   The ecommerce plugin handles additional security for transactions/orders
 */
export const adminOrCustomerOwnerOrGuest: Access = ({ req: { user } }) => {
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

  // Allow guests to access carts and create transactions/orders for checkout
  // The ecommerce plugin will handle additional security restrictions
  return true
}
