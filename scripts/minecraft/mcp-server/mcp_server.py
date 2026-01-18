#!/usr/bin/env python3
"""
Minecraft Control Program (MCP) Server
Main server implementation for world management via REST API and WebSocket
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class BlockPosition:
    """Represents a 3D position in Minecraft world"""
    x: int
    y: int
    z: int
    
    def to_dict(self) -> Dict[str, int]:
        return {"x": self.x, "y": self.y, "z": self.z}


@dataclass
class BlockData:
    """Represents a Minecraft block with type and position"""
    block_type: str
    position: BlockPosition
    data_value: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "block_type": self.block_type,
            "position": self.position.to_dict(),
            "data_value": self.data_value
        }


@dataclass
class AreaData:
    """Represents a 3D area in Minecraft world"""
    from_pos: BlockPosition
    to_pos: BlockPosition
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "from": self.from_pos.to_dict(),
            "to": self.to_pos.to_dict()
        }


class MinecraftCommandQueue:
    """
    Manages a queue of Minecraft commands to be executed
    Acts as a bridge between REST API and Minecraft game instance
    """
    
    def __init__(self):
        self.command_queue: asyncio.Queue = asyncio.Queue()
        self.command_history: List[Dict[str, Any]] = []
        self.max_history = 1000
        
    async def add_command(self, command: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Add a command to the queue
        
        Args:
            command: Minecraft command to execute
            metadata: Optional metadata about the command
            
        Returns:
            Command ID for tracking
        """
        command_id = f"cmd_{datetime.now().timestamp()}"
        command_data = {
            "id": command_id,
            "command": command,
            "metadata": metadata or {},
            "timestamp": datetime.now().isoformat(),
            "status": "queued"
        }
        
        await self.command_queue.put(command_data)
        self._add_to_history(command_data)
        
        logger.info(f"Command queued: {command_id} - {command}")
        return command_id
    
    async def get_next_command(self) -> Optional[Dict[str, Any]]:
        """Get the next command from the queue"""
        try:
            return await asyncio.wait_for(self.command_queue.get(), timeout=1.0)
        except asyncio.TimeoutError:
            return None
    
    def _add_to_history(self, command_data: Dict[str, Any]):
        """Add command to history with size limit"""
        self.command_history.append(command_data)
        if len(self.command_history) > self.max_history:
            self.command_history.pop(0)
    
    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent command history"""
        return self.command_history[-limit:]


class MinecraftWorldManager:
    """
    Core world management class
    Provides high-level world manipulation methods
    """
    
    def __init__(self, command_queue: MinecraftCommandQueue):
        self.command_queue = command_queue
        
    async def place_block(
        self, 
        block_type: str, 
        position: BlockPosition,
        data_value: int = 0
    ) -> str:
        """
        Place a block at specified coordinates
        
        Args:
            block_type: Type of block (e.g., "minecraft:stone")
            position: Position where to place the block
            data_value: Block data value (for variants)
            
        Returns:
            Command ID
        """
        command = f"setblock {position.x} {position.y} {position.z} {block_type} {data_value}"
        metadata = {
            "action": "place_block",
            "block_type": block_type,
            "position": position.to_dict()
        }
        return await self.command_queue.add_command(command, metadata)
    
    async def remove_block(self, position: BlockPosition) -> str:
        """
        Remove a block at specified coordinates
        
        Args:
            position: Position of the block to remove
            
        Returns:
            Command ID
        """
        command = f"setblock {position.x} {position.y} {position.z} air"
        metadata = {
            "action": "remove_block",
            "position": position.to_dict()
        }
        return await self.command_queue.add_command(command, metadata)
    
    async def fill_area(
        self,
        from_pos: BlockPosition,
        to_pos: BlockPosition,
        block_type: str,
        fill_mode: str = "replace"
    ) -> str:
        """
        Fill an area with specified block type
        
        Args:
            from_pos: Starting corner of the area
            to_pos: Ending corner of the area
            block_type: Type of block to fill with
            fill_mode: Fill mode (replace, destroy, keep, hollow, outline)
            
        Returns:
            Command ID
        """
        command = (
            f"fill {from_pos.x} {from_pos.y} {from_pos.z} "
            f"{to_pos.x} {to_pos.y} {to_pos.z} {block_type} {fill_mode}"
        )
        metadata = {
            "action": "fill_area",
            "from": from_pos.to_dict(),
            "to": to_pos.to_dict(),
            "block_type": block_type,
            "mode": fill_mode
        }
        return await self.command_queue.add_command(command, metadata)
    
    async def clone_area(
        self,
        from_pos: BlockPosition,
        to_pos: BlockPosition,
        destination: BlockPosition,
        clone_mode: str = "replace"
    ) -> str:
        """
        Clone an area to a new location
        
        Args:
            from_pos: Starting corner of source area
            to_pos: Ending corner of source area
            destination: Destination position (lower northwest corner)
            clone_mode: Clone mode (replace, masked, filtered)
            
        Returns:
            Command ID
        """
        command = (
            f"clone {from_pos.x} {from_pos.y} {from_pos.z} "
            f"{to_pos.x} {to_pos.y} {to_pos.z} "
            f"{destination.x} {destination.y} {destination.z} {clone_mode}"
        )
        metadata = {
            "action": "clone_area",
            "from": from_pos.to_dict(),
            "to": to_pos.to_dict(),
            "destination": destination.to_dict(),
            "mode": clone_mode
        }
        return await self.command_queue.add_command(command, metadata)
    
    async def destroy_area(
        self,
        from_pos: BlockPosition,
        to_pos: BlockPosition
    ) -> str:
        """
        Destroy (fill with air) an area
        
        Args:
            from_pos: Starting corner of the area
            to_pos: Ending corner of the area
            
        Returns:
            Command ID
        """
        return await self.fill_area(from_pos, to_pos, "air", "replace")
    
    async def execute_command(self, command: str) -> str:
        """
        Execute a raw Minecraft command
        
        Args:
            command: Raw Minecraft command (without leading slash)
            
        Returns:
            Command ID
        """
        metadata = {
            "action": "raw_command",
            "command": command
        }
        return await self.command_queue.add_command(command, metadata)


class MCPServer:
    """
    Main MCP Server class
    Manages the overall server lifecycle and components
    """
    
    def __init__(self):
        self.command_queue = MinecraftCommandQueue()
        self.world_manager = MinecraftWorldManager(self.command_queue)
        self.running = False
        
    async def start(self):
        """Start the MCP server"""
        self.running = True
        logger.info("Minecraft Control Program (MCP) Server started")
        
        # Start command processor
        asyncio.create_task(self._process_commands())
        
    async def stop(self):
        """Stop the MCP server"""
        self.running = False
        logger.info("Minecraft Control Program (MCP) Server stopped")
        
    async def _process_commands(self):
        """
        Background task to process commands from the queue
        In production, this would send commands to Minecraft via WebSocket
        or the Scripting API bridge
        """
        while self.running:
            command_data = await self.command_queue.get_next_command()
            if command_data:
                logger.info(f"Processing command: {command_data['id']}")
                # TODO: Send to Minecraft via WebSocket/Bridge
                # For now, just log
                logger.debug(f"Command: {command_data['command']}")
            await asyncio.sleep(0.1)
    
    def get_world_manager(self) -> MinecraftWorldManager:
        """Get the world manager instance"""
        return self.world_manager
    
    def get_command_queue(self) -> MinecraftCommandQueue:
        """Get the command queue instance"""
        return self.command_queue


# Singleton instance
_mcp_server_instance: Optional[MCPServer] = None


def get_mcp_server() -> MCPServer:
    """Get or create the MCP server singleton instance"""
    global _mcp_server_instance
    if _mcp_server_instance is None:
        _mcp_server_instance = MCPServer()
    return _mcp_server_instance
