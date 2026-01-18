/**
 * MCP Control Pack - Main Script
 * 
 * This script connects to the MCP server via WebSocket and executes
 * commands received from the server in the Minecraft world.
 */

import { world, system } from '@minecraft/server';
import { http, HttpRequest, HttpRequestMethod } from '@minecraft/server-net';

// Configuration
const MCP_WEBSOCKET_URL = 'ws://localhost:8765';
const MCP_REST_API_URL = 'http://localhost:8000';
const RECONNECT_DELAY = 5000; // 5 seconds

class MCPClient {
    constructor() {
        this.connected = false;
        this.reconnectTimer = null;
        this.commandQueue = [];
    }

    /**
     * Initialize the MCP client
     */
    initialize() {
        world.sendMessage('§e[MCP] Initializing MCP Control Pack...');
        
        // Note: WebSocket support in Minecraft Bedrock is limited
        // Using HTTP polling as alternative for command retrieval
        this.startPolling();
        
        // Register event handlers
        this.registerEventHandlers();
        
        world.sendMessage('§a[MCP] MCP Control Pack initialized!');
    }

    /**
     * Start polling for commands from MCP server
     */
    startPolling() {
        system.runInterval(() => {
            this.pollForCommands();
        }, 20); // Poll every second (20 ticks)
    }

    /**
     * Poll MCP server for pending commands
     */
    async pollForCommands() {
        try {
            // In a real implementation, you would fetch commands from the server
            // For now, this is a placeholder showing the structure
            
            // Example: Fetch commands from REST API
            // const request = new HttpRequest(MCP_REST_API_URL + '/api/v1/get_pending_commands');
            // request.method = HttpRequestMethod.Get;
            // const response = await http.request(request);
            
            // Process any queued commands
            this.processCommandQueue();
            
        } catch (error) {
            // Silently handle errors to avoid spam
            if (!this.connected) {
                this.connected = false;
            }
        }
    }

    /**
     * Process commands from the queue
     */
    processCommandQueue() {
        while (this.commandQueue.length > 0) {
            const commandData = this.commandQueue.shift();
            this.executeCommand(commandData);
        }
    }

    /**
     * Execute a Minecraft command
     * @param {Object} commandData - Command data from MCP server
     */
    executeCommand(commandData) {
        try {
            const { command, command_id, metadata } = commandData;
            
            world.sendMessage(`§b[MCP] Executing: ${command}`);
            
            // Execute the command
            const result = world.getDimension('overworld').runCommand(command);
            
            world.sendMessage(`§a[MCP] Command executed successfully: ${command_id}`);
            
            // Send result back to MCP server (in production)
            this.sendCommandResult(command_id, true, result);
            
        } catch (error) {
            world.sendMessage(`§c[MCP] Command failed: ${error.message}`);
            this.sendCommandResult(commandData.command_id, false, error.message);
        }
    }

    /**
     * Send command result back to MCP server
     * @param {string} commandId - Command ID
     * @param {boolean} success - Whether command succeeded
     * @param {*} result - Command result or error
     */
    sendCommandResult(commandId, success, result) {
        // In production, send result back to MCP server via HTTP
        // This would use @minecraft/server-net http module
        
        world.sendMessage(`§7[MCP] Result for ${commandId}: ${success ? 'success' : 'failed'}`);
    }

    /**
     * Register event handlers for world events
     */
    registerEventHandlers() {
        // Listen for player join events
        world.afterEvents.playerSpawn.subscribe((event) => {
            if (event.initialSpawn) {
                const player = event.player;
                player.sendMessage('§a[MCP] MCP Control Pack is active!');
                player.sendMessage('§e[MCP] Commands can be sent via REST API');
            }
        });

        // Listen for chat commands (for manual testing)
        world.beforeEvents.chatSend.subscribe((event) => {
            const message = event.message;
            const player = event.sender;

            // Check for MCP commands
            if (message.startsWith('!mcp ')) {
                event.cancel = true;
                const command = message.substring(5);
                
                this.commandQueue.push({
                    command: command,
                    command_id: `manual_${Date.now()}`,
                    metadata: { source: 'chat', player: player.name }
                });
                
                player.sendMessage(`§a[MCP] Command queued: ${command}`);
            } else if (message === '!mcp status') {
                event.cancel = true;
                player.sendMessage(`§e[MCP] Status: ${this.connected ? 'Connected' : 'Disconnected'}`);
                player.sendMessage(`§e[MCP] Queue: ${this.commandQueue.length} commands`);
            }
        });
    }

    /**
     * Add a command to the queue
     * @param {Object} commandData - Command data
     */
    queueCommand(commandData) {
        this.commandQueue.push(commandData);
    }
}

// Initialize MCP client
const mcpClient = new MCPClient();

// Start the client when the world loads
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === 'mcp:initialize') {
        mcpClient.initialize();
    }
});

// Auto-initialize on load
world.sendMessage('§6[MCP] Loading MCP Control Pack...');
system.run(() => {
    mcpClient.initialize();
});

// Export for testing
export { mcpClient };
