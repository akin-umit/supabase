import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { warehouseKeys } from './keys'
import { constructHeaders, fetchHandler } from '@/data/fetchers'
import { API_URL } from '@/lib/constants'
import { ResponseError, type UseCustomMutationOptions } from '@/types'

export type WarehouseDetachTableVariables = {
  projectRef: string
  schema: string
  name: string
}

/**
 * Detaches a table's Warehouse copy ("Detach Warehouse copy"). Server-side this removes the table
 * from the `supabase_warehouse_pipeline` publication and drops its DuckLake copy. The source table
 * in Postgres is unaffected.
 */
export async function detachWarehouseTable({
  projectRef,
  schema,
  name,
}: WarehouseDetachTableVariables) {
  if (!projectRef) throw new Error('projectRef is required')

  const headers = await constructHeaders({ 'Content-Type': 'application/json' })
  const response = await fetchHandler(
    `${API_URL}/platform/warehouse/${projectRef}/tables/${encodeURIComponent(schema)}/${encodeURIComponent(name)}`,
    { method: 'DELETE', headers, credentials: 'include' }
  )

  if (!response.ok) {
    let message = `Failed to detach Warehouse copy (${response.status})`
    try {
      const body = await response.json()
      message = body?.message ?? body?.msg ?? message
    } catch {
      // response had no JSON body; keep the default message
    }
    throw new ResponseError(message, response.status)
  }
}

type WarehouseDetachTableData = Awaited<ReturnType<typeof detachWarehouseTable>>

export const useWarehouseDetachTableMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseCustomMutationOptions<WarehouseDetachTableData, ResponseError, WarehouseDetachTableVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<WarehouseDetachTableData, ResponseError, WarehouseDetachTableVariables>({
    mutationFn: detachWarehouseTable,
    async onSuccess(data, variables, context) {
      await queryClient.invalidateQueries({ queryKey: warehouseKeys.tables(variables.projectRef) })
      await onSuccess?.(data, variables, context)
    },
    async onError(data, variables, context) {
      if (onError === undefined) {
        toast.error(`Failed to detach Warehouse copy: ${data.message}`)
      } else {
        onError(data, variables, context)
      }
    },
    ...options,
  })
}
