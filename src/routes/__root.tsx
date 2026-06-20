import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

function RootComponent() {
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
    return <Monitor size={14} />
  }

  const getThemeLabel = () => {
    if (theme === 'light') return 'Light'
    if (theme === 'dark') return 'Dark'
    return 'System'
  }

  return (
    <div className="min-h-screen flex flex-col antialiased app-shell">
      <header className="w-full border-b app-surface-muted app-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-sans tracking-tight font-bold text-foreground hover:opacity-80 transition-opacity">
              <span className="bg-foreground text-background px-2 py-0.5 rounded text-xs font-mono">CM</span>
              Modding Tools
            </Link>

            <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <Link to="/" className="transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:font-semibold">
                Home
              </Link>
              <Link to="/collision-box" className="transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:font-semibold">
                Collision Box Builder
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Link to="/about" className="transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:font-semibold">
              About
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex min-w-[7.25rem] items-center justify-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted"
              aria-label="Toggle color theme"
            >
              {getThemeIcon()}
              <span className="hidden sm:inline">{getThemeLabel()}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 flex flex-col">
        <Outlet />
      </main>

      <footer className="w-full border-t app-surface-muted text-xs text-muted-foreground font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-center">
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