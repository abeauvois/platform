import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@platform/ui'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

export interface TradingCardProps {
  title: string
  icon: ReactNode
  iconColor?: string
  isLoading?: boolean
  error?: Error | null
  onRefresh?: () => void
  scrollable?: boolean
  headerActions?: ReactNode
  children: ReactNode
}

export function TradingCard({
  title,
  icon,
  iconColor = 'text-primary',
  isLoading = false,
  error = null,
  onRefresh,
  scrollable = false,
  headerActions,
  children,
}: Readonly<TradingCardProps>) {
  const cardClassName = scrollable
    ? 'flex flex-col flex-1 min-h-0 overflow-hidden'
    : 'flex-shrink-0'

  const contentClassName = scrollable
    ? 'pt-0 flex-1 overflow-y-auto'
    : 'pt-0'

  return (
    <Card className={cardClassName}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={iconColor}>{icon}</span>
          {title}
        </CardTitle>
        <div className="flex items-center gap-1">
          {headerActions}
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="text-xs">
              {error.message}
            </AlertDescription>
          </Alert>
        )}
        {!error && children}
      </CardContent>
    </Card>
  )
}

export function TradingCardLoader({ color = 'text-primary' }: { color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-2">
      <Loader2 className={`h-6 w-6 animate-spin ${color}`} />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  )
}
