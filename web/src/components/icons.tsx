import type { CSSProperties } from 'react'

type IconProps = { size?: number; strokeWidth?: number; style?: CSSProperties; className?: string }

function Svg({
  size = 20,
  strokeWidth = 2.4,
  children,
  fill = 'none',
  viewBox = '0 0 24 24',
  ...rest
}: IconProps & { children: React.ReactNode; fill?: string; viewBox?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={fill}
      stroke={fill === 'none' ? 'currentColor' : undefined}
      strokeWidth={fill === 'none' ? strokeWidth : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9.5 12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20z" />
    <path d="M9.5 21.5V14h5v7.5" />
  </Svg>
)
export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7.5" />
    <path d="m21 21-4.2-4.2" />
  </Svg>
)
export const IconPulse = (p: IconProps) => (
  <Svg {...p}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </Svg>
)
export const IconHeart = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z" />
  </Svg>
)
export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M20 21v-1.5A4.5 4.5 0 0 0 15.5 15h-7A4.5 4.5 0 0 0 4 19.5V21" />
  </Svg>
)
export const IconLock = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.6}>
    <rect x="3" y="11" width="18" height="10" rx="3" />
    <path d="M7.5 11V7a4.5 4.5 0 0 1 9 0v4" />
  </Svg>
)
export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.6}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </Svg>
)
export const IconChevronRight = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.6}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
)
export const IconX = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.6}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
)
export const IconPlay = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </Svg>
)
export const IconPause = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1.4" />
    <rect x="14" y="4" width="4" height="16" rx="1.4" />
  </Svg>
)
export const IconVideo = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="9" cy="9" r="1.6" />
    <path d="m21 15-5-5-9 9" />
  </Svg>
)
export const IconRewind15 = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.2} size={p.size ?? 30}>
    <path d="M11 20a9 9 0 1 0-8.5-12" />
    <path d="M2.5 4v4h4" />
    <text x="12" y="16" fontSize="8" fontFamily="Figtree" textAnchor="middle" fill="currentColor" stroke="none">15</text>
  </Svg>
)
export const IconForward15 = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.2} size={p.size ?? 30}>
    <path d="M13 20a9 9 0 1 1 8.5-12" />
    <path d="M21.5 4v4h-4" />
    <text x="12" y="16" fontSize="8" fontFamily="Figtree" textAnchor="middle" fill="currentColor" stroke="none">15</text>
  </Svg>
)
export const IconList = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </Svg>
)
export const IconDownload = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 21h16" />
  </Svg>
)
export const IconAirplay = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
    <path d="m12 15 5 6H7z" />
  </Svg>
)
export const IconMore = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </Svg>
)
export const IconBookmark = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </Svg>
)
export const IconShare = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="M12 3v13" />
    <path d="M8 7l4-4 4 4" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </Svg>
)
export const IconPencil = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
    <path d="M14 6l4 4" />
  </Svg>
)
export const IconTrash = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </Svg>
)
export const IconUpload = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 20h16" />
  </Svg>
)
export const IconCheck = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 3}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
)
export const IconCircleCheck = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.3 12.2 2.4 2.4 5-5" />
  </Svg>
)
export const IconCirclePause = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12h8" />
  </Svg>
)
export const IconBell = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a2 2 0 0 0 3.4 0" />
  </Svg>
)
export const IconPlus = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.6}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const IconPlayCircle = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.2}>
    <circle cx="12" cy="12" r="9" />
    <path d="m10 8.5 5 3.5-5 3.5z" />
  </Svg>
)
export const IconLayers = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.2}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5" />
  </Svg>
)
export const IconUsers = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.2}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20v-1a4.5 4.5 0 0 1 4.5-4.5h4a4.5 4.5 0 0 1 4.5 4.5v1" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.6a4.5 4.5 0 0 1 3 4.4v1" />
  </Svg>
)
export const IconCard = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.2}>
    <rect x="2.5" y="5" width="19" height="14" rx="3" />
    <path d="M2.5 10h19M6.5 15h4" />
  </Svg>
)
export const IconLogOut = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.2}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="m9 8-4 4 4 4M5 12h11" />
  </Svg>
)
export const IconExpand = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
  </Svg>
)
export const IconShrink = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="M9 4v4a1 1 0 0 1-1 1H4M20 9h-4a1 1 0 0 1-1-1V4M15 20v-4a1 1 0 0 1 1-1h4M4 15h4a1 1 0 0 1 1 1v4" />
  </Svg>
)
export const IconMenu = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.6}>
    <path d="M3 6h18M6 12h12M10 18h4" />
  </Svg>
)
