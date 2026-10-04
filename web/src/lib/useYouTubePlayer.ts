import { useEffect, useRef, useState } from 'react'

/**
 * Pilote une vidéo YouTube depuis les commandes de l'application.
 *
 * Une simple <iframe> ne se commande pas : il faut l'API IFrame Player de
 * YouTube, qui remplace un conteneur par son propre lecteur et expose
 * lecture, pause et position.
 */

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  setPlaybackRate(rate: number): void
  getCurrentTime(): number
  getDuration(): number
  destroy(): void
}

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<void> | null = null

/** Charge le script de l'API une seule fois pour toute l'application. */
function loadApi(): Promise<void> {
  if (apiPromise) return apiPromise
  apiPromise = new Promise<void>((resolve) => {
    if (window.YT?.Player) {
      resolve()
      return
    }
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
  return apiPromise
}

export function useYouTubePlayer(videoId: string | null | undefined) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    if (!videoId || !containerRef.current) return
    let cancelled = false
    const host = containerRef.current

    loadApi().then(() => {
      if (cancelled || !window.YT) return
      const mount = document.createElement('div')
      host.replaceChildren(mount)
      playerRef.current = new window.YT.Player(mount, {
        videoId,
        // playsinline : sans lui, iOS passe en plein écran natif dès la lecture.
        // controls: 0 — ce sont les commandes de l'application qui pilotent la
        // vidéo ; afficher aussi celles de YouTube créait un doublon confus.
        // iv_load_policy: 3 masque les annotations, disablekb laisse le clavier
        // aux raccourcis de la page.
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: 0, iv_load_policy: 3, disablekb: 1, fs: 0 },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            if (cancelled) return
            setDuration(e.target.getDuration())
            setReady(true)
          },
          onStateChange: (e: { data: number; target: YTPlayer }) => {
            if (cancelled || !window.YT) return
            setPlaying(e.data === window.YT.PlayerState.PLAYING)
            setEnded(e.data === window.YT.PlayerState.ENDED)
            if (e.data === window.YT.PlayerState.ENDED) setCurrentTime(e.target.getDuration())
            const d = e.target.getDuration()
            if (d) setDuration(d)
          },
        },
      })
    })

    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
      setReady(false)
      setPlaying(false)
    }
  }, [videoId])

  // La position n'est pas notifiée : on l'interroge pendant la lecture.
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      const p = playerRef.current
      if (p) setCurrentTime(p.getCurrentTime())
    }, 500)
    return () => clearInterval(t)
  }, [playing])

  return {
    containerRef,
    ready,
    playing,
    ended,
    currentTime,
    duration,
    toggle: () => (playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo()),
    setPlaybackRate: (rate: number) => playerRef.current?.setPlaybackRate(rate),
    seekTo: (seconds: number) => {
      playerRef.current?.seekTo(Math.max(0, seconds), true)
      setCurrentTime(Math.max(0, seconds))
    },
  }
}
