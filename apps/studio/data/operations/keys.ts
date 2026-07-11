export const operationsKeys = {
  projectOperations: (projectRef: string | undefined) =>
    ['projects', projectRef, 'operations'] as const,
}
