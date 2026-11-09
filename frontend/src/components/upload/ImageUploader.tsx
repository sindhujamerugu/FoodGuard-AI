import { useCallback, useRef, useState } from 'react'
import { ImagePlus, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/i18n/LanguageContext'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
const MAX_BYTES = 5 * 1024 * 1024

interface ImageUploaderProps {
  /** Newly selected file, if any */
  file: File | null
  onChange: (file: File | null) => void
  /** Absolute URL of an already-uploaded image (edit mode), shown until a new file is chosen */
  existingImageUrl?: string | null
  label?: string
  required?: boolean
  hint?: string
}

export function ImageUploader({
  file,
  onChange,
  existingImageUrl,
  label,
  required,
  hint,
}: ImageUploaderProps) {
  const t = useTranslation()
  const displayLabel = label ?? t('uploader.label')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewUrl = file ? URL.createObjectURL(file) : existingImageUrl

  const validateAndSet = useCallback(
    (candidate: File | undefined | null) => {
      if (!candidate) return
      if (!ALLOWED_TYPES.includes(candidate.type)) {
        setError(t('uploader.invalidType'))
        return
      }
      if (candidate.size > MAX_BYTES) {
        setError(t('uploader.tooLarge', { size: (candidate.size / (1024 * 1024)).toFixed(1) }))
        return
      }
      setError(null)
      onChange(candidate)
    },
    [onChange, t],
  )

  return (
    <div className="flex flex-col gap-1.5">
      {displayLabel && (
        <span className="text-sm font-medium text-neutral-700">
          {displayLabel}
          {required && <span className="text-danger-600"> *</span>}
        </span>
      )}

      {previewUrl ? (
        <div className="group relative w-full max-w-xs overflow-hidden rounded-xl border border-neutral-200 animate-reveal-up">
          <img
            src={previewUrl}
            alt={t('uploader.previewAlt')}
            className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setError(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            aria-label={t('uploader.removeImage')}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-neutral-900/70 text-white transition-transform duration-200 hover:scale-110 hover:bg-neutral-900"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            validateAndSet(e.dataTransfer.files?.[0])
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200',
            isDragging
              ? 'scale-[1.01] border-primary-400 bg-primary-50'
              : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            className="sr-only"
            onChange={(e) => validateAndSet(e.target.files?.[0])}
          />
          {isDragging ? (
            <UploadCloud className="size-8 text-primary-500" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-8 text-neutral-400" aria-hidden="true" />
          )}
          <p className="text-sm font-medium text-neutral-700">
            {t('uploader.dragDropText')} <span className="text-primary-700 underline">{t('uploader.browse')}</span>
          </p>
          <p className="text-xs text-neutral-400">{t('uploader.formatHint')}</p>
        </label>
      )}

      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-danger-600">
          {error}
        </p>
      )}
    </div>
  )
}
