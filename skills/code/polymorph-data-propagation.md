# Skill: Polymorph / Beast Form Data Propagation

## Category
code

## Tags
#dnd #combat #polymorph #beast-form #data-propagation #multiattack

## Description
When adding any new field to beast form data in the DnD combat engine, that field must be explicitly propagated through ALL polymorph code paths. The engine has 3 distinct paths where beast form data is copied, and missing any one causes silent bugs where the field exists in data but never reaches the combatant at runtime.

## Prerequisites
- Understanding of the polymorph flow in `ActionResolver.js`
- Understanding of beast form data in `spells.js`

## Steps
1. **Add the field to beast form data** in `server/combat/data/spells.js`
2. **Propagate through self-target polymorph update** — where the combatant's stats are replaced with beast form stats
3. **Propagate through prePolymorphState save (enemy target)** — where original stats are saved before replacement
4. **Propagate through prePolymorphState save (self target)** — same save path but for self-targeting polymorph
5. **Propagate through polymorph revert path** — where original stats are restored when the form drops
6. **Update TurnMenu.js** if the field affects available actions or menu options
7. **Write tests** that verify the field survives the full polymorph → action → revert cycle

## The Three Polymorph Code Paths (ActionResolver.js)
```
Path 1: Self-target update (line ~X)
  combatant.newField = beastForm.newField || null;

Path 2: prePolymorphState save - enemy (line ~Y)  
  prePolymorphState: { ...existing, newField: target.newField }

Path 3: prePolymorphState save - self (line ~Z)
  prePolymorphState: { ...existing, newField: caster.newField }
```

## Common Pitfalls
- Adding the field to data but forgetting to copy it during polymorph application
- Copying it during application but not saving it in prePolymorphState (so revert breaks)
- Handling the enemy polymorph path but not the self polymorph path (or vice versa)
- Not testing with `|| null` fallback for forms that don't have the field

## Example: multiattackWeapons (March 15, 2026)
- Added `multiattackWeapons` to T-Rex (`['Bite','Tail']`) and Giant Ape (`['Fist','Fist']`)
- Bug: polymorph application didn't copy `multiattackWeapons` to combatant
- Fix: added to all 3 paths + TurnMenu weapon selection logic
- Test: verified Giant Ape gets Fist×2 multiattack and Rock as separate action

## Related Skills
- `instructions/application-architecture.md` — service layer testing philosophy

## Origin
March 15, 2026 — Giant Ape multiattack was broken because `multiattackWeapons` wasn't propagated through polymorph paths. Discovered that ANY new beast form field requires touching all 3 code paths.
