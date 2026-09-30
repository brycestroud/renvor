import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gsApi, isRemote } from './gsApi'
import type { UpdateStatus } from '@shared/ipc-contract'

const BUSY = ['checking', 'downloading', 'downloaded', 'installing']

export function useUpdate(): {
  status: UpdateStatus | undefined
  check: () => void
  checking: boolean
  /** Download the new version, then restart into it - one click. */
  update: () => void
  updating: boolean
} {
  const queryClient = useQueryClient()
  const { data: status } = useQuery({
    queryKey: ['update-status'],
    queryFn: () => gsApi().getUpdateStatus(),
    enabled: !isRemote,
    refetchInterval: (q) => (BUSY.includes(q.state.data?.state ?? '') ? 1000 : 15000)
  })
  const setStatus = (next: UpdateStatus): void => {
    queryClient.setQueryData(['update-status'], next)
  }

  const checkMutation = useMutation({
    mutationFn: () => gsApi().checkForUpdates(),
    onSuccess: setStatus
  })
  const updateMutation = useMutation({
    mutationFn: async () => {
      let next = await gsApi().downloadUpdate()
      if (next.state === 'downloaded') next = await gsApi().installUpdate()
      return next
    },
    onSuccess: setStatus
  })

  return {
    status,
    check: () => checkMutation.mutate(),
    checking: checkMutation.isPending,
    update: () => {
      // Already downloaded (e.g. window was reloaded mid-download): just restart into it.
      if (status?.state === 'downloaded') gsApi().installUpdate().then(setStatus)
      else updateMutation.mutate()
    },
    updating: updateMutation.isPending
  }
}
