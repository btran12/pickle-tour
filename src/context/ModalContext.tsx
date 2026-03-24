import { createContext, useContext, useState, type ReactNode } from 'react'
import type { MatchType } from '../types'

interface ScoringCtx { type: MatchType; matchId: number }
interface AssignCtx { matchId: number }

interface ModalState {
  addTeamOpen: boolean
  editTeamId: number | null
  scoreCtx: ScoringCtx | null
  addCourtOpen: boolean
  assignCtx: AssignCtx | null
  shareOpen: boolean
}

interface ModalActions {
  openAddTeam: () => void
  openEditTeam: (id: number) => void
  closeTeamModal: () => void
  openScore: (ctx: ScoringCtx) => void
  closeScore: () => void
  openAddCourt: () => void
  closeAddCourt: () => void
  openAssignCourt: (matchId: number) => void
  closeAssignCourt: () => void
  openShare: () => void
  closeShare: () => void
}

const ModalContext = createContext<(ModalState & ModalActions) | null>(null)

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be inside ModalProvider')
  return ctx
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [addTeamOpen, setAddTeamOpen] = useState(false)
  const [editTeamId, setEditTeamId] = useState<number | null>(null)
  const [scoreCtx, setScoreCtx] = useState<ScoringCtx | null>(null)
  const [addCourtOpen, setAddCourtOpen] = useState(false)
  const [assignCtx, setAssignCtx] = useState<AssignCtx | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

  return (
    <ModalContext.Provider value={{
      addTeamOpen, editTeamId, scoreCtx, addCourtOpen, assignCtx, shareOpen,
      openAddTeam: () => { setEditTeamId(null); setAddTeamOpen(true) },
      openEditTeam: (id) => { setEditTeamId(id); setAddTeamOpen(true) },
      closeTeamModal: () => { setAddTeamOpen(false); setEditTeamId(null) },
      openScore: (ctx) => setScoreCtx(ctx),
      closeScore: () => setScoreCtx(null),
      openAddCourt: () => setAddCourtOpen(true),
      closeAddCourt: () => setAddCourtOpen(false),
      openAssignCourt: (matchId) => setAssignCtx({ matchId }),
      closeAssignCourt: () => setAssignCtx(null),
      openShare: () => setShareOpen(true),
      closeShare: () => setShareOpen(false),
    }}>
      {children}
    </ModalContext.Provider>
  )
}
