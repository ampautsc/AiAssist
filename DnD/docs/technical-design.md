# MMO Dungeons & Dragons — Technical Design Document

## 1. System Architecture Overview

This game is a browser-based, multiplayer online Dungeons & Dragons experience. It combines real-time
communication (video, voice, chat), persistent character state, an AI-driven Dungeon Master, and a
hex-tile combat/navigation system. The architecture is intentionally split into a thin React TypeScript
SPA client and a stateful Node.js/Express server that owns all authoritative game logic.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS (Browser)                     │
│  React TypeScript SPA  ──  WebRTC (voice/video)             │
│  REST fetches          ──  WebSocket (real-time events)      │
└────────────────┬─────────────────────────┬──────────────────┘
                 │ HTTPS / WSS              │ WebRTC (P2P mesh)
┌────────────────▼──────────────────────────▼─────────────────┐
│                     NODE.JS / EXPRESS SERVER                  │
│  REST API             WebSocket Hub         AI DM Service    │
│  Auth middleware      Party/Session Mgr     OpenAI API calls │
│  Character CRUD       Combat Engine         Encounter Hooks   │
│  Trade/Economy        Initiative Tracker    Narrative Gen     │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │   Persistent Storage     │
              │  JSON files (dev)        │
              │  PostgreSQL (prod)       │
              └─────────────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Server-side authority | All combat/economy resolved on server | Prevents cheating, single source of truth |
| WebSocket for real-time | `ws` library over Socket.IO | Lighter weight, full control |
| WebRTC for AV | Browser P2P mesh (STUN/TURN) | Reduces server bandwidth for media |
| Hex map coords | Axial (q, r) coordinate system | Simplifies distance and pathfinding math |
| AI DM | OpenAI GPT-4o via structured prompts | Consistent rule adherence + narrative quality |

---

## 2. Client-Server Architecture

### Client (React TypeScript SPA)

The client is a thin UI layer; it **never** resolves game logic authoritatively.

```
src/
  App.tsx            – Router root
  main.tsx           – Vite entry
  pages/
    LobbyPage.tsx    – Party browser, create/join
    CharacterPage.tsx – Character creation & sheet
    GamePage.tsx     – Active session: hex map, chat, DM feed
    CombatLogPage.jsx – Replay past encounters
  components/
    HexMap.jsx       – SVG hex grid (flat-top)
    ChatPanel.tsx    – Real-time chat
    DiceRoller.tsx   – Client-side visual roll (server validates)
    CharacterSheet.tsx
    TradingModal.tsx
  hooks/
    useWebSocket.ts  – WS connection management
    useParty.ts      – Party state
    useCharacter.ts  – Character state
  context/
    GameContext.tsx   – Global game state
    AuthContext.tsx   – Player identity
```

### Server (Node.js / Express)

```
server/
  index.js           – Express app bootstrap + WS server
  routes/
    auth.js          – Register / login (JWT)
    characters.js    – CRUD for characters
    parties.js       – Create/join/leave parties
    trades.js        – Trade proposals & resolution
    items.js         – Item catalog
  combat/
    engine/
      encounterRunner.js  – Run a full encounter loop
      mechanics.js        – Dice, saving throws, hit resolution
      initiativeTracker.js
    ai/
      tactics.js          – AI DM combat choices
      narrative.js        – DM narration generation
    data/
      creatures.js        – Monster stat blocks
  data/                   – JSON stores (dev)
    characters/
    parties/
    sessions/
    items.json
    world.json
```

### Communication Protocols

#### REST API (HTTPS)

Used for actions that do not require sub-second latency:

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Obtain JWT |
| GET/POST/PUT/DELETE | /api/characters/:id | Character CRUD |
| GET/POST | /api/parties | List / create party |
| POST | /api/parties/:id/join | Join party |
| GET/POST | /api/trades | Trade management |
| GET | /api/items | Item catalog |

#### WebSocket Events (WSS)

```
CLIENT → SERVER
  { type: "JOIN_SESSION",   payload: { partyId, characterId } }
  { type: "MOVE",           payload: { q, r } }
  { type: "ACTION",         payload: { actionType, targetId, ... } }
  { type: "CHAT",           payload: { message } }
  { type: "TRADE_PROPOSE",  payload: { toPlayerId, offer, request } }
  { type: "TRADE_ACCEPT",   payload: { tradeId } }
  { type: "ROLL_DICE",      payload: { dice, reason } }

SERVER → CLIENT
  { type: "GAME_STATE",     payload: { ... full session snapshot } }
  { type: "TURN_START",     payload: { characterId, timeLimit } }
  { type: "COMBAT_EVENT",   payload: { event, log } }
  { type: "DM_NARRATION",   payload: { text, audioUrl? } }
  { type: "MAP_UPDATE",     payload: { tokens } }
  { type: "TRADE_REQUEST",  payload: { tradeId, from, offer, request } }
  { type: "CHAT_MESSAGE",   payload: { from, message, timestamp } }
  { type: "PLAYER_JOINED",  payload: { characterId, playerName } }
  { type: "PLAYER_LEFT",    payload: { characterId } }
```

---

## 3. AI Dungeon Master System

The AI DM fulfills three roles: **narrator**, **rules arbiter**, and **tactical opponent**.

### 3.1 Narration & Story Generation

- On session start, the AI DM receives the world context, current adventure hook, and party composition.
- After each meaningful event (combat resolution, skill check, exploration), the server calls the AI API
  with a structured prompt requesting narrative flavor text.
- Responses are streamed to players via WebSocket `DM_NARRATION` events.

### 3.2 Rules Arbitration

- When a player attempts a non-standard action (e.g., "I try to bribe the guard with fish"), the server
  calls the AI DM with the action description, relevant character stats, and context.
- The AI returns a structured JSON response: `{ allowed: bool, dc: number, skill: string, outcome: string }`.
- The server then executes the dice roll and broadcasts the result.

### 3.3 Combat Tactics

Monster and NPC actions are determined by the AI tactics module (`combat/ai/tactics.js`). For each enemy turn:

1. The combat engine calls `chooseTactic(creature, gameState)`.
2. The tactics module evaluates the current board state (positions, HP, threats).
3. Returns a structured action: `{ action: "attack"|"move"|"spell"|"flee", target, ... }`.
4. For important encounters the full game state is sent to the AI API for richer decision-making.

### 3.4 Moderation

- Chat messages are screened server-side before broadcast.
- The AI DM can issue warnings or temporary mutes for policy violations.
- The DM tracks narrative consistency to prevent player "rules lawyering" exploits.

---

## 4. Party & Session Management

### Party Lifecycle

```
OPEN (lobby) → FULL (4-6 players) → IN_SESSION → COMPLETED / DISBANDED
```

- **Party size**: 4–6 players (configurable per adventure module).
- **Party leader**: First player to create the party. Can kick players and start the session.
- **Persistent parties**: Parties can persist across sessions; players reconnect to the same party.
- **Session state**: Saved to disk every 30 seconds and on every meaningful event.

### Reconnection

- If a player disconnects mid-session, their character is frozen (no actions) but remains on the map.
- On reconnect within 5 minutes, the player receives the current `GAME_STATE` snapshot and resumes.
- After 5 minutes, the party leader can vote to have the character controlled by the AI DM.

### Turn Order

- Initiative is rolled at the start of each encounter.
- Each player has a 90-second turn timer. On expiry, the server auto-passes the turn.
- Turns are broadcast via `TURN_START` to all party members so observers can watch.

---

## 5. Character Persistence

Characters are stored server-side and loaded at session start. The character object includes:

- Core stats (STR, DEX, CON, INT, WIS, CHA) and derived values (AC, HP max, initiative modifier)
- Current HP, spell slots, conditions
- Inventory (items with quantities)
- Experience points and level
- Known spells, prepared spells, class features
- Campaign-level flags (quests completed, NPCs met, locations discovered)

On each session end the server writes the final character state to the data store. A snapshot is
taken at the start of each session to support rollback if the session ends abnormally.

---

## 6. Trading & Economy System

### Trade Flow

```
Player A proposes trade → Server validates items exist in A's inventory
→ WebSocket TRADE_REQUEST to Player B
→ Player B accepts/rejects
→ Server atomically swaps items in both inventories
→ GAME_STATE update broadcast to party
```

### Economy Design

- No auction house in v1; all trades are direct player-to-player.
- Gold (GP) is a first-class item with quantity tracking.
- Item prices for NPC merchants are set in `items.json` with buy/sell modifiers.
- Economy can be tuned per adventure module via config.

---

## 7. Hex Map System

### Coordinate System

The hex map uses **axial coordinates (q, r)** with flat-top hexagons.

```
Offset from center:
  Point i of hex: ( hexSize * cos(60°*i), hexSize * sin(60°*i) )

Axial to pixel:
  x = hexSize * (3/2 * q)
  y = hexSize * (√3/2 * q + √3 * r)
```

### Features

- **Terrain types**: Open, Difficult, Wall, Water, Forest — each with movement cost.
- **Fog of War**: Hexes outside line-of-sight render as dark until explored.
- **Tokens**: Each character and creature is a colored token with a label.
- **Range indicators**: On action selection, valid target hexes highlight in red/green.
- **Area effects**: Spells highlight affected hex regions.

### Combat Positioning

- Movement is measured in hexes (1 hex = 5 ft).
- The server tracks `positionSnapshots` per round for replay in the combat log.
- Pathfinding uses a simple BFS on the axial grid respecting terrain costs.

---

## 8. Video / Voice / Chat Integration

### Video & Voice

- Browser WebRTC is used for peer-to-peer audio/video between players.
- The server acts as a **signaling server** only (SDP offer/answer, ICE candidates via WebSocket).
- STUN: Google public STUN servers for development.
- TURN: Coturn server required for production deployments behind strict NAT.
- Each player's media stream is managed by a `RTCPeerConnection` per peer in the client.

### Chat

- Text chat is routed through the server WebSocket hub.
- Messages are stored in the session log for post-session review.
- The AI DM monitors chat for rules questions and responds in character.
- Chat commands: `/roll 1d20`, `/whisper <player> <msg>`, `/ooc <out-of-character msg>`.

---

## 9. Security Considerations

- All game-state mutations are server-authoritative. The client sends **intentions**, not results.
- JWT tokens expire after 24 hours; refresh tokens are stored HttpOnly.
- Rate limiting on all REST endpoints (100 req/min per IP).
- WebSocket messages are validated against a JSON schema before processing.
- No secrets or API keys are sent to the client.
- OpenAI API key is server-side only.

---

## 10. Development Roadmap

| Phase | Scope |
|---|---|
| Phase 1 (MVP) | Auth, character creation, party lobby, basic hex map, text chat |
| Phase 2 | Combat engine, AI DM tactics, initiative tracking, combat log |
| Phase 3 | Trading, economy, NPC merchants |
| Phase 4 | Voice/video WebRTC integration |
| Phase 5 | AI DM narration, advanced encounter scripting |
| Phase 6 | Fog of war, crafting system, multiple adventure modules |
