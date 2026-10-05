import { useEffect, useState } from 'react'

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Nombre qui défile de 0 jusqu'à sa valeur à l'apparition (affichage direct si animations réduites). */
export function CountUp({ value, duration = 900, delay = 0 }: { value: number; duration?: number; delay?: number }) {
  const [shown, setShown] = useState(0)
  const still = reducedMotion()

  useEffect(() => {
    if (still) return
    let frame = 0
    let start: number | undefined
    const tick = (now: number) => {
      start ??= now + delay
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration, delay, still])

  return <>{(still ? value : shown).toLocaleString('fr-FR')}</>
}
