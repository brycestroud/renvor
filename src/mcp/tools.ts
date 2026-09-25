/**
 * Full read/write MCP tool set for Renvor - shared between the standalone
 * stdio server (src/mcp/server.ts, for `npm run mcp` / a traditional
 * mcpServers config entry) and the in-process HTTP server the Electron app
 * itself hosts (src/main/mcp/httpServer.ts, for pasting a URL into Claude
 * Desktop's custom connector UI). One tool set, two transports.
 */
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { getDb } from '@main/db/client'
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

/**
 * Runs fn once per item in ONE MCP round trip instead of one call per item -
 * this is the difference between a chat doing "score 40 checklist items"
 * as 40 tool calls vs. 1. All items run inside a single db transaction, so
 * a bad item rolls the whole batch back rather than leaving a half-applied
 * walk/action-item-list - a batch either fully lands or fully doesn't.
 */
function wrapBatch<Item, Result>(
  fn: (item: Item) => Result
): (args: { items: Item[] }) => Promise<CallToolResult> {
  return async ({ items }: { items: Item[] }) => {
    try {
      const results = getDb().transaction(() => items.map((item) => fn(item)))
      return ok(results)
    } catch (error) {
      return fail(error)
    }
  }
}

function wrapBatchIds<Result>(fn: (id: string) => Result): (args: { ids: string[] }) => Promise<CallToolResult> {
  return async ({ ids }: { ids: string[] }) => {
    try {
      const results = getDb().transaction(() => ids.map((id) => fn(id)))
      return ok(results)
    } catch (error) {
      return fail(error)
    }
  }
}

export function registerMcpTools(server: McpServer): void {
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
  server.registerTool(
    'batch_create_projects',
    {
      title: 'Create multiple projects',
      description: 'Create many projects in one call instead of one create_project call per project.',
      inputSchema: { items: z.array(createProjectInput) }
    },
    wrapBatch(createProject)
  )
  server.registerTool(
    'batch_archive_projects',
    {
      title: 'Archive multiple projects',
      description: 'Soft-delete many projects in one call. Confirm with the user first.',
      inputSchema: { ids: z.array(z.string()) }
    },
    wrapBatchIds(archiveProject)
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
  server.registerTool(
    'batch_create_superintendents',
    {
      title: 'Create multiple superintendents',
      description: 'Create many superintendents in one call instead of one create_superintendent call per person.',
      inputSchema: { items: z.array(createSuperintendentInput) }
    },
    wrapBatch(createSuperintendent)
  )
  server.registerTool(
    'batch_archive_superintendents',
    {
      title: 'Archive multiple superintendents',
      description: 'Soft-delete many superintendents in one call. Confirm with the user first.',
      inputSchema: { ids: z.array(z.string()) }
    },
    wrapBatchIds(archiveSuperintendent)
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
  server.registerTool(
    'batch_create_people',
    {
      title: 'Create multiple people',
      description: 'Add many report recipients / escalation contacts in one call.',
      inputSchema: { items: z.array(createPersonInput) }
    },
    wrapBatch(createPerson)
  )
  server.registerTool(
    'batch_delete_people',
    {
      title: 'Delete multiple people',
      description: 'Permanently remove many people in one call. This is a hard delete - confirm with the user first.',
      inputSchema: { ids: z.array(z.string()) }
    },
    wrapBatchIds(deletePerson)
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
  server.registerTool(
    'batch_create_checklist_items',
    {
      title: 'Create multiple checklist items',
      description: 'Add many custom checklist items in one call instead of one create_checklist_item call per item.',
      inputSchema: { items: z.array(createChecklistItemInput) }
    },
    wrapBatch(createChecklistItem)
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
    'batch_set_item_scores',
    {
      title: 'Set multiple item scores',
      description:
        'Score (1-5) or mark N/A many checklist items on one walk in a single call - use this instead of many individual set_item_score calls when scoring a whole walk.',
      inputSchema: {
        walkId: z.string(),
        scores: z.array(
          z.object({
            checklistItemId: z.string(),
            score: z.number().int().min(1).max(5).nullable(),
            isNa: z.boolean()
          })
        )
      }
    },
    async ({ walkId, scores }: { walkId: string; scores: Array<{ checklistItemId: string; score: number | null; isNa: boolean }> }) => {
      try {
        getDb().transaction(() => {
          for (const s of scores) {
            setItemScore({ walkId, checklistItemId: s.checklistItemId, score: s.score, isNa: s.isNa })
          }
        })
        return ok(getWalk(walkId))
      } catch (error) {
        return fail(error)
      }
    }
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
  server.registerTool(
    'batch_archive_walks',
    {
      title: 'Archive multiple walks',
      description: 'Soft-delete many walks in one call. Confirm with the user first.',
      inputSchema: { ids: z.array(z.string()) }
    },
    wrapBatchIds(archiveWalk)
  )
  server.registerTool(
    'record_walk',
    {
      title: 'Record a full walk in one call',
      description:
        'Create a walk and set all of its item scores, category notes, and overall/follow-up notes in a single call, optionally submitting it immediately (default: yes). Use this instead of create_walk followed by many individual set_item_score / set_category_note calls - it does all of those writes server-side in one round trip.',
      inputSchema: {
        date: z.string(),
        superintendentId: z.string(),
        projectId: z.string(),
        visitType: z.enum(['home', 'cross_project']),
        overallNotes: z.string().nullable().optional(),
        followupNotes: z.string().nullable().optional(),
        itemScores: z
          .array(
            z.object({
              checklistItemId: z.string(),
              score: z.number().int().min(1).max(5).nullable(),
              isNa: z.boolean()
            })
          )
          .default([]),
        categoryNotes: z.array(z.object({ categoryId: z.string(), notes: z.string() })).default([]),
        submit: z.boolean().default(true).describe('Finalize the walk as submitted. Set false to leave it as a draft.')
      }
    },
    async (args: {
      date: string
      superintendentId: string
      projectId: string
      visitType: 'home' | 'cross_project'
      overallNotes?: string | null
      followupNotes?: string | null
      itemScores: Array<{ checklistItemId: string; score: number | null; isNa: boolean }>
      categoryNotes: Array<{ categoryId: string; notes: string }>
      submit: boolean
    }) => {
      try {
        const result = getDb().transaction(() => {
          const walk = createWalk({
            date: args.date,
            superintendentId: args.superintendentId,
            projectId: args.projectId,
            visitType: args.visitType
          })
          for (const s of args.itemScores) {
            setItemScore({ walkId: walk.id, checklistItemId: s.checklistItemId, score: s.score, isNa: s.isNa })
          }
          for (const n of args.categoryNotes) {
            setCategoryNote({ walkId: walk.id, categoryId: n.categoryId, notes: n.notes })
          }
          if (args.overallNotes !== undefined || args.followupNotes !== undefined) {
            updateWalkHeader({ id: walk.id, overallNotes: args.overallNotes, followupNotes: args.followupNotes })
          }
          return args.submit ? submitWalk({ id: walk.id }) : getWalk(walk.id)
        })
        return ok(result)
      } catch (error) {
        return fail(error)
      }
    }
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
  server.registerTool(
    'batch_create_action_items',
    {
      title: 'Create multiple action items',
      description:
        'Create many action items in one call instead of one create_action_item call per item - use this for a punch list pulled from pasted notes/email. When creating on the GS\'s behalf, pass source: "mcp" on each item so its origin is honest in the UI.',
      inputSchema: { items: z.array(createActionItemInput) }
    },
    wrapBatch(createActionItem)
  )
  server.registerTool(
    'batch_update_action_items',
    {
      title: 'Update multiple action items',
      description: 'Edit many action items (text/owner/due date/priority) in one call.',
      inputSchema: { items: z.array(updateActionItemInput) }
    },
    wrapBatch(updateActionItem)
  )
  server.registerTool(
    'batch_transition_action_items',
    {
      title: 'Transition multiple action items',
      description: 'Close, carry, escalate, de-escalate, or reopen many action items in one call.',
      inputSchema: { items: z.array(transitionActionItemInput) }
    },
    wrapBatch(transitionActionItem)
  )
  server.registerTool(
    'batch_delete_action_items',
    {
      title: 'Delete multiple action items',
      description: 'Permanently remove many action items in one call. This is a hard delete - confirm with the user first.',
      inputSchema: { ids: z.array(z.string()) }
    },
    wrapBatchIds(deleteActionItem)
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
}
