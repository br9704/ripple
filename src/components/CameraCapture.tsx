import { useEffect, useRef } from 'react'
import { useCameraCapture } from '@/hooks/useCameraCapture'
import { PhotoPreview } from '@/components/PhotoPreview'

interface CameraCaptureProps {
  onClose: () => void
  onPhotoCaptured: (photo: Blob, preview: string) => void
}

export function CameraCapture({ onClose, onPhotoCaptured }: CameraCaptureProps) {
  const { photo, preview, isProcessing, error, capture, retake, handleFileChange, inputRef } =
    useCameraCapture()

  // Notify the parent once per captured photo.
  //
  // This used to run during render, which called the parent's setState mid-render
  // (React 19 StrictMode: "Cannot update a component while rendering a different
  // component") and re-fired on every subsequent render. Guarding on the blob
  // identity means a retake — which produces a new Blob — notifies again, while
  // unrelated re-renders do not.
  const notifiedFor = useRef<Blob | null>(null)

  useEffect(() => {
    if (!photo || !preview) return
    if (notifiedFor.current === photo) return
    notifiedFor.current = photo
    onPhotoCaptured(photo, preview)
  }, [photo, preview, onPhotoCaptured])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center p-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-elevated text-text-secondary transition-colors hover:text-text-primary"
        >
          ✕
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {preview ? (
          <PhotoPreview previewUrl={preview} onRetake={retake} />
        ) : (
          <>
            {/* Camera prompt */}
            <div className="mb-8 text-center">
              <p className="text-lg font-medium text-text-primary">
                What do you see?
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Take a photo of the infrastructure issue
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 rounded-md bg-status-declined/10 px-4 py-3 text-sm text-status-declined">
                {error}
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="mb-6 text-sm text-text-secondary">
                Processing photo...
              </div>
            )}

            {/* Gallery hint */}
            <p className="mb-6 text-xs text-text-tertiary">
              Can't access camera? You can also choose a photo from your gallery.
            </p>
          </>
        )}
      </div>

      {/* Shutter button — only shown when no photo captured */}
      {!preview && !isProcessing && (
        <div className="flex justify-center pb-12 pt-4">
          <button
            type="button"
            onClick={capture}
            aria-label="Take photo"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-action shadow-glow transition-transform active:scale-95"
          >
            <div className="h-12 w-12 rounded-full border-[3px] border-text-primary" />
          </button>
        </div>
      )}
    </div>
  )
}
