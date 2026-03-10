const API_BASE = '/api';

async function fetchJson(url) {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Species
  getSpecies: (tier) => fetchJson(tier ? `/species?tier=${tier}` : '/species'),
  getSpeciesById: (id) => fetchJson(`/species/${id}`),

  // Feats
  getFeats: () => fetchJson('/feats'),

  // Items
  getItems: (rarity) => fetchJson(rarity ? `/items?rarity=${rarity}` : '/items'),

  // Builds
  getBuilds: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.species) params.set('species', filters.species);
    if (filters.archetype) params.set('archetype', filters.archetype);
    const qs = params.toString();
    return fetchJson(`/builds${qs ? `?${qs}` : ''}`);
  },
  getBuildById: (id) => fetchJson(`/builds/${id}`),
  createBuild: async (data) => {
    const res = await fetch(`${API_BASE}/builds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },
  deleteBuild: async (id) => {
    const res = await fetch(`${API_BASE}/builds/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  // Spells
  getSpells: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.level !== undefined && filters.level !== '') params.set('level', filters.level);
    if (filters.school) params.set('school', filters.school);
    if (filters.concentration !== undefined && filters.concentration !== '') params.set('concentration', filters.concentration);
    if (filters.bardNative !== undefined && filters.bardNative !== '') params.set('bardNative', filters.bardNative);
    if (filters.magicalSecretsCandidate !== undefined && filters.magicalSecretsCandidate !== '') params.set('magicalSecretsCandidate', filters.magicalSecretsCandidate);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.minRating) params.set('minRating', filters.minRating);
    const qs = params.toString();
    return fetchJson(`/spells${qs ? `?${qs}` : ''}`);
  },
  getSpellById: (id) => fetchJson(`/spells/${id}`),

  // Class Features
  getClassFeatures: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.subclass) params.set('subclass', filters.subclass);
    if (filters.level) params.set('level', filters.level);
    const qs = params.toString();
    return fetchJson(`/class-features${qs ? `?${qs}` : ''}`);
  },

  // Skills
  getSkills: (expertiseOnly) => fetchJson(expertiseOnly ? '/skills?expertiseCandidate=true' : '/skills'),

  // Backgrounds
  getBackgrounds: (minRating) => fetchJson(minRating ? `/backgrounds?minRating=${minRating}` : '/backgrounds'),

  // Level Progression
  getLevels: (maxLevel) => fetchJson(maxLevel ? `/levels?maxLevel=${maxLevel}` : '/levels'),
  getLevel: (level) => fetchJson(`/levels/${level}`),

  // Conditions
  getConditions: (tag) => fetchJson(tag ? `/conditions?tag=${tag}` : '/conditions'),

  // Scenarios (Scenario-Based Build Evaluation)
  getScenarios: () => fetchJson('/scenarios'),

  // Combat Logs (turn-by-turn simulation logs from disk)
  getCombatLogs: () => fetchJson('/combat-logs'),
  getCombatLogsByBuild: (buildId) => fetchJson(`/combat-logs/${buildId}`),
  getCombatLog: (buildId, scenarioId) => fetchJson(`/combat-logs/${buildId}/${scenarioId}`),
};
