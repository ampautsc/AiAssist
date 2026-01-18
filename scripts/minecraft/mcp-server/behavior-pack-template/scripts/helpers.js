/**
 * MCP Helper Functions
 * Utility functions for common Minecraft operations via MCP
 */

import { world } from '@minecraft/server';

/**
 * Build a structure from a blueprint
 * @param {Object} blueprint - Structure blueprint with block definitions
 * @param {Object} origin - Origin position {x, y, z}
 */
export function buildStructure(blueprint, origin) {
    const dimension = world.getDimension('overworld');
    
    for (const block of blueprint.blocks) {
        const x = origin.x + block.offset.x;
        const y = origin.y + block.offset.y;
        const z = origin.z + block.offset.z;
        
        try {
            dimension.runCommand(`setblock ${x} ${y} ${z} ${block.type} ${block.data || 0}`);
        } catch (error) {
            world.sendMessage(`§c[MCP] Failed to place block at ${x},${y},${z}: ${error.message}`);
        }
    }
    
    world.sendMessage(`§a[MCP] Structure built at ${origin.x},${origin.y},${origin.z}`);
}

/**
 * Create a simple cube structure
 * @param {Object} from - Starting position {x, y, z}
 * @param {Object} to - Ending position {x, y, z}
 * @param {string} blockType - Block type to use
 * @param {boolean} hollow - Whether to make it hollow
 */
export function createCube(from, to, blockType, hollow = false) {
    const dimension = world.getDimension('overworld');
    const mode = hollow ? 'hollow' : 'replace';
    
    try {
        dimension.runCommand(
            `fill ${from.x} ${from.y} ${from.z} ${to.x} ${to.y} ${to.z} ${blockType} ${mode}`
        );
        world.sendMessage(`§a[MCP] Cube created from ${from.x},${from.y},${from.z} to ${to.x},${to.y},${to.z}`);
    } catch (error) {
        world.sendMessage(`§c[MCP] Failed to create cube: ${error.message}`);
    }
}

/**
 * Create a sphere of blocks
 * @param {Object} center - Center position {x, y, z}
 * @param {number} radius - Radius of the sphere
 * @param {string} blockType - Block type to use
 */
export function createSphere(center, radius, blockType) {
    const dimension = world.getDimension('overworld');
    
    for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
            for (let z = -radius; z <= radius; z++) {
                const distance = Math.sqrt(x*x + y*y + z*z);
                
                if (distance <= radius) {
                    const posX = center.x + x;
                    const posY = center.y + y;
                    const posZ = center.z + z;
                    
                    try {
                        dimension.runCommand(`setblock ${posX} ${posY} ${posZ} ${blockType}`);
                    } catch (error) {
                        // Silently skip blocks that can't be placed
                    }
                }
            }
        }
    }
    
    world.sendMessage(`§a[MCP] Sphere created at ${center.x},${center.y},${center.z} with radius ${radius}`);
}

/**
 * Clear an area
 * @param {Object} from - Starting position {x, y, z}
 * @param {Object} to - Ending position {x, y, z}
 */
export function clearArea(from, to) {
    const dimension = world.getDimension('overworld');
    
    try {
        dimension.runCommand(
            `fill ${from.x} ${from.y} ${from.z} ${to.x} ${to.y} ${to.z} air`
        );
        world.sendMessage(`§a[MCP] Area cleared from ${from.x},${from.y},${from.z} to ${to.x},${to.y},${to.z}`);
    } catch (error) {
        world.sendMessage(`§c[MCP] Failed to clear area: ${error.message}`);
    }
}

/**
 * Teleport player to coordinates
 * @param {string} playerName - Player name or selector
 * @param {Object} position - Position {x, y, z}
 */
export function teleportPlayer(playerName, position) {
    const dimension = world.getDimension('overworld');
    
    try {
        dimension.runCommand(`tp ${playerName} ${position.x} ${position.y} ${position.z}`);
        world.sendMessage(`§a[MCP] Teleported ${playerName} to ${position.x},${position.y},${position.z}`);
    } catch (error) {
        world.sendMessage(`§c[MCP] Failed to teleport: ${error.message}`);
    }
}

/**
 * Give item to player
 * @param {string} playerName - Player name or selector
 * @param {string} itemType - Item type
 * @param {number} amount - Amount of items
 */
export function giveItem(playerName, itemType, amount = 1) {
    const dimension = world.getDimension('overworld');
    
    try {
        dimension.runCommand(`give ${playerName} ${itemType} ${amount}`);
        world.sendMessage(`§a[MCP] Gave ${amount}x ${itemType} to ${playerName}`);
    } catch (error) {
        world.sendMessage(`§c[MCP] Failed to give item: ${error.message}`);
    }
}

/**
 * Change time of day
 * @param {string} time - Time value (day, night, noon, midnight, sunrise, sunset, or number)
 */
export function setTime(time) {
    const dimension = world.getDimension('overworld');
    
    try {
        dimension.runCommand(`time set ${time}`);
        world.sendMessage(`§a[MCP] Time set to ${time}`);
    } catch (error) {
        world.sendMessage(`§c[MCP] Failed to set time: ${error.message}`);
    }
}

/**
 * Change weather
 * @param {string} weather - Weather type (clear, rain, thunder)
 */
export function setWeather(weather) {
    const dimension = world.getDimension('overworld');
    
    try {
        dimension.runCommand(`weather ${weather}`);
        world.sendMessage(`§a[MCP] Weather set to ${weather}`);
    } catch (error) {
        world.sendMessage(`§c[MCP] Failed to set weather: ${error.message}`);
    }
}

/**
 * Example: Build a simple house
 * @param {Object} position - Position to build at {x, y, z}
 */
export function buildExampleHouse(position) {
    world.sendMessage('§e[MCP] Building example house...');
    
    // Floor
    createCube(
        {x: position.x, y: position.y, z: position.z},
        {x: position.x + 5, y: position.y, z: position.z + 5},
        'minecraft:stone',
        false
    );
    
    // Walls
    createCube(
        {x: position.x, y: position.y + 1, z: position.z},
        {x: position.x + 5, y: position.y + 3, z: position.z + 5},
        'minecraft:planks',
        true
    );
    
    // Roof
    createCube(
        {x: position.x, y: position.y + 4, z: position.z},
        {x: position.x + 5, y: position.y + 4, z: position.z + 5},
        'minecraft:stone_slab',
        false
    );
    
    world.sendMessage('§a[MCP] Example house built!');
}
