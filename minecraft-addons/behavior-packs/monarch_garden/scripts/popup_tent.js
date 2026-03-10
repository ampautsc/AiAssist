/**
 * Pop-up Tent - Deployable camping tent with barrier block walls
 * 
 * Simple approach: Uses barrier blocks for walls/roof that block mobs
 * Door is a barrier block that gets removed/placed on toggle
 */

import { world, system } from "@minecraft/server";

console.warn("[Pop-up Tent] Module loaded");

/**
 * Place barrier blocks around the tent for walls and roof
 * Tent is 3x3x3 blocks (centered on entity)
 */
function setupBarriers(tentEntity) {
    const dim = tentEntity.dimension;
    const loc = tentEntity.location;
    const baseX = Math.floor(loc.x);
    const baseY = Math.floor(loc.y);
    const baseZ = Math.floor(loc.z);
    
    console.warn(`[Pop-up Tent] Setting up barriers at ${baseX}, ${baseY}, ${baseZ}`);
    
    try {
        // Place barriers using fill command - walls only (not interior)
        // Back wall (z+1)
        dim.runCommand(`fill ${baseX-1} ${baseY} ${baseZ+1} ${baseX+1} ${baseY+2} ${baseZ+1} barrier`);
        // Left wall (x-1) 
        dim.runCommand(`fill ${baseX-1} ${baseY} ${baseZ-1} ${baseX-1} ${baseY+2} ${baseZ+1} barrier`);
        // Right wall (x+1)
        dim.runCommand(`fill ${baseX+1} ${baseY} ${baseZ-1} ${baseX+1} ${baseY+2} ${baseZ+1} barrier`);
        // Front wall sides (leave door gap in middle)
        dim.runCommand(`setblock ${baseX-1} ${baseY} ${baseZ-1} barrier`);
        dim.runCommand(`setblock ${baseX-1} ${baseY+1} ${baseZ-1} barrier`);
        dim.runCommand(`setblock ${baseX-1} ${baseY+2} ${baseZ-1} barrier`);
        dim.runCommand(`setblock ${baseX+1} ${baseY} ${baseZ-1} barrier`);
        dim.runCommand(`setblock ${baseX+1} ${baseY+1} ${baseZ-1} barrier`);
        dim.runCommand(`setblock ${baseX+1} ${baseY+2} ${baseZ-1} barrier`);
        // Roof
        dim.runCommand(`fill ${baseX-1} ${baseY+3} ${baseZ-1} ${baseX+1} ${baseY+3} ${baseZ+1} barrier`);
        // Door barrier (closed by default)
        dim.runCommand(`setblock ${baseX} ${baseY} ${baseZ-1} barrier`);
        dim.runCommand(`setblock ${baseX} ${baseY+1} ${baseZ-1} barrier`);
        
        console.warn("[Pop-up Tent] Barriers placed successfully");
    } catch (e) {
        console.warn(`[Pop-up Tent] Error placing barriers: ${e}`);
    }
}

/**
 * Remove all barrier blocks when tent is destroyed
 */
function cleanupBarriers(tentEntity) {
    const dim = tentEntity.dimension;
    const loc = tentEntity.location;
    const baseX = Math.floor(loc.x);
    const baseY = Math.floor(loc.y);
    const baseZ = Math.floor(loc.z);
    
    console.warn(`[Pop-up Tent] Cleaning up barriers at ${baseX}, ${baseY}, ${baseZ}`);
    
    try {
        // Remove all barriers in the tent area
        dim.runCommand(`fill ${baseX-1} ${baseY} ${baseZ-1} ${baseX+1} ${baseY+3} ${baseZ+1} air replace barrier`);
        console.warn("[Pop-up Tent] Barriers removed");
    } catch (e) {
        console.warn(`[Pop-up Tent] Error removing barriers: ${e}`);
    }
}

/**
 * Toggle the door barrier
 */
function toggleDoor(tentEntity, open) {
    const dim = tentEntity.dimension;
    const loc = tentEntity.location;
    const baseX = Math.floor(loc.x);
    const baseY = Math.floor(loc.y);
    const baseZ = Math.floor(loc.z);
    
    try {
        if (open) {
            // Remove door barriers
            dim.runCommand(`setblock ${baseX} ${baseY} ${baseZ-1} air`);
            dim.runCommand(`setblock ${baseX} ${baseY+1} ${baseZ-1} air`);
            console.warn("[Pop-up Tent] Door opened");
        } else {
            // Place door barriers
            dim.runCommand(`setblock ${baseX} ${baseY} ${baseZ-1} barrier`);
            dim.runCommand(`setblock ${baseX} ${baseY+1} ${baseZ-1} barrier`);
            console.warn("[Pop-up Tent] Door closed");
        }
    } catch (e) {
        console.warn(`[Pop-up Tent] Error toggling door: ${e}`);
    }
}

/**
 * Handle tent interaction
 */
function handleTentInteract(tentEntity) {
    if (!tentEntity || tentEntity.typeId !== "monarch:popup_tent") return;
    
    // Find the interacting player
    const players = tentEntity.dimension.getEntities({
        location: tentEntity.location,
        maxDistance: 5,
        type: "minecraft:player"
    });
    
    if (players.length === 0) {
        console.warn("[Pop-up Tent] No player found nearby");
        return;
    }
    
    const player = players[0];
    
    // Get door state from variant (0 = closed, 1 = open)
    const variant = tentEntity.getComponent("minecraft:variant");
    const doorOpen = variant ? variant.value === 1 : false;
    
    if (!doorOpen) {
        // Open the door
        tentEntity.triggerEvent("monarch:open_door");
        toggleDoor(tentEntity, true);
        tentEntity.dimension.playSound("monarch.tent.zip_open", tentEntity.location);
        player.sendMessage("§7*zip* §fTent opened");
    } else {
        // Door is open - check if night for sleep, otherwise close
        const timeOfDay = world.getTimeOfDay();
        const isNight = timeOfDay >= 12500 && timeOfDay <= 23500;
        
        if (isNight) {
            try {
                player.setSpawnPoint({
                    dimension: tentEntity.dimension,
                    x: Math.floor(tentEntity.location.x),
                    y: Math.floor(tentEntity.location.y),
                    z: Math.floor(tentEntity.location.z)
                });
                player.sendMessage("§aSpawn point set at tent!");
                tentEntity.dimension.runCommand("time set day");
                player.sendMessage("§eGood morning! You slept through the night.");
            } catch (e) {
                console.warn(`[Pop-up Tent] Sleep error: ${e}`);
                player.sendMessage("§cCouldn't set spawn point here.");
            }
        }
        
        // Close the door
        tentEntity.triggerEvent("monarch:close_door");
        toggleDoor(tentEntity, false);
        tentEntity.dimension.playSound("monarch.tent.zip_close", tentEntity.location);
        player.sendMessage("§7*zip* §fTent closed");
    }
}

/**
 * Initialize tent event listeners
 */
export function initPopupTent() {
    console.warn("[Pop-up Tent] Initializing...");
    
    // Handle tent setup (barrier placement)
    system.afterEvents.scriptEventReceive.subscribe((event) => {
        if (event.id === "monarch:tent_setup") {
            setupBarriers(event.sourceEntity);
        }
        if (event.id === "monarch:tent_interact") {
            handleTentInteract(event.sourceEntity);
        }
        if (event.id === "monarch:tent_cleanup") {
            cleanupBarriers(event.sourceEntity);
        }
    });
    
    // Cleanup when tent dies
    world.afterEvents.entityDie.subscribe((event) => {
        if (event.deadEntity.typeId === "monarch:popup_tent") {
            cleanupBarriers(event.deadEntity);
        }
    });
    
    // Also cleanup when tent is removed (picked up, etc)
    world.afterEvents.entityRemove.subscribe((event) => {
        // Note: Can't access entity location after removal
        // Barriers would need manual cleanup or periodic scan
    });
    
    console.warn("[Pop-up Tent] Initialized!");
}
