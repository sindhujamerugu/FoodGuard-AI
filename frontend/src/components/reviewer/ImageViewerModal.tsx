import { X, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'

interface ImageViewerModalProps {
  isOpen: boolean
  src: string
  title: string
  onClose: () => void
}

export function ImageViewerModal({ isOpen, src, title, onClose }: ImageViewerModalProps) {
  const [zoom, setZoom] = useState(false)

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-viewer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3 text-white">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400" />
            <h4 id="image-viewer-title" className="text-sm font-medium truncate max-w-md">
              Evidence: {title}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => !z)}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
              title={zoom ? 'Reset Zoom' : 'Zoom In'}
            >
              {zoom ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
              aria-label="Close image viewer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center overflow-auto p-4 max-h-[calc(90vh-60px)]">
          <img
            src={src}
            alt={title}
            className={`rounded-lg object-contain transition-transform duration-200 ${
              zoom ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in max-h-[75vh]'
            }`}
            onClick={() => setZoom((z) => !z)}
          />
        </div>
      </div>
    </div>
  )
}
