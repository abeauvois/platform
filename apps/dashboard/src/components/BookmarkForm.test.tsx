import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookmarkForm } from './BookmarkForm'

describe('BookmarkForm', () => {
    it('should render the form with all required fields', () => {
        const onSubmit = vi.fn()
        render(<BookmarkForm onSubmit={onSubmit} />)

        expect(screen.getByLabelText(/url/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/source adapter/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/tags/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/summary/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /add bookmark/i })).toBeInTheDocument()
    })

    it('should validate URL is required', async () => {
        const onSubmit = vi.fn()
        render(<BookmarkForm onSubmit={onSubmit} />)

        const submitButton = screen.getByRole('button', { name: /add bookmark/i })
        await userEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(/url is required/i)).toBeInTheDocument()
        })
        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('should validate URL format', async () => {
        const onSubmit = vi.fn()
        render(<BookmarkForm onSubmit={onSubmit} />)

        const urlInput = screen.getByLabelText(/url/i)
        await userEvent.type(urlInput, 'invalid-url')

        const submitButton = screen.getByRole('button', { name: /add bookmark/i })
        await userEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(/must be a valid url/i)).toBeInTheDocument()
        })
        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('should validate source adapter is not "None"', async () => {
        const onSubmit = vi.fn()
        render(<BookmarkForm onSubmit={onSubmit} />)

        const urlInput = screen.getByLabelText(/url/i)
        await userEvent.type(urlInput, 'https://example.com')

        const sourceSelect = screen.getByLabelText(/source adapter/i)
        await userEvent.selectOptions(sourceSelect, 'None')

        const submitButton = screen.getByRole('button', { name: /add bookmark/i })
        await userEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(/please select a valid source/i)).toBeInTheDocument()
        })
        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('should submit form with valid data', async () => {
        const onSubmit = vi.fn()
        render(<BookmarkForm onSubmit={onSubmit} />)

        const urlInput = screen.getByLabelText(/url/i)
        await userEvent.type(urlInput, 'https://example.com')

        const sourceSelect = screen.getByLabelText(/source adapter/i)
        await userEvent.selectOptions(sourceSelect, 'Other')

        const tagsInput = screen.getByLabelText(/tags/i)
        await userEvent.type(tagsInput, 'tech, programming')

        const summaryInput = screen.getByLabelText(/summary/i)
        await userEvent.type(summaryInput, 'A useful resource')

        const submitButton = screen.getByRole('button', { name: /add bookmark/i })
        await userEvent.click(submitButton)

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith({
                url: 'https://example.com',
                sourceAdapter: 'Other',
                tags: ['tech', 'programming'],
                summary: 'A useful resource'
            })
        })
    })

    it('should handle tags as comma-separated values', async () => {
        const onSubmit = vi.fn()
        render(<BookmarkForm onSubmit={onSubmit} />)

        const urlInput = screen.getByLabelText(/url/i)
        await userEvent.type(urlInput, 'https://example.com')

        const sourceSelect = screen.getByLabelText(/source adapter/i)
        await userEvent.selectOptions(sourceSelect, 'Other')

        const tagsInput = screen.getByLabelText(/tags/i)
        await userEvent.type(tagsInput, 'tag1, tag2, tag3')

        const submitButton = screen.getByRole('button', { name: /add bookmark/i })
        await userEvent.click(submitButton)

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    tags: ['tag1', 'tag2', 'tag3']
                })
            )
        })
    })

    it('should show loading state during submission', async () => {
        const onSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)))
        render(<BookmarkForm onSubmit={onSubmit} />)

        const urlInput = screen.getByLabelText(/url/i)
        await userEvent.type(urlInput, 'https://example.com')

        const sourceSelect = screen.getByLabelText(/source adapter/i)
        await userEvent.selectOptions(sourceSelect, 'Other')

        const submitButton = screen.getByRole('button', { name: /add bookmark/i })
        await userEvent.click(submitButton)

        expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled()
    })

    it('should reset form after successful submission', async () => {
        const onSubmit = vi.fn()
        render(<BookmarkForm onSubmit={onSubmit} />)

        const urlInput = screen.getByLabelText(/url/i)
        await userEvent.type(urlInput, 'https://example.com')

        const sourceSelect = screen.getByLabelText(/source adapter/i)
        await userEvent.selectOptions(sourceSelect, 'Other')

        const submitButton = screen.getByRole('button', { name: /add bookmark/i })
        await userEvent.click(submitButton)

        await waitFor(() => {
            expect((urlInput as HTMLInputElement).value).toBe('')
            expect((sourceSelect as HTMLSelectElement).value).toBe('None')
        })
    })
})
