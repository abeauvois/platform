import { useTypewriter, type TerminalLine } from '@/hooks/useTypewriter'

const DEMO_SEQUENCE: TerminalLine[] = [
  { type: 'comment', text: '# List recent emails from Gmail', delay: 500 },
  { type: 'command', text: 'platform list source gmail --limit-days=7', delay: 300 },
  { type: 'output', text: 'Gmail Source read', delay: 800 },
  { type: 'output', text: 'Configuration:', delay: 100 },
  { type: 'output', text: '  Filter: user@gmail.com', delay: 50 },
  { type: 'output', text: '  Limit: 7 days', delay: 50 },
  { type: 'output', text: 'Found 23 messages', delay: 400 },
  { type: 'comment', text: '', delay: 1200 },
  { type: 'comment', text: '# Ingest emails containing URLs', delay: 300 },
  { type: 'command', text: 'platform ingest source gmail --with-url', delay: 300 },
  { type: 'output', text: 'Starting ingestion workflow...', delay: 600 },
  { type: 'output', text: 'Fetching Gmail messages...', delay: 400 },
  { type: 'output', text: 'Processed 12 emails with URLs', delay: 600 },
  { type: 'output', text: 'Ingestion completed successfully!', delay: 300 },
]

export function AnimatedTerminal() {
  const { visibleLines, currentText, isTyping } = useTypewriter(DEMO_SEQUENCE)

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Terminal Window Chrome */}
      <div className="bg-base-100 rounded-t-lg border border-base-content/20 border-b-0">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="w-3 h-3 rounded-full bg-error"></div>
          <div className="w-3 h-3 rounded-full bg-warning"></div>
          <div className="w-3 h-3 rounded-full bg-success"></div>
          <span className="ml-4 text-sm text-base-content/50 font-mono">
            platform-cli
          </span>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="bg-neutral text-neutral-content rounded-b-lg border border-base-content/20 border-t-0 p-4 font-mono text-sm text-left min-h-[320px] overflow-hidden">
        {visibleLines.map((line, index) => (
          <TerminalLineDisplay key={index} line={line} />
        ))}

        {/* Currently typing line */}
        {isTyping && currentText && (
          <div className="text-success">
            <span className="text-primary">$ </span>
            <span>{currentText}</span>
            <span className="inline-block w-2 h-4 bg-primary ml-0.5 cursor-blink"></span>
          </div>
        )}

        {/* Idle cursor */}
        {!isTyping && (
          <div>
            <span className="text-primary">$ </span>
            <span className="inline-block w-2 h-4 bg-primary ml-0.5 cursor-blink"></span>
          </div>
        )}
      </div>
    </div>
  )
}

function TerminalLineDisplay({ line }: { line: TerminalLine }) {
  if (line.type === 'comment') {
    return (
      <div className="text-base-content/50 leading-relaxed">
        {line.text}
      </div>
    )
  }

  if (line.type === 'command') {
    return (
      <div className="text-success leading-relaxed">
        <span className="text-primary">$ </span>
        {line.text}
      </div>
    )
  }

  return (
    <div className="text-neutral-content/80 leading-relaxed">
      {line.text}
    </div>
  )
}
