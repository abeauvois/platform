import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from '@abeauvois/platform-ui'
import { Link, useRouter } from '@tanstack/react-router'
import { Loader2, LogIn, LogOut, Settings, ShieldAlert } from 'lucide-react'
import { useState } from 'react'

import { authClient, signOut } from '../lib/auth-client'
import { TradingDragIcon } from './icons/TradingDragIcon'

export default function Header() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut() // Clears bearer token and signs out
      router.navigate({ to: '/' })
    } catch (err) {
      toast.error('Failed to logout, try again.')
      console.error('Logout error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = () => {
    router.navigate({ to: '/signin' })
  }

  return (
    <header >
      <nav className="flex items-center justify-between py-2">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg hover:text-primary transition-colors"
            activeProps={{ className: 'font-bold text-primary' }}
          >
            <TradingDragIcon size={32} className="text-primary" />
            Trading
          </Link>

          {!session && (
            <Tooltip>
              <TooltipTrigger>
                <ShieldAlert className="size-5 text-yellow-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Must sign in to trade</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-1">
          {session ? (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={(props) => (
                    <Button
                      {...props}
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => router.navigate({ to: '/settings' })}
                    >
                      <Settings className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                />
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={(props) => (
                    <Button
                      {...props}
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={handleSignOut}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                      ) : (
                        <LogOut className="h-5 w-5 text-yellow-500" />
                      )}
                    </Button>
                  )}
                />
                <TooltipContent>
                  <p>Sign out</p>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <Button
                    {...props}
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={handleSignIn}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                    ) : (
                      <LogIn className="h-5 w-5 text-primary" />
                    )}
                  </Button>
                )}
              />
              <TooltipContent>
                <p>Sign in</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </nav>
    </header>
  )
}
