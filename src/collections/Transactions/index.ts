import type { CollectionConfig } from 'payload'
import {
  autoPopulateCustomerEmail,
  populateCustomerEmailOnRead,
} from './hooks/autoPopulateCustomerEmail'
import { validateCustomerEmail } from './hooks/validateCustomerEmail'

export const TransactionsCollection: CollectionConfig = {
  slug: 'transactions',
  fields: [],
  hooks: {
    beforeChange: [autoPopulateCustomerEmail, validateCustomerEmail],
    afterRead: [populateCustomerEmailOnRead],
  },
}
