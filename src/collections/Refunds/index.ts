import { adminOnly } from '@/access/adminOnly'
import { adminOrRefundOrderOwner } from '@/access/adminOrRefundOrderOwner'
import type { CollectionConfig } from 'payload'
import { autoPopulateTransaction } from './hooks/autoPopulateTransaction'
import { updateOrderAfterRefund } from './hooks/updateOrderAfterRefund'
import { validateRefund } from './hooks/validateRefund'

export const Refunds: CollectionConfig = {
  slug: 'refunds',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'order', 'amount', 'type', 'status', 'createdAt'],
    group: 'Ecommerce',
    description:
      'Processed refunds - audit trail of all refund transactions. To create a refund, use the refund buttons on the order detail page.',
  },
  access: {
    read: adminOrRefundOrderOwner,
    // TODO: Create page not dev complete - disable direct creation for now
    // Admins should use the order page refund buttons (OrderRefundActions component) or API endpoint instead
    // This prevents confusion and ensures proper workflow with order verification
    // Re-enable when create page is fully developed with proper UX
    create: () => false, // Disabled - use order page refund actions or POST /api/refunds/process instead
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      admin: {
        description:
          '⚠️ Select the order to refund. The transaction will be automatically selected from this order to prevent errors.',
      },
    },
    {
      name: 'orderVerification',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/RefundOrderSelector#RefundOrderSelector',
        },
        condition: (data) => !!data?.order,
      },
    },
    {
      name: 'transaction',
      type: 'relationship',
      relationTo: 'transactions',
      required: true,
      admin: {
        description:
          '✅ Transaction is automatically selected from the order above. This prevents refunding the wrong customer.',
        readOnly: true,
        condition: (data) => !!data?.order,
      },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      admin: {
        description: 'Refund amount in smallest currency unit (e.g., pence for GBP)',
      },
    },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'GBP',
      options: [
        {
          label: 'British Pound',
          value: 'GBP',
        },
      ],
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Full Refund',
          value: 'full',
        },
        {
          label: 'Partial Refund',
          value: 'partial',
        },
      ],
      admin: {
        description: 'Whether this is a full or partial refund',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'processing',
      options: [
        {
          label: 'Processing',
          value: 'processing',
        },
        {
          label: 'Completed',
          value: 'completed',
        },
        {
          label: 'Failed',
          value: 'failed',
        },
      ],
      admin: {
        description: 'Current status of the refund',
      },
    },
    {
      name: 'stripeRefundId',
      type: 'text',
      admin: {
        description: 'Stripe refund ID returned from Stripe API',
        readOnly: true,
      },
    },
    {
      name: 'stripeChargeId',
      type: 'text',
      admin: {
        description: 'Original Stripe charge ID',
        readOnly: true,
      },
    },
    {
      name: 'paymentIntentId',
      type: 'text',
      required: true,
      admin: {
        description: 'Payment intent ID from the transaction',
        readOnly: true,
      },
    },
    {
      name: 'reason',
      type: 'textarea',
      admin: {
        description: 'Reason for the refund (optional)',
      },
    },
    {
      name: 'processedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Admin who processed this refund',
        readOnly: true,
      },
    },
    {
      name: 'processedAt',
      type: 'date',
      admin: {
        description: 'When the refund was processed',
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'items',
      type: 'array',
      admin: {
        description: 'Items being refunded (for partial refunds)',
        condition: (data) => data?.type === 'partial',
      },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'variant',
          type: 'relationship',
          relationTo: 'variants',
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          admin: {
            description: 'Refund amount for this item',
          },
        },
      ],
    },
    {
      name: 'refundRequest',
      type: 'relationship',
      relationTo: 'refund-requests',
      admin: {
        description:
          'The original refund request (if this refund was processed from a customer request)',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Auto-populate processedBy and processedAt on create
        if (operation === 'create' && req.user) {
          data.processedBy = req.user.id
          data.processedAt = new Date().toISOString()
        }
        return data
      },
      autoPopulateTransaction, // Auto-populate transaction from order
      validateRefund,
    ],
    afterChange: [updateOrderAfterRefund],
  },
}
