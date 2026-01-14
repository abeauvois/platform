import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@platform/ui'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'

import { authClient } from '@/lib/auth-client'
import { useAccountMode } from '../hooks/useAccountMode'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const { accountMode, setAccountMode, isLoading } = useAccountMode(!!session)

  // Redirect if not authenticated
  if (!session) {
    router.navigate({ to: '/signin' })
    return null
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.navigate({ to: '/' })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trading Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Default Account Mode</Label>
              <p className="text-sm text-muted-foreground">
                Choose whether orders are placed on spot or margin by default
              </p>
            </div>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Select
                value={accountMode}
                onValueChange={(value) => setAccountMode(value as 'spot' | 'margin')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spot">Spot</SelectItem>
                  <SelectItem value="margin">Margin</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
