import { adminOnly } from '@/access/adminOnly'
import { adminOrRefundOrderOwner } from '@/access/adminOrRefundOrderOwner'
import type { CollectionConfig } from 'payload'
import { autoPopulateRefundFields } from './hooks/autoPopulateRefundFields'
import { processStripeRefund } from './hooks/processStripeRefund'
import { updateOrderAfterRefund } from './hooks/updateOrderAfterRefund'
import { validateRefund } from './hooks/validateRefund'

export const Refunds: CollectionConfig = {
  slug: 'refunds',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'order', 'amount', 'type', 'createdAt'],
    group: 'Ecommerce',
    description: 'Processed refunds - audit trail of all refund transactions',
  },
  access: {
    read: adminOrRefundOrderOwner,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      label: 'Order ID',
      admin: {
        description:
          '🔍 Search by Order ID (type "123" to find Order #123). Once an order is selected, the transaction, amount, currency, and payment intent will be automatically populated.',
        isSortable: true,
        components: {
          afterInput: ['@/components/admin/AutoPopulateTransaction#AutoPopulateTransaction'],
          Cell: '@/components/admin/OrderLinkCell#OrderLinkCell',
        },
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
      name: 'amount',
      type: 'number',
      required: true,
      admin: {
        description:
          'Refund amount in GBP pounds (e.g., 10.50 for £10.50). For full refunds, this is automatically calculated and read-only.',
        condition: (data) => !!data?.order && !!data?.type,
        components: {
          Field: '@/components/admin/ConditionalAmountField#ConditionalAmountField',
        },
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
      name: 'technicalDetails',
      type: 'group',
      label: 'Technical Details',
      admin: {
        description: 'Technical information (automatically populated). Click to expand.',
      },
      fields: [
        {
          name: 'transaction',
          type: 'relationship',
          relationTo: 'transactions',
          required: true,
          label: 'Transaction ID',
          admin: {
            description:
              '✅ Transaction is automatically selected from the order above. This prevents refunding the wrong customer.',
            readOnly: true,
            components: {
              Cell: '@/components/admin/TransactionLinkCell#TransactionLinkCell',
            },
          },
        },
        {
          name: 'paymentIntentId',
          type: 'text',
          required: true,
          admin: {
            description:
              'Payment Intent ID from the transaction. This is created when the customer initiates payment. The actual charge (stripeChargeId) is created when payment is captured.',
            readOnly: true,
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
            description:
              'Original Stripe charge ID (the charge that was refunded). This is different from Payment Intent ID - a Payment Intent can have multiple charges, but a refund is always tied to a specific charge.',
            readOnly: true,
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
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Auto-populate processedBy and processedAt on create
        if (operation === 'create' && req.user) {
          // Initialize technicalDetails if it doesn't exist
          if (!data.technicalDetails) {
            data.technicalDetails = {} as any
          }
          data.technicalDetails.processedBy = req.user.id
          data.technicalDetails.processedAt = new Date().toISOString()
        }
        return data
      },
      autoPopulateRefundFields, // Auto-populate transaction, amount, currency, and paymentIntentId from order
      validateRefund, // Validate refund before processing
      processStripeRefund, // Process refund via Stripe API BEFORE saving (if Stripe fails, refund record won't be created)
    ],
    afterChange: [
      updateOrderAfterRefund, // Update order status and refunds relationship
    ],
  },
}
