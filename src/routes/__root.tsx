import { createRootRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Lightbulb, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ToolboxDropdown } from '@/components/ui/toolbox-dropdown'

type ThemeMode = 'light' | 'dark' | 'system'

function RootComponent() {
  const location = useLocation()
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system'

    const savedTheme = window.localStorage.getItem('theme')
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      return savedTheme as ThemeMode
    }

    return 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateResolvedTheme = () => {
      if (theme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light')
      } else {
        setResolvedTheme(theme)
      }
    }

    updateResolvedTheme()

    const handleChange = () => updateResolvedTheme()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [theme])

  useEffect(() => {
    const effectiveTheme = theme === 'system' ? resolvedTheme : theme

    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark')
    document.documentElement.style.colorScheme = effectiveTheme
    window.localStorage.setItem('theme', theme)
  }, [resolvedTheme, theme])

  useEffect(() => {
    if (!isMobileMenuOpen) {
      document.body.style.overflow = ''
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const toggleTheme = () => {
    setTheme((current) => {
      if (current === 'light') return 'dark'
      if (current === 'dark') return 'system'
      return 'light'
    })
  }

  const getThemeIcon = () => {
    if (theme === 'light') return <Moon size={14} />
    if (theme === 'dark') return <Sun size={14} />
    return <Lightbulb size={14} />
  }

  const getThemeLabel = () => {
    if (theme === 'light') return 'Light'
    if (theme === 'dark') return 'Dark'
    return 'System'
  }

  const navLinkClassName = 'transition-colors hover:text-foreground [&.active]:font-semibold [&.active]:text-foreground'

  return (
    <div className="min-h-screen flex flex-col antialiased app-shell">
      <header className="w-full border-b app-surface-muted app-border">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
              <Link to="/" className="flex items-center gap-2 font-sans text-sm font-bold tracking-tight text-foreground transition-opacity hover:opacity-80 sm:text-base">
                <span className="rounded bg-foreground px-2 py-0.5 font-mono text-xs text-background">CM</span>
                Modding Tools
              </Link>

              <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground sm:gap-4">
                <Link to="/" className={navLinkClassName}>
                  Home
                </Link>
                <ToolboxDropdown />
              </nav>
            </div>

            <div className="flex items-center justify-between gap-4 text-sm font-medium text-muted-foreground sm:justify-end sm:gap-6">
              <Link to="/about" className={navLinkClassName}>
                About
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex min-w-[6.5rem] items-center justify-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted"
                aria-label="Toggle color theme"
              >
                {getThemeIcon()}
                <span className="hidden sm:inline">{getThemeLabel()}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:hidden">
            <Link to="/" className="flex items-center gap-2 font-sans text-sm font-bold tracking-tight text-foreground transition-opacity hover:opacity-80">
              <span className="rounded bg-foreground px-2 py-0.5 font-mono text-xs text-background">CM</span>
              Modding Tools
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation-menu"
            >
              <span className="sr-only">{isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}</span>
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span
                  className={`absolute h-0.5 w-4 rounded-full bg-current transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45' : '-translate-y-1.5'}`}
                />
                <span className={`h-0.5 w-4 rounded-full bg-current transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
                <span
                  className={`absolute h-0.5 w-4 rounded-full bg-current transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45' : 'translate-y-1.5'}`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className={`fixed inset-0 z-50 transition-opacity duration-300 sm:hidden ${isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={closeMobileMenu} />
        <div
          id="mobile-navigation-menu"
          className={`absolute right-0 top-0 flex h-full w-[85vw] max-w-[20rem] flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Navigation</p>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
              aria-label="Close navigation menu"
            >
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute h-0.5 w-4 rotate-45 rounded-full bg-current" />
                <span className="absolute h-0.5 w-4 -rotate-45 rounded-full bg-current" />
              </span>
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-4 py-4 text-base font-medium text-muted-foreground">
            <Link
              to="/"
              onClick={closeMobileMenu}
              className={`rounded-lg px-3 py-3 transition-colors hover:bg-muted hover:text-foreground ${location.pathname === '/' ? 'bg-muted text-foreground' : ''}`}
            >
              Home
            </Link>
            <Link
              to="/collision-box-builder"
              onClick={closeMobileMenu}
              className={`rounded-lg px-3 py-3 transition-colors hover:bg-muted hover:text-foreground ${location.pathname === '/collision-box-builder' ? 'bg-muted text-foreground' : ''}`}
            >
              Toolbox
            </Link>
            <Link
              to="/about"
              onClick={closeMobileMenu}
              className={`rounded-lg px-3 py-3 transition-colors hover:bg-muted hover:text-foreground ${location.pathname === '/about' ? 'bg-muted text-foreground' : ''}`}
            >
              About
            </Link>
          </nav>

          <div className="border-t border-border px-4 py-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <span className="flex items-center gap-2">
                {getThemeIcon()}
                {getThemeLabel()}
              </span>
              <span className="text-muted-foreground">Theme</span>
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto flex w-full flex-1 max-w-screen-2xl flex-col p-4 sm:p-6 sm:p-8 lg:p-8">
        <Outlet />
      </main>

      <footer className="w-full border-t app-surface-muted text-xs text-muted-foreground font-sans mt-auto">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-center">
          <div>&copy; {new Date().getFullYear()} CM Modding Tools.</div>
        </div>
      </footer>

      <TanStackRouterDevtools position="bottom-right" />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})