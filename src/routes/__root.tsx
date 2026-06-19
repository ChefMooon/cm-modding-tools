import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="p-4 border-b flex gap-4 bg-muted/40">
        <Link to="/" className="[&.active]:font-bold hover:underline">Home</Link>
        <Link to="/collision-box" className="[&.active]:font-bold hover:underline">Collision Box Builder</Link>
        <Link to="/about" className="[&.active]:font-bold hover:underline">About</Link>
      </nav>
      <main className="flex-1 p-6 container mx-auto">
        <Outlet /> 
      </main>
      <TanStackRouterDevtools />
    </div>
  ),
})