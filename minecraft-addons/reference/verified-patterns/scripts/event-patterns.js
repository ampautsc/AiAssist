// ================================================================
// MINECRAFT BEDROCK EVENT PATTERNS - COPY-PASTE READY
// ================================================================
// @minecraft/server 2.0.0 stable
// Last Updated: January 24, 2026
// ================================================================

import { world, system } from "@minecraft/server";

// ================================================================
// WORLD AFTER EVENTS - Most Common Patterns
// ================================================================

// --- PLAYER EVENTS ---

// Player Joins World
world.afterEvents.playerJoin.subscribe((event) => {
    const playerName = event.playerName;
    world.sendMessage(`§a${playerName} joined the game!`);
});

// Player Spawns (initial spawn or respawn)
world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    const isInitialSpawn = event.initialSpawn;
    
    if (isInitialSpawn) {
        // First time spawning in this session
    }
});

// Player Leaves World
world.afterEvents.playerLeave.subscribe((event) => {
    const playerName = event.playerName;
    world.sendMessage(`§c${playerName} left the game`);
});

// Player Changes Dimension
world.afterEvents.playerDimensionChange.subscribe((event) => {
    const player = event.player;
    const fromDim = event.fromDimension.id;
    const toDim = event.toDimension.id;
});

// --- BLOCK EVENTS ---

// Player Breaks Block
world.afterEvents.playerBreakBlock.subscribe((event) => {
    const player = event.player;
    const blockType = event.brokenBlockPermutation.type.id;
    const location = event.block.location;
});

// Player Places Block
world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const player = event.player;
    const block = event.block;
    const blockType = block.typeId;
});

// Player Interacts With Block (right-click)
world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const player = event.player;
    const block = event.block;
    const itemUsed = event.itemStack?.typeId;
});

// --- ENTITY EVENTS ---

// Entity Spawns (with filtering)
world.afterEvents.entitySpawn.subscribe((event) => {
    const entity = event.entity;
    const cause = event.cause; // "Spawned", "Born", "Event", etc.
    
    // Filter by type
    if (entity.typeId === "minecraft:zombie") {
        // Handle zombie spawn
    }
    
    // Filter by family (if has component)
    // Use entity.matches() for complex filtering
});

// Entity Dies
world.afterEvents.entityDie.subscribe((event) => {
    const deadEntity = event.deadEntity;
    const killer = event.damageSource.damagingEntity;
    const cause = event.damageSource.cause;
    
    if (killer?.typeId === "minecraft:player") {
        // Player killed this entity
    }
});

// Entity Takes Damage
world.afterEvents.entityHurt.subscribe((event) => {
    const entity = event.hurtEntity;
    const damage = event.damage;
    const cause = event.damageSource.cause;
    const attacker = event.damageSource.damagingEntity;
});

// Entity Health Changed (any change)
world.afterEvents.entityHealthChanged.subscribe((event) => {
    const entity = event.entity;
    const oldHealth = event.oldValue;
    const newHealth = event.newValue;
});

// Entity Loads Into World
world.afterEvents.entityLoad.subscribe((event) => {
    const entity = event.entity;
    // Good for initializing entity state
});

// Entity Removed From World
world.afterEvents.entityRemove.subscribe((event) => {
    const removedEntityId = event.removedEntityId;
    const typeId = event.typeId;
    // Cleanup, tracking
});

// --- INTERACTION EVENTS ---

// Player Interacts With Entity
world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const player = event.player;
    const target = event.target;
    const itemUsed = event.itemStack?.typeId;
});

// Item Used
world.afterEvents.itemUse.subscribe((event) => {
    const player = event.source;
    const item = event.itemStack;
});

// --- COMBAT EVENTS ---

// Entity Melee Hits Entity
world.afterEvents.entityHitEntity.subscribe((event) => {
    const attacker = event.damagingEntity;
    const target = event.hitEntity;
});

// Entity Melee Hits Block
world.afterEvents.entityHitBlock.subscribe((event) => {
    const entity = event.damagingEntity;
    const block = event.hitBlock;
});

// Projectile Hits Entity
world.afterEvents.projectileHitEntity.subscribe((event) => {
    const projectile = event.projectile;
    const target = event.getEntityHit()?.entity;
    const shooter = event.source;
});

// Projectile Hits Block
world.afterEvents.projectileHitBlock.subscribe((event) => {
    const projectile = event.projectile;
    const block = event.getBlockHit()?.block;
    const shooter = event.source;
});

// --- REDSTONE/MECHANISM EVENTS ---

// Button Pushed
world.afterEvents.buttonPush.subscribe((event) => {
    const block = event.block;
    const source = event.source; // entity that pushed
});

// Lever Toggled
world.afterEvents.leverAction.subscribe((event) => {
    const block = event.block;
    const isPowered = event.isPowered;
    const player = event.player;
});

// Pressure Plate Pushed
world.afterEvents.pressurePlatePush.subscribe((event) => {
    const block = event.block;
    const source = event.source;
    const previousPower = event.previousRedstonePower;
    const currentPower = event.redstonePower;
});

// Pressure Plate Released
world.afterEvents.pressurePlatePop.subscribe((event) => {
    const block = event.block;
    const previousPower = event.previousRedstonePower;
});

// Tripwire Triggered
world.afterEvents.tripWireTrip.subscribe((event) => {
    const block = event.block;
    const sources = event.sources; // entities that tripped it
});

// Piston Activates
world.afterEvents.pistonActivate.subscribe((event) => {
    const block = event.block;
    const isExpanding = event.isExpanding;
    const piston = event.piston;
});

// Target Block Hit
world.afterEvents.targetBlockHit.subscribe((event) => {
    const block = event.block;
    const hitVector = event.hitVector;
    const power = event.redstonePower;
    const source = event.source;
});

// --- EXPLOSION EVENTS ---

// After Explosion
world.afterEvents.explosion.subscribe((event) => {
    const dimension = event.dimension;
    const source = event.source; // entity that caused it
    const impactedBlocks = event.getImpactedBlocks();
});

// Block Destroyed By Explosion
world.afterEvents.blockExplode.subscribe((event) => {
    const block = event.block;
    const explodedPermutation = event.explodedBlockPermutation;
    const source = event.source;
});

// --- EFFECT EVENTS ---

// Effect Added To Entity
world.afterEvents.effectAdd.subscribe((event) => {
    const entity = event.entity;
    const effect = event.effect;
    const effectType = effect.typeId;
    const amplifier = effect.amplifier;
    const duration = effect.duration;
});

// --- WORLD EVENTS ---

// Weather Changes
world.afterEvents.weatherChange.subscribe((event) => {
    const dimension = event.dimension;
    const wasRaining = event.previousWeatherState.raining;
    const isRaining = event.newWeatherState.raining;
    const wasThundering = event.previousWeatherState.lightning;
    const isThundering = event.newWeatherState.lightning;
});

// World Loads
world.afterEvents.worldLoad.subscribe((event) => {
    // World just loaded - good for one-time initialization
});

// Game Rule Changes
world.afterEvents.gameRuleChange.subscribe((event) => {
    const rule = event.rule;
    const value = event.value;
});


// ================================================================
// WORLD BEFORE EVENTS - Cancelable Events
// ================================================================

// IMPORTANT: Cannot modify game state (spawn entities, teleport, etc.)
// in beforeEvents! Can only read and cancel.

// Cancel Breaking Specific Blocks
world.beforeEvents.playerBreakBlock.subscribe((event) => {
    if (event.block.typeId === "minecraft:diamond_block") {
        event.cancel = true;
    }
});

// Cancel Item Use
world.beforeEvents.itemUse.subscribe((event) => {
    if (event.itemStack.typeId === "minecraft:ender_pearl") {
        event.cancel = true;
    }
});

// Modify Explosion (remove block damage)
world.beforeEvents.explosion.subscribe((event) => {
    // Remove all blocks from explosion
    event.setImpactedBlocks([]);
});

// Cancel Effect Being Added
world.beforeEvents.effectAdd.subscribe((event) => {
    if (event.effect.typeId === "minecraft:poison") {
        event.cancel = true;
    }
});

// Cancel Entity Interaction
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    if (event.target.typeId === "minecraft:villager") {
        event.cancel = true; // No trading!
    }
});


// ================================================================
// SYSTEM EVENTS - Script Event Bridge
// ================================================================

// Listen for /scriptevent commands
system.afterEvents.scriptEventReceive.subscribe((event) => {
    const namespace = event.id.split(":")[0];
    const command = event.id.split(":")[1];
    const message = event.message;
    const source = event.sourceEntity;
    
    if (event.id === "monarch:debug") {
        world.sendMessage(`Debug: ${message}`);
    }
    
    if (event.id === "monarch:spawn_butterfly") {
        // Handle spawn command
        if (source) {
            const location = source.location;
            const dimension = source.dimension;
            dimension.spawnEntity("monarch:butterfly", location);
        }
    }
});

// Usage in-game:
// /scriptevent monarch:debug Hello World
// /scriptevent monarch:spawn_butterfly


// ================================================================
// BLOCK CUSTOM COMPONENTS - Event-Driven Block Behavior
// ================================================================

world.beforeEvents.worldInitialize.subscribe((event) => {
    
    // Register a custom block component
    event.blockRegistry.registerCustomComponent("monarch:interactive_block", {
        
        // Called when player right-clicks the block
        onPlayerInteract(event, params) {
            const player = event.player;
            const block = event.block;
            const face = event.face;
            const faceLocation = event.faceLocation;
            
            world.sendMessage(`${player.name} clicked ${block.typeId}`);
        },
        
        // Called when any entity steps onto the block
        onStepOn(event, params) {
            const entity = event.entity;
            const block = event.block;
            
            if (entity.typeId === "minecraft:player") {
                // Player stepped on
            }
        },
        
        // Called when entity steps off the block
        onStepOff(event, params) {
            const entity = event.entity;
            const block = event.block;
        },
        
        // Called when entity falls onto the block
        onEntityFallOn(event, params) {
            const entity = event.entity;
            const fallDistance = event.fallDistance;
        },
        
        // Called when block is placed
        onPlace(event, params) {
            const block = event.block;
            const previousBlock = event.previousBlock;
        },
        
        // Called when block is destroyed (any cause)
        onBreak(event, params) {
            const block = event.block;
            const player = event.player; // may be undefined
            const brokenPermutation = event.brokenBlockPermutation;
        },
        
        // Called when player breaks the block specifically
        onPlayerBreak(event, params) {
            const player = event.player;
            const block = event.block;
        },
        
        // Called on random tick (for blocks that tick)
        onRandomTick(event, params) {
            const block = event.block;
            // Good for: growth, decay, random effects
        },
        
        // Called when redstone signal changes
        // Requires minecraft:redstone_consumer component on block JSON
        onRedstoneUpdate(event, params) {
            const block = event.block;
            const isPowered = event.isPowered;
        },
        
        // BEFORE player places (can cancel)
        beforeOnPlayerPlace(event, params) {
            // event.cancel = true; to prevent placement
        }
    });
});


// ================================================================
// ITEM CUSTOM COMPONENTS - Event-Driven Item Behavior
// ================================================================

world.beforeEvents.worldInitialize.subscribe((event) => {
    
    event.itemRegistry.registerCustomComponent("monarch:magic_item", {
        
        // Called when item is used (right-click in air)
        onUse(event, params) {
            const player = event.source;
            const item = event.itemStack;
        },
        
        // Called when item is used on a block
        onUseOn(event, params) {
            const player = event.source;
            const block = event.block;
            const face = event.blockFace;
            const item = event.itemStack;
        },
        
        // Called when item hits an entity
        onHitEntity(event, params) {
            const attacker = event.attackingEntity;
            const target = event.hitEntity;
            const item = event.itemStack;
        },
        
        // Called when item is used to mine a block
        onMineBlock(event, params) {
            const player = event.source;
            const block = event.block;
            const item = event.itemStack;
        },
        
        // Called when food item is consumed
        onConsume(event, params) {
            const player = event.source;
            const item = event.itemStack;
        },
        
        // Called when chargeable item completes charging
        onCompleteUse(event, params) {
            const player = event.source;
            const item = event.itemStack;
            const useDuration = event.useDuration;
        },
        
        // Called before durability damage is applied
        onBeforeDurabilityDamage(event, params) {
            const player = event.attackingEntity;
            const target = event.hitEntity;
            const durabilityDamage = event.durabilityDamage;
            // Can modify: event.durabilityDamage = 0; // No durability loss
        }
    });
});


// ================================================================
// SYSTEM TIMING - Non-Polling Delays
// ================================================================

// One-time delay (20 ticks = 1 second)
system.runTimeout(() => {
    world.sendMessage("1 second has passed!");
}, 20);

// Repeating interval (use sparingly!)
const intervalId = system.runInterval(() => {
    // This runs every second - try to use events instead!
}, 20);

// Cancel an interval
system.clearRun(intervalId);

// Run next tick (for deferred execution from beforeEvents)
system.run(() => {
    // This runs next tick
});


// ================================================================
// FILTERED SUBSCRIPTIONS - Performance Optimization
// ================================================================

// Entity spawn with type filter
world.afterEvents.entitySpawn.subscribe(
    (event) => {
        // Only called for zombies
        const zombie = event.entity;
    },
    {
        entityTypes: ["minecraft:zombie"]
    }
);

// Player break block with block filter
world.afterEvents.playerBreakBlock.subscribe(
    (event) => {
        // Only called for diamond blocks
    },
    {
        blockTypes: ["minecraft:diamond_block"]
    }
);

// Entity hurt with entity filter
world.afterEvents.entityHurt.subscribe(
    (event) => {
        // Only called when players are hurt
    },
    {
        entityTypes: ["minecraft:player"]
    }
);


// ================================================================
// UNSUBSCRIBE PATTERN
// ================================================================

// Store subscription for later removal
const subscription = world.afterEvents.playerJoin.subscribe((event) => {
    // ...
});

// Later, unsubscribe
// world.afterEvents.playerJoin.unsubscribe(subscription);
