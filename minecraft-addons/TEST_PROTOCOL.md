# Monarch Garden Addon - Test Protocol

## Test Standards

**Rule:** No untested work is considered complete. JSON validation is NOT sufficient.

## Prerequisites

1. Minecraft Bedrock Edition installed
2. MCP Python server running (`scripts/minecraft/mcp-server`)
3. MCP behavior pack installed in Minecraft world
4. Test world created with:
   - Monarch Garden behavior pack enabled
   - Monarch Garden resource pack enabled
   - Experimental gameplay enabled
   - Beta APIs enabled

## Test Suite

### Phase 1: Installation Test
- [ ] Copy behavior pack to Minecraft directory
- [ ] Copy resource pack to Minecraft directory
- [ ] Create new test world
- [ ] Activate both packs successfully
- [ ] World loads without errors

### Phase 2: Block Tests
- [ ] Give milkweed seeds: `/give @s monarch:milkweed_seeds`
- [ ] Plant seeds on grass/dirt block
- [ ] Seeds create milkweed block (stage 0)
- [ ] Milkweed grows to stage 1
- [ ] Milkweed grows to stage 2 (mature)
- [ ] Breaking mature milkweed drops seeds (loot table)

### Phase 3: Entity Spawn Tests
- [ ] Butterflies spawn naturally near mature milkweed
- [ ] Butterflies render (even if using placeholder parrot model)
- [ ] Butterflies fly around milkweed
- [ ] Butterflies are attracted to milkweed (tempt behavior)

### Phase 4: Lifecycle Tests
- [ ] Butterfly lands on milkweed block
- [ ] Butterfly lays egg on milkweed (`lay_egg` behavior fires)
- [ ] Egg entity spawns on milkweed
- [ ] Egg hatches into caterpillar after 6 seconds
- [ ] Caterpillar transforms to chrysalis after 30 seconds
- [ ] Chrysalis emerges as butterfly after 20 seconds
- [ ] Complete cycle: butterfly → egg → caterpillar → chrysalis → butterfly

### Phase 5: Educational Accuracy Tests
- [ ] Lifecycle timing is visible and demonstrable
- [ ] Cause-and-effect clear: no milkweed = no butterflies
- [ ] Kids can observe full lifecycle without commands
- [ ] Behavior matches real monarch biology (eggs on milkweed only)

## Test Execution Plan

1. **Start MCP server** - Provides API for verification commands
2. **Install addon to Minecraft** - Manual file copy or pack manager
3. **Create test world** - Enable packs and experimental features
4. **Run manual tests** - Player observations and `/testfor` commands
5. **Document results** - Screenshots, command outputs, timing measurements
6. **Fix any failures** - Return to development, fix, re-test
7. **Only after all pass** - Mark as tested and ready

## Test Results

**Status:** NOT YET RUN

**Date:** TBD

**Tester:** Sis (autonomous)

**Results:** Pending execution
