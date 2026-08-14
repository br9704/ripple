import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  addToQueue,
  countQueued,
  getAllQueued,
  removeFromQueue,
  queuedReportToPayload,
  type QueuedReport,
  type QueuedReportInput,
} from './offlineQueue'

function input(overrides: Partial<QueuedReportInput> = {}): QueuedReportInput {
  return {
    category: 'pothole',
    lat: -37.8136,
    lng: 144.9631,
    address: '123 Smith St',
    suburb: 'Fitzroy',
    postcode: '3065',
    council_id: 'council-uuid',
    note: 'been here for months',
    reporter_token: 'token-1',
    photo_base64: 'AAAA',
    ...overrides,
  }
}

beforeEach(async () => {
  for (const r of await getAllQueued()) {
    await removeFromQueue(r.id)
  }
})

describe('offline queue storage', () => {
  it('starts empty', async () => {
    expect(await countQueued()).toBe(0)
  })

  it('persists a queued report and counts it', async () => {
    await addToQueue(input())
    expect(await countQueued()).toBe(1)
  })

  it('stamps queuedAt so stale reports are identifiable later', async () => {
    await addToQueue(input())
    const [stored] = await getAllQueued()
    expect(stored.queuedAt).toBeTypeOf('number')
    expect(stored.queuedAt).toBeLessThanOrEqual(Date.now())
  })

  it('assigns distinct auto-increment ids to multiple reports', async () => {
    await addToQueue(input({ reporter_token: 'a' }))
    await addToQueue(input({ reporter_token: 'b' }))

    const all = await getAllQueued()
    expect(all).toHaveLength(2)
    expect(new Set(all.map((r) => r.id)).size).toBe(2)
  })

  it('removes only the report asked for', async () => {
    await addToQueue(input({ reporter_token: 'keep' }))
    await addToQueue(input({ reporter_token: 'drop' }))

    const toDrop = (await getAllQueued()).find((r) => r.reporter_token === 'drop')!
    await removeFromQueue(toDrop.id)

    const remaining = await getAllQueued()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].reporter_token).toBe('keep')
  })

  it('round-trips the photo payload intact', async () => {
    const photo = 'iVBORw0KGgoAAAANSUhEUg=='
    await addToQueue(input({ photo_base64: photo }))
    const [stored] = await getAllQueued()
    expect(stored.photo_base64).toBe(photo)
  })
})

describe('queuedReportToPayload', () => {
  const report: QueuedReport = { ...input(), id: 1, queuedAt: 1_700_000_000_000 }

  it('produces the same field set the live path sends', () => {
    // The queued and live paths must not drift: a field added to one and not
    // the other silently degrades every offline submission.
    expect(Object.keys(queuedReportToPayload(report)).sort()).toEqual(
      [
        'address',
        'ai_category',
        'ai_confidence',
        'category',
        'council_id',
        'lat',
        'lng',
        'note',
        'photo_base64',
        'postcode',
        'reporter_token',
        'suburb',
        'user_corrected_ai',
      ].sort()
    )
  })

  it('omits an empty note rather than sending an empty string', () => {
    expect(queuedReportToPayload({ ...report, note: '' }).note).toBeUndefined()
  })

  it('does not leak the local queue id or timestamp to the server', () => {
    const payload = queuedReportToPayload(report) as Record<string, unknown>
    expect(payload.id).toBeUndefined()
    expect(payload.queuedAt).toBeUndefined()
  })
})
