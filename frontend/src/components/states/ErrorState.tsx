import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { Reveal } from '@/components/motion/Reveal'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = "We couldn't load this data.",
  message = 'Something went wrong while talking to the server. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Reveal variant="fade">
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl border border-danger-100 bg-danger-50 px-6 py-14 text-center',
          className,
        )}
      >
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-white text-danger-600">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
        <p className="mt-1.5 max-w-sm text-sm text-neutral-600">{message}</p>
        {onRetry && (
          <Button variant="outline" className="mt-5" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    </Reveal>
  )
}
