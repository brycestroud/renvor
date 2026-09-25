import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, CheckCircle2, ChevronLeft, ChevronRight, FileText, Mail, RotateCcw } from 'lucide-react'
import { CategorySection } from './CategorySection'
import { ActionItemsSection } from './ActionItemsSection'
import { ProcorePanel } from './ProcorePanel'
import { EmailWalkDialog } from './EmailWalkDialog'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { inputClass, selectClass } from '../../components/FormField'
import { useAutosaveText } from '../../lib/useAutosaveText'
import { gsApi } from '../../lib/gsApi'
import { isItemDue, type PriorScoreRecord } from '@shared/scoring'
import type { VisitType, WalkItemScoreDto } from '@shared/ipc-contract'

function mondayOf(dateIso: string): string {
  const d = new Date(dateIso)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().slice(0, 10)
}

function sundayOf(mondayIso: string): string {
  const d = new Date(mondayIso)
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}

export function WalkEditor({ walkId, onExit }: { walkId: string; onExit: () => void }): JSX.Element {
  const queryClient = useQueryClient()
  const { data: walk } = useQuery({ queryKey: ['walk', walkId], queryFn: () => gsApi().getWalk(walkId) })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => gsApi().listCategories()
  })
  const { data: supers } = useQuery({
    queryKey: ['superintendents'],
    queryFn: () => gsApi().listSuperintendents()
  })
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => gsApi().listProjects() })

  const { data: history } = useQuery({
    queryKey: ['item-history', walk?.superintendentId, walk?.projectId, walkId],
    queryFn: () =>
      gsApi().getItemHistory({
        superintendentId: walk!.superintendentId,
        projectId: walk!.projectId,
        excludeWalkId: walkId
      }),
    enabled: Boolean(walk)
  })

  const { data: openItems } = useQuery({
    queryKey: ['open-action-items', walk?.superintendentId, walk?.projectId],
    queryFn: () =>
      gsApi().listOpenActionItems({
        superintendentId: walk!.superintendentId,
        projectId: walk!.projectId
      }),
    enabled: Boolean(walk)
  })

  const procoreEnabled = settings?.procoreEnabled ?? false
  const { data: procorePanelData, isLoading: procoreLoading } = useQuery({
    queryKey: ['procore-walk-panel', walk?.projectId, walk?.superintendentId, walk?.date],
    queryFn: () => {
      const from = mondayOf(walk!.date)
      return gsApi().getProcoreWalkPanelData({
        projectId: walk!.projectId,
        superintendentId: walk!.superintendentId,
        from,
        to: sundayOf(from)
      })
    },
    enabled: Boolean(walk) && procoreEnabled
  })

  const [stepMode, setStepMode] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [pdfMessage, setPdfMessage] = useState<string | null>(null)

  const exportPdf = useMutation({
    mutationFn: () => gsApi().exportWalkPdf({ walkId }),
    onSuccess: (result) => setPdfMessage(result.canceled ? null : `Saved to ${result.path}`)
  })

  const activeCategories = useMemo(
    () => (categories ?? []).filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  )

  const scoresByItemId = useMemo(() => {
    const map = new Map<string, WalkItemScoreDto>()
    walk?.itemScores.forEach((s) => map.set(s.checklistItemId, s))
    return map
  }, [walk])

  const historyByItemId = useMemo(() => {
    const map = new Map<string, PriorScoreRecord[]>()
    history?.forEach((h) => {
      const list = map.get(h.checklistItemId) ?? []
      list.push({ date: h.date, wasScored: h.wasScored })
      map.set(h.checklistItemId, list)
    })
    return map
  }, [history])

  const dueByItemId = useMemo(() => {
    const map = new Map<string, boolean>()
    if (!walk) return map
    activeCategories.forEach((cat) => {
      cat.items
        .filter((i) => i.active)
        .forEach((item) => {
          map.set(item.id, isItemDue(item.frequency, historyByItemId.get(item.id) ?? [], walk.date))
        })
    })
    return map
  }, [activeCategories, historyByItemId, walk])

  const flatItemIds = useMemo(
    () =>
      activeCategories.flatMap((c) =>
        c.items.filter((i) => i.active).map((i) => i.id)
      ),
    [activeCategories]
  )

  const categoryNotesByCategoryId = useMemo(() => {
    const map = new Map<string, string>()
    walk?.categoryNotes.forEach((n) => map.set(n.categoryId, n.notes))
    return map
  }, [walk])

  const totalActiveItems = flatItemIds.length
  const scoredCount = walk
    ? flatItemIds.filter((id) => {
        const s = scoresByItemId.get(id)
        return s && (s.score != null || s.isNa)
      }).length
    : 0

  const priorOpenCount = (openItems ?? []).filter((i) => i.originWalkId !== walkId).length

  const setScore = useMutation({
    mutationFn: (vars: { checklistItemId: string; score: number | null; isNa: boolean }) =>
      gsApi().setItemScore({ walkId, ...vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['walk', walkId] })
  })

  const updateHeader = useMutation({
    mutationFn: (patch: {
      date?: string
      superintendentId?: string
      projectId?: string
      visitType?: VisitType
      overallNotes?: string | null
      followupNotes?: string | null
    }) => gsApi().updateWalkHeader({ id: walkId, ...patch }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['walk', walkId] })
  })

  const setCategoryNote = useMutation({
    mutationFn: (vars: { categoryId: string; notes: string }) =>
      gsApi().setCategoryNote({ walkId, ...vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['walk', walkId] })
  })

  const markAllNa = useMutation({
    mutationFn: () => gsApi().markAllRemainingNa({ walkId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['walk', walkId] })
  })

  const copyFromLast = useMutation({
    mutationFn: () => gsApi().copyFromLastWalk({ walkId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['walk', walkId] })
  })

  const submit = useMutation({
    mutationFn: () => gsApi().submitWalk({ id: walkId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walk', walkId] })
      queryClient.invalidateQueries({ queryKey: ['recent-walks'] })
    }
  })

  const archive = useMutation({
    mutationFn: () => gsApi().archiveWalk(walkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-walks'] })
      onExit()
    }
  })

  const overallNotes = useAutosaveText(walk?.overallNotes ?? '', (v) =>
    updateHeader.mutate({ overallNotes: v })
  )
  const followupNotes = useAutosaveText(walk?.followupNotes ?? '', (v) =>
    updateHeader.mutate({ followupNotes: v })
  )

  function flushSaveDraft(): void {
    overallNotes.onBlur()
    followupNotes.onBlur()
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  // Keyboard shortcuts: 1-5 scores the focused item and N marks it N/A, then
  // advances focus to the next item. Ignored while typing in a text field.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (flatItemIds.length === 0) return

      let score: number | null = null
      let isNa = false
      if (e.key >= '1' && e.key <= '5') {
        score = Number(e.key)
      } else if (e.key.toLowerCase() === 'n') {
        isNa = true
      } else {
        return
      }

      const currentIndex = focusedItemId ? flatItemIds.indexOf(focusedItemId) : -1
      const targetId = currentIndex === -1 ? flatItemIds[0] : flatItemIds[currentIndex]
      setScore.mutate({ checklistItemId: targetId, score, isNa })

      const nextIndex = Math.min(
        (currentIndex === -1 ? 0 : currentIndex) + 1,
        flatItemIds.length - 1
      )
      setFocusedItemId(flatItemIds[nextIndex])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatItemIds, focusedItemId])

  if (!walk || !categories) {
    return <p className="text-sm text-text-muted">Loading walk…</p>
  }

  const visibleCategories = stepMode ? activeCategories.slice(stepIndex, stepIndex + 1) : activeCategories

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div className="sticky top-0 z-10 -mx-6 border-b border-border bg-canvas px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onExit} className="text-sm text-text-muted hover:text-text-primary">
              ← Job Walk
            </button>
            <h1 className="text-lg font-semibold text-text-primary">Job Walk</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-text-muted">
              {scoredCount}/{totalActiveItems} Scored
            </span>
            <label className="flex items-center gap-1.5 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={stepMode}
                onChange={(e) => {
                  setStepMode(e.target.checked)
                  setStepIndex(0)
                }}
                className="h-3.5 w-3.5 accent-[var(--brand)]"
              />
              Step mode
            </label>
            <button
              onClick={() => setArchiving(true)}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-danger"
              title="Archive this walk"
            >
              <Archive size={13} /> Archive
            </button>
          </div>
        </div>

        {walk.status === 'submitted' && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-control border border-success-muted bg-success-muted px-3 py-2">
            <span className="text-xs font-medium text-success">
              Editing submitted walk
              {walk.lastEditedAt &&
                ` · last edited ${new Date(walk.lastEditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => exportPdf.mutate()}
                disabled={exportPdf.isPending}
                className="flex items-center gap-1 rounded-control border border-border bg-surface-2 px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-60"
              >
                <FileText size={12} /> {exportPdf.isPending ? 'Exporting…' : 'Export PDF'}
              </button>
              <button
                onClick={() => setEmailing(true)}
                className="flex items-center gap-1 rounded-control border border-border bg-surface-2 px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-hover"
              >
                <Mail size={12} /> Email to…
              </button>
              <button
                onClick={onExit}
                className="flex items-center gap-1 rounded-control border border-border bg-surface-2 px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-hover"
              >
                <RotateCcw size={12} /> Start new walk
              </button>
            </div>
          </div>
        )}
        {pdfMessage && <p className="mt-2 text-xs text-text-muted">{pdfMessage}</p>}

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-text-secondary">Superintendent</span>
            <select
              className={selectClass}
              value={walk.superintendentId}
              onChange={(e) => updateHeader.mutate({ superintendentId: e.target.value })}
            >
              {supers
                ?.filter((s) => s.active || s.id === walk.superintendentId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-text-secondary">Project</span>
            <select
              className={selectClass}
              value={walk.projectId}
              onChange={(e) => updateHeader.mutate({ projectId: e.target.value })}
            >
              {projects
                ?.filter((p) => p.status === 'active' || p.id === walk.projectId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-text-secondary">Date</span>
            <input
              type="date"
              className={inputClass}
              value={walk.date}
              onChange={(e) => updateHeader.mutate({ date: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-text-secondary">PM (read-only)</span>
            <input
              disabled
              value={walk.pmNameSnapshot ?? '—'}
              className={`${inputClass} cursor-not-allowed opacity-70`}
            />
          </label>
        </div>

        <div className="mt-3 flex gap-2">
          {(['home', 'cross_project'] as const).map((vt: VisitType) => (
            <button
              key={vt}
              onClick={() => updateHeader.mutate({ visitType: vt })}
              className={`rounded-control border px-3 py-1.5 text-xs transition-colors ${
                walk.visitType === vt
                  ? 'border-brand-border bg-brand-muted text-brand'
                  : 'border-border bg-surface-2 text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {vt === 'home' ? 'Home' : 'Cross-Project'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => markAllNa.mutate()}
          disabled={markAllNa.isPending}
          className="rounded-control border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50"
        >
          Mark all remaining N/A
        </button>
        <button
          onClick={() => copyFromLast.mutate()}
          disabled={copyFromLast.isPending}
          className="rounded-control border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50"
        >
          {copyFromLast.isPending ? 'Copying…' : "Copy scores from last walk"}
        </button>
      </div>

      {procoreEnabled && (
        <ProcorePanel
          data={procorePanelData}
          isLoading={procoreLoading}
          projectName={walk.projectName}
          superintendentName={walk.superintendentName}
        />
      )}

      {stepMode ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              className="flex items-center gap-1 rounded-control border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="font-mono text-xs uppercase tracking-wide text-text-muted">
              Category {stepIndex + 1} of {activeCategories.length}
            </span>
            <button
              onClick={() => setStepIndex((i) => Math.min(activeCategories.length - 1, i + 1))}
              disabled={stepIndex === activeCategories.length - 1}
              className="flex items-center gap-1 rounded-control border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-30"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
          {visibleCategories.map((cat) => (
            <CategorySection
              key={cat.id}
              category={cat}
              scoresByItemId={scoresByItemId}
              dueByItemId={dueByItemId}
              categoryNote={categoryNotesByCategoryId.get(cat.id) ?? ''}
              focusedItemId={focusedItemId}
              onFocusItem={setFocusedItemId}
              onScoreChange={(id, score, isNa) => setScore.mutate({ checklistItemId: id, score, isNa })}
              onNoteSave={(categoryId, notes) => setCategoryNote.mutate({ categoryId, notes })}
              procoreDailyLogCount={procoreEnabled ? (procorePanelData?.dailyLogs.length ?? null) : null}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeCategories.map((cat) => (
            <CategorySection
              key={cat.id}
              category={cat}
              scoresByItemId={scoresByItemId}
              dueByItemId={dueByItemId}
              categoryNote={categoryNotesByCategoryId.get(cat.id) ?? ''}
              focusedItemId={focusedItemId}
              onFocusItem={setFocusedItemId}
              onScoreChange={(id, score, isNa) => setScore.mutate({ checklistItemId: id, score, isNa })}
              onNoteSave={(categoryId, notes) => setCategoryNote.mutate({ categoryId, notes })}
              procoreDailyLogCount={procoreEnabled ? (procorePanelData?.dailyLogs.length ?? null) : null}
            />
          ))}
        </div>
      )}

      <ActionItemsSection
        walkId={walkId}
        superintendentId={walk.superintendentId}
        projectId={walk.projectId}
        superintendentName={walk.superintendentName}
        projectName={walk.projectName}
      />

      <div className="rounded-panel border border-border-subtle bg-surface-1 p-4">
        <h3 className="text-sm font-semibold text-text-primary">Overall notes</h3>
        <textarea
          value={overallNotes.value}
          onChange={(e) => overallNotes.onChange(e.target.value)}
          onBlur={overallNotes.onBlur}
          placeholder="General notes from the walk…"
          className="mt-2 min-h-[80px] w-full resize-y rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-info"
        />

        <h3 className="mt-4 text-sm font-semibold text-text-primary">Follow-up items</h3>
        <textarea
          value={followupNotes.value}
          onChange={(e) => followupNotes.onChange(e.target.value)}
          onBlur={followupNotes.onBlur}
          placeholder="Things to check on the next walk…"
          className="mt-2 min-h-[60px] w-full resize-y rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-info"
        />
      </div>

      {scoredCount === 0 && (
        <p className="text-xs text-warning">No items scored yet — you can still submit, but consider scoring at least a few before you do.</p>
      )}
      {priorOpenCount > 0 && (
        <p className="text-xs text-danger">
          {priorOpenCount} open action item{priorOpenCount === 1 ? '' : 's'} above must be closed,
          carried, or escalated before you can submit.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={flushSaveDraft}
          className="rounded-control border border-border bg-surface-2 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-hover"
        >
          {savedFlash ? 'Saved' : 'Save Draft'}
        </button>
        {walk.status === 'draft' && (
          <button
            onClick={() => submit.mutate()}
            disabled={priorOpenCount > 0 || submit.isPending}
            className="flex items-center gap-1.5 rounded-control bg-brand px-4 py-2.5 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 size={16} /> {submit.isPending ? 'Submitting…' : 'Submit'}
          </button>
        )}
      </div>

      {emailing && <EmailWalkDialog walk={walk} onClose={() => setEmailing(false)} />}

      {archiving && (
        <ConfirmDialog
          title="Archive this walk?"
          description="This walk will be archived, not deleted - its scores and notes stay in the database, but it drops off Recent Walks and out of reports."
          confirmLabel="Archive"
          danger
          pending={archive.isPending}
          onConfirm={() => archive.mutate()}
          onCancel={() => setArchiving(false)}
        />
      )}
    </div>
  )
}
