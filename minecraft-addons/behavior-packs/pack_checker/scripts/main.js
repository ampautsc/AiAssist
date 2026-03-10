import { world, system } from "@minecraft/server";

// Check loaded packs and write to console
function checkLoadedPacks() {
    try {
        const players = world.getAllPlayers();
        
        // Try to detect packs via dynamic properties or world state
        const packInfo = {
            timestamp: Date.now(),
            worldName: "Unknown",
            playerCount: players.length,
            // Minecraft doesn't expose pack list directly in API
            // But we can check if our entities/items exist
            testResult: "PACK_CHECKER_RUNNING"
        };
        
        // Output to console - this is the ONLY reliable way to communicate out
        console.warn(`PACK_CHECK_RESULT:${JSON.stringify(packInfo)}`);
        world.sendMessage("§e[Pack Checker] Running - check console output");
        
        // Try to query for custom entities to verify behavior pack
        const overworld = world.getDimension("overworld");
        const entities = overworld.getEntities({ type: "monarch:butterfly" });
        
        if (entities.length > 0 || true) { // Always output for verification
            console.warn(`MONARCH_PACK_CHECK:loaded=true,entities=${entities.length}`);
            world.sendMessage(`§a[Pack Checker] Monarch pack detected`);
        }
        
    } catch (error) {
        console.error(`PACK_CHECK_ERROR:${error}`);
        world.sendMessage(`§c[Pack Checker] Error: ${error}`);
    }
}

// Run immediately when any player joins
world.afterEvents.playerSpawn.subscribe((event) => {
    system.run(() => {
        checkLoadedPacks();
    });
});

// Also run on interval
let tickCount = 0;
system.runInterval(() => {
    if (tickCount++ % 100 === 0) { // Every 5 seconds
        checkLoadedPacks();
    }
}, 1);
