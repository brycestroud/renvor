import { useQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { McpConnectBox } from './McpConnectBox'
import { gsApi } from '../../lib/gsApi'
import type { Group } from '../Settings'

function StepCard({
  number,
  title,
  children,
  action
}: {
  number: number
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}): JSX.Element {
  return (
    <div className="rounded-control border border-border-subtle bg-surface-2 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-muted font-mono text-xs font-semibold text-brand">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <div className="mt-1 text-xs text-text-secondary">{children}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  )
}

export function GettingStartedPanel({ onNavigate }: { onNavigate: (group: Group) => void }): JSX.Element {
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Getting Started</h2>
        <p className="mt-1 text-xs text-text-muted">
          What to do the first time you open Renvor - and what to hand off if you&apos;re setting
          this up for someone else.
        </p>
      </div>

      <StepCard number={1} title="Install and launch">
        Run the Renvor installer. No account, no sign-in - everything lives in one file on this
        computer. The first launch asks for a company name and your name; nothing is pre-filled or
        hardcoded.
      </StepCard>

      <StepCard
        number={2}
        title="Check your company info"
        action={
          <button
            onClick={() => onNavigate('company')}
            className="rounded-control border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover"
          >
            Go to Company
          </button>
        }
      >
        {settings?.onboardingComplete ? (
          <span className="flex items-center gap-1.5 text-success">
            <CheckCircle2 size={13} /> Set up as &quot;{settings.companyName || 'unnamed'}&quot;. Edit anytime.
          </span>
        ) : (
          'Company name, GS name, and brand colors - set during onboarding, editable anytime here.'
        )}
      </StepCard>

      <StepCard
        number={3}
        title="Add your projects, superintendents, and checklist"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('checklist')}
              className="rounded-control border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover"
            >
              Go to Checklist
            </button>
            <button
              onClick={() => onNavigate('people')}
              className="rounded-control border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover"
            >
              Go to People
            </button>
          </div>
        }
      >
        Projects and Superintendents live in the sidebar, not here. The seeded checklist covers
        Safety/Schedule/Quality/etc out of the box - adjust weights or add items under Checklist.
        Add report recipients under People.
      </StepCard>

      <StepCard
        number={4}
        title="Connect Claude Desktop (optional)"
        action={
          <button
            onClick={() => onNavigate('mcp')}
            className="rounded-control border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover"
          >
            Go to MCP
          </button>
        }
      >
        <p>
          Lets Claude read/write this app&apos;s data directly - no API key, nothing leaves this
          computer. Three steps: open Claude Desktop, go to Settings &gt; Connectors &gt; Add
          custom connector, and paste the URL below. Only works while Renvor is open.
        </p>
        <div className="mt-3">
          <McpConnectBox />
        </div>
      </StepCard>
    </div>
  )
}
