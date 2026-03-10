# Monarch Garden Ecosystem - Minecraft Educational Addon

## Educational Concept
Interactive cause-and-effect learning tool showing how ecosystem components build on each other. Students learn by DOING - plant the right things, wildlife appears. Neglect them, wildlife leaves.

## Core Mechanics

### Tier 1: Foundation (Milkweed & Monarchs)
**Plant:** Milkweed  
**Attracts:** Monarch Butterflies  
**Teaches:** Host plants are essential - monarchs ONLY lay eggs on milkweed  
**Mechanic:** 
- Player plants milkweed seeds
- After growth, monarchs begin spawning nearby
- Monarchs lay eggs on milkweed
- Caterpillars appear, eat milkweed, form chrysalis, emerge as butterflies
- Remove milkweed = monarchs leave

### Tier 2: Fruit Trees (Pawpaw & Zebra Swallowtails)
**Plant:** Pawpaw Tree  
**Attracts:** Zebra Swallowtail Butterflies  
**Produces:** Pawpaw Fruit (edible)  
**Teaches:** Native plants support native wildlife AND provide food  
**Mechanic:**
- Plant pawpaw sapling
- Tree grows, produces fruit
- Zebra swallowtails spawn and visit tree
- Player can harvest fruit
- Butterflies also lay eggs, full lifecycle visible

### Tier 3: Decomposition Cycle (Compost → Flies → Frogs)
**Start:** Compost Bin  
**Stage 1:** Flies appear  
**Stage 2:** Frogs arrive (eat flies)  
**Teaches:** Decomposition is part of healthy ecosystems  
**Mechanic:**
- Player creates compost bin with organic waste
- Flies spawn around compost (visual indicator of decomposition)
- Frogs spawn to eat flies
- Compost eventually produces "rich soil" item
- Rich soil helps plants grow faster (bonus mechanic)

### Tier 4: Nectar Sources (Wildflowers & Pollinators)
**Plant:** Native Wildflower Mix  
**Attracts:** Multiple pollinators (bees, butterflies, hummingbirds)  
**Teaches:** Diverse plants = diverse wildlife  
**Mechanic:**
- Different wildflower colors bloom in sequence (season-long nectar)
- Various pollinators visit based on flower type
- Cross-pollination mechanic (flowers near each other produce seeds)
- Seeds can be harvested and replanted

### Tier 5: Predator Balance (Birds & Pest Control)
**Attract:** Birds (plant elderberry, add birdhouse)  
**Effect:** Reduce pest damage to garden  
**Teaches:** Predators are necessary for balance  
**Mechanic:**
- Some insects become "pests" that damage plants if unchecked
- Birds spawn when habitat is suitable
- Birds eat pests, protecting garden
- Visual indicator: healthier plants when birds present

## Educational Flow

### Beginner (5-10 minutes):
1. Plant milkweed
2. See monarchs appear
3. Watch lifecycle (egg → caterpillar → chrysalis → butterfly)
4. Learn: specific plants attract specific animals

### Intermediate (15-20 minutes):
1. Add pawpaw tree
2. Add wildflowers for nectar
3. Create diverse habitat
4. See multiple species interacting
5. Learn: biodiversity creates healthier systems

### Advanced (30+ minutes):
1. Build complete ecosystem
2. Manage compost cycle
3. Balance predators/prey
4. Optimize plant placement
5. Learn: ecosystems are interconnected, every piece matters

## In-Game Mechanics

### Habitat Health Meter
- Visual indicator showing ecosystem health
- Increases with diversity and proper care
- Decreases if plants die or wildlife leaves
- High health = bonus effects (faster growth, more wildlife)

### Field Guide Book
- In-game item players can craft
- Documents species they've attracted
- Provides facts about each species
- Encourages exploration and completionism

### Seasonal Changes
- Different plants bloom different times
- Wildlife behavior changes (migration)
- Teaches: ecosystems change throughout year
- Replayability: students see different things in different "seasons"

### Challenges/Quests
- "Attract 3 butterfly species"
- "Create a complete food web"
- "Support a frog population through breeding season"
- Rewards: rare seeds, decorative items, achievement badges

## Technical Implementation

### New Blocks:
- Milkweed (3 growth stages)
- Pawpaw Tree (sapling, tree, fruiting tree)
- Compost Bin (states: empty, active, ready)
- Wildflower varieties (8 types)
- Rich Soil block

### New Entities:
- Monarch Butterfly (adult)
- Monarch Caterpillar
- Monarch Chrysalis
- Zebra Swallowtail
- Native Bees
- Flies (small, spawn near compost)
- Frogs (spawn near water + flies)
- Generic native birds

### New Items:
- Milkweed Seeds
- Pawpaw Fruit
- Pawpaw Seeds
- Wildflower Seed Mix
- Rich Soil (fertilizer effect)
- Field Guide Book
- Habitat Health Monitor (shows ecosystem status)

### Spawn Logic:
- Plants determine spawns (not random)
- Distance-based (animals spawn near their required plants)
- Population limits (prevent overwhelming spawns)
- Despawn when requirements removed (teach consequences)

## Educational Value

### Concepts Taught:
1. **Host Plants**: Monarchs need milkweed specifically
2. **Biodiversity**: More plant types = more animal types
3. **Food Webs**: Compost → flies → frogs (predator/prey)
4. **Pollination**: Flowers need pollinators to reproduce
5. **Native Species**: Native plants support native wildlife
6. **Conservation**: Small actions (planting) have big impacts
7. **Ecosystem Balance**: Every piece has a role
8. **Seasonal Cycles**: Nature changes through the year

### Age Appropriateness:
- **5-8 years**: Simple cause-effect (plant = butterflies)
- **9-12 years**: Build complex habitats, understand connections
- **13+ years**: Optimize ecosystems, understand balance

### Curriculum Alignment:
- Science: Life cycles, ecosystems, food webs, conservation
- Math: Counting species, measuring growth rates, comparing outcomes
- Environmental Studies: Conservation, biodiversity, native species
- Systems Thinking: Understanding interconnections

## Implementation Plan

### Phase 1: Milkweed & Monarchs (Core Mechanic)
- Milkweed block with growth stages
- Monarch butterfly entity
- Monarch lifecycle (egg/caterpillar/chrysalis/butterfly)
- Spawn system based on milkweed presence
- Basic field guide

### Phase 2: Pawpaw & Wildflowers
- Pawpaw tree with fruit
- Zebra swallowtail entity
- 4 wildflower varieties
- Expanded field guide
- Nectar/pollination mechanics

### Phase 3: Compost Cycle
- Compost bin block
- Fly entity
- Frog entity
- Rich soil production
- Decomposition education

### Phase 4: Birds & Balance
- Bird entities
- Pest mechanics
- Predator/prey balance
- Habitat health system

### Phase 5: Polish & Education
- Quests/challenges
- Seasonal changes
- Teacher guide
- Instructional videos
- Assessment tools

## Files to Create

```
behavior_packs/monarch_garden/
├── manifest.json
├── entities/
│   ├── monarch_butterfly.json
│   ├── monarch_caterpillar.json
│   ├── zebra_swallowtail.json
│   ├── native_frog.json
│   └── garden_fly.json
├── blocks/
│   ├── milkweed.json
│   ├── pawpaw_tree.json
│   ├── compost_bin.json
│   └── wildflowers.json
├── items/
│   ├── seeds.json
│   └── field_guide.json
├── spawn_rules/
│   └── ecosystem_spawns.json
└── loot_tables/

resource_packs/monarch_garden/
├── manifest.json
├── textures/
│   ├── entity/
│   ├── blocks/
│   └── items/
├── models/
│   └── entity/
├── sounds/
└── texts/
    └── en_US.lang
```

This addon directly supports Camp Monarch's mission by teaching kids about monarch conservation through hands-on Minecraft gameplay. Perfect for the middle school presentations and beyond!
