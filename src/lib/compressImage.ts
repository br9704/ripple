import { PHOTO_MAX_WIDTH, PHOTO_JPEG_QUALITY } from '@/constants/config'

/**
 * Compresses an image file using Canvas API.
 * Resizes to max PHOTO_MAX_WIDTH (1920px) and encodes as JPEG at PHOTO_JPEG_QUALITY (80%).
 * Does not upscale images smaller than the max width.
 */
export function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img

      // Scale down if wider than max, never upscale
      if (width > PHOTO_MAX_WIDTH) {
        const ratio = PHOTO_MAX_WIDTH / width
        width = PHOTO_MAX_WIDTH
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas 2D context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'))
            return
          }
          resolve(blob)
        },
        'image/jpeg',
        PHOTO_JPEG_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for compression'))
    }

    img.src = objectUrl
  })
}
