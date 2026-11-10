import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CarFront,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  Flag,
  Home,
  MapPin,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Navigation,
  Plus,
  Route,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  Heart,
} from "./components/Icons"
import logo from "./assets/shingu-gil-logo.png"
import transparentLogo from "./assets/shingu-gil-logo-transparent.png"
import {
  APP_VERSION,
  defaultAccount,
  defaultSelectedBadges,
  defaultRoutes,
  serviceFaqs,
  demoHistoryEntries,
  demoProfileBadges,
  demoReportTargets,
  demoChatRooms,
  demoReceivedReviews,
  demoRides as rides,
  demoScheduleByDate,
} from "./data/demoData"
import {
  getBlockedUsers,
  getSafetyReports,
  submitSafetyReport,
  unblockDemoUser,
} from "./services/demoSafety"
import {
  getBiometricDemoState,
  getDemoDevices,
  getNotificationSettings,
  removeDemoDevice,
  saveBiometricDemoState,
  saveDemoInquiry,
  saveNotificationSettings,
} from "./services/demoSettings"
import {
  completeDemoPayment,
  endDemoTrip,
  getTripFlowSnapshot,
  resetDemoTrip,
  startDemoTrip,
  subscribeTripFlow,
} from "./services/demoTripFlow"
import {
  chargeDemoPoints,
  getDemoPointWallet,
  subscribeDemoPointWallet,
  type DemoPaymentMethod,
  type DemoPointCharge,
  type DemoPointWallet,
} from "./services/demoPoints"
import {
  addCarpoolReview,
  applyToCarpool,
  cancelCarpoolApplication,
  createCarpoolRide,
  decideCarpoolApplication,
  endCarpoolRide,
  getCarpoolFlowSnapshot,
  getRemainingSeats,
  settleCarpoolRide,
  subscribeCarpoolFlow,
  type DemoCarpoolRide,
  type DemoCarpoolEvent,
  type DemoCarpoolState,
} from "./services/demoCarpoolFlow"
import {
  readDemoData,
  readDemoList,
  readDemoValue,
  removeDemoData,
  writeDemoData,
  writeDemoValue,
} from "./services/demoStore"
import { getDemoMatches } from "./services/demoMatching"
import { isSupabaseConfigured, supabase } from "./services/supabase"
import {
  calculateEstimatedArrival,
  DEFAULT_ESTIMATED_DURATION,
  etaTimeToMinutes,
  formatEtaDateTime,
  formatEtaTime,
  timeLabelToMinutes,
} from "./services/demoEta"
import {
  getDemoMileageBalance,
  getOrCreateMileageMemberCode,
} from "./services/demoMileage"
import JsBarcode from "jsbarcode"
import type {
  AccountData,
  BlockedUser,
  ChatRoomData,
  DemoDevice,
  DemoInquiry,
  DemoReview,
  DemoTripFlow,
  HistoryEntry,
  NotificationSettings,
  ProfileBadge,
  Ride,
  Role,
  RoleRegistrations,
  RouteData,
  SafetyReport,
} from "./types/domain"

type Tab = "home" | "schedule" | "chat" | "profile"
type AuthView = "login" | "signup" | "reset"
const formatPoints = (value: number) => `${value.toLocaleString("ko-KR")} P`
type MatchRide = {
  id: string
  flowRideId?: string
  name: string
  car: string
  start: string
  end: string
  via: string
  date: string
  time: string
  estimatedDuration: number
  estimatedArrival: string
  seats: number
  price: number
  match: number
  rating: number
  reviews: number
}

const toMatchRide = (ride: Ride): MatchRide => {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  })
  const departureMinutes = timeLabelToMinutes(ride.time) ?? 0
  const departureTime = `${String(Math.floor(departureMinutes / 60)).padStart(
    2,
    "0",
  )}:${String(departureMinutes % 60).padStart(2, "0")}`
  return {
    ...ride,
    id: `demo-${ride.id}`,
    date: new Date().toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    }),
    estimatedArrival: calculateEstimatedArrival(
      today,
      departureTime,
      ride.estimatedDuration,
    ),
  }
}

const toFlowMatchRide = (
  ride: DemoCarpoolRide,
  carpoolFlow: DemoCarpoolState,
): MatchRide => ({
  id: `flow-${ride.id}`,
  flowRideId: ride.id,
  name: ride.driverName,
  car: ride.vehicle,
  start: ride.start,
  end: ride.destination,
  via: ride.waypoints || "등록된 주요 경유지 없음",
  date: new Date(`${ride.date}T00:00:00`).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  }),
  time: ride.time,
  estimatedDuration: ride.estimatedDuration,
  estimatedArrival: ride.estimatedArrival,
  seats: getRemainingSeats(carpoolFlow, ride.id),
  price: ride.price,
  match: 99,
  rating: 4.9,
  reviews: 24,
})

const getVisibleMatchRides = (
  route: RouteData,
  carpoolFlow: DemoCarpoolState,
) => {
  const preferredArrival = timeLabelToMinutes(route.preferredArrival ?? "")
  return [
    ...carpoolFlow.rides
      .filter((ride) => ride.status === "모집 중")
      .map((ride) => toFlowMatchRide(ride, carpoolFlow)),
    ...getDemoMatches(route, rides).map(toMatchRide),
  ]
    .map((ride) => {
      const arrival = etaTimeToMinutes(ride.estimatedArrival)
      const arrivalDifference =
        preferredArrival === null || arrival === null
          ? null
          : Math.abs(preferredArrival - arrival)
      const arrivalScore =
        arrivalDifference === null
          ? 0
          : arrivalDifference <= 15
            ? 8
            : arrivalDifference <= 30
              ? 4
              : 0
      return {
        ...ride,
        match: Math.min(99, ride.match + arrivalScore),
        arrivalDifference,
      }
    })
    .sort(
      (left, right) =>
        right.match - left.match ||
        (left.arrivalDifference ?? Number.MAX_SAFE_INTEGER) -
          (right.arrivalDifference ?? Number.MAX_SAFE_INTEGER),
    )
}
type Sheet = "ride" | "matches" | "create" | "reservation" | "notifications" | "points" | "mileage" | "mileage-history" | "history" | "carpool-payment" | "safety" | "safety-report" | "blocked-users" | "report-history" | "privacy" | "privacy-policy" | "roles" | "driver-register" | "rider-register" | "settings" | "notification-settings" | "security-settings" | "service-guide" | "passenger-guide" | "driver-guide" | "contact-support" | "route-edit" | "applications" | "application-detail" | "calendar" | "account" | "account-edit" | "monthly-rides" | "review" | "reviews" | null

function normalizeRegistrations(
  value: unknown,
  currentRole: Role = "rider",
): RoleRegistrations {
  if (!value || typeof value !== "object") {
    return { rider: currentRole === "rider", driver: currentRole === "driver" }
  }

  const stored = value as Partial<RoleRegistrations>
  return {
    rider: stored.rider === true || currentRole === "rider",
    driver: stored.driver === true || currentRole === "driver",
  }
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "soft"
}) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}

function Toggle({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: () => void
}) {
  return (
    <button
      type="button"
      className={`toggle-switch ${checked ? "is-on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
    >
      <i />
    </button>
  )
}

function Field({
  label,
  icon,
  iconRight,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  icon?: ReactNode
  iconRight?: ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="field__control">
        {icon}
        <input {...props} />
        {iconRight}
      </span>
    </label>
  )
}

function Brand({
  compact = false,
  transparent = false,
}: {
  compact?: boolean
  transparent?: boolean
}) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <img src={transparent ? transparentLogo : logo} alt="신구길 로고" />
      {compact && (
        <div>
          <strong>신구길</strong>
          <span>SHINGU-GIL</span>
        </div>
      )}
    </div>
  )
}

function BadgeGlyph({ badge }: { badge: ProfileBadge }) {
  if (badge.icon === "car") return <CarFront />
  if (badge.icon === "check") return <Check />
  if (badge.icon === "shield") return <ShieldCheck />
  if (badge.icon === "star") return <Star />
  if (badge.icon === "music") return <MessageCircle />
  if (badge.icon === "clock") return <Clock3 />
  if (badge.icon === "manner") return <UserRound />
  if (badge.icon === "commute") return <UsersRound />
  return <ShieldCheck />
}

function Auth({
  view,
  setView,
  onLogin,
}: {
  view: AuthView
  setView: (view: AuthView) => void
  onLogin: (role: Role) => void
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<Role>("rider")
  const [verified, setVerified] = useState(false)
  const [signupName, setSignupName] = useState("")
  const [signupId, setSignupId] = useState("")
  const [idChecked, setIdChecked] = useState(false)
  const [signupPassword, setSignupPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [phone, setPhone] = useState("")
  const [driverLicenseSelected, setDriverLicenseSelected] = useState(false)
  const [vehicleName, setVehicleName] = useState("")
  const [vehicleCapacity, setVehicleCapacity] = useState("5")
  const [departureTime, setDepartureTime] = useState("오전 08:10")
  const [driverSeats, setDriverSeats] = useState("3")
  const [frequentDays, setFrequentDays] = useState("월, 수, 금")
  const totalSignupSteps = 3
  const driverInfoValid =
    !role ||
    role === "rider" ||
    (Number.isInteger(Number(vehicleCapacity)) &&
      Number(vehicleCapacity) > 0 &&
      Number.isInteger(Number(driverSeats)) &&
      Number(driverSeats) > 0)

  if (view === "reset") {
    return (
      <main className="auth">
        <button
          className="icon-button auth__back"
          onClick={() => setView("login")}
          aria-label="뒤로 가기"
        >
          <ArrowLeft />
        </button>
        <div className="auth__header">
          <span className="eyebrow">계정 찾기</span>
          <h1>비밀번호 재설정</h1>
          <p>가입한 신구대학교 이메일로 본인을 확인해 주세요.</p>
        </div>
        <div className="form-stack">
          <Field label="아이디" placeholder="아이디 입력" />
          <Field label="학교 이메일" placeholder="student@shingu.ac.kr" />
          <Button onClick={() => alert("데모 인증번호 0624가 발송되었습니다.")}>
            인증번호 받기
          </Button>
          <p className="helper">
            실제 비밀번호는 안내하지 않으며, 인증 후 새 비밀번호를 설정합니다.
          </p>
        </div>
      </main>
    )
  }

  if (view === "signup") {
    return (
      <main className="auth auth--signup">
        <div className="signup-top">
          <button
            className="icon-button"
            onClick={() => (step === 1 ? setView("login") : setStep(step - 1))}
            aria-label="뒤로 가기"
          >
            <ArrowLeft />
          </button>
          <span>회원가입</span>
          <span className="step-count">
            {step}/{totalSignupSteps}
          </span>
        </div>
        <div className="progress">
          <i style={{ width: `${(step / totalSignupSteps) * 100}%` }} />
        </div>
        {step === 1 && (
          <section className="signup-panel">
            <span className="eyebrow">STEP 1</span>
            <h1>
              신구대학교 학생인지
              <br />
              확인할게요
            </h1>
            <p>학교 이메일 형식을 확인하는 데모 인증 단계입니다.</p>
            <div className="form-stack">
              <Field label="학교 이메일" placeholder="student@shingu.ac.kr" />
              <div className="inline-action">
                <Field label="인증번호" placeholder="6자리 입력" />
                <Button variant="secondary" onClick={() => setVerified(true)}>
                  확인
                </Button>
              </div>
              {verified && (
                <div className="success">
                  <Check /> 데모 이메일 확인이 완료되었습니다.
                </div>
              )}
              <p className="helper">
                실제 메일 발송이나 학교 계정 인증은 서버 연결 후 제공됩니다.
              </p>
            </div>
          </section>
        )}
        {step === 2 && (
          <section className="signup-panel">
            <span className="eyebrow">STEP 2</span>
            <h1>
              어떻게 신구길을
              <br />
              이용하시나요?
            </h1>
            <p>역할은 가입 후 프로필에서 변경을 요청할 수 있어요.</p>
            <div className="role-grid">
              <button
                className={`role-card ${role === "driver" ? "is-active" : ""}`}
                onClick={() => setRole("driver")}
              >
                <CarFront />
                <strong>운전자</strong>
                <span>내 차로 함께 이동해요</span>
                {role === "driver" && (
                  <i>
                    <Check />
                  </i>
                )}
              </button>
              <button
                className={`role-card ${role === "rider" ? "is-active" : ""}`}
                onClick={() => setRole("rider")}
              >
                <UsersRound />
                <strong>탑승자</strong>
                <span>맞는 카풀을 찾아요</span>
                {role === "rider" && (
                  <i>
                    <Check />
                  </i>
                )}
              </button>
            </div>
          </section>
        )}
        {step === 3 && (
          <section className="signup-panel">
            <span className="eyebrow">
              STEP 3 · {role === "driver" ? "운전자" : "탑승자"}
            </span>
            <h1>
              기본 정보를
              <br />
              알려주세요
            </h1>
            <div className="form-stack compact">
              <Field
                label="이름"
                placeholder="실명을 입력해 주세요"
                value={signupName}
                onChange={(event) => setSignupName(event.target.value)}
              />
              <div className="inline-action">
                <Field
                  label="아이디"
                  placeholder="사용할 아이디"
                  value={signupId}
                  onChange={(event) => {
                    setSignupId(event.target.value)
                    setIdChecked(false)
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (signupId.trim().length < 4) {
                      alert("아이디는 4자 이상 입력해 주세요.")
                      return
                    }
                    setIdChecked(true)
                    alert("사용 가능한 아이디입니다.")
                  }}
                >
                  <span className="duplicate-check-label" data-fge-id="fge-136">
                    <span className="fg-inline-italic">중복 확인</span>
                  </span>
                </Button>
              </div>
              {idChecked && <span className="success">아이디 확인 완료</span>}
              <Field
                label="비밀번호"
                type="password"
                placeholder="8자 이상 입력"
                value={signupPassword}
                onChange={(event) => setSignupPassword(event.target.value)}
              />
              <Field
                label="비밀번호 확인"
                type="password"
                placeholder="비밀번호를 다시 입력"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
              />
              {passwordConfirm && signupPassword !== passwordConfirm && (
                <span className="field-error">
                  비밀번호가 일치하지 않습니다.
                </span>
              )}
              <Field
                label="전화번호"
                type="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              {phone && !/^010-\d{4}-\d{4}$/.test(phone) && (
                <span className="field-error">
                  010-0000-0000 형식으로 입력해 주세요.
                </span>
              )}
              <label className="field">
                <span>성별 · 선택 사항 · 기본 비공개</span>
                <select defaultValue="">
                  <option value="">선택하지 않음</option>
                  <option value="female">여성</option>
                  <option value="male">남성</option>
                  <option value="private">비공개</option>
                </select>
              </label>
              {role === "driver" && (
                <>
                  <Field
                    label="출발 시간대"
                    value={departureTime}
                    iconRight={<Clock3 />}
                    onChange={(event) => setDepartureTime(event.target.value)}
                  />
                  <Field
                    label="운전면허증 · 데모 인증"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(event) =>
                      setDriverLicenseSelected(Boolean(event.target.files?.length))
                    }
                  />
                  <Field
                    label="차량 종류 및 차종"
                    placeholder="예: 현대 아반떼"
                    icon={<CarFront />}
                    value={vehicleName}
                    onChange={(event) => setVehicleName(event.target.value)}
                  />
                  <div className="two-fields">
                    <Field
                      label="차량 정원"
                      type="number"
                      min="1"
                      value={vehicleCapacity}
                      onChange={(event) => setVehicleCapacity(event.target.value)}
                    />
                    <Field
                      label="모집 좌석"
                      type="number"
                      min="1"
                      value={driverSeats}
                      onChange={(event) => setDriverSeats(event.target.value)}
                    />
                  </div>
                  <Field
                    label="자주 이용하는 요일"
                    placeholder="월, 수, 금"
                    value={frequentDays}
                    onChange={(event) => setFrequentDays(event.target.value)}
                  />
                </>
              )}
              <label className="check-row">
                <input type="checkbox" defaultChecked />
                <span>
                  <Check />
                </span>{" "}
                필수 약관 및 개인정보 처리방침에 동의합니다.
              </label>
            </div>
          </section>
        )}
        <div className="signup-footer">
          <Button
            disabled={step === 1 && !verified}
            onClick={() => {
              if (step < totalSignupSteps) {
                setStep(step + 1)
              } else {
                if (role === "driver") {
                  const savedRoutes = readDemoData("routes", defaultRoutes)
                  const formattedTime =
                    departureTime
                      .replace("오전 ", "")
                      .replace("오후 ", "")
                      .trim() || "08:10"
                  const parsedDays = frequentDays
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                  const updated = {
                    ...savedRoutes,
                    driver: {
                      ...savedRoutes.driver,
                      departureTime: formattedTime,
                      weekdays:
                        parsedDays.length > 0
                          ? parsedDays
                          : savedRoutes.driver.weekdays,
                    },
                  }
                  writeDemoData("routes", updated)
                }
                if (isSupabaseConfigured) {
                  const formattedTime =
                    departureTime
                      .replace("오전 ", "")
                      .replace("오후 ", "")
                      .trim() || "08:10"
                  const parsedDays = frequentDays
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                  supabase
                    .from("profiles")
                    .upsert(
                      {
                        user_id: signupId || "shingu_" + Date.now(),
                        name: signupName || (role === "driver" ? "운전자" : "탑승자"),
                        email: `${signupId || "student"}@shingu.ac.kr`,
                        phone: phone || "010-0000-0000",
                        role: role,
                        vehicle_name: role === "driver" ? vehicleName : null,
                        vehicle_capacity:
                          role === "driver" ? Number(vehicleCapacity) || 5 : 5,
                        driver_seats:
                          role === "driver" ? Number(driverSeats) || 3 : 0,
                        departure_time: role === "driver" ? formattedTime : "08:10",
                        weekdays:
                          role === "driver"
                            ? parsedDays
                            : ["월", "화", "수", "목", "금"],
                      },
                      { onConflict: "user_id" },
                    )
                    .then(({ error }) => {
                      if (error) console.warn("Supabase profile save error:", error)
                    })
                }
                onLogin(role)
              }
            }}
          >
            {step === totalSignupSteps
              ? "가입 완료하고 시작하기"
              : "다음"}
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="auth auth--login">
      <div className="login-brand">
        <Brand transparent />
      </div>
      <div className="login-card">
        <div className="form-stack">
          <Field
            label="아이디"
            placeholder="아이디를 입력하세요"
            defaultValue="shingu24"
          />
          <label className="field">
            <span>비밀번호</span>
            <span className="field__control">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호를 입력하세요"
                defaultValue="test1234"
              />
              <button
                className="field__button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="비밀번호 표시 전환"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </span>
          </label>
          <label className="toggle-label login-keep">
            <input type="checkbox" defaultChecked /> 로그인 상태 유지
          </label>
          <Button onClick={() => onLogin("rider")}>로그인</Button>
          <button className="login-link" onClick={() => setView("reset")}>
            비밀번호를 잊으셨나요?
          </button>
        </div>
        <p className="join">
          처음이신가요?{" "}
          <button onClick={() => setView("signup")}>신구길 가입하기</button>
        </p>
        <Button variant="soft" onClick={() => onLogin("driver")}>
          <CarFront /> 운전자 데모로 입장
        </Button>
      </div>
      <p className="demo-note">
        <ShieldCheck /> 신구대학교 이메일 인증 학생 전용 서비스
      </p>
    </main>
  )
}

function Header({
  role,
  onBell,
  onRole,
}: {
  role: Role
  onBell: () => void
  onRole: () => void
}) {
  return (
    <header className="app-header">
      <Brand compact />
      <div className="header-actions">
        <button
          className={`role-pill role-switch-button ${role}`}
          onClick={onRole}
        >
          <Check />
          {role === "driver" ? "운전자" : "탑승자"}
        </button>
        <button
          className="icon-button has-badge"
          onClick={onBell}
          aria-label="알림"
        >
          <Bell />
          <i />
        </button>
      </div>
    </header>
  )
}

function RouteCard({
  small = false,
  route = defaultRoutes.rider,
}: {
  small?: boolean
  route?: RouteData
}) {
  return (
    <div className={`route-card ${small ? "route-card--small" : ""}`}>
      <div className="route-line">
        <i />
        <span />
        <i />
      </div>
      <div className="route-copy">
        <div>
          <span>출발</span>
          <strong>{route.start}</strong>
        </div>
        <div>
          <span>도착</span>
          <strong>{route.destination}</strong>
        </div>
      </div>
    </div>
  )
}

function RiderHome({
  open,
  route,
  tripFlow,
  carpoolFlow,
  onOpenChat,
  onSelectRide,
}: {
  open: (sheet: Sheet) => void
  route: RouteData
  tripFlow: DemoTripFlow
  carpoolFlow: DemoCarpoolState
  onOpenChat: (rideId: string) => void
  onSelectRide: (ride: MatchRide) => void
}) {
  const [activeRide, setActiveRide] = useState(0)
  const rideListRef = useRef<HTMLDivElement>(null)
  const matchedRides = useMemo(
    () => getVisibleMatchRides(route, carpoolFlow),
    [route, carpoolFlow],
  )
  const riderApplications = carpoolFlow.applications.filter(
    (item) => item.riderId === "demo-rider",
  )
  const latestApplication = riderApplications[0]
  const latestApplicationRide = carpoolFlow.rides.find(
    (item) => item.id === latestApplication?.rideId,
  )
  const moveRide = (nextIndex: number) => {
    const safeIndex = Math.max(0, Math.min(nextIndex, matchedRides.length - 1))
    const card = rideListRef.current?.children[safeIndex] as HTMLElement
    card?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    })
    setActiveRide(safeIndex)
  }

  return (
    <div className="page">
      <section className="hello">
        <div>
          <p>좋은 아침이에요,</p>
          <h1>민지님</h1>
        </div>
        <div className="weather">
          <span>12°</span>
          <small>맑음</small>
        </div>
      </section>
      <section className="hero-search">
        <div className="section-heading light">
          <span>나의 통학 경로</span>
          <button onClick={() => open("route-edit")}>기본 경로 수정</button>
        </div>
        <RouteCard small route={route} />
        <div className="search-row">
          <button>
            <CalendarDays />
            <span>
              <small>날짜</small>
              {new Date().toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </span>
          </button>
          <button onClick={() => open("route-edit")}>
            <Clock3 />
            <span>
              <small>출발 · 희망 도착</small>
              {route.departureTime} → {route.preferredArrival || "미설정"}
            </span>
          </button>
        </div>
        <Button onClick={() => open("matches")}>
          <Search /> 맞는 카풀 찾기
        </Button>
        <Button
          variant="secondary"
          className="reservation-button"
          onClick={() => open("reservation")}
        >
          <CalendarDays /> 원하는 날짜 예약
        </Button>
      </section>
      {latestApplicationRide?.status === "정산 대기" &&
        latestApplication?.status === "승인 완료" && (
          <section className="section settlement-notice">
            <span className="status-icon">
              <WalletCards />
            </span>
            <div>
              <span className="tag waiting">정산 대기</span>
              <h2>운행이 종료되었습니다</h2>
              <p>운행이 종료되었습니다. 정산을 진행해 주세요.</p>
            </div>
            <Button onClick={() => onOpenChat(latestApplicationRide.id)}>
              정산하러 가기
            </Button>
          </section>
        )}
      {tripFlow.paymentRequested &&
        tripFlow.approvedPassengerIds.includes("demo-rider") && (
          <section className="section payment-request-section">
            <article className="payment-request-card">
              <div className="payment-request-heading">
                <span className="status-icon">
                  {tripFlow.status === "결제 완료" ? (
                    <Check />
                  ) : (
                    <WalletCards />
                  )}
                </span>
                <div>
                  <span
                    className={`tag ${
                      tripFlow.status === "결제 완료" ? "open" : "waiting"
                    }`}
                  >
                    {tripFlow.status}
                  </span>
                  <h2>
                    {tripFlow.status === "결제 완료"
                      ? "결제가 완료되었습니다"
                      : "운행이 종료되었습니다"}
                  </h2>
                </div>
              </div>
              <p>
                {tripFlow.status === "결제 완료"
                  ? "데모 결제 내역을 확인할 수 있어요."
                  : "카풀 이용 내역을 확인하고 결제를 진행해 주세요."}
              </p>
              <RouteCard route={route} />
              <div className="payment-request-meta">
                <span>{tripFlow.operatedAt}</span>
                <strong>{tripFlow.amount.toLocaleString()} P</strong>
              </div>
              <Button onClick={() => open("carpool-payment")}>
                {tripFlow.status === "결제 완료"
                  ? "결제 내역 확인"
                  : "결제하기"}
              </Button>
            </article>
          </section>
        )}
      <section className="section" id="matches">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SMART MATCH</span>
            <h2>경로가 겹치는 카풀이에요</h2>
          </div>
        </div>
        <p className="section-sub">
          시간과 경로를 분석한 데모 추천이에요. 좌우로 넘겨보세요.
        </p>
        {matchedRides.length > 0 ? (
          <>
            <div
              className="ride-list"
              ref={rideListRef}
              onScroll={(event) => {
                const container = event.currentTarget
                const cards = Array.from(container.children) as HTMLElement[]
                const center = container.scrollLeft + container.clientWidth / 2
                const closest = cards.reduce(
                  (best, card, index) => {
                    const cardCenter = card.offsetLeft + card.offsetWidth / 2
                    const distance = Math.abs(center - cardCenter)
                    return distance < best.distance ? { index, distance } : best
                  },
                  { index: 0, distance: Number.POSITIVE_INFINITY },
                )
                setActiveRide(closest.index)
              }}
            >
              {matchedRides.map((ride, index) => (
                <button
                  className={`ride-card ${
                    activeRide === index ? "is-active" : ""
                  }`}
                  key={ride.id}
                  onClick={() => onSelectRide(ride)}
                >
                  <div className="ride-top">
                    <div className="avatar">{ride.name.slice(0, 1)}</div>
                    <div>
                      <strong>
                        {ride.name} <ShieldCheck />
                      </strong>
                      <span>{ride.car}</span>
                    </div>
                  </div>
                  <div className="mini-route">
                    <div>
                      <i />
                      <span>
                        <strong>{ride.start}</strong>
                        <small>{ride.time} 출발</small>
                      </span>
                    </div>
                    <div className="via">경유 · {ride.via}</div>
                    <div>
                      <i />
                      <span>
                        <strong>{ride.end}</strong>
                        <small className="eta-arrival">
                          {formatEtaTime(ride.estimatedArrival)} 도착 예정
                        </small>
                      </span>
                    </div>
                  </div>
                  <div className="eta-summary">
                    <Clock3 />
                    <span>
                      {ride.time} 출발 →{" "}
                      <strong>
                        {formatEtaTime(ride.estimatedArrival)} 도착 예정
                      </strong>
                    </span>
                    <small>약 {ride.estimatedDuration}분</small>
                  </div>
                  <div className="ride-bottom">
                    <span>
                      <Star /> {ride.rating} ({ride.reviews})
                    </span>
                    <span>
                      <UsersRound /> {ride.seats}자리
                    </span>
                    <strong>{ride.price.toLocaleString()} P</strong>
                  </div>
                </button>
              ))}
            </div>
            <div className="carousel-controls">
              <button
                onClick={() => moveRide(activeRide - 1)}
                disabled={activeRide === 0}
                aria-label="이전 카풀"
              >
                <ChevronRight className="flip" />
              </button>
              <div className="carousel-dots" aria-label="카풀 카드 위치">
                {matchedRides.map((ride, index) => (
                  <button
                    className={activeRide === index ? "active" : ""}
                    onClick={() => moveRide(index)}
                    aria-label={`${index + 1}번째 카풀`}
                    key={ride.id}
                  />
                ))}
              </div>
              <button
                onClick={() => moveRide(activeRide + 1)}
                disabled={activeRide === matchedRides.length - 1}
                aria-label="다음 카풀"
              >
                <ChevronRight />
              </button>
            </div>
          </>
        ) : (
          <div className="recommendation-empty">
            <Route />
            <strong>추천 조건을 설정해 주세요</strong>
            <p>출발지, 목적지와 희망 시간을 저장하면 맞는 카풀을 찾아드려요.</p>
            <Button variant="soft" onClick={() => open("route-edit")}>
              기본 경로 설정
            </Button>
          </div>
        )}
      </section>
      <section className="section">
        <div className="section-heading">
          <h2>신청한 카풀</h2>
          <button onClick={() => open("applications")}>내역보기</button>
        </div>
        {latestApplication && latestApplicationRide ? (
          <button
            className="status-card status-card--button"
            onClick={() =>
              latestApplicationRide.status === "완료"
                ? open("review")
                : open("applications")
            }
          >
            <span className="status-icon">
              {latestApplicationRide.status === "완료" ? <Check /> : <Clock3 />}
            </span>
            <div>
              <span
                className={`tag ${
                  latestApplication.status === "승인 완료" ? "open" : "waiting"
                }`}
              >
                {latestApplicationRide.status === "완료"
                  ? "완료된 카풀"
                  : latestApplication.status}
              </span>
              <strong>
                {latestApplicationRide.date} · {latestApplicationRide.time}
              </strong>
              <small>
                {latestApplicationRide.start} →{" "}
                {latestApplicationRide.destination}
                {" · "}
                {latestApplicationRide.price.toLocaleString()} P
              </small>
              <small className="eta-inline">
                {formatEtaTime(latestApplicationRide.estimatedArrival)} 도착 예정
                · 약 {latestApplicationRide.estimatedDuration}분
              </small>
            </div>
            <ChevronRight />
          </button>
        ) : (
          <div className="schedule-empty compact-empty">
            <CalendarDays />
            <strong>신청한 카풀이 없어요</strong>
            <p>원하는 날짜를 선택해 카풀을 예약해 보세요.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function DriverHome({
  open,
  route,
  tripFlow,
  onStartTrip,
  onEndTrip,
  onResetTrip,
  carpoolFlow,
  onOpenChat,
  mileageBalance,
}: {
  open: (sheet: Sheet) => void
  route: RouteData
  tripFlow: DemoTripFlow
  onStartTrip: () => void
  onEndTrip: () => void
  onResetTrip: () => void
  carpoolFlow: DemoCarpoolState
  onOpenChat: (rideId: string) => void
  mileageBalance: number
}) {
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [approvalNoticeOpen, setApprovalNoticeOpen] = useState(false)
  const [endRideId, setEndRideId] = useState<string | null>(null)
  const [decisionApplicationId, setDecisionApplicationId] =
    useState<string | null>(null)
  const [approved, setApproved] = useState(
    () => readDemoValue("request-approved") === "true",
  )
  const newestRide = carpoolFlow.rides[0]
  const newestRideApplications = carpoolFlow.applications.filter(
    (item) => item.rideId === newestRide?.id,
  )
  const pendingApplication = newestRideApplications.find(
    (item) => item.status === "승인 대기",
  )
  return (
    <div className="page">
      <section className="hello driver-hello">
        <div>
          <p>안전한 운행 준비되셨나요?</p>
          <h1>도윤님, 좋은 아침이에요</h1>
        </div>
        <span className="verified">
          <ShieldCheck /> 데모 등록 완료
        </span>
      </section>
      {newestRide && (
        <section className="section integrated-flow-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">DEMO CARPOOL FLOW</span>
              <h2>최근 등록한 카풀</h2>
            </div>
            <span
              className={`tag ${
                newestRide.status === "모집 중" ? "open" : "waiting"
              }`}
            >
              {newestRide.status}
            </span>
          </div>
          <h3>
            {newestRide.start} → {newestRide.destination}
          </h3>
          <p>
            {newestRide.date} · {newestRide.time} ·{" "}
            {newestRide.price.toLocaleString()} P
          </p>
          <div className="eta-inline-card">
            <Clock3 />
            <span>
              <small>등록 일정 기준 도착 예정</small>
              <strong>{formatEtaTime(newestRide.estimatedArrival)}</strong>
            </span>
            <b>약 {newestRide.estimatedDuration}분</b>
          </div>
          <p>
            승인{" "}
            {
              newestRideApplications.filter(
                (item) => item.status === "승인 완료",
              ).length
            }
            명{" · "}잔여 {getRemainingSeats(carpoolFlow, newestRide.id)}석
          </p>
          {newestRide.status === "모집 중" && (
            <Button
              variant="soft"
              onClick={() => {
                setEndRideId(newestRide.id)
                setShowEndConfirm(true)
              }}
            >
              운행 종료
            </Button>
          )}
          {newestRide.status === "정산 대기" && (
            <>
              <div className="demo-banner">
                <CircleHelp />
                <p>
                  <strong>데모 정산 대기</strong>
                  운행이 종료되었습니다. 정산을 진행해 주세요.
                </p>
              </div>
              <Button onClick={() => onOpenChat(newestRide.id)}>
                정산하러 가기
              </Button>
            </>
          )}
          {pendingApplication && (
            <article className="integrated-request">
              <div className="avatar green">박</div>
              <div>
                <strong>{pendingApplication.riderName} 탑승 신청</strong>
                <small>
                  {new Date(pendingApplication.createdAt).toLocaleString(
                    "ko-KR",
                  )}
                </small>
              </div>
              <div className="request-actions">
                <Button
                  variant="ghost"
                  onClick={() =>
                    decideCarpoolApplication(pendingApplication.id, "reject")
                  }
                >
                  거절
                </Button>
                <Button
                  onClick={() =>
                    setDecisionApplicationId(pendingApplication.id)
                  }
                >
                  승인
                </Button>
              </div>
            </article>
          )}
        </section>
      )}
      <section className="driver-summary">
        <div className="section-heading light">
          <span>오늘의 운행</span>
          <span
            className={`tag ${
              tripFlow.status === "결제 대기" ? "waiting" : "open"
            }`}
          >
            {tripFlow.status}
          </span>
        </div>
        <h2>오전 8:10 출발</h2>
        <button
          className="driver-route-edit"
          onClick={() => open("route-edit")}
        >
          기본 경로 수정
        </button>
        <RouteCard small route={route} />
        <div className="occupancy">
          <div>
            <span>탑승 확정</span>
            <strong>
              {approved ? 3 : 2}
              <small>/3명</small>
            </strong>
          </div>
          <div className="seat-dots">
            <i className="filled" />
            <i className="filled" />
            <i className={approved ? "filled" : ""} />
          </div>
          <span>{approved ? "모집 완료" : "잔여 1석"}</span>
        </div>
        <Button
          disabled={
            tripFlow.status === "결제 대기" || tripFlow.status === "결제 완료"
          }
          onClick={() => {
            if (tripFlow.status === "운행 중") {
              setShowEndConfirm(true)
              return
            }
            onStartTrip()
          }}
        >
          {tripFlow.status === "운행 중" ? (
            <>
              <Check /> 운행 종료하기
            </>
          ) : tripFlow.status === "결제 대기" ? (
            <>
              <Clock3 /> 탑승자 결제 대기
            </>
          ) : tripFlow.status === "결제 완료" ? (
            <>
              <Check /> 결제 완료
            </>
          ) : (
            <>
              <Navigation /> 운행 시작하기
            </>
          )}
        </Button>
        {(tripFlow.status === "결제 대기" ||
          tripFlow.status === "결제 완료") && (
          <div className="driver-payment-status">
            <div>
              <span>박민지 탑승자</span>
              <strong>
                {tripFlow.status === "결제 완료" ? "결제 완료" : "결제 대기"}
              </strong>
            </div>
            <p>
              {tripFlow.status === "결제 완료"
                ? `${tripFlow.amount.toLocaleString()} P 데모 결제가 확인됐어요.`
                : "운행이 종료되었습니다. 탑승자의 결제를 기다리는 중입니다."}
            </p>
            <button onClick={onResetTrip}>발표용 흐름 초기화</button>
          </div>
        )}
      </section>
      {showEndConfirm && (
        <div className="dialog-backdrop flow-dialog-backdrop">
          <section className="app-dialog">
            <span className="dialog-icon neutral">
              <CarFront />
            </span>
            <h2>운행을 종료할까요?</h2>
            <p>운행 종료 후 탑승자에게 정산 안내가 표시됩니다.</p>
            <div className="dialog-actions">
              <Button variant="ghost" onClick={() => setShowEndConfirm(false)}>
                계속 운행
              </Button>
              <Button
                onClick={() => {
                  if (endRideId) endCarpoolRide(endRideId)
                  else onEndTrip()
                  setShowEndConfirm(false)
                  setEndRideId(null)
                }}
              >
                운행 종료
              </Button>
            </div>
          </section>
        </div>
      )}
      {decisionApplicationId && (
        <div className="dialog-backdrop flow-dialog-backdrop">
          <section className="app-dialog">
            <span className="dialog-icon neutral">
              <UsersRound />
            </span>
            <h2>탑승 신청을 승인할까요?</h2>
            <p>승인된 신청만 좌석을 사용하며 양쪽 일정과 채팅에 반영됩니다.</p>
            <div className="dialog-actions">
              <Button
                variant="ghost"
                onClick={() => setDecisionApplicationId(null)}
              >
                취소
              </Button>
              <Button
                onClick={() => {
                  decideCarpoolApplication(decisionApplicationId, "approve")
                  setDecisionApplicationId(null)
                }}
              >
                승인
              </Button>
            </div>
          </section>
        </div>
      )}
      <section className="quick-grid">
        <button onClick={() => open("create")}>
          <span>
            <Plus />
          </span>
          <strong>새 일정 등록</strong>
          <small>카풀 모집 시작</small>
        </button>
        <button onClick={() => open("mileage")}>
          <span>
            <WalletCards />
          </span>
          <strong>{mileageBalance.toLocaleString("ko-KR")} M</strong>
          <small>나의 마일리지</small>
        </button>
      </section>
      <section className="section">
        <div className="section-heading">
          <h2>새 탑승 신청</h2>
          <button onClick={() => open("applications")}>전체보기</button>
        </div>
        <div className="request-card">
          <div className="avatar green">박</div>
          <div>
            <strong>박민지</strong>
            <span>
              <Star /> 4.9 · 탑승 12회
            </span>
            <small>모란역에서 탑승 희망</small>
          </div>
          <div className="request-actions">
            <Button
              variant="ghost"
              disabled={approved}
              onClick={() => alert("탑승 신청이 거절 처리되었습니다.")}
            >
              거절
            </Button>
            <Button
              disabled={approved}
              onClick={() => {
                writeDemoValue("request-approved", "true")
                writeDemoValue("chat-created", "true")
                setApproved(true)
                setApprovalNoticeOpen(true)
              }}
            >
              {approved ? "승인 완료" : "승인"}
            </Button>
          </div>
        </div>
      </section>
      {approvalNoticeOpen && (
        <div className="dialog-backdrop flow-dialog-backdrop">
          <section className="app-dialog" role="alertdialog" aria-modal="true">
            <span className="dialog-icon">
              <Check />
            </span>
            <h2>탑승 신청 승인 완료</h2>
            <p>탑승자가 일정과 기존 카풀 채팅방에 추가되었습니다.</p>
            <Button onClick={() => setApprovalNoticeOpen(false)}>확인</Button>
          </section>
        </div>
      )}
      <section className="section">
        <div className="section-heading">
          <h2>이번 달 운행</h2>
          <button onClick={() => open("monthly-rides")}>내역 보기</button>
        </div>
        <div className="stats">
          <div>
            <span>완료 운행</span>
            <strong>8회</strong>
          </div>
          <div>
            <span>함께한 학생</span>
            <strong>19명</strong>
          </div>
          <div>
            <span>적립 예정</span>
            <strong>3,420M</strong>
          </div>
        </div>
      </section>
    </div>
  )
}

function SchedulePage({
  role,
  open,
  carpoolFlow,
}: {
  role: Role
  open: (sheet: Sheet) => void
  carpoolFlow: DemoCarpoolState
}) {
  const today = new Date()
  const initialWeekStart = new Date(today)
  initialWeekStart.setDate(today.getDate() - today.getDay())
  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [selectedDate, setSelectedDate] = useState(today)
  const [weekDirection, setWeekDirection] = useState<"prev" | "next">("next")
  const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"]
  const formatDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    return date
  })
  const selectedKey = formatDateKey(selectedDate)
  const selectedSchedules = demoScheduleByDate[selectedKey] || []
  const visibleFlowRides = carpoolFlow.rides.filter((ride) => {
    if (role === "driver") return ride.driverId === "demo-driver"
    return ride.status === "모집 중"
  })
  const selectedFlowRides = visibleFlowRides.filter(
    (ride) => ride.date === selectedKey,
  )
  const moveWeek = (direction: -1 | 1) => {
    const nextStart = new Date(weekStart)
    nextStart.setDate(weekStart.getDate() + direction * 7)
    const nextSelected = new Date(nextStart)
    nextSelected.setDate(nextStart.getDate() + selectedDate.getDay())
    setWeekDirection(direction > 0 ? "next" : "prev")
    setWeekStart(nextStart)
    setSelectedDate(nextSelected)
  }

  return (
    <div className="page page--plain">
      <div className="page-title">
        <div>
          <span className="eyebrow">MY SCHEDULE</span>
          <h1>일정</h1>
        </div>
        <button className="icon-button" onClick={() => open("calendar")}>
          <Plus />
        </button>
      </div>
      <p className="schedule-today">
        오늘 ·{" "}
        {today.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })}
      </p>
      {visibleFlowRides.length > 0 && (
        <section className="flow-schedule-overview">
          <div className="section-heading">
            <h2>{role === "driver" ? "내가 등록한 카풀" : "등록된 카풀"}</h2>
          </div>
          {visibleFlowRides.map((ride) => {
            const application = carpoolFlow.applications.find(
              (item) =>
                item.rideId === ride.id && item.riderId === "demo-rider",
            )
            return (
              <article key={ride.id}>
                <span
                  className={`tag ${
                    ride.status === "모집 중" ? "open" : "waiting"
                  }`}
                >
                  {ride.status === "완료"
                    ? role === "driver"
                      ? "운행 완료"
                      : "이용 완료"
                    : (application?.status ?? ride.status)}
                </span>
                <strong>
                  {ride.start} → {ride.destination}
                </strong>
                <small>
                  {ride.date} · {ride.time} · 잔여{" "}
                  {getRemainingSeats(carpoolFlow, ride.id)}석
                </small>
                <small className="eta-inline">
                  {formatEtaTime(ride.estimatedArrival)} 도착 예정 · 약{" "}
                  {ride.estimatedDuration}분
                </small>
              </article>
            )
          })}
        </section>
      )}
      <div className="month-title">
        <button onClick={() => moveWeek(-1)} aria-label="이전 주">
          <ChevronRight className="flip" />
        </button>
        <strong>
          {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
        </strong>
        <button onClick={() => moveWeek(1)} aria-label="다음 주">
          <ChevronRight />
        </button>
      </div>
      <div
        className={`week week--interactive week--${weekDirection}`}
        key={formatDateKey(weekStart)}
      >
        {weekDates.map((date) => {
          const dateKey = formatDateKey(date)
          const isActive = dateKey === selectedKey
          const hasSchedule =
            Boolean(demoScheduleByDate[dateKey]?.length) ||
            visibleFlowRides.some((ride) => ride.date === dateKey)
          return (
            <button
              className={isActive ? "active" : ""}
              onClick={() => setSelectedDate(date)}
              aria-pressed={isActive}
              key={dateKey}
            >
              <span>{weekdayLabels[date.getDay()]}</span>
              <strong>{date.getDate()}</strong>
              {hasSchedule && <i />}
            </button>
          )
        })}
      </div>
      <div className="timeline schedule-results" key={selectedKey}>
        <div className="timeline-date">
          <strong>
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
          </strong>
          <span>{weekdayLabels[selectedDate.getDay()]}요일</span>
        </div>
        {selectedSchedules.length > 0 || selectedFlowRides.length > 0 ? (
          <>
            {selectedFlowRides.map((ride) => {
              const application = carpoolFlow.applications.find(
                (item) =>
                  item.rideId === ride.id && item.riderId === "demo-rider",
              )
              return (
                <article
                  className={ride.status !== "모집 중" ? "muted-event" : ""}
                  key={ride.id}
                >
                  <time>{ride.time}</time>
                  <div className="event">
                    <span
                      className={`tag ${
                        ride.status === "모집 중" ? "open" : "waiting"
                      }`}
                    >
                      {ride.status === "완료"
                        ? role === "driver"
                          ? "운행 완료"
                          : "이용 완료"
                        : (application?.status ?? ride.status)}
                    </span>
                    <h3>
                      {ride.start} → {ride.destination}
                    </h3>
                    <p>
                      <CarFront /> {ride.driverName} · {ride.vehicle}
                    </p>
                    <p>
                      <UsersRound /> 잔여{" "}
                      {getRemainingSeats(carpoolFlow, ride.id)}석 ·{" "}
                      {ride.price.toLocaleString()} P
                    </p>
                    <p className="eta-event">
                      <Clock3 /> {formatEtaTime(ride.estimatedArrival)} 도착 예정
                      · 약 {ride.estimatedDuration}분
                    </p>
                    {ride.status === "완료" && role === "rider" && (
                      <small>
                        {carpoolFlow.reviews.some(
                          (review) => review.rideId === ride.id,
                        )
                          ? "평가 완료"
                          : "후기 작성 가능"}
                      </small>
                    )}
                  </div>
                </article>
              )
            })}
            {selectedSchedules.map((schedule) => (
              <article
                className={schedule.tone === "waiting" ? "muted-event" : ""}
                key={schedule.id}
              >
                <time>{schedule.time}</time>
                <div className="event">
                  <span className={`tag ${schedule.tone}`}>
                    {schedule.status}
                  </span>
                  <h3>{schedule.title}</h3>
                  <p>
                    <MapPin /> {schedule.location}
                  </p>
                  <p>
                    <UsersRound />{" "}
                    {role === "driver"
                      ? schedule.driverDetail
                      : schedule.riderDetail}
                  </p>
                </div>
              </article>
            ))}
          </>
        ) : (
          <div className="schedule-empty">
            <CalendarDays />
            <strong>등록된 카풀이 없어요</strong>
            <p>해당 날짜의 카풀 내역이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function filterChatRooms(rooms: ChatRoomData[], query: string): ChatRoomData[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR")
  if (!normalizedQuery) return rooms

  return rooms.filter((room) =>
    [room.title, room.meeting, room.members]
      .join(" ")
      .toLocaleLowerCase("ko-KR")
      .includes(normalizedQuery),
  )
}

function ChatPage({
  carpoolFlow,
  initialRideId,
  onInitialRideConsumed,
}: {
  carpoolFlow: DemoCarpoolState
  initialRideId: string | null
  onInitialRideConsumed: () => void
}) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [messagesByChat, setMessagesByChat] =
    useState<Record<string, string[]>>(() =>
      Object.fromEntries(
        demoChatRooms.map((room) => [
          room.id,
          readDemoList<string>(`chat-${room.id}`),
        ]),
      ),
    )
  const flowChatRooms: ChatRoomData[] = carpoolFlow.rides
    .filter((ride) =>
      carpoolFlow.applications.some(
        (item) => item.rideId === ride.id && item.status === "승인 완료",
      ),
    )
    .map((ride) => ({
      id: `chat-${ride.id}`,
      rideId: ride.id,
      title: `${ride.start} → ${ride.destination}`,
      members: `${ride.driverName} · 박민지`,
      preview:
        ride.status === "정산 대기"
          ? "운행이 종료되었습니다. 정산을 진행해 주세요."
          : "승인된 카풀의 데모 채팅방입니다.",
      time: ride.date,
      meeting: `${ride.date} ${ride.time} · ${ride.start}`,
    }))
  const allChatRooms = [...flowChatRooms, ...demoChatRooms]
  const selectedChat = allChatRooms.find((room) => room.id === selectedChatId)
  const selectedFlowRide = carpoolFlow.rides.find(
    (ride) => ride.id === selectedChat?.rideId,
  )
  const filteredChatRooms = filterChatRooms(allChatRooms, searchQuery)
  const hasSearchQuery = searchQuery.trim().length > 0
  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus()
  }, [isSearchOpen])
  useEffect(() => {
    if (!initialRideId) return
    setSelectedChatId(`chat-${initialRideId}`)
    onInitialRideConsumed()
  }, [initialRideId, onInitialRideConsumed])
  const [settlementConfirmOpen, setSettlementConfirmOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeLiked, setNoticeLiked] = useState(false)
  const [noticeComment, setNoticeComment] = useState("")
  const [noticeComments, setNoticeComments] = useState<string[]>([])
  const noticeAuthor =
    selectedFlowRide?.driverName ??
    selectedChat?.members.split(" · ")[0].split(" ")[0] ??
    "운전자"
  const [noticeDeparture, noticeLocation] = (
    selectedChat?.meeting ?? ""
  ).split(" · ")
  const noticeDestination =
    selectedFlowRide?.destination ??
    selectedChat?.title.split(" → ").at(-1) ??
    "목적지"
  const noticeSummary = selectedChat
    ? `${noticeDeparture} · ${noticeLocation} 출발 안내`
    : "카풀 출발 안내"
  const noticeBody = selectedChat
    ? `${noticeDeparture}에 ${noticeLocation}에서 출발합니다.\n\n최종 목적지는 ${noticeDestination}입니다.${
        selectedFlowRide
          ? ` 등록 일정 기준 도착 예정 시간은 ${formatEtaTime(selectedFlowRide.estimatedArrival)}이며, 예상 소요 시간은 약 ${selectedFlowRide.estimatedDuration}분입니다.`
          : ""
      }\n\n탑승자는 약속 시간 5분 전까지 출발 장소에 도착해 주세요. 출발 시간이나 장소가 변경되면 이 채팅방의 일정 정보와 공지에 함께 반영됩니다.`
    : "채팅방에 저장된 출발 시간과 장소를 확인해 주세요."
  const quickMessages = [
    "📍 지금 정류장 근처예요",
    "🚗 탑승 완료",
    "🕒 조금 늦을 것 같아요",
    "📍 도착했어요",
    "확인했습니다",
  ]
  const sendMessage = () => {
    if (!draft.trim() || !selectedChat) return
    setMessagesByChat((current) => {
      const updatedMessages = [
        ...(current[selectedChat.id] || []),
        draft.trim(),
      ]
      writeDemoData(`chat-${selectedChat.id}`, updatedMessages)
      return { ...current, [selectedChat.id]: updatedMessages }
    })
    setDraft("")
  }
  if (selectedChat)
    return (
      <div className="chat-room">
        <div className="chat-header">
          <button
            className="icon-button"
            onClick={() => setSelectedChatId(null)}
          >
            <ArrowLeft />
          </button>
          <div>
            <strong>{selectedChat.title}</strong>
            <span>
              <i /> 운행 예정 · 3명
            </span>
          </div>
          <button className="icon-button">
            <CircleHelp />
          </button>
        </div>
        <button
          className="chat-notice-banner"
          onClick={() => setNoticeOpen(true)}
          aria-label="채팅방 공지 상세 보기"
        >
          <span>
            <Megaphone />
          </span>
          <div>
            <small>공지</small>
            <strong>{noticeSummary}</strong>
          </div>
          <ChevronRight />
        </button>
        {selectedFlowRide && (
          <section className="chat-eta-card">
            <div>
              <Navigation />
              <span>
                <small>최종 목적지</small>
                <strong>{selectedFlowRide.destination}</strong>
              </span>
            </div>
            <div>
              <Clock3 />
              <span>
                <small>등록 일정 기준 도착 예정</small>
                <strong>
                  {formatEtaTime(selectedFlowRide.estimatedArrival)}
                </strong>
              </span>
            </div>
            <p>
              예상 소요 시간 약 {selectedFlowRide.estimatedDuration}분 ·{" "}
              {selectedFlowRide.status}
            </p>
          </section>
        )}
        {selectedFlowRide?.status === "정산 대기" && (
          <section className="chat-settlement-card">
            <span className="tag waiting">정산 대기</span>
            <strong>운행이 종료되었습니다. 정산을 진행해 주세요.</strong>
            <p>
              {selectedFlowRide.start} → {selectedFlowRide.destination} ·{" "}
              {selectedFlowRide.price.toLocaleString()} P
            </p>
            <Button onClick={() => setSettlementConfirmOpen(true)}>
              정산하기
            </Button>
          </section>
        )}
        {selectedFlowRide?.status === "완료" && (
          <section className="chat-settlement-card complete">
            <span className="tag open">데모 정산 완료</span>
            <strong>이 카풀의 데모 정산이 완료되었습니다.</strong>
          </section>
        )}
        <div className="messages">
          <span className="date-divider">오늘</span>
          <div className="bubble other">
            <span className="chat-name">
              {selectedChat.members.split(" ")[0]}{" "}
              <ShieldCheck aria-label="인증 사용자" />
            </span>
            <p>{selectedChat.preview}</p>
            <time>오후 7:24</time>
          </div>
          <div className="bubble mine">
            <p>네, 확인했습니다. 감사합니다!</p>
            <time>오후 7:26</time>
          </div>
          {(messagesByChat[selectedChat.id] || []).map((message, index) => (
            <div className="bubble mine" key={`${message}-${index}`}>
              <p>{message}</p>
              <time>지금</time>
            </div>
          ))}
        </div>
        <div className="quick-messages">
          {quickMessages.map((message) => (
            <button onClick={() => setDraft(message)} key={message}>
              {message}
            </button>
          ))}
        </div>
        <div className="chat-input">
          <button>
            <Plus />
          </button>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && sendMessage()}
            placeholder="메시지를 입력하세요"
          />
          <button onClick={sendMessage} disabled={!draft.trim()}>
            <Send />
          </button>
        </div>
        {noticeOpen && (
          <div
            className="notice-detail-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setNoticeOpen(false)
            }}
          >
            <section
              className="notice-detail-window"
              role="dialog"
              aria-modal="true"
              aria-labelledby="notice-detail-title"
            >
              <header>
                <button
                  className="icon-button"
                  onClick={() => setNoticeOpen(false)}
                  aria-label="공지 상세 닫기"
                >
                  <ArrowLeft />
                </button>
                <strong id="notice-detail-title">상세보기</strong>
                <div>
                  <button className="icon-button" aria-label="댓글 보기">
                    <MessageCircle />
                  </button>
                  <button className="icon-button" aria-label="공지 더보기">
                    <MoreHorizontal />
                  </button>
                </div>
              </header>
              <div className="notice-detail-scroll">
                <section className="notice-author">
                  <div className="avatar">{noticeAuthor.slice(0, 1)}</div>
                  <div>
                    <strong>{noticeAuthor}</strong>
                    <span>2시간 전 · 공지</span>
                  </div>
                </section>
                <article className="notice-body">
                  <h2>{noticeSummary}</h2>
                  {noticeBody.split("\n\n").map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </article>
                <button
                  className={`notice-like ${noticeLiked ? "active" : ""}`}
                  onClick={() => setNoticeLiked((current) => !current)}
                  aria-pressed={noticeLiked}
                >
                  <Heart />
                  <span>
                    {noticeLiked
                      ? "좋아요를 남겼습니다."
                      : "가장 먼저 좋아요를 남겨보세요."}
                  </span>
                </button>
                {noticeComments.length > 0 && (
                  <section className="notice-comments">
                    <strong>댓글 {noticeComments.length}</strong>
                    {noticeComments.map((comment, index) => (
                      <article key={`${comment}-${index}`}>
                        <div className="avatar green">민</div>
                        <div>
                          <strong>박민지</strong>
                          <p>{comment}</p>
                          <span>방금 전</span>
                        </div>
                      </article>
                    ))}
                  </section>
                )}
              </div>
              <div className="notice-comment-input">
                <Smile />
                <input
                  value={noticeComment}
                  maxLength={300}
                  onChange={(event) => setNoticeComment(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || !noticeComment.trim()) return
                    setNoticeComments((current) => [
                      ...current,
                      noticeComment.trim(),
                    ])
                    setNoticeComment("")
                  }}
                  placeholder="댓글을 남겨보세요."
                  aria-label="공지 댓글"
                />
                <button
                  disabled={!noticeComment.trim()}
                  onClick={() => {
                    if (!noticeComment.trim()) return
                    setNoticeComments((current) => [
                      ...current,
                      noticeComment.trim(),
                    ])
                    setNoticeComment("")
                  }}
                >
                  등록
                </button>
              </div>
            </section>
          </div>
        )}
        {settlementConfirmOpen && selectedFlowRide && (
          <div className="dialog-backdrop flow-dialog-backdrop">
            <section className="app-dialog">
              <span className="dialog-icon neutral">
                <WalletCards />
              </span>
              <h2>정산을 진행할까요?</h2>
              <p>발표용 데모 정산이며 실제 금전 결제는 발생하지 않습니다.</p>
              <div className="dialog-actions">
                <Button
                  variant="ghost"
                  onClick={() => setSettlementConfirmOpen(false)}
                >
                  취소
                </Button>
                <Button
                  onClick={() => {
                    settleCarpoolRide(selectedFlowRide.id)
                    setSettlementConfirmOpen(false)
                  }}
                >
                  데모 정산 완료
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>
    )
  return (
    <div className="page page--plain">
      <div className={`page-title ${isSearchOpen ? "chat-search-header" : ""}`}>
        {isSearchOpen ? (
          <>
            <label className="chat-search-field">
              <Search />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="채팅방, 경로, 참여자 검색"
                aria-label="채팅방 검색"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    searchInputRef.current?.focus()
                  }}
                  aria-label="검색어 삭제"
                >
                  <X />
                </button>
              )}
            </label>
            <button
              type="button"
              className="chat-search-cancel"
              onClick={() => {
                setIsSearchOpen(false)
                setSearchQuery("")
              }}
            >
              취소
            </button>
          </>
        ) : (
          <>
            <div>
              <span className="eyebrow">MESSAGES</span>
              <h1>채팅</h1>
            </div>
            <button
              className="icon-button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="채팅방 검색"
            >
              <Search />
            </button>
          </>
        )}
      </div>
      {filteredChatRooms.length > 0 ? (
        <>
          <div className="chat-list">
            {filteredChatRooms.map((room) => {
              const originalIndex = allChatRooms.findIndex(
                (item) => item.id === room.id,
              )
              return (
                <button
                  onClick={() => setSelectedChatId(room.id)}
                  key={room.id}
                >
                  <div className={`avatar ${originalIndex > 0 ? "green" : ""}`}>
                    {room.members.slice(0, 1)}
                  </div>
                  <div>
                    <strong>{room.title}</strong>
                    <span>{room.members}</span>
                    <p>
                      {(messagesByChat[room.id] || []).at(-1) || room.preview}
                    </p>
                  </div>
                  <div>
                    <time>{room.time}</time>
                    {originalIndex === 0 && <i>2</i>}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="empty-hint">
            <MessageCircle />
            <span>
              {hasSearchQuery
                ? `${filteredChatRooms.length}개의 채팅방을 찾았어요.`
                : "승인된 카풀의 채팅방만 열려요."}
            </span>
          </div>
        </>
      ) : (
        <div className="chat-search-empty">
          <Search />
          <strong>검색 결과가 없습니다.</strong>
          <p>다른 이름이나 경로로 검색해 보세요.</p>
        </div>
      )}
    </div>
  )
}

function ProfilePage({
  role,
  registrations,
  changeRole,
  route,
  account,
  selectedBadges,
  open,
  logout,
  pointBalance,
  mileageBalance,
  carpoolFlow,
}: {
  role: Role
  registrations?: RoleRegistrations
  changeRole: (r: Role) => void
  route: RouteData
  account: AccountData
  selectedBadges: Record<Role, string[]>
  open: (s: Sheet) => void
  logout: () => void
  pointBalance: number
  mileageBalance: number
  carpoolFlow: DemoCarpoolState
}) {
  const flowReviews: DemoReview[] = carpoolFlow.reviews.map((review) => ({
    author: "박민지 탑승자 · 데모 리뷰",
    date: new Date(review.createdAt).toLocaleDateString("ko-KR"),
    score: review.rating,
    text: review.content || "후기 내용 없이 매너 키워드만 남겼어요.",
    tags: review.keywords,
  }))
  const profileReviews = [
    ...flowReviews,
    ...readDemoList<DemoReview>("received-reviews"),
    ...demoReceivedReviews,
  ]
  const reviewCount = profileReviews.length
  const averageRating = (
    profileReviews.reduce((sum, item) => sum + item.score, 0) / reviewCount
  ).toFixed(1)
  const visibleBadges = demoProfileBadges
    .filter(
      (badge) => badge.role === role && selectedBadges[role].includes(badge.id),
    )
    .slice(0, 3)
  return (
    <div className="page page--plain">
      <div className="page-title">
        <div>
          <span className="eyebrow">MY SHINGU-GIL</span>
          <h1>프로필</h1>
        </div>
        <button
          className="profile-edit-button"
          onClick={() => open("account-edit")}
        >
          수정
        </button>
      </div>
      <section className="profile-card">
        <div className="profile-avatar">
          민
          <span>
            <ShieldCheck />
          </span>
        </div>
        <div>
          <h2>{account.name}</h2>
          <p>컴퓨터소프트웨어과 · 2학년</p>
          <p>{account.email}</p>
          <span className="verified-text">
            <ShieldCheck /> 학교 이메일 데모 확인
          </span>
        </div>
        <button onClick={() => open("account")} aria-label="내 계정 정보">
          <ChevronRight />
        </button>
      </section>
      {visibleBadges.length > 0 && (
        <section className="profile-badge-chips" aria-label="대표 뱃지">
          {visibleBadges.map((badge) => (
            <span className={`profile-badge tone-${badge.tone}`} key={badge.id}>
              <BadgeGlyph badge={badge} />
              {badge.label}
            </span>
          ))}
        </section>
      )}
      <section className="profile-summary" aria-label="카풀 활동 요약">
        <div>
          <strong>
            {role === "driver"
              ? `${
                  new Set(
                    carpoolFlow.rides
                      .filter((ride) => ride.status === "완료")
                      .map((ride) => ride.id),
                  ).size || 8
                }회`
              : "12회"}
          </strong>
          <span>{role === "driver" ? "운전 횟수" : "탑승 횟수"}</span>
        </div>
        <div>
          <strong className="rating-score">
            <Star /> {averageRating}
          </strong>
          <span>별점</span>
        </div>
        <button onClick={() => open("reviews")}>
          <strong>
            {reviewCount} <ChevronRight />
          </strong>
          <span>후기 보기</span>
        </button>
      </section>
      <section className="profile-roles">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ACCOUNT</span>
            <h2>계정 변경</h2>
          </div>
          <small>계정과 잔액은 그대로 유지돼요</small>
        </div>
        <div className="role-switcher">
          {(["rider", "driver"] as Role[]).map((item) => (
            <button
              className={role === item ? "active" : ""}
              onClick={() => changeRole(item)}
              key={item}
            >
              {item === "driver" ? <CarFront /> : <UsersRound />}
              <span>
                <strong>{item === "driver" ? "운전자" : "탑승자"}</strong>
                <small>
                  {role === item
                    ? "현재 역할"
                    : registrations?.[item]
                      ? "등록 완료"
                      : "등록 필요"}
                </small>
              </span>
              {role === item ? <Check /> : <ChevronRight />}
            </button>
          ))}
        </div>
      </section>
      <div className="profile-info-heading">
        <span className="eyebrow">INFO</span>
        <h2>정보</h2>
      </div>
      <div className={`balance-card ${role === "rider" ? "single" : ""}`}>
        <button className="balance-card__points" onClick={() => open("points")}>
          <WalletCards />
          <span>
            보유 포인트<strong>{formatPoints(pointBalance)}</strong>
          </span>
          <ChevronRight />
        </button>
        {role === "driver" && (
          <button onClick={() => open("mileage")}>
            <Star />
            <span>
              마일리지
              <strong>{mileageBalance.toLocaleString("ko-KR")} M</strong>
            </span>
            <ChevronRight />
          </button>
        )}
      </div>
      <section className="profile-route">
        <div className="section-heading">
          <h2>나의 기본 경로</h2>
          <button onClick={() => open("route-edit")}>수정</button>
        </div>
        <RouteCard route={route} />
      </section>
      <nav className="menu-list">
        <button onClick={() => open("history")}>
          <CreditCard />
          <span>결제 및 이용 내역</span>
          <ChevronRight />
        </button>
        <button onClick={() => open("safety")}>
          <ShieldCheck />
          <span>안전 및 신고 관리</span>
          <ChevronRight />
        </button>
        <button onClick={() => open("settings")}>
          <Settings />
          <span>설정</span>
          <ChevronRight />
        </button>
        <button onClick={logout}>
          <ArrowLeft />
          <span>로그아웃</span>
          <ChevronRight />
        </button>
      </nav>
      <p className="version">신구길 데모 v1.0.0</p>
    </div>
  )
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items: [Tab, ReactNode, string][] = [
    ["home", <Home />, "홈"],
    ["schedule", <CalendarDays />, "일정"],
    ["chat", <MessageCircle />, "채팅"],
    ["profile", <UserRound />, "프로필"],
  ]
  return (
    <nav className="bottom-nav">
      {items.map(([id, icon, label]) => (
        <button
          className={tab === id ? "active" : ""}
          onClick={() => setTab(id)}
          key={id}
        >
          {icon}
          <span>{label}</span>
          {id === "chat" && <i />}
        </button>
      ))}
    </nav>
  )
}

function RoleRegistration({
  role,
  onComplete,
}: {
  role: Role
  onComplete: (role: Role) => void
}) {
  const [licenseVerified, setLicenseVerified] = useState(false)
  const [capacity, setCapacity] = useState(5)
  const [seats, setSeats] = useState(3)
  const [agreed, setAgreed] = useState(false)
  const [weekdays, setWeekdays] = useState(["월", "화", "수", "목", "금"])

  const toggleDay = (day: string) =>
    setWeekdays((days) =>
      days.includes(day) ? days.filter((item) => item !== day) : [...days, day],
    )

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const data = Object.fromEntries(form.entries())
    delete data.license
    writeDemoData(`${role}-profile`, {
      ...data,
      weekdays,
      licenseVerified: role === "driver" ? licenseVerified : undefined,
      capacity: role === "driver" ? capacity : undefined,
      seats: role === "driver" ? seats : undefined,
    })
    onComplete(role)
  }

  return (
    <form className="registration-form" onSubmit={submit}>
      <div className="account-confirm">
        <div className="profile-avatar small">
          민
          <span>
            <ShieldCheck />
          </span>
        </div>
        <div>
          <strong>박민지</strong>
          <span>shingu24@shingu.ac.kr</span>
          <small>
            <Check /> 신구대학교 이메일 데모 확인
          </small>
        </div>
      </div>
      <div className="registration-intro">
        <span className="eyebrow">
          {role === "driver" ? "DRIVER REGISTRATION" : "RIDER REGISTRATION"}
        </span>
        <h2>{role === "driver" ? "운전자 등록" : "탑승자 등록"}</h2>
        <p>
          기존 계정과 포인트, 이용 내역은 유지되며 역할별 정보만 별도로
          저장됩니다.
        </p>
      </div>

      {role === "driver" && (
        <section className="registration-section">
          <div className="form-section-title">
            <span>1</span>
            <div>
              <strong>면허 및 차량 인증</strong>
              <small>인증 정보는 다른 사용자에게 공개되지 않아요.</small>
            </div>
          </div>
          <Field
            label="운전면허증"
            name="license"
            type="file"
            accept="image/*"
          />
          <Button
            type="button"
            variant={licenseVerified ? "soft" : "secondary"}
            onClick={() => setLicenseVerified(true)}
          >
            {licenseVerified ? (
              <>
                <Check /> 데모 면허 인증 완료
              </>
            ) : (
              <>
                <ShieldCheck /> 면허 인증하기
              </>
            )}
          </Button>
          <p className="helper">
            현재는 데모 인증이며 실제 심사나 외부 기관 조회는 진행되지 않습니다.
          </p>
          <div className="two-fields">
            <Field label="차량 종류" name="carType" defaultValue="승용차" />
            <Field label="차종" name="carModel" placeholder="예: 아반떼" />
          </div>
          <div className="two-fields">
            <label className="field">
              <span>차량 정원</span>
              <span className="field__control">
                <input
                  type="number"
                  min="2"
                  max="12"
                  value={capacity}
                  onChange={(event) => {
                    const next = Math.max(2, Number(event.target.value))
                    setCapacity(next)
                    setSeats((current) => Math.min(current, next - 1))
                  }}
                />
              </span>
            </label>
            <label className="field">
              <span>모집 가능 좌석</span>
              <span className="field__control">
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, capacity - 1)}
                  value={seats}
                  onChange={(event) =>
                    setSeats(
                      Math.max(
                        1,
                        Math.min(Number(event.target.value), capacity - 1),
                      ),
                    )
                  }
                />
              </span>
            </label>
          </div>
          <p className="seat-rule">
            <ShieldCheck /> 운전자 좌석을 제외한 최대 {capacity - 1}석까지
            모집할 수 있어요.
          </p>
        </section>
      )}

      <section className="registration-section">
        <div className="form-section-title">
          <span>{role === "driver" ? "2" : "1"}</span>
          <div>
            <strong>기본 경로</strong>
            <small>역이나 공공장소처럼 안전한 장소를 입력해 주세요.</small>
          </div>
        </div>
        <Field
          label="기본 출발 지역"
          name="start"
          defaultValue="모란역 5번 출구"
          icon={<MapPin />}
        />
        <Field
          label="기본 목적지"
          name="destination"
          defaultValue="신구대학교 정문"
          icon={<Navigation />}
        />
        <Field
          label={role === "driver" ? "자주 지나는 주요 거점" : "선호 탑승 장소"}
          name="waypoint"
          placeholder={
            role === "driver"
              ? "예: 태평역, 성남시청"
              : "예: 모란역 공공 승차 구역"
          }
          icon={<MapPin />}
        />
      </section>

      <section className="registration-section">
        <div className="form-section-title">
          <span>{role === "driver" ? "3" : "2"}</span>
          <div>
            <strong>이용 일정</strong>
            <small>추천과 일정 등록에 활용돼요.</small>
          </div>
        </div>
        <label className="field">
          <span>자주 이용하는 요일</span>
          <span className="weekday-selector">
            {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
              <button
                type="button"
                className={weekdays.includes(day) ? "active" : ""}
                onClick={() => toggleDay(day)}
                key={day}
              >
                {day}
              </button>
            ))}
          </span>
        </label>
        <Field
          label={
            role === "driver" ? "주로 출발하는 시간대" : "희망 출발 시간대"
          }
          name="departureTime"
          type="time"
          defaultValue="08:10"
          icon={<Clock3 />}
        />
      </section>

      <label className="check-row registration-agree">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />
        <span className={agreed ? "checked" : ""}>{agreed && <Check />}</span>
        필수 약관과 역할별 개인정보 처리에 동의합니다.
      </label>
      <Button
        type="submit"
        disabled={!agreed || (role === "driver" && !licenseVerified)}
      >
        {role === "driver" && !licenseVerified
          ? "면허 인증 후 등록할 수 있어요"
          : `${role === "driver" ? "운전자" : "탑승자"} 등록 완료`}
      </Button>
    </form>
  )
}

function SheetView({
  type,
  close,
  open,
  role,
  route,
  account,
  selectedBadges,
  tripFlow,
  registrations,
  onSelectRole,
  onCompleteRole,
  onSaveRoute,
  onSaveAccount,
  onSaveBadges,
  onCompletePayment,
  onGoHome,
  pointWallet,
  mileageBalance,
  carpoolFlow,
  selectedRide,
}: {
  type: Exclude<Sheet, null>
  close: () => void
  open: (sheet: Sheet) => void
  role: Role
  route: RouteData
  account: AccountData
  selectedBadges: Record<Role, string[]>
  tripFlow: DemoTripFlow
  registrations: RoleRegistrations
  onSelectRole: (role: Role) => void
  onCompleteRole: (role: Role) => void
  onSaveRoute: (route: RouteData) => void
  onSaveAccount: (account: AccountData) => void
  onSaveBadges: (role: Role, badgeIds: string[]) => void
  onCompletePayment: () => void
  onGoHome: () => void
  pointWallet: DemoPointWallet
  mileageBalance: number
  carpoolFlow: DemoCarpoolState
  selectedRide: MatchRide | null
}) {
  const sheetRef = useRef<HTMLElement>(null)
  const mileageBarcodeRef = useRef<SVGSVGElement>(null)
  const [mileageBarcodeOpen, setMileageBarcodeOpen] = useState(false)
  const [mileageBarcodeError, setMileageBarcodeError] = useState("")
  const [mileageBarcodeAttempt, setMileageBarcodeAttempt] = useState(0)
  const [mileageMemberCode, setMileageMemberCode] = useState(() =>
    getOrCreateMileageMemberCode(account.id, role),
  )
  const [appliedRideIds, setAppliedRideIds] = useState<string[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() =>
    String(new Date().getDate()),
  )
  const [editingAccount, setEditingAccount] = useState(false)
  const [reviewed, setReviewed] = useState(
    () => readDemoValue("review-ride-0516") === "true",
  )
  const [reviewText, setReviewText] = useState("")
  const [savedReviews, setSavedReviews] = useState<DemoReview[]>(() =>
    readDemoList<DemoReview>("received-reviews"),
  )
  const [rating, setRating] = useState(0)
  const [applicationFilter, setApplicationFilter] = useState("전체")
  const [historyFilter, setHistoryFilter] = useState<"전체" | "적립" | "사용">(
    "전체",
  )
  const [activeTab, setActiveTab] =
    useState<"전체" | "결제 내역" | "이용 내역" | "취소·환불">("전체")
  const calendarToday = new Date()
  const [calendarView, setCalendarView] = useState(
    new Date(calendarToday.getFullYear(), calendarToday.getMonth(), 1),
  )
  const [applicationCancelled, setApplicationCancelled] = useState(
    () => readDemoValue("application-0521") === "cancelled",
  )
  const [routeDraft, setRouteDraft] = useState(route)
  const [routeDirty, setRouteDirty] = useState(false)
  const [accountDraft, setAccountDraft] = useState(account)
  const [badgeDraft, setBadgeDraft] = useState<string[]>(
    selectedBadges[role] || [],
  )
  const [badgeError, setBadgeError] = useState("")
  const [reports, setReports] = useState<SafetyReport[]>(getSafetyReports)
  const [blockedUsers, setBlockedUsers] =
    useState<BlockedUser[]>(getBlockedUsers)
  const [reportTargetId, setReportTargetId] = useState("")
  const [reportReason, setReportReason] = useState("")
  const [reportDetails, setReportDetails] = useState("")
  const [reportImages, setReportImages] = useState<string[]>([])
  const [reportErrors, setReportErrors] = useState<{
    target?: string
    reason?: string
    images?: string
    submit?: string
  }>({})
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [unblockCandidate, setUnblockCandidate] = useState<BlockedUser | null>(
    null,
  )
  const [reportFilter, setReportFilter] =
    useState<"전체" | "검토 중" | "처리 완료">("전체")
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(getNotificationSettings)
  const [notificationBackup, setNotificationBackup] =
    useState<NotificationSettings>(notificationSettings)
  const [biometricEnabled, setBiometricEnabled] = useState(
    getBiometricDemoState,
  )
  const [devices, setDevices] = useState<DemoDevice[]>(getDemoDevices)
  const [settingsDialog, setSettingsDialog] =
    useState<"school" | "password" | "password-note" | "biometric" | "devices" | "device-logout" | "withdraw-1" | "withdraw-2" | "withdraw-note" | "inquiry-success" | null>(
      null,
    )
  const [selectedDevice, setSelectedDevice] = useState<DemoDevice | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("")
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {},
  )
  const [withdrawConfirmed, setWithdrawConfirmed] = useState(false)
  const [openFaqs, setOpenFaqs] = useState<string[]>(() =>
    readDemoList<string>("open-faqs"),
  )
  const [inquiryCategory, setInquiryCategory] = useState("")
  const [inquiryTitle, setInquiryTitle] = useState("")
  const [inquiryContent, setInquiryContent] = useState("")
  const [inquiryErrors, setInquiryErrors] = useState<Record<string, string>>({})
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false)
  const [chargeOpen, setChargeOpen] = useState(false)
  const [selectedChargeAmount, setSelectedChargeAmount] =
    useState<number | null>(null)
  const [customChargeAmount, setCustomChargeAmount] = useState("")
  const [chargePaymentMethod, setChargePaymentMethod] =
    useState<DemoPaymentMethod | null>(null)
  const [chargeErrors, setChargeErrors] = useState<{
    amount?: string
    paymentMethod?: string
  }>({})
  const [chargeConfirmOpen, setChargeConfirmOpen] = useState(false)
  const [completedCharge, setCompletedCharge] =
    useState<DemoPointCharge | null>(null)
  const [isCharging, setIsCharging] = useState(false)
  const [flowNotice, setFlowNotice] = useState("")
  const [profileSaved, setProfileSaved] = useState(false)
  const [createDraft, setCreateDraft] = useState({
    date: "",
    time: "08:10",
    start: route.start,
    destination: route.destination,
    vehicle: "흰색 현대 아반떼",
    totalSeats: "3",
    price: "2800",
    waypoints: route.waypoint,
    note: "",
    estimatedDuration: String(DEFAULT_ESTIMATED_DURATION),
    estimatedArrival: "",
    arrivalTimeManual: false,
    smokingPreference: route.smokingPreference ?? "비흡연자 선호",
    genderPreference: route.genderPreference ?? "성별 무관",
  })
  const [createError, setCreateError] = useState("")
  const now = new Date()
  const [reservationMonth, setReservationMonth] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  )
  const [reservationDate, setReservationDate] = useState("")
  const [reservationSearched, setReservationSearched] = useState(false)
  const [applyRide, setApplyRide] = useState<DemoCarpoolRide | null>(null)
  const [reviewKeywords, setReviewKeywords] = useState<string[]>([])
  const chargingRef = useRef(false)
  useEffect(() => {
    if (!mileageBarcodeOpen) return
    setMileageBarcodeError("")
    try {
      if (!mileageMemberCode || !mileageBarcodeRef.current)
        throw new Error("Barcode data unavailable")
      mileageBarcodeRef.current.replaceChildren()
      JsBarcode(mileageBarcodeRef.current, mileageMemberCode, {
        format: "CODE128",
        lineColor: "#000000",
        background: "#ffffff",
        width: 2,
        height: 84,
        displayValue: false,
        margin: 14,
      })
    } catch {
      setMileageBarcodeError(
        "바코드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      )
    }
  }, [mileageBarcodeAttempt, mileageBarcodeOpen, mileageMemberCode])
  useEffect(() => {
    if (!mileageBarcodeOpen) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMileageBarcodeOpen(false)
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [mileageBarcodeOpen])
  useEffect(() => {
    if (createDraft.arrivalTimeManual) return
    const estimatedArrival = calculateEstimatedArrival(
      createDraft.date,
      createDraft.time,
      Number(createDraft.estimatedDuration),
    )
    setCreateDraft((current) =>
      current.estimatedArrival === estimatedArrival
        ? current
        : { ...current, estimatedArrival },
    )
  }, [
    createDraft.arrivalTimeManual,
    createDraft.date,
    createDraft.estimatedDuration,
    createDraft.time,
    createDraft.waypoints,
  ])
  const chargeAmount =
    selectedChargeAmount ??
    (customChargeAmount ? Number(customChargeAmount.replaceAll(",", "")) : 0)
  const reservationDays = Array.from(
    {
      length: new Date(
        reservationMonth.getFullYear(),
        reservationMonth.getMonth() + 1,
        0,
      ).getDate(),
    },
    (_, index) => index + 1,
  )
  const reservationStartDay = new Date(
    reservationMonth.getFullYear(),
    reservationMonth.getMonth(),
    1,
  ).getDay()
  const reservationResults = carpoolFlow.rides.filter(
    (ride) =>
      ride.date === reservationDate &&
      ride.status === "모집 중" &&
      getRemainingSeats(carpoolFlow, ride.id) > 0 &&
      !carpoolFlow.applications.some(
        (item) => item.rideId === ride.id && item.riderId === "demo-rider",
      ),
  )

  const resetChargeFlow = () => {
    setChargeOpen(false)
    setSelectedChargeAmount(null)
    setCustomChargeAmount("")
    setChargePaymentMethod(null)
    setChargeErrors({})
    setChargeConfirmOpen(false)
    setCompletedCharge(null)
    setIsCharging(false)
    chargingRef.current = false
  }
  const validateCharge = () => {
    const errors: { amount?: string; paymentMethod?: string } = {}
    if (!Number.isSafeInteger(chargeAmount) || chargeAmount <= 0) {
      errors.amount = "0보다 큰 정수 포인트를 입력하거나 선택해 주세요."
    }
    if (!chargePaymentMethod) {
      errors.paymentMethod = "결제 수단을 선택해 주세요."
    }
    setChargeErrors(errors)
    if (Object.keys(errors).length === 0) setChargeConfirmOpen(true)
  }
  const completeCharge = () => {
    if (
      chargingRef.current ||
      !chargePaymentMethod ||
      !Number.isSafeInteger(chargeAmount) ||
      chargeAmount <= 0
    )
      return
    chargingRef.current = true
    setIsCharging(true)
    try {
      const charge = chargeDemoPoints(chargeAmount, chargePaymentMethod)
      setChargeConfirmOpen(false)
      setCompletedCharge(charge)
    } finally {
      setIsCharging(false)
    }
  }
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const content =
        sheetRef.current?.querySelector<HTMLElement>(".sheet-content")
      if (content) content.scrollTop = 0
    })
    return () => window.cancelAnimationFrame(frame)
  }, [type])
  const mileageHistoryEntries = [
    {
      id: "mileage-0516",
      date: "5월 16일 09:02",
      title: "카풀 결제 적립",
      amount: "+280 M",
      balance: "12,840 M",
      type: "적립" as const,
    },
    {
      id: "mileage-0512",
      date: "5월 12일 14:20",
      title: "교내 카페 데모 사용",
      amount: "-1,500 M",
      balance: "12,560 M",
      type: "사용" as const,
    },
    {
      id: "mileage-0509",
      date: "5월 9일 08:55",
      title: "카풀 결제 적립",
      amount: "+320 M",
      balance: "14,060 M",
      type: "적립" as const,
    },
  ]
  const filteredMileageHistoryEntries = mileageHistoryEntries.filter(
    (entry) => historyFilter === "전체" || entry.type === historyFilter,
  )
  const titles: Record<Exclude<Sheet, null>, string> = {
    ride: "카풀 상세",
    matches: "SMART MATCH 추천",
    create: "새 카풀 일정",
    reservation: "원하는 날짜 예약",
    notifications: "알림",
    points: "포인트 · 마일리지",
    mileage: "마일리지",
    "mileage-history":
      historyFilter === "전체"
        ? "마일리지 전체 내역"
        : historyFilter === "적립"
          ? "마일리지 적립 내역"
          : "마일리지 사용 내역",
    history: "결제 및 이용 내역",
    "carpool-payment": "카풀 결제",
    safety: "안전 관리",
    "safety-report": "사용자 신고",
    "blocked-users": "차단 사용자 관리",
    "report-history": "신고 처리 내역",
    privacy: "개인정보 보호 안내",
    "privacy-policy": "개인정보 처리방침",
    roles: "계정 변경",
    "driver-register": "운전자 등록",
    "rider-register": "탑승자 등록",
    settings: "설정",
    "notification-settings": "알림 설정",
    "security-settings": "개인정보 및 보안",
    "service-guide": "서비스 이용 안내",
    "passenger-guide": "탑승자 이용 가이드",
    "driver-guide": "운전자 이용 가이드",
    "contact-support": "1:1 문의하기",
    "route-edit": "기본 경로 수정",
    applications: role === "driver" ? "탑승 신청 관리" : "신청한 카풀",
    "application-detail": "신청 카풀 상세",
    calendar: "전체 캘린더",
    account: "내 계정 정보",
    "account-edit": "정보 수정",
    "monthly-rides": "이번 달 운행 내역",
    review: "후기 작성",
    reviews: `받은 후기 (${
      demoReceivedReviews.length +
      savedReviews.length +
      carpoolFlow.reviews.length
    })`,
  }
  const requestClose = () => {
    if (
      type === "route-edit" &&
      routeDirty &&
      !window.confirm("저장하지 않은 변경 사항을 폐기할까요?")
    )
      return
    close()
  }
  const flowSheetReviews: DemoReview[] = carpoolFlow.reviews.map((review) => ({
    author: "박민지 탑승자 · 데모 리뷰",
    date: new Date(review.createdAt).toLocaleDateString("ko-KR"),
    score: review.rating,
    text: review.content || "후기 내용 없이 매너 키워드만 남겼어요.",
    tags: review.keywords,
  }))
  const allReviews = [
    ...flowSheetReviews,
    ...savedReviews,
    ...demoReceivedReviews,
  ]
  const reviewRide = carpoolFlow.rides.find(
    (ride) =>
      ride.status === "완료" &&
      carpoolFlow.applications.some(
        (item) =>
          item.rideId === ride.id &&
          item.riderId === "demo-rider" &&
          item.status === "승인 완료",
      ) &&
      !carpoolFlow.reviews.some((review) => review.rideId === ride.id),
  )
  const averageReviewScore = (
    allReviews.reduce((sum, item) => sum + item.score, 0) / allReviews.length
  ).toFixed(1)
  const sheetMatches = getVisibleMatchRides(route, carpoolFlow)
  const detailRide = selectedRide ?? sheetMatches[0]
  const calendarYear = calendarView.getFullYear()
  const calendarMonth = calendarView.getMonth() + 1
  const calendarStartDay = new Date(calendarYear, calendarMonth - 1, 1).getDay()
  const calendarDayCount = new Date(calendarYear, calendarMonth, 0).getDate()
  const calendarCellCount =
    Math.ceil((calendarStartDay + calendarDayCount) / 7) * 7
  const selectedCalendarKey = `${calendarYear}-${String(calendarMonth).padStart(
    2,
    "0",
  )}-${selectedDate.padStart(2, "0")}`
  const selectedCalendarRides = carpoolFlow.rides.filter(
    (ride) => ride.date === selectedCalendarKey,
  )
  const isRideApplied = (ride: MatchRide) =>
    appliedRideIds.includes(ride.id) ||
    Boolean(
      ride.flowRideId &&
      carpoolFlow.applications.some(
        (application) =>
          application.rideId === ride.flowRideId &&
          application.riderId === "demo-rider",
      ),
    )
  const applyToMatchRide = (ride: MatchRide) => {
    if (isRideApplied(ride)) return
    if (ride.flowRideId) applyToCarpool(ride.flowRideId)
    setAppliedRideIds((current) => [...current, ride.id])
  }
  const isEditingAccount = type === "account-edit" || editingAccount
  const roleHistoryEntries = demoHistoryEntries.filter(
    (entry) => entry.role === role,
  )
  const filteredHistoryEntries: HistoryEntry[] = roleHistoryEntries.filter(
    (entry) => {
      if (activeTab === "전체") return true
      if (activeTab === "결제 내역")
        return entry.type === "결제" && entry.status === "결제 완료"
      if (activeTab === "이용 내역")
        return entry.type === "이용" && entry.status === "이용 완료"
      return entry.status === "취소 완료" || entry.status === "환불 완료"
    },
  )
  const safetyChildTypes: Exclude<Sheet, null>[] = [
    "safety-report",
    "blocked-users",
    "report-history",
    "privacy",
    "privacy-policy",
  ]
  const settingsChildTypes: Exclude<Sheet, null>[] = [
    "notification-settings",
    "security-settings",
    "service-guide",
  ]
  const handleHeaderBack = () => {
    if (
      type === "passenger-guide" ||
      type === "driver-guide" ||
      type === "contact-support"
    ) {
      open("service-guide")
      return
    }
    if (settingsChildTypes.includes(type)) {
      open("settings")
      return
    }
    if (type === "privacy-policy") {
      open("privacy")
      return
    }
    if (safetyChildTypes.includes(type)) {
      open("safety")
      return
    }
    requestClose()
  }
  const addEvidenceImages = async (files: FileList | null) => {
    if (!files) return
    const incomingFiles = Array.from(files)
    if (incomingFiles.some((file) => !file.type.startsWith("image/"))) {
      setReportErrors((current) => ({
        ...current,
        images: "이미지 파일만 첨부할 수 있습니다.",
      }))
      return
    }
    if (incomingFiles.some((file) => file.size > 750_000)) {
      setReportErrors((current) => ({
        ...current,
        images: "데모 저장을 위해 사진 한 장은 750KB 이하로 선택해 주세요.",
      }))
      return
    }
    const imageFiles = incomingFiles
    const remaining = 3 - reportImages.length
    if (remaining <= 0) {
      setReportErrors((current) => ({
        ...current,
        images: "사진은 최대 3장까지 첨부할 수 있습니다.",
      }))
      return
    }
    const selected = imageFiles.slice(0, remaining)
    const encoded = await Promise.all(
      selected.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.readAsDataURL(file)
          }),
      ),
    )
    setReportImages((current) => [...current, ...encoded])
    setReportErrors((current) => ({ ...current, images: undefined }))
  }
  const submitReport = () => {
    const nextErrors = {
      target: reportTargetId ? undefined : "신고 대상을 선택해 주세요.",
      reason: reportReason ? undefined : "신고 사유를 선택해 주세요.",
    }
    setReportErrors(nextErrors)
    if (nextErrors.target || nextErrors.reason) return
    const target = demoReportTargets.find((item) => item.id === reportTargetId)
    if (!target) return
    const report: SafetyReport = {
      id: `report-${Date.now()}`,
      targetId: target.id,
      targetName: target.name,
      targetRole: target.role,
      rideLabel: target.rideLabel,
      reason: reportReason,
      details: reportDetails.trim(),
      images: reportImages,
      createdAt: new Date().toLocaleDateString("ko-KR").replaceAll(" ", ""),
      status: "검토 중",
      response: "",
    }
    try {
      setReports(submitSafetyReport(report))
      setReportErrors({})
      setReportSubmitted(true)
    } catch {
      setReportErrors((current) => ({
        ...current,
        submit:
          "브라우저 저장 공간이 부족해 접수하지 못했습니다. 사진 수를 줄여 다시 시도해 주세요.",
      }))
    }
  }
  const updateNotifications = (next: NotificationSettings) => {
    setNotificationSettings(next)
    saveNotificationSettings(next)
  }
  const notificationsEnabled = Object.values(notificationSettings).some(Boolean)
  const toggleAllNotifications = () => {
    if (notificationsEnabled) {
      setNotificationBackup(notificationSettings)
      updateNotifications({
        matching: false,
        trip: false,
        chat: false,
        marketing: false,
      })
      return
    }
    const restored = Object.values(notificationBackup).some(Boolean)
      ? notificationBackup
      : {
          matching: true,
          trip: true,
          chat: true,
          marketing: false,
        }
    updateNotifications(restored)
  }
  const toggleNotification = (key: keyof NotificationSettings) => {
    if (!notificationsEnabled) return
    const next = { ...notificationSettings, [key]: !notificationSettings[key] }
    setNotificationBackup(next)
    updateNotifications(next)
  }
  const validatePasswordDemo = () => {
    const errors: Record<string, string> = {}
    if (!currentPassword) errors.current = "현재 비밀번호를 입력해 주세요."
    if (newPassword.length < 8)
      errors.new = "새 비밀번호는 8자 이상 입력해 주세요."
    if (newPassword !== newPasswordConfirm)
      errors.confirm = "새 비밀번호가 일치하지 않습니다."
    if (currentPassword && currentPassword === newPassword)
      errors.new = "현재 비밀번호와 다른 비밀번호를 입력해 주세요."
    setPasswordErrors(errors)
    if (Object.keys(errors).length === 0) setSettingsDialog("password-note")
  }
  const submitInquiry = () => {
    const errors: Record<string, string> = {}
    if (!inquiryCategory) errors.category = "문의 유형을 선택해 주세요."
    if (!inquiryTitle.trim()) errors.title = "문의 제목을 입력해 주세요."
    if (!inquiryContent.trim()) errors.content = "문의 내용을 입력해 주세요."
    setInquiryErrors(errors)
    if (Object.keys(errors).length > 0) return
    const inquiry: DemoInquiry = {
      id: `inquiry-${Date.now()}`,
      category: inquiryCategory,
      title: inquiryTitle.trim(),
      content: inquiryContent.trim(),
      createdAt: new Date().toLocaleDateString("ko-KR"),
    }
    saveDemoInquiry(inquiry)
    setSettingsDialog("inquiry-success")
  }
  if (mileageBarcodeOpen) {
    return (
      <section
        className="mileage-barcode-page"
        aria-label="마일리지 바코드"
      >
        <header>
          <button
            className="icon-button"
            onClick={() => setMileageBarcodeOpen(false)}
            aria-label="마일리지 화면으로 돌아가기"
          >
            <ArrowLeft />
          </button>
        </header>
        <div className="mileage-barcode-content">
          <div className="mileage-barcode-canvas">
            <svg
              ref={mileageBarcodeRef}
              className={mileageBarcodeError ? "is-hidden" : ""}
              role="img"
              aria-label={`${account.name}님의 마일리지 바코드`}
            />
            {mileageBarcodeError && (
              <div className="mileage-barcode-error">
                <CircleHelp />
                <p>{mileageBarcodeError}</p>
                <Button
                  variant="soft"
                  onClick={() => {
                    setMileageBarcodeError("")
                    setMileageMemberCode(
                      getOrCreateMileageMemberCode(account.id, role),
                    )
                    setMileageBarcodeAttempt((current) => current + 1)
                  }}
                >
                  다시 시도
                </Button>
              </div>
            )}
          </div>
          <code>{mileageMemberCode || "식별 코드 생성 대기"}</code>
          <p className="mileage-barcode-guide">
            교내 제휴 매장에서 마일리지 바코드를 제시해 주세요.
          </p>
        </div>
      </section>
    )
  }
  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && requestClose()
      }
    >
      <section className="sheet" ref={sheetRef}>
        <div className="sheet-handle" />
        <header>
          <button className="icon-button" onClick={handleHeaderBack}>
            {type === "reviews" ||
            type === "account-edit" ||
            type === "passenger-guide" ||
            type === "driver-guide" ||
            type === "contact-support" ||
            settingsChildTypes.includes(type) ||
            safetyChildTypes.includes(type) ? (
              <ArrowLeft />
            ) : (
              <X />
            )}
          </button>
          <strong>{titles[type]}</strong>
          <span />
        </header>
        {type === "matches" && (
          <div className="sheet-content">
            <div className="demo-banner">
              <Sparkles />
              <p>
                <strong>데모 경로 유사도</strong>
                지도 API가 연결되지 않아 저장된 출발지, 목적지, 경유지와 시간을
                비교한 결과예요.
              </p>
            </div>
            {sheetMatches.length > 0 ? (
              <div className="match-results">
                {sheetMatches.map((ride) => (
                  <article className="match-result-card" key={ride.id}>
                    <div className="ride-top">
                      <div className="avatar">{ride.name.slice(0, 1)}</div>
                      <div>
                        <strong>
                          {ride.name} <ShieldCheck />
                        </strong>
                        <span>{ride.car}</span>
                      </div>
                      <span className="match">{ride.match}% 일치</span>
                    </div>
                    <div className="mini-route">
                      <div>
                        <i />
                        <span>
                          <strong>{ride.start}</strong>
                          <small>5월 20일 · {ride.time}</small>
                        </span>
                      </div>
                      <div className="via">경유 · {ride.via}</div>
                      <div>
                        <i />
                        <span>
                          <strong>{ride.end}</strong>
                          <small className="eta-arrival">
                            {formatEtaTime(ride.estimatedArrival)} 도착 예정
                          </small>
                        </span>
                      </div>
                    </div>
                    <div className="eta-summary">
                      <Clock3 />
                      <span>
                        {ride.time} 출발 →{" "}
                        <strong>
                          {formatEtaTime(ride.estimatedArrival)} 도착 예정
                        </strong>
                      </span>
                      <small>
                        약 {ride.estimatedDuration}분 · 잔여 {ride.seats}석
                      </small>
                    </div>
                    <div className="ride-bottom">
                      <span>
                        <Star /> {ride.rating} ({ride.reviews})
                      </span>
                      <strong>{ride.price.toLocaleString()} P</strong>
                    </div>
                    <Button
                      disabled={isRideApplied(ride)}
                      onClick={() => applyToMatchRide(ride)}
                    >
                      {isRideApplied(ride) ? "신청 완료" : "탑승 신청"}
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="recommendation-empty">
                <Route />
                <strong>조건에 맞는 카풀이 없어요</strong>
                <p>기본 경로나 희망 시간을 조정한 뒤 다시 검색해 주세요.</p>
                <Button variant="soft" onClick={() => open("route-edit")}>
                  추천 조건 수정
                </Button>
              </div>
            )}
          </div>
        )}
        {type === "ride" && detailRide && (
          <div className="sheet-content ride-detail">
            <div className="driver-profile">
              <div className="avatar large">{detailRide.name.slice(0, 1)}</div>
              <div>
                <h2>
                  {detailRide.name} <ShieldCheck />
                </h2>
                <p>{detailRide.car} · 면허 및 차량 데모 확인</p>
                <span>
                  <Star /> {detailRide.rating} · 후기 {detailRide.reviews}개
                </span>
              </div>
            </div>
            <RouteCard
              route={{
                ...route,
                start: detailRide.start,
                destination: detailRide.end,
              }}
            />
            <div className="detail-grid">
              <div>
                <Clock3 />
                <span>
                  출발 시간
                  <strong>
                    {detailRide.date} {detailRide.time}
                  </strong>
                </span>
              </div>
              <div className="eta-detail-item">
                <Navigation />
                <span>
                  학교 도착 예정
                  <strong>{formatEtaTime(detailRide.estimatedArrival)}</strong>
                </span>
              </div>
              <div>
                <Clock3 />
                <span>
                  예상 소요 시간
                  <strong>약 {detailRide.estimatedDuration}분</strong>
                </span>
              </div>
              <div>
                <CarFront />
                <span>
                  차량 정보<strong>{detailRide.car}</strong>
                </span>
              </div>
              <div>
                <UsersRound />
                <span>
                  잔여 좌석<strong>{detailRide.seats}자리</strong>
                </span>
              </div>
              <div>
                <WalletCards />
                <span>
                  예상 비용
                  <strong>{detailRide.price.toLocaleString()} P</strong>
                </span>
              </div>
            </div>
            <div className="notice-box">
              <ShieldCheck />
              <p>
                <strong>안전한 만남 장소</strong>
                {detailRide.start}에서 만나요.
              </p>
            </div>
            <h3>주요 경유지</h3>
            <p className="waypoints">{detailRide.via}</p>
            <Button
              onClick={() => applyToMatchRide(detailRide)}
              disabled={isRideApplied(detailRide)}
            >
              {isRideApplied(detailRide) ? (
                <>
                  <Check /> 신청이 완료됐어요
                </>
              ) : (
                `${detailRide.price.toLocaleString()} P로 탑승 신청`
              )}
            </Button>
          </div>
        )}
        {type === "create" && (
          <div className="sheet-content form-stack">
            <div className="notice-box">
              <Route />
              <p>
                <strong>기본 경로를 불러왔어요</strong>필요한 항목만 수정해
                등록하세요.
              </p>
            </div>
            <Field
              label="운행 날짜 *"
              value={createDraft.date}
              onChange={(event) =>
                setCreateDraft({ ...createDraft, date: event.target.value })
              }
              type="date"
            />
            <Field
              label="출발 시간 *"
              value={createDraft.time}
              onChange={(event) =>
                setCreateDraft({ ...createDraft, time: event.target.value })
              }
              type="time"
            />
            <Field
              label="출발 장소 *"
              value={createDraft.start}
              onChange={(event) =>
                setCreateDraft({ ...createDraft, start: event.target.value })
              }
              icon={<MapPin />}
            />
            <Field
              label="목적지 *"
              value={createDraft.destination}
              onChange={(event) =>
                setCreateDraft({
                  ...createDraft,
                  destination: event.target.value,
                })
              }
              icon={<Navigation />}
            />
            <Field
              label="주요 경유지"
              value={createDraft.waypoints}
              onChange={(event) =>
                setCreateDraft({
                  ...createDraft,
                  waypoints: event.target.value,
                })
              }
              placeholder="예: 태평역, 성남시청"
              icon={<MapPin />}
            />
            <div className="eta-preview">
              <Clock3 />
              <div>
                <span>등록 일정 기준 ETA</span>
                <strong>
                  {createDraft.estimatedArrival
                    ? `${formatEtaDateTime(createDraft.estimatedArrival)} 도착 예정`
                    : "날짜와 출발 시간을 입력해 주세요"}
                </strong>
                <small>
                  예상 소요 시간 약{" "}
                  {Number(createDraft.estimatedDuration) ||
                    DEFAULT_ESTIMATED_DURATION}
                  분 · 실제 교통정보 미반영
                </small>
              </div>
            </div>
            <Field
              label="차량 정보 *"
              value={createDraft.vehicle}
              onChange={(event) =>
                setCreateDraft({ ...createDraft, vehicle: event.target.value })
              }
            />
            <div className="two-fields">
              <Field
                label="전체 좌석 *"
                value={createDraft.totalSeats}
                min="1"
                onChange={(event) =>
                  setCreateDraft({
                    ...createDraft,
                    totalSeats: event.target.value,
                  })
                }
                type="number"
              />
              <Field
                label="카풀 이용 요금 *"
                value={createDraft.price}
                min="1"
                onChange={(event) =>
                  setCreateDraft({ ...createDraft, price: event.target.value })
                }
                type="number"
              />
            </div>
            <Field
              label="추가 안내 사항"
              value={createDraft.note}
              onChange={(event) =>
                setCreateDraft({ ...createDraft, note: event.target.value })
              }
              placeholder="탑승자에게 전달할 안내를 입력하세요"
            />
            <div className="filter-dropdown">
              <button
                className="filter-trigger"
                onClick={() => setFilterOpen(!filterOpen)}
              >
                <Settings />
                <span>
                  <strong>탑승 조건</strong>
                  <small>
                    {createDraft.smokingPreference} ·{" "}
                    {createDraft.genderPreference}
                  </small>
                </span>
                <ChevronRight className={filterOpen ? "rotate" : ""} />
              </button>
              {filterOpen && (
                <div className="filter-options">
                  <label className="field">
                    <span>흡연 관련 선호</span>
                    <select
                      value={createDraft.smokingPreference}
                      onChange={(event) =>
                        setCreateDraft({
                          ...createDraft,
                          smokingPreference: event.target.value,
                        })
                      }
                    >
                      <option value="흡연자 탑승 가능">흡연자 탑승 가능</option>
                      <option value="비흡연자 선호">비흡연자 선호</option>
                      <option value="흡연 여부 무관">흡연 여부 무관</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>성별 조건</span>
                    <select
                      value={createDraft.genderPreference}
                      onChange={(event) =>
                        setCreateDraft({
                          ...createDraft,
                          genderPreference: event.target.value,
                        })
                      }
                    >
                      <option value="성별 무관">성별 무관</option>
                      <option value="동성만">동성만</option>
                    </select>
                  </label>
                  <div className="filter-actions">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setCreateDraft({
                          ...createDraft,
                          smokingPreference: "비흡연자 선호",
                          genderPreference: "성별 무관",
                        })
                        setFilterOpen(false)
                      }}
                    >
                      초기화
                    </Button>
                    <Button onClick={() => setFilterOpen(false)}>적용</Button>
                  </div>
                </div>
              )}
            </div>
            {createError && <span className="field-error">{createError}</span>}
            <Button
              onClick={() => {
                try {
                  createCarpoolRide({
                    start: createDraft.start,
                    destination: createDraft.destination,
                    date: createDraft.date,
                    time: createDraft.time,
                    vehicle: createDraft.vehicle,
                    totalSeats: Number(createDraft.totalSeats),
                    price: Number(createDraft.price),
                    note: createDraft.note,
                    waypoints: createDraft.waypoints,
                    estimatedDuration: Number(createDraft.estimatedDuration),
                    estimatedArrival: createDraft.estimatedArrival,
                    arrivalTimeManual: createDraft.arrivalTimeManual,
                    smokingPreference: createDraft.smokingPreference,
                    genderPreference: createDraft.genderPreference,
                  })
                  setCreateError("")
                  setFlowNotice("카풀 일정이 등록되었습니다.")
                } catch (error) {
                  setCreateError(
                    error instanceof Error
                      ? error.message
                      : "필수 입력 항목을 확인해 주세요.",
                  )
                }
              }}
            >
              모집 시작하기
            </Button>
            {flowNotice && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <span className="dialog-icon">
                    <Check />
                  </span>
                  <h2>{flowNotice}</h2>
                  <p>브라우저에 저장된 발표용 데모 일정입니다.</p>
                  <Button onClick={close}>확인</Button>
                </section>
              </div>
            )}
          </div>
        )}
        {type === "reservation" && (
          <div className="sheet-content reservation-content">
            <div className="calendar-toolbar reservation-toolbar">
              <button
                onClick={() =>
                  setReservationMonth(
                    new Date(
                      reservationMonth.getFullYear(),
                      reservationMonth.getMonth() - 1,
                      1,
                    ),
                  )
                }
                aria-label="이전 달"
              >
                <ChevronRight className="flip" />
              </button>
              <strong>
                {reservationMonth.getFullYear()}년{" "}
                {reservationMonth.getMonth() + 1}월
              </strong>
              <button
                onClick={() =>
                  setReservationMonth(
                    new Date(
                      reservationMonth.getFullYear(),
                      reservationMonth.getMonth() + 1,
                      1,
                    ),
                  )
                }
                aria-label="다음 달"
              >
                <ChevronRight />
              </button>
            </div>
            <div className="reservation-weekdays">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="reservation-calendar">
              {Array.from({ length: reservationStartDay }, (_, index) => (
                <i key={`blank-${index}`} />
              ))}
              {reservationDays.map((day) => {
                const date = `${reservationMonth.getFullYear()}-${String(
                  reservationMonth.getMonth() + 1,
                ).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                const todayKey = new Date().toLocaleDateString("en-CA")
                const isPast = date < todayKey
                return (
                  <button
                    className={`${reservationDate === date ? "active" : ""} ${
                      date === todayKey ? "today" : ""
                    }`}
                    disabled={isPast}
                    onClick={() => {
                      setReservationDate(date)
                      setReservationSearched(false)
                    }}
                    key={date}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            <div className="reservation-selected">
              <span>선택한 날짜</span>
              <strong>{reservationDate || "날짜를 선택해 주세요."}</strong>
            </div>
            <div className="dialog-actions">
              <Button variant="ghost" onClick={close}>
                닫기
              </Button>
              <Button
                disabled={!reservationDate}
                onClick={() => setReservationSearched(true)}
              >
                카풀 검색
              </Button>
            </div>
            {reservationSearched && (
              <section className="reservation-results">
                {reservationResults.length > 0 ? (
                  reservationResults.map((ride) => (
                    <article className="reservation-ride" key={ride.id}>
                      <span className="tag open">모집 중</span>
                      <h3>
                        {ride.start} → {ride.destination}
                      </h3>
                      <p>
                        {ride.date} · {ride.time} · {ride.driverName}
                      </p>
                      <small>
                        잔여 {getRemainingSeats(carpoolFlow, ride.id)}석 ·{" "}
                        {ride.price.toLocaleString()} P
                      </small>
                      <small className="eta-inline">
                        {formatEtaTime(ride.estimatedArrival)} 도착 예정 · 약{" "}
                        {ride.estimatedDuration}분
                      </small>
                      <Button onClick={() => setApplyRide(ride)}>
                        예약 신청
                      </Button>
                    </article>
                  ))
                ) : (
                  <div className="schedule-empty">
                    <CalendarDays />
                    <strong>선택한 날짜에 예약 가능한 카풀이 없습니다.</strong>
                  </div>
                )}
              </section>
            )}
            {applyRide && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <span className="dialog-icon neutral">
                    <CarFront />
                  </span>
                  <h2>카풀을 신청할까요?</h2>
                  <div className="point-confirm-summary">
                    <div>
                      <dt>경로</dt>
                      <dd>
                        {applyRide.start} → {applyRide.destination}
                      </dd>
                    </div>
                    <div>
                      <dt>운행 일시</dt>
                      <dd>
                        {applyRide.date} {applyRide.time}
                      </dd>
                    </div>
                    <div>
                      <dt>요금</dt>
                      <dd>{applyRide.price.toLocaleString()} P</dd>
                    </div>
                  </div>
                  <div className="dialog-actions">
                    <Button variant="ghost" onClick={() => setApplyRide(null)}>
                      취소
                    </Button>
                    <Button
                      onClick={() => {
                        try {
                          applyToCarpool(applyRide.id)
                          setApplyRide(null)
                          setFlowNotice("카풀 신청이 완료되었습니다.")
                        } catch (error) {
                          setFlowNotice(
                            error instanceof Error
                              ? error.message
                              : "신청할 수 없습니다.",
                          )
                        }
                      }}
                    >
                      신청하기
                    </Button>
                  </div>
                </section>
              </div>
            )}
            {flowNotice && !applyRide && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <span className="dialog-icon">
                    <Check />
                  </span>
                  <h2>{flowNotice}</h2>
                  <p>신청 상태는 홈과 일정 탭에서 확인할 수 있습니다.</p>
                  <Button
                    onClick={() => {
                      setFlowNotice("")
                      close()
                    }}
                  >
                    확인
                  </Button>
                </section>
              </div>
            )}
          </div>
        )}
        {type === "notifications" && (
          <div className="sheet-content notification-list">
            {[
              [
                "탑승 신청이 도착했어요",
                "박민지님이 5월 20일 카풀에 신청했어요.",
                "방금 전",
              ],
              [
                "카풀이 승인되었어요",
                "김도윤 운전자가 신청을 승인했어요.",
                "1시간 전",
              ],
              [
                "출발 30분 전이에요",
                "탑승 장소와 시간을 다시 확인해 주세요.",
                "어제",
              ],
            ].map((n, i) => (
              <button key={n[0]} onClick={() => alert(`${n[0]}\n${n[1]}`)}>
                <span className={i === 0 ? "new" : ""}>
                  {i === 0 ? <UsersRound /> : i === 1 ? <Check /> : <Bell />}
                </span>
                <div>
                  <strong>{n[0]}</strong>
                  <p>{n[1]}</p>
                  <time>{n[2]}</time>
                </div>
              </button>
            ))}
          </div>
        )}
        {type === "carpool-payment" && (
          <div className="sheet-content payment-sheet-content">
            {tripFlow.status === "결제 완료" ? (
              <section className="payment-complete">
                <span className="payment-complete-icon">
                  <Check />
                </span>
                <h2>결제가 완료되었습니다</h2>
                <strong>{tripFlow.amount.toLocaleString()} P</strong>
                <RouteCard
                  route={{
                    ...route,
                    start: tripFlow.start,
                    destination: tripFlow.destination,
                  }}
                />
                <div className="payment-complete-meta">
                  <span>{tripFlow.operatedAt}</span>
                  <span className="tag open">결제 완료</span>
                </div>
                <div className="payment-complete-actions">
                  <Button variant="soft" onClick={() => open("history")}>
                    이용 내역 확인하기
                  </Button>
                  <Button onClick={onGoHome}>홈으로 이동</Button>
                </div>
              </section>
            ) : (
              <>
                <div className="demo-banner">
                  <WalletCards />
                  <p>
                    <strong>발표용 데모 결제</strong>
                    실제 카드, 계좌 또는 포인트 결제와 연결되지 않습니다.
                  </p>
                </div>
                <section className="payment-trip-card">
                  <div className="driver-profile">
                    <div className="avatar large">김</div>
                    <div>
                      <h2>{tripFlow.driverName} 운전자</h2>
                      <p>{tripFlow.vehicle}</p>
                      <span className="tag waiting">{tripFlow.status}</span>
                    </div>
                  </div>
                  <RouteCard
                    route={{
                      ...route,
                      start: tripFlow.start,
                      destination: tripFlow.destination,
                    }}
                  />
                  <p className="payment-operated-at">
                    <CalendarDays /> {tripFlow.operatedAt}
                  </p>
                </section>
                <section className="payment-amount-card">
                  <div>
                    <span>카풀 이용 요금</span>
                    <strong>{tripFlow.amount.toLocaleString()} P</strong>
                  </div>
                  <div>
                    <span>추가 요금</span>
                    <strong>0 P</strong>
                  </div>
                  <div className="total">
                    <span>최종 결제 금액</span>
                    <strong>{tripFlow.amount.toLocaleString()} P</strong>
                  </div>
                  <small>기존 카풀 일정에 등록된 데모 금액입니다.</small>
                </section>
                <div className="payment-sheet-actions">
                  <Button variant="ghost" onClick={close}>
                    닫기
                  </Button>
                  <Button
                    disabled={tripFlow.status !== "결제 대기"}
                    onClick={() => setPaymentConfirmOpen(true)}
                  >
                    데모 결제하기
                  </Button>
                </div>
              </>
            )}
            {paymentConfirmOpen && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <span className="dialog-icon neutral">
                    <WalletCards />
                  </span>
                  <h2>결제를 진행할까요?</h2>
                  <p>발표용 데모 결제이며 실제 금액이 청구되지 않습니다.</p>
                  <div className="dialog-actions">
                    <Button
                      variant="ghost"
                      onClick={() => setPaymentConfirmOpen(false)}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={() => {
                        onCompletePayment()
                        setPaymentConfirmOpen(false)
                      }}
                    >
                      결제 확인
                    </Button>
                  </div>
                </section>
              </div>
            )}
          </div>
        )}
        {type === "points" && (
          <div className="sheet-content">
            <div className="wallet-hero">
              <span>사용 가능한 포인트</span>
              <strong>{formatPoints(pointWallet.balance)}</strong>
              <p>1포인트 = 1원 · 데모 충전 전용</p>
              <Button variant="secondary" onClick={() => setChargeOpen(true)}>
                <Plus /> 포인트 충전
              </Button>
            </div>
            <div className="section-heading">
              <h2>최근 이용 내역</h2>
              <button onClick={() => open("history")}>전체보기</button>
            </div>
            <div className="transaction-list">
              {pointWallet.charges.map((charge) => (
                <div key={charge.id}>
                  <span className="transaction-icon green">
                    <Plus />
                  </span>
                  <p>
                    <strong>
                      데모 포인트 충전 (+{formatPoints(charge.amount)})
                    </strong>
                    <small>
                      {new Date(charge.createdAt).toLocaleString("ko-KR", {
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {charge.paymentMethod} · {charge.status}
                    </small>
                  </p>
                  <b className="positive">+{formatPoints(charge.amount)}</b>
                </div>
              ))}
              <div>
                <span className="transaction-icon">
                  <CarFront />
                </span>
                <p>
                  <strong>모란역 → 신구대학교</strong>
                  <small>5월 16일 · 결제 완료</small>
                </p>
                <b>-2,800 P</b>
              </div>
              <div>
                <span className="transaction-icon green">
                  <Plus />
                </span>
                <p>
                  <strong>데모 포인트 충전</strong>
                  <small>5월 10일</small>
                </p>
                <b className="positive">+10,000 P</b>
              </div>
            </div>
            {chargeOpen && (
              <div className="point-charge-page">
                <section
                  className="point-charge-sheet"
                  aria-label="포인트 충전"
                >
                  <header>
                    <button
                      className="icon-button"
                      onClick={resetChargeFlow}
                      aria-label="포인트 화면으로 돌아가기"
                    >
                      <ArrowLeft />
                    </button>
                    <div>
                      <h2>포인트 충전</h2>
                      <p>원하는 금액을 선택하고 포인트를 충전하세요.</p>
                    </div>
                    <span aria-hidden="true" />
                  </header>
                  <div className="point-charge-scroll">
                    <div className="point-current-balance">
                      <span>현재 보유 포인트</span>
                      <strong>{formatPoints(pointWallet.balance)}</strong>
                    </div>

                    <section className="point-charge-section">
                      <div className="form-section-heading">
                        <strong>충전 금액</strong>
                        <span>
                          충전할 포인트를 선택하거나 직접 입력해 주세요.
                        </span>
                      </div>
                      <div className="point-amount-chips">
                        {[5_000, 10_000, 20_000, 50_000].map((amount) => (
                          <button
                            className={
                              selectedChargeAmount === amount ? "active" : ""
                            }
                            onClick={() => {
                              setSelectedChargeAmount(amount)
                              setCustomChargeAmount("")
                              setChargeErrors((current) => ({
                                ...current,
                                amount: undefined,
                              }))
                            }}
                            aria-pressed={selectedChargeAmount === amount}
                            key={amount}
                          >
                            +{formatPoints(amount)}
                          </button>
                        ))}
                      </div>
                      <label className="point-custom-amount">
                        <span>직접 입력</span>
                        <div>
                          <input
                            inputMode="numeric"
                            value={customChargeAmount}
                            onChange={(event) => {
                              const value = event.target.value
                              setSelectedChargeAmount(null)
                              if (!/^[\d,]*$/.test(value)) {
                                setChargeErrors((current) => ({
                                  ...current,
                                  amount:
                                    "숫자만 입력해 주세요. 음수와 소수점은 사용할 수 없습니다.",
                                }))
                                return
                              }
                              const digits = value.replaceAll(",", "")
                              const amount = digits ? Number(digits) : 0
                              setCustomChargeAmount(
                                digits && Number.isSafeInteger(amount)
                                  ? amount.toLocaleString("ko-KR")
                                  : "",
                              )
                              setChargeErrors((current) => ({
                                ...current,
                                amount: undefined,
                              }))
                            }}
                            placeholder="충전할 포인트를 입력하세요."
                            aria-invalid={Boolean(chargeErrors.amount)}
                          />
                          <b>P</b>
                        </div>
                      </label>
                      {chargeErrors.amount && (
                        <span className="field-error point-charge-error">
                          {chargeErrors.amount}
                        </span>
                      )}
                      <div className="point-charge-preview">
                        <span>충전 예정 포인트</span>
                        <strong>
                          +
                          {formatPoints(
                            Number.isFinite(chargeAmount) ? chargeAmount : 0,
                          )}
                        </strong>
                      </div>
                    </section>

                    <div className="point-charge-total">
                      <span>최종 충전 금액</span>
                      <strong>+{formatPoints(chargeAmount)}</strong>
                    </div>
                  </div>
                  <div className="point-charge-footer">
                    <section className="point-charge-section point-charge-payment-section">
                      <div className="form-section-heading">
                        <strong>결제 수단</strong>
                        <span>데모에 사용할 수단을 하나 선택해 주세요.</span>
                      </div>
                      <div className="point-payment-methods">
                        {([
                          ["카카오페이", "K"],
                          ["토스페이", "T"],
                          ["신용카드 간편결제", "CARD"],
                        ] as [DemoPaymentMethod, string][]).map(
                          ([method, mark]) => (
                            <button
                              className={
                                chargePaymentMethod === method ? "active" : ""
                              }
                              onClick={() => {
                                setChargePaymentMethod(method)
                                setChargeErrors((current) => ({
                                  ...current,
                                  paymentMethod: undefined,
                                }))
                              }}
                              aria-pressed={chargePaymentMethod === method}
                              key={method}
                            >
                              <i>{mark}</i>
                              <span>{method}</span>
                              <b>
                                {chargePaymentMethod === method && <Check />}
                              </b>
                            </button>
                          ),
                        )}
                      </div>
                      {chargeErrors.paymentMethod && (
                        <span className="field-error point-charge-error">
                          {chargeErrors.paymentMethod}
                        </span>
                      )}
                      <p className="point-demo-notice">
                        발표용 데모 기능이며 실제 결제는 진행되지 않습니다.
                      </p>
                    </section>
                    <div className="point-charge-actions">
                      <Button variant="ghost" onClick={resetChargeFlow}>
                        취소
                      </Button>
                      <Button onClick={validateCharge}>충전하기</Button>
                    </div>
                  </div>

                  {chargeConfirmOpen && (
                    <div className="dialog-backdrop point-dialog-backdrop">
                      <section className="app-dialog point-confirm-dialog">
                        <span className="dialog-icon neutral">
                          <WalletCards />
                        </span>
                        <h2>충전 내용을 확인해 주세요.</h2>
                        <dl className="point-confirm-summary">
                          <div>
                            <dt>충전 포인트</dt>
                            <dd>+{formatPoints(chargeAmount)}</dd>
                          </div>
                          <div>
                            <dt>선택한 결제 수단</dt>
                            <dd>{chargePaymentMethod}</dd>
                          </div>
                          <div>
                            <dt>충전 후 예상 잔액</dt>
                            <dd>
                              {formatPoints(pointWallet.balance + chargeAmount)}
                            </dd>
                          </div>
                        </dl>
                        <p>
                          실제 결제 없이 포인트 잔액만 변경되는 데모 기능입니다.
                        </p>
                        <div className="dialog-actions">
                          <Button
                            variant="ghost"
                            onClick={() => setChargeConfirmOpen(false)}
                            disabled={isCharging}
                          >
                            취소
                          </Button>
                          <Button
                            onClick={completeCharge}
                            disabled={isCharging}
                          >
                            {isCharging ? "처리 중..." : "데모 충전하기"}
                          </Button>
                        </div>
                      </section>
                    </div>
                  )}

                  {completedCharge && (
                    <div className="dialog-backdrop point-dialog-backdrop">
                      <section className="app-dialog point-complete-dialog">
                        <span className="dialog-icon">
                          <Check />
                        </span>
                        <h2>충전이 완료되었습니다!</h2>
                        <strong>+{formatPoints(completedCharge.amount)}</strong>
                        <dl className="point-confirm-summary">
                          <div>
                            <dt>충전 후 잔액</dt>
                            <dd>
                              {formatPoints(completedCharge.balanceAfter)}
                            </dd>
                          </div>
                          <div>
                            <dt>결제 수단</dt>
                            <dd>{completedCharge.paymentMethod}</dd>
                          </div>
                        </dl>
                        <span className="point-complete-badge">
                          데모 충전 완료
                        </span>
                        <p>실제 결제는 발생하지 않았습니다.</p>
                        <Button onClick={resetChargeFlow}>확인</Button>
                      </section>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        )}
        {type === "mileage" && (
          <div className="sheet-content">
            <div
              className="wallet-hero mileage-hero"
              role="button"
              tabIndex={0}
              onClick={() => setMileageBarcodeOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ")
                  setMileageBarcodeOpen(true)
              }}
            >
              <span>현재 보유 마일리지</span>
              <strong>{mileageBalance.toLocaleString("ko-KR")} M</strong>
              <p>실제 결제 완료 금액의 10%가 적립됩니다.</p>
              <Button variant="secondary">
                <WalletCards /> 마일리지 바코드 보기
              </Button>
            </div>
            <div className="summary-grid">
              <div>
                <span>이번 달 적립</span>
                <strong>3,420 M</strong>
              </div>
              <div>
                <span>누적 적립</span>
                <strong>18,240 M</strong>
              </div>
              <div>
                <span>누적 사용</span>
                <strong>5,400 M</strong>
              </div>
            </div>
            <div className="demo-banner">
              <CircleHelp />
              <p>
                <strong>데모 제휴 서비스</strong>
                실제 제휴 매장 결제는 연결되지 않았습니다.
              </p>
            </div>
            <Button onClick={() => open("mileage-history")}>
              마일리지 내역 보기
            </Button>
          </div>
        )}
        {type === "mileage-history" && (
          <div className="sheet-content">
            <div className="filter-tabs mileage-history-tabs">
              {(["전체", "적립", "사용"] as const).map((item) => (
                <button
                  className={historyFilter === item ? "active" : ""}
                  onClick={() => setHistoryFilter(item)}
                  aria-pressed={historyFilter === item}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>
            {filteredMileageHistoryEntries.length > 0 ? (
              <div className="history-list">
                {filteredMileageHistoryEntries.map((entry) => (
                  <article key={entry.id}>
                    <span
                      className={`tag ${
                        entry.type === "적립" ? "open" : "waiting"
                      }`}
                    >
                      {entry.type}
                    </span>
                    <strong>{entry.title}</strong>
                    <small>
                      {entry.date} · 거래 후 {entry.balance}
                    </small>
                    <b>{entry.amount}</b>
                  </article>
                ))}
              </div>
            ) : (
              <div className="history-empty">
                <Star />
                <strong>해당 내역이 없습니다.</strong>
              </div>
            )}
          </div>
        )}
        {type === "history" && (
          <div className="sheet-content">
            <div className="filter-tabs scrollable history-tabs">
              {(["전체", "결제 내역", "이용 내역", "취소·환불"] as const).map(
                (tab) => (
                  <button
                    className={activeTab === tab ? "active" : ""}
                    onClick={() => setActiveTab(tab)}
                    aria-pressed={activeTab === tab}
                    key={tab}
                  >
                    {tab}
                  </button>
                ),
              )}
            </div>
            <div className="history-controls">
              <select defaultValue="all">
                <option value="all">전체 기간</option>
                <option value="month">최근 1개월</option>
              </select>
              <select defaultValue="latest">
                <option value="latest">최신순</option>
                <option value="oldest">오래된 순</option>
              </select>
            </div>
            {filteredHistoryEntries.length > 0 ? (
              <div className="history-list">
                {filteredHistoryEntries.map((entry) => (
                  <article key={entry.id}>
                    <span
                      className={`tag ${
                        entry.status === "취소 완료" ? "waiting" : "open"
                      }`}
                    >
                      {entry.status}
                    </span>
                    <strong>{entry.title}</strong>
                    <small>
                      {entry.date} · {entry.type} · {entry.description}
                    </small>
                    <b>{entry.amount}</b>
                    {entry.canReview && role === "rider" && !reviewed && (
                      <button onClick={() => open("review")}>후기 작성</button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="history-empty">
                <CreditCard />
                <strong>해당 내역이 없습니다.</strong>
                <p>선택한 조건에 해당하는 데모 내역이 없습니다.</p>
              </div>
            )}
          </div>
        )}
        {type === "applications" && (
          <div className="sheet-content">
            <div className="filter-tabs scrollable">
              {[
                "전체",
                "승인 대기",
                "탑승 확정",
                "탑승 완료",
                "거절",
                "취소",
              ].map((item, index) => (
                <button
                  className={applicationFilter === item ? "active" : ""}
                  onClick={() => setApplicationFilter(item)}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="application-list">
              {carpoolFlow.applications.map((application) => {
                const ride = carpoolFlow.rides.find(
                  (item) => item.id === application.rideId,
                )
                if (!ride) return null
                return (
                  <article key={application.id}>
                    <span
                      className={`tag ${
                        application.status === "승인 완료" ? "open" : "waiting"
                      }`}
                    >
                      {ride.status === "완료"
                        ? "완료된 카풀"
                        : application.status}
                    </span>
                    <h3>
                      {role === "driver"
                        ? `${application.riderName} 탑승 신청`
                        : `${ride.driverName} 운전자`}
                    </h3>
                    <p>
                      {ride.start} → {ride.destination}
                    </p>
                    <small>
                      {ride.date} {ride.time} · {ride.price.toLocaleString()} P
                      ·{" "}
                      {new Date(application.createdAt).toLocaleString("ko-KR")}
                    </small>
                    {role === "driver" &&
                      application.status === "승인 대기" && (
                        <div>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              decideCarpoolApplication(application.id, "reject")
                            }
                          >
                            거절
                          </Button>
                          <Button
                            onClick={() =>
                              decideCarpoolApplication(
                                application.id,
                                "approve",
                              )
                            }
                          >
                            승인
                          </Button>
                        </div>
                      )}
                    {role === "rider" &&
                      (application.status === "승인 대기" ||
                        application.status === "승인 완료") && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (!window.confirm("카풀 예약을 취소할까요?"))
                              return
                            cancelCarpoolApplication(application.id)
                          }}
                        >
                          예약 취소
                        </Button>
                      )}
                    {role === "rider" &&
                      ride.status === "완료" &&
                      !carpoolFlow.reviews.some(
                        (review) => review.rideId === ride.id,
                      ) && (
                        <Button variant="soft" onClick={() => open("review")}>
                          후기 작성
                        </Button>
                      )}
                  </article>
                )
              })}
              {(applicationFilter === "전체" ||
                applicationFilter === "승인 대기") && (
                <article>
                  <span
                    className={`tag ${
                      applicationCancelled ? "waiting" : "waiting"
                    }`}
                  >
                    {applicationCancelled ? "취소" : "승인 대기"}
                  </span>
                  <h3>
                    {role === "driver" ? "박민지 탑승 신청" : "김도윤 운전자"}
                  </h3>
                  <p>태평역 → 신구대학교</p>
                  <small>5월 21일 오전 8:15 · 2,800 P · 잔여 1석</small>
                  <div>
                    <Button
                      variant="soft"
                      onClick={() => open("application-detail")}
                    >
                      상세 보기
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={applicationCancelled}
                      onClick={() => {
                        if (window.confirm("탑승 신청을 취소할까요?")) {
                          writeDemoValue("application-0521", "cancelled")
                          setApplicationCancelled(true)
                        }
                      }}
                    >
                      {applicationCancelled ? "취소 완료" : "신청 취소"}
                    </Button>
                  </div>
                </article>
              )}
              {(applicationFilter === "전체" ||
                applicationFilter === "탑승 완료") && (
                <article>
                  <span className="tag open">탑승 완료</span>
                  <h3>김도윤 운전자</h3>
                  <p>모란역 → 신구대학교</p>
                  <small>5월 16일 오전 8:10 · 결제 완료</small>
                  <Button variant="soft" onClick={() => open("review")}>
                    {reviewed ? "후기 작성 완료" : "후기 작성"}
                  </Button>
                </article>
              )}
            </div>
          </div>
        )}
        {type === "application-detail" && (
          <div className="sheet-content ride-detail">
            <div className="driver-profile">
              <div className="avatar large">김</div>
              <div>
                <h2>
                  김도윤 <ShieldCheck />
                </h2>
                <p>흰색 현대 아반떼 · 면허 데모 확인</p>
                <span className="tag waiting">
                  {applicationCancelled ? "취소" : "승인 대기"}
                </span>
              </div>
            </div>
            <RouteCard route={route} />
            <div className="detail-grid">
              <div>
                <Clock3 />
                <span>
                  출발<strong>5월 21일 오전 8:15</strong>
                </span>
              </div>
              <div>
                <WalletCards />
                <span>
                  예상 결제<strong>2,800 P</strong>
                </span>
              </div>
            </div>
            <Field label="주요 경유지" value="태평역 · 성남시청" readOnly />
            <Button variant="soft" disabled>
              승인 후 채팅방 이동 가능
            </Button>
            <Button
              variant="ghost"
              disabled={applicationCancelled}
              onClick={() => {
                if (window.confirm("탑승 신청을 취소할까요?")) {
                  writeDemoValue("application-0521", "cancelled")
                  setApplicationCancelled(true)
                }
              }}
            >
              {applicationCancelled ? "취소 완료" : "신청 취소"}
            </Button>
          </div>
        )}
        {(type === "calendar" || type === "monthly-rides") && (
          <div className="sheet-content">
            {type === "monthly-rides" && (
              <div className="summary-grid monthly-summary">
                <div>
                  <span>완료 운행</span>
                  <strong>8회</strong>
                </div>
                <div>
                  <span>결제 완료</span>
                  <strong>34,200 P</strong>
                </div>
                <div>
                  <span>적립</span>
                  <strong>3,420 M</strong>
                </div>
              </div>
            )}
            <div className="calendar-toolbar">
              <button
                onClick={() => {
                  setCalendarView(
                    new Date(calendarYear, calendarView.getMonth() - 1, 1),
                  )
                  setSelectedDate("1")
                }}
              >
                <ChevronRight className="flip" />
              </button>
              <strong>
                {calendarYear}년 {calendarMonth}월
              </strong>
              <button
                onClick={() => {
                  setCalendarView(
                    new Date(calendarYear, calendarView.getMonth() + 1, 1),
                  )
                  setSelectedDate("1")
                }}
              >
                <ChevronRight />
              </button>
              <button
                className="today"
                onClick={() => {
                  const today = new Date()
                  setCalendarView(
                    new Date(today.getFullYear(), today.getMonth(), 1),
                  )
                  setSelectedDate(String(today.getDate()))
                }}
              >
                오늘
              </button>
            </div>
            <div className="calendar-weekdays">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="month-calendar">
              {Array.from({ length: calendarCellCount }, (_, index) => {
                const day = index - calendarStartDay + 1
                const visible = day > 0 && day <= calendarDayCount
                const value = String(day)
                const dateKey = `${calendarYear}-${String(
                  calendarMonth,
                ).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                const hasRide =
                  visible &&
                  (Boolean(demoScheduleByDate[dateKey]?.length) ||
                    carpoolFlow.rides.some((ride) => ride.date === dateKey))
                return (
                  <button
                    className={`${selectedDate === value ? "selected" : ""} ${
                      hasRide ? "has-ride" : ""
                    }`}
                    onClick={() => visible && setSelectedDate(value)}
                    disabled={!visible}
                    key={index}
                  >
                    {visible ? day : ""}
                    {hasRide && <i />}
                  </button>
                )
              })}
            </div>
            <div className="calendar-detail">
              <div className="section-heading">
                <h2>
                  {calendarYear}년 {calendarMonth}월 {selectedDate}일 내역
                </h2>
                <span className="tag open">
                  {selectedCalendarRides.length +
                    (demoScheduleByDate[selectedCalendarKey]?.length ?? 0)}
                  건
                </span>
              </div>
              {selectedCalendarRides.length > 0 ? (
                selectedCalendarRides.map((ride) => (
                  <article key={ride.id}>
                    <time>{ride.time}</time>
                    <div>
                      <span className="tag open">{ride.status}</span>
                      <strong>
                        {ride.start} → {ride.destination}
                      </strong>
                      <small>
                        {ride.driverName} 운전자 ·{" "}
                        {formatEtaTime(ride.estimatedArrival)} 도착 예정 · 약{" "}
                        {ride.estimatedDuration}분
                      </small>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <CalendarDays />
                  <p>해당 날짜의 카풀 내역이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {type === "route-edit" && (
          <div className="sheet-content form-stack">
            <Field
              label="기본 출발지"
              value={routeDraft.start}
              onChange={(event) => {
                setRouteDraft({ ...routeDraft, start: event.target.value })
                setRouteDirty(true)
              }}
              icon={<MapPin />}
            />
            <Field
              label="기본 목적지"
              value={routeDraft.destination}
              onChange={(event) => {
                setRouteDraft({
                  ...routeDraft,
                  destination: event.target.value,
                })
                setRouteDirty(true)
              }}
              icon={<Navigation />}
            />
            <Field
              label={role === "driver" ? "주요 거점" : "선호 탑승 장소"}
              value={
                role === "driver" ? routeDraft.waypoint : routeDraft.pickup
              }
              onChange={(event) => {
                setRouteDraft({
                  ...routeDraft,
                  [role === "driver" ? "waypoint" : "pickup"]:
                    event.target.value,
                })
                setRouteDirty(true)
              }}
              icon={<MapPin />}
            />
            <Field
              label="희망 출발 시간대"
              value={routeDraft.departureTime}
              onChange={(event) => {
                setRouteDraft({
                  ...routeDraft,
                  departureTime: event.target.value,
                })
                setRouteDirty(true)
              }}
              type="time"
              icon={<Clock3 />}
            />
            {role === "rider" && (
              <Field
                label="희망 도착 시간 · 선택"
                value={routeDraft.preferredArrival ?? ""}
                onChange={(event) => {
                  setRouteDraft({
                    ...routeDraft,
                    preferredArrival: event.target.value,
                  })
                  setRouteDirty(true)
                }}
                type="time"
                icon={<Navigation />}
              />
            )}
            {role === "rider" && (
              <div className="two-fields">
                <label className="field">
                  <span>흡연 여부 조건</span>
                  <select
                    value={routeDraft.smokingPreference ?? "비흡연자 선호"}
                    onChange={(event) => {
                      setRouteDraft({
                        ...routeDraft,
                        smokingPreference: event.target.value,
                      })
                      setRouteDirty(true)
                    }}
                  >
                    <option value="비흡연자 선호">비흡연자 선호</option>
                    <option value="흡연자 탑승 가능">흡연자 탑승 가능</option>
                    <option value="흡연 여부 무관">흡연 여부 무관</option>
                  </select>
                </label>
                <label className="field">
                  <span>성별 조건</span>
                  <select
                    value={routeDraft.genderPreference ?? "성별 무관"}
                    onChange={(event) => {
                      setRouteDraft({
                        ...routeDraft,
                        genderPreference: event.target.value,
                      })
                      setRouteDirty(true)
                    }}
                  >
                    <option value="성별 무관">성별 무관</option>
                    <option value="동성만">동성만</option>
                  </select>
                </label>
              </div>
            )}
            <label className="field">
              <span>자주 이용하는 요일</span>
              <span className="weekday-selector">
                {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
                  <button
                    type="button"
                    className={
                      routeDraft.weekdays.includes(day) ? "active" : ""
                    }
                    onClick={() => {
                      setRouteDraft({
                        ...routeDraft,
                        weekdays: routeDraft.weekdays.includes(day)
                          ? routeDraft.weekdays.filter((item) => item !== day)
                          : [...routeDraft.weekdays, day],
                      })
                      setRouteDirty(true)
                    }}
                    key={day}
                  >
                    {day}
                  </button>
                ))}
              </span>
            </label>
            <div className="route-edit-actions">
              <Button
                variant="ghost"
                onClick={() => {
                  setRouteDraft(defaultRoutes[role])
                  setRouteDirty(true)
                }}
              >
                초기화
              </Button>
              <Button
                variant="soft"
                onClick={() => {
                  if (routeDirty && !window.confirm("변경 사항을 취소할까요?"))
                    return
                  close()
                }}
              >
                취소
              </Button>
              <Button
                onClick={() => {
                  onSaveRoute(routeDraft)
                  setRouteDirty(false)
                  close()
                }}
              >
                저장
              </Button>
            </div>
          </div>
        )}
        {(type === "account" || type === "account-edit") && (
          <div className="sheet-content account-edit-content">
            <div className="account-edit-header">
              <div className="profile-avatar">민</div>
              <div>
                <h2>{accountDraft.name}</h2>
                <p>2024년 3월 2일 가입</p>
              </div>
              {type === "account" && (
                <button onClick={() => setEditingAccount(!editingAccount)}>
                  {editingAccount ? "취소" : "수정"}
                </button>
              )}
            </div>
            <div className="form-stack">
              <Field
                label="이름"
                value={accountDraft.name}
                onChange={(event) =>
                  setAccountDraft({ ...accountDraft, name: event.target.value })
                }
                disabled={!isEditingAccount}
              />
              <Field label="아이디" value={accountDraft.id} disabled />
              <Field
                label="신구대학교 이메일 · 데모 확인"
                value={accountDraft.email}
                disabled
              />
              <Field
                label="전화번호"
                value={accountDraft.phone}
                onChange={(event) =>
                  setAccountDraft({
                    ...accountDraft,
                    phone: event.target.value,
                  })
                }
                disabled={!isEditingAccount}
              />
              <Field
                label="성별 · 비공개"
                value={accountDraft.gender}
                onChange={(event) =>
                  setAccountDraft({
                    ...accountDraft,
                    gender: event.target.value,
                  })
                }
                disabled={!isEditingAccount}
              />
              <Field
                label="등록된 역할"
                value={`${registrations.rider ? "탑승자" : ""}${
                  registrations.driver ? " · 운전자" : ""
                }`}
                disabled
              />
              {isEditingAccount && (
                <section className="badge-management">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">MY BADGES</span>
                      <h2>내 뱃지 관리</h2>
                    </div>
                    <small>{badgeDraft.length}/3 선택</small>
                  </div>
                  <p>
                    프로필에 표시할 대표 뱃지를 최대 3개까지 선택할 수 있어요.
                  </p>
                  <div className="badge-selection-list">
                    {demoProfileBadges
                      .filter((badge) => badge.role === role)
                      .map((badge) => {
                        const selected = badgeDraft.includes(badge.id)
                        return (
                          <button
                            className={selected ? "selected" : ""}
                            onClick={() => {
                              if (selected) {
                                setBadgeDraft((current) =>
                                  current.filter((id) => id !== badge.id),
                                )
                                setBadgeError("")
                                return
                              }
                              if (badgeDraft.length >= 3) {
                                setBadgeError(
                                  "대표 뱃지는 최대 3개까지 선택할 수 있어요.",
                                )
                                return
                              }
                              setBadgeDraft((current) => [...current, badge.id])
                              setBadgeError("")
                            }}
                            aria-pressed={selected}
                            key={badge.id}
                          >
                            <span
                              className={`badge-selection-icon tone-${badge.tone}`}
                            >
                              <BadgeGlyph badge={badge} />
                            </span>
                            <span>
                              <strong>{badge.label}</strong>
                              <small>{badge.condition}</small>
                            </span>
                            <i>{selected ? <X /> : <Plus />}</i>
                          </button>
                        )
                      })}
                  </div>
                  {badgeError && (
                    <span className="field-error badge-error">
                      {badgeError}
                    </span>
                  )}
                </section>
              )}
              {isEditingAccount && (
                <Button
                  onClick={() => {
                    if (!/^010-\d{4}-\d{4}$/.test(accountDraft.phone)) {
                      alert("전화번호 형식을 확인해 주세요.")
                      return
                    }
                    onSaveAccount(accountDraft)
                    onSaveBadges(role, badgeDraft)
                    setEditingAccount(false)
                    setProfileSaved(true)
                  }}
                >
                  저장하기
                </Button>
              )}
              {profileSaved && (
                <div className="dialog-backdrop">
                  <section className="app-dialog">
                    <span className="dialog-icon">
                      <Check />
                    </span>
                    <h2>저장 완료</h2>
                    <p>프로필 정보가 안전하게 저장되었습니다.</p>
                    <Button
                      onClick={() => {
                        setProfileSaved(false)
                        close()
                      }}
                    >
                      확인
                    </Button>
                  </section>
                </div>
              )}
            </div>
          </div>
        )}
        {type === "review" && (
          <div className="sheet-content">
            <div className="section-heading">
              <h2>이번 카풀은 어떠셨나요?</h2>
            </div>
            <div className="driver-profile">
              <div className="avatar large">김</div>
              <div>
                <h2>김도윤 운전자</h2>
                <p>
                  {reviewRide
                    ? `${reviewRide.date} · ${reviewRide.start} → ${reviewRide.destination}`
                    : "작성 가능한 완료 카풀이 없습니다."}
                </p>
              </div>
            </div>
            <div className="rating-picker">
              {[1, 2, 3, 4, 5].map((value) => (
                <button onClick={() => setRating(value)} key={value}>
                  <Star className={value <= rating ? "filled" : ""} />
                </button>
              ))}
            </div>
            <div className="review-keywords">
              {[
                "친절해요",
                "시간을 잘 지켜요",
                "안전하게 운전해요",
                "소통이 원활해요",
                "차량이 깨끗해요",
              ].map((keyword) => (
                <button
                  className={reviewKeywords.includes(keyword) ? "active" : ""}
                  onClick={() =>
                    setReviewKeywords((current) =>
                      current.includes(keyword)
                        ? current.filter((item) => item !== keyword)
                        : [...current, keyword],
                    )
                  }
                  key={keyword}
                >
                  {reviewKeywords.includes(keyword) && <Check />}
                  {keyword}
                </button>
              ))}
            </div>
            <label className="field">
              <span>후기 작성</span>
              <textarea
                value={reviewText}
                maxLength={300}
                onChange={(event) => setReviewText(event.target.value)}
                placeholder="안전하고 즐거웠던 카풀 경험을 알려주세요."
              />
            </label>
            <div className="character-count">
              <span>공백만 입력한 내용은 저장되지 않습니다.</span>
              <strong>{reviewText.length}/300자</strong>
            </div>
            <Button
              disabled={!reviewText.trim()}
              onClick={() => {
                if (!reviewText.trim()) return
                try {
                  if (reviewRide) {
                    addCarpoolReview(
                      reviewRide.id,
                      rating || 5,
                      reviewKeywords,
                      reviewText,
                    )
                  } else {
                    const review: DemoReview = {
                      author: "박민지 탑승자 · 작성한 후기",
                      date: new Date().toLocaleDateString("ko-KR"),
                      score: rating || 5,
                      text: reviewText.trim(),
                      tags: reviewKeywords,
                    }
                    const nextReviews = [review, ...savedReviews]
                    setSavedReviews(nextReviews)
                    writeDemoData("received-reviews", nextReviews)
                  }
                  setFlowNotice("후기 작성 완료")
                } catch (error) {
                  setFlowNotice(
                    error instanceof Error
                      ? error.message
                      : "후기를 등록할 수 없습니다.",
                  )
                }
              }}
            >
              후기 등록
            </Button>
            <Button variant="ghost" onClick={close}>
              나중에 하기
            </Button>
            {flowNotice && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <span className="dialog-icon">
                    <Check />
                  </span>
                  <h2>{flowNotice}</h2>
                  <p>브라우저에 저장된 발표용 데모 리뷰입니다.</p>
                  <Button onClick={close}>확인</Button>
                </section>
              </div>
            )}
          </div>
        )}
        {type === "reviews" && (
          <div className="sheet-content reviews-content">
            <section className="review-overview">
              <div className="review-average">
                <strong>{averageReviewScore}</strong>
                <span>
                  <Star /> 평균 별점
                </span>
                <small>후기 {allReviews.length}개</small>
              </div>
              <div className="rating-bars">
                {[
                  [5, 78],
                  [4, 18],
                  [3, 4],
                  [2, 0],
                  [1, 0],
                ].map(([score, width]) => (
                  <div key={score}>
                    <span>{score}</span>
                    <i>
                      <b style={{ width: `${width}%` }} />
                    </i>
                    <small>{width}%</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="manner-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">MANNER KEYWORDS</span>
                  <h2>이런 점이 좋았어요</h2>
                </div>
              </div>
              <div className="manner-list">
                {(role === "driver"
                  ? [
                      ["급정거 없이 안전해요", 92, 11],
                      ["약속 시간을 잘 지켜요", 84, 9],
                      ["차량이 깨끗해요", 71, 7],
                    ]
                  : [
                      ["친절하고 매너가 좋아요", 94, 12],
                      ["약속 시간을 잘 지켜요", 82, 9],
                      ["탑승 규칙을 잘 지켜요", 68, 7],
                    ]
                ).map(([label, progress, count]) => (
                  <div key={String(label)}>
                    <p>
                      <strong>{label}</strong>
                      <span>{count}명</span>
                    </p>
                    <i>
                      <b style={{ width: `${progress}%` }} />
                    </i>
                  </div>
                ))}
              </div>
            </section>

            <section className="received-reviews">
              <div className="section-heading">
                <h2>개별 후기</h2>
                <span>최신순</span>
              </div>
              {allReviews.map((reviewItem) => (
                <article key={`${reviewItem.date}-${reviewItem.score}`}>
                  <header>
                    <div className="reviewer-avatar">
                      <UserRound />
                    </div>
                    <div>
                      <strong>{reviewItem.author}</strong>
                      <span>{reviewItem.date}</span>
                    </div>
                    <b>
                      <Star /> {reviewItem.score.toFixed(1)}
                    </b>
                  </header>
                  <p>{reviewItem.text}</p>
                  <div className="review-tags">
                    {reviewItem.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}
        {type === "safety-report" && (
          <div className="sheet-content safety-form-content">
            <div className="demo-banner">
              <ShieldCheck />
              <p>
                <strong>데모 신고 접수</strong>
                현재 입력한 내용은 브라우저에만 저장되며 실제 운영진에게
                전송되지 않습니다.
              </p>
            </div>

            <section className="safety-form-section">
              <label className="field">
                <span>신고 대상 *</span>
                {demoReportTargets.length > 0 ? (
                  <select
                    value={reportTargetId}
                    onChange={(event) => {
                      setReportTargetId(event.target.value)
                      setReportErrors((current) => ({
                        ...current,
                        target: undefined,
                      }))
                    }}
                  >
                    <option value="">최근 이용 내역에서 선택</option>
                    {demoReportTargets.map((target) => (
                      <option value={target.id} key={target.id}>
                        {target.rideLabel} · {target.name} {target.role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="inline-empty">
                    신고할 수 있는 이용 내역이 없습니다.
                  </div>
                )}
              </label>
              {reportErrors.target && (
                <span className="field-error safety-error">
                  {reportErrors.target}
                </span>
              )}
            </section>

            <section className="safety-form-section">
              <div className="form-section-heading">
                <strong>신고 사유 *</strong>
                <span>한 가지 사유를 선택해 주세요.</span>
              </div>
              <div className="reason-chips">
                {[
                  "무단 노쇼 / 지각",
                  "부적절한 언행 / 불친절",
                  "위험 운전 / 교통법규 위반",
                  "과도한 기름값 / 수수료 요구",
                  "기타",
                ].map((reason) => (
                  <button
                    className={reportReason === reason ? "active" : ""}
                    onClick={() => {
                      setReportReason(reason)
                      setReportErrors((current) => ({
                        ...current,
                        reason: undefined,
                      }))
                    }}
                    key={reason}
                  >
                    {reportReason === reason && <Check />}
                    {reason}
                  </button>
                ))}
              </div>
              {reportErrors.reason && (
                <span className="field-error safety-error">
                  {reportErrors.reason}
                </span>
              )}
            </section>

            <section className="safety-form-section">
              <label className="field">
                <span>상세 내용</span>
                <textarea
                  value={reportDetails}
                  maxLength={500}
                  onChange={(event) => setReportDetails(event.target.value)}
                  placeholder="상세한 상황을 입력해 주세요."
                />
              </label>
              <div className="character-count">
                <span>상세한 상황을 입력해 주시면 확인에 도움이 됩니다.</span>
                <strong>{reportDetails.length}/500자</strong>
              </div>
            </section>

            <section className="safety-form-section">
              <div className="form-section-heading">
                <strong>증빙 사진</strong>
                <span>이미지 파일을 최대 3장까지 첨부할 수 있어요.</span>
              </div>
              <div className="evidence-grid">
                {reportImages.map((image, index) => (
                  <div
                    className="evidence-preview"
                    key={`${image.slice(-12)}-${index}`}
                  >
                    <img src={image} alt={`증빙 사진 ${index + 1}`} />
                    <button
                      onClick={() =>
                        setReportImages((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      aria-label={`${index + 1}번째 사진 삭제`}
                    >
                      <X />
                    </button>
                  </div>
                ))}
                {reportImages.length < 3 && (
                  <label className="evidence-upload">
                    <Plus />
                    <span>사진 첨부</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        void addEvidenceImages(event.target.files)
                        event.target.value = ""
                      }}
                    />
                  </label>
                )}
              </div>
              {reportErrors.images && (
                <span className="field-error safety-error">
                  {reportErrors.images}
                </span>
              )}
            </section>

            <div className="safety-submit-bar">
              {reportErrors.submit && (
                <span className="field-error safety-error">
                  {reportErrors.submit}
                </span>
              )}
              <Button onClick={submitReport}>신고 접수하기</Button>
            </div>

            {reportSubmitted && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <span className="dialog-icon">
                    <Check />
                  </span>
                  <h2>신고 접수 완료</h2>
                  <p>
                    신고가 접수되었습니다. 현재는 데모 화면이며 실제 운영진에게
                    전송되지는 않습니다.
                  </p>
                  <Button
                    onClick={() => {
                      setReportSubmitted(false)
                      setReportTargetId("")
                      setReportReason("")
                      setReportDetails("")
                      setReportImages([])
                      open("report-history")
                    }}
                  >
                    신고 처리 내역 보기
                  </Button>
                </section>
              </div>
            )}
          </div>
        )}

        {type === "blocked-users" && (
          <div className="sheet-content">
            <div className="notice-box safety-notice">
              <UsersRound />
              <p>
                <strong>데모 차단 목록</strong>
                실제 추천 제외 연동 전 단계입니다. 서버 연결 후 차단된 사용자를
                추천 및 매칭에서 제외하도록 설계합니다.
              </p>
            </div>
            {blockedUsers.length > 0 ? (
              <div className="blocked-list">
                {blockedUsers.map((user) => (
                  <article key={user.id}>
                    <div className="avatar">{user.name.slice(0, 1)}</div>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.blockedAt} 차단</span>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setUnblockCandidate(user)}
                    >
                      차단 해제
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="safety-empty">
                <UsersRound />
                <strong>차단한 사용자가 없습니다.</strong>
                <p>
                  카풀 이용 중 불편한 사용자가 있다면 안전 관리에서 차단할 수
                  있습니다.
                </p>
              </div>
            )}
            {unblockCandidate && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <span className="dialog-icon neutral">
                    <UsersRound />
                  </span>
                  <h2>차단을 해제할까요?</h2>
                  <p>
                    {unblockCandidate.name} 님의 차단을 해제하시겠습니까? 이후
                    카풀 추천에서 다시 만날 수 있습니다.
                  </p>
                  <div className="dialog-actions">
                    <Button
                      variant="ghost"
                      onClick={() => setUnblockCandidate(null)}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={() => {
                        setBlockedUsers(unblockDemoUser(unblockCandidate.id))
                        setUnblockCandidate(null)
                      }}
                    >
                      해제하기
                    </Button>
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {type === "report-history" && (
          <div className="sheet-content">
            <div className="filter-tabs">
              {(["전체", "검토 중", "처리 완료"] as const).map((filter) => (
                <button
                  className={reportFilter === filter ? "active" : ""}
                  onClick={() => setReportFilter(filter)}
                  key={filter}
                >
                  {filter}
                </button>
              ))}
            </div>
            {reports.filter(
              (report) =>
                reportFilter === "전체" || report.status === reportFilter,
            ).length > 0 ? (
              <div className="report-history-list">
                {reports
                  .filter(
                    (report) =>
                      reportFilter === "전체" || report.status === reportFilter,
                  )
                  .map((report) => {
                    const expanded = expandedReportId === report.id
                    return (
                      <article key={report.id}>
                        <button
                          className="report-summary"
                          onClick={() =>
                            setExpandedReportId(expanded ? null : report.id)
                          }
                        >
                          <span
                            className={`tag ${
                              report.status === "처리 완료" ? "open" : "waiting"
                            }`}
                          >
                            {report.status}
                          </span>
                          <div>
                            <strong>
                              {report.targetName} {report.targetRole}
                            </strong>
                            <p>{report.reason}</p>
                            <small>{report.createdAt} 접수</small>
                          </div>
                          <ChevronRight className={expanded ? "rotate" : ""} />
                        </button>
                        {expanded && (
                          <div className="report-detail">
                            <dl>
                              <div>
                                <dt>이용 내역</dt>
                                <dd>{report.rideLabel}</dd>
                              </div>
                              <div>
                                <dt>상세 내용</dt>
                                <dd>
                                  {report.details ||
                                    "작성된 상세 내용이 없습니다."}
                                </dd>
                              </div>
                              <div>
                                <dt>처리 결과</dt>
                                <dd>
                                  {report.response ||
                                    "아직 처리 결과가 등록되지 않았습니다."}
                                </dd>
                              </div>
                            </dl>
                            {report.images.length > 0 && (
                              <div className="report-images">
                                {report.images.map((image, index) => (
                                  <img
                                    src={image}
                                    alt={`첨부 증빙 ${index + 1}`}
                                    key={`${report.id}-${index}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    )
                  })}
              </div>
            ) : (
              <div className="safety-empty">
                <CreditCard />
                <strong>접수된 신고 내역이 없습니다.</strong>
                <p>신고를 접수하면 이곳에서 진행 상태를 확인할 수 있습니다.</p>
              </div>
            )}
          </div>
        )}

        {type === "privacy" && (
          <div className="sheet-content">
            <div className="privacy-hero">
              <ShieldCheck />
              <p>
                신구길은 이용자의 개인정보를 안전하게 보호하는 것을 중요하게
                생각합니다.
              </p>
            </div>
            <div className="privacy-card-list">
              <article>
                <CreditCard />
                <div>
                  <h3>안심번호 서비스</h3>
                  <p>
                    실제 전화번호를 직접 공개하지 않는 방식으로 연락할 수 있도록
                    설계합니다. 현재 안심번호 기능의 실제 연결 여부는 서비스
                    제공 상태에 따라 달라질 수 있습니다.
                  </p>
                </div>
              </article>
              <article>
                <MapPin />
                <div>
                  <h3>위치 정보 최소화</h3>
                  <p>
                    카풀 이용에 필요한 위치 정보만 최소한으로 사용하도록
                    설계합니다. 실제 수집·이용·보관 및 삭제 정책은 서비스 구현과
                    개인정보 처리방침에 따라 안내해야 합니다.
                  </p>
                </div>
              </article>
              <article>
                <ShieldCheck />
                <div>
                  <h3>대학 구성원 인증</h3>
                  <p>
                    학교 구성원 확인을 통해 안전한 환경을 만드는 것이
                    목표입니다. 실제 인증이 연결되기 전에는 인증 완료를 보장하지
                    않습니다.
                  </p>
                </div>
              </article>
            </div>
            <Button onClick={() => open("privacy-policy")}>
              개인정보 처리방침 전문 보기
            </Button>
          </div>
        )}

        {type === "privacy-policy" && (
          <div className="sheet-content">
            <div className="safety-empty policy-empty">
              <ShieldCheck />
              <strong>개인정보 처리방침을 준비 중입니다.</strong>
              <p>
                실제 서비스 정책과 데이터 처리 기준이 확정되면 이 화면에서
                안내할 예정입니다. 현재 내용은 법적 정책이나 실제 운영 방침을
                의미하지 않습니다.
              </p>
            </div>
          </div>
        )}

        {type === "safety" && (
          <div className="sheet-content">
            <div className="safety-hero">
              <ShieldCheck />
              <h2>안전한 카풀을 함께 만들어요</h2>
              <p>긴급 상황에는 앱보다 112 또는 119에 먼저 연락해 주세요.</p>
            </div>
            <nav className="menu-list">
              <button onClick={() => open("safety-report")}>
                <Flag />
                <span>사용자 신고하기</span>
                <ChevronRight />
              </button>
              <button onClick={() => open("blocked-users")}>
                <UsersRound />
                <span>차단 사용자 관리</span>
                <ChevronRight />
              </button>
              <button onClick={() => open("report-history")}>
                <CircleHelp />
                <span>신고 처리 내역</span>
                <ChevronRight />
              </button>
              <button onClick={() => open("privacy")}>
                <ShieldCheck />
                <span>개인정보 보호 안내</span>
                <ChevronRight />
              </button>
            </nav>
          </div>
        )}
        {type === "roles" && (
          <div className="sheet-content role-sheet">
            <p>
              역할을 바꿔도 포인트, 마일리지, 채팅, 일정과 이용 내역은
              유지됩니다.
            </p>
            <div className="role-switcher role-switcher--sheet">
              {(["rider", "driver"] as Role[]).map((item) => (
                <button
                  className={role === item ? "active" : ""}
                  onClick={() => onSelectRole(item)}
                  key={item}
                >
                  {item === "driver" ? <CarFront /> : <UsersRound />}
                  <span>
                    <strong>{item === "driver" ? "운전자" : "탑승자"}</strong>
                    <small>
                      {role === item
                        ? "현재 역할"
                        : registrations[item]
                          ? "등록 완료 · 바로 변경"
                          : "최초 등록 필요"}
                    </small>
                  </span>
                  {role === item ? <Check /> : <ChevronRight />}
                </button>
              ))}
            </div>
            <div className="notice-box">
              <ShieldCheck />
              <p>
                <strong>역할별 정보는 따로 보관돼요</strong>한 역할의 기본
                경로를 수정해도 다른 역할의 경로는 변경되지 않습니다.
              </p>
            </div>
          </div>
        )}
        {(type === "driver-register" || type === "rider-register") && (
          <div className="sheet-content registration-content">
            <RoleRegistration
              role={type === "driver-register" ? "driver" : "rider"}
              onComplete={onCompleteRole}
            />
          </div>
        )}
        {type === "notification-settings" && (
          <div className="sheet-content settings-subpage">
            <p className="settings-intro">
              받고 싶은 알림을 직접 설정할 수 있어요.
            </p>
            <div className="settings-card-list">
              <article>
                <div>
                  <strong>전체 알림</strong>
                  <span>모든 서비스 알림을 켜거나 끕니다.</span>
                </div>
                <Toggle
                  checked={notificationsEnabled}
                  label="전체 알림"
                  onChange={toggleAllNotifications}
                />
              </article>
              {!notificationsEnabled && (
                <div className="settings-warning">
                  <Bell />
                  전체 알림이 꺼져 있어 모든 알림이 비활성화됩니다.
                </div>
              )}
              {([
                [
                  "matching",
                  "카풀 매칭 알림",
                  "새로운 카풀 추천 및 매칭 관련 알림입니다.",
                ],
                [
                  "trip",
                  "출발/도착 안내",
                  "카풀 출발 시간과 탑승·도착 관련 안내입니다.",
                ],
                ["chat", "채팅 알림", "새로운 채팅 메시지를 알려줍니다."],
                [
                  "marketing",
                  "마케팅 알림",
                  "이벤트, 혜택 및 프로모션 관련 알림입니다.",
                ],
              ] as const).map(([key, title, description]) => (
                <article
                  className={!notificationsEnabled ? "disabled" : ""}
                  key={key}
                >
                  <div>
                    <strong>{title}</strong>
                    <span>{description}</span>
                  </div>
                  <Toggle
                    checked={notificationsEnabled && notificationSettings[key]}
                    disabled={!notificationsEnabled}
                    label={title}
                    onChange={() => toggleNotification(key)}
                  />
                </article>
              ))}
            </div>
            <div className="demo-banner settings-demo-note">
              <CircleHelp />
              <p>
                <strong>프론트엔드 데모 설정</strong>
                실제 운영체제 푸시 알림을 등록하거나 발송하지 않습니다.
              </p>
            </div>
          </div>
        )}

        {type === "security-settings" && (
          <div className="sheet-content settings-subpage">
            <p className="settings-intro">
              계정과 개인정보를 안전하게 관리하세요.
            </p>
            <section className="verification-card">
              <span className="settings-leading-icon">
                <ShieldCheck />
              </span>
              <div>
                <span className="tag waiting">데모 확인</span>
                <h3>신구대 학적 인증</h3>
                <p>
                  학교 이메일 형식만 확인된 데모 상태이며 실제 학적 인증은
                  연결되지 않았습니다.
                </p>
                <Button
                  variant="soft"
                  onClick={() => setSettingsDialog("school")}
                >
                  인증 안내
                </Button>
              </div>
            </section>

            <div className="security-list">
              <button onClick={() => setSettingsDialog("password")}>
                <span>
                  <strong>비밀번호 변경</strong>
                  <small>계정 비밀번호를 변경합니다.</small>
                </span>
                <ChevronRight />
              </button>
              <div>
                <span>
                  <strong>생체인증 로그인</strong>
                  <small>지원되는 기기에서 생체인증으로 로그인합니다.</small>
                </span>
                <Toggle
                  checked={biometricEnabled}
                  label="생체인증 로그인"
                  onChange={() => {
                    if (biometricEnabled) {
                      setBiometricEnabled(false)
                      saveBiometricDemoState(false)
                    } else {
                      setSettingsDialog("biometric")
                    }
                  }}
                />
              </div>
              <button onClick={() => setSettingsDialog("devices")}>
                <span>
                  <strong>로그인된 기기</strong>
                  <small>현재 계정의 데모 로그인 기기를 관리합니다.</small>
                </span>
                <ChevronRight />
              </button>
            </div>

            <section className="danger-zone">
              <strong>회원 탈퇴</strong>
              <p>계정 이용을 중단하고 싶다면 회원 탈퇴를 진행할 수 있습니다.</p>
              <button onClick={() => setSettingsDialog("withdraw-1")}>
                회원 탈퇴
              </button>
            </section>

            {settingsDialog === "school" && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <span className="dialog-icon neutral">
                    <ShieldCheck />
                  </span>
                  <h2>학교 이메일 인증</h2>
                  <p>실제 이메일 인증은 서버 연결 후 이용할 수 있습니다.</p>
                  <Button onClick={() => setSettingsDialog(null)}>확인</Button>
                </section>
              </div>
            )}
            {settingsDialog === "password" && (
              <div className="dialog-backdrop">
                <section className="app-dialog password-dialog">
                  <h2>비밀번호 변경</h2>
                  <div className="form-stack">
                    <Field
                      label="현재 비밀번호"
                      type="password"
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                    />
                    {passwordErrors.current && (
                      <span className="field-error">
                        {passwordErrors.current}
                      </span>
                    )}
                    <Field
                      label="새 비밀번호"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                    {passwordErrors.new && (
                      <span className="field-error">{passwordErrors.new}</span>
                    )}
                    <Field
                      label="새 비밀번호 확인"
                      type="password"
                      value={newPasswordConfirm}
                      onChange={(event) =>
                        setNewPasswordConfirm(event.target.value)
                      }
                    />
                    {passwordErrors.confirm && (
                      <span className="field-error">
                        {passwordErrors.confirm}
                      </span>
                    )}
                  </div>
                  <div className="dialog-actions">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSettingsDialog(null)
                        setPasswordErrors({})
                      }}
                    >
                      취소
                    </Button>
                    <Button onClick={validatePasswordDemo}>변경하기</Button>
                  </div>
                </section>
              </div>
            )}
            {settingsDialog === "password-note" && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <span className="dialog-icon neutral">
                    <CircleHelp />
                  </span>
                  <h2>서버 연결이 필요해요</h2>
                  <p>
                    비밀번호 변경 기능은 서버 연결 후 이용할 수 있습니다. 입력한
                    비밀번호는 저장되지 않습니다.
                  </p>
                  <Button
                    onClick={() => {
                      setSettingsDialog(null)
                      setCurrentPassword("")
                      setNewPassword("")
                      setNewPasswordConfirm("")
                      setPasswordErrors({})
                    }}
                  >
                    확인
                  </Button>
                </section>
              </div>
            )}
            {settingsDialog === "biometric" && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <span className="dialog-icon neutral">
                    <ShieldCheck />
                  </span>
                  <h2>생체인증 로그인</h2>
                  <p>
                    현재 데모 화면에서는 생체인증을 실제로 수행하지 않습니다.
                    설정 상태만 변경할 수 있습니다.
                  </p>
                  <div className="dialog-actions">
                    <Button
                      variant="ghost"
                      onClick={() => setSettingsDialog(null)}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={() => {
                        setBiometricEnabled(true)
                        saveBiometricDemoState(true)
                        setSettingsDialog(null)
                      }}
                    >
                      데모로 켜기
                    </Button>
                  </div>
                </section>
              </div>
            )}
            {settingsDialog === "devices" && (
              <div className="dialog-backdrop">
                <section className="app-dialog device-dialog">
                  <h2>로그인된 기기</h2>
                  <p>실제 접속 기록이 아닌 예시 기기 목록입니다.</p>
                  <div className="device-list">
                    {devices.map((device) => (
                      <article key={device.id}>
                        <div>
                          <strong>{device.name}</strong>
                          {device.current && (
                            <span className="tag open">현재 기기</span>
                          )}
                        </div>
                        <p>{device.type}</p>
                        <small>{device.lastActive}</small>
                        <Button
                          variant="ghost"
                          disabled={device.current}
                          onClick={() => {
                            setSelectedDevice(device)
                            setSettingsDialog("device-logout")
                          }}
                        >
                          {device.current ? "로그아웃 불가" : "로그아웃"}
                        </Button>
                      </article>
                    ))}
                    {devices.filter((device) => !device.current).length ===
                      0 && (
                      <div className="inline-empty">
                        관리 중인 다른 기기가 없습니다.
                      </div>
                    )}
                  </div>
                  <Button
                    variant="soft"
                    onClick={() => setSettingsDialog(null)}
                  >
                    확인
                  </Button>
                </section>
              </div>
            )}
            {settingsDialog === "device-logout" && selectedDevice && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <h2>다른 기기에서 로그아웃</h2>
                  <p>
                    {selectedDevice.name}을 데모 기기 목록에서 제거할까요? 실제
                    세션은 종료되지 않습니다.
                  </p>
                  <div className="dialog-actions">
                    <Button
                      variant="ghost"
                      onClick={() => setSettingsDialog("devices")}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={() => {
                        setDevices(removeDemoDevice(selectedDevice.id))
                        setSelectedDevice(null)
                        setSettingsDialog("devices")
                      }}
                    >
                      로그아웃
                    </Button>
                  </div>
                </section>
              </div>
            )}
            {settingsDialog === "withdraw-1" && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <h2>회원 탈퇴</h2>
                  <p>
                    회원 탈퇴 시 계정과 카풀 이용에 영향을 줄 수 있습니다. 정말
                    탈퇴를 진행하시겠어요?
                  </p>
                  <div className="dialog-actions">
                    <Button
                      variant="ghost"
                      onClick={() => setSettingsDialog(null)}
                    >
                      취소
                    </Button>
                    <Button onClick={() => setSettingsDialog("withdraw-2")}>
                      다음
                    </Button>
                  </div>
                </section>
              </div>
            )}
            {settingsDialog === "withdraw-2" && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <h2>탈퇴 최종 확인</h2>
                  <p>
                    현재 데모 화면에서는 실제 계정 삭제가 진행되지 않습니다.
                  </p>
                  <label className="confirm-check">
                    <input
                      type="checkbox"
                      checked={withdrawConfirmed}
                      onChange={(event) =>
                        setWithdrawConfirmed(event.target.checked)
                      }
                    />
                    안내 내용을 확인했습니다.
                  </label>
                  <div className="dialog-actions">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSettingsDialog(null)
                        setWithdrawConfirmed(false)
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      disabled={!withdrawConfirmed}
                      onClick={() => setSettingsDialog("withdraw-note")}
                    >
                      확인
                    </Button>
                  </div>
                </section>
              </div>
            )}
            {settingsDialog === "withdraw-note" && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <span className="dialog-icon neutral">
                    <CircleHelp />
                  </span>
                  <h2>서버 연결이 필요해요</h2>
                  <p>회원 탈퇴 기능은 서버 연결 후 이용할 수 있습니다.</p>
                  <Button
                    onClick={() => {
                      setSettingsDialog(null)
                      setWithdrawConfirmed(false)
                    }}
                  >
                    확인
                  </Button>
                </section>
              </div>
            )}
          </div>
        )}

        {type === "service-guide" && (
          <div className="sheet-content settings-subpage">
            <p className="settings-intro">
              신구길을 더 편리하고 안전하게 이용하는 방법을 확인하세요.
            </p>
            <div className="guide-card-list">
              <button onClick={() => open("passenger-guide")}>
                <span className="settings-leading-icon">
                  <UsersRound />
                </span>
                <span>
                  <strong>탑승자 이용 가이드</strong>
                  <small>카풀을 신청하고 안전하게 탑승하는 방법</small>
                </span>
                <ChevronRight />
              </button>
              <button onClick={() => open("driver-guide")}>
                <span className="settings-leading-icon green">
                  <CarFront />
                </span>
                <span>
                  <strong>운전자 이용 가이드</strong>
                  <small>카풀 등록부터 운행 완료까지</small>
                </span>
                <ChevronRight />
              </button>
            </div>
            <section className="faq-section">
              <div className="section-heading">
                <h2>자주 묻는 질문</h2>
              </div>
              <div className="faq-list">
                {serviceFaqs.map((faq) => {
                  const expanded = openFaqs.includes(faq.id)
                  return (
                    <article key={faq.id}>
                      <button
                        onClick={() =>
                          setOpenFaqs((current) => {
                            const next = expanded
                              ? current.filter((id) => id !== faq.id)
                              : [...current, faq.id]
                            writeDemoData("open-faqs", next)
                            return next
                          })
                        }
                        aria-expanded={expanded}
                      >
                        <strong>{faq.question}</strong>
                        <ChevronRight className={expanded ? "rotate" : ""} />
                      </button>
                      {expanded && <p>{faq.answer}</p>}
                    </article>
                  )
                })}
              </div>
            </section>
            <Button
              className="contact-button"
              onClick={() => open("contact-support")}
            >
              <MessageCircle /> 1:1 문의하기
            </Button>
            <div className="app-version">
              <div>
                <strong>신구길 SHINGU-GIL</strong>
                <span>현재 개발용 데모 버전입니다.</span>
              </div>
              <p>
                앱 버전 <strong>{APP_VERSION}</strong>
              </p>
            </div>
          </div>
        )}

        {(type === "passenger-guide" || type === "driver-guide") && (
          <div className="sheet-content guide-detail">
            <div className="guide-hero">
              {type === "passenger-guide" ? <UsersRound /> : <CarFront />}
              <div>
                <span className="eyebrow">
                  {type === "passenger-guide" ? "PASSENGER" : "DRIVER"}
                </span>
                <h2>
                  {type === "passenger-guide"
                    ? "안전하게 카풀 이용하기"
                    : "안전하게 카풀 운행하기"}
                </h2>
              </div>
            </div>
            <ol className="guide-steps">
              {(type === "passenger-guide"
                ? [
                    "출발지와 도착지, 희망 시간을 정확하게 설정합니다.",
                    "추천 카풀에서 경로와 출발 시간을 확인합니다.",
                    "운전자 정보와 카풀 조건을 확인한 후 신청합니다.",
                    "신청 상태가 승인으로 변경되었는지 확인합니다.",
                    "채팅으로 탑승 위치와 시간을 확인합니다.",
                    "약속된 장소에서 안전하게 탑승합니다.",
                    "이용 완료 후 운전자 평가를 작성할 수 있습니다.",
                  ]
                : [
                    "운전자 프로필과 차량 정보를 정확하게 입력합니다.",
                    "실제 운행 가능한 경로, 시간과 좌석 수를 등록합니다.",
                    "탑승 신청자의 경로와 신청 정보를 확인합니다.",
                    "신청을 승인하거나 거절합니다.",
                    "채팅으로 탑승 장소와 시간을 확인합니다.",
                    "출발 전 탑승자와 차량 정보를 다시 확인합니다.",
                    "운행이 끝나면 이용 상태를 완료 처리합니다.",
                    "이용 내역과 마일리지를 확인합니다.",
                  ]
              ).map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
            <section className="guide-safety">
              <ShieldCheck />
              <div>
                <h3>안전 수칙</h3>
                <ul>
                  {(type === "passenger-guide"
                    ? [
                        "차량 번호와 탑승 장소를 미리 확인합니다.",
                        "운전자와 합의한 장소에서 탑승합니다.",
                        "위험한 상황에는 이용을 중단하고 신고 기능을 이용합니다.",
                        "비밀번호와 인증번호를 채팅으로 공유하지 않습니다.",
                      ]
                    : [
                        "실제 차량 정보와 운행 조건만 등록합니다.",
                        "안전 운전을 최우선으로 합니다.",
                        "사전 안내한 경로와 비용 조건을 준수합니다.",
                        "위험하거나 불쾌감을 주는 행동을 하지 않습니다.",
                      ]
                  ).map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            </section>
            <Button onClick={() => open("service-guide")}>확인</Button>
          </div>
        )}

        {type === "contact-support" && (
          <div className="sheet-content contact-form">
            <div className="demo-banner">
              <CircleHelp />
              <p>
                <strong>데모 문의 작성</strong>
                비밀번호나 인증번호 등 민감한 정보는 입력하지 마세요. 실제
                운영팀으로 전송되지 않습니다.
              </p>
            </div>
            <label className="field">
              <span>문의 유형 *</span>
              <select
                value={inquiryCategory}
                onChange={(event) => {
                  setInquiryCategory(event.target.value)
                  setInquiryErrors((current) => ({
                    ...current,
                    category: "",
                  }))
                }}
              >
                <option value="">문의 유형 선택</option>
                {[
                  "카풀 이용",
                  "신청 및 취소",
                  "결제 및 마일리지",
                  "채팅 및 알림",
                  "계정 및 개인정보",
                  "기타",
                ].map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            {inquiryErrors.category && (
              <span className="field-error">{inquiryErrors.category}</span>
            )}
            <Field
              label="문의 제목 *"
              value={inquiryTitle}
              maxLength={50}
              onChange={(event) => {
                setInquiryTitle(event.target.value)
                setInquiryErrors((current) => ({ ...current, title: "" }))
              }}
              placeholder="문의 제목을 입력하세요"
            />
            <div className="contact-count">{inquiryTitle.length}/50자</div>
            {inquiryErrors.title && (
              <span className="field-error">{inquiryErrors.title}</span>
            )}
            <label className="field">
              <span>문의 내용 *</span>
              <textarea
                value={inquiryContent}
                maxLength={1000}
                onChange={(event) => {
                  setInquiryContent(event.target.value)
                  setInquiryErrors((current) => ({
                    ...current,
                    content: "",
                  }))
                }}
                placeholder="문의 내용을 자세히 입력해 주세요."
              />
            </label>
            <div className="contact-count">{inquiryContent.length}/1,000자</div>
            {inquiryErrors.content && (
              <span className="field-error">{inquiryErrors.content}</span>
            )}
            <div className="dialog-actions contact-actions">
              <Button variant="ghost" onClick={() => open("service-guide")}>
                취소
              </Button>
              <Button onClick={submitInquiry}>문의 등록</Button>
            </div>
            {settingsDialog === "inquiry-success" && (
              <div className="dialog-backdrop">
                <section className="app-dialog">
                  <span className="dialog-icon">
                    <Check />
                  </span>
                  <h2>문의 등록 완료</h2>
                  <p>
                    문의 내용이 등록되었습니다. 현재 데모에서는 실제 운영팀으로
                    전달되지 않습니다.
                  </p>
                  <Button
                    onClick={() => {
                      setSettingsDialog(null)
                      setInquiryCategory("")
                      setInquiryTitle("")
                      setInquiryContent("")
                      setInquiryErrors({})
                      open("service-guide")
                    }}
                  >
                    확인
                  </Button>
                </section>
              </div>
            )}
          </div>
        )}

        {type === "settings" && (
          <div className="sheet-content">
            <nav className="menu-list settings-list">
              <button onClick={() => open("notification-settings")}>
                <Bell />
                <span>알림 설정</span>
                <ChevronRight />
              </button>
              <button onClick={() => open("security-settings")}>
                <ShieldCheck />
                <span>개인정보 및 보안</span>
                <ChevronRight />
              </button>
              <button onClick={() => open("service-guide")}>
                <CircleHelp />
                <span>서비스 이용 안내</span>
                <ChevronRight />
              </button>
            </nav>
          </div>
        )}
      </section>
    </div>
  )
}

export default function App() {
  const tripFlow = useSyncExternalStore(
    subscribeTripFlow,
    getTripFlowSnapshot,
    getTripFlowSnapshot,
  )
  const pointWallet = useSyncExternalStore(
    subscribeDemoPointWallet,
    getDemoPointWallet,
    getDemoPointWallet,
  )
  const carpoolFlow = useSyncExternalStore(
    subscribeCarpoolFlow,
    getCarpoolFlowSnapshot,
    getCarpoolFlowSnapshot,
  )
  const [splash, setSplash] = useState(true)
  const [auth, setAuth] = useState<AuthView>("login")
  const [loggedIn, setLoggedIn] = useState(
    () => readDemoValue("demo-login") === "true",
  )
  const [role, setRole] = useState<Role>(
    () => readDemoValue("demo-role") as Role || "rider",
  )
  const [registrations, setRegistrations] = useState<RoleRegistrations>(() => {
    const saved = readDemoValue("role-registrations")
    const currentRole = readDemoValue("demo-role") as Role | null || "rider"
    if (saved) {
      try {
        return normalizeRegistrations(JSON.parse(saved), currentRole)
      } catch {
        removeDemoData("role-registrations")
      }
    }
    return normalizeRegistrations(null, currentRole)
  })
  const safeRegistrations = normalizeRegistrations(registrations, role)
  const [routesByRole, setRoutesByRole] = useState<Record<Role, RouteData>>(
    () => readDemoData("routes", defaultRoutes),
  )
  const [account, setAccount] = useState<AccountData>(() =>
    readDemoData("account", defaultAccount),
  )
  const mileageBalance = useMemo(
    () => getDemoMileageBalance(account.id, role),
    [account.id, role],
  )
  const [selectedBadges, setSelectedBadges] = useState<Record<Role, string[]>>(
    () => readDemoData("selected-badges", defaultSelectedBadges),
  )
  const [tab, setTab] = useState<Tab>("home")
  const [sheet, setSheet] = useState<Sheet>(null)
  const [chatTargetRideId, setChatTargetRideId] = useState<string | null>(null)
  const [selectedRide, setSelectedRide] = useState<MatchRide | null>(null)
  const [activeCarpoolEvent, setActiveCarpoolEvent] =
    useState<DemoCarpoolEvent | null>(null)

  useEffect(() => {
    const splashTimer = window.setTimeout(() => setSplash(false), 3000)
    return () => window.clearTimeout(splashTimer)
  }, [])

  useEffect(() => {
    if (activeCarpoolEvent) return
    const seenEventIds = readDemoList<string>(`carpool-events-seen-${role}`)
    const nextEvent = carpoolFlow.events.find(
      (event) => !seenEventIds.includes(event.id),
    )
    if (nextEvent) setActiveCarpoolEvent(nextEvent)
  }, [activeCarpoolEvent, carpoolFlow.events, role])

  const activateRole = (next: Role, confirmSchedule = true) => {
    if (next === role) {
      setSheet(null)
      return
    }
    if (
      confirmSchedule &&
      !window.confirm(
        "진행 중인 일정과 결제 내역은 그대로 유지됩니다. 역할을 변경할까요?",
      )
    )
      return
    setRole(next)
    writeDemoValue("demo-role", next)
    setTab("home")
    setSheet(null)
  }

  const requestRole = (next: Role) => {
    if (next === role) {
      setSheet(null)
      return
    }
    if (!safeRegistrations[next]) {
      setSheet(next === "driver" ? "driver-register" : "rider-register")
      return
    }
    activateRole(next)
  }

  const completeRoleRegistration = (next: Role) => {
    const updated = { ...safeRegistrations, [next]: true }
    setRegistrations(updated)
    writeDemoData("role-registrations", updated)
    activateRole(next, false)
  }

  const page = useMemo(() => {
    if (tab === "schedule")
      return (
        <SchedulePage role={role} open={setSheet} carpoolFlow={carpoolFlow} />
      )
    if (tab === "chat")
      return (
        <ChatPage
          carpoolFlow={carpoolFlow}
          initialRideId={chatTargetRideId}
          onInitialRideConsumed={() => setChatTargetRideId(null)}
        />
      )
    if (tab === "profile")
      return (
        <ProfilePage
          role={role}
          registrations={safeRegistrations}
          changeRole={requestRole}
          route={routesByRole[role]}
          account={account}
          selectedBadges={selectedBadges}
          open={setSheet}
          logout={() => {
            removeDemoData("demo-login")
            setLoggedIn(false)
            setTab("home")
          }}
          pointBalance={pointWallet.balance}
          mileageBalance={mileageBalance}
          carpoolFlow={carpoolFlow}
        />
      )
    return role === "driver" ? (
      <DriverHome
        open={setSheet}
        route={routesByRole.driver}
        tripFlow={tripFlow}
        onStartTrip={startDemoTrip}
        onEndTrip={endDemoTrip}
        onResetTrip={resetDemoTrip}
        carpoolFlow={carpoolFlow}
        mileageBalance={mileageBalance}
        onOpenChat={(rideId) => {
          setChatTargetRideId(rideId)
          setTab("chat")
        }}
      />
    ) : (
      <RiderHome
        open={setSheet}
        route={routesByRole.rider}
        tripFlow={tripFlow}
        carpoolFlow={carpoolFlow}
        onOpenChat={(rideId) => {
          setChatTargetRideId(rideId)
          setTab("chat")
        }}
        onSelectRide={(ride) => {
          setSelectedRide(ride)
          setSheet("ride")
        }}
      />
    )
  }, [
    tab,
    role,
    routesByRole,
    account,
    selectedBadges,
    tripFlow,
    pointWallet.balance,
    mileageBalance,
    carpoolFlow,
    chatTargetRideId,
    selectedRide,
    safeRegistrations.rider,
    safeRegistrations.driver,
  ])

  if (splash)
    return (
      <main className="splash">
        <div className="splash-brand-card">
          <Brand transparent />
        </div>
        <div className="splash-progress" aria-label="앱을 불러오는 중">
          <i />
        </div>
        <p>로딩 중...</p>
      </main>
    )
  if (!loggedIn)
    return (
      <div className="app-shell auth-shell">
        <Auth
          view={auth}
          setView={setAuth}
          onLogin={(nextRole) => {
            setRole(nextRole)
            setLoggedIn(true)
            writeDemoValue("demo-login", "true")
            writeDemoValue("demo-role", nextRole)
            const updated = {
              ...safeRegistrations,
              [nextRole]: true,
            }
            setRegistrations(updated)
            writeDemoData("role-registrations", updated)
          }}
        />
      </div>
    )

  return (
    <div className="app-shell">
      {tab !== "chat" && (
        <Header
          role={role}
          onRole={() => setSheet("roles")}
          onBell={() => setSheet("notifications")}
        />
      )}
      <main className="app-content">{page}</main>
      {role === "rider" &&
        tab !== "home" &&
        tripFlow.status === "결제 대기" &&
        tripFlow.approvedPassengerIds.includes("demo-rider") && (
          <button
            className="payment-global-banner"
            onClick={() => {
              setTab("home")
              setSheet("carpool-payment")
            }}
          >
            <WalletCards />
            <span>
              <strong>카풀 결제 요청</strong>
              <small>{tripFlow.amount.toLocaleString()} P · 결제 대기</small>
            </span>
            <ChevronRight />
          </button>
        )}
      <BottomNav tab={tab} setTab={setTab} />
      {sheet && (
        <SheetView
          type={sheet}
          close={() => setSheet(null)}
          open={setSheet}
          role={role}
          route={routesByRole[role]}
          account={account}
          selectedBadges={selectedBadges}
          tripFlow={tripFlow}
          pointWallet={pointWallet}
          mileageBalance={mileageBalance}
          carpoolFlow={carpoolFlow}
          selectedRide={selectedRide}
          registrations={safeRegistrations}
          onSelectRole={requestRole}
          onCompleteRole={completeRoleRegistration}
          onSaveRoute={(nextRoute) => {
            const updated = { ...routesByRole, [role]: nextRoute }
            setRoutesByRole(updated)
            writeDemoData("routes", updated)
          }}
          onSaveAccount={(nextAccount) => {
            setAccount(nextAccount)
            writeDemoData("account", nextAccount)
          }}
          onSaveBadges={(badgeRole, badgeIds) => {
            const updated = { ...selectedBadges, [badgeRole]: badgeIds }
            setSelectedBadges(updated)
            writeDemoData("selected-badges", updated)
          }}
          onCompletePayment={completeDemoPayment}
          onGoHome={() => {
            setSheet(null)
            setTab("home")
          }}
        />
      )}
      {activeCarpoolEvent && (
        <div className="dialog-backdrop flow-dialog-backdrop">
          <section className="app-dialog" role="alertdialog" aria-modal="true">
            <span className="dialog-icon neutral">
              {activeCarpoolEvent.type === "reservation-cancelled" ? (
                <CalendarDays />
              ) : (
                <UsersRound />
              )}
            </span>
            <h2>{activeCarpoolEvent.title}</h2>
            <p>{activeCarpoolEvent.message}</p>
            <Button
              onClick={() => {
                const key = `carpool-events-seen-${role}`
                const seenEventIds = readDemoList<string>(key)
                writeDemoData(key, [
                  ...new Set([...seenEventIds, activeCarpoolEvent.id]),
                ])
                setActiveCarpoolEvent(null)
              }}
            >
              확인
            </Button>
          </section>
        </div>
      )}
    </div>
  )
}
