#!/usr/bin/env python3
"""
Local Minecraft Addon Manager
Handles packaging, importing, and applying addons for local Minecraft Bedrock installation
"""

import os
import json
import shutil
import zipfile
import subprocess
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List


class LocalAddonManager:
    """
    Manages local Minecraft Bedrock addon installation and world creation
    """
    
    def __init__(self):
        """Initialize addon manager with standard Minecraft paths"""
        localappdata = os.environ.get('LOCALAPPDATA', '')
        self.minecraft_root = Path(localappdata) / "Packages" / "Microsoft.MinecraftUWP_8wekyb3d8bbwe" / "LocalState" / "games" / "com.mojang"
        
        if not self.minecraft_root.exists():
            raise RuntimeError("Minecraft Bedrock Edition not found. Is it installed?")
        
        self.behavior_packs_dir = self.minecraft_root / "behavior_packs"
        self.resource_packs_dir = self.minecraft_root / "resource_packs"
        self.worlds_dir = self.minecraft_root / "minecraftWorlds"
        
        # Create directories if they don't exist
        self.behavior_packs_dir.mkdir(exist_ok=True)
        self.resource_packs_dir.mkdir(exist_ok=True)
        self.worlds_dir.mkdir(exist_ok=True)
    
    def package_addon(
        self,
        behavior_pack_path: Optional[str] = None,
        resource_pack_path: Optional[str] = None,
        output_path: str = None
    ) -> str:
        """
        Package behavior and/or resource packs into .mcaddon or .mcpack file
        
        Args:
            behavior_pack_path: Path to behavior pack directory
            resource_pack_path: Path to resource pack directory
            output_path: Where to save the packaged file
            
        Returns:
            Path to created package file
        """
        if not behavior_pack_path and not resource_pack_path:
            raise ValueError("Must provide at least one pack path")
        
        # Determine package type and name
        if behavior_pack_path and resource_pack_path:
            # Full addon
            extension = ".mcaddon"
            base_name = Path(behavior_pack_path).name
        elif behavior_pack_path:
            extension = ".mcpack"
            base_name = Path(behavior_pack_path).name
        else:
            extension = ".mcpack"
            base_name = Path(resource_pack_path).name
        
        if output_path is None:
            output_path = f"{base_name}{extension}"
        
        output_file = Path(output_path)
        
        print(f"Packaging addon: {output_file}")
        
        with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Package behavior pack
            if behavior_pack_path:
                pack_path = Path(behavior_pack_path)
                for file_path in pack_path.rglob('*'):
                    if file_path.is_file():
                        arcname = str(file_path.relative_to(pack_path.parent))
                        zipf.write(file_path, arcname)
                        print(f"  Added: {arcname}")
            
            # Package resource pack
            if resource_pack_path:
                pack_path = Path(resource_pack_path)
                for file_path in pack_path.rglob('*'):
                    if file_path.is_file():
                        arcname = str(file_path.relative_to(pack_path.parent))
                        zipf.write(file_path, arcname)
                        print(f"  Added: {arcname}")
        
        print(f"✓ Created package: {output_file}")
        return str(output_file)
    
    def import_addon(self, package_path: str) -> bool:
        """
        Import addon by triggering Windows file association (simulates double-click)
        
        Args:
            package_path: Path to .mcpack or .mcaddon file
            
        Returns:
            True if import initiated successfully
        """
        package_file = Path(package_path)
        
        if not package_file.exists():
            raise FileNotFoundError(f"Package not found: {package_path}")
        
        if package_file.suffix not in ['.mcpack', '.mcaddon', '.mcworld']:
            raise ValueError(f"Invalid package type: {package_file.suffix}")
        
        print(f"Importing addon: {package_file}")
        print("This will open Minecraft to complete the import...")
        
        try:
            # Use Windows start command to open file with default application
            subprocess.run(['cmd', '/c', 'start', '', str(package_file.absolute())], check=True)
            print("✓ Import initiated - Minecraft should open to complete import")
            print("  Note: Addon can only be imported once per version number")
            return True
        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to import addon: {e}")
            return False
    
    def increment_pack_version(self, pack_path: str) -> tuple:
        """
        Increment the version number in a pack's manifest.json
        
        Args:
            pack_path: Path to pack directory
            
        Returns:
            Tuple of (old_version, new_version)
        """
        manifest_path = Path(pack_path) / "manifest.json"
        
        if not manifest_path.exists():
            raise FileNotFoundError(f"manifest.json not found in {pack_path}")
        
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        # Get current version
        old_version = manifest['header']['version']
        
        # Increment patch version
        new_version = old_version.copy()
        new_version[2] += 1
        
        # Update manifest
        manifest['header']['version'] = new_version
        for module in manifest.get('modules', []):
            module['version'] = new_version
        
        # Write back
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        print(f"✓ Updated version: {old_version} → {new_version}")
        return (old_version, new_version)
    
    def create_test_world(
        self,
        world_name: str,
        behavior_pack_uuid: Optional[str] = None,
        resource_pack_uuid: Optional[str] = None
    ) -> str:
        """
        Create a new Minecraft world with addons pre-applied
        
        Args:
            world_name: Name for the new world
            behavior_pack_uuid: UUID of behavior pack to apply
            resource_pack_uuid: UUID of resource pack to apply
            
        Returns:
            Path to created world directory
        """
        # Generate unique world directory name
        world_id = str(uuid.uuid4()).replace('-', '')
        world_dir = self.worlds_dir / world_id
        world_dir.mkdir(exist_ok=True)
        
        print(f"Creating world: {world_name}")
        print(f"  Location: {world_dir}")
        
        # Create level.dat (world configuration)
        level_dat = {
            "LevelName": world_name,
            "GameType": 1,  # Creative mode
            "Difficulty": 1,  # Easy
            "Generator": 1,  # Infinite
            "experiments": {
                "experiments_ever_used": True,
                "saved_with_toggled_experiments": True
            }
        }
        
        # Create world_behavior_packs.json if behavior pack specified
        if behavior_pack_uuid:
            bp_config = [{
                "pack_id": behavior_pack_uuid,
                "version": [1, 0, 0]
            }]
            with open(world_dir / "world_behavior_packs.json", 'w') as f:
                json.dump(bp_config, f, indent=2)
            print(f"  ✓ Applied behavior pack: {behavior_pack_uuid}")
        
        # Create world_resource_packs.json if resource pack specified
        if resource_pack_uuid:
            rp_config = [{
                "pack_id": resource_pack_uuid,
                "version": [1, 0, 0]
            }]
            with open(world_dir / "world_resource_packs.json", 'w') as f:
                json.dump(rp_config, f, indent=2)
            print(f"  ✓ Applied resource pack: {resource_pack_uuid}")
        
        # Create minimal levelname.txt
        with open(world_dir / "levelname.txt", 'w') as f:
            f.write(world_name)
        
        print(f"✓ World created: {world_name}")
        print(f"  Note: World will appear in Minecraft after restart/refresh")
        
        return str(world_dir)
    
    def get_pack_uuid(self, pack_path: str) -> str:
        """
        Get UUID from a pack's manifest.json
        
        Args:
            pack_path: Path to pack directory
            
        Returns:
            Pack UUID string
        """
        manifest_path = Path(pack_path) / "manifest.json"
        
        if not manifest_path.exists():
            raise FileNotFoundError(f"manifest.json not found in {pack_path}")
        
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        return manifest['header']['uuid']
    
    def list_installed_packs(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        List all installed behavior and resource packs
        
        Returns:
            Dict with 'behavior_packs' and 'resource_packs' lists
        """
        result = {
            "behavior_packs": [],
            "resource_packs": []
        }
        
        # Scan behavior packs
        for pack_dir in self.behavior_packs_dir.iterdir():
            if pack_dir.is_dir():
                manifest_path = pack_dir / "manifest.json"
                if manifest_path.exists():
                    with open(manifest_path) as f:
                        manifest = json.load(f)
                    result["behavior_packs"].append({
                        "name": manifest['header']['name'],
                        "uuid": manifest['header']['uuid'],
                        "version": manifest['header']['version'],
                        "path": str(pack_dir)
                    })
        
        # Scan resource packs
        for pack_dir in self.resource_packs_dir.iterdir():
            if pack_dir.is_dir():
                manifest_path = pack_dir / "manifest.json"
                if manifest_path.exists():
                    with open(manifest_path) as f:
                        manifest = json.load(f)
                    result["resource_packs"].append({
                        "name": manifest['header']['name'],
                        "uuid": manifest['header']['uuid'],
                        "version": manifest['header']['version'],
                        "path": str(pack_dir)
                    })
        
        return result


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Local Minecraft Addon Manager")
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Package command
    pkg_parser = subparsers.add_parser('package', help='Package addon')
    pkg_parser.add_argument('--behavior-pack', help='Behavior pack directory')
    pkg_parser.add_argument('--resource-pack', help='Resource pack directory')
    pkg_parser.add_argument('--output', help='Output file path')
    
    # Import command
    import_parser = subparsers.add_parser('import', help='Import addon package')
    import_parser.add_argument('package', help='Path to .mcpack or .mcaddon file')
    
    # Increment version command
    version_parser = subparsers.add_parser('increment-version', help='Increment pack version')
    version_parser.add_argument('pack_path', help='Path to pack directory')
    
    # Create world command
    world_parser = subparsers.add_parser('create-world', help='Create test world with packs')
    world_parser.add_argument('world_name', help='Name for the world')
    world_parser.add_argument('--behavior-pack', help='Behavior pack directory')
    world_parser.add_argument('--resource-pack', help='Resource pack directory')
    
    # List packs command
    subparsers.add_parser('list', help='List installed packs')
    
    args = parser.parse_args()
    
    manager = LocalAddonManager()
    
    if args.command == 'package':
        package_path = manager.package_addon(
            behavior_pack_path=args.behavior_pack,
            resource_pack_path=args.resource_pack,
            output_path=args.output
        )
        print(f"\nPackage created: {package_path}")
        print("\nTo import, run:")
        print(f"  python local_addon_manager.py import {package_path}")
    
    elif args.command == 'import':
        manager.import_addon(args.package)
    
    elif args.command == 'increment-version':
        old, new = manager.increment_pack_version(args.pack_path)
        print(f"Version updated: {old} → {new}")
    
    elif args.command == 'create-world':
        bp_uuid = None
        rp_uuid = None
        
        if args.behavior_pack:
            bp_uuid = manager.get_pack_uuid(args.behavior_pack)
        
        if args.resource_pack:
            rp_uuid = manager.get_pack_uuid(args.resource_pack)
        
        world_path = manager.create_test_world(
            args.world_name,
            behavior_pack_uuid=bp_uuid,
            resource_pack_uuid=rp_uuid
        )
        print(f"\nWorld created at: {world_path}")
    
    elif args.command == 'list':
        packs = manager.list_installed_packs()
        print("\n=== Behavior Packs ===")
        for pack in packs['behavior_packs']:
            print(f"  {pack['name']} (v{pack['version']})")
            print(f"    UUID: {pack['uuid']}")
        print("\n=== Resource Packs ===")
        for pack in packs['resource_packs']:
            print(f"  {pack['name']} (v{pack['version']})")
            print(f"    UUID: {pack['uuid']}")
    
    else:
        parser.print_help()
