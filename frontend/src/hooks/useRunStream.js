import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useRunStream(runId, isActive) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!runId || !isActive) return

    const es = new EventSource(`/api/runs/${runId}/stream`)

    es.addEventListener('result', (e) => {
      const payload = JSON.parse(e.data)
      queryClient.setQueryData(['results', runId], (old = []) => {
        const exists = old.some(
          r => r.test_case_id === payload.test_case_id && r.model === payload.model
        )
        return exists ? old : [...old, payload.data]
      })
    })

    es.addEventListener('complete', () => {
      queryClient.invalidateQueries({ queryKey: ['run', runId] })
      queryClient.invalidateQueries({ queryKey: ['results', runId] })
      es.close()
    })

    es.onerror = () => es.close()

    return () => es.close()
  }, [runId, isActive, queryClient])
}
