# CM Modding Tools

CM Modding Tools is a lightweight collection of browser-based utilities for Minecraft Java Edition mod development. The current release focuses on helping creators build and review collision box shapes faster.

## What’s included

- Collision Box Builder for visually constructing and exporting collision box definitions
- A simple, fast single-page experience for use during modding workflows
- Routing and layout built with React, TypeScript, Vite, and TanStack Router

## Tech stack

- Vite
- React 19 + TypeScript
- TanStack Router
- Tailwind CSS v4
- shadcn/ui-style primitives

## Development

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Run lint checks:

```bash
npm run lint
```

## Project structure

- public/ — static assets and deployment files such as _redirects, robots.txt, and sitemap.xml
- src/routes/ — file-based routes for the app
- src/feature/collision-box-builder/ — the main tool implementation and supporting UI
- src/components/ui/ — shared UI primitives

## Deployment notes

The site is designed as a static single-page app. The existing redirect fallback in public/_redirects is intended for hosts that need SPA routing support such as Cloudflare Pages.

---