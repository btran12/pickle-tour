/* PickleBracket service worker — app shell caching.
 *
 * Bump VERSION whenever the caching strategy or shell changes; old caches are
 * removed on activation. Tournament data lives in localStorage / the API and
 * is never cached here (API calls are cross-origin and skipped).
 */
const VERSION = 'v3'
const BUILD_ID = '__BUILD_ID__' // injected at build time
const CACHE = `pickle-bracket-${VERSION}-${BUILD_ID}`
const SCOPE = new URL('./', self.location.href)

/* Hashed JS/CSS emitted by the build, injected by vite.config.ts. */
const BUILD_ASSETS = /* __PRECACHE_BUILD_ASSETS__ */[]

const APP_SHELL = [
  './',
  'manifest.webmanifest',
  'favicon.svg',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  ...BUILD_ASSETS,
]

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    await Promise.allSettled(
      APP_SHELL.map(url => cache.add(new Request(url, { cache: 'reload' }))),
    )
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter(key => key.startsWith('pickle-bracket-') && key !== CACHE)
        .map(key => caches.delete(key)),
    )
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return
  // Only handle same-origin requests inside this app's scope.
  if (url.origin !== self.location.origin) return
  if (!url.pathname.startsWith(SCOPE.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
  } else {
    event.respondWith(staleWhileRevalidate(request))
  }
})

/** Navigations prefer fresh HTML but fall back to the cached shell offline. */
async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      // Cache under the scope root so every ?t=... URL shares one shell.
      await cache.put(SCOPE, response.clone())
    }
    return response
  } catch {
    // `ignoreVary` matters: CORS-enabled hosts add `Vary: Origin`, and
    // crossorigin script/style tags must still match the precached copy.
    const cached = await caches.match(request, { ignoreVary: true })
    if (cached) return cached
    const shell = await cache.match(SCOPE, { ignoreVary: true })
    if (shell) return shell
    return Response.error()
  }
}

/** Hashed build assets: serve from cache instantly, refresh in background. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request, { ignoreVary: true })

  const network = fetch(request)
    .then(response => {
      if (response && response.ok && response.type === 'basic') {
        cache.put(request, response.clone()).catch(() => {})
      }
      return response
    })
    .catch(() => null)

  if (cached) return cached
  const response = await network
  return response || Response.error()
}
