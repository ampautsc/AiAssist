#!/usr/bin/env python3
"""
Behavior Pack Manager
Manages Minecraft Bedrock behavior packs for MCP integration
"""

import os
import json
import shutil
import zipfile
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List


class BehaviorPackManager:
    """
    Manages behavior pack creation, loading, and deployment
    """
    
    def __init__(self, packs_directory: Optional[str] = None):
        """
        Initialize pack manager
        
        Args:
            packs_directory: Directory to store behavior packs
        """
        if packs_directory is None:
            packs_directory = os.path.join(
                os.path.dirname(__file__),
                "behavior-packs"
            )
        
        self.packs_directory = Path(packs_directory)
        self.packs_directory.mkdir(exist_ok=True)
        
    def create_pack(
        self,
        pack_name: str,
        description: str,
        scripts: Optional[List[str]] = None
    ) -> Path:
        """
        Create a new behavior pack
        
        Args:
            pack_name: Name of the pack
            description: Pack description
            scripts: List of script file paths to include
            
        Returns:
            Path to created pack directory
        """
        # Create pack directory
        pack_dir = self.packs_directory / pack_name.replace(" ", "_")
        pack_dir.mkdir(exist_ok=True)
        
        # Create manifest
        manifest = {
            "format_version": 2,
            "header": {
                "name": pack_name,
                "description": description,
                "uuid": str(uuid.uuid4()),
                "version": [1, 0, 0],
                "min_engine_version": [1, 20, 0]
            },
            "modules": [
                {
                    "type": "script",
                    "language": "javascript",
                    "uuid": str(uuid.uuid4()),
                    "version": [1, 0, 0],
                    "entry": "scripts/main.js"
                }
            ],
            "dependencies": [
                {
                    "module_name": "@minecraft/server",
                    "version": "1.8.0"
                }
            ]
        }
        
        # Write manifest
        manifest_path = pack_dir / "manifest.json"
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        # Create scripts directory
        scripts_dir = pack_dir / "scripts"
        scripts_dir.mkdir(exist_ok=True)
        
        # Copy scripts if provided
        if scripts:
            for script_path in scripts:
                if os.path.exists(script_path):
                    dest = scripts_dir / os.path.basename(script_path)
                    shutil.copy(script_path, dest)
        
        print(f"✓ Created behavior pack: {pack_dir}")
        return pack_dir
    
    def package_pack(self, pack_name: str, output_path: Optional[str] = None) -> Path:
        """
        Package a behavior pack into .mcpack file
        
        Args:
            pack_name: Name of the pack to package
            output_path: Output path for .mcpack file
            
        Returns:
            Path to created .mcpack file
        """
        pack_dir = self.packs_directory / pack_name.replace(" ", "_")
        
        if not pack_dir.exists():
            raise ValueError(f"Pack not found: {pack_name}")
        
        # Determine output path
        if output_path is None:
            output_path = self.packs_directory / f"{pack_name.replace(' ', '_')}.mcpack"
        else:
            output_path = Path(output_path)
        
        # Create zip file
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(pack_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, pack_dir)
                    zipf.write(file_path, arcname)
        
        print(f"✓ Packaged behavior pack: {output_path}")
        return output_path
    
    def install_to_minecraft(self, pack_name: str) -> bool:
        """
        Install pack to Minecraft's behavior_packs directory
        
        Args:
            pack_name: Name of the pack to install
            
        Returns:
            True if successful
        """
        pack_dir = self.packs_directory / pack_name.replace(" ", "_")
        
        if not pack_dir.exists():
            raise ValueError(f"Pack not found: {pack_name}")
        
        # Try to find Minecraft directory
        minecraft_dirs = self._find_minecraft_directories()
        
        if not minecraft_dirs:
            print("✗ Could not find Minecraft installation")
            print("Please manually copy the pack to:")
            print("  Windows: %LocalAppData%\\Packages\\Microsoft.MinecraftUWP_8wekyb3d8bbwe\\LocalState\\games\\com.mojang\\behavior_packs\\")
            return False
        
        # Copy to first found directory
        dest_dir = minecraft_dirs[0] / pack_name.replace(" ", "_")
        
        if dest_dir.exists():
            shutil.rmtree(dest_dir)
        
        shutil.copytree(pack_dir, dest_dir)
        
        print(f"✓ Installed pack to: {dest_dir}")
        return True
    
    def _find_minecraft_directories(self) -> List[Path]:
        """
        Find Minecraft Bedrock installation directories
        
        Returns:
            List of behavior_packs directories
        """
        possible_paths = []
        
        # Windows
        if os.name == 'nt':
            localappdata = os.environ.get('LOCALAPPDATA', '')
            if localappdata:
                windows_path = Path(localappdata) / "Packages" / "Microsoft.MinecraftUWP_8wekyb3d8bbwe" / "LocalState" / "games" / "com.mojang" / "behavior_packs"
                if windows_path.exists():
                    possible_paths.append(windows_path)
        
        # Add other platform paths as needed
        
        return possible_paths
    
    def list_packs(self) -> List[Dict[str, Any]]:
        """
        List all behavior packs in the directory
        
        Returns:
            List of pack information dictionaries
        """
        packs = []
        
        for pack_dir in self.packs_directory.iterdir():
            if pack_dir.is_dir():
                manifest_path = pack_dir / "manifest.json"
                if manifest_path.exists():
                    with open(manifest_path) as f:
                        manifest = json.load(f)
                    
                    packs.append({
                        "name": manifest["header"]["name"],
                        "description": manifest["header"]["description"],
                        "version": manifest["header"]["version"],
                        "path": str(pack_dir)
                    })
        
        return packs
    
    def copy_template_pack(self, new_name: str) -> Path:
        """
        Copy the template pack to create a new pack
        
        Args:
            new_name: Name for the new pack
            
        Returns:
            Path to new pack directory
        """
        template_dir = Path(__file__).parent / "behavior-pack-template"
        
        if not template_dir.exists():
            raise ValueError("Template pack not found")
        
        # Create new pack directory
        new_pack_dir = self.packs_directory / new_name.replace(" ", "_")
        
        # Copy template
        shutil.copytree(template_dir, new_pack_dir, dirs_exist_ok=True)
        
        # Update manifest with new name and UUIDs
        manifest_path = new_pack_dir / "manifest.json"
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        manifest["header"]["name"] = new_name
        manifest["header"]["uuid"] = str(uuid.uuid4())
        manifest["modules"][0]["uuid"] = str(uuid.uuid4())
        
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        print(f"✓ Created pack from template: {new_pack_dir}")
        return new_pack_dir


def main():
    """CLI entry point for pack manager"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Minecraft Behavior Pack Manager")
    parser.add_argument('action', choices=['list', 'create', 'package', 'install', 'copy-template'])
    parser.add_argument('--name', help='Pack name')
    parser.add_argument('--description', help='Pack description')
    parser.add_argument('--output', help='Output path for package')
    
    args = parser.parse_args()
    
    manager = BehaviorPackManager()
    
    if args.action == 'list':
        packs = manager.list_packs()
        print("\nInstalled Behavior Packs:")
        print("=" * 50)
        for pack in packs:
            print(f"\nName: {pack['name']}")
            print(f"Description: {pack['description']}")
            print(f"Version: {'.'.join(map(str, pack['version']))}")
            print(f"Path: {pack['path']}")
        print()
    
    elif args.action == 'create':
        if not args.name:
            print("Error: --name required for create action")
            return
        
        description = args.description or f"Custom behavior pack: {args.name}"
        manager.create_pack(args.name, description)
    
    elif args.action == 'package':
        if not args.name:
            print("Error: --name required for package action")
            return
        
        manager.package_pack(args.name, args.output)
    
    elif args.action == 'install':
        if not args.name:
            print("Error: --name required for install action")
            return
        
        manager.install_to_minecraft(args.name)
    
    elif args.action == 'copy-template':
        if not args.name:
            print("Error: --name required for copy-template action")
            return
        
        manager.copy_template_pack(args.name)


if __name__ == "__main__":
    main()
