import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCourse, useCourses, useFavorites, useUniverses } from '../lib/hooks'
import { useYouTubePlayer } from '../lib/useYouTubePlayer'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { api } from '../lib/api'
import { CourseRow } from '../components/CourseRow'
import { SectionTitle } from '../components/ui'
import {
  IconChevronLeft,
  IconHeart,
  IconPlay,
  IconPause,
  IconRewind15,
  IconForward15,
  IconShare,
  IconLock,
  IconExpand,
  IconShrink,
} from '../components/icons'
import heroPhoto from '../assets/course-photo.webp'
import { Loader } from '../components/Loader'

const SPEEDS = [0.75, 1, 1.25, 1.5]

function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Plein écran sur la scène vidéo ; repli sur le plein écran natif de la vidéo (iOS). */
function useFullscreen(stage: React.RefObject<HTMLElement | null>, video: React.RefObject<HTMLVideoElement | null>) {
  const [isFull, setIsFull] = useState(false)
  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const supported =
    typeof document !== 'undefined' &&
    (document.fullscreenEnabled || !!(video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null)?.webkitEnterFullscreen)
  const toggle = useCallback(() => {
    if (document.fullscreenElement) return void document.exitFullscreen()
    const el = stage.current
    if (el?.requestFullscreen) return void el.requestFullscreen().catch(() => undefined)
    ;(video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null)?.webkitEnterFullscreen?.()
  }, [stage, video])
  return { isFull, supported, toggle }
}

export default function Lecteur() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: course } = useCourse(id)
  const { data: favorites } = useFavorites(!!user)
  const { data: universes } = useUniverses()
  const { data: sameUniverse } = useCourses({ universe: course?.universe })
  const flash = useToast()
  const queryClient = useQueryClient()

  const yt = useYouTubePlayer(course?.youtubeId)
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const fullscreen = useFullscreen(stageRef, videoRef)
  const isYoutube = !!course?.youtubeId
  const hasVideo = isYoutube || !!course?.videoUrl

  // Position et durée viennent du lecteur réel.
  const [speed, setSpeed] = useState(1)
  const [fileTime, setFileTime] = useState(0)
  const [filePlaying, setFilePlaying] = useState(false)
  const [fileDuration, setFileDuration] = useState(0)
  const [fileEnded, setFileEnded] = useState(false)

  const durationSec = isYoutube ? yt.duration || (course?.durationMin ?? 20) * 60 : fileDuration || (course?.durationMin ?? 20) * 60
  const currentSec = isYoutube ? yt.currentTime : fileTime
  const playing = isYoutube ? yt.playing : filePlaying
  const ended = isYoutube ? yt.ended : fileEnded
  const progress = durationSec ? Math.min(1, currentSec / durationSec) : 0
  const started = currentSec > 0 || playing

  // Nouvelle séance ouverte depuis « À suivre » : la page reste montée, on repart de zéro.
  useEffect(() => {
    setFileTime(0)
    setFilePlaying(false)
    setFileDuration(0)
    setFileEnded(false)
    setSpeed(1)
    window.scrollTo(0, 0)
  }, [id])

  const togglePlay = useCallback(() => {
    if (isYoutube) return yt.toggle()
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }, [isYoutube, yt])
  const seekTo = useCallback(
    (seconds: number) => {
      const target = Math.min(Math.max(0, seconds), durationSec)
      if (isYoutube) return yt.seekTo(target)
      if (videoRef.current) videoRef.current.currentTime = target
    },
    [isYoutube, yt, durationSec],
  )
  const changeSpeed = (rate: number) => {
    setSpeed(rate)
    if (isYoutube) yt.setPlaybackRate(rate)
    else if (videoRef.current) videoRef.current.playbackRate = rate
  }

  // Raccourcis : espace = lecture/pause, flèches = ±15 s, F = plein écran.
  useEffect(() => {
    if (!hasVideo) return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowRight') seekTo(currentSec + 15)
      else if (e.key === 'ArrowLeft') seekTo(currentSec - 15)
      else if (e.key === 'f') fullscreen.toggle()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [hasVideo, togglePlay, seekTo, currentSec, fullscreen])

  const saveProgress = useMutation({
    mutationFn: (pct: number) => api.post('/api/progress', { courseId: id, progressPct: pct }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['practice'] }),
  })

  // Sauvegarde tous les 5 % de progression, une fois la lecture commencée.
  const step = Math.round(progress * 20)
  useEffect(() => {
    if (!user || !id || !started) return
    const t = setTimeout(() => saveProgress.mutate(progress), 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, user, id, started])

  const isFav = favorites?.some((f) => f.id === id) ?? false
  const toggleFavorite = useMutation({
    mutationFn: () => (isFav ? api.delete(`/api/favorites/${id}`) : api.post(`/api/favorites/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      flash(isFav ? 'Retirée des favoris' : 'Ajoutée aux favoris')
    },
  })

  const universeSlug = universes?.find((u) => u.label === course?.universe)?.slug
  const next = (sameUniverse ?? []).filter((c) => c.id !== id).slice(0, 4)

  async function share() {
    const url = window.location.href
    const title = course?.title ?? 'Yogella'
    if (navigator.share) {
      // L'utilisatrice peut annuler le partage : ce n'est pas une erreur.
      try {
        await navigator.share({ title, url })
      } catch {
        /* partage annulé */
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      flash('Lien copié')
    } catch {
      flash('Impossible de copier le lien')
    }
  }

  if (!course) return <Loader />

  return (
    <div className="player-screen">
      <div className="player-stage" ref={stageRef}>
        {isYoutube ? (
          // Conteneur remplacé par le lecteur YouTube, piloté par useYouTubePlayer.
          <div ref={yt.containerRef} className="player-media yt-host" />
        ) : course.videoUrl ? (
          <video
            ref={videoRef}
            className="player-media"
            src={course.videoUrl}
            poster={course.thumbnailUrl ?? undefined}
            playsInline
            preload="metadata"
            onClick={togglePlay}
            onPlay={() => {
              setFilePlaying(true)
              setFileEnded(false)
            }}
            onPause={() => setFilePlaying(false)}
            onEnded={() => setFileEnded(true)}
            onTimeUpdate={(e) => setFileTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setFileDuration(e.currentTarget.duration)}
          />
        ) : (
          <img className="player-media player-poster" src={course.thumbnailUrl ?? heroPhoto} alt="" />
        )}

        {/* Grand bouton central tant que la vidéo n'est pas en lecture. */}
        {hasVideo && !playing && (
          <button type="button" className="player-overlay" onClick={togglePlay} aria-label={ended ? 'Revoir la séance' : 'Lancer la lecture'}>
            {course.thumbnailUrl && !started && <img src={course.thumbnailUrl} alt="" className="player-overlay-poster" />}
            <span className="player-overlay-btn">
              <IconPlay size={30} />
            </span>
            {ended && <span className="player-overlay-label">Séance terminée · Revoir</span>}
          </button>
        )}

        {!hasVideo && (
          <div className="player-locked">
            <span className="player-locked-icon" aria-hidden="true">
              <IconLock size={22} />
            </span>
            <strong>{course.locked ? 'Séance réservée aux abonnées' : 'Vidéo bientôt disponible'}</strong>
            {course.locked && (
              <>
                <span>Abonne-toi pour débloquer cette séance et tout le catalogue.</span>
                <Link to="/abonnement" className="btn ui-btn-primary">
                  Voir les formules
                </Link>
              </>
            )}
          </div>
        )}

        <div className="player-topbar">
          <button type="button" className="player-icon-btn" aria-label="Retour" onClick={() => navigate(-1)}>
            <IconChevronLeft size={18} />
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="player-icon-btn" aria-label="Partager" onClick={share}>
              <IconShare size={17} />
            </button>
            {user && (
              <button
                type="button"
                className={`player-icon-btn${isFav ? ' fav-on' : ''}`}
                aria-pressed={isFav}
                aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                onClick={() => toggleFavorite.mutate()}
              >
                <IconHeart size={18} filled={isFav} strokeWidth={2.4} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="player-panel">
        <div className="player-head">
          {universeSlug ? (
            <Link to={`/categorie/${universeSlug}`} className="player-universe">
              {course.universe}
            </Link>
          ) : (
            <span className="player-universe">{course.universe}</span>
          )}
          <h1 className="player-title">{course.title}</h1>
          <div className="player-meta">
            {course.durationMin} min
            {course.authorName ? ` · avec ${course.authorName}${course.authorRole ? `, ${course.authorRole}` : ''}` : ''}
          </div>
        </div>

        {hasVideo && (
          <>
            <div className="player-scrub">
              <input
                type="range"
                className="player-range"
                min={0}
                max={Math.max(1, Math.round(durationSec))}
                step={1}
                value={Math.round(currentSec)}
                aria-label="Position dans la vidéo"
                aria-valuetext={`${formatTime(currentSec)} sur ${formatTime(durationSec)}`}
                style={{ '--pct': `${progress * 100}%` } as React.CSSProperties}
                onChange={(e) => seekTo(Number(e.target.value))}
              />
              <div className="player-times">
                <span>{formatTime(currentSec)}</span>
                <span>-{formatTime(durationSec - currentSec)}</span>
              </div>
            </div>

            <div className="player-controls">
              <button type="button" className="player-skip" aria-label="Reculer de 15 secondes" onClick={() => seekTo(currentSec - 15)}>
                <IconRewind15 size={32} />
              </button>
              <button type="button" className="player-play" aria-label={playing ? 'Pause' : 'Lecture'} onClick={togglePlay}>
                {playing ? <IconPause size={28} /> : <IconPlay size={28} />}
              </button>
              <button type="button" className="player-skip" aria-label="Avancer de 15 secondes" onClick={() => seekTo(currentSec + 15)}>
                <IconForward15 size={32} />
              </button>
            </div>

            <div className="player-options">
              <div className="player-speed" role="radiogroup" aria-label="Vitesse de lecture">
                {SPEEDS.map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={r === speed} className={r === speed ? 'active' : ''} onClick={() => changeSpeed(r)}>
                    {String(r).replace('.', ',')}×
                  </button>
                ))}
              </div>
              {fullscreen.supported && (
                <button type="button" className="player-fs" onClick={fullscreen.toggle} aria-label={fullscreen.isFull ? 'Quitter le plein écran' : 'Plein écran'}>
                  {fullscreen.isFull ? <IconShrink size={18} /> : <IconExpand size={18} />}
                  <span>{fullscreen.isFull ? 'Réduire' : 'Plein écran'}</span>
                </button>
              )}
            </div>
          </>
        )}

        {next.length > 0 && (
          <section className="player-next">
            <SectionTitle title="À suivre" />
            <div className="ui-list">
              {next.map((c) => (
                <CourseRow key={c.id} course={c} showUniverse={false} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
