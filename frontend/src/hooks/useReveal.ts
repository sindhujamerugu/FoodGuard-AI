import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './useReducedMotion'

const supportsIntersectionObserver = typeof IntersectionObserver !== 'undefined'

/**
 * Reveals an element once it enters the viewport (IntersectionObserver, fires once).
 * Under prefers-reduced-motion, `revealed` is true immediately so nothing ever animates or flashes hidden.
 */
export function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null)
  const reducedMotion = useReducedMotion()
  const [intersected, setIntersected] = useState(false)
  const revealed = reducedMotion || !supportsIntersectionObserver || intersected

  useEffect(() => {
    if (reducedMotion || !supportsIntersectionObserver) return
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIntersected(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [reducedMotion, threshold])

  return { ref, revealed }
}
