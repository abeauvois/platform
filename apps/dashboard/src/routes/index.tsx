import { Button } from '@platform/ui'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Calendar, CheckCircle2, Plus, User } from 'lucide-react'

import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { data: session } = authClient.useSession()

  return (
    <div className="flex-grow">
      {/* Hero Section */}
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center max-w-4xl px-4">
          <div>
            <div className="mb-8">
              <CheckCircle2 className="w-20 h-20 mx-auto text-primary mb-4" />
              <h1 className="text-6xl font-bold text-foreground mb-6">
                Bookmark<span className="text-primary">Master</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                Organize your life with our simple, elegant bookmarks app. Stay
                productive, track your progress, and accomplish your goals with
                ease.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {session ? (
                <Link to="/bookmarks">
                  <Button size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Go to My Bookmarks
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/signup">
                    <Button size="lg">
                      <User className="w-5 h-5 mr-2" />
                      Get Started
                    </Button>
                  </Link>
                  <Link to="/signin">
                    <Button variant="outline" size="lg">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 mt-16">
              <div className="text-center">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Simple Creation</h3>
                <p className="text-muted-foreground">
                  Add bookmarks instantly with our intuitive interface. No
                  complicated setup required.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-secondary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
                <p className="text-muted-foreground">
                  Mark tasks as complete and watch your productivity soar. Stay
                  motivated daily.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Stay Organized</h3>
                <p className="text-muted-foreground">
                  Keep your tasks organized and accessible from anywhere. Never
                  forget important tasks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
