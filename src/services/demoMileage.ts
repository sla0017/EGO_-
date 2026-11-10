import type { Role } from "../types/domain"

const balanceKey = (accountId: string, role: Role) =>
  `shingu-mileage-balance-${accountId}-${role}`
const memberCodeKey = (accountId: string, role: Role) =>
  `shingu-mileage-member-code-${accountId}-${role}`

export function getDemoMileageBalance(accountId: string, role: Role) {
  const fallback = role === "driver" ? 12_840 : 0
  try {
    const stored = localStorage.getItem(balanceKey(accountId, role))
    if (stored === null) {
      localStorage.setItem(balanceKey(accountId, role), String(fallback))
      return fallback
    }
    const balance = Number(stored)
    return Number.isSafeInteger(balance) && balance >= 0 ? balance : fallback
  } catch {
    return fallback
  }
}

export function getOrCreateMileageMemberCode(
  accountId: string,
  role: Role,
) {
  const key = memberCodeKey(accountId, role)
  try {
    const stored = localStorage.getItem(key)
    if (stored && /^[A-Z0-9-]+$/.test(stored)) return stored
    const accountPart =
      accountId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8) ||
      "MEMBER"
    const randomPart = (
      crypto.randomUUID?.().replaceAll("-", "").slice(0, 8) ??
      Math.random().toString(36).slice(2, 10)
    ).toUpperCase()
    const code = `SG${role === "driver" ? "D" : "R"}-${accountPart}-${randomPart}`
    localStorage.setItem(key, code)
    return code
  } catch {
    return ""
  }
}
