import { TournamentProvider, useTournament } from './context/TournamentContext'
import { ModalProvider } from './context/ModalContext'
import { Header } from './components/layout/Header'
import { NavBar } from './components/layout/NavBar'
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
import { ScoreModal } from './components/modals/ScoreModal'
import { AddCourtModal } from './components/modals/AddCourtModal'
import { AssignCourtModal } from './components/modals/AssignCourtModal'
import { ShareModal } from './components/modals/ShareModal'

function AppInner() {
  const { state } = useTournament()
  const { activePage, tournamentId, role } = state

  // Welcome overlay: show when no tournament is connected yet
  const showWelcome = !tournamentId

  return (
    <>
      <Header />
      {!showWelcome && <NavBar />}

      <main>
        {activePage === 'setup' && <SetupPage />}
        {activePage === 'teams' && <TeamsPage />}
        {activePage === 'players' && <PlayersPage />}
        {activePage === 'groups' && <GroupsPage />}
        {activePage === 'schedule' && <CourtsPage />}
        {activePage === 'roundrobin' && <RoundRobinPage />}
        {activePage === 'bracket' && <BracketPage />}
        {activePage === 'history' && <HistoryPage />}
      </main>

      {showWelcome && <WelcomeOverlay />}
      <SpectatorOverlay forceOpen={role === 'viewer'} />
      <CelebrationOverlay />

      <AddEditTeamModal />
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
        <AppInner />
      </ModalProvider>
    </TournamentProvider>
  )
}
