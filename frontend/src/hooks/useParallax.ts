import { useEffect, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion'

/**
 * rAF-throttled scroll parallax for a single element. Returns a ref to attach to the
 * layer that should move; `speed` < 1 moves slower than scroll (background), > 1 faster.
 * No-ops entirely under prefers-reduced-motion.
 */
export function useParallax<T extends HTMLElement>(speed = 0.3) {
  const ref = useRef<T | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) return
    const node = ref.current
    if (!node) return

    let ticking = false

    function apply() {
      ticking = false
      const node2 = ref.current
      if (!node2) return
      const offset = window.scrollY * speed
      node2.style.transform = `translate3d(0, ${offset}px, 0)`
    }

    function onScroll() {
      if (!ticking) {
        ticking = true
        window.requestAnimationFrame(apply)
      }
    }

    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [reducedMotion, speed])

  return ref
}
