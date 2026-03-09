#!/usr/bin/env python3
"""
Minecraft Bedrock Launcher and World Verification Tool
"""

import os
import subprocess
import time
from pathlib import Path
from typing import Optional, List
import json

class MinecraftLauncher:
    """Launch Minecraft and verify worlds"""
    
    def __init__(self):
        self.worlds_dir = Path(os.path.expandvars(
            r"%LOCALAPPDATA%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\minecraftWorlds"
        ))
        
    def list_worlds(self) -> List[dict]:
        """List all detected worlds with their details"""
        worlds = []
        
        if not self.worlds_dir.exists():
            return worlds
            
        for world_dir in self.worlds_dir.iterdir():
            if not world_dir.is_dir():
                continue
                
            world_info = {
                "id": world_dir.name,
                "path": str(world_dir),
                "valid": False,
                "name": "Unknown",
                "has_level_dat": False,
                "has_db": False,
                "has_levelname": False
            }
            
            # Check essential files
            level_dat = world_dir / "level.dat"
            db_dir = world_dir / "db"
            levelname_txt = world_dir / "levelname.txt"
            
            world_info["has_level_dat"] = level_dat.exists()
            world_info["has_db"] = db_dir.exists() and db_dir.is_dir()
            world_info["has_levelname"] = levelname_txt.exists()
            
            # Read world name
            if levelname_txt.exists():
                try:
                    world_info["name"] = levelname_txt.read_text(encoding='utf-8').strip()
                except:
                    pass
            
            # Check if valid (has all required components)
            world_info["valid"] = (
                world_info["has_level_dat"] and 
                world_info["has_db"] and 
                world_info["has_levelname"]
            )
            
            # Check pack associations
            bp_json = world_dir / "world_behavior_packs.json"
            rp_json = world_dir / "world_resource_packs.json"
            
            if bp_json.exists():
                try:
                    packs = json.loads(bp_json.read_text())
                    world_info["behavior_packs"] = len(packs)
                except:
                    world_info["behavior_packs"] = 0
            
            if rp_json.exists():
                try:
                    packs = json.loads(rp_json.read_text())
                    world_info["resource_packs"] = len(packs)
                except:
                    world_info["resource_packs"] = 0
            
            worlds.append(world_info)
        
        return worlds
    
    def is_minecraft_running(self) -> bool:
        """Check if Minecraft is currently running"""
        try:
            result = subprocess.run(
                ['powershell', '-Command', 'Get-Process -Name "Minecraft.Windows" -ErrorAction SilentlyContinue | Select-Object ProcessName'],
                capture_output=True,
                text=True,
                timeout=5
            )
            return "Minecraft.Windows" in result.stdout
        except:
            return False
    
    def launch_minecraft(self, wait_seconds: int = 5) -> bool:
        """Launch Minecraft Bedrock Edition"""
        print("Launching Minecraft Bedrock Edition...")
        
        try:
            # Use minecraft: URI protocol
            subprocess.run(
                ['powershell', '-Command', 'Start-Process "minecraft:"'],
                capture_output=True,
                timeout=10
            )
            print(f"Waiting {wait_seconds}s for startup...")
            time.sleep(wait_seconds)
            
            if self.is_minecraft_running():
                print("✓ Minecraft is running!")
                return True
            else:
                print("✗ Minecraft process not detected")
                return False
        except Exception as e:
            print(f"✗ Launch failed: {e}")
            return False
    
    def verify_world_exists(self, world_name: str) -> Optional[str]:
        """Verify a world exists and return its ID"""
        worlds = self.list_worlds()
        
        for world in worlds:
            if world["name"] == world_name:
                return world["id"]
        
        return None
    
    def print_world_status(self):
        """Print detailed status of all worlds"""
        worlds = self.list_worlds()
        
        print(f"\n{'='*70}")
        print(f"MINECRAFT WORLDS STATUS")
        print(f"{'='*70}\n")
        print(f"Total worlds found: {len(worlds)}\n")
        
        for world in worlds:
            status = "✓ VALID" if world["valid"] else "✗ INVALID"
            print(f"{status} - {world['name']}")
            print(f"  ID: {world['id']}")
            print(f"  level.dat: {world['has_level_dat']}")
            print(f"  db/: {world['has_db']}")
            print(f"  levelname.txt: {world['has_levelname']}")
            
            if "behavior_packs" in world:
                print(f"  Behavior Packs: {world['behavior_packs']}")
            if "resource_packs" in world:
                print(f"  Resource Packs: {world['resource_packs']}")
            
            print()

if __name__ == "__main__":
    launcher = MinecraftLauncher()
    
    # Show current world status
    launcher.print_world_status()
    
    # Check if Minecraft is running
    if launcher.is_minecraft_running():
        print("Minecraft is already running.")
    else:
        print("\nMinecraft is not running.")
        response = input("Launch Minecraft now? (y/n): ").strip().lower()
        if response == 'y':
            launcher.launch_minecraft(wait_seconds=10)
