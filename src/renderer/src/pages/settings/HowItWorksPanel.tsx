import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Entry {
  q: string
  a: React.ReactNode
}

interface Section {
  title: string
  entries: Entry[]
}

const SECTIONS: Section[] = [
  {
    title: 'Projects & Superintendents',
    entries: [
      {
        q: 'What is a superintendent’s "Home Project"?',
        a: (
          <>
            The project they’re normally assigned to, set on their profile under{' '}
            <span className="font-semibold text-text-primary">Superintendents</span>. It’s
            what the app compares against when you log a walk, to figure out whether this walk is
            their own site or somewhere else.
          </>
        )
      },
      {
        q: 'What does "Cross-Project" mean on a walk?',
        a: (
          <>
            When you start a Job Walk, you pick a superintendent and a project. If that project
            matches their Home Project, the app labels the walk{' '}
            <span className="font-semibold text-text-primary">Home</span>. If it’s a different
            project - you’re checking on a site they’re just covering, helping out on, or
            visiting for some other reason - it’s labeled{' '}
            <span className="font-semibold text-text-primary">Cross-Project</span> automatically.
            It’s just a label on the walk record so anyone reading the history or a report
            later knows whether a score reflects the super’s own site or somewhere they were
            just passing through. It doesn’t change how the walk is scored.
          </>
        )
      },
      {
        q: 'Can a superintendent or project be removed?',
        a: 'Archived, not deleted - their history (past walks, scores, action items) stays intact and visible, they just drop out of the active pickers when starting a new walk.'
      }
    ]
  },
  {
    title: 'Job Walks & Scoring',
    entries: [
      {
        q: 'How does scoring work?',
        a: (
          <>
            Each checklist item gets a score of{' '}
            <span className="font-semibold text-text-primary">1 to 5</span>, or marked{' '}
            <span className="font-semibold text-text-primary">N/A</span> if it doesn’t apply
            this visit. 4-5 is green, 3 is yellow, 1-2 is red - same scale for individual items and
            for category/overall scores. A category’s score is just the average of its
            scored items (N/A items don’t count toward the average either way).
          </>
        )
      },
      {
        q: 'What’s the "weighted overall" score?',
        a: (
          <>
            Each category (Safety, Schedule, Quality, etc.) has a weight, set under{' '}
            <span className="font-semibold text-text-primary">Settings &gt; Checklist</span> -
            higher weight means it counts for more of the overall number. The overall score is
            each category’s average score multiplied by its weight, added up, divided by the
            total weight of everything that got scored.
          </>
        )
      },
      {
        q: 'What are "GS-only" categories?',
        a: (
          <>
            Categories like Near-Miss Reporting or Site Culture Observation that you still score
            1-5 for your own tracking, but that never count toward the superintendent’s
            weighted overall score - they’re your notes on the situation, not part of their
            grade. Marked <span className="font-semibold text-text-primary">GS-only</span> under
            Settings &gt; Checklist.
          </>
        )
      },
      {
        q: 'How often does an item need to be scored?',
        a: (
          <>
            Set per item under Checklist:{' '}
            <span className="font-semibold text-text-primary">Weekly</span> shows every walk,{' '}
            <span className="font-semibold text-text-primary">Monthly</span> shows once until it’s
            been scored that calendar month for that superintendent/project, and{' '}
            <span className="font-semibold text-text-primary">Once per job</span> shows until
            it’s ever been scored once for that pairing, then never again.
          </>
        )
      },
      {
        q: 'What makes a walk a "red flag" on the weekly report?',
        a: 'Safety or Schedule scoring 2 or below, or any category scoring below 3 (yellow doesn’t count - only red).'
      }
    ]
  },
  {
    title: 'Action Items',
    entries: [
      {
        q: 'Where do action items come from?',
        a: 'Created directly on Action Items, from a Job Walk in progress, from Claude over MCP (tagged with that origin so it’s never mistaken for something you typed), or imported from Procore observations (only when the Procore preview is turned on - see below).'
      },
      {
        q: 'What do the statuses mean?',
        a: (
          <>
            <span className="font-semibold text-text-primary">Open</span> - not started.{' '}
            <span className="font-semibold text-text-primary">Carried</span> - rolled to a later
            week, still open. <span className="font-semibold text-text-primary">Escalated</span> -
            flagged up as higher priority.{' '}
            <span className="font-semibold text-text-primary">Closed</span> - done. An item is{' '}
            <span className="font-semibold text-text-primary">overdue</span> if its due date has
            passed and it isn’t closed yet.
          </>
        )
      }
    ]
  },
  {
    title: 'Dashboard & Reports',
    entries: [
      {
        q: 'What’s on the Dashboard?',
        a: 'A matrix of every superintendent against every project they’ve walked, colored by score, plus each superintendent’s own walk history over time.'
      },
      {
        q: 'What’s the difference between the full report and the exec summary?',
        a: 'The full report is every walk that week with full detail. The exec summary is the condensed, leadership-facing version - red flags and highlights, not a full transcript. Both export to PDF and get saved as snapshots you can reopen later under Reports.'
      }
    ]
  },
  {
    title: 'Backups & Data',
    entries: [
      {
        q: 'Is my data safe if something goes wrong?',
        a: 'Automatic backups run daily and on quit, kept under Settings > Backup & Data, where you can also trigger one manually, restore from an earlier one, or export/import everything as a single JSON file (e.g. to move to a new computer).'
      },
      {
        q: 'Where does the data actually live?',
        a: 'One file on this computer only - never a cloud account, never a server. Nothing about your projects, scores, or people leaves this machine unless you export it yourself.'
      }
    ]
  },
  {
    title: 'MCP (Claude connector)',
    entries: [
      {
        q: 'What is MCP, in plain terms?',
        a: 'A way to let Claude (the AI) read and write this app’s data directly when you ask it to - log a walk, create an action item, pull up a report - without you switching apps or Claude needing internet access to some cloud version of this data. It only runs while Renvor is open, and everything stays on this computer.'
      },
      {
        q: 'Do I need this?',
        a: 'No - the app works completely normally without it. It’s only useful if you want to talk to Claude Desktop about your projects and have it actually see and update your real data. Setup steps are under Settings > MCP.'
      }
    ]
  },
  {
    title: 'Updates',
    entries: [
      {
        q: 'How do I get a new version?',
        a: 'Renvor checks for new versions on its own. When one is out, an "Update to vX.Y.Z" button appears at the top of the app (and under Settings > About > Updates, where you can also check by hand). Click it: Renvor downloads the update, backs up your data, installs, and reopens. Nothing installs unless you click, and your projects, walks, and settings are kept.'
      }
    ]
  },
  {
    title: 'Phone App',
    entries: [
      {
        q: 'How does the phone app work?',
        a: 'Turn it on under Settings > Phone App, install Tailscale (free) on this computer and your phone, scan the code, and add it to your Home Screen. It opens the same Renvor - same projects, walks, and scores as this computer, live - from anywhere, as long as this computer is on and Renvor is running (closing the window keeps it in the system tray). Your data stays on this computer; Tailscale just makes a private encrypted connection between your own devices.'
      },
      {
        q: 'Is it safe?',
        a: 'It’s off until you turn it on. Only devices signed into your own Tailscale account (or on your Wi-Fi) can reach it, and the link also contains a long random secret stored on this computer. Treat the link like a password - Reset link (in the Phone App help section) cuts off every phone using the old one.'
      },
      {
        q: 'What can’t I do from the phone?',
        a: 'Anything that needs this computer itself: saving PDFs, backups and restore, the Claude connector, and phone setup. Everything you do day to day works.'
      }
    ]
  },
  {
    title: 'Customize',
    entries: [
      {
        q: 'Can I change how the app works?',
        a: 'Yes. Every install includes its own source code. Settings > Customize copies it to a folder you can edit and gives you a prompt to paste into an AI coding tool (Claude Code, Cursor, etc.) that explains the app and walks it through making and packaging your changes. Your data is never touched by code changes.'
      }
    ]
  },
  {
    title: 'Procore',
    entries: [
      {
        q: 'Is Procore actually connected?',
        a: 'Not yet - turning on "Preview with mock data" on the Procore page shows what the integration will look like (a weekly Procore panel, importing observations as action items) using realistic fake data, so the shape of the feature is real even though no live Procore account is connected.'
      }
    ]
  }
]

function AccordionItem({ entry }: { entry: Entry }): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border-subtle py-2.5 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 text-left text-sm text-text-primary"
      >
        <span>{entry.q}</span>
        {open ? (
          <ChevronUp size={14} className="shrink-0 text-text-muted" />
        ) : (
          <ChevronDown size={14} className="shrink-0 text-text-muted" />
        )}
      </button>
      {open && <div className="mt-1.5 text-xs leading-relaxed text-text-secondary">{entry.a}</div>}
    </div>
  )
}

export function HowItWorksPanel(): JSX.Element {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">How It Works</h2>
        <p className="mt-1 text-xs text-text-muted">
          Plain-language explanations of every concept in the app - click a question to expand it.
          For first-time setup steps, see Getting Started instead.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {section.title}
          </h3>
          <div className="mt-2 rounded-control border border-border-subtle bg-surface-2 px-4">
            {section.entries.map((entry) => (
              <AccordionItem key={entry.q} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
