#!/usr/bin/env python3
"""
Example usage script for Minecraft Control Program (MCP)
Demonstrates how to use the MCP API to control a Minecraft world
"""

import asyncio
import requests
import json
from typing import Dict, Any


class MCPClient:
    """Simple client for interacting with MCP API"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        
    def place_block(self, block_type: str, x: int, y: int, z: int, data_value: int = 0) -> Dict[str, Any]:
        """Place a block at specified coordinates"""
        response = requests.post(
            f"{self.base_url}/api/v1/place_block",
            json={
                "block_type": block_type,
                "position": {"x": x, "y": y, "z": z},
                "data_value": data_value
            }
        )
        response.raise_for_status()
        return response.json()
    
    def remove_block(self, x: int, y: int, z: int) -> Dict[str, Any]:
        """Remove a block at specified coordinates"""
        response = requests.post(
            f"{self.base_url}/api/v1/remove_block",
            json={
                "position": {"x": x, "y": y, "z": z}
            }
        )
        response.raise_for_status()
        return response.json()
    
    def fill_area(
        self,
        from_x: int, from_y: int, from_z: int,
        to_x: int, to_y: int, to_z: int,
        block_type: str,
        fill_mode: str = "replace"
    ) -> Dict[str, Any]:
        """Fill an area with blocks"""
        response = requests.post(
            f"{self.base_url}/api/v1/fill_area",
            json={
                "from_pos": {"x": from_x, "y": from_y, "z": from_z},
                "to_pos": {"x": to_x, "y": to_y, "z": to_z},
                "block_type": block_type,
                "fill_mode": fill_mode
            }
        )
        response.raise_for_status()
        return response.json()
    
    def clone_area(
        self,
        from_x: int, from_y: int, from_z: int,
        to_x: int, to_y: int, to_z: int,
        dest_x: int, dest_y: int, dest_z: int,
        clone_mode: str = "replace"
    ) -> Dict[str, Any]:
        """Clone an area to a new location"""
        response = requests.post(
            f"{self.base_url}/api/v1/clone_area",
            json={
                "from_pos": {"x": from_x, "y": from_y, "z": from_z},
                "to_pos": {"x": to_x, "y": to_y, "z": to_z},
                "destination": {"x": dest_x, "y": dest_y, "z": dest_z},
                "clone_mode": clone_mode
            }
        )
        response.raise_for_status()
        return response.json()
    
    def execute_command(self, command: str) -> Dict[str, Any]:
        """Execute a raw Minecraft command"""
        response = requests.post(
            f"{self.base_url}/api/v1/execute_command",
            json={"command": command}
        )
        response.raise_for_status()
        return response.json()
    
    def get_command_history(self, limit: int = 50) -> Dict[str, Any]:
        """Get recent command history"""
        response = requests.get(
            f"{self.base_url}/api/v1/command_history",
            params={"limit": limit}
        )
        response.raise_for_status()
        return response.json()
    
    def health_check(self) -> Dict[str, Any]:
        """Check if the MCP server is running"""
        response = requests.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()


def example_basic_operations():
    """Example: Basic block operations"""
    print("=== Example 1: Basic Block Operations ===")
    
    client = MCPClient()
    
    # Check server health
    print("Checking server health...")
    health = client.health_check()
    print(f"Server status: {health['status']}")
    
    # Place a stone block
    print("\nPlacing a stone block at (100, 64, 100)...")
    result = client.place_block("minecraft:stone", 100, 64, 100)
    print(f"Result: {result['message']}")
    print(f"Command ID: {result['command_id']}")
    
    # Remove the block
    print("\nRemoving block at (100, 64, 100)...")
    result = client.remove_block(100, 64, 100)
    print(f"Result: {result['message']}")
    
    print("\n" + "="*50 + "\n")


def example_build_structure():
    """Example: Build a simple structure"""
    print("=== Example 2: Build a Simple House ===")
    
    client = MCPClient()
    
    # Build a floor
    print("Building floor...")
    client.fill_area(0, 64, 0, 5, 64, 5, "minecraft:stone", "replace")
    
    # Build walls
    print("Building walls...")
    client.fill_area(0, 65, 0, 5, 68, 5, "minecraft:planks", "hollow")
    
    # Build roof
    print("Building roof...")
    client.fill_area(0, 69, 0, 5, 69, 5, "minecraft:stone_slab", "replace")
    
    print("House completed!")
    print("\n" + "="*50 + "\n")


def example_terrain_manipulation():
    """Example: Terrain manipulation"""
    print("=== Example 3: Terrain Manipulation ===")
    
    client = MCPClient()
    
    # Clear an area
    print("Clearing area...")
    client.fill_area(10, 64, 10, 20, 74, 20, "minecraft:air", "replace")
    
    # Create a platform
    print("Creating platform...")
    client.fill_area(10, 64, 10, 20, 64, 20, "minecraft:stone", "replace")
    
    # Create a pyramid
    print("Creating pyramid...")
    for level in range(5):
        size = 5 - level
        y = 65 + level
        client.fill_area(
            12 + level, y, 12 + level,
            12 + size, y, 12 + size,
            "minecraft:sandstone", "replace"
        )
    
    print("Terrain manipulation completed!")
    print("\n" + "="*50 + "\n")


def example_raw_commands():
    """Example: Execute raw Minecraft commands"""
    print("=== Example 4: Raw Commands ===")
    
    client = MCPClient()
    
    # Say hello in chat
    print("Sending chat message...")
    client.execute_command("say Hello from MCP!")
    
    # Set time to day
    print("Setting time to day...")
    client.execute_command("time set day")
    
    # Set weather to clear
    print("Setting weather to clear...")
    client.execute_command("weather clear")
    
    # Give player a diamond
    print("Giving diamond to nearest player...")
    client.execute_command("give @p diamond 1")
    
    print("Raw commands executed!")
    print("\n" + "="*50 + "\n")


def example_advanced_building():
    """Example: Advanced building with cloning"""
    print("=== Example 5: Advanced Building ===")
    
    client = MCPClient()
    
    # Build a small structure
    print("Building original structure...")
    client.fill_area(30, 64, 30, 32, 66, 32, "minecraft:gold_block", "replace")
    
    # Clone it multiple times
    print("Cloning structure...")
    for i in range(3):
        dest_x = 30 + (i + 1) * 5
        client.clone_area(30, 64, 30, 32, 66, 32, dest_x, 64, 30)
    
    print("Advanced building completed!")
    print("\n" + "="*50 + "\n")


def example_command_history():
    """Example: View command history"""
    print("=== Example 6: Command History ===")
    
    client = MCPClient()
    
    # Execute a few commands
    client.place_block("minecraft:diamond_block", 0, 100, 0)
    client.execute_command("say Testing history")
    client.remove_block(0, 100, 0)
    
    # Get history
    print("Retrieving command history...")
    history = client.get_command_history(limit=10)
    
    print(f"\nTotal commands: {history['total']}")
    print("\nRecent commands:")
    for cmd in history['commands'][-5:]:
        print(f"  - {cmd['id']}: {cmd['command']} [{cmd['status']}]")
    
    print("\n" + "="*50 + "\n")


def main():
    """Run all examples"""
    print("Minecraft Control Program (MCP) - Usage Examples")
    print("="*50)
    print("\nMake sure the MCP server is running:")
    print("  python -m scripts.minecraft.mcp-server.api")
    print("\n" + "="*50 + "\n")
    
    try:
        # Run examples
        example_basic_operations()
        example_build_structure()
        example_terrain_manipulation()
        example_raw_commands()
        example_advanced_building()
        example_command_history()
        
        print("\n✓ All examples completed successfully!")
        
    except requests.exceptions.ConnectionError:
        print("\n✗ Error: Could not connect to MCP server")
        print("Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"\n✗ Error: {e}")


if __name__ == "__main__":
    main()
