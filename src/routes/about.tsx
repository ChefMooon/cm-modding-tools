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
        This website provides simple utilities to help with Minecraft Java Edition mod development.
      </p>
      <p className="text-muted-foreground text-base leading-relaxed">
        Instead of calculating coordinates by hand or doing complex math for block setups, you can use these tools to generate clean code parameters visually right in your browser.
      </p>
    </div>
  )
}