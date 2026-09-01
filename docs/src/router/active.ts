/**
 * The route being rendered right now.
 *
 * The shell — header, sidebar, prev/next — outlives every navigation, so its
 * `aria-current` markers and its prev/next targets are state-dependent values
 * that read from here rather than props handed down once at construction time.
 * Setting it and calling `update()` is what makes the chrome follow the page.
 *
 * The prerenderer sets it before each `renderToString()` for the same reason:
 * rendering is synchronous, so one slot is enough for a whole build.
 *
 * Deliberately typed as `Route | undefined` with a throwing accessor. Seeding
 * it with the home route instead would create a real import cycle
 * (routes → pages → components → here → routes), and the failure mode would be
 * a silently wrong nav highlight rather than a loud one.
 */
import type { Route } from './routes.ts'

let active: Route | undefined

export function setActiveRoute(route: Route): void {
  active = route
}

export function activeRoute(): Route {
  if (!active) throw new Error('No active route: call setActiveRoute() before rendering.')
  return active
}
