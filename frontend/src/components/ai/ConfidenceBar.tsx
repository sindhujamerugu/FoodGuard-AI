export function ConfidenceBar({ confidence }: { confidence: string | number }) {
  const value = Math.max(0, Math.min(1, Number(confidence) || 0))
  const percent = Math.round(value * 100)

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-neutral-500">
        <span>Model confidence</span>
        <span>{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Model confidence"
        className="h-2 w-full overflow-hidden rounded-full bg-neutral-100"
      >
        <div
          className="h-full rounded-full bg-primary-600 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
