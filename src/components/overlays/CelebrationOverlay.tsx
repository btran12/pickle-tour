import { useEffect, useRef } from 'react'
import { useTournament } from '../../context/TournamentContext'
import type { Team } from '../../types'

export function CelebrationOverlay() {
  const { state, dispatch } = useTournament()
  const { bracketRounds, thirdPlaceMatch, confettiShown } = state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  const fin = bracketRounds[bracketRounds.length - 1]?.matches[0]
  const champ = fin?.status === 'done' ? (fin.winner as Team | null) : null
  const runnerUp = fin?.status === 'done' ? (fin.loser as Team | null) : null
  const tp = thirdPlaceMatch
  const third = tp?.status === 'done' ? (tp.winner as Team | null) : null
  const isOpen = confettiShown && !!champ

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')!
    const colors = ['#a8d44a', '#e8c84a', '#4ab8e8', '#e05555', '#b48ae8', '#c8f060', '#e8f0d8']

    interface Particle { x: number; y: number; r: number; color: string; vx: number; vy: number; angle: number; spin: number; shape: 'rect' | 'circle'; w: number; h: number }
    const particles: Particle[] = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 7 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 4 + 2,
      angle: Math.random() * 360,
      spin: (Math.random() - 0.5) * 8,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      w: Math.random() * 10 + 4,
      h: Math.random() * 5 + 3,
    }))

    const frame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.angle += p.spin
        if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle * Math.PI / 180)
        ctx.fillStyle = p.color
        ctx.globalAlpha = 0.85
        if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill() }
        else { ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h) }
        ctx.restore()
      })
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(rafRef.current) }
  }, [isOpen])

  if (!isOpen || !champ) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.6)' }}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', textAlign: 'center', background: 'transparent', padding: '32px 40px', maxWidth: 440 }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, letterSpacing: 2, color: 'white', marginTop: 6 }}>🏆 {champ.name}</div>
        {runnerUp && (
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: 'white', marginTop: 10 }}>🥈 {runnerUp.name}</div>
        )}
        {third && (
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: 'white', marginTop: 10 }}>🥉 {third.name}</div>
        )}
        <button
          className="btn btn-outline btn-sm"
          style={{ marginTop: 40, width: 40, height: 40, borderRadius: '50%', borderColor: 'white', color: 'white', fontSize: 20, alignItems: 'center', justifyContent: 'center', padding: 0 }}
          onClick={e => { e.stopPropagation(); cancelAnimationFrame(rafRef.current); dispatch({ type: 'CLEAR_CONFETTI_SHOWN' }) }}
        >
          X
        </button>
      </div>
    </div>
  )
}
