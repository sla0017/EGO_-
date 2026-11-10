export type Role = "driver" | "rider"

export type RoleRegistrations = Record<Role, boolean>

export type RouteData = {
  start: string
  destination: string
  waypoint: string
  pickup: string
  weekdays: string[]
  departureTime: string
  preferredArrival: string
  smokingPreference: string
  genderPreference: string
}

export type AccountData = {
  name: string
  id: string
  email: string
  phone: string
  gender: string
}

export type Ride = {
  id: number
  name: string
  car: string
  start: string
  end: string
  via: string
  time: string
  estimatedDuration: number
  arrivalTime: string
  seats: number
  price: number
  match: number
  rating: number
  reviews: number
}

export type ChatRoomData = {
  id: string
  title: string
  members: string
  preview: string
  time: string
  meeting: string
  rideId?: string
}

export type DemoReview = {
  author: string
  date: string
  score: number
  text: string
  tags: string[]
}

export type ScheduleItem = {
  id: string
  time: string
  status: string
  tone: "open" | "waiting"
  title: string
  location: string
  driverDetail: string
  riderDetail: string
}

export type ReportStatus = "검토 중" | "처리 완료"

export type SafetyReport = {
  id: string
  targetId: string
  targetName: string
  targetRole: "운전자" | "탑승자"
  rideLabel: string
  reason: string
  details: string
  images: string[]
  createdAt: string
  status: ReportStatus
  response: string
}

export type BlockedUser = {
  id: string
  name: string
  blockedAt: string
}

export type ReportTarget = {
  id: string
  name: string
  role: "운전자" | "탑승자"
  rideLabel: string
}

export type HistoryType = "결제" | "이용" | "취소" | "환불"
export type HistoryStatus = "결제 완료" | "이용 완료" | "취소 완료" | "환불 완료"

export type HistoryEntry = {
  id: string
  role: Role
  type: HistoryType
  status: HistoryStatus
  title: string
  date: string
  amount: string
  description: string
  canReview?: boolean
}

export type BadgeIcon = "car" | "check" | "shield" | "star" | "music" | "student" | "clock" | "manner" | "commute"

export type ProfileBadge = {
  id: string
  role: Role
  label: string
  condition: string
  icon: BadgeIcon
  tone: "navy" | "green" | "orange" | "sky"
}

export type NotificationSettings = {
  matching: boolean
  trip: boolean
  chat: boolean
  marketing: boolean
}

export type DemoDevice = {
  id: string
  name: string
  type: string
  lastActive: string
  current: boolean
}

export type FaqItem = {
  id: string
  question: string
  answer: string
}

export type DemoInquiry = {
  id: string
  category: string
  title: string
  content: string
  createdAt: string
}

export type TripStatus = "운행 예정" | "운행 중" | "결제 대기" | "결제 완료"

export type DemoTripFlow = {
  tripId: string
  driverId: string
  approvedPassengerIds: string[]
  driverName: string
  vehicle: string
  start: string
  destination: string
  operatedAt: string
  amount: number
  status: TripStatus
  endedAt: string | null
  paymentRequested: boolean
  paidAt: string | null
}
