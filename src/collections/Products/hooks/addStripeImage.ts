import type { Media, Product } from '@/payload-types'
import type { CollectionBeforeValidateHook } from 'payload'

/**
 * Extract the first image from product gallery and add it to data for Stripe sync
 * Stripe expects an 'images' array with full URLs
 */
export const addStripeImage: CollectionBeforeValidateHook<Product> = async ({
  data,
  operation,
  req: { payload },
}) => {
  // Only process if we have data and a gallery
  if (!data || !data.gallery || data.gallery.length === 0) {
    if (payload.logger) {
      payload.logger.info(`🖼️ [STRIPE] No gallery images found, skipping image sync`)
    }
    return data
  }

  const firstGalleryItem = data.gallery[0]
  if (!firstGalleryItem || !firstGalleryItem.image) {
    if (payload.logger) {
      payload.logger.warn(`🖼️ [STRIPE] First gallery item has no image`)
    }
    return data
  }

  if (payload.logger) {
    payload.logger.info(
      `🖼️ [STRIPE] Processing gallery image: ${JSON.stringify({
        hasImage: !!firstGalleryItem.image,
        imageType: typeof firstGalleryItem.image,
      })}`,
    )
  }

  try {
    let imageUrl: string | undefined

    // If image is already a populated Media object
    if (typeof firstGalleryItem.image === 'object' && 'url' in firstGalleryItem.image) {
      const media = firstGalleryItem.image as Media
      if (media.url) {
        const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
        imageUrl = `${baseUrl}${media.url}`
        if (payload.logger) {
          payload.logger.info(`🖼️ [STRIPE] Found populated media object, URL: ${imageUrl}`)
        }
      } else {
        if (payload.logger) {
          payload.logger.warn(`🖼️ [STRIPE] Media object has no URL property`)
        }
      }
    }
    // If image is just an ID, fetch the media document
    else if (typeof firstGalleryItem.image === 'number') {
      try {
        const media = await payload.findByID({
          collection: 'media',
          id: firstGalleryItem.image,
        })
        if (media && typeof media === 'object' && 'url' in media && media.url) {
          const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
          imageUrl = `${baseUrl}${media.url}`
        }
      } catch (error) {
        payload.logger.warn(`Failed to fetch media for Stripe image sync: ${error}`)
      }
    }

    // Add images array to data for Stripe (Stripe expects an array of image URLs)
    if (imageUrl) {
      if (payload.logger) {
        payload.logger.info(`🖼️ [STRIPE] Adding image to sync: ${imageUrl}`)
      }
      // Return data with images array - this will be picked up by Stripe plugin
      // Note: We're adding 'images' as a temporary field that the Stripe plugin will read
      const updatedData = {
        ...data,
        images: [imageUrl], // Stripe expects images as an array
      } as any // Type assertion needed since 'images' isn't in Product type

      if (payload.logger) {
        payload.logger.info(
          `🖼️ [STRIPE] Data after adding images: ${JSON.stringify({ hasImages: !!updatedData.images, imageCount: updatedData.images?.length })}`,
        )
      }

      return updatedData
    } else {
      if (payload.logger) {
        payload.logger.warn(`🖼️ [STRIPE] Could not extract image URL from gallery`)
      }
    }
  } catch (error) {
    payload.logger.warn(`Error processing image for Stripe sync: ${error}`)
  }

  return data
}
