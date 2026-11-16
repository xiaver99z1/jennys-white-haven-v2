import { createFileRoute } from '@tanstack/react-router'
import { extractObjectKey, getR2Object, isR2ManagedObjectKey } from '#/lib/r2'

export const Route = createFileRoute('/api/media/$')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url)
        const queryKey = url.searchParams.get('key')
        const rawPath = queryKey || (params._splat ?? '')
        const objectKey = extractObjectKey(rawPath)

        // Security: Never serve private booking receipts through the public media endpoint
        if (
          !objectKey ||
          objectKey.startsWith('private/') ||
          objectKey.includes('..') ||
          !isR2ManagedObjectKey(objectKey)
        ) {
          return new Response('Forbidden', { status: 403 })
        }

        try {
          const r2Obj = await getR2Object({
            objectKey,
            isPrivate: false,
          })

          if (!r2Obj) {
            return new Response('Not Found', { status: 404 })
          }

          const safeContentType = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/avif',
            'image/gif',
          ].includes(r2Obj.contentType.toLowerCase())
            ? r2Obj.contentType
            : 'image/jpeg'

          return new Response(Buffer.from(r2Obj.body), {
            status: 200,
            headers: {
              'Content-Type': safeContentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch (err) {
          console.error('Failed to stream R2 media:', err)
          return new Response('Not Found', { status: 404 })
        }
      },
    },
  },
})
