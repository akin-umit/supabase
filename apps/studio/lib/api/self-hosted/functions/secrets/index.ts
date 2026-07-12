import assert from 'node:assert'

import { assertSelfHosted } from '../../util'
import { FileSystemSecretStore } from './fileSystemStore'

export function getFunctionSecretStore() {
  assertSelfHosted()
  const folder =
    process.env.FUNCTION_SECRETS_MANAGEMENT_FOLDER ??
    process.env.EDGE_FUNCTIONS_MANAGEMENT_FOLDER
  assert(
    folder,
    'FUNCTION_SECRETS_MANAGEMENT_FOLDER or EDGE_FUNCTIONS_MANAGEMENT_FOLDER is required'
  )

  return new FileSystemSecretStore(folder)
}
