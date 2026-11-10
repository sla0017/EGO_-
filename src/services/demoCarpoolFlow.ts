export type CarpoolRideStatus = "모집 중" | "정산 대기" | "완료"
export type CarpoolSettlementStatus = "정산 전" | "정산 대기" | "정산 완료"
export type CarpoolApplicationStatus = "승인 대기" | "승인 완료" | "거절 완료" | "취소 완료"

export type DemoCarpoolRide = {
  id: string
  driverId: "demo-driver"
  driverName: string
  start: string
  destination: string
  date: string
  time: string
  vehicle: string
  totalSeats: number
  price: number
  note: string
  waypoints: string
  estimatedDuration: number
  estimatedArrival: string
  arrivalTimeManual: boolean
  smokingPreference: string
  genderPreference: string
  status: CarpoolRideStatus
  settlementStatus: CarpoolSettlementStatus
  endedAt: string | null
  settledAt: string | null
  createdAt: string
}

export type DemoCarpoolApplication = {
  id: string
  rideId: string
  riderId: "demo-rider"
  riderName: string
  driverId: "demo-driver"
  createdAt: string
  status: CarpoolApplicationStatus
}

export type DemoCarpoolReview = {
  id: string
  rideId: string
  authorId: "demo-rider"
  targetId: "demo-driver"
  rating: number
  keywords: string[]
  content: string
  createdAt: string
}

export type DemoCarpoolEvent = {
  id: string
  type: "reservation-cancelled" | "application-rejected"
  applicationId: string
  title: string
  message: string
  createdAt: string
}

export type DemoCarpoolState = {
  rides: DemoCarpoolRide[]
  applications: DemoCarpoolApplication[]
  reviews: DemoCarpoolReview[]
  events: DemoCarpoolEvent[]
}

const STORAGE_KEY = "shingu-carpool-flow-v1"
const EMPTY_STATE: DemoCarpoolState = {
  rides: [],
  applications: [],
  reviews: [],
  events: [],
}
const listeners = new Set<() => void>()

function isStateValid(value: unknown): value is DemoCarpoolState {
  if (!value || typeof value !== "object") return false
  const state = value as Partial<DemoCarpoolState>
  return (
    Array.isArray(state.rides) &&
    state.rides.every(
      (ride) =>
        ride &&
        typeof ride.id === "string" &&
        typeof ride.start === "string" &&
        typeof ride.destination === "string" &&
        typeof ride.date === "string" &&
        typeof ride.time === "string" &&
        Number.isSafeInteger(ride.totalSeats) &&
        Number.isSafeInteger(ride.price),
    ) &&
    Array.isArray(state.applications) &&
    state.applications.every(
      (application) =>
        application &&
        typeof application.id === "string" &&
        typeof application.rideId === "string" &&
        ["승인 대기", "승인 완료", "거절 완료", "취소 완료"].includes(
          application.status,
        ),
    ) &&
    Array.isArray(state.reviews) &&
    state.reviews.every(
      (review) =>
        review &&
        typeof review.id === "string" &&
        typeof review.rideId === "string" &&
        Number.isInteger(review.rating) &&
        Array.isArray(review.keywords),
    )
  )
}

function readState(): DemoCarpoolState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")
    if (!isStateValid(parsed)) return EMPTY_STATE
    return {
      ...parsed,
      rides: parsed.rides.map((ride) => {
        const estimatedDuration =
          Number.isSafeInteger(ride.estimatedDuration) &&
          ride.estimatedDuration > 0
            ? ride.estimatedDuration
            : DEFAULT_ESTIMATED_DURATION
        return {
          ...ride,
          waypoints: ride.waypoints ?? ride.note ?? "",
          estimatedDuration,
          estimatedArrival:
            ride.estimatedArrival ||
            calculateEstimatedArrival(ride.date, ride.time, estimatedDuration),
          arrivalTimeManual: ride.arrivalTimeManual === true,
        }
      }),
      events: Array.isArray(parsed.events) ? parsed.events : [],
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return EMPTY_STATE
  }
}

let snapshot = readState()

function save(next: DemoCarpoolState) {
  snapshot = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener())
}

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`

export function subscribeCarpoolFlow(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCarpoolFlowSnapshot() {
  return snapshot
}

export function createCarpoolRide(
  input: Omit<DemoCarpoolRide, "id" | "driverId" | "driverName" | "status" | "settlementStatus" | "endedAt" | "settledAt" | "createdAt">,
) {
  if (
    !input.start.trim() ||
    !input.destination.trim() ||
    !input.date ||
    !input.time ||
    !input.vehicle.trim() ||
    !Number.isSafeInteger(input.estimatedDuration) ||
    input.estimatedDuration < 1 ||
    !input.estimatedArrival ||
    !Number.isSafeInteger(input.totalSeats) ||
    input.totalSeats < 1 ||
    !Number.isSafeInteger(input.price) ||
    input.price < 1
  )
    throw new Error("필수 입력 항목을 확인해 주세요.")
  const ride: DemoCarpoolRide = {
    ...input,
    id: createId("carpool"),
    driverId: "demo-driver",
    driverName: "김도윤",
    status: "모집 중",
    settlementStatus: "정산 전",
    endedAt: null,
    settledAt: null,
    createdAt: new Date().toISOString(),
  }
  save({ ...snapshot, rides: [ride, ...snapshot.rides] })
  return ride
}

export function applyToCarpool(rideId: string) {
  const ride = snapshot.rides.find((item) => item.id === rideId)
  if (!ride || ride.status !== "모집 중")
    throw new Error("신청할 수 없는 카풀입니다.")
  if (
    snapshot.applications.some(
      (item) => item.rideId === rideId && item.riderId === "demo-rider",
    )
  )
    throw new Error("이미 신청한 카풀입니다.")
  const approvedCount = snapshot.applications.filter(
    (item) => item.rideId === rideId && item.status === "승인 완료",
  ).length
  if (approvedCount >= ride.totalSeats) throw new Error("남은 좌석이 없습니다.")
  const application: DemoCarpoolApplication = {
    id: createId("application"),
    rideId,
    riderId: "demo-rider",
    riderName: "박민지",
    driverId: ride.driverId,
    createdAt: new Date().toISOString(),
    status: "승인 대기",
  }
  save({ ...snapshot, applications: [application, ...snapshot.applications] })
  return application
}

export function decideCarpoolApplication(
  applicationId: string,
  decision: "approve" | "reject",
) {
  const application = snapshot.applications.find(
    (item) => item.id === applicationId,
  )
  if (!application || application.status !== "승인 대기") return
  const ride = snapshot.rides.find((item) => item.id === application.rideId)
  if (!ride || ride.status !== "모집 중")
    throw new Error("처리할 수 없는 신청입니다.")
  const approvedCount = snapshot.applications.filter(
    (item) => item.rideId === ride.id && item.status === "승인 완료",
  ).length
  if (decision === "approve" && approvedCount >= ride.totalSeats)
    throw new Error("남은 좌석이 없습니다.")
  save({
    ...snapshot,
    applications: snapshot.applications.map((item) =>
      item.id === applicationId
        ? {
            ...item,
            status: decision === "approve" ? "승인 완료" : "거절 완료",
          }
        : item,
    ),
    events:
      decision === "reject"
        ? [
            {
              id: createId("event"),
              type: "application-rejected",
              applicationId,
              title: "탑승 신청이 거절되었습니다",
              message: `${application.riderName}님의 탑승 신청을 운전자가 거절했습니다.`,
              createdAt: new Date().toISOString(),
            },
            ...snapshot.events,
          ]
        : snapshot.events,
  })
}

export function cancelCarpoolApplication(applicationId: string) {
  const application = snapshot.applications.find(
    (item) => item.id === applicationId,
  )
  if (
    !application ||
    (application.status !== "승인 대기" && application.status !== "승인 완료")
  )
    return
  const ride = snapshot.rides.find((item) => item.id === application.rideId)
  if (!ride || ride.status !== "모집 중")
    throw new Error("취소할 수 없는 카풀입니다.")
  save({
    ...snapshot,
    applications: snapshot.applications.map((item) =>
      item.id === applicationId ? { ...item, status: "취소 완료" } : item,
    ),
    events: [
      {
        id: createId("event"),
        type: "reservation-cancelled",
        applicationId,
        title: "카풀 예약이 취소되었습니다",
        message: `${ride.date} ${ride.time} · ${ride.start} → ${ride.destination} 예약이 취소되었습니다.`,
        createdAt: new Date().toISOString(),
      },
      ...snapshot.events,
    ],
  })
}

export function endCarpoolRide(rideId: string) {
  const ride = snapshot.rides.find((item) => item.id === rideId)
  if (!ride || ride.status !== "모집 중") return
  save({
    ...snapshot,
    rides: snapshot.rides.map((item) =>
      item.id === rideId
        ? {
            ...item,
            status: "정산 대기",
            settlementStatus: "정산 대기",
            endedAt: new Date().toISOString(),
          }
        : item,
    ),
  })
}

export function settleCarpoolRide(rideId: string) {
  const ride = snapshot.rides.find((item) => item.id === rideId)
  if (!ride || ride.settlementStatus !== "정산 대기") return
  save({
    ...snapshot,
    rides: snapshot.rides.map((item) =>
      item.id === rideId
        ? {
            ...item,
            status: "완료",
            settlementStatus: "정산 완료",
            settledAt: new Date().toISOString(),
          }
        : item,
    ),
  })
}

export function addCarpoolReview(
  rideId: string,
  rating: number,
  keywords: string[],
  content: string,
) {
  const ride = snapshot.rides.find((item) => item.id === rideId)
  const approved = snapshot.applications.some(
    (item) =>
      item.rideId === rideId &&
      item.riderId === "demo-rider" &&
      item.status === "승인 완료",
  )
  if (!ride || ride.settlementStatus !== "정산 완료" || !approved)
    throw new Error("후기를 작성할 수 없는 카풀입니다.")
  if (
    snapshot.reviews.some(
      (item) => item.rideId === rideId && item.authorId === "demo-rider",
    )
  )
    throw new Error("이미 후기를 작성했습니다.")
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new Error("별점을 선택해 주세요.")
  const review: DemoCarpoolReview = {
    id: createId("review"),
    rideId,
    authorId: "demo-rider",
    targetId: "demo-driver",
    rating,
    keywords,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }
  save({ ...snapshot, reviews: [review, ...snapshot.reviews] })
  return review
}

export function getRemainingSeats(state: DemoCarpoolState, rideId: string) {
  const ride = state.rides.find((item) => item.id === rideId)
  if (!ride) return 0
  const occupied = state.applications.filter(
    (item) => item.rideId === rideId && item.status === "승인 완료",
  ).length
  return Math.max(0, ride.totalSeats - occupied)
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return
    snapshot = readState()
    listeners.forEach((listener) => listener())
  })
}
import {
  calculateEstimatedArrival,
  DEFAULT_ESTIMATED_DURATION,
} from "./demoEta"
