import type { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  command: string
}

export function FeatureCard({ icon: Icon, title, description, command }: FeatureCardProps) {
  return (
    <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="card-body">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="card-title text-lg">{title}</h3>
        <p className="text-base-content/70 text-sm">{description}</p>

        {/* Mini command preview */}
        <div className="mt-4 bg-base-200 rounded-md p-2 font-mono text-xs text-primary overflow-x-auto">
          <span className="text-base-content/50">$ </span>
          {command}
        </div>
      </div>
    </div>
  )
}
