import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col antialiased">
      {/* Global Navigation Header */}
      <header className="w-full border-b border-zinc-200 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Project Identity & Main Tools */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-sans tracking-tight font-bold text-zinc-900 hover:opacity-80 transition-opacity">
              <span className="bg-zinc-900 text-white px-2 py-0.5 rounded text-xs font-mono">CM</span>
              Modding Tools
            </Link>

            {/* Navigation Workspace Links */}
            <nav className="flex items-center gap-4 text-sm font-medium text-zinc-600">
              <Link 
                to="/" 
                className="hover:text-zinc-900 transition-colors [&.active]:text-zinc-950 [&.active]:font-semibold"
              >
                Home
              </Link>
              <Link 
                to="/collision-box" 
                className="hover:text-zinc-900 transition-colors [&.active]:text-zinc-950 [&.active]:font-semibold"
              >
                Collision Box Builder
              </Link>
            </nav>
          </div>

          {/* About Link Positioned on the Right Side */}
          <div className="flex items-center text-sm font-medium text-zinc-600">
            <Link 
              to="/about" 
              className="hover:text-zinc-900 transition-colors [&.active]:text-zinc-950 [&.active]:font-semibold"
            >
              About
            </Link>
          </div>

        </div>
      </header>

      {/* Main Feature Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 flex flex-col">
        <Outlet /> 
      </main>

      {/* Basic Minimal Footer */}
      <footer className="w-full border-t border-zinc-200 bg-zinc-50 text-xs text-zinc-500 font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-center">
          <div>
            &copy; {new Date().getFullYear()} CM Modding Tools.
          </div>
        </div>
      </footer>

      {/* Devtools Utility */}
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  ),
})