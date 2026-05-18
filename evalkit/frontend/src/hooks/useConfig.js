import { useQuery } from '@tanstack/react-query'
import { config } from '../api/client'

export function useConfig() {
  const { data } = useQuery({
    queryKey: ['config'],
    queryFn: config.get,
    staleTime: Infinity,
  })
  return { isDemo: data?.demo ?? false }
}
