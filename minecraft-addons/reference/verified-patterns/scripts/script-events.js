/**
 * VERIFIED SCRIPT EVENTS - What's available in @minecraft/server 2.0.0 stable
 * 
 * CRITICAL: These are the ACTUAL events. Don't use deprecated/removed ones!
 * Last verified: January 2026
 */

import { world, system } from "@minecraft/server";

// ============================================================
// WORLD AFTER EVENTS - These all work in stable API
// ============================================================

// Player breaks a block
world.afterEvents.playerBreakBlock.subscribe((event) => {
    const block = event.block;
    const player = event.player;
    const brokenBlockId = event.brokenBlockPermutation.type.id;
    console.warn(`Player ${player.name} broke ${brokenBlockId}`);
});

// Player places a block
world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const block = event.block;
    const player = event.player;
    console.warn(`Player ${player.name} placed ${block.typeId}`);
});

// Player joins world
world.afterEvents.playerJoin.subscribe((event) => {
    const player = event.playerName;
    console.warn(`${player} joined`);
});

// Player spawns (including respawn)
world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    const initialSpawn = event.initialSpawn;
    if (initialSpawn) {
        console.warn(`${player.name} spawned for first time`);
    }
});

// Entity spawns
world.afterEvents.entitySpawn.subscribe((event) => {
    const entity = event.entity;
    console.warn(`Entity spawned: ${entity.typeId}`);
});

// Entity dies
world.afterEvents.entityDie.subscribe((event) => {
    const entity = event.deadEntity;
    console.warn(`Entity died: ${entity.typeId}`);
});

// Player interacts with block (right-click)
world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const block = event.block;
    const player = event.player;
    console.warn(`${player.name} interacted with ${block.typeId}`);
});

// ============================================================
// WORLD BEFORE EVENTS - For cancelling actions
// ============================================================

// Before player breaks block (can cancel)
world.beforeEvents.playerBreakBlock.subscribe((event) => {
    // event.cancel = true; // Prevents the break
});

// Before explosion (can cancel or modify)
world.beforeEvents.explosion.subscribe((event) => {
    // event.cancel = true; // Prevents explosion
});

// ============================================================
// SYSTEM EVENTS - Script events from entities/commands
// ============================================================

// Receive scriptevent commands
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === "namespace:my_event") {
        const entity = event.sourceEntity;
        const block = event.sourceBlock;
        console.warn(`Received scriptevent: ${event.id}`);
    }
});

// ============================================================
// DEPRECATED/REMOVED - DO NOT USE
// ============================================================

// world.beforeEvents.chatSend - REMOVED in stable API
// world.afterEvents.blockBreak - Use playerBreakBlock instead
// world.afterEvents.blockPlace - Use playerPlaceBlock instead

// ============================================================
// SYSTEM TIMING
// ============================================================

// Run every tick
system.runInterval(() => {
    // Called every tick (20 times per second)
}, 1);

// Run after delay
system.runTimeout(() => {
    // Called once after 20 ticks (1 second)
}, 20);

// Run on next tick (for deferred execution)
system.run(() => {
    // Called on next tick
});
