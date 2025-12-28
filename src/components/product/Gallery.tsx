'use client'

import type { Media as MediaType, Product } from '@/payload-types'

import { GridTileImage } from '@/components/Grid/tile'
import { Media } from '@/components/Media'
import { useSearchParams } from 'next/navigation'
import React, { useEffect } from 'react'

import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { DefaultDocumentIDType } from 'payload'

type Props = {
  gallery: NonNullable<Product['gallery']>
}

export const Gallery: React.FC<Props> = ({ gallery }) => {
  const searchParams = useSearchParams()
  const [current, setCurrent] = React.useState(0)
  const [mainApi, setMainApi] = React.useState<CarouselApi>()
  const [thumbApi, setThumbApi] = React.useState<CarouselApi>()

  // Sync main carousel with thumbnail carousel
  useEffect(() => {
    if (!mainApi || !thumbApi) return

    const onSelect = () => {
      const selectedIndex = mainApi.selectedScrollSnap()
      setCurrent(selectedIndex)
      thumbApi.scrollTo(selectedIndex)
    }

    mainApi.on('select', onSelect)
    return () => {
      mainApi.off('select', onSelect)
    }
  }, [mainApi, thumbApi])

  // Handle variant selection from URL params
  useEffect(() => {
    const values = searchParams.values().toArray()

    if (values && mainApi) {
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
        mainApi.scrollTo(index, true)
      }
    }
  }, [searchParams, mainApi, gallery])

  // Filter out items with null/undefined images
  const validGalleryItems = gallery.filter((item) => item.image && typeof item.image === 'object')

  if (validGalleryItems.length === 0) {
    return null
  }

  const handleThumbnailClick = (index: number) => {
    setCurrent(index)
    mainApi?.scrollTo(index, true)
  }

  return (
    <div className="w-full">
      {/* Main Image Carousel - Swipeable on mobile */}
      <div className="relative w-full mb-4 md:mb-8">
        <Carousel
          setApi={setMainApi}
          className="w-full"
          opts={{
            align: 'start',
            loop: false,
            containScroll: 'trimSnaps',
            slidesToScroll: 1,
          }}
        >
          <CarouselContent>
            {validGalleryItems.map((item, i) => {
              if (!item.image || typeof item.image !== 'object') return null

              const imageId = 'id' in item.image ? item.image.id : i

              return (
                <CarouselItem key={`main-${imageId}-${i}`} className="basis-full">
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                    <Media
                      resource={item.image as MediaType}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                </CarouselItem>
              )
            })}
          </CarouselContent>
          {validGalleryItems.length > 1 && (
            <>
              <CarouselPrevious className="left-2 md:left-4" />
              <CarouselNext className="right-2 md:right-4" />
            </>
          )}
        </Carousel>
      </div>

      {/* Thumbnail Carousel - Hidden on mobile, shown on desktop */}
      {validGalleryItems.length > 1 && (
        <Carousel
          setApi={setThumbApi}
          className="w-full hidden md:block"
          opts={{ align: 'start', loop: false, containScroll: 'trimSnaps', slidesToScroll: 1 }}
        >
          <CarouselContent>
            {validGalleryItems.map((item, i) => {
              if (!item.image || typeof item.image !== 'object') return null

              const imageId = 'id' in item.image ? item.image.id : i
              const isActive = current === i

              return (
                <CarouselItem
                  className="basis-1/5 cursor-pointer"
                  key={`thumb-${imageId}-${i}`}
                  onClick={() => handleThumbnailClick(i)}
                >
                  <GridTileImage
                    active={isActive}
                    media={item.image as MediaType}
                    isInteractive={true}
                  />
                </CarouselItem>
              )
            })}
          </CarouselContent>
        </Carousel>
      )}
    </div>
  )
}
