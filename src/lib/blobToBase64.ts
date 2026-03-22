/**
 * Converts a Blob to a base64-encoded string (without the data URL prefix).
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // Remove "data:image/jpeg;base64," prefix
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new Error('Failed to encode blob as base64'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}
