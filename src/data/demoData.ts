import type {
  AccountData,
  ChatRoomData,
  DemoReview,
  Ride,
  Role,
  RouteData,
  ScheduleItem,
  SafetyReport,
  BlockedUser,
  ReportTarget,
  HistoryEntry,
  ProfileBadge,
  NotificationSettings,
  DemoDevice,
  FaqItem,
} from "../types/domain"

export const defaultAccount: AccountData = {
  name: "박민지",
  id: "shingu24",
  email: "shingu24@shingu.ac.kr",
  phone: "010-1234-5678",
  gender: "선택 안 함",
}

export const defaultRoutes: Record<Role, RouteData> = {
  rider: {
    start: "모란역 5번 출구",
    destination: "신구대학교 정문",
    waypoint: "태평역",
    pickup: "모란역 공공 승차 구역",
    weekdays: ["월", "화", "수", "목", "금"],
    departureTime: "08:10",
    preferredArrival: "09:00",
    smokingPreference: "비흡연자 선호",
    genderPreference: "성별 무관",
  },
  driver: {
    start: "모란역 5번 출구",
    destination: "신구대학교 정문",
    waypoint: "태평역, 성남시청",
    pickup: "모란역 5번 출구",
    weekdays: ["월", "수", "금"],
    departureTime: "08:10",
    preferredArrival: "09:00",
    smokingPreference: "비흡연자 선호",
    genderPreference: "성별 무관",
  },
}

export const demoRides: Ride[] = [
  {
    id: 1,
    name: "김도윤",
    car: "현대 아반떼 · 흰색",
    start: "모란역 5번 출구",
    end: "신구대학교 정문",
    via: "태평역 · 성남시청",
    time: "오전 8:10",
    estimatedDuration: 28,
    arrivalTime: "08:38",
    seats: 2,
    price: 2800,
    match: 94,
    rating: 4.9,
    reviews: 24,
  },
  {
    id: 2,
    name: "이서준",
    car: "기아 셀토스 · 회색",
    start: "야탑역 환승주차장",
    end: "신구대학교 서관",
    via: "모란역 · 수진역",
    time: "오전 8:25",
    estimatedDuration: 30,
    arrivalTime: "08:55",
    seats: 1,
    price: 3200,
    match: 87,
    rating: 4.8,
    reviews: 17,
  },
]

export const demoWeek = [
  ["월", "17"],
  ["화", "18"],
  ["수", "19"],
  ["목", "20"],
  ["금", "21"],
] as const

export const demoChatRooms: ChatRoomData[] = [
  {
    id: "ride-0520",
    title: "모란역 → 신구대학교",
    members: "김도윤 · 박서연",
    preview: "내일 오전 8시 10분에 만나요.",
    time: "오후 7:24",
    meeting: "5월 20일 (화) 오전 8:10 · 모란역 5번 출구",
  },
  {
    id: "ride-0521",
    title: "신구대학교 → 야탑역",
    members: "이서준 외 1명",
    preview: "탑승 장소가 서관 앞으로 변경됐어요.",
    time: "어제",
    meeting: "5월 21일 (수) 오후 4:30 · 신구대학교 서관",
  },
]

export const demoReceivedReviews: DemoReview[] = [
  {
    author: "익명 탑승자",
    date: "2026.09.28 탑승",
    score: 5,
    text: "시간에 맞춰 도착해 주시고 운전도 편안해서 안심하고 학교까지 이동했어요.",
    tags: ["안전 운전", "시간 약속"],
  },
  {
    author: "익명 사용자",
    date: "2026.09.21 탑승",
    score: 4.5,
    text: "약속 장소에 미리 나와 계시고 매너가 좋아 즐거운 카풀이었습니다.",
    tags: ["좋은 매너", "시간 약속"],
  },
  {
    author: "익명 사용자",
    date: "2026.09.12 탑승",
    score: 4.7,
    text: "채팅 응답이 빠르고 서로 배려하며 편하게 이동할 수 있었어요.",
    tags: ["빠른 응답", "배려"],
  },
]

export const demoScheduleByDate: Record<string, ScheduleItem[]> = {
  "2025-05-18": [
    {
      id: "schedule-0518",
      time: "09:00",
      status: "운행 완료",
      tone: "open",
      title: "야탑역 → 신구대학교",
      location: "야탑역 환승주차장",
      driverDetail: "3명 탑승 · 결제 완료",
      riderDetail: "이서준 운전자 · 결제 완료",
    },
  ],
  "2025-05-20": [
    {
      id: "schedule-0520-am",
      time: "08:10",
      status: "탑승 확정",
      tone: "open",
      title: "모란역 → 신구대학교",
      location: "모란역 5번 출구",
      driverDetail: "2/3명 탑승 확정",
      riderDetail: "김도윤 운전자 · 흰색 아반떼",
    },
    {
      id: "schedule-0520-pm",
      time: "16:30",
      status: "모집 중",
      tone: "waiting",
      title: "신구대학교 → 야탑역",
      location: "신구대학교 서관",
      driverDetail: "1/3명 모집",
      riderDetail: "신청 승인 대기",
    },
  ],
  "2025-05-21": [
    {
      id: "schedule-0521",
      time: "08:15",
      status: "승인 대기",
      tone: "waiting",
      title: "태평역 → 신구대학교",
      location: "태평역 2번 출구",
      driverDetail: "신규 신청 1명",
      riderDetail: "김도윤 운전자 · 승인 대기",
    },
  ],
  "2025-05-27": [
    {
      id: "schedule-0527",
      time: "08:20",
      status: "운행 예정",
      tone: "open",
      title: "모란역 → 신구대학교",
      location: "모란역 공공 승차 구역",
      driverDetail: "1/3명 탑승 확정",
      riderDetail: "김도윤 운전자 · 탑승 확정",
    },
  ],
  "2025-06-03": [
    {
      id: "schedule-0603",
      time: "08:10",
      status: "모집 중",
      tone: "waiting",
      title: "수진역 → 신구대학교",
      location: "수진역 3번 출구",
      driverDetail: "0/3명 모집",
      riderDetail: "추천 카풀 · 신청 가능",
    },
  ],
}

export const demoReportTargets: ReportTarget[] = [
  {
    id: "user-kim",
    name: "김도윤",
    role: "운전자",
    rideLabel: "2026.09.28 · 모란역 → 신구대학교",
  },
  {
    id: "user-lee",
    name: "이서준",
    role: "운전자",
    rideLabel: "2026.09.21 · 신구대학교 → 야탑역",
  },
]

export const defaultSafetyReports: SafetyReport[] = [
  {
    id: "report-demo-complete",
    targetId: "user-demo",
    targetName: "익명 사용자",
    targetRole: "탑승자",
    rideLabel: "2026.09.12 · 태평역 → 신구대학교",
    reason: "무단 노쇼 / 지각",
    details: "약속 시간 이후에도 연락 없이 탑승 장소에 나타나지 않았습니다.",
    images: [],
    createdAt: "2026.09.13",
    status: "처리 완료",
    response:
      "해당 신고는 데모 데이터의 처리 완료 사례입니다. 실제 운영진이 조치한 결과는 아닙니다.",
  },
]

export const defaultBlockedUsers: BlockedUser[] = [
  {
    id: "blocked-kim",
    name: "김도윤",
    blockedAt: "2026.09.29",
  },
]

export const demoHistoryEntries: HistoryEntry[] = [
  {
    id: "rider-payment-0516",
    role: "rider",
    type: "결제",
    status: "결제 완료",
    title: "모란역 → 신구대학교",
    date: "2026.05.16",
    amount: "-2,800 P",
    description: "김도윤 운전자 · 포인트 결제",
  },
  {
    id: "rider-ride-0516",
    role: "rider",
    type: "이용",
    status: "이용 완료",
    title: "모란역 → 신구대학교",
    date: "2026.05.16",
    amount: "2,800 P",
    description: "탑승 및 결제 완료",
    canReview: true,
  },
  {
    id: "rider-refund-0508",
    role: "rider",
    type: "환불",
    status: "환불 완료",
    title: "야탑역 → 신구대학교",
    date: "2026.05.08",
    amount: "+3,200 P",
    description: "운행 취소에 따른 포인트 환불",
  },
  {
    id: "rider-cancel-0503",
    role: "rider",
    type: "취소",
    status: "취소 완료",
    title: "태평역 → 신구대학교",
    date: "2026.05.03",
    amount: "0 P",
    description: "출발 전 탑승 신청 취소",
  },
  {
    id: "driver-payment-0516",
    role: "driver",
    type: "결제",
    status: "결제 완료",
    title: "모란역 → 신구대학교",
    date: "2026.05.16",
    amount: "8,400 P · +840 M",
    description: "탑승자 3명 결제 완료",
  },
  {
    id: "driver-ride-0516",
    role: "driver",
    type: "이용",
    status: "이용 완료",
    title: "모란역 → 신구대학교",
    date: "2026.05.16",
    amount: "탑승 3명",
    description: "운행 종료 및 정산 완료",
  },
  {
    id: "driver-refund-0508",
    role: "driver",
    type: "환불",
    status: "환불 완료",
    title: "야탑역 → 신구대학교",
    date: "2026.05.08",
    amount: "-3,200 P",
    description: "취소 운행 환불 기록",
  },
]

export const demoProfileBadges: ProfileBadge[] = [
  {
    id: "driver-veteran",
    role: "driver",
    label: "베테랑 드라이버",
    condition: "카풀 운행 횟수 50회 이상 달성",
    icon: "car",
    tone: "navy",
  },
  {
    id: "driver-license",
    role: "driver",
    label: "면허 인증 완료",
    condition: "운전면허증 및 차량 정보 데모 확인",
    icon: "check",
    tone: "green",
  },
  {
    id: "driver-safe",
    role: "driver",
    label: "무사고 히어로",
    condition: "최근 6개월 사고 및 패널티 신고 0건",
    icon: "shield",
    tone: "sky",
  },
  {
    id: "driver-five-star",
    role: "driver",
    label: "5성급 기사님",
    condition: "탑승자 평가 평균 별점 4.8 이상",
    icon: "star",
    tone: "orange",
  },
  {
    id: "driver-mood",
    role: "driver",
    label: "분위기 메이커",
    condition: "대화와 선곡 관련 긍정 후기 다수 획득",
    icon: "music",
    tone: "green",
  },
  {
    id: "rider-student",
    role: "rider",
    label: "학생증 인증 완료",
    condition: "신구대학교 웹메일 데모 확인",
    icon: "student",
    tone: "navy",
  },
  {
    id: "rider-punctual",
    role: "rider",
    label: "시간 칼약속",
    condition: "시간을 잘 지켜요 후기 다수 획득",
    icon: "clock",
    tone: "orange",
  },
  {
    id: "rider-manner",
    role: "rider",
    label: "매너 탑승객",
    condition: "평균 별점 4.8 이상 및 친절 키워드 획득",
    icon: "manner",
    tone: "green",
  },
  {
    id: "rider-commuter",
    role: "rider",
    label: "프로 통학러",
    condition: "카풀 탑승 횟수 50회 이상 달성",
    icon: "commute",
    tone: "sky",
  },
]

export const defaultSelectedBadges: Record<Role, string[]> = {
  driver: ["driver-license", "driver-safe", "driver-five-star"],
  rider: ["rider-student", "rider-punctual", "rider-manner"],
}

export const defaultNotificationSettings: NotificationSettings = {
  matching: true,
  trip: true,
  chat: true,
  marketing: false,
}

export const defaultDemoDevices: DemoDevice[] = [
  {
    id: "device-current",
    name: "현재 기기",
    type: "모바일 브라우저 · 데모 기기",
    lastActive: "지금 활동 중",
    current: true,
  },
  {
    id: "device-other",
    name: "다른 기기",
    type: "태블릿 브라우저 · 예시 기기",
    lastActive: "2026.09.28 마지막 활동",
    current: false,
  },
]

export const serviceFaqs: FaqItem[] = [
  {
    id: "faq-apply",
    question: "카풀 신청은 어떻게 하나요?",
    answer:
      "홈 화면에서 출발지와 도착지, 희망 시간을 확인한 뒤 추천 카풀을 선택하고 신청할 수 있습니다. 신청 이후에는 일정 또는 신청 내역에서 진행 상태를 확인하세요.",
  },
  {
    id: "faq-approval",
    question: "카풀 신청이 승인되었는지 어떻게 확인하나요?",
    answer:
      "카풀 신청 내역에서 신청 상태를 확인할 수 있습니다. 승인된 경우 채팅을 통해 탑승 장소와 시간을 조율하세요.",
  },
  {
    id: "faq-cancel",
    question: "신청한 카풀을 취소할 수 있나요?",
    answer:
      "신청 상태와 운행 진행 상황에 따라 취소 가능 여부가 달라질 수 있습니다. 현재 앱에 표시되는 취소 버튼과 안내를 확인하세요. 실제 취소·환불 정책은 서비스 정책 확정 후 연결합니다.",
  },
  {
    id: "faq-driver",
    question: "운전자로 카풀을 등록하려면 어떻게 해야 하나요?",
    answer:
      "운전자 프로필과 차량 정보를 입력한 뒤 실제 운행 가능한 경로, 시간, 좌석 수를 등록하세요. 실제 운행 정보만 등록해야 합니다.",
  },
  {
    id: "faq-chat",
    question: "채팅 알림이 오지 않아요.",
    answer:
      "알림 설정 화면에서 전체 알림과 채팅 알림이 켜져 있는지 확인하세요. 현재 데모 버전에서는 실제 푸시 알림이 발송되지 않습니다.",
  },
  {
    id: "faq-mileage",
    question: "마일리지는 어떻게 적립되나요?",
    answer:
      "마일리지 적립은 실제 결제 및 운행 완료 조건과 연결되어야 합니다. 현재 데모 내역은 실제 금전적 혜택이나 확정된 정책을 의미하지 않습니다.",
  },
  {
    id: "faq-privacy",
    question: "개인정보는 어떻게 보호하나요?",
    answer:
      "비밀번호나 인증번호를 다른 사람에게 알려주지 마세요. 채팅에서 불필요한 개인정보를 공유하지 말고, 문제가 발생하면 신고 기능을 이용하세요.",
  },
  {
    id: "faq-contact",
    question: "문제가 발생하면 어디로 문의하나요?",
    answer:
      "화면 하단의 1:1 문의하기에서 문의 내용을 작성할 수 있습니다. 현재 데모에서는 문의가 실제 운영팀에 전달되지 않습니다.",
  },
]

export const APP_VERSION = "1.0.0"
