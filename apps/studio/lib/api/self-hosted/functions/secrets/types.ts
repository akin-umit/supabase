export type StoredSecret = {
  value: string
  updated_at: string
}

export type SecretsFile = {
  version: 1
  secrets: Record<string, StoredSecret>
}

export type SecretInput = {
  name: string
  value: string
}

export type RedactedSecret = {
  name: string
  value: string
  updated_at: string
}
