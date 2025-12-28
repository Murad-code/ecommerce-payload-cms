import React from 'react'

import { CMSLink } from '@/components/Link'
import { RichText } from '@/components/RichText'
import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

export const CallToActionBlock: React.FC<
  CTABlockProps & {
    id?: string | number
    className?: string
  }
> = ({ links, richText }) => {
  return (
    <div className="w-full bg-secondary text-secondary-foreground">
      <div className="container">
        <div className="py-8 md:py-12 lg:py-16 px-4 md:px-8 flex flex-col gap-8 md:flex-row md:justify-between md:items-center">
          <div className="max-w-[48rem] flex items-center">
            {richText && (
              <RichText
                className="mb-0 font-tertiary text-white text-xl md:text-2xl lg:text-3xl font-bold leading-relaxed [&_p]:text-xl [&_p]:md:text-2xl [&_p]:lg:text-3xl [&_p]:font-bold [&_p]:leading-relaxed [&_h1]:text-2xl [&_h1]:md:text-3xl [&_h1]:lg:text-4xl [&_h1]:font-bold [&_h1]:leading-relaxed [&_h2]:text-xl [&_h2]:md:text-2xl [&_h2]:lg:text-3xl [&_h2]:font-bold [&_h2]:leading-relaxed [&_h3]:text-lg [&_h3]:md:text-xl [&_h3]:lg:text-2xl [&_h3]:font-bold [&_h3]:leading-relaxed"
                data={richText}
                enableGutter={false}
                enableProse={false}
              />
            )}
          </div>
          <div className="flex flex-col gap-4 md:gap-8">
            {(links || []).map(({ link }, i) => {
              return <CMSLink key={i} size="lg" {...link} />
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
