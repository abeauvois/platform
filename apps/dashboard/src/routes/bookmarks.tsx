import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CircleX } from 'lucide-react'
import { platformClient } from '../../platformClient'
import { BookmarkForm } from '../components/BookmarkForm'
import type { SourceAdapter } from '@platform/platform-domain/browser'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/bookmarks')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [createBookmarkError, setCreateBookmarkError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const createBookmark = useMutation({
    mutationFn: async (data: {
      url: string
      sourceAdapter: SourceAdapter
      tags: Array<string>
      summary: string
    }) => {
      return platformClient.bookmarks.create({
        url: data.url,
        sourceAdapter: data.sourceAdapter,
        tags: data.tags,
        summary: data.summary,
      })
    },
    onSuccess: () => {
      setCreateBookmarkError(null)
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    },
    onError: (err) => {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Failed to create bookmark. Please try again.'
      setCreateBookmarkError(message)
    },
  })

  const bookmarksQuery = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => platformClient.bookmarks.fetchAll(),
  })

  const {
    data: bookmarks,
    isError,
    error,
    isLoading,
  } = bookmarksQuery

  if (!session) {
    router.navigate({ to: '/signin' })
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl flex-grow">
      {/* Create Bookmark Form */}
      <div className="bg-base-300 shadow-lg rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Add New Bookmark</h2>

        {createBookmarkError && (
          <div role="alert" className="alert alert-error mb-4">
            <AlertTriangle className="size-5" />
            <span>{createBookmarkError}</span>
            <button
              className="btn btn-sm btn-ghost btn-circle"
              onClick={() => setCreateBookmarkError(null)}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        <BookmarkForm
          onSubmit={async (data) => {
            await createBookmark.mutateAsync(data)
          }}
        />
      </div>

      {/* Bookmarks Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">
          Your Bookmarks {bookmarks && `(${bookmarks.length})`}
        </h2>

        {isError && (
          <div role="alert" className="alert alert-error mb-6">
            <CircleX />
            <span>Error: {error.message}</span>
          </div>
        )}

        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card bg-base-100 shadow-md">
                <div className="card-body">
                  <div className="skeleton h-4 flex-1 mb-2"></div>
                  <div className="skeleton h-3 w-full mb-2"></div>
                  <div className="skeleton h-3 w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {bookmarks?.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔖</div>
            <h3 className="text-xl font-semibold mb-2">No bookmarks yet</h3>
            <p className="text-base-content/70">
              Create your first bookmark above to get started!
            </p>
          </div>
        )}

        {bookmarks && bookmarks.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bookmarks.map((bookmark) => {
              const created = (() => {
                if (!bookmark.createdAt) return null
                try {
                  const d = new Date(bookmark.createdAt)
                  if (Number.isNaN(d.getTime())) return null
                  return d.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                } catch {
                  return null
                }
              })()

              return (
                <div
                  key={bookmark.url}
                  className="card bg-base-300 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <div className="card-body">
                    <h3 className="card-title text-lg leading-tight break-words">
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-hover"
                      >
                        {new URL(bookmark.url).hostname}
                      </a>
                    </h3>
                    {bookmark.summary && (
                      <p className="text-sm text-base-content/80 mt-2">
                        {bookmark.summary}
                      </p>
                    )}
                    {bookmark.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {bookmark.tags.map((tag) => (
                          <span key={tag} className="badge badge-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-base-content/60">
                        {bookmark.sourceAdapter}
                      </span>
                      {created && (
                        <span className="text-xs text-base-content/60">
                          {created}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
