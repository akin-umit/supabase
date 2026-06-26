export const warehouseKeys = {
  tables: (projectRef: string | undefined) =>
    ['projects', projectRef, 'warehouse', 'tables'] as const,
  catalog: (projectRef: string | undefined) =>
    ['projects', projectRef, 'warehouse', 'catalog'] as const,
}
