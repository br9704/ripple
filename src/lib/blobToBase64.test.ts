import { describe, it, expect } from 'vitest'
import { blobToBase64 } from './blobToBase64'

describe('blobToBase64', () => {
  it('strips the data URL prefix', async () => {
    // The Edge Function feeds this straight into Deno's base64Decode, which
    // rejects anything carrying the "data:...;base64," preamble.
    const blob = new Blob(['hello'], { type: 'text/plain' })
    const result = await blobToBase64(blob)
    expect(result).not.toContain('data:')
    expect(result).not.toContain(',')
    expect(result).toBe(btoa('hello'))
  })

  it('round-trips binary content', async () => {
    const bytes = new Uint8Array([0x00, 0xff, 0x10, 0x7f, 0x80])
    const blob = new Blob([bytes], { type: 'image/jpeg' })
    const result = await blobToBase64(blob)

    const decoded = Uint8Array.from(atob(result), (c) => c.charCodeAt(0))
    expect(Array.from(decoded)).toEqual(Array.from(bytes))
  })

  it('rejects on an empty blob rather than resolving with undefined', async () => {
    // An empty blob yields "data:...;base64," with nothing after the comma, so
    // split(',')[1] is the empty string — which must be treated as a failure,
    // not silently uploaded as a zero-byte photo.
    await expect(blobToBase64(new Blob([]))).rejects.toThrow(/Failed to encode/)
  })
})
