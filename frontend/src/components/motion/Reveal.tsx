import { createElement, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from 'react'
import { useReveal } from '@/hooks/useReveal'
import { cn } from '@/lib/cn'

type Variant = 'fade-up' | 'fade'

interface RevealOwnProps {
  children: ReactNode
  as?: ElementType
  variant?: Variant
  delay?: number
  className?: string
}

type RevealProps = RevealOwnProps & Omit<ComponentPropsWithoutRef<'div'>, keyof RevealOwnProps>

const variantClass: Record<Variant, string> = {
  'fade-up': 'animate-reveal-up',
  fade: 'animate-reveal-fade',
}

/** Fades/slides children into place the first time they enter the viewport. */
export function Reveal({ children, as = 'div', variant = 'fade-up', delay = 0, className, style, ...rest }: RevealProps) {
  const { ref, revealed } = useReveal<HTMLElement>()

  return createElement(
    as,
    {
      ref,
      className: cn(!revealed && 'opacity-0', revealed && variantClass[variant], className),
      style: delay ? { ...style, animationDelay: `${delay}ms` } : style,
      ...rest,
    },
    children,
  )
}
