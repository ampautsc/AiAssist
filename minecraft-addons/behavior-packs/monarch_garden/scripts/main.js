import { world, system, BlockPermutation, ItemStack } from "@minecraft/server";
import { registerMotionSensorComponent } from "./landscape_torch.js";
import { initPopupTent } from "./popup_tent.js";

console.warn("[Monarch Garden] ========================================");
console.warn("[Monarch Garden] SCRIPT FILE LOADING - v3.0 with seed planting");
console.warn("[Monarch Garden] ========================================");

// Initialize popup tent module
initPopupTent();

// Log that we've successfully imported modules
console.warn("[Monarch Garden] Imported: world, system, BlockPermutation, ItemStack");

// Valid surfaces for planting seeds
const VALID_PLANTING_SURFACES = [
    "minecraft:grass_block",
    "minecraft:dirt", 
    "minecraft:farmland",
    "minecraft:podzol",
    "minecraft:mycelium",
    "minecraft:rooted_dirt",
    "minecraft:coarse_dirt"
];

// Track perch entities by location to avoid duplicates
const perchLocations = new Map();

// Track mounted butterflies with their dismount timers
const mountedButterflies = new Map(); // butterfly.id -> { perch: entity, dismountTime: number }

// DEBUG: Count successful/failed seed spawns
let seedSpawnAttempts = 0;
let seedSpawnSuccesses = 0;
let seedSpawnFailures = 0;
let seedsPlanted = 0;
let seedsDespawned = 0;

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
    
    // Register landscape torch motion sensor
    registerMotionSensorComponent(event.blockComponentRegistry);
    
    event.blockComponentRegistry.registerCustomComponent("monarch:growable", {
        onRandomTick(event) {
            const block = event.block;
            const currentStage = block.permutation.getState("monarch:growth_stage");
            
            console.warn(`[Monarch Garden] onRandomTick fired! Block at ${block.location.x},${block.location.y},${block.location.z} stage=${currentStage}`);
            
            // Stage 5: Burst into seeds and reset to stage 0
            if (currentStage === 5) {
                console.warn("[Monarch Garden] *** STAGE 5 DETECTED - SEED BURST TRIGGERED ***");
                
                // Spawn 6 seed entities around the plant
                const dimension = block.dimension;
                console.warn(`[Monarch Garden] Dimension: ${dimension.id}`);
                
                const baseLocation = {
                    x: block.location.x + 0.5,
                    y: block.location.y + 1.5,  // Spawn higher so we can see them
                    z: block.location.z + 0.5
                };
                console.warn(`[Monarch Garden] Base spawn location: ${baseLocation.x}, ${baseLocation.y}, ${baseLocation.z}`);
                
                // Spawn seed entities in a circle around the plant
                for (let i = 0; i < 6; i++) {
                    seedSpawnAttempts++;
                    const angle = (i / 6) * Math.PI * 2;
                    const offsetX = Math.cos(angle) * 0.8;
                    const offsetZ = Math.sin(angle) * 0.8;
                    
                    const seedLocation = {
                        x: baseLocation.x + offsetX,
                        y: baseLocation.y + (i * 0.3),  // Stagger heights so we can see them
                        z: baseLocation.z + offsetZ
                    };
                    
                    console.warn(`[Monarch Garden] Attempting seed ${i+1}/6 at (${seedLocation.x.toFixed(2)}, ${seedLocation.y.toFixed(2)}, ${seedLocation.z.toFixed(2)})`);
                    
                    try {
                        // Spawn seed entity
                        console.warn("[Monarch Garden] Calling dimension.spawnEntity('monarch:milkweed_seed_entity', ...)");
                        const seed = dimension.spawnEntity("monarch:milkweed_seed_entity", seedLocation);
                        
                        if (seed) {
                            seedSpawnSuccesses++;
                            console.warn(`[Monarch Garden] ✓ SUCCESS! Seed entity spawned. ID: ${seed.id}, TypeId: ${seed.typeId}`);
                            console.warn(`[Monarch Garden]   Entity location: ${seed.location.x.toFixed(2)}, ${seed.location.y.toFixed(2)}, ${seed.location.z.toFixed(2)}`);
                        } else {
                            seedSpawnFailures++;
                            console.warn(`[Monarch Garden] ✗ spawnEntity returned null/undefined`);
                            // Fallback to item
                            dimension.spawnItem(new ItemStack("monarch:milkweed_seeds", 1), seedLocation);
                            console.warn(`[Monarch Garden] Spawned fallback item instead`);
                        }
                    } catch (error) {
                        seedSpawnFailures++;
                        console.warn(`[Monarch Garden] ✗ EXCEPTION: ${error}`);
                        console.warn(`[Monarch Garden]   Error name: ${error.name}`);
                        console.warn(`[Monarch Garden]   Error message: ${error.message}`);
                        if (error.stack) {
                            console.warn(`[Monarch Garden]   Stack: ${error.stack}`);
                        }
                        // Fallback to item
                        try {
                            dimension.spawnItem(new ItemStack("monarch:milkweed_seeds", 1), seedLocation);
                            console.warn(`[Monarch Garden] Spawned fallback item after error`);
                        } catch (itemError) {
                            console.warn(`[Monarch Garden] ✗✗ Item spawn also failed: ${itemError.message}`);
                        }
                    }
                }
                
                console.warn(`[Monarch Garden] === SEED BURST COMPLETE ===`);
                console.warn(`[Monarch Garden] Stats: ${seedSpawnSuccesses}/${seedSpawnAttempts} successful, ${seedSpawnFailures} failed`);
                console.warn(`[Monarch Garden] Resetting plant to stage 0`);
                
                // Reset to stage 0 (planted)
                block.setPermutation(
                    block.permutation.withState("monarch:growth_stage", 0)
                );
                return;
            }
            
            // Normal growth: advance to next stage
            if (currentStage < 5) {
                const newStage = currentStage + 1;
                
                // Set the new growth stage
                block.setPermutation(
                    block.permutation.withState("monarch:growth_stage", newStage)
                );
                
                console.warn(`[Monarch Garden] Milkweed grew to stage ${newStage}!`);
                
                // Spawn perch if reached stage 2 (grown)
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
    world.afterEvents.playerBreakBlock.subscribe((event) => {
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
        world.sendMessage("§a[Monarch Garden] v2.0 loaded! Use !seedtest to spawn test seeds.");
    }, 40);
});

// DEBUG: Chat commands - wrapped in try-catch as chatSend may not be available in all API versions
try {
    world.beforeEvents.chatSend.subscribe((event) => {
    const message = event.message.toLowerCase().trim();
    const player = event.sender;
    
    if (message === "!seedtest") {
        event.cancel = true;
        console.warn("[Monarch Garden] !seedtest command received");
        
        system.run(() => {
            try {
                const loc = player.location;
                console.warn(`[Monarch Garden] Player location: ${loc.x.toFixed(2)}, ${loc.y.toFixed(2)}, ${loc.z.toFixed(2)}`);
                
                const spawnLoc = {
                    x: loc.x + 2,
                    y: loc.y + 1.5,
                    z: loc.z
                };
                
                console.warn(`[Monarch Garden] Spawning test seed at: ${spawnLoc.x.toFixed(2)}, ${spawnLoc.y.toFixed(2)}, ${spawnLoc.z.toFixed(2)}`);
                
                const seed = player.dimension.spawnEntity("monarch:milkweed_seed_entity", spawnLoc);
                
                if (seed) {
                    world.sendMessage(`§a[Test] Seed spawned! ID: ${seed.id}`);
                    console.warn(`[Monarch Garden] Test seed spawned successfully. ID: ${seed.id}, Type: ${seed.typeId}`);
                    console.warn(`[Monarch Garden] Seed actual location: ${seed.location.x.toFixed(2)}, ${seed.location.y.toFixed(2)}, ${seed.location.z.toFixed(2)}`);
                } else {
                    world.sendMessage("§c[Test] spawnEntity returned null!");
                    console.warn("[Monarch Garden] Test seed spawnEntity returned null");
                }
            } catch (error) {
                world.sendMessage(`§c[Test] Error: ${error.message}`);
                console.warn(`[Monarch Garden] Test seed error: ${error}`);
                console.warn(`[Monarch Garden] Error stack: ${error.stack}`);
            }
        });
    }
    
    if (message === "!seedstats") {
        event.cancel = true;
        world.sendMessage(`§e[Stats] Attempts: ${seedSpawnAttempts}, Success: ${seedSpawnSuccesses}, Failed: ${seedSpawnFailures}`);
    }
    
    if (message === "!seedinfo") {
        event.cancel = true;
        console.warn("[Monarch Garden] !seedinfo - Checking for nearby seed entities...");
        
        system.run(() => {
            try {
                const seeds = player.dimension.getEntities({
                    type: "monarch:milkweed_seed_entity",
                    location: player.location,
                    maxDistance: 50
                });
                
                world.sendMessage(`§e[Info] Found ${seeds.length} seed entities within 50 blocks`);
                console.warn(`[Monarch Garden] Found ${seeds.length} seed entities`);
                
                for (const seed of seeds) {
                    console.warn(`[Monarch Garden] - Seed ${seed.id} at ${seed.location.x.toFixed(2)}, ${seed.location.y.toFixed(2)}, ${seed.location.z.toFixed(2)}`);
                }
            } catch (error) {
                world.sendMessage(`§c[Info] Error: ${error.message}`);
            }
        });
    }
    
    if (message === "!rain") {
        event.cancel = true;
        system.run(() => {
            try {
                // Toggle rain using command
                player.runCommand("/weather rain 600");
                world.sendMessage("§b[Weather] Rain started for 10 minutes. Seeds should start falling!");
            } catch (error) {
                world.sendMessage(`§c[Weather] Error: ${error.message}`);
            }
        });
    }
    
    if (message === "!clear") {
        event.cancel = true;
        system.run(() => {
            try {
                player.runCommand("/weather clear");
                world.sendMessage("§e[Weather] Weather cleared.");
            } catch (error) {
                world.sendMessage(`§c[Weather] Error: ${error.message}`);
            }
        });
    }
    
    if (message === "!seedfall") {
        event.cancel = true;
        system.run(() => {
            try {
                const seeds = player.dimension.getEntities({
                    type: "monarch:milkweed_seed_entity",
                    location: player.location,
                    maxDistance: 50
                });
                
                let triggered = 0;
                for (const seed of seeds) {
                    try {
                        seed.triggerEvent("monarch:start_falling");
                        triggered++;
                    } catch (e) {
                        console.warn(`[Monarch Garden] Failed to trigger fall on seed: ${e.message}`);
                    }
                }
                
                world.sendMessage(`§e[Test] Triggered falling on ${triggered}/${seeds.length} seeds`);
            } catch (error) {
                world.sendMessage(`§c[Test] Error: ${error.message}`);
            }
        });
    }
});
} catch (error) {
    console.warn(`[Monarch Garden] chatSend event not available: ${error}`);
}

// ============================================================
// SEED LANDING AND PLANTING SYSTEM
// ============================================================

// Track seeds we've already processed to avoid double-planting
const processedSeeds = new Set();

// Listen for seed landing via scriptevent from animation controller
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "monarch:seed_landed") return;
    
    const seed = event.sourceEntity;
    if (!seed || seed.typeId !== "monarch:milkweed_seed_entity") return;
    if (processedSeeds.has(seed.id)) return;
    
    processedSeeds.add(seed.id);
    console.warn(`[Monarch Garden] *** SEED LANDED via scriptevent ***`);
    
    try {
        const location = seed.location;
        const dimension = seed.dimension;
        
        const blockBelow = dimension.getBlock({
            x: Math.floor(location.x),
            y: Math.floor(location.y) - 1,
            z: Math.floor(location.z)
        });
        
        if (blockBelow) {
            console.warn(`[Monarch Garden] Seed landed on ${blockBelow.typeId}`);
            handleSeedLanded(seed, blockBelow, dimension);
        } else {
            seed.triggerEvent("monarch:despawn_seed");
        }
    } catch (e) {
        console.warn(`[Monarch Garden] Error handling seed landing: ${e}`);
    }
});

function handleSeedLanded(seed, groundBlock, dimension) {
    const groundType = groundBlock.typeId;
    const seedLoc = seed.location;
    
    console.warn(`[Monarch Garden] === HANDLE SEED LANDED ===`);
    console.warn(`[Monarch Garden] Ground block: ${groundType} at (${groundBlock.location.x}, ${groundBlock.location.y}, ${groundBlock.location.z})`);
    console.warn(`[Monarch Garden] Seed location: (${seedLoc.x.toFixed(2)}, ${seedLoc.y.toFixed(2)}, ${seedLoc.z.toFixed(2)})`);
    console.warn(`[Monarch Garden] Valid surfaces: ${VALID_PLANTING_SURFACES.join(', ')}`);
    console.warn(`[Monarch Garden] Is valid surface? ${VALID_PLANTING_SURFACES.includes(groundType)}`);
    
    // Check if this is a valid planting surface
    if (VALID_PLANTING_SURFACES.includes(groundType)) {
        // Get the block where we'll plant (one above ground)
        const plantLocation = {
            x: groundBlock.location.x,
            y: groundBlock.location.y + 1,
            z: groundBlock.location.z
        };
        
        console.warn(`[Monarch Garden] Checking plant location: (${plantLocation.x}, ${plantLocation.y}, ${plantLocation.z})`);
        
        const blockAbove = dimension.getBlock(plantLocation);
        
        console.warn(`[Monarch Garden] Block at plant location: ${blockAbove?.typeId}`);
        
        const canPlant = blockAbove && (
            blockAbove.typeId === "minecraft:air" || 
            blockAbove.typeId === "minecraft:short_grass" || 
            blockAbove.typeId === "minecraft:tall_grass"
        );
        
        console.warn(`[Monarch Garden] Can plant here? ${canPlant}`);
        
        if (canPlant) {
            try {
                // Plant milkweed at stage 0!
                console.warn(`[Monarch Garden] Attempting to resolve BlockPermutation for monarch:milkweed...`);
                const milkweedPermutation = BlockPermutation.resolve("monarch:milkweed", {
                    "monarch:growth_stage": 0
                });
                
                console.warn(`[Monarch Garden] Setting block permutation...`);
                blockAbove.setPermutation(milkweedPermutation);
                
                seedsPlanted++;
                console.warn(`[Monarch Garden] ✓✓✓ PLANTED MILKWEED! Total planted: ${seedsPlanted}`);
                
                // Remove seed entity
                seed.remove();
                
            } catch (error) {
                console.warn(`[Monarch Garden] ✗ Failed to plant: ${error.message}`);
                console.warn(`[Monarch Garden] Error stack: ${error.stack}`);
                seed.triggerEvent("monarch:despawn_seed");
                seedsDespawned++;
            }
        } else {
            // Block above isn't air, can't plant
            console.warn(`[Monarch Garden] ✗ Can't plant - block above is ${blockAbove?.typeId}`);
            seed.triggerEvent("monarch:despawn_seed");
            seedsDespawned++;
        }
    } else {
        // Wrong surface type
        console.warn(`[Monarch Garden] ✗ Wrong surface (${groundType}) - despawning seed`);
        seed.triggerEvent("monarch:despawn_seed");
        seedsDespawned++;
    }
}

console.warn("[Monarch Garden] ========================================");
console.warn("[Monarch Garden] Script initialized successfully!");
console.warn("[Monarch Garden] Commands: !seedtest, !seedstats, !seedinfo, !rain, !clear, !seedfall");
console.warn("[Monarch Garden] ========================================");
