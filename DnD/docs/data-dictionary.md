# MMO D&D — Data Dictionary

All data models are documented here. The canonical representation for development is JSON stored
in `server/data/`. Production migrations target a relational schema (PostgreSQL).

---

## 1. Player / User

Represents an account. One account can own multiple characters.

```json
{
  "id": "uuid-v4",
  "username": "string (unique, 3-20 chars)",
  "email": "string (unique)",
  "passwordHash": "bcrypt string",
  "createdAt": "ISO-8601 timestamp",
  "lastLoginAt": "ISO-8601 timestamp",
  "roles": ["player"],
  "preferences": {
    "audioEnabled": true,
    "videoEnabled": true,
    "chatNotifications": true
  }
}
```

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| username | string | Display name in-game |
| email | string | Login credential |
| passwordHash | string | Never exposed to client |
| roles | string[] | `player`, `dm`, `admin` |

---

## 2. Character

A player-owned D&D 5e character. One player may own multiple characters but may only bring one per session.

```json
{
  "id": "uuid-v4",
  "ownerId": "player-uuid",
  "name": "Aldric Ironforge",
  "race": "Dwarf",
  "subrace": "Mountain Dwarf",
  "class": "Fighter",
  "subclass": "Battle Master",
  "level": 5,
  "experiencePoints": 6500,
  "background": "Soldier",
  "alignment": "Lawful Good",

  "abilityScores": {
    "strength":     16,
    "dexterity":    12,
    "constitution": 18,
    "intelligence":  9,
    "wisdom":       13,
    "charisma":      8
  },

  "savingThrowProficiencies": ["strength", "constitution"],
  "skillProficiencies": ["athletics", "intimidation", "perception", "survival"],
  "languages": ["Common", "Dwarvish"],

  "hitPoints": {
    "max": 52,
    "current": 40,
    "temporary": 0
  },

  "armorClass": 18,
  "speed": 25,
  "initiative": 1,
  "proficiencyBonus": 3,

  "hitDice": {
    "dieType": "d10",
    "total": 5,
    "remaining": 3
  },

  "deathSaves": {
    "successes": 0,
    "failures": 0
  },

  "conditions": [],

  "spellcasting": null,

  "classFeatures": ["Second Wind", "Action Surge", "Martial Archetype", "Extra Attack", "Battle Master Maneuvers"],
  "maneuverDice": { "dieType": "d8", "total": 5, "remaining": 5 },

  "inventory": [
    {
      "itemId": "item-uuid",
      "quantity": 1,
      "equipped": true,
      "slot": "mainHand"
    }
  ],

  "currency": {
    "copper": 0,
    "silver": 15,
    "electrum": 0,
    "gold": 47,
    "platinum": 1
  },

  "attunedItems": ["item-uuid"],

  "notes": "string",
  "backstory": "string",

  "positionHistory": [],

  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### Spellcasting Sub-Object (for spellcasters)

```json
{
  "ability": "intelligence",
  "spellSaveDC": 14,
  "spellAttackBonus": 6,
  "spellSlots": {
    "1": { "total": 4, "remaining": 2 },
    "2": { "total": 3, "remaining": 3 },
    "3": { "total": 2, "remaining": 0 }
  },
  "spellsKnown": ["spell-id-1", "spell-id-2"],
  "preparedSpells": ["spell-id-1"],
  "cantrips": ["spell-id-3"]
}
```

---

## 3. Party

A group of 4–6 players adventuring together.

```json
{
  "id": "uuid-v4",
  "name": "The Iron Circle",
  "leaderId": "player-uuid",
  "memberIds": ["player-uuid-1", "player-uuid-2"],
  "characterIds": ["char-uuid-1", "char-uuid-2"],
  "maxSize": 6,
  "status": "open | full | in_session | completed | disbanded",
  "currentSessionId": "session-uuid | null",
  "adventureModule": "Lost Mine of Phandelver",
  "campaignFlags": {
    "questsCompleted": [],
    "npcsMet": [],
    "locationsDiscovered": []
  },
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

| Field | Type | Description |
|---|---|---|
| leaderId | UUID | Player with kick/start authority |
| status | enum | Lifecycle state |
| campaignFlags | object | Shared party-level progress |

---

## 4. Session / Encounter

A single play session. Persisted for replay and audit.

```json
{
  "id": "uuid-v4",
  "partyId": "party-uuid",
  "type": "exploration | combat | social | rest",
  "status": "pending | active | paused | completed",

  "mapId": "map-uuid",
  "startPosition": { "q": 0, "r": 0 },

  "participants": [
    {
      "characterId": "char-uuid",
      "playerId": "player-uuid",
      "isConnected": true,
      "position": { "q": 2, "r": -1 },
      "conditions": []
    }
  ],

  "creatures": [
    {
      "instanceId": "uuid-v4",
      "creatureId": "goblin",
      "name": "Goblin Scout",
      "hp": { "max": 7, "current": 7 },
      "position": { "q": 5, "r": 2 },
      "conditions": [],
      "isAlive": true
    }
  ],

  "initiative": [
    { "id": "char-uuid", "type": "character", "roll": 18, "modifier": 2, "total": 20 },
    { "id": "instance-uuid", "type": "creature", "roll": 12, "modifier": 1, "total": 13 }
  ],

  "currentTurnIndex": 0,
  "round": 1,

  "positionSnapshots": [
    {
      "round": 1,
      "turn": 0,
      "positions": [
        { "id": "char-uuid", "type": "character", "q": 2, "r": -1 },
        { "id": "instance-uuid", "type": "creature", "q": 5, "r": 2 }
      ]
    }
  ],

  "combatLog": [
    {
      "round": 1,
      "turn": 0,
      "actorId": "char-uuid",
      "action": "attack",
      "targetId": "instance-uuid",
      "roll": 15,
      "modifier": 5,
      "total": 20,
      "hit": true,
      "damage": 8,
      "damageType": "slashing",
      "description": "Aldric swings his battleaxe and connects for 8 slashing damage!"
    }
  ],

  "chatLog": [
    { "from": "player-uuid", "message": "I attack the goblin!", "timestamp": "ISO-8601" }
  ],

  "dmNarration": [
    { "text": "The goblins surge forward from the shadows...", "timestamp": "ISO-8601" }
  ],

  "loot": [],

  "startedAt": "ISO-8601",
  "endedAt": "ISO-8601 | null",
  "durationSeconds": 3600
}
```

---

## 5. Item / Equipment

Catalog entry for any obtainable item.

```json
{
  "id": "item-uuid",
  "name": "Battleaxe",
  "type": "weapon | armor | potion | spell-component | tool | treasure | misc",
  "subtype": "martial-melee",
  "rarity": "common | uncommon | rare | very-rare | legendary | artifact",
  "requiresAttunement": false,

  "weight": 4.0,
  "cost": { "amount": 10, "currency": "gold" },

  "description": "A versatile martial melee weapon with a 1d8 slashing damage die.",

  "weaponProperties": {
    "damageDie": "1d8",
    "damageType": "slashing",
    "versatile": "1d10",
    "properties": ["versatile"]
  },

  "armorProperties": null,

  "magic": false,
  "magicBonus": 0,
  "charges": null,

  "effects": [],

  "imageUrl": null
}
```

### Magic Item Effects Sub-Array

```json
[
  {
    "trigger": "onEquip | onAttack | onHit | onDamage | onSave | passive",
    "effectType": "bonusToHit | bonusDamage | damageImmunity | advantageOnSave | ...",
    "value": "+2",
    "condition": null
  }
]
```

---

## 6. Trade

A direct player-to-player trade proposal.

```json
{
  "id": "uuid-v4",
  "status": "pending | accepted | rejected | cancelled | expired",

  "proposerId": "player-uuid",
  "proposerCharacterId": "char-uuid",

  "receiverId": "player-uuid",
  "receiverCharacterId": "char-uuid",

  "proposerOffer": [
    { "itemId": "item-uuid", "quantity": 1 },
    { "currency": "gold", "amount": 50 }
  ],

  "receiverRequest": [
    { "itemId": "item-uuid-2", "quantity": 2 }
  ],

  "sessionId": "session-uuid | null",
  "partyId": "party-uuid",

  "createdAt": "ISO-8601",
  "expiresAt": "ISO-8601",
  "resolvedAt": "ISO-8601 | null"
}
```

---

## 7. World / Map

Describes a navigable area with hex tile data.

```json
{
  "id": "map-uuid",
  "name": "Goblin Cave Level 1",
  "description": "A damp cave complex filled with goblin warrens.",
  "type": "dungeon | wilderness | town | ocean",

  "hexSize": 40,
  "gridWidth": 20,
  "gridHeight": 15,

  "tiles": [
    {
      "q": 0,
      "r": 0,
      "terrain": "open | difficult | wall | water | forest | lava | void",
      "elevation": 0,
      "features": ["torch", "rubble"],
      "explored": false,
      "visible": false
    }
  ],

  "zones": [
    {
      "id": "zone-uuid",
      "name": "Chieftain's Chamber",
      "hexes": [{ "q": 5, "r": 3 }, { "q": 5, "r": 4 }],
      "triggerOnEnter": "encounter | narration | loot | null"
    }
  ],

  "spawnPoints": [
    { "id": "spawn-1", "q": 2, "r": 2, "for": "party" },
    { "id": "spawn-2", "q": 10, "r": 8, "for": "enemies" }
  ],

  "exits": [
    { "id": "exit-1", "q": 0, "r": 0, "leadsTo": "map-uuid-2", "direction": "north" }
  ],

  "ambientCreatures": ["goblin", "goblin", "goblin-boss"],

  "module": "Lost Mine of Phandelver",
  "createdAt": "ISO-8601"
}
```

---

## 8. Spell

Spell definition (separate catalog, referenced by character spellbooks).

```json
{
  "id": "spell-fireball",
  "name": "Fireball",
  "level": 3,
  "school": "evocation",
  "castingTime": "1 action",
  "range": "150 feet",
  "components": ["V", "S", "M"],
  "materialComponent": "A tiny ball of bat guano and sulfur",
  "duration": "Instantaneous",
  "concentration": false,
  "description": "A bright streak flashes from your pointing finger to a point you choose...",
  "higherLevels": "When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.",
  "areaOfEffect": { "type": "sphere", "radius": 20 },
  "savingThrow": { "ability": "dexterity", "onSave": "half-damage" },
  "damage": { "dice": "8d6", "type": "fire" },
  "classes": ["sorcerer", "wizard"]
}
```

---

## 9. Creature (Monster Stat Block)

Template used to instantiate enemies in encounters.

```json
{
  "id": "goblin",
  "name": "Goblin",
  "type": "humanoid",
  "subtype": "goblinoid",
  "size": "small",
  "alignment": "neutral evil",
  "challengeRating": 0.25,
  "experiencePoints": 50,

  "armorClass": 15,
  "armorType": "leather armor, shield",
  "hitDice": "2d6",
  "hitPointsAverage": 7,
  "speed": { "walk": 30 },

  "abilityScores": {
    "strength": 8,
    "dexterity": 14,
    "constitution": 10,
    "intelligence": 10,
    "wisdom": 8,
    "charisma": 8
  },

  "savingThrows": {},
  "skills": { "stealth": 6 },
  "damageImmunities": [],
  "conditionImmunities": [],
  "senses": { "darkvision": 60, "passivePerception": 9 },
  "languages": ["Common", "Goblin"],

  "traits": [
    {
      "name": "Nimble Escape",
      "description": "The goblin can take the Disengage or Hide action as a bonus action on each of its turns."
    }
  ],

  "actions": [
    {
      "name": "Scimitar",
      "type": "meleeWeaponAttack",
      "attackBonus": 4,
      "reach": 5,
      "target": "one target",
      "damage": [{ "dice": "1d6", "modifier": 2, "type": "slashing" }]
    },
    {
      "name": "Shortbow",
      "type": "rangedWeaponAttack",
      "attackBonus": 4,
      "range": { "normal": 80, "long": 320 },
      "target": "one target",
      "damage": [{ "dice": "1d6", "modifier": 2, "type": "piercing" }]
    }
  ],

  "bonusActions": ["Nimble Escape"],
  "reactions": [],
  "legendaryActions": null,

  "lootTable": [
    { "itemId": "scimitar", "chance": 0.5, "quantity": 1 },
    { "currency": "gold", "amount": "1d4", "chance": 1.0 }
  ]
}
```
