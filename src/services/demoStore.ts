const PREFIX = "shingu-"

export function readDemoData<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(`${PREFIX}${key}`)
    return value ? ({ ...fallback, ...JSON.parse(value) } as T) : fallback
  } catch {
    localStorage.removeItem(`${PREFIX}${key}`)
    return fallback
  }
}

export function readDemoList<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(`${PREFIX}${key}`) || "[]")
  } catch {
    localStorage.removeItem(`${PREFIX}${key}`)
    return []
  }
}

export function readDemoValue(key: string) {
  return localStorage.getItem(`${PREFIX}${key}`)
}

export function writeDemoData<T>(key: string, value: T) {
  localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value))
}

export function writeDemoValue(key: string, value: string) {
  localStorage.setItem(`${PREFIX}${key}`, value)
}

export function removeDemoData(key: string) {
  localStorage.removeItem(`${PREFIX}${key}`)
}
