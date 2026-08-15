import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { CrewAssignment } from './CrewAssignment'
import type { CrewAssignmentResult } from '@/hooks/useCrewAssignment'

const assign = vi.fn<(reportId: string, raw: string) => Promise<CrewAssignmentResult>>()

// The hook is exercised directly in useCrewAssignment.test.ts. Stubbing it here
// keeps these assertions about what the coordinator sees, not about transport.
vi.mock('@/hooks/useCrewAssignment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useCrewAssignment')>()
  return { ...actual, useCrewAssignment: () => ({ assign }) }
})

const ASSIGNED = '2026-08-15T00:00:00.000Z'

// fireEvent rather than user-event: the latter is not a dependency of this
// repo, and adding one for a single test file is not this sprint's call.
function renderRow(props: Partial<React.ComponentProps<typeof CrewAssignment>> = {}) {
  const onAssigned = vi.fn()
  render(
    <CrewAssignment
      reportId="r1"
      ticketRef={null}
      assignedAt={null}
      onAssigned={onAssigned}
      {...props}
    />
  )
  return { onAssigned }
}

function openEditor() {
  fireEvent.click(screen.getByRole('button', { name: /crew ticket/i }))
  return screen.getByLabelText('Crew ticket reference')
}

function type(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } })
}

beforeEach(() => {
  assign.mockReset()
  assign.mockResolvedValue({
    ok: true,
    value: { crew_ticket_ref: 'WO-2026-4471', crew_assigned_at: ASSIGNED },
  })
})

describe('CrewAssignment — reading the assignment', () => {
  it('offers assignment when the report has no ticket', () => {
    renderRow()
    expect(screen.getByRole('button', { name: /assign a crew ticket/i })).toBeInTheDocument()
  })

  it('shows the ticket ref and when it was assigned', () => {
    renderRow({ ticketRef: 'WO-2026-4471', assignedAt: new Date().toISOString() })
    const trigger = screen.getByRole('button', { name: /change crew ticket WO-2026-4471/i })
    expect(trigger).toHaveTextContent('crew WO-2026-4471')
    expect(trigger).toHaveTextContent(/assigned just now/i)
  })

  it('shows the ref alone when the stamp is missing rather than inventing a time', () => {
    renderRow({ ticketRef: 'WO-1', assignedAt: null })
    expect(screen.getByRole('button')).not.toHaveTextContent(/assigned/i)
  })
})

describe('CrewAssignment — writing', () => {
  it('saves what was typed and hands the parent the server’s values', async () => {
    const { onAssigned } = renderRow()

    type(openEditor(), 'WO-2026-4471')
    fireEvent.click(screen.getByRole('button', { name: '[save]' }))

    expect(assign).toHaveBeenCalledWith('r1', 'WO-2026-4471')
    await waitFor(() =>
      expect(onAssigned).toHaveBeenCalledWith('r1', {
        crew_ticket_ref: 'WO-2026-4471',
        crew_assigned_at: ASSIGNED,
      })
    )
  })

  it('saves on Enter — a queue is worked from the keyboard', async () => {
    renderRow()

    const input = openEditor()
    type(input, 'WO-9')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(assign).toHaveBeenCalledWith('r1', 'WO-9')
    await waitFor(() =>
      expect(screen.queryByLabelText('Crew ticket reference')).not.toBeInTheDocument()
    )
  })

  it('seeds the editor with the existing ref so changing it is not retyping it', () => {
    renderRow({ ticketRef: 'WO-1', assignedAt: ASSIGNED })
    expect(openEditor()).toHaveValue('WO-1')
  })

  it('clears the assignment with an empty ref, matching the trigger', async () => {
    assign.mockResolvedValue({
      ok: true,
      value: { crew_ticket_ref: null, crew_assigned_at: null },
    })
    const { onAssigned } = renderRow({ ticketRef: 'WO-1', assignedAt: ASSIGNED })

    openEditor()
    fireEvent.click(screen.getByRole('button', { name: '[clear]' }))

    expect(assign).toHaveBeenCalledWith('r1', '')
    await waitFor(() =>
      expect(onAssigned).toHaveBeenCalledWith('r1', {
        crew_ticket_ref: null,
        crew_assigned_at: null,
      })
    )
  })

  it('offers no clear button when there is nothing to clear', () => {
    renderRow()
    openEditor()
    expect(screen.queryByRole('button', { name: '[clear]' })).not.toBeInTheDocument()
  })

  it('stands in a typing line for the in-flight write, never a spinner', async () => {
    // MOTION.md forbids spinners outright; the terminal typing line is the
    // system's substitute on short waits.
    let settle: (r: CrewAssignmentResult) => void = () => undefined
    assign.mockReturnValue(
      new Promise<CrewAssignmentResult>((resolve) => {
        settle = resolve
      })
    )
    renderRow()

    type(openEditor(), 'WO-5')
    fireEvent.click(screen.getByRole('button', { name: '[save]' }))

    expect(await screen.findByText('assigning...')).toBeInTheDocument()
    expect(screen.getByLabelText('Crew ticket reference')).toBeDisabled()

    settle({ ok: true, value: { crew_ticket_ref: 'WO-5', crew_assigned_at: ASSIGNED } })
    await waitFor(() =>
      expect(screen.queryByLabelText('Crew ticket reference')).not.toBeInTheDocument()
    )
  })
})

describe('CrewAssignment — failure paths are visible', () => {
  it('shows the message and keeps the typed ref when the write is refused', async () => {
    assign.mockResolvedValue({
      ok: false,
      reason: 'forbidden',
      message: 'that report belongs to a different council',
    })
    const { onAssigned } = renderRow()

    type(openEditor(), 'WO-7')
    fireEvent.click(screen.getByRole('button', { name: '[save]' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('that report belongs to a different council')
    // The parent must not be told a write happened...
    expect(onAssigned).not.toHaveBeenCalled()
    // ...and the coordinator must not lose what they pasted.
    expect(screen.getByLabelText('Crew ticket reference')).toHaveValue('WO-7')
  })

  it('reports an offline failure rather than appearing to save', async () => {
    assign.mockResolvedValue({
      ok: false,
      reason: 'offline',
      message: 'offline — ticket not saved',
    })
    renderRow()

    const input = openEditor()
    type(input, 'WO-7')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(await screen.findByRole('alert')).toHaveTextContent('offline — ticket not saved')
  })

  it('blocks save past the length constraint and says so on the input', () => {
    renderRow()

    const input = openEditor()
    type(input, 'x'.repeat(65))

    // Not truncated — silently storing a shortened ticket number would be a
    // wrong reference the coordinator could never detect.
    expect(input).toHaveValue('x'.repeat(65))
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: '[save]' })).toBeDisabled()
    expect(screen.getByText('65/64')).toBeInTheDocument()
  })

  it('does not save an over-long ref on Enter either', () => {
    renderRow()

    const input = openEditor()
    type(input, 'x'.repeat(65))
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(assign).not.toHaveBeenCalled()
  })

  it('keeps the counter out of the way at the lengths councils actually use', () => {
    renderRow()
    type(openEditor(), 'WO-2026-4471')
    expect(screen.queryByText(/\/64$/)).not.toBeInTheDocument()
  })
})

describe('CrewAssignment — keyboard', () => {
  it('backs out on Escape and returns focus to the trigger', async () => {
    renderRow({ ticketRef: 'WO-1', assignedAt: ASSIGNED })

    fireEvent.keyDown(openEditor(), { key: 'Escape' })

    expect(screen.queryByLabelText('Crew ticket reference')).not.toBeInTheDocument()
    // Dropping focus on <body> here would lose a keyboard user's place in the
    // queue entirely.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /change crew ticket/i })).toHaveFocus()
    )
  })

  it('does not write anything when the editor is dismissed', () => {
    const { onAssigned } = renderRow()

    type(openEditor(), 'WO-3')
    fireEvent.click(screen.getByRole('button', { name: '[esc]' }))

    expect(assign).not.toHaveBeenCalled()
    expect(onAssigned).not.toHaveBeenCalled()
  })
})
