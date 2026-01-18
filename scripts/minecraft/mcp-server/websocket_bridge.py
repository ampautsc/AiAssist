#!/usr/bin/env python3
"""
WebSocket Bridge for Minecraft Scripting API
Handles real-time communication between MCP server and Minecraft instance
"""

import asyncio
import json
import logging
from typing import Optional, Callable, Dict, Any
import websockets
from websockets.server import WebSocketServerProtocol

logger = logging.getLogger(__name__)


class MinecraftWebSocketBridge:
    """
    WebSocket server that bridges MCP commands to Minecraft Scripting API
    
    This bridge acts as a communication layer between the MCP REST API
    and the Minecraft game instance running Behavior Packs with scripting.
    """
    
    def __init__(self, host: str = "0.0.0.0", port: int = 8765):
        """
        Initialize WebSocket bridge
        
        Args:
            host: Host to bind WebSocket server
            port: Port for WebSocket server
        """
        self.host = host
        self.port = port
        self.server = None
        self.minecraft_client: Optional[WebSocketServerProtocol] = None
        self.command_callback: Optional[Callable] = None
        self.running = False
        
    async def start(self):
        """Start the WebSocket server"""
        self.running = True
        self.server = await websockets.serve(
            self._handle_client,
            self.host,
            self.port
        )
        logger.info(f"WebSocket bridge started on ws://{self.host}:{self.port}")
        
    async def stop(self):
        """Stop the WebSocket server"""
        self.running = False
        if self.server:
            self.server.close()
            await self.server.wait_closed()
        logger.info("WebSocket bridge stopped")
        
    def set_command_callback(self, callback: Callable):
        """
        Set callback function for receiving commands from MCP
        
        Args:
            callback: Async function to call with command data
        """
        self.command_callback = callback
        
    async def _handle_client(self, websocket: WebSocketServerProtocol, path: str):
        """
        Handle incoming WebSocket connections from Minecraft
        
        Args:
            websocket: WebSocket connection
            path: Connection path
        """
        logger.info(f"Client connected from {websocket.remote_address}")
        self.minecraft_client = websocket
        
        try:
            # Send welcome message
            await self._send_to_minecraft({
                "type": "welcome",
                "message": "Connected to Minecraft Control Program (MCP)"
            })
            
            # Handle messages from Minecraft
            async for message in websocket:
                await self._handle_minecraft_message(message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info("Client disconnected")
        except Exception as e:
            logger.error(f"Error handling client: {e}")
        finally:
            self.minecraft_client = None
            
    async def _handle_minecraft_message(self, message: str):
        """
        Process messages received from Minecraft
        
        Args:
            message: JSON message from Minecraft client
        """
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            
            if msg_type == "ready":
                logger.info("Minecraft client is ready")
                await self._send_to_minecraft({
                    "type": "ack",
                    "message": "MCP server ready"
                })
                
            elif msg_type == "command_result":
                command_id = data.get("command_id")
                success = data.get("success")
                result = data.get("result")
                logger.info(f"Command {command_id} result: success={success}, result={result}")
                
            elif msg_type == "error":
                error = data.get("error")
                logger.error(f"Minecraft client error: {error}")
                
            else:
                logger.warning(f"Unknown message type: {msg_type}")
                
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON from Minecraft: {e}")
        except Exception as e:
            logger.error(f"Error processing Minecraft message: {e}")
            
    async def send_command(self, command_data: Dict[str, Any]) -> bool:
        """
        Send a command to Minecraft
        
        Args:
            command_data: Command data including id, command, and metadata
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.minecraft_client:
            logger.warning("No Minecraft client connected")
            return False
            
        try:
            message = {
                "type": "execute_command",
                "command_id": command_data["id"],
                "command": command_data["command"],
                "metadata": command_data.get("metadata", {})
            }
            await self._send_to_minecraft(message)
            return True
            
        except Exception as e:
            logger.error(f"Error sending command to Minecraft: {e}")
            return False
            
    async def _send_to_minecraft(self, data: Dict[str, Any]):
        """
        Send data to Minecraft client
        
        Args:
            data: Dictionary to send as JSON
        """
        if self.minecraft_client:
            await self.minecraft_client.send(json.dumps(data))
            
    def is_connected(self) -> bool:
        """Check if Minecraft client is connected"""
        return self.minecraft_client is not None


class BridgeManager:
    """
    Manages the WebSocket bridge and integrates with MCP command queue
    """
    
    def __init__(self, command_queue, host: str = "0.0.0.0", port: int = 8765):
        """
        Initialize bridge manager
        
        Args:
            command_queue: MinecraftCommandQueue instance
            host: WebSocket server host
            port: WebSocket server port
        """
        self.bridge = MinecraftWebSocketBridge(host, port)
        self.command_queue = command_queue
        self.running = False
        
    async def start(self):
        """Start the bridge and command processor"""
        await self.bridge.start()
        self.running = True
        
        # Start command processing loop
        asyncio.create_task(self._process_commands())
        
    async def stop(self):
        """Stop the bridge"""
        self.running = False
        await self.bridge.stop()
        
    async def _process_commands(self):
        """
        Process commands from queue and send to Minecraft
        """
        while self.running:
            # Get command from queue
            command_data = await self.command_queue.get_next_command()
            
            if command_data:
                # Send to Minecraft via WebSocket
                success = await self.bridge.send_command(command_data)
                
                if success:
                    logger.info(f"Command sent to Minecraft: {command_data['id']}")
                else:
                    logger.warning(f"Failed to send command: {command_data['id']}")
                    # Could re-queue the command here
                    
            await asyncio.sleep(0.1)
            
    def is_minecraft_connected(self) -> bool:
        """Check if Minecraft is connected"""
        return self.bridge.is_connected()


if __name__ == "__main__":
    # Test the WebSocket bridge standalone
    async def test_bridge():
        bridge = MinecraftWebSocketBridge()
        await bridge.start()
        
        # Keep running
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            await bridge.stop()
            
    asyncio.run(test_bridge())
