import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
}

// ---------------------------------------------------------------------------
// settings (key/value)
// ---------------------------------------------------------------------------
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull() // JSON-encoded
})

// ---------------------------------------------------------------------------
// people (report recipients / escalation contacts)
// ---------------------------------------------------------------------------
export const people = sqliteTable('people', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  title: text('title'),
  email: text('email').notNull(),
  role: text('role', { enum: ['vp_ops', 'executive', 'pm', 'other'] }).notNull(),
  receivesFullReport: integer('receives_full_report', { mode: 'boolean' }).notNull().default(false),
  receivesExecSummary: integer('receives_exec_summary', { mode: 'boolean' }).notNull().default(false),
  ...timestamps
})

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  number: text('number'),
  pmName: text('pm_name'),
  pmEmail: text('pm_email'),
  address: text('address'),
  status: text('status', { enum: ['active', 'closed'] }).notNull().default('active'),
  procoreProjectId: text('procore_project_id'),
  procoreCompanyId: text('procore_company_id'),
  deletedAt: text('deleted_at'),
  ...timestamps
})

// ---------------------------------------------------------------------------
// superintendents
// ---------------------------------------------------------------------------
export const superintendents = sqliteTable('superintendents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  yearsExperience: real('years_experience'),
  homeProjectId: text('home_project_id').references(() => projects.id),
  nccerStatus: text('nccer_status', {
    enum: ['not_started', 'in_progress', 'completed']
  })
    .notNull()
    .default('not_started'),
  notes: text('notes'),
  procoreUserId: text('procore_user_id'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  deletedAt: text('deleted_at'),
  ...timestamps
})

// ---------------------------------------------------------------------------
// super_custom_fields
// ---------------------------------------------------------------------------
export const superCustomFields = sqliteTable('super_custom_fields', {
  id: text('id').primaryKey(),
  superintendentId: text('superintendent_id')
    .notNull()
    .references(() => superintendents.id),
  label: text('label').notNull(),
  value: text('value').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps
})

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  weight: real('weight'),
  isGsOnly: integer('is_gs_only', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps
})

// ---------------------------------------------------------------------------
// checklist_items
// ---------------------------------------------------------------------------
export const checklistItems = sqliteTable('checklist_items', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  text: text('text').notNull(),
  frequency: text('frequency', { enum: ['weekly', 'monthly', 'once_per_job'] })
    .notNull()
    .default('weekly'),
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps
})

// ---------------------------------------------------------------------------
// walks
// ---------------------------------------------------------------------------
export const walks = sqliteTable('walks', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  superintendentId: text('superintendent_id')
    .notNull()
    .references(() => superintendents.id),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  pmNameSnapshot: text('pm_name_snapshot'),
  visitType: text('visit_type', { enum: ['home', 'cross_project'] }).notNull(),
  overallNotes: text('overall_notes'),
  followupNotes: text('followup_notes'),
  status: text('status', { enum: ['draft', 'submitted'] }).notNull().default('draft'),
  submittedAt: text('submitted_at'),
  lastEditedAt: text('last_edited_at'),
  deletedAt: text('deleted_at'),
  ...timestamps
})

// ---------------------------------------------------------------------------
// walk_item_scores
// ---------------------------------------------------------------------------
export const walkItemScores = sqliteTable('walk_item_scores', {
  id: text('id').primaryKey(),
  walkId: text('walk_id')
    .notNull()
    .references(() => walks.id),
  checklistItemId: text('checklist_item_id')
    .notNull()
    .references(() => checklistItems.id),
  itemTextSnapshot: text('item_text_snapshot').notNull(),
  score: integer('score'), // 1-5, null = unscored
  isNa: integer('is_na', { mode: 'boolean' }).notNull().default(false),
  ...timestamps
})

// ---------------------------------------------------------------------------
// walk_category_notes
// ---------------------------------------------------------------------------
export const walkCategoryNotes = sqliteTable('walk_category_notes', {
  id: text('id').primaryKey(),
  walkId: text('walk_id')
    .notNull()
    .references(() => walks.id),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  notes: text('notes'),
  ...timestamps
})

// ---------------------------------------------------------------------------
// action_items
// ---------------------------------------------------------------------------
export const actionItems = sqliteTable('action_items', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  ownerType: text('owner_type', { enum: ['gs', 'superintendent', 'pm'] }).notNull(),
  superintendentId: text('superintendent_id').references(() => superintendents.id),
  projectId: text('project_id').references(() => projects.id),
  dueDate: text('due_date'),
  priority: text('priority', { enum: ['high', 'medium', 'low'] }).notNull().default('medium'),
  status: text('status', { enum: ['open', 'carried', 'closed', 'escalated'] })
    .notNull()
    .default('open'),
  source: text('source', { enum: ['walk', 'manual', 'mcp', 'ai_text', 'ai_walk_scan', 'procore'] })
    .notNull()
    .default('manual'),
  sourceSummary: text('source_summary'),
  originWalkId: text('origin_walk_id').references(() => walks.id),
  includeInReport: integer('include_in_report', { mode: 'boolean' }).notNull().default(true),
  closedAt: text('closed_at'),
  deletedAt: text('deleted_at'),
  ...timestamps
})

// ---------------------------------------------------------------------------
// action_item_events (audit trail)
// ---------------------------------------------------------------------------
export const actionItemEvents = sqliteTable('action_item_events', {
  id: text('id').primaryKey(),
  actionItemId: text('action_item_id')
    .notNull()
    .references(() => actionItems.id),
  event: text('event', {
    enum: ['created', 'edited', 'carried', 'closed', 'escalated', 'de_escalated', 'reopened']
  }).notNull(),
  walkId: text('walk_id').references(() => walks.id),
  note: text('note'),
  notified: text('notified'), // JSON list of person ids
  createdAt: text('created_at').notNull()
})

// ---------------------------------------------------------------------------
// report_snapshots (finished weekly reports, frozen at export time)
// ---------------------------------------------------------------------------
export const reportSnapshots = sqliteTable('report_snapshots', {
  id: text('id').primaryKey(),
  reportType: text('report_type', { enum: ['full', 'executive'] }).notNull(),
  weekStart: text('week_start').notNull(),
  data: text('data').notNull(), // JSON-encoded assembled report payload
  pdfPath: text('pdf_path'),
  preparedBy: text('prepared_by'),
  createdAt: text('created_at').notNull()
})
