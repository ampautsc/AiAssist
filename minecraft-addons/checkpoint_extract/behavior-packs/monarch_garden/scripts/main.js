import { world, system, BlockPermutation } from "@minecraft/server";

console.warn("[Monarch Garden] Script file loading...");

// Track perch entities by location to avoid duplicates
const perchLocations = new Map();

// Track mounted butterflies with their dismount timers
const mountedButterflies = new Map(); // butterfly.id -> { perch: entity, dismountTime: number }

// Function to get location key for a block position
function getLocationKey(location) {
    return `${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`;
}

// Function to spawn flower perch above mature milkweed
function spawnPerchIfNeeded(block) {
    const stage = block.permutation.getState("monarch:growth_stage");
    
    // Only spawn perch on fully mature milkweed (stage 2)
    if (stage === 2) {
        const locationKey = getLocationKey(block.location);
        
        // Check if perch already exists at this location
        if (!perchLocations.has(locationKey)) {
            const dimension = block.dimension;
            
            // Spawn perch entity 1 block above the milkweed
            const perchLocation = {
                x: block.location.x + 0.5,
                y: block.location.y + 1.0,
                z: block.location.z + 0.5
            };
            
            try {
                const perch = dimension.spawnEntity("monarch:flower_perch", perchLocation);
                perchLocations.set(locationKey, perch.id);
                console.warn(`[Monarch Garden] Spawned perch at ${locationKey}`);
            } catch (error) {
                console.warn(`[Monarch Garden] Failed to spawn perch: ${error}`);
            }
        }
    }
}

// Register the growable custom component for milkweed
system.beforeEvents.startup.subscribe((event) => {
    console.warn("[Monarch Garden] Registering custom components...");
    
    event.blockComponentRegistry.registerCustomComponent("monarch:growable", {
        onRandomTick(event) {
            const block = event.block;
            const currentStage = block.permutation.getState("monarch:growth_stage");
            
            // Only grow if not fully mature
            if (currentStage < 2) {
                const newStage = currentStage + 1;
                
                // Set the new growth stage
                block.setPermutation(
                    block.permutation.withState("monarch:growth_stage", newStage)
                );
                
                console.warn(`[Monarch Garden] Milkweed grew to stage ${newStage}!`);
                
                // Spawn perch if now mature
                if (newStage === 2) {
                    system.runTimeout(() => {
                        spawnPerchIfNeeded(block);
                    }, 1);
                }
            }
        },
        
        onPlace(event) {
            // Check if placed block is mature and needs perch
            system.runTimeout(() => {
                spawnPerchIfNeeded(event.block);
            }, 1);
        }
    });
    
    console.warn("[Monarch Garden] Custom components registered!");
});

// Clean up perches when milkweed is destroyed
try {
    world.afterEvents.blockBreak.subscribe((event) => {
        const block = event.block;
        if (block.typeId === "monarch:milkweed") {
        const locationKey = getLocationKey(block.location);
        
        // Remove perch tracking
        if (perchLocations.has(locationKey)) {
            // Find and remove the perch entity
            const dimension = block.dimension;
            const perchLocation = {
                x: block.location.x + 0.5,
                y: block.location.y + 1.0,
                z: block.location.z + 0.5
            };
            
            const entities = dimension.getEntities({
                type: "monarch:flower_perch",
                location: perchLocation,
                maxDistance: 1
            });
            
            for (const entity of entities) {
                entity.remove();
            }
            
            perchLocations.delete(locationKey);
            console.warn(`[Monarch Garden] Removed perch at ${locationKey}`);
        }
    }
    });
} catch (error) {
    console.warn(`[Monarch Garden] blockBreak event not available: ${error}`);
}

// Periodic check to ensure perches exist on all mature milkweed
system.runInterval(() => {
    for (const dimension of [world.getDimension("overworld")]) {
        // This would require scanning for milkweed blocks - expensive operation
        // Better to rely on onPlace and growth events
    }
}, 1200); // Every 60 seconds

// At midnight, refresh all perches on mature milkweed
let lastMidnightCheck = -1;
system.runInterval(() => {
    try {
        const timeOfDay = world.getTimeOfDay();
        
        // Check if it's midnight (time wraps at 24000, midnight is around 18000)
        // We'll trigger between 18000-18100 to catch it once per day
        if (timeOfDay >= 18000 && timeOfDay < 18100 && lastMidnightCheck !== Math.floor(timeOfDay / 100)) {
            lastMidnightCheck = Math.floor(timeOfDay / 100);
            console.warn(`[Monarch Garden] Midnight! Refreshing all flower perches...`);
            
            const overworld = world.getDimension("overworld");
            
            // Scan for all mature milkweed blocks - this is expensive but only once per day
            const players = world.getAllPlayers();
            if (players.length > 0) {
                // Only scan near players to avoid huge world scans
                for (const player of players) {
                    const playerLoc = player.location;
                    
                    // Scan area around player (32 block radius)
                    for (let x = -32; x <= 32; x++) {
                        for (let y = -16; y <= 16; y++) {
                            for (let z = -32; z <= 32; z++) {
                                try {
                                    const checkLoc = {
                                        x: Math.floor(playerLoc.x) + x,
                                        y: Math.floor(playerLoc.y) + y,
                                        z: Math.floor(playerLoc.z) + z
                                    };
                                    const block = overworld.getBlock(checkLoc);
                                    
                                    if (block && block.typeId === "monarch:milkweed") {
                                        spawnPerchIfNeeded(block);
                                    }
                                } catch (e) {
                                    // Out of bounds or unloaded chunk, skip
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.warn(`[Monarch Garden] Midnight check error: ${error}`);
    }
}, 20); // Check every second

// Monitor butterflies - mount them on nearby perches and handle timed dismounting
system.runInterval(() => {
    const overworld = world.getDimension("overworld");
    const currentTime = Date.now();
    
    // Get all butterflies
    const butterflies = overworld.getEntities({
        type: "monarch:butterfly"
    });
    
    for (const butterfly of butterflies) {
        try {
            // Check if butterfly is riding something
            const ridingEntity = butterfly.getComponent("riding")?.entityRidingOn;
            
            if (ridingEntity && ridingEntity.typeId === "monarch:flower_perch") {
                // Butterfly is mounted on a perch
                if (!mountedButterflies.has(butterfly.id)) {
                    // Just mounted - record it with random dismount time (3-12 seconds)
                    const dismountDelay = 3000 + Math.random() * 9000; // 3000-12000 ms
                    mountedButterflies.set(butterfly.id, {
                        perch: ridingEntity,
                        dismountTime: currentTime + dismountDelay
                    });
                    console.warn(`[Monarch Garden] Butterfly ${butterfly.id} mounted perch, will dismount in ${Math.round(dismountDelay/1000)}s`);
                } else {
                    // Check if it's time to dismount
                    const mountData = mountedButterflies.get(butterfly.id);
                    if (currentTime >= mountData.dismountTime) {
                        // Remove the perch - butterfly will naturally dismount
                        const perchLoc = mountData.perch.location;
                        const perchKey = `${Math.floor(perchLoc.x)},${Math.floor(perchLoc.y - 1)},${Math.floor(perchLoc.z)}`;
                        perchLocations.delete(perchKey);
                        mountData.perch.remove();
                        
                        // Clear tracking
                        mountedButterflies.delete(butterfly.id);
                        
                        console.warn(`[Monarch Garden] Perch removed - butterfly will seek new flower`);
                    }
                }
            } else {
                // Not currently riding - check if near a perch and should mount
                const butterflyLoc = butterfly.location;
                const nearbyPerches = overworld.getEntities({
                    type: "monarch:flower_perch",
                    location: butterflyLoc,
                    maxDistance: 2.5
                });
                
                if (nearbyPerches.length > 0) {
                    // Found nearby perch - try to mount it
                    const perch = nearbyPerches[0];
                    try {
                        // Teleport butterfly onto perch location to trigger mounting
                        butterfly.tryTeleport(perch.location);
                        console.warn(`[Monarch Garden] Butterfly approaching perch, attempting mount`);
                    } catch (e) {
                        // Mount failed, that's ok
                    }
                }
                
                // Clear tracking if was previously mounted
                if (mountedButterflies.has(butterfly.id)) {
                    mountedButterflies.delete(butterfly.id);
                }
            }
        } catch (error) {
            // Butterfly might have been removed, clean up tracking
            mountedButterflies.delete(butterfly.id);
        }
    }
}, 20); // Check every second (20 ticks)

// Confirmation message when player joins
world.afterEvents.playerJoin.subscribe((event) => {
    system.runTimeout(() => {
        world.sendMessage("§a[Monarch Garden] v1.0.11 - Butterflies visit flowers for 3-12 seconds. Perches refresh at midnight!");
    }, 40);
});

console.warn("[Monarch Garden] Script initialized");
