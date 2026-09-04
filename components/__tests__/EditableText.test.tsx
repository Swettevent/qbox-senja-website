import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EditableText from '@/components/EditableText'

describe('EditableText', () => {
  it('renders plain, non-interactive text when editMode is false', () => {
    render(<EditableText value="Hej" editMode={false} onSave={vi.fn()} />)
    expect(screen.getByText('Hej')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders as a clickable element when editMode is true', () => {
    render(<EditableText value="Hej" editMode={true} onSave={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Hej' })).toBeInTheDocument()
  })

  it('shows an input on click and calls onSave with the new value on blur', () => {
    const onSave = vi.fn()
    render(<EditableText value="Hej" editMode={true} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hej' }))
    const input = screen.getByDisplayValue('Hej')
    fireEvent.change(input, { target: { value: 'Hejsan' } })
    fireEvent.blur(input)
    expect(onSave).toHaveBeenCalledWith('Hejsan')
  })

  it('does not call onSave when the value is unchanged', () => {
    const onSave = vi.fn()
    render(<EditableText value="Hej" editMode={true} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hej' }))
    fireEvent.blur(screen.getByDisplayValue('Hej'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('renders a textarea instead of an input when multiline', () => {
    render(<EditableText value="Hej" editMode={true} onSave={vi.fn()} multiline />)
    fireEvent.click(screen.getByRole('button', { name: 'Hej' }))
    expect(screen.getByDisplayValue('Hej').tagName).toBe('TEXTAREA')
  })

  it('shows the placeholder when value is empty', () => {
    render(<EditableText value="" editMode={false} onSave={vi.fn()} placeholder="Lägg till text…" />)
    expect(screen.getByText('Lägg till text…')).toBeInTheDocument()
  })
})
