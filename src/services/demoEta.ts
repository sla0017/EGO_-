export const DEFAULT_ESTIMATED_DURATION = 25

export function calculateEstimatedArrival(
  date: string,
  time: string,
  durationMinutes: number,
) {
  if (
    !date ||
    !time ||
    !Number.isSafeInteger(durationMinutes) ||
    durationMinutes < 1
  )
    return ""
  const departure = new Date(`${date}T${time}:00+09:00`)
  if (Number.isNaN(departure.getTime())) return ""
  return new Date(
    departure.getTime() + durationMinutes * 60_000,
  ).toISOString()
}

export function formatEtaTime(value: string) {
  if (!value) return "미정"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "미정"
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function formatEtaDateTime(value: string) {
  if (!value) return "미정"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "미정"
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function toDateTimeLocal(value: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function fromDateTimeLocal(value: string) {
  if (!value) return ""
  const date = new Date(`${value}:00+09:00`)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString()
}

export function timeLabelToMinutes(value: string) {
  const twentyFourHour = value.match(/^(\d{1,2}):(\d{2})$/)
  if (twentyFourHour)
    return Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2])
  const korean = value.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/)
  if (!korean) return null
  let hour = Number(korean[2]) % 12
  if (korean[1] === "오후") hour += 12
  return hour * 60 + Number(korean[3])
}

export function etaTimeToMinutes(value: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date)
  return timeLabelToMinutes(parts)
}
