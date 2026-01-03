import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@platform/ui'
import { SOURCE_ADAPTERS } from '@platform/platform-domain/browser'
import { useForm } from '@tanstack/react-form'

import type { SourceAdapter } from '@platform/platform-domain/browser'

interface BookmarkFormData {
  url: string
  sourceAdapter: SourceAdapter
  tags: Array<string>
  summary: string
}

interface BookmarkFormProps {
  onSubmit: (data: BookmarkFormData) => void | Promise<void>
}

function FieldInfo({ field }: Readonly<{ field: any }>) {
  return (
    <>
      {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
        <em className="text-destructive text-sm">
          {field.state.meta.errors.join(', ')}
        </em>
      ) : null}
      {field.state.meta.isValidating ? (
        <span className="text-sm text-muted-foreground">Validating...</span>
      ) : null}
    </>
  )
}

export function BookmarkForm({ onSubmit }: Readonly<BookmarkFormProps>) {
  const form = useForm({
    defaultValues: {
      url: '',
      sourceAdapter: 'None' as SourceAdapter,
      tagsInput: '',
      summary: '',
    },
    onSubmit: async ({ value }) => {
      const tags = value.tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      await onSubmit({
        url: value.url,
        sourceAdapter: value.sourceAdapter,
        tags,
        summary: value.summary,
      })

      // Reset form after successful submission
      form.reset()
    },
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
      <div className="space-y-2">
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
            },
          }}
        >
          {(field) => (
            <>
              <Label htmlFor={field.name}>URL</Label>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                placeholder="https://example.com"
                className="w-full"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldInfo field={field} />
            </>
          )}
        </form.Field>
      </div>

      <div className="space-y-2">
        <form.Field
          name="sourceAdapter"
          validators={{
            onChange: ({ value }) => {
              if (value === 'None') {
                return 'Please select a valid source'
              }
              return undefined
            },
          }}
        >
          {(field) => (
            <>
              <Label htmlFor={field.name}>Source Adapter</Label>
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  field.handleChange(value as SourceAdapter)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_ADAPTERS.map((adapter) => (
                    <SelectItem key={adapter} value={adapter}>
                      {adapter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldInfo field={field} />
            </>
          )}
        </form.Field>
      </div>

      <div className="space-y-2">
        <form.Field name="tagsInput">
          {(field) => (
            <>
              <Label htmlFor={field.name}>Tags</Label>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                placeholder="tech, programming, ai (comma-separated)"
                className="w-full"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldInfo field={field} />
            </>
          )}
        </form.Field>
      </div>

      <div className="space-y-2">
        <form.Field name="summary">
          {(field) => (
            <>
              <Label htmlFor={field.name}>Summary</Label>
              <Textarea
                id={field.name}
                name={field.name}
                placeholder="Brief description of the bookmark..."
                className="w-full min-h-[100px]"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldInfo field={field} />
            </>
          )}
        </form.Field>
      </div>

      <div className="flex justify-end">
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Bookmark'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
