import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <div className="space-y-12 py-6 max-w-4xl">
      {/* Hero Section */}
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-zinc-900">
          ChefMooon's Modding Tools
        </h1>
        <p className="text-zinc-500 text-lg max-w-2xl leading-relaxed">
          A collection of web-based tools designed for Minecraft Java Edition mod development. Less manual math, more building.
        </p>
      </div>

      <hr className="border-zinc-200" />

      {/* Available Tools Grid */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Available Utilities</h2>
          <p className="text-zinc-500 text-sm">Select a tool below to get started.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Tool Card 1 */}
          <Card className="bg-zinc-50 border-zinc-200 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Collision Box Builder</CardTitle>
              <CardDescription>
                Visually construct and define custom block collision boxes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-500 font-mono mb-4">Outputs: VoxelShape code snippets</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/collision-box">Open Tool</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}