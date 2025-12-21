import { SOURCE_ADAPTERS } from '@platform/domain'
import { useForm } from '@tanstack/react-form'
import type { SourceAdapter } from '@platform/domain'

interface BookmarkFormData {
    url: string
    sourceAdapter: SourceAdapter
    tags: Array<string>
    summary: string
}

interface BookmarkFormProps {
    onSubmit: (data: BookmarkFormData) => void | Promise<void>
}

function FieldInfo({ field }: { field: any }) {
    return (
        <>
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                <em className="text-error text-sm">{field.state.meta.errors.join(', ')}</em>
            ) : null}
            {field.state.meta.isValidating ? <span className="text-sm">Validating...</span> : null}
        </>
    )
}

export function BookmarkForm({ onSubmit }: BookmarkFormProps) {
    const form = useForm({
        defaultValues: {
            url: '',
            sourceAdapter: 'None' as SourceAdapter,
            tagsInput: '',
            summary: ''
        },
        onSubmit: async ({ value }) => {
            const tags = value.tagsInput
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)

            await onSubmit({
                url: value.url,
                sourceAdapter: value.sourceAdapter,
                tags,
                summary: value.summary
            })

            // Reset form after successful submission
            form.reset()
        }
    })

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
            }}
            className="space-y-4"
        >
            <div>
                <form.Field
                    name="url"
                    validators={{
                        onChange: ({ value }) => {
                            if (!value || value.trim().length === 0) {
                                return 'URL is required'
                            }
                            try {
                                new URL(value)
                            } catch {
                                return 'Must be a valid URL'
                            }
                            return undefined
                        }
                    }}
                    children={(field) => (
                        <>
                            <label htmlFor={field.name} className="label">
                                <span className="label-text font-medium">URL</span>
                            </label>
                            <input
                                id={field.name}
                                name={field.name}
                                type="text"
                                placeholder="https://example.com"
                                className="input input-bordered w-full"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                            />
                            <FieldInfo field={field} />
                        </>
                    )}
                />
            </div>

            <div>
                <form.Field
                    name="sourceAdapter"
                    validators={{
                        onChange: ({ value }) => {
                            if (value === 'None') {
                                return 'Please select a valid source'
                            }
                            return undefined
                        }
                    }}
                    children={(field) => (
                        <>
                            <label htmlFor={field.name} className="label">
                                <span className="label-text font-medium">Source Adapter</span>
                            </label>
                            <select
                                id={field.name}
                                name={field.name}
                                className="select select-bordered w-full"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value as SourceAdapter)}
                            >
                                {SOURCE_ADAPTERS.map((adapter) => (
                                    <option key={adapter} value={adapter}>
                                        {adapter}
                                    </option>
                                ))}
                            </select>
                            <FieldInfo field={field} />
                        </>
                    )}
                />
            </div>

            <div>
                <form.Field
                    name="tagsInput"
                    children={(field) => (
                        <>
                            <label htmlFor={field.name} className="label">
                                <span className="label-text font-medium">Tags</span>
                            </label>
                            <input
                                id={field.name}
                                name={field.name}
                                type="text"
                                placeholder="tech, programming, ai (comma-separated)"
                                className="input input-bordered w-full"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                            />
                            <FieldInfo field={field} />
                        </>
                    )}
                />
            </div>

            <div>
                <form.Field
                    name="summary"
                    children={(field) => (
                        <>
                            <label htmlFor={field.name} className="label">
                                <span className="label-text font-medium">Summary</span>
                            </label>
                            <textarea
                                id={field.name}
                                name={field.name}
                                placeholder="Brief description of the bookmark..."
                                className="textarea textarea-bordered w-full min-h-[100px]"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                            />
                            <FieldInfo field={field} />
                        </>
                    )}
                />
            </div>

            <div className="flex justify-end">
                <form.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                    children={([canSubmit, isSubmitting]) => (
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!canSubmit || isSubmitting}
                        >
                            {isSubmitting ? 'Adding...' : 'Add Bookmark'}
                        </button>
                    )}
                />
            </div>
        </form>
    )
}
