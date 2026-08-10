import type { Dirent } from 'node:fs'
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { FunctionArtifact, FunctionFileEntry } from './types'

export class FileSystemFunctionsArtifactStore {
  constructor(private folderPath: string) {}

  async upsertFunction({
    slug,
    files,
  }: {
    slug: string
    files: { name: string; content: string }[]
  }): Promise<FunctionArtifact> {
    if (!isSafeFunctionSlug(slug)) throw new Error('Invalid function slug')
    if (!Array.isArray(files) || files.length === 0) throw new Error('Function files are required')

    const rootPath = path.resolve(this.folderPath)
    const functionFolderPath = path.resolve(rootPath, slug)
    if (!functionFolderPath.startsWith(rootPath + path.sep)) throw new Error('Invalid function path')

    await rm(functionFolderPath, { recursive: true, force: true })
    await mkdir(functionFolderPath, { recursive: true })

    for (const file of files) {
      if (!isSafeRelativeFilePath(file.name)) throw new Error(`Invalid function file path: ${file.name}`)
      if (typeof file.content !== 'string') throw new Error(`Invalid function file content: ${file.name}`)

      const filePath = path.resolve(functionFolderPath, file.name)
      if (!filePath.startsWith(functionFolderPath + path.sep)) {
        throw new Error(`Invalid function file path: ${file.name}`)
      }
      await mkdir(path.dirname(filePath), { recursive: true })
      await writeFile(filePath, file.content, 'utf8')
    }

    const artifact = await this.getFunctionBySlug(slug)
    if (!artifact) throw new Error('Function entrypoint is required')
    return artifact
  }

  async getFunctions(): Promise<FunctionArtifact[]> {
    const dirEntries = await readdir(this.folderPath, { withFileTypes: true })

    const functionsFolders = dirEntries.filter((dir) => dir.isDirectory() && dir.name !== 'main')
    const functionsArtifacts = await Promise.all(
      functionsFolders.map(parseFolderToFunctionArtifact)
    )

    return functionsArtifacts.filter((f) => f !== undefined)
  }

  async getFunctionBySlug(slug: string): Promise<FunctionArtifact | undefined> {
    const dirEntries = await readdir(this.folderPath, { withFileTypes: true })

    const functionFolder = dirEntries.find(
      (dir) => dir.isDirectory() && dir.name !== 'main' && dir.name === slug
    )
    if (!functionFolder) return

    return parseFolderToFunctionArtifact(functionFolder)
  }

  async getFileEntriesBySlug(slug: string): Promise<Array<FunctionFileEntry>> {
    if (slug === 'main') return []

    const functionFolderPath = path.resolve(this.folderPath, slug)
    if (!functionFolderPath.startsWith(path.resolve(this.folderPath) + path.sep)) return []

    const entries = await readdir(functionFolderPath, {
      recursive: true,
      withFileTypes: true,
    })

    const fileEntries = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const absolutePath = path.join(entry.parentPath, entry.name)
          const fileStat = await stat(absolutePath)
          return {
            absolutePath,
            relativePath: path.relative(functionFolderPath, absolutePath),
            size: fileStat.size,
          }
        })
    )

    return fileEntries
  }
}

function isSafeFunctionSlug(value: string) {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value) && value !== 'main'
}

function isSafeRelativeFilePath(value: string) {
  if (!value || value.length > 240) return false
  if (path.isAbsolute(value)) return false
  const normalized = value.replace(/\\/g, '/')
  return !normalized.split('/').some((part) => part === '' || part === '.' || part === '..')
}

async function parseFolderToFunctionArtifact(
  folder: Dirent
): Promise<FunctionArtifact | undefined> {
  const folderPath = path.join(folder.parentPath, folder.name)
  const files = await readdir(folderPath, { withFileTypes: true })
  const entrypoint = files.find((file) => file.isFile() && file.name.startsWith('index'))

  if (!entrypoint) return

  const entrypointPath = path.join(folderPath, entrypoint.name)
  const entrypointStat = await stat(entrypointPath)

  return {
    slug: folder.name,
    entrypoint_path: pathToFileURL(entrypointPath).href,
    created_at: entrypointStat.birthtimeMs,
    updated_at: entrypointStat.mtimeMs,
  }
}
