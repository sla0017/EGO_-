export type DemoPaymentMethod = "카카오페이" | "토스페이" | "신용카드 간편결제"

export type DemoPointCharge = {
  id: string
  amount: number
  paymentMethod: DemoPaymentMethod
  createdAt: string
  balanceAfter: number
  status: "데모 충전 완료"
}

export type DemoPointWallet = {
  balance: number
  charges: DemoPointCharge[]
}

const STORAGE_KEY = "shingu-point-wallet"
const INITIAL_WALLET: DemoPointWallet = { balance: 24_500, charges: [] }
const listeners = new Set<() => void>()

function isValidCharge(value: unknown): value is DemoPointCharge {
  if (!value || typeof value !== "object") return false
  const charge = value as Partial<DemoPointCharge>
  return (
    typeof charge.id === "string" &&
    Number.isSafeInteger(charge.amount) &&
    (charge.amount ?? 0) > 0 &&
    typeof charge.createdAt === "string" &&
    Number.isSafeInteger(charge.balanceAfter) &&
    charge.status === "데모 충전 완료" &&
    ["카카오페이", "토스페이", "신용카드 간편결제"].includes(
      charge.paymentMethod ?? "",
    )
  )
}

function readWallet(): DemoPointWallet {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_WALLET
    const parsed = JSON.parse(raw) as Partial<DemoPointWallet>
    if (
      !Number.isSafeInteger(parsed.balance) ||
      (parsed.balance ?? -1) < 0 ||
      !Array.isArray(parsed.charges) ||
      !parsed.charges.every(isValidCharge)
    ) {
      throw new Error("Invalid point wallet")
    }
    return parsed as DemoPointWallet
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return INITIAL_WALLET
  }
}

let snapshot = readWallet()

function publish(next: DemoPointWallet) {
  snapshot = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener())
}

export function getDemoPointWallet() {
  return snapshot
}

export function subscribeDemoPointWallet(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function chargeDemoPoints(
  amount: number,
  paymentMethod: DemoPaymentMethod,
): DemoPointCharge {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("충전 금액이 올바르지 않습니다.")
  }

  const balanceAfter = snapshot.balance + amount
  if (!Number.isSafeInteger(balanceAfter)) {
    throw new Error("충전 후 잔액이 올바르지 않습니다.")
  }

  const charge: DemoPointCharge = {
    id: `point-charge-${Date.now()}-${crypto.randomUUID?.() ?? Math.random()}`,
    amount,
    paymentMethod,
    createdAt: new Date().toISOString(),
    balanceAfter,
    status: "데모 충전 완료",
  }
  publish({
    balance: balanceAfter,
    charges: [charge, ...snapshot.charges],
  })
  return charge
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return
    snapshot = readWallet()
    listeners.forEach((listener) => listener())
  })
}
