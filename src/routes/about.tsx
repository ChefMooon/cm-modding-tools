import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutComponent,
})

function AboutComponent() {
  return (
    <div className="max-w-xl space-y-4 py-4">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        About CM Modding Tools
      </h1>
      <p className="text-muted-foreground text-base leading-relaxed">
        CM Modding Tools is a growing collection of browser-based utilities for Minecraft Java Edition mod development.
      </p>
      <p className="text-muted-foreground text-base leading-relaxed">
        These tools were created for practical use and are shared freely with the community. Enjoy exploring them in your workflow.
      </p>
    </div>
  )
}