import { Info } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="px-4 py-2 bg-muted border-t border-border">
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Info className="w-3 h-3" />
        <span>Auto-refresh enabled. Prices update every 5 seconds.</span>
      </div>
    </footer>
  )
}
