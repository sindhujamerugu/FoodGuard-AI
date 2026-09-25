import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './useReducedMotion'

/**
 * Reveals an element once it enters the viewport (IntersectionObserver, fires once).
 * Under prefers-reduced-motion, `revealed` starts true so nothing ever animates or flashes hidden.
 */
export function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null)
  const reducedMotion = useReducedMotion()
  const [revealed, setRevealed] = useState(reducedMotion)

  useEffect(() => {
    if (reducedMotion) {
      setRevealed(true)
      return
    }
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
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
