import { Routes, Route, NavLink } from 'react-router-dom'
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

export default function App() {
  return (
    <>
      <header className="app-header">
        <h1>⚔️ Lore Bard Builder</h1>
        <nav>
          <NavLink to="/" end>Builds</NavLink>
          <NavLink to="/species">Species</NavLink>
          <NavLink to="/spells">📜 Spells</NavLink>
          <NavLink to="/scenarios">📊 Scenarios</NavLink>
          <NavLink to="/reference">📋 Reference</NavLink>
          <NavLink to="/compare">Compare</NavLink>
          <NavLink to="/arena">⚔️ Arena</NavLink>
        </nav>
      </header>
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
      </Routes>
    </>
  )
}
