import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * The service worker lives in public/ (so it keeps a stable URL), which means
 * it cannot know Vite's hashed asset names. After the build finishes, inject
 * the emitted JS/CSS URLs into its precache list so the installed PWA works
 * offline after the very first visit.
 */
function serviceWorkerPrecache(): Plugin {
  let outDir = 'dist'
  let base = '/'

  return {
    name: 'service-worker-precache',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
      base = config.base
    },
    closeBundle() {
      try {
        const html = readFileSync(join(outDir, 'index.html'), 'utf8')
        const assets = new Set<string>()
        for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
          const url = match[1]
          if (!url.startsWith(base)) continue
          const relative = url.slice(base.length)
          if (/\.(?:js|css)$/.test(relative)) assets.add(relative)
        }

        const swPath = join(outDir, 'sw.js')
        const sw = readFileSync(swPath, 'utf8')
        const withAssets = sw.replace('/* __PRECACHE_BUILD_ASSETS__ */[]', JSON.stringify([...assets]))
        // A per-build id makes the cache name unique so old caches are purged.
        writeFileSync(swPath, withAssets.replace('__BUILD_ID__', Date.now().toString(36)))
      } catch (error) {
        this.warn(`could not inject service-worker precache list: ${String(error)}`)
      }
    },
  }
}

export default defineConfig({
  base: '/pickle-tour/',
  plugins: [react(), serviceWorkerPrecache()],
})
