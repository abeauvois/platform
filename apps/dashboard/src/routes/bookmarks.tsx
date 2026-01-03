import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@platform/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { AlertTriangle, CircleX, X } from 'lucide-react'
import { useState } from 'react'

import { BookmarkForm } from '../components/BookmarkForm'
import { platformClient } from '../../platformClient'

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
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center">Add New Bookmark</CardTitle>
        </CardHeader>
        <CardContent>
          {createBookmarkError && (
            <div className="flex items-center justify-between gap-2 p-3 mb-4 rounded-md bg-destructive/10 text-destructive">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5" />
                <span>{createBookmarkError}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCreateBookmarkError(null)}
                aria-label="Dismiss error"
              >
                <X className="size-4" />
              </Button>
            </div>
          )}

          <BookmarkForm
            onSubmit={async (data) => {
              await createBookmark.mutateAsync(data)
            }}
          />
        </CardContent>
      </Card>

      {/* Bookmarks Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">
          Your Bookmarks {bookmarks && `(${bookmarks.length})`}
        </h2>

        {isError && (
          <div className="flex items-center gap-2 p-3 mb-6 rounded-md bg-destructive/10 text-destructive">
            <CircleX className="size-5" />
            <span>Error: {error.message}</span>
          </div>
        )}

        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {bookmarks?.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔖</div>
            <h3 className="text-xl font-semibold mb-2">No bookmarks yet</h3>
            <p className="text-muted-foreground">
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
                <Card
                  key={bookmark.url}
                  className="hover:ring-2 hover:ring-primary/20 transition-all duration-200"
                >
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg leading-tight break-words mb-2">
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary hover:underline transition-colors"
                      >
                        {new URL(bookmark.url).hostname}
                      </a>
                    </h3>
                    {bookmark.summary && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {bookmark.summary}
                      </p>
                    )}
                    {bookmark.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {bookmark.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                      <span>{bookmark.sourceAdapter}</span>
                      {created && <span>{created}</span>}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
