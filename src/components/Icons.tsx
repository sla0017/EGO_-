import type { ReactNode, SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

function createIcon(children: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={props["aria-label"] ? undefined : true}
        {...props}
      >
        {children}
      </svg>
    )
  }
}

export const ArrowLeft = createIcon(
  <>
    <path d="m15 18-6-6 6-6" />
    <path d="M9 12h10" />
  </>,
)
export const Bell = createIcon(
  <>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M10 21h4" />
  </>,
)
export const CalendarDays = createIcon(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </>,
)
export const CarFront = createIcon(
  <>
    <path d="m5 11 2-5h10l2 5" />
    <rect x="3" y="11" width="18" height="7" rx="2" />
    <path d="M5 18v2M19 18v2M7 14h.01M17 14h.01" />
  </>,
)
export const Check = createIcon(<path d="m5 12 4 4L19 6" />)
export const ChevronRight = createIcon(<path d="m9 18 6-6-6-6" />)
export const CircleHelp = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.8 9a2.4 2.4 0 1 1 3.7 2c-1 .6-1.5 1-1.5 2M12 17h.01" />
  </>,
)
export const Clock3 = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
)
export const CreditCard = createIcon(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18M7 15h2" />
  </>,
)
export const Eye = createIcon(
  <>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12" />
    <circle cx="12" cy="12" r="2.5" />
  </>,
)
export const EyeOff = createIcon(
  <>
    <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-2.1 3M6.6 6.6C3.6 8.3 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4-.8" />
  </>,
)
export const Flag = createIcon(
  <>
    <path d="M5 21V4" />
    <path d="M5 5h11l-1 4 1 4H5" />
  </>,
)
export const Home = createIcon(
  <>
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v10h14V10M9 20v-6h6v6" />
  </>,
)
export const MapPin = createIcon(
  <>
    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0" />
    <circle cx="12" cy="10" r="2" />
  </>,
)
export const MessageCircle = createIcon(
  <>
    <path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 9 9 0 0 1-4-.9L3 21l1.8-4.5A8.5 8.5 0 1 1 21 11.5" />
  </>,
)
export const Megaphone = createIcon(
  <>
    <path d="M3 11v2a2 2 0 0 0 2 2h3l9 4V5l-9 4H5a2 2 0 0 0-2 2Z" />
    <path d="m8 15 1 5h3l-1.5-4" />
    <path d="M21 10v4" />
  </>,
)
export const Heart = createIcon(
  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
)
export const MoreHorizontal = createIcon(
  <>
    <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
  </>,
)
export const Smile = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
  </>,
)
export const Navigation = createIcon(<path d="m3 11 18-8-8 18-2-8-8-2Z" />)
export const Plus = createIcon(
  <>
    <path d="M12 5v14M5 12h14" />
  </>,
)
export const Route = createIcon(
  <>
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="5" r="2" />
    <path d="M6 17c0-5 12-5 12-10" />
  </>,
)
export const Search = createIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </>,
)
export const Send = createIcon(<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2" />)
export const Settings = createIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a2 2 0 0 0 .4 2.2l.1.1-2.6 2.6-.1-.1a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.2 1.8V21h-3.6v-.2A2 2 0 0 0 9 19a2 2 0 0 0-2.2.4l-.1.1-2.6-2.6.1-.1A2 2 0 0 0 4.6 15a2 2 0 0 0-1.8-1.2H3v-3.6h.2A2 2 0 0 0 5 9a2 2 0 0 0-.4-2.2l-.1-.1 2.6-2.6.1.1A2 2 0 0 0 9 4.6a2 2 0 0 0 1.2-1.8V3h3.6v.2A2 2 0 0 0 15 5a2 2 0 0 0 2.2-.4l.1-.1 2.6 2.6-.1.1A2 2 0 0 0 19.4 9a2 2 0 0 0 1.8 1.2h.2v3.6h-.2A2 2 0 0 0 19.4 15Z" />
  </>,
)
export const ShieldCheck = createIcon(
  <>
    <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11" />
    <path d="m9 12 2 2 4-4" />
  </>,
)
export const Sparkles = createIcon(
  <>
    <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15ZM19 13l.6 1.4L21 15l-1.4.6L19 17l-.6-1.4L17 15l1.4-.6L19 13Z" />
  </>,
)
export const Star = createIcon(
  <path d="m12 2 3 6 6.5 1-4.7 4.6 1.1 6.4-5.9-3.1L6.1 20l1.1-6.4L2.5 9 9 8l3-6Z" />,
)
export const UserRound = createIcon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>,
)
export const UsersRound = createIcon(
  <>
    <path d="M16 21a6 6 0 0 0-12 0M10 9a4 4 0 1 1-8 0M16 3a4 4 0 0 1 0 8M18 14a6 6 0 0 1 4 6" />
  </>,
)
export const WalletCards = createIcon(
  <>
    <path d="M3 6h16a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V6Z" />
    <path d="M3 7 17 3v3M16 12h5" />
  </>,
)
export const X = createIcon(
  <>
    <path d="m6 6 12 12M18 6 6 18" />
  </>,
)
