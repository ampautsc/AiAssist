#!/usr/bin/env python3
"""
Minecraft Bedrock Realms API Module
Handles uploading worlds and deploying packs to Minecraft Bedrock Realms
"""

import requests
import json
import os
import sys
import time
from typing import Optional, Dict, Any, List
from pathlib import Path


class RealmAPI:
    """Handles interactions with Minecraft Bedrock Realms API"""
    
    # Realms API base URLs
    REALMS_API_BASE = "https://pocket.realms.minecraft.net"
    
    def __init__(self, access_token: str):
        """
        Initialize Realms API handler
        
        Args:
            access_token: Minecraft access token from authentication
        """
        self.access_token = access_token
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {access_token}',
            'User-Agent': 'MCPE/Android',
            'Client-Version': '1.20.0',
            'Content-Type': 'application/json'
        })
    
    def get_realms(self) -> Optional[List[Dict[str, Any]]]:
        """
        Get list of realms for the authenticated user
        
        Returns:
            List of realm objects or None on failure
        """
        try:
            response = self.session.get(f"{self.REALMS_API_BASE}/worlds")
            
            if response.status_code == 200:
                data = response.json()
                return data.get('servers', [])
            else:
                print(f"Failed to get realms: {response.status_code}")
                print(f"Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"Error getting realms: {e}", file=sys.stderr)
            return None
    
    def get_realm_by_name(self, realm_name: str) -> Optional[Dict[str, Any]]:
        """
        Find a realm by name
        
        Args:
            realm_name: Name of the realm to find
            
        Returns:
            Realm object or None if not found
        """
        realms = self.get_realms()
        if not realms:
            return None
        
        for realm in realms:
            if realm.get('name') == realm_name:
                return realm
        
        print(f"Realm '{realm_name}' not found")
        return None
    
    def upload_world(self, realm_id: int, world_file: str) -> bool:
        """
        Upload a world file to a realm
        
        Args:
            realm_id: ID of the realm
            world_file: Path to .mcworld file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not os.path.exists(world_file):
                print(f"World file not found: {world_file}")
                return False
            
            print(f"Uploading world {world_file} to realm {realm_id}...")
            
            # Step 1: Request upload URL
            response = self.session.get(
                f"{self.REALMS_API_BASE}/worlds/{realm_id}/backups/upload"
            )
            
            if response.status_code != 200:
                print(f"Failed to get upload URL: {response.status_code}")
                return False
            
            upload_url = response.text.strip('"')
            print(f"Got upload URL: {upload_url[:50]}...")
            
            # Step 2: Upload the world file
            with open(world_file, 'rb') as f:
                upload_response = requests.put(
                    upload_url,
                    data=f,
                    headers={
                        'Content-Type': 'application/octet-stream'
                    }
                )
            
            if upload_response.status_code not in [200, 201]:
                print(f"Failed to upload world: {upload_response.status_code}")
                return False
            
            print("✓ World uploaded successfully")
            
            # Step 3: Restore the uploaded backup
            restore_response = self.session.put(
                f"{self.REALMS_API_BASE}/worlds/{realm_id}/backups"
            )
            
            if restore_response.status_code == 204:
                print("✓ World restored successfully")
                return True
            else:
                print(f"Failed to restore world: {restore_response.status_code}")
                return False
                
        except Exception as e:
            print(f"Error uploading world: {e}", file=sys.stderr)
            return False
    
    def deploy_resource_pack(self, realm_id: int, pack_file: str) -> bool:
        """
        Deploy a resource pack to a realm
        
        Args:
            realm_id: ID of the realm
            pack_file: Path to .mcpack file (resource pack)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not os.path.exists(pack_file):
                print(f"Resource pack file not found: {pack_file}")
                return False
            
            print(f"Deploying resource pack {pack_file} to realm {realm_id}...")
            
            # Request upload URL for resource pack
            response = self.session.get(
                f"{self.REALMS_API_BASE}/worlds/{realm_id}/slot/1/upload"
            )
            
            if response.status_code != 200:
                print(f"Failed to get resource pack upload URL: {response.status_code}")
                return False
            
            upload_url = response.text.strip('"')
            
            # Upload the resource pack
            with open(pack_file, 'rb') as f:
                upload_response = requests.put(
                    upload_url,
                    data=f,
                    headers={
                        'Content-Type': 'application/octet-stream'
                    }
                )
            
            if upload_response.status_code in [200, 201]:
                print("✓ Resource pack deployed successfully")
                return True
            else:
                print(f"Failed to deploy resource pack: {upload_response.status_code}")
                return False
                
        except Exception as e:
            print(f"Error deploying resource pack: {e}", file=sys.stderr)
            return False
    
    def deploy_behavior_pack(self, realm_id: int, pack_file: str) -> bool:
        """
        Deploy a behavior pack to a realm
        
        Args:
            realm_id: ID of the realm
            pack_file: Path to .mcpack file (behavior pack)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not os.path.exists(pack_file):
                print(f"Behavior pack file not found: {pack_file}")
                return False
            
            print(f"Deploying behavior pack {pack_file} to realm {realm_id}...")
            
            # Request upload URL for behavior pack (slot 2)
            response = self.session.get(
                f"{self.REALMS_API_BASE}/worlds/{realm_id}/slot/2/upload"
            )
            
            if response.status_code != 200:
                print(f"Failed to get behavior pack upload URL: {response.status_code}")
                return False
            
            upload_url = response.text.strip('"')
            
            # Upload the behavior pack
            with open(pack_file, 'rb') as f:
                upload_response = requests.put(
                    upload_url,
                    data=f,
                    headers={
                        'Content-Type': 'application/octet-stream'
                    }
                )
            
            if upload_response.status_code in [200, 201]:
                print("✓ Behavior pack deployed successfully")
                return True
            else:
                print(f"Failed to deploy behavior pack: {upload_response.status_code}")
                return False
                
        except Exception as e:
            print(f"Error deploying behavior pack: {e}", file=sys.stderr)
            return False
    
    def deploy_addon(self, realm_id: int, addon_file: str) -> bool:
        """
        Deploy an addon (.mcaddon) to a realm
        Note: .mcaddon files are typically zip files containing both resource and behavior packs
        
        Args:
            realm_id: ID of the realm
            addon_file: Path to .mcaddon file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            import zipfile
            import tempfile
            
            if not os.path.exists(addon_file):
                print(f"Addon file not found: {addon_file}")
                return False
            
            print(f"Deploying addon {addon_file} to realm {realm_id}...")
            
            # Extract addon to temporary directory
            with tempfile.TemporaryDirectory() as temp_dir:
                with zipfile.ZipFile(addon_file, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                
                # Look for resource and behavior packs
                resource_pack = None
                behavior_pack = None
                
                for item in os.listdir(temp_dir):
                    item_path = os.path.join(temp_dir, item)
                    if os.path.isdir(item_path):
                        # Check if it's a resource or behavior pack
                        manifest_path = os.path.join(item_path, 'manifest.json')
                        if os.path.exists(manifest_path):
                            with open(manifest_path) as f:
                                manifest = json.load(f)
                                pack_type = manifest.get('modules', [{}])[0].get('type', '')
                                
                                if pack_type == 'resources':
                                    resource_pack = item_path
                                elif pack_type in ['data', 'script']:
                                    behavior_pack = item_path
                
                success = True
                
                # Deploy resource pack if found
                if resource_pack:
                    # Create temporary zip for resource pack
                    resource_zip = os.path.join(temp_dir, 'resource_pack.mcpack')
                    with zipfile.ZipFile(resource_zip, 'w') as zf:
                        for root, dirs, files in os.walk(resource_pack):
                            for file in files:
                                file_path = os.path.join(root, file)
                                arcname = os.path.relpath(file_path, resource_pack)
                                zf.write(file_path, arcname)
                    
                    if not self.deploy_resource_pack(realm_id, resource_zip):
                        success = False
                
                # Deploy behavior pack if found
                if behavior_pack:
                    # Create temporary zip for behavior pack
                    behavior_zip = os.path.join(temp_dir, 'behavior_pack.mcpack')
                    with zipfile.ZipFile(behavior_zip, 'w') as zf:
                        for root, dirs, files in os.walk(behavior_pack):
                            for file in files:
                                file_path = os.path.join(root, file)
                                arcname = os.path.relpath(file_path, behavior_pack)
                                zf.write(file_path, arcname)
                    
                    if not self.deploy_behavior_pack(realm_id, behavior_zip):
                        success = False
                
                return success
                
        except Exception as e:
            print(f"Error deploying addon: {e}", file=sys.stderr)
            return False


def main():
    """CLI entry point for Realm operations"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Minecraft Bedrock Realms API Tool')
    parser.add_argument('--realm-name', required=True, help='Name of the realm')
    parser.add_argument('--world-file', help='Path to .mcworld file to upload')
    parser.add_argument('--resource-pack', help='Path to resource pack .mcpack file')
    parser.add_argument('--behavior-pack', help='Path to behavior pack .mcpack file')
    parser.add_argument('--addon', help='Path to .mcaddon file')
    parser.add_argument('--token-file', default='/tmp/minecraft_tokens.json',
                        help='Path to tokens file from authentication')
    
    args = parser.parse_args()
    
    # Load tokens
    if not os.path.exists(args.token_file):
        print(f"Error: Token file not found: {args.token_file}")
        print("Run auth.py first to authenticate")
        sys.exit(1)
    
    with open(args.token_file) as f:
        tokens = json.load(f)
    
    access_token = tokens.get('access_token')
    if not access_token:
        print("Error: No access token found in token file")
        sys.exit(1)
    
    # Initialize Realm API
    api = RealmAPI(access_token)
    
    # Get realm by name
    print(f"Looking for realm: {args.realm_name}")
    realm = api.get_realm_by_name(args.realm_name)
    
    if not realm:
        print(f"Error: Realm '{args.realm_name}' not found")
        print("\nAvailable realms:")
        realms = api.get_realms()
        if realms:
            for r in realms:
                print(f"  - {r.get('name')} (ID: {r.get('id')})")
        sys.exit(1)
    
    realm_id = realm['id']
    print(f"Found realm: {realm['name']} (ID: {realm_id})")
    
    success = True
    
    # Upload world if provided
    if args.world_file:
        if not api.upload_world(realm_id, args.world_file):
            success = False
    
    # Deploy addon if provided
    if args.addon:
        if not api.deploy_addon(realm_id, args.addon):
            success = False
    
    # Deploy resource pack if provided
    if args.resource_pack:
        if not api.deploy_resource_pack(realm_id, args.resource_pack):
            success = False
    
    # Deploy behavior pack if provided
    if args.behavior_pack:
        if not api.deploy_behavior_pack(realm_id, args.behavior_pack):
            success = False
    
    if success:
        print("\n✓ All operations completed successfully!")
        sys.exit(0)
    else:
        print("\n✗ Some operations failed")
        sys.exit(1)


if __name__ == '__main__':
    main()
