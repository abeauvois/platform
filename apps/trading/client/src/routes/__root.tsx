import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { TooltipProvider, Toaster } from '@platform/ui'

import Header from '../components/Header'

import TanStackQueryLayout from '../integrations/tanstack-query/layout.tsx'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        <Outlet />
        <TanStackRouterDevtools />
        <TanStackQueryLayout />
        <Toaster />
        <footer className="p-4 bg-muted text-muted-foreground text-center">
          <div>
            <p>Built with love for trading enthusiasts</p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  ),
})
