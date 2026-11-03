import { useEffect, useRef } from 'react'
import type { Page } from '../types'
import { PAGES } from '../utils/pages'

/**
 * Elements that always own the gesture. Swipes starting inside them never
 * change tabs (form fields, overlays, and the tab strip itself).
 */
const IGNORE_SELECTOR = [
  'nav',
  '.modal-overlay',
  '.welcome-overlay',
  '.spectator-overlay',
  '.bracket-3p-sep',
  'input',
  'textarea',
  'select',
  '[data-no-swipe]',
].join(', ')

/**
 * Elements that scroll horizontally. They keep the gesture while they can
 * still scroll that way, but once they hit the edge (or don't overflow at all,
 * which is common on tablets) a swipe continues on to the next tab.
 */
const H_SCROLL_SELECTOR = [
  '.table-scroll',
  '.bracket-wrapper',
  '.spectator-bracket-scroll',
].join(', ')

/** Minimum horizontal travel (px) before a swipe counts as a tab change. */
const MIN_SWIPE = 60
/** Horizontal travel must beat vertical travel by this factor. */
const DIRECTION_RATIO = 1.4
/** Longer presses/drags (e.g. text selection) are not treated as swipes. */
const MAX_DURATION_MS = 700

/**
 * Touch gesture navigation: swipe left for the next tab, right for the
 * previous one. Works on phones and tablets; uses passive listeners so normal
 * scrolling is untouched.
 */
export function useSwipeNavigation(
  activePage: Page,
  enabled: boolean,
  onNavigate: (page: Page) => void,
) {
  const navigateRef = useRef(onNavigate)
  navigateRef.current = onNavigate

  const pageRef = useRef(activePage)
  pageRef.current = activePage

  useEffect(() => {
    if (!enabled) return

    let startX = 0
    let startY = 0
    let startTime = 0
    let startScrollLeft = 0
    let scrollEl: HTMLElement | null = null
    let tracking = false

    const onTouchStart = (e: TouchEvent) => {
      tracking = false
      scrollEl = null
      if (e.touches.length !== 1) return
      const target = e.target
      if (target instanceof Element && target.closest(IGNORE_SELECTOR)) return
      if (target instanceof Element) {
        scrollEl = target.closest(H_SCROLL_SELECTOR) as HTMLElement | null
        startScrollLeft = scrollEl?.scrollLeft ?? 0
      }
      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      startTime = Date.now()
      tracking = true
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const container = scrollEl
      scrollEl = null
      const touch = e.changedTouches?.[0]
      if (!touch) return
      if (Date.now() - startTime > MAX_DURATION_MS) return

      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      const absX = Math.abs(dx)
      if (absX < MIN_SWIPE) return
      if (absX < Math.abs(dy) * DIRECTION_RATIO) return

      // Let a horizontally scrollable area finish its own scroll first.
      if (container) {
        const maxScroll = container.scrollWidth - container.clientWidth
        if (maxScroll > 1) {
          const moved = Math.abs(container.scrollLeft - startScrollLeft) > 2
          const canScrollFurther = dx < 0
            ? container.scrollLeft < maxScroll - 1
            : container.scrollLeft > 0
          if (moved || canScrollFurther) return
        }
      }

      const current = PAGES.findIndex(p => p.id === pageRef.current)
      if (current < 0) return
      const next = PAGES[dx < 0 ? current + 1 : current - 1]
      if (next) navigateRef.current(next.id)
    }

    const onTouchCancel = () => {
      tracking = false
      scrollEl = null
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchCancel, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [enabled])
}
