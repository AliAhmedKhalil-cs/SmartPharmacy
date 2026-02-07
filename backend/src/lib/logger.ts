export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogFields = Record<string, unknown>

function safeJson(value: unknown): string {
  try { return JSON.stringify(value) } catch { return '"[unserializable]"' }
}

export function log(level: LogLevel, message: string, fields: LogFields = {}): void {
  const entry = { ts: new Date().toISOString(), level, message, ...fields }
  const line = safeJson(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}
