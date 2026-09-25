/**
 * Standalone MCP server - the "full read/write" Claude Desktop connector
 * from the Phase 1 answer. Runs as its own local process, reads/writes the
 * exact same SQLite file (WAL mode) the Electron app uses, and never talks
 * to a network - this is a local pipe between Claude and the on-disk data,
 * not an AI-extraction feature calling out to an API.
 *
 * Must be launched via `npm run mcp` (see scripts/run-mcp.js), NOT plain
 * `node`/`tsx`: better-sqlite3 here is compiled against Electron's Node ABI
 * (see package.json postinstall), so this process needs to actually be the
 * Electron binary running in ELECTRON_RUN_AS_NODE mode to load it.
 */
import { join } from 'path'
import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { runMigrations } from '@main/db/migrate'
import { getAllSettings } from '@main/ipc/settingsRepo'
import { listProjects, createProject, updateProject, archiveProject } from '@main/ipc/projectsRepo'
import {
  listSuperintendents,
  createSuperintendent,
  updateSuperintendent,
  archiveSuperintendent
} from '@main/ipc/superintendentsRepo'
import { listPeople, createPerson, updatePerson, deletePerson } from '@main/ipc/peopleRepo'
import { listCategoriesWithItems, updateCategoryWeight } from '@main/ipc/categoriesRepo'
import { createChecklistItem, updateChecklistItem } from '@main/ipc/checklistItemsRepo'
import {
  listRecentWalks,
  getWalk,
  createWalk,
  updateWalkHeader,
  setItemScore,
  markAllRemainingNa,
  setCategoryNote,
  getItemHistory,
  submitWalk,
  archiveWalk
} from '@main/ipc/walksRepo'
import {
  listOpenActionItemsForSuperProject,
  listAllActionItems,
  createActionItem,
  updateActionItem,
  transitionActionItem,
  deleteActionItem,
  getActionItemEvents
} from '@main/ipc/actionItemsRepo'
import { getMatrix, getSuperintendentWalkHistory } from '@main/ipc/dashboardRepo'
import { getWeekNotes, getFullReportData } from '@main/ipc/reportsRepo'
import {
  createProjectInput,
  updateProjectInput,
  createSuperintendentInput,
  updateSuperintendentInput,
  createPersonInput,
  updatePersonInput,
  updateCategoryWeightInput,
  createChecklistItemInput,
  updateChecklistItemInput,
  createWalkInput,
  updateWalkHeaderInput,
  setItemScoreInput,
  markAllRemainingNaInput,
  setCategoryNoteInput,
  getItemHistoryInput,
  submitWalkInput,
  listOpenActionItemsInput,
  createActionItemInput,
  updateActionItemInput,
  transitionActionItemInput,
  getActionItemEventsInput,
  getMatrixInput
} from '@shared/ipc-contract'

function ok(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
}

function fail(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error)
  return { content: [{ type: 'text', text: message }], isError: true }
}

function wrap<Args, Result>(fn: (args: Args) => Result): (args: Args) => Promise<CallToolResult> {
  return async (args: Args) => {
    try {
      return ok(fn(args))
    } catch (error) {
      return fail(error)
    }
  }
}

function wrap0<Result>(fn: () => Result): () => Promise<CallToolResult> {
  return async () => {
    try {
      return ok(fn())
    } catch (error) {
      return fail(error)
    }
  }
}

const server = new McpServer({ name: 'gs-field-ops', version: '1.0.0' })

// ---------------------------------------------------------------------------
// Settings (read-only - company name/branding stay a Settings-UI-only edit,
// not something Claude changes mid-conversation)
// ---------------------------------------------------------------------------
server.registerTool(
  'get_settings',
  { title: 'Get settings', description: 'Company name, GS name, and other app-wide settings.' },
  wrap0(() => getAllSettings())
)

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
server.registerTool(
  'list_projects',
  { title: 'List projects', description: 'All active and closed projects.' },
  wrap0(() => listProjects())
)
server.registerTool(
  'create_project',
  { title: 'Create project', description: 'Create a new project.', inputSchema: createProjectInput.shape },
  wrap(createProject)
)
server.registerTool(
  'update_project',
  { title: 'Update project', description: 'Update an existing project by id.', inputSchema: updateProjectInput.shape },
  wrap(updateProject)
)
server.registerTool(
  'archive_project',
  {
    title: 'Archive project',
    description: 'Soft-delete a project. Reversible only by direct DB edit, so confirm with the user first.',
    inputSchema: { id: z.string() }
  },
  wrap(({ id }: { id: string }) => archiveProject(id))
)

// ---------------------------------------------------------------------------
// Superintendents
// ---------------------------------------------------------------------------
server.registerTool(
  'list_superintendents',
  { title: 'List superintendents', description: 'All active and inactive superintendents.' },
  wrap0(() => listSuperintendents())
)
server.registerTool(
  'create_superintendent',
  {
    title: 'Create superintendent',
    description: 'Create a new superintendent.',
    inputSchema: createSuperintendentInput.shape
  },
  wrap(createSuperintendent)
)
server.registerTool(
  'update_superintendent',
  {
    title: 'Update superintendent',
    description: 'Update an existing superintendent by id.',
    inputSchema: updateSuperintendentInput.shape
  },
  wrap(updateSuperintendent)
)
server.registerTool(
  'archive_superintendent',
  {
    title: 'Archive superintendent',
    description: 'Soft-delete a superintendent. Confirm with the user first.',
    inputSchema: { id: z.string() }
  },
  wrap(({ id }: { id: string }) => archiveSuperintendent(id))
)

// ---------------------------------------------------------------------------
// People (report recipients / escalation contacts)
// ---------------------------------------------------------------------------
server.registerTool(
  'list_people',
  { title: 'List people', description: 'Report recipients and escalation contacts.' },
  wrap0(() => listPeople())
)
server.registerTool(
  'create_person',
  { title: 'Create person', description: 'Add a report recipient / escalation contact.', inputSchema: createPersonInput.shape },
  wrap(createPerson)
)
server.registerTool(
  'update_person',
  { title: 'Update person', description: 'Update an existing person by id.', inputSchema: updatePersonInput.shape },
  wrap(updatePerson)
)
server.registerTool(
  'delete_person',
  {
    title: 'Delete person',
    description: 'Permanently remove a person. This is a hard delete - confirm with the user first.',
    inputSchema: { id: z.string() }
  },
  wrap(({ id }: { id: string }) => deletePerson(id))
)

// ---------------------------------------------------------------------------
// Categories & checklist items
// ---------------------------------------------------------------------------
server.registerTool(
  'list_categories',
  { title: 'List categories', description: 'All scoring categories with their checklist items and weights.' },
  wrap0(() => listCategoriesWithItems())
)
server.registerTool(
  'update_category_weight',
  {
    title: 'Update category weight',
    description: 'Set a category\'s weight (null = equal weighting).',
    inputSchema: updateCategoryWeightInput.shape
  },
  wrap(updateCategoryWeight)
)
server.registerTool(
  'create_checklist_item',
  {
    title: 'Create checklist item',
    description: 'Add a custom checklist item to a category.',
    inputSchema: createChecklistItemInput.shape
  },
  wrap(createChecklistItem)
)
server.registerTool(
  'update_checklist_item',
  {
    title: 'Update checklist item',
    description: 'Edit or deactivate a checklist item. Items are never hard-deleted, only deactivated, so historical walk scores stay intact.',
    inputSchema: updateChecklistItemInput.shape
  },
  wrap(updateChecklistItem)
)

// ---------------------------------------------------------------------------
// Walks
// ---------------------------------------------------------------------------
server.registerTool(
  'list_recent_walks',
  {
    title: 'List recent walks',
    description: 'Most recent jobsite walks, newest first.',
    inputSchema: { limit: z.number().int().positive().max(200).optional() }
  },
  wrap(({ limit }: { limit?: number }) => listRecentWalks(limit))
)
server.registerTool(
  'get_walk',
  { title: 'Get walk', description: 'Full detail for one walk, including all scores and notes.', inputSchema: { id: z.string() } },
  wrap(({ id }: { id: string }) => getWalk(id))
)
server.registerTool(
  'create_walk',
  { title: 'Create walk', description: 'Start a new jobsite walk.', inputSchema: createWalkInput.shape },
  wrap(createWalk)
)
server.registerTool(
  'update_walk_header',
  { title: 'Update walk header', description: 'Update a walk\'s date, visit type, or notes.', inputSchema: updateWalkHeaderInput.shape },
  wrap(updateWalkHeader)
)
server.registerTool(
  'set_item_score',
  { title: 'Set item score', description: 'Score (1-5) or mark N/A a single checklist item on a walk.', inputSchema: setItemScoreInput.shape },
  wrap(setItemScore)
)
server.registerTool(
  'mark_all_remaining_na',
  {
    title: 'Mark all remaining N/A',
    description: 'Mark every unscored item on a walk as not-applicable.',
    inputSchema: markAllRemainingNaInput.shape
  },
  wrap(markAllRemainingNa)
)
server.registerTool(
  'set_category_note',
  { title: 'Set category note', description: 'Set the note text for one category on a walk.', inputSchema: setCategoryNoteInput.shape },
  wrap(setCategoryNote)
)
server.registerTool(
  'get_item_history',
  {
    title: 'Get item history',
    description: 'Prior scores for every checklist item, for a superintendent+project pair - what "copy from last walk" uses.',
    inputSchema: getItemHistoryInput.shape
  },
  wrap(getItemHistory)
)
server.registerTool(
  'submit_walk',
  { title: 'Submit walk', description: 'Finalize a walk (locks it as submitted).', inputSchema: submitWalkInput.shape },
  wrap(submitWalk)
)
server.registerTool(
  'archive_walk',
  {
    title: 'Archive walk',
    description: 'Soft-delete a walk. Confirm with the user first.',
    inputSchema: { id: z.string() }
  },
  wrap(({ id }: { id: string }) => archiveWalk(id))
)

// ---------------------------------------------------------------------------
// Action items
// ---------------------------------------------------------------------------
server.registerTool(
  'list_open_action_items',
  {
    title: 'List open action items',
    description: 'Open action items for one superintendent+project pair.',
    inputSchema: listOpenActionItemsInput.shape
  },
  wrap(listOpenActionItemsForSuperProject)
)
server.registerTool(
  'list_all_action_items',
  { title: 'List all action items', description: 'Every action item across all projects/superintendents.' },
  wrap0(() => listAllActionItems())
)
server.registerTool(
  'create_action_item',
  {
    title: 'Create action item',
    description:
      'Create a new action item. When creating on the GS\'s behalf from a chat conversation (e.g. from a pasted email or notes), pass source: "mcp" so its origin is honest in the UI.',
    inputSchema: createActionItemInput.shape
  },
  wrap(createActionItem)
)
server.registerTool(
  'update_action_item',
  { title: 'Update action item', description: 'Edit an action item\'s text, owner, due date, or priority.', inputSchema: updateActionItemInput.shape },
  wrap(updateActionItem)
)
server.registerTool(
  'transition_action_item',
  {
    title: 'Transition action item',
    description: 'Close, carry, escalate, de-escalate, or reopen an action item.',
    inputSchema: transitionActionItemInput.shape
  },
  wrap(transitionActionItem)
)
server.registerTool(
  'delete_action_item',
  {
    title: 'Delete action item',
    description: 'Permanently remove an action item. This is a hard delete - confirm with the user first.',
    inputSchema: { id: z.string() }
  },
  wrap(({ id }: { id: string }) => deleteActionItem(id))
)
server.registerTool(
  'get_action_item_events',
  { title: 'Get action item events', description: 'Full status-change history for one action item.', inputSchema: getActionItemEventsInput.shape },
  wrap(getActionItemEvents)
)

// ---------------------------------------------------------------------------
// Dashboard & reports (read-only)
// ---------------------------------------------------------------------------
server.registerTool(
  'get_dashboard_matrix',
  {
    title: 'Get dashboard matrix',
    description: 'Superintendent x category score matrix for a date range, plus stat tiles and needs-attention list.',
    inputSchema: getMatrixInput.shape
  },
  wrap(getMatrix)
)
server.registerTool(
  'get_superintendent_walk_history',
  {
    title: 'Get superintendent walk history',
    description: 'A superintendent\'s walk scores over time, for trend charts.',
    inputSchema: { superintendentId: z.string() }
  },
  wrap(({ superintendentId }: { superintendentId: string }) => getSuperintendentWalkHistory(superintendentId))
)
server.registerTool(
  'get_week_notes',
  {
    title: 'Get week notes',
    description: 'All walk notes for a given week (weekStart = Monday, YYYY-MM-DD).',
    inputSchema: { weekStart: z.string() }
  },
  wrap(({ weekStart }: { weekStart: string }) => getWeekNotes(weekStart))
)
server.registerTool(
  'get_full_report_data',
  {
    title: 'Get full report data',
    description: 'Everything the Full weekly report shows for a given week, as structured data.',
    inputSchema: { weekStart: z.string() }
  },
  wrap(({ weekStart }: { weekStart: string }) => getFullReportData(weekStart))
)

async function main(): Promise<void> {
  runMigrations(join(__dirname, '../../drizzle'))
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('GS Field Operations MCP server ready.')
}

main().catch((error) => {
  console.error('MCP server error:', error)
  process.exit(1)
})
