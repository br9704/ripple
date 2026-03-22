import { useState, useRef, useCallback, useEffect } from 'react'
import { compressImage } from '@/lib/compressImage'

interface CameraCaptureState {
  /** The compressed photo blob, ready for upload */
  photo: Blob | null
  /** Object URL for displaying the photo preview */
  preview: string | null
  /** Whether compression is in progress */
  isProcessing: boolean
  /** Error message if capture or compression failed */
  error: string | null
}

export function useCameraCapture() {
  const [state, setState] = useState<CameraCaptureState>({
    photo: null,
    preview: null,
    isProcessing: false,
    error: null,
  })

  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear previous preview URL
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }

    setState({ photo: null, preview: null, isProcessing: true, error: null })

    try {
      const compressed = await compressImage(file)
      const previewUrl = URL.createObjectURL(compressed)
      previewUrlRef.current = previewUrl

      setState({
        photo: compressed,
        preview: previewUrl,
        isProcessing: false,
        error: null,
      })
    } catch (err) {
      setState({
        photo: null,
        preview: null,
        isProcessing: false,
        error: err instanceof Error ? err.message : 'Failed to process photo',
      })
    }

    // Reset the input so the same file can be re-selected
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [])

  const capture = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
    inputRef.current?.click()
  }, [])

  const retake = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setState({ photo: null, preview: null, isProcessing: false, error: null })
    // Trigger capture again after a tick so the state clears first
    setTimeout(() => inputRef.current?.click(), 50)
  }, [])

  const reset = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setState({ photo: null, preview: null, isProcessing: false, error: null })
  }, [])

  return {
    photo: state.photo,
    preview: state.preview,
    isProcessing: state.isProcessing,
    error: state.error,
    capture,
    retake,
    reset,
    handleFileChange,
    inputRef,
  }
}
