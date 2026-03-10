/**
 * VERIFIED CUSTOM COMPONENT PATTERN
 * 
 * Block custom components are registered in world.beforeEvents.worldInitialize
 * This runs BEFORE the world loads, so it's safe to register components here.
 * 
 * SOURCE: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/blockcustomcomponent
 * 
 * AVAILABLE METHODS (all take 2 args: event, customComponentParameters):
 * - beforeOnPlayerPlace  - Before player places (can cancel)
 * - onPlace              - When block is placed
 * - onBreak              - When block is destroyed (NOT onPlayerDestroy!)
 * - onPlayerBreak        - When player breaks block
 * - onPlayerInteract     - When player right-clicks block
 * - onTick               - Every tick (use sparingly!)
 * - onRandomTick         - Random tick (like crop growth)
 * - onStepOn             - Entity steps onto block
 * - onStepOff            - Entity steps off block
 * - onEntityFallOn       - Entity falls onto block
 * - onRedstoneUpdate     - Redstone signal changes
 */

import { world, system, BlockPermutation } from "@minecraft/server";

// ============================================================
// CUSTOM COMPONENT REGISTRATION
// ============================================================

world.beforeEvents.worldInitialize.subscribe((event) => {
    console.warn("[Addon] Registering custom components...");
    
    // Register a block custom component
    event.blockComponentRegistry.registerCustomComponent("namespace:my_component", {
        
        // Called when block is placed
        onPlace(event) {
            const block = event.block;
            console.warn(`Block placed at ${block.location.x}, ${block.location.y}, ${block.location.z}`);
            
            // Example: Set initial state
            // Must use system.run for state changes
            system.run(() => {
                try {
                    block.setPermutation(
                        block.permutation.withState("namespace:my_state", 0)
                    );
                } catch (e) {
                    console.warn(`Error setting state: ${e}`);
                }
            });
        },
        
        // Called when block is destroyed by any cause
        // NOTE: Method is "onBreak" not "onPlayerDestroy"!
        onBreak(event) {
            const block = event.block;
            console.warn(`Block destroyed at ${block.location.x}, ${block.location.y}, ${block.location.z}`);
        },
        
        // Called when player specifically breaks the block
        onPlayerBreak(event) {
            const block = event.block;
            const player = event.player;
            console.warn(`Block broken by ${player?.name}`);
        },
        
        // Called every tick the block exists - USE SPARINGLY!
        onTick(event) {
            const block = event.block;
            // Be careful with tick - runs constantly!
            // Use sparingly or check conditions before doing work
        },
        
        // Called when player interacts (right-click)
        onPlayerInteract(event) {
            const block = event.block;
            const player = event.player;
            console.warn(`${player?.name} interacted with block`);
            
            // Example: Toggle a state
            system.run(() => {
                try {
                    const currentState = block.permutation.getState("namespace:active");
                    block.setPermutation(
                        block.permutation.withState("namespace:active", !currentState)
                    );
                } catch (e) {
                    console.warn(`Error toggling state: ${e}`);
                }
            });
        },
        
        // Called on random tick (like crop growth)
        onRandomTick(event) {
            const block = event.block;
            // Random ticks are infrequent - good for growth mechanics
            console.warn("Random tick on block");
        }
    });
    
    console.warn("[Addon] Custom components registered!");
});
