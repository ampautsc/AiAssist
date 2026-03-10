import { world, system } from "@minecraft/server";

// Write verification status to a file via console
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === "verify:check") {
        const players = world.getAllPlayers();
        const info = {
            worldLoaded: true,
            playerCount: players.length,
            timeOfDay: world.getTimeOfDay(),
            day: world.getDay()
        };
        
        // Output to console (visible in content log)
        console.warn(`WORLD_VERIFY_SUCCESS:${JSON.stringify(info)}`);
        world.sendMessage(`§a[Verified] World is loaded! Players: ${info.playerCount}`);
    }
});

// Announce on world load
let announced = false;
system.runInterval(() => {
    if (!announced) {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            world.sendMessage("§a[World Verifier] Pack loaded successfully!");
            console.warn("WORLD_VERIFY_PACK_LOADED");
            announced = true;
        }
    }
}, 20); // Check every second
