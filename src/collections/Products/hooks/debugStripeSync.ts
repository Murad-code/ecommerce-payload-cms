import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'
import type { Product } from '@/payload-types'

/**
 * Debug hook to log when products are created/updated
 * This helps verify the Stripe plugin is working
 */
export const debugProductChange: CollectionAfterChangeHook<Product> = async ({
  doc,
  operation,
  req: { payload },
}) => {
  payload.logger.info(`🔍 [STRIPE DEBUG] Product ${operation}: ID=${doc.id}, Title="${doc.title}"`)
  payload.logger.info(`🔍 [STRIPE DEBUG] Product data: ${JSON.stringify({ id: doc.id, title: doc.title, priceInGBP: doc.priceInGBP, inventory: doc.inventory })}`)
  
  // Check if Stripe ID field exists (added by stripe plugin)
  // The plugin uses 'stripeID' (capital ID) as the field name
  const stripeId = (doc as any).stripeID || (doc as any).stripeId || (doc as any).stripeProductId
  if (stripeId) {
    payload.logger.info(`✅ [STRIPE DEBUG] Product has Stripe ID: ${stripeId}`)
  } else {
    payload.logger.warn(`⚠️ [STRIPE DEBUG] Product does NOT have a Stripe ID yet - plugin may not be syncing`)
  }
  
  return doc
}

/**
 * Debug hook to log before product changes
 */
export const debugProductBeforeChange: CollectionBeforeChangeHook<Product> = async ({
  data,
  operation,
  req: { payload },
}) => {
  payload.logger.info(`🔍 [STRIPE DEBUG] Before ${operation}: Title="${data?.title}", Operation=${operation}`)
  return data
}

