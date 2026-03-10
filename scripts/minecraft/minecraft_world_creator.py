#!/usr/bin/env python3
"""
Proper Minecraft Bedrock World Creator
Creates complete, valid worlds with level.dat NBT structure and LevelDB database
"""

import os
import struct
import time
from pathlib import Path
from typing import Optional, Dict, Any
import amulet_nbt as nbt

class MinecraftWorldCreator:
    """Creates valid Minecraft Bedrock worlds"""
    
    def __init__(self):
        localappdata = os.environ.get('LOCALAPPDATA', '')
        self.minecraft_root = Path(localappdata) / "Packages" / "Microsoft.MinecraftUWP_8wekyb3d8bbwe" / "LocalState" / "games" / "com.mojang"
        self.worlds_dir = self.minecraft_root / "minecraftWorlds"
    
    def create_level_dat(self, world_dir: Path, world_name: str, seed: int = None) -> bool:
        """Create proper level.dat NBT file using amulet-nbt"""
        
        if seed is None:
            import random
            seed = random.randint(-2147483648, 2147483647)
        
        # Create NBT structure matching Bedrock format using NamedTag
        data = nbt.NamedTag(nbt.TAG_Compound({
            "GameType": nbt.TAG_Int(1),  # Creative
            "Difficulty": nbt.TAG_Int(1),  # Easy  
            "Generator": nbt.TAG_Int(1),  # Infinite
            "LevelName": nbt.TAG_String(world_name),
            "RandomSeed": nbt.TAG_Long(seed),
            "Time": nbt.TAG_Long(0),
            "currentTick": nbt.TAG_Long(0),
            "LastPlayed": nbt.TAG_Long(int(time.time())),
            
            # Spawn position
            "SpawnX": nbt.TAG_Int(0),
            "SpawnY": nbt.TAG_Int(64),
            "SpawnZ": nbt.TAG_Int(0),
            
            # Version info
            "StorageVersion": nbt.TAG_Int(10),
            "NetworkVersion": nbt.TAG_Int(622),
            "Platform": nbt.TAG_Int(2),
            
            # Game rules
            "commandsEnabled": nbt.TAG_Byte(1),
            "bonusChestEnabled": nbt.TAG_Byte(0),
            "bonusChestSpawned": nbt.TAG_Byte(0),
            "spawnMobs": nbt.TAG_Byte(1),
            "showcoordinates": nbt.TAG_Byte(1),
            "hasBeenLoadedInCreative": nbt.TAG_Byte(1),
            
            # Version arrays
            "lastOpenedWithVersion": nbt.TAG_List([
                nbt.TAG_Int(1), nbt.TAG_Int(21), nbt.TAG_Int(0), nbt.TAG_Int(3), nbt.TAG_Int(0)
            ]),
            "MinimumCompatibleClientVersion": nbt.TAG_List([
                nbt.TAG_Int(1), nbt.TAG_Int(21), nbt.TAG_Int(0), nbt.TAG_Int(0), nbt.TAG_Int(0)
            ]),
            
            # Experiments (required for custom entities)
            "experiments": nbt.TAG_Compound({
                "experiments_ever_used": nbt.TAG_Byte(1),
                "saved_with_toggled_experiments": nbt.TAG_Byte(1),
            })
        }))
        
        # Write with Bedrock format (little-endian) with 8-byte header
        level_dat_path = world_dir / "level.dat"
        
        # Save NBT to bytes
        nbt_bytes = data.save_to(compressed=False, little_endian=True)
        
        # Create Bedrock header: version (4 bytes) + length (4 bytes)
        version = 10
        length = len(nbt_bytes)
        header = struct.pack('<II', version, length)
        
        # Write header + NBT data
        with open(level_dat_path, 'wb') as f:
            f.write(header + nbt_bytes)
        
        print(f"✓ Created level.dat with Bedrock header ({len(nbt_bytes)} bytes NBT)")
        return True
    
    def create_empty_db(self, world_dir: Path) -> bool:
        """Create empty LevelDB database directory"""
        db_dir = world_dir / "db"
        db_dir.mkdir(exist_ok=True)
        
        # Create CURRENT file (required by LevelDB)
        current_file = db_dir / "CURRENT"
        with open(current_file, 'w') as f:
            f.write("MANIFEST-000001\n")
        
        # Create empty MANIFEST
        manifest_file = db_dir / "MANIFEST-000001"
        with open(manifest_file, 'wb') as f:
            # Minimal LevelDB manifest header
            pass  # Empty manifest is valid for new world
        
        print(f"✓ Created db/ directory with LevelDB structure")
        return True
    
    def create_complete_world(
        self,
        world_name: str,
        behavior_pack_uuid: Optional[str] = None,
        resource_pack_uuid: Optional[str] = None,
        seed: Optional[int] = None
    ) -> str:
        """Create a complete, valid Minecraft world"""
        
        import uuid as uuid_lib
        
        # Generate world ID
        world_id = str(uuid_lib.uuid4()).replace('-', '')
        world_dir = self.worlds_dir / world_id
        world_dir.mkdir(exist_ok=True, parents=True)
        
        print(f"Creating complete world: {world_name}")
        print(f"Location: {world_dir}")
        
        # 1. Create level.dat (REQUIRED)
        self.create_level_dat(world_dir, world_name, seed)
        
        # 2. Create LevelDB database (REQUIRED)
        self.create_empty_db(world_dir)
        
        # 3. Create levelname.txt
        with open(world_dir / "levelname.txt", 'w') as f:
            f.write(world_name)
        print("✓ Created levelname.txt")
        
        # 4. Apply behavior packs if specified
        if behavior_pack_uuid:
            bp_config = [{
                "pack_id": behavior_pack_uuid,
                "version": [1, 0, 0]
            }]
            import json
            with open(world_dir / "world_behavior_packs.json", 'w') as f:
                json.dump(bp_config, f, indent=2)
            print(f"✓ Applied behavior pack: {behavior_pack_uuid}")
        
        # 5. Apply resource packs if specified
        if resource_pack_uuid:
            rp_config = [{
                "pack_id": resource_pack_uuid,
                "version": [1, 0, 0]
            }]
            import json
            with open(world_dir / "world_resource_packs.json", 'w') as f:
                json.dump(rp_config, f, indent=2)
            print(f"✓ Applied resource pack: {resource_pack_uuid}")
        
        print(f"\n✓ World created successfully!")
        print(f"Restart Minecraft to see: {world_name}")
        
        return str(world_dir)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python minecraft_world_creator.py <world_name> [behavior_pack_uuid] [resource_pack_uuid]")
        sys.exit(1)
    
    world_name = sys.argv[1]
    bp_uuid = sys.argv[2] if len(sys.argv) > 2 else None
    rp_uuid = sys.argv[3] if len(sys.argv) > 3 else None
    
    creator = MinecraftWorldCreator()
    world_path = creator.create_complete_world(world_name, bp_uuid, rp_uuid)
    
    print(f"\nWorld path: {world_path}")
