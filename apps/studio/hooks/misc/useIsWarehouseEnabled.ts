import { useFlag } from 'common'

/**
 * Whether the Warehouse product is enabled for the current session.
 *
 * Gates every Warehouse surface while in preview: the table Storage section ("Copy to Warehouse"),
 * the per-table storage chips/badges, the Warehouse Catalog integration, and the Connect-sheet
 * catalog tab. Backed by the `warehouse` ConfigCat flag (defaults to off until registered).
 */
export function useIsWarehouseEnabled(): boolean {
  return useFlag<boolean>('warehouse') === true
}
