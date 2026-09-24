export interface SeedCategory {
  key: string
  name: string
  weight: number | null
  isGsOnly: boolean
  sortOrder: number
  items: string[]
}

/**
 * Appendix A seed checklist, copied exactly. Where the original prototype
 * hardcoded "Watts", the item text uses the {{COMPANY}} placeholder instead -
 * render it with renderCompanyText() using the company name from Settings.
 * All frequencies are weekly (per spec); a GS can change frequency per item
 * later in Settings > Checklist editor.
 */
export const CATEGORY_SEED: SeedCategory[] = [
  {
    key: 'safety',
    name: 'Safety',
    weight: 18,
    isGsOnly: false,
    sortOrder: 0,
    items: [
      'OSHA 30 current & fall protection training documented',
      '{{COMPANY}} Safety Kit on-site (manual, first aid, extinguishers)',
      'Toolbox Talk hosted & recorded in Procore this week',
      'Procore Safety Inspections up to date',
      'Independent OSHA Safety Audit scheduled (≥$1M projects)',
      'SWPPP inspection completed (after rain / bi-weekly)',
      'No recordable incidents or safety fines this period'
    ]
  },
  {
    key: 'schedule',
    name: 'Schedule',
    weight: 18,
    isGsOnly: false,
    sortOrder: 1,
    items: [
      'Look Ahead Schedule updated weekly in Procore',
      'All subs & suppliers know the company schedule and are following it',
      'Collaborative environment — all parties working efficiently',
      'Proactively identifying problems before they impact construction',
      'On track for next milestone',
      'Superintendent collaborative with owner & subs on schedule'
    ]
  },
  {
    key: 'quality_control',
    name: 'Quality Control',
    weight: 18,
    isGsOnly: false,
    sortOrder: 2,
    items: [
      'SWPPP inspections happening bi-weekly & after rain events',
      'Every applicable trade inspection performed',
      'Project built to spec, industry, and company standards',
      'Observations created in Procore for quality issues',
      'Sub self-inspections completed before GC review',
      'Rework / punch list items low and tracked to closure'
    ]
  },
  {
    key: 'superintendent_traits',
    name: 'Superintendent Traits',
    weight: 15,
    isGsOnly: false,
    sortOrder: 3,
    items: [
      'Proactive — go-getter attitude with QC, schedule, and safety',
      'Problem solver — "no excuses" attitude',
      'Independent, motivated, and relentless',
      'Decision maker — confident in making the correct call',
      'Communicator and collaborator with subs',
      'Motivator when dealing with subcontractors'
    ]
  },
  {
    key: 'knowledge',
    name: 'Knowledge',
    weight: 7,
    isGsOnly: false,
    sortOrder: 4,
    items: [
      'Committed to professional growth this period',
      'Familiar with all project documents',
      'Full scope understood — all un-awarded subs/suppliers identified',
      'RFIs researched, documented, and submitted to PM',
      'Involved in design through means & methods'
    ]
  },
  {
    key: 'customer_service',
    name: 'Customer Service & Professionalism',
    weight: 6,
    isGsOnly: false,
    sortOrder: 5,
    items: [
      'Strong partnership with Project Manager',
      'Strong partnership with Owner',
      'Distinctive attitude — extra mile, great attitude',
      'Demonstrates responsibility, honesty, follow-through',
      'Professional, clear, organized site environment',
      'Site cleaned weekly and maintained daily'
    ]
  },
  {
    key: 'budget',
    name: 'Budget',
    weight: 6,
    isGsOnly: false,
    sortOrder: 6,
    items: [
      'All back charges sent to PM before work performed',
      'Costs minimized across the project',
      'No unnecessary temp labor, rentals, or equipment costs'
    ]
  },
  {
    key: 'rocks',
    name: 'Rocks',
    weight: 6,
    isGsOnly: false,
    sortOrder: 7,
    items: [
      'On track to complete Rocks assigned since last evaluation',
      'Rocks will be completed before next Quarterly State of Company meeting'
    ]
  },
  {
    key: 'record_keeping',
    name: 'Record Keeping',
    weight: 6,
    isGsOnly: false,
    sortOrder: 8,
    items: [
      'Daily reports filled out fully with quality photos',
      'Observations conducted minimum twice/week in Procore',
      'As-Built changes recorded as identified',
      'Project progress documented via video, photos, meeting minutes',
      'PM and Owner informed fairly on all changes'
    ]
  },
  {
    key: 'near_miss_reporting',
    name: 'Near-Miss Reporting',
    weight: null,
    isGsOnly: true,
    sortOrder: 9,
    items: [
      'Near-miss incidents actively logged — not just recordables',
      'Culture of reporting without blame observed on site',
      'Near-misses reviewed and addressed with crew'
    ]
  },
  {
    key: 'rework_punch_volume',
    name: 'Rework / Punch List Volume',
    weight: null,
    isGsOnly: true,
    sortOrder: 10,
    items: [
      'Rework volume low — issues caught before they repeat',
      'Open punch list items tracked and moving toward closure',
      'Root cause identified for any significant rework'
    ]
  },
  {
    key: 'subcontractor_communication',
    name: 'Subcontractor Communication',
    weight: null,
    isGsOnly: true,
    sortOrder: 11,
    items: [
      'Pre-construction meetings held before each trade starts',
      'Subs notified of schedule changes proactively',
      'Sub relationship — collaborative, not adversarial',
      'Senior sub leadership relationship maintained',
      'Weekly internal project meeting hosted'
    ]
  },
  {
    key: 'site_culture_observation',
    name: 'Site Culture Observation',
    weight: null,
    isGsOnly: true,
    sortOrder: 12,
    items: [
      'Crew morale and attitude positive',
      'Super sets the tone — calm, professional, leads by example',
      'Workers feel comfortable raising concerns',
      'Organized and clean site environment maintained',
      'Subcontractors treated as partners'
    ]
  }
]

export function renderCompanyText(text: string, companyName: string): string {
  const name = companyName.trim() || 'Company'
  return text.replaceAll('{{COMPANY}}', name)
}
