import { TournamentProvider, useTournament } from './context/TournamentContext'
import { ModalProvider, useModal } from './context/ModalContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { useSwipeNavigation } from './hooks/useSwipeNavigation'
import { Header } from './components/layout/Header'
import { NavBar } from './components/layout/NavBar'
import { BottomBar } from './components/layout/BottomBar'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { JoinToast } from './components/layout/JoinToast'
import { SetupPage } from './components/pages/SetupPage'
import { TeamsPage } from './components/pages/TeamsPage'
import { PlayersPage } from './components/pages/PlayersPage'
import { GroupsPage } from './components/pages/GroupsPage'
import { CourtsPage } from './components/pages/CourtsPage'
import { RoundRobinPage } from './components/pages/RoundRobinPage'
import { BracketPage } from './components/pages/BracketPage'
import { HistoryPage } from './components/pages/HistoryPage'
import { WelcomeOverlay } from './components/overlays/WelcomeOverlay'
import { SpectatorOverlay } from './components/overlays/SpectatorOverlay'
import { CelebrationOverlay } from './components/overlays/CelebrationOverlay'
import { AddEditTeamModal } from './components/modals/AddEditTeamModal'
import { AddEditPlayerModal } from './components/modals/AddEditPlayerModal'
import { ScoreModal } from './components/modals/ScoreModal'
import { AddCourtModal } from './components/modals/AddCourtModal'
import { AssignCourtModal } from './components/modals/AssignCourtModal'
import { ShareModal } from './components/modals/ShareModal'

function AppInner() {
  const { state, dispatch } = useTournament()
  const { activePage, tournamentId, role } = state
  const { liveOpen, closeLive } = useModal()

  // Swipe left/right on touch devices to move between tabs.
  useSwipeNavigation(activePage, !!tournamentId && role !== 'viewer', page => {
    dispatch({ type: 'SET_PAGE', page })
  })

  // Welcome overlay: show when no tournament is connected yet
  const showWelcome = !tournamentId

  return (
    <>
      <Header />
      {!showWelcome && <NavBar />}

      <main className={!showWelcome && role !== 'viewer' ? 'with-bottom-bar' : undefined}>
        {activePage === 'setup' && <SetupPage />}
        {activePage === 'teams' && <TeamsPage />}
        {activePage === 'players' && <PlayersPage />}
        {activePage === 'groups' && <GroupsPage />}
        {activePage === 'schedule' && <CourtsPage />}
        {activePage === 'roundrobin' && <RoundRobinPage />}
        {activePage === 'bracket' && <BracketPage />}
        {activePage === 'history' && <HistoryPage />}
      </main>

      {!showWelcome && <BottomBar />}

      {showWelcome && <WelcomeOverlay />}
      <SpectatorOverlay forceOpen={!!tournamentId && (role === 'viewer' || liveOpen)} onClose={closeLive} />
      <CelebrationOverlay />

      <AddEditTeamModal />
      <AddEditPlayerModal />
      <ScoreModal />
      <AddCourtModal />
      <AssignCourtModal />
      <ShareModal />

      <JoinToast />
    </>
  )
}

export default function App() {
  return (
    <TournamentProvider>
      <ModalProvider>
        <ConfirmProvider>
          <ErrorBoundary>
            <AppInner />
          </ErrorBoundary>
        </ConfirmProvider>
      </ModalProvider>
    </TournamentProvider>
  )
}
