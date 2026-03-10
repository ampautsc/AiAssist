/**
 * Landscape Torch - Motion Activated Amber Downlight
 * 
 * Uses minecraft:tick component + onTick custom component event.
 * Block checks for nearby entities every 0.5 seconds (10 ticks).
 * 
 * APPROACH: Block-native polling using official minecraft:tick component.
 * This is simpler and more reliable than invisible sensor entities.
 */

import { world, system } from "@minecraft/server";

// Configuration
const DETECTION_RADIUS = 10;  // Blocks horizontal
const DETECTION_HEIGHT = 5;   // Blocks vertical
const LINGER_TICKS = 100;     // 5 seconds after last detection

// Track torch timers for turn-off delay
const torchTimers = new Map(); // locationKey -> timerId

console.warn("[Landscape Torch] Module loaded - block tick motion detection");

function getLocationKey(location) {
    return `${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`;
}

function isDarkEnough(block) {
    try {
        const timeOfDay = world.getTimeOfDay();
        const isNight = timeOfDay >= 12500 && timeOfDay <= 23500;
        const isUnderground = block.location.y < 50;
        return isNight || isUnderground;
    } catch {
        return true; // Default to allowing light if we can't check
    }
}

function setTorchLit(block, lit) {
    try {
        const currentLit = block.permutation.getState("monarch:lit");
        if (currentLit !== lit) {
            block.setPermutation(block.permutation.withState("monarch:lit", lit));
            console.warn(`[Landscape Torch] ${getLocationKey(block.location)} ${lit ? "ON" : "OFF"}`);
        }
    } catch (e) {
        // Block may not exist or be unloaded
    }
}

/**
 * Check if any valid entities are within detection range
 */
function hasNearbyEntities(block) {
    const dimension = block.dimension;
    const center = {
        x: block.location.x + 0.5,
        y: block.location.y + 0.5,
        z: block.location.z + 0.5
    };
    
    try {
        // Query for players and mobs within range
        const nearbyEntities = dimension.getEntities({
            location: center,
            maxDistance: DETECTION_RADIUS,
            minDistance: 0,
            excludeTypes: [
                "monarch:torch_sensor",     // Ignore our old sensor entities if any
                "monarch:flower_perch",     // Ignore perch entities
                "monarch:milkweed_seed",    // Ignore seed entities
                "minecraft:item"            // Ignore dropped items
            ]
        });
        
        // Filter to only players and mobs (not items, arrows, etc.)
        for (const entity of nearbyEntities) {
            const typeId = entity.typeId;
            
            // Check if player
            if (typeId === "minecraft:player") {
                // Check vertical distance
                const yDiff = Math.abs(entity.location.y - center.y);
                if (yDiff <= DETECTION_HEIGHT) {
                    return true;
                }
            }
            
            // Check if mob (has health, can move)
            try {
                const health = entity.getComponent("minecraft:health");
                if (health && health.currentValue > 0) {
                    const yDiff = Math.abs(entity.location.y - center.y);
                    if (yDiff <= DETECTION_HEIGHT) {
                        return true;
                    }
                }
            } catch {
                // Entity doesn't have health component, skip
            }
        }
    } catch (e) {
        // Dimension query failed, assume no entities
    }
    
    return false;
}

/**
 * Register custom component for motion sensing
 */
export function registerMotionSensorComponent(blockComponentRegistry) {
    console.warn("[Landscape Torch] Registering motion sensor (tick-based)...");
    
    blockComponentRegistry.registerCustomComponent("monarch:motion_sensor", {
        /**
         * Called every 10 ticks (0.5 seconds) due to minecraft:tick component
         */
        onTick(event) {
            const block = event.block;
            const locationKey = getLocationKey(block.location);
            
            // Only activate in darkness
            if (!isDarkEnough(block)) {
                // Turn off if currently lit
                const isLit = block.permutation.getState("monarch:lit");
                if (isLit) {
                    setTorchLit(block, false);
                }
                return;
            }
            
            // Check for nearby entities
            if (hasNearbyEntities(block)) {
                // Light the torch
                setTorchLit(block, true);
                
                // Clear any existing turn-off timer
                const existingTimer = torchTimers.get(locationKey);
                if (existingTimer !== undefined) {
                    system.clearRun(existingTimer);
                }
                
                // Set new turn-off timer
                const timerId = system.runTimeout(() => {
                    try {
                        // Re-check the block still exists
                        const dimension = block.dimension;
                        const blockLoc = {
                            x: Math.floor(block.location.x),
                            y: Math.floor(block.location.y),
                            z: Math.floor(block.location.z)
                        };
                        const currentBlock = dimension.getBlock(blockLoc);
                        if (currentBlock && currentBlock.typeId === "monarch:landscape_torch") {
                            // Only turn off if no entities nearby
                            if (!hasNearbyEntities(currentBlock)) {
                                setTorchLit(currentBlock, false);
                            }
                        }
                    } catch (e) {
                        // Block may be unloaded
                    }
                    torchTimers.delete(locationKey);
                }, LINGER_TICKS);
                
                torchTimers.set(locationKey, timerId);
            }
        },
        
        /**
         * Clean up timer when block is broken
         */
        onPlayerBreak(event) {
            const block = event.block;
            const locationKey = getLocationKey(block.location);
            
            // Clear any pending timer
            const existingTimer = torchTimers.get(locationKey);
            if (existingTimer !== undefined) {
                system.clearRun(existingTimer);
                torchTimers.delete(locationKey);
            }
            
            console.warn(`[Landscape Torch] Removed at ${locationKey}`);
        }
    });
    
    console.warn("[Landscape Torch] Motion sensor registered!");
}
