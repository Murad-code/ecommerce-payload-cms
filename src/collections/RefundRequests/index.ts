import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/access/adminOnly'
import { adminOrRefundRequestOwner } from '@/access/adminOrRefundRequestOwner'
import { validateRefundRequest } from './hooks/validateRefundRequest'

export const RefundRequests: CollectionConfig = {
  slug: 'refund-requests',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'order', 'customer', 'type', 'amount', 'status', 'createdAt'],
    group: 'Ecommerce',
    description: 'Customer refund requests awaiting admin review',
  },
  access: {
    read: adminOrRefundRequestOwner,
    create: adminOrRefundRequestOwner, // Customers can create for their own orders
    update: adminOnly, // Only admins can approve/reject
    delete: adminOnly,
  },
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      admin: {
        description: 'The order for which refund is requested',
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Customer who requested the refund',
        readOnly: true,
      },
    },
    {
      name: 'customerEmail',
      type: 'email',
      admin: {
        description: 'Customer email (for guest orders)',
        readOnly: true,
      },
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
        description: 'Type of refund requested',
      },
    },
    {
      name: 'amount',
      type: 'number',
      admin: {
        description: 'Requested refund amount in smallest currency unit (for partial refunds)',
        condition: (data) => data?.type === 'partial',
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
      admin: {
        description: 'Currency of the refund request',
        readOnly: true,
      },
    },
    {
      name: 'reason',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Customer reason for requesting refund',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        {
          label: 'Pending',
          value: 'pending',
        },
        {
          label: 'Approved',
          value: 'approved',
        },
        {
          label: 'Rejected',
          value: 'rejected',
        },
        {
          label: 'Cancelled',
          value: 'cancelled',
        },
      ],
      admin: {
        description: 'Current status of the refund request',
      },
    },
    {
      name: 'items',
      type: 'array',
      admin: {
        description: 'Items to refund (for partial refund requests)',
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
      name: 'rejectionReason',
      type: 'textarea',
      admin: {
        description: 'Admin reason for rejecting the request',
        condition: (data) => data?.status === 'rejected',
      },
    },
    {
      name: 'rejectedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Admin who rejected this request',
        readOnly: true,
        condition: (data) => data?.status === 'rejected',
      },
    },
    {
      name: 'rejectedAt',
      type: 'date',
      admin: {
        description: 'When the request was rejected',
        readOnly: true,
        condition: (data) => data?.status === 'rejected',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'approvedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Admin who approved this request',
        readOnly: true,
        condition: (data) => data?.status === 'approved',
      },
    },
    {
      name: 'approvedAt',
      type: 'date',
      admin: {
        description: 'When the request was approved',
        readOnly: true,
        condition: (data) => data?.status === 'approved',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'refund',
      type: 'relationship',
      relationTo: 'refunds',
      admin: {
        description: 'The processed refund (if this request was approved and processed)',
        readOnly: true,
      },
    },
    {
      name: 'actions',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '@/components/admin/RefundRequestActions#RefundRequestActions',
        },
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Auto-populate customer and customerEmail on create
        if (operation === 'create') {
          if (req.user) {
            data.customer = req.user.id
            // Get customer email from user or order
            if (!data.customerEmail && req.user.email) {
              data.customerEmail = req.user.email
            }
          }
        }

        // Auto-populate rejection fields when status changes to rejected
        if (data.status === 'rejected' && req.user) {
          if (!data.rejectedBy) {
            data.rejectedBy = req.user.id
          }
          if (!data.rejectedAt) {
            data.rejectedAt = new Date().toISOString()
          }
        }

        // Auto-populate approval fields when status changes to approved
        if (data.status === 'approved' && req.user) {
          if (!data.approvedBy) {
            data.approvedBy = req.user.id
          }
          if (!data.approvedAt) {
            data.approvedAt = new Date().toISOString()
          }
        }

        return data
      },
      validateRefundRequest,
    ],
  },
}

