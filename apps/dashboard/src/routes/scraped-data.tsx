import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@platform/ui'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Calendar, CircleX, ExternalLink, MapPin } from 'lucide-react'

import { platformClient } from '../../platformClient'

import type { ScrapedDataItem } from '@platform/sdk'
import { authClient } from '@/lib/auth-client'

/**
 * Local type for ScrapedListing to avoid adding browser-scraper as dependency
 */
interface ScrapedListing {
  title: string
  price: string
  location: string
  description: string
  externalCategory: string
  url: string
  imageUrl?: string
  postedAt?: string
}

export const Route = createFileRoute('/scraped-data')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const { data: session, isPending: isSessionPending } = authClient.useSession()

  const scrapedDataQuery = useQuery({
    queryKey: ['scraped-data'],
    queryFn: () => platformClient.scraper.list(),
    enabled: !!session,
  })

  const { data: scrapedItems, isError, error, isLoading } = scrapedDataQuery

  // Wait for session to load before redirecting
  if (isSessionPending) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl flex-grow">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!session) {
    router.navigate({ to: '/signin' })
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl flex-grow">
      <h1 className="text-3xl font-bold mb-6">
        Scraped Data {scrapedItems && `(${scrapedItems.length} sessions)`}
      </h1>

      {isError && (
        <div className="flex items-center gap-2 p-3 mb-6 rounded-md bg-destructive/10 text-destructive">
          <CircleX className="size-5" />
          <span>Error: {error.message}</span>
        </div>
      )}

      {isLoading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="border rounded-lg p-4">
                      <Skeleton className="h-32 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {scrapedItems?.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No scraped data yet</h3>
          <p className="text-muted-foreground">
            Use the CLI to scrape data and it will appear here.
          </p>
        </div>
      )}

      {scrapedItems && scrapedItems.length > 0 && (
        <div className="space-y-6">
          {scrapedItems.map((item: ScrapedDataItem) => (
            <ScrapedSessionCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function ScrapedSessionCard({ item }: { item: ScrapedDataItem }) {
  const scrapedAt = formatDate(item.scrapedAt)
  const listings = (item.data ?? []) as Array<ScrapedListing>
  const itemCount = item.itemCount ? parseInt(item.itemCount, 10) : listings.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">{item.source}</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{itemCount} items</Badge>
            {scrapedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {scrapedAt}
              </span>
            )}
          </div>
        </div>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 mt-1"
        >
          {item.sourceUrl}
          <ExternalLink className="size-3" />
        </a>
      </CardHeader>
      <CardContent>
        {Array.isArray(listings) && listings.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing, index) => (
              <ListingCard key={`${listing.url}-${index}`} listing={listing} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No listings in this session.</p>
        )}
      </CardContent>
    </Card>
  )
}

function ListingCard({ listing }: { listing: ScrapedListing }) {
  const postedAt = listing.postedAt ? formatDate(listing.postedAt) : null

  return (
    <div className="border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all duration-200">
      {listing.imageUrl && (
        <div className="aspect-video bg-muted">
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-sm leading-tight">{listing.title}</h4>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary shrink-0"
            title="View original listing"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>

        {listing.price && (
          <p className="text-lg font-bold text-primary mb-2">{listing.price}</p>
        )}

        {listing.location && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
            <MapPin className="size-3" />
            {listing.location}
          </p>
        )}

        {listing.externalCategory && (
          <Badge variant="outline" className="mb-2 text-xs">
            {listing.externalCategory}
          </Badge>
        )}

        {postedAt && (
          <p className="text-xs text-muted-foreground mb-2">Posted: {postedAt}</p>
        )}

        {listing.description && (
          <div
            className="mt-3 text-sm prose prose-sm max-w-none max-h-48 overflow-y-auto border-t pt-3"
            dangerouslySetInnerHTML={{ __html: listing.description }}
          />
        )}
      </div>
    </div>
  )
}

function formatDate(dateString: string): string | null {
  try {
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}
