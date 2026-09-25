/**
 * Deterministic decorative gradient for restaurant cards — the backend has no image
 * field for restaurants, so this stands in as a cover band. Never presented as a photo.
 */
const GRADIENTS = [
  'from-primary-700 via-primary-600 to-primary-400',
  'from-primary-900 via-primary-700 to-primary-500',
  'from-neutral-800 via-primary-800 to-primary-500',
  'from-primary-800 via-primary-500 to-warning-500',
  'from-primary-900 via-primary-600 to-info-500',
]

export function gradientCover(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return GRADIENTS[hash % GRADIENTS.length]
}
