interface PhotoPreviewProps {
  previewUrl: string
  onRetake: () => void
}

export function PhotoPreview({ previewUrl, onRetake }: PhotoPreviewProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full max-w-xs overflow-hidden rounded-lg border border-border">
        <img
          src={previewUrl}
          alt="Captured report photo"
          className="w-full max-h-[200px] object-cover"
        />
      </div>
      <button
        type="button"
        onClick={onRetake}
        className="flex items-center gap-1.5 rounded-md bg-bg-elevated px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary active:text-text-primary"
      >
        <span aria-hidden="true">↻</span>
        Retake photo
      </button>
    </div>
  )
}
