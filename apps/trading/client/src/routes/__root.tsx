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
      <main className="flex justify-between min-h-screen flex-col px-4">
        <Header />
        <Outlet />
        <Footer />
      </main>
      <TanStackRouterDevtools />
      <TanStackQueryLayout />
      <Toaster />
    </TooltipProvider>
  ),
})
