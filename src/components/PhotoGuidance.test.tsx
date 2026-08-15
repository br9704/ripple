import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PhotoGuidance } from './PhotoGuidance'
import { CameraCapture } from './CameraCapture'

/**
 * PRD §13.1.3 and §13.4 are requirements about *placement*, not about the
 * existence of a paragraph somewhere in the product: "Ripple's submission flow
 * UI instructs users not to photograph people." So the second block below
 * renders the actual capture screen and looks for the guidance there — the
 * first block alone would still pass if the component were never mounted.
 */
describe('PhotoGuidance', () => {
  function renderGuidance() {
    return render(
      <MemoryRouter>
        <PhotoGuidance />
      </MemoryRouter>
    )
  }

  it('leads with the instruction not to photograph people', () => {
    renderGuidance()
    expect(screen.getByText(/photograph the problem, not people/i)).toBeInTheDocument()
    expect(screen.getByText(/no faces, no people in frame/i)).toBeInTheDocument()
  })

  it('says the photo will be public and that private property is out of scope', () => {
    renderGuidance()
    expect(screen.getByText(/published publicly/i)).toBeInTheDocument()
    expect(screen.getByText(/not private property/i)).toBeInTheDocument()
  })

  it('is a landmark rather than a dialog, so it cannot be dismissed', () => {
    renderGuidance()
    const guidance = screen.getByRole('complementary', { name: /photography guidance/i })
    expect(guidance).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dismiss|got it|close/i })).not.toBeInTheDocument()
  })

  it('links to the terms', () => {
    renderGuidance()
    expect(screen.getByRole('link', { name: /terms/i })).toHaveAttribute('href', '/terms')
  })
})

describe('PhotoGuidance in the capture flow', () => {
  it('is on screen before the shutter is pressed', () => {
    render(
      <MemoryRouter>
        <CameraCapture onClose={() => undefined} onPhotoCaptured={() => undefined} />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: /photography guidance/i })).toBeInTheDocument()
    expect(screen.getByText(/photograph the problem, not people/i)).toBeInTheDocument()
  })
})
