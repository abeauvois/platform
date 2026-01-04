import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster, TooltipProvider } from '@platform/ui'

import Footer from '../components/Footer'
import Header from '../components/Header'

import TanStackQueryLayout from '../integrations/tanstack-query/layout.tsx'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <TooltipProvider>
      <div className="flex flex-col p-4 min-h-screen bg-muted">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <TanStackRouterDevtools />
        <TanStackQueryLayout />
        <Toaster />
      </div>
    </TooltipProvider>
  ),
})
