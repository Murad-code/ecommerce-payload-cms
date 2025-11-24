'use client'

import type { Media as MediaType, Product } from '@/payload-types'

import { GridTileImage } from '@/components/Grid/tile'
import { Media } from '@/components/Media'
import { useSearchParams } from 'next/navigation'
import React, { useEffect } from 'react'

import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { DefaultDocumentIDType } from 'payload'

type Props = {
  gallery: NonNullable<Product['gallery']>
}

export const Gallery: React.FC<Props> = ({ gallery }) => {
  const searchParams = useSearchParams()
  const [current, setCurrent] = React.useState(0)
  const [api, setApi] = React.useState<CarouselApi>()

  useEffect(() => {
    if (!api) {
      return
    }
  }, [api])

  useEffect(() => {
    const values = searchParams.values().toArray()

    if (values && api) {
      const index = gallery.findIndex((item) => {
        if (!item.variantOption) return false

        let variantID: DefaultDocumentIDType

        if (typeof item.variantOption === 'object') {
          variantID = item.variantOption.id
        } else variantID = item.variantOption

        return Boolean(values.find((value) => value === String(variantID)))
      })
      if (index !== -1) {
        setCurrent(index)
        api.scrollTo(index, true)
      }
    }
  }, [searchParams, api, gallery])

  // Filter out items with null/undefined images and find valid current image
  const validGalleryItems = gallery.filter((item) => item.image && typeof item.image === 'object')

  // Find a valid current image index
  let currentImage: MediaType | null = null
  if (gallery[current]?.image && typeof gallery[current].image === 'object') {
    currentImage = gallery[current].image as MediaType
  } else if (validGalleryItems.length > 0 && validGalleryItems[0]?.image) {
    currentImage = validGalleryItems[0].image as MediaType
  }

  if (validGalleryItems.length === 0 || !currentImage) {
    return null
  }

  return (
    <div>
      <div className="relative w-full overflow-hidden mb-8">
        <Media resource={currentImage} className="w-full" imgClassName="w-full rounded-lg" />
      </div>

      <Carousel setApi={setApi} className="w-full" opts={{ align: 'start', loop: false }}>
        <CarouselContent>
          {validGalleryItems.map((item, i) => {
            if (!item.image || typeof item.image !== 'object') return null

            const imageId = 'id' in item.image ? item.image.id : i

            return (
              <CarouselItem
                className="basis-1/5"
                key={`${imageId}-${i}`}
                onClick={() => {
                  const originalIndex = gallery.findIndex((galleryItem) => galleryItem === item)
                  if (originalIndex !== -1) {
                    setCurrent(originalIndex)
                  }
                }}
              >
                <GridTileImage
                  active={
                    gallery[current]?.image && typeof gallery[current].image === 'object'
                      ? gallery[current].image === item.image
                      : i === 0
                  }
                  media={item.image as MediaType}
                />
              </CarouselItem>
            )
          })}
        </CarouselContent>
      </Carousel>
    </div>
  )
}
