'use client'

import type { PayloadAdminBarProps } from '@payloadcms/admin-bar'

import { PayloadAdminBar } from '@payloadcms/admin-bar'
import { useSelectedLayoutSegments } from 'next/navigation'
import React from 'react'

type CollectionKey = 'pages' | 'posts' | 'projects'

const collectionLabels: Record<CollectionKey, { plural: string; singular: string }> = {
  pages: {
    plural: 'Pages',
    singular: 'Page',
  },
  posts: {
    plural: 'Posts',
    singular: 'Post',
  },
  projects: {
    plural: 'Projects',
    singular: 'Project',
  },
}

const Title: React.FC = () => <span>Dashboard</span>

export const AdminBar: React.FC<{
  adminBarProps?: PayloadAdminBarProps
}> = (props) => {
  const { adminBarProps } = props || {}
  const segments = useSelectedLayoutSegments()
  const collectionKey = segments?.[1] as CollectionKey | undefined
  const collection: CollectionKey =
    collectionKey && collectionLabels[collectionKey] ? collectionKey : 'pages'

  return (
    <div className="relative left-0 right-0 z-30 py-2 bg-black text-white">
      <div className="container">
        <PayloadAdminBar
          {...adminBarProps}
          className="py-2 text-white"
          classNames={{
            controls: 'font-medium text-white',
            logo: 'text-white',
            user: 'text-white',
          }}
          cmsURL={process.env.NEXT_PUBLIC_SERVER_URL}
          collectionLabels={{
            plural: collectionLabels[collection].plural,
            singular: collectionLabels[collection].singular,
          }}
          logo={<Title />}
          style={{
            backgroundColor: 'transparent',
            padding: 0,
            position: 'relative',
            zIndex: 'unset',
          }}
        />
      </div>
    </div>
  )
}
