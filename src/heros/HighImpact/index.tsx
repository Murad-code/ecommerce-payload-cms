'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import React, { useEffect } from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'

export const HighImpactHero: React.FC<Page['hero']> = ({ links, media, richText }) => {
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme('dark')
  })

  return (
    <div className="relative -mt-20 md:-mt-[10.4rem] flex items-end justify-center min-h-[60vh] md:min-h-[80vh]">
      <div className="absolute inset-0 select-none">
        {media && typeof media === 'object' && (
          <Media fill imgClassName="object-cover" priority resource={media} />
        )}
      </div>
      <div className="container mb-6 md:mb-12 z-10 relative flex items-center justify-center px-4 md:px-0">
        <div className="max-w-4xl w-full bg-primary text-primary-foreground px-4 md:px-8 lg:px-12 py-4 md:py-6 lg:py-8">
          {richText && (
            <RichText
              className="mb-4 md:mb-6 font-tertiary text-sm md:text-xl lg:text-2xl font-medium [&_p]:text-sm [&_p]:md:text-xl [&_p]:lg:text-2xl [&_p]:font-medium [&_h1]:text-lg [&_h1]:md:text-2xl [&_h1]:lg:text-3xl [&_h1]:font-medium [&_h2]:text-base [&_h2]:md:text-xl [&_h2]:lg:text-2xl [&_h2]:font-medium [&_h3]:text-sm [&_h3]:md:text-lg [&_h3]:lg:text-xl [&_h3]:font-medium"
              data={richText}
              enableGutter={false}
              enableProse={false}
            />
          )}
          {Array.isArray(links) && links.length > 0 && (
            <ul className="flex flex-wrap md:flex-nowrap md:justify-center gap-3 md:gap-4">
              {links.map(({ link }, i) => {
                return (
                  <li key={i} className="flex-1 md:flex-none min-w-0">
                    <CMSLink {...link} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
