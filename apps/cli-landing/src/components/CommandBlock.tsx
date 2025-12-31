import { CopyButton } from './CopyButton'

interface CommandBlockProps {
  title: string
  description: string
  command: string
  output: string
}

export function CommandBlock({ title, description, command, output }: CommandBlockProps) {
  return (
    <div className="bg-base-100 rounded-lg overflow-hidden shadow-lg">
      <div className="p-4 border-b border-base-content/10">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-base-content/70">{description}</p>
      </div>

      {/* Command */}
      <div className="bg-neutral p-4 font-mono text-sm">
        <div className="flex items-center justify-between gap-4">
          <code className="text-success overflow-x-auto whitespace-nowrap">
            <span className="text-primary">$ </span>
            {command}
          </code>
          <CopyButton text={command} className="text-neutral-content flex-shrink-0" />
        </div>
      </div>

      {/* Output */}
      <div className="bg-neutral/80 p-4 font-mono text-xs text-neutral-content/80 border-t border-base-content/5">
        <pre className="whitespace-pre-wrap">{output}</pre>
      </div>
    </div>
  )
}
