import { Routes, Route } from 'react-router-dom'
import BuildsPage from './pages/BuildsPage'
import SpeciesPage from './pages/SpeciesPage'
import SpeciesDetail from './pages/SpeciesDetail'
import BuildDetail from './pages/BuildDetail'
import ComparePage from './pages/ComparePage'
import ArenaPage from './pages/ArenaPage'
import SpellsPage from './pages/SpellsPage'
import CharacterSheet from './pages/CharacterSheet'
import ScenariosPage from './pages/ScenariosPage'
import CombatLogPage from './pages/CombatLogPage'
import CombatViewer from './pages/CombatViewer'
import EncounterViewer from './pages/EncounterViewer'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<BuildsPage />} />
        <Route path="/species" element={<SpeciesPage />} />
        <Route path="/species/:id" element={<SpeciesDetail />} />
        <Route path="/builds/:id" element={<BuildDetail />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/arena" element={<ArenaPage />} />
        <Route path="/spells" element={<SpellsPage />} />
        <Route path="/reference" element={<CharacterSheet />} />
        <Route path="/scenarios" element={<ScenariosPage />} />
        <Route path="/combat-logs" element={<CombatLogPage />} />
        <Route path="/combat-logs/:buildId" element={<CombatLogPage />} />
        <Route path="/combat-logs/:buildId/:scenarioId" element={<CombatLogPage />} />
        <Route path="/combat-viewer" element={<CombatViewer />} />
        <Route path="/encounter-viewer" element={<EncounterViewer />} />
      </Routes>
    </>
  )
}
