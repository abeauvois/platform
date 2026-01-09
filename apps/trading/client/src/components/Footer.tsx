import { Info } from 'lucide-react'

export default function Footer() {
  return (
    <section className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <Info className="w-3 h-3" />
      <span>Auto-refresh enabled. Prices update every 5 seconds.</span>
    </section>
  )
}
