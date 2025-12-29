import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { stripePlugin } from '@payloadcms/plugin-stripe'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { Plugin } from 'payload'

import { stripeAdapter } from '@payloadcms/plugin-ecommerce/payments/stripe'

import { adminOnly } from '@/access/adminOnly'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { adminOrCustomerOwnerOrGuest } from '@/access/adminOrCustomerOwnerOrGuest'
import { adminOrPublishedStatus } from '@/access/adminOrPublishedStatus'
import { customerOnlyFieldAccess } from '@/access/customerOnlyFieldAccess'
import { OrdersCollection } from '@/collections/Orders'
import { sendOrderConfirmationEmail } from '@/collections/Orders/hooks/sendOrderConfirmationEmail'
import { ProductsCollection } from '@/collections/Products'
import { TransactionsCollection } from '@/collections/Transactions'
import { Page, Product } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'

const generateTitle: GenerateTitle<Product | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Payload Ecommerce Template` : 'Payload Ecommerce Template'
}

const generateURL: GenerateURL<Product | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

export const plugins: Plugin[] = [
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formSubmissionOverrides: {
      admin: {
        group: 'Content',
      },
    },
    formOverrides: {
      admin: {
        group: 'Content',
      },
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
  }),
  ecommercePlugin({
    access: {
      adminOnly,
      adminOnlyFieldAccess,
      adminOrCustomerOwner: adminOrCustomerOwnerOrGuest,
      adminOrPublishedStatus,
      customerOnlyFieldAccess,
    },
    currencies: {
      defaultCurrency: 'GBP',
      supportedCurrencies: [
        {
          code: 'GBP',
          symbol: '£',
          decimals: 2,
          label: 'British Pound',
        },
      ],
    },
    customers: {
      slug: 'users',
    },
    payments: {
      paymentMethods: [
        stripeAdapter({
          secretKey: process.env.STRIPE_SECRET_KEY!,
          publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
          webhookSecret: process.env.STRIPE_WEBHOOKS_SIGNING_SECRET!,
        }),
      ],
    },
    products: {
      productsCollectionOverride: ProductsCollection,
    },
    orders: {
      ordersCollectionOverride: ({ defaultCollection }) => {
        // Merge fields and hooks from OrdersCollection with the default collection
        const existingHooks = defaultCollection.hooks || {}
        const existingAfterChange = Array.isArray(existingHooks.afterChange)
          ? existingHooks.afterChange
          : existingHooks.afterChange
            ? [existingHooks.afterChange]
            : []

        const ordersCollectionHooks = OrdersCollection.hooks || {}
        const ordersCollectionAfterChange = Array.isArray(ordersCollectionHooks.afterChange)
          ? ordersCollectionHooks.afterChange
          : ordersCollectionHooks.afterChange
            ? [ordersCollectionHooks.afterChange]
            : []

        return {
          ...defaultCollection,
          fields: [...(defaultCollection.fields || []), ...(OrdersCollection.fields || [])],
          hooks: {
            ...existingHooks,
            ...ordersCollectionHooks,
            beforeChange: [
              ...(Array.isArray(existingHooks.beforeChange)
                ? existingHooks.beforeChange
                : existingHooks.beforeChange
                  ? [existingHooks.beforeChange]
                  : []),
              ...(Array.isArray(ordersCollectionHooks.beforeChange)
                ? ordersCollectionHooks.beforeChange
                : ordersCollectionHooks.beforeChange
                  ? [ordersCollectionHooks.beforeChange]
                  : []),
            ],
            afterRead: [
              ...(Array.isArray(existingHooks.afterRead)
                ? existingHooks.afterRead
                : existingHooks.afterRead
                  ? [existingHooks.afterRead]
                  : []),
              ...(Array.isArray(ordersCollectionHooks.afterRead)
                ? ordersCollectionHooks.afterRead
                : ordersCollectionHooks.afterRead
                  ? [ordersCollectionHooks.afterRead]
                  : []),
            ],
            afterChange: [
              ...existingAfterChange,
              ...ordersCollectionAfterChange,
              sendOrderConfirmationEmail,
            ],
          },
        }
      },
    },
    transactions: {
      transactionsCollectionOverride: ({ defaultCollection }) => {
        // Merge hooks from TransactionsCollection with the default collection
        const existingHooks = defaultCollection.hooks || {}

        const transactionsCollectionHooks = TransactionsCollection.hooks || {}

        return {
          ...defaultCollection,
          hooks: {
            ...existingHooks,
            ...transactionsCollectionHooks,
            beforeChange: [
              ...(Array.isArray(existingHooks.beforeChange)
                ? existingHooks.beforeChange
                : existingHooks.beforeChange
                  ? [existingHooks.beforeChange]
                  : []),
              ...(Array.isArray(transactionsCollectionHooks.beforeChange)
                ? transactionsCollectionHooks.beforeChange
                : transactionsCollectionHooks.beforeChange
                  ? [transactionsCollectionHooks.beforeChange]
                  : []),
            ],
            afterRead: [
              ...(Array.isArray(existingHooks.afterRead)
                ? existingHooks.afterRead
                : existingHooks.afterRead
                  ? [existingHooks.afterRead]
                  : []),
              ...(Array.isArray(transactionsCollectionHooks.afterRead)
                ? transactionsCollectionHooks.afterRead
                : transactionsCollectionHooks.afterRead
                  ? [transactionsCollectionHooks.afterRead]
                  : []),
            ],
          },
        }
      },
    },
  }),
  // Stripe plugin must come AFTER ecommerce plugin so it can attach hooks to the overridden products collection
  stripePlugin({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripeWebhooksEndpointSecret: process.env.STRIPE_WEBHOOKS_SIGNING_SECRET,
    logs: true, // Enable detailed logging to debug image sync
    sync: [
      {
        collection: 'products',
        stripeResourceType: 'products',
        stripeResourceTypeSingular: 'product',
        fields: [
          {
            fieldPath: 'title',
            stripeProperty: 'name',
          },
          {
            fieldPath: 'images',
            stripeProperty: 'images',
          },
          // Note: The plugin automatically handles Stripe ID storage in 'stripeID' field
          // Prices in Stripe are separate Price resources linked to Products
          // The 'images' field is populated by the addStripeImage hook from the first gallery image
        ],
      },
    ],
  }),
]
