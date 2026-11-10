import type { DemoTripFlow } from "../types/domain"

const STORAGE_KEY = "shingu-demo-trip-flow"

const initialTrip: DemoTripFlow = {
  tripId: "ride-0520",
  driverId: "demo-driver",
  approvedPassengerIds: ["demo-rider"],
  driverName: "김도윤",
  vehicle: "현대 아반떼 · 흰색",
  start: "모란역 5번 출구",
  destination: "신구대학교 정문",
  operatedAt: "2026.05.20 오전 8:10",
  amount: 2800,
  status: "운행 예정",
  endedAt: null,
  paymentRequested: false,
  paidAt: null,
}

let currentTrip = readTrip()
const listeners = new Set<() => void>()

function readTrip(): DemoTripFlow {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...initialTrip, ...JSON.parse(saved) } : initialTrip
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return initialTrip
  }
}

function notify() {
  listeners.forEach((listener) => listener())
}

function saveTrip(next: DemoTripFlow) {
  currentTrip = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  notify()
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return
    currentTrip = readTrip()
    notify()
  })
}

export function subscribeTripFlow(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getTripFlowSnapshot() {
  return currentTrip
}

export function startDemoTrip() {
  if (currentTrip.status !== "운행 예정") return
  saveTrip({ ...currentTrip, status: "운행 중" })
}

export function endDemoTrip() {
  if (currentTrip.status !== "운행 중") return
  saveTrip({
    ...currentTrip,
    status: "결제 대기",
    endedAt: new Date().toISOString(),
    paymentRequested: true,
  })
}

export function completeDemoPayment() {
  if (currentTrip.status !== "결제 대기" || currentTrip.paidAt) return
  saveTrip({
    ...currentTrip,
    status: "결제 완료",
    paidAt: new Date().toISOString(),
  })
}

export function resetDemoTrip() {
  saveTrip({ ...initialTrip })
}
