import assert from 'node:assert'

import { assertSelfHosted } from '../../util'
import { FileSystemSecretStore } from './fileSystemStore'

export function getFunctionSecretStore() {
  assertSelfHosted()
  assert(
    process.env.EDGE_FUNCTIONS_MANAGEMENT_FOLDER,
    'EDGE_FUNCTIONS_MANAGEMENT_FOLDER is required'
  )

  return new FileSystemSecretStore(process.env.EDGE_FUNCTIONS_MANAGEMENT_FOLDER)
}
