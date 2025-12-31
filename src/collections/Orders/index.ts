import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import type { CollectionConfig } from 'payload'
import { autoPopulateAdminNotes } from './hooks/autoPopulateAdminNotes'
import {
  autoPopulateCustomerEmail,
  populateCustomerEmailOnRead,
} from './hooks/autoPopulateCustomerEmail'
import { populateAdminNotes } from './hooks/populateAdminNotes'
import { sendOrderConfirmationEmail } from './hooks/sendOrderConfirmationEmail'
import { validateCustomerEmail } from './hooks/validateCustomerEmail'

export const OrdersCollection: CollectionConfig = {
  slug: 'orders',
  fields: [
    {
      name: 'adminNotes',
      type: 'array',
      label: 'Admin Notes',
      access: {
        read: adminOnlyFieldAccess,
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: {
        description: 'Internal notes for admin use only. Not visible to customers.',
      },
      fields: [
        {
          name: 'note',
          type: 'textarea',
          required: true,
          admin: {
            description: 'Note content',
          },
        },
        {
          name: 'addedBy',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          admin: {
            readOnly: true,
            hidden: true, // Auto-populated, hidden from UI
            description: 'Admin who added this note (auto-populated)',
          },
        },
        {
          name: 'addedAt',
          type: 'date',
          required: true,
          admin: {
            readOnly: true,
            hidden: true, // Auto-populated, hidden from UI
            date: {
              pickerAppearance: 'dayAndTime',
            },
            description: 'When this note was added (auto-populated)',
          },
        },
        {
          name: 'internal',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Internal notes are not visible to customers',
            readOnly: true,
            hidden: true, // Always true for admin notes, hidden from UI
          },
        },
      ],
    },
    {
      name: 'totalRefunded',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Total amount refunded for this order (stored in pence, displayed in GBP)',
        readOnly: true,
        components: {
          Field: '@/components/admin/TotalRefundedField#TotalRefundedField',
        },
      },
    },
    {
      name: 'refunds',
      type: 'relationship',
      relationTo: 'refunds',
      hasMany: true,
      admin: {
        description: 'All refunds associated with this order',
        readOnly: true,
      },
    },
    {
      name: 'refundActions',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '@/components/admin/OrderRefundActions#OrderRefundActions',
        },
        condition: (data) => {
          // Only show if order can be refunded
          return data?.status === 'completed' || data?.status === 'partially_refunded'
        },
      },
    },
  ],
  hooks: {
    beforeChange: [autoPopulateCustomerEmail, validateCustomerEmail, autoPopulateAdminNotes],
    afterRead: [populateCustomerEmailOnRead, populateAdminNotes],
    afterChange: [sendOrderConfirmationEmail],
  },
}
