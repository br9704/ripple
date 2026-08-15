import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppMenu } from './AppMenu'

function renderMenu(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppMenu />
    </MemoryRouter>
  )
}

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /open menu/i }))

/**
 * S21.7. The button this replaces was disabled for the whole project, with a
 * title attribute apologising for it, so the assertions worth writing are the
 * ones about it being a real control now: it opens, it says so to a screen
 * reader, and it closes by all three of the routes a user will try.
 */
describe('AppMenu', () => {
  it('renders a real, enabled trigger with no apology attached', () => {
    renderMenu()
    const trigger = screen.getByRole('button', { name: /open menu/i })
    expect(trigger).toBeEnabled()
    // The stub carried a `title` because it had nothing else to say. A title on
    // an icon button is a tooltip no touch device ever shows, so its absence
    // here is the point: the aria-label carries the meaning now.
    expect(trigger.getAttribute('title')).toBeNull()
    expect(screen.queryAllByRole('button', { hidden: true }).every((b) => !b.hasAttribute('disabled'))).toBe(true)
  })

  it('reports its state through aria-expanded and aria-controls', () => {
    renderMenu()
    const trigger = screen.getByRole('button', { name: /open menu/i })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: /main menu/i })).not.toBeInTheDocument()

    fireEvent.click(trigger)

    const reopened = screen.getByRole('button', { name: /close menu/i })
    expect(reopened).toHaveAttribute('aria-expanded', 'true')
    const panelId = reopened.getAttribute('aria-controls')
    expect(panelId).toBeTruthy()
    expect(document.getElementById(panelId ?? '')).toBeInTheDocument()
  })

  it('links only to routes that exist in App.tsx, including the new terms page', () => {
    renderMenu()
    openMenu()

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))

    expect(hrefs).toEqual(['/', '/feed', '/search', '/my-reports', '/council', '/terms'])
  })

  it('moves focus to the first destination when opened', async () => {
    renderMenu()
    openMenu()

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('link', { name: /map/i }))
    })
  })

  it('marks the current route with aria-current', () => {
    renderMenu('/terms')
    openMenu()

    expect(screen.getByRole('link', { name: /terms/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /feed/i })).not.toHaveAttribute('aria-current')
  })

  it('closes on Escape and hands focus back to the trigger', async () => {
    renderMenu()
    openMenu()
    expect(screen.getByRole('navigation', { name: /main menu/i })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    // The exit animation keeps the panel mounted for a moment, so state is
    // asserted on the trigger — which is what a screen reader reads anyway.
    const trigger = await screen.findByRole('button', { name: /open menu/i })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(trigger)
  })

  it('closes on a press outside itself', async () => {
    renderMenu()
    openMenu()

    fireEvent.mouseDown(document.body)

    const trigger = await screen.findByRole('button', { name: /open menu/i })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes when a destination is chosen', async () => {
    renderMenu()
    openMenu()

    fireEvent.click(screen.getByRole('link', { name: /terms/i }))

    const trigger = await screen.findByRole('button', { name: /open menu/i })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
