## Project overview
This repository is a Vite-powered React 19 + TypeScript single-page app with TanStack Router and Tailwind CSS v4. Start with [README.md](README.md) for the high-level architecture and workflow.

## Working conventions
- Use the package scripts in [package.json](package.json):
  - `npm run dev` for local development
  - `npm run build` for a production build
  - `npm run lint` for static checks
- Prefer TypeScript and keep props, state, and component boundaries explicit.
- Route work belongs under [src/routes](src/routes). New route files are picked up by TanStack Router automatically.
- Do not edit [src/routeTree.gen.ts](src/routeTree.gen.ts) manually; it is generated from the route tree.
- Keep UI styling in Tailwind utility classes. Shared primitives live in [src/components/ui](src/components/ui).
- When adding components specific to a feature, place them under that feature's folder in [src/feature](src/feature). component, hook, lib, and type files should be colocated within the feature folder.
- When adding complex logic, consider creating small components, hooks, or utility functions to keep the codebase organized and maintainable.
- Preserve SPA behavior for deployment by keeping [public/_redirects](public/_redirects) intact.

## Change guidance
- Prefer small, focused changes that match existing patterns in the current route or component.
- Before claiming completion, verify changes with `npm run build` and `npm run lint`.

# Rules
- When creating UI elements ensure that if the value is dynamic the size of the element does not change when the value changes. This is to prevent layout shifts and improve user experience.
