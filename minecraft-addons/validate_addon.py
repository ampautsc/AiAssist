#!/usr/bin/env python3
"""
Minecraft Bedrock Addon Validator
Validates addon structure, JSON syntax, and cross-references.
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

class AddonValidator:
    def __init__(self, bp_path: str, rp_path: str):
        self.bp_path = Path(bp_path)
        self.rp_path = Path(rp_path)
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.info: List[str] = []
        
        # Collected data for cross-reference validation
        self.rp_geometries: Set[str] = set()
        self.rp_textures: Set[str] = set()
        self.rp_animations: Set[str] = set()
        self.rp_anim_controllers: Set[str] = set()
        self.rp_client_entities: Dict[str, dict] = {}
        self.bp_entities: Dict[str, dict] = {}
        
    def validate_all(self) -> bool:
        """Run all validations and return True if no errors."""
        print("=" * 60)
        print("MINECRAFT BEDROCK ADDON VALIDATOR")
        print("=" * 60)
        
        # Phase 1: JSON Syntax Check
        print("\n[Phase 1] Checking JSON syntax...")
        self.validate_json_syntax()
        
        # Phase 2: Collect all resource definitions
        print("\n[Phase 2] Collecting resource definitions...")
        self.collect_geometries()
        self.collect_textures()
        self.collect_animations()
        self.collect_animation_controllers()
        self.collect_client_entities()
        self.collect_bp_entities()
        
        # Phase 3: Cross-reference validation
        print("\n[Phase 3] Validating cross-references...")
        self.validate_client_entity_references()
        self.validate_bp_entity_references()
        
        # Phase 4: Required files check
        print("\n[Phase 4] Checking required files...")
        self.check_required_files()
        
        # Print results
        self.print_results()
        
        return len(self.errors) == 0
    
    def validate_json_syntax(self):
        """Check all JSON files for syntax errors."""
        for path in [self.bp_path, self.rp_path]:
            if not path.exists():
                self.errors.append(f"Path does not exist: {path}")
                continue
                
            for json_file in path.rglob("*.json"):
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        json.load(f)
                except json.JSONDecodeError as e:
                    self.errors.append(f"JSON syntax error in {json_file.relative_to(path.parent)}: {e}")
                except Exception as e:
                    self.errors.append(f"Error reading {json_file}: {e}")
    
    def collect_geometries(self):
        """Collect all geometry definitions from RP."""
        models_path = self.rp_path / "models"
        if not models_path.exists():
            return
            
        for geo_file in models_path.rglob("*.json"):
            try:
                with open(geo_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                # Handle different geometry formats
                if "minecraft:geometry" in data:
                    for geo in data["minecraft:geometry"]:
                        if "description" in geo and "identifier" in geo["description"]:
                            geo_id = geo["description"]["identifier"]
                            self.rp_geometries.add(geo_id)
                            self.info.append(f"Found geometry: {geo_id}")
                # Older format
                for key in data:
                    if key.startswith("geometry."):
                        self.rp_geometries.add(key)
                        self.info.append(f"Found geometry (legacy): {key}")
            except Exception as e:
                pass  # Already caught in syntax check
    
    def collect_textures(self):
        """Collect all texture files from RP."""
        textures_path = self.rp_path / "textures"
        if not textures_path.exists():
            return
            
        for tex_file in textures_path.rglob("*.png"):
            # Store relative path without extension
            rel_path = tex_file.relative_to(self.rp_path).with_suffix('')
            tex_path = str(rel_path).replace("\\", "/")
            self.rp_textures.add(tex_path)
    
    def collect_animations(self):
        """Collect all animation definitions from RP."""
        anims_path = self.rp_path / "animations"
        if not anims_path.exists():
            return
            
        for anim_file in anims_path.rglob("*.json"):
            try:
                with open(anim_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                if "animations" in data:
                    for anim_id in data["animations"]:
                        self.rp_animations.add(anim_id)
                        self.info.append(f"Found animation: {anim_id}")
            except Exception:
                pass
    
    def collect_animation_controllers(self):
        """Collect all animation controller definitions from RP."""
        ac_path = self.rp_path / "animation_controllers"
        if not ac_path.exists():
            return
            
        for ac_file in ac_path.rglob("*.json"):
            try:
                with open(ac_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                if "animation_controllers" in data:
                    for ac_id in data["animation_controllers"]:
                        self.rp_anim_controllers.add(ac_id)
                        self.info.append(f"Found animation controller: {ac_id}")
            except Exception:
                pass
    
    def collect_client_entities(self):
        """Collect all client entity definitions from RP."""
        entity_path = self.rp_path / "entity"
        if not entity_path.exists():
            return
            
        for entity_file in entity_path.rglob("*.json"):
            try:
                with open(entity_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                if "minecraft:client_entity" in data:
                    desc = data["minecraft:client_entity"].get("description", {})
                    entity_id = desc.get("identifier", "unknown")
                    self.rp_client_entities[entity_id] = {
                        "file": str(entity_file),
                        "data": data["minecraft:client_entity"]
                    }
                    self.info.append(f"Found client entity: {entity_id}")
            except Exception:
                pass
    
    def collect_bp_entities(self):
        """Collect all behavior pack entity definitions."""
        entity_path = self.bp_path / "entities"
        if not entity_path.exists():
            return
            
        for entity_file in entity_path.rglob("*.json"):
            try:
                with open(entity_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                if "minecraft:entity" in data:
                    desc = data["minecraft:entity"].get("description", {})
                    entity_id = desc.get("identifier", "unknown")
                    self.bp_entities[entity_id] = {
                        "file": str(entity_file),
                        "data": data["minecraft:entity"]
                    }
                    self.info.append(f"Found BP entity: {entity_id}")
            except Exception:
                pass
    
    def validate_client_entity_references(self):
        """Validate that client entities reference existing resources."""
        for entity_id, entity_data in self.rp_client_entities.items():
            desc = entity_data["data"].get("description", {})
            
            # Check geometry references
            if "geometry" in desc:
                for geo_key, geo_ref in desc["geometry"].items():
                    if geo_ref not in self.rp_geometries:
                        self.errors.append(
                            f"Entity '{entity_id}' references missing geometry: {geo_ref}"
                        )
            
            # Check texture references
            if "textures" in desc:
                for tex_key, tex_ref in desc["textures"].items():
                    if tex_ref not in self.rp_textures:
                        self.warnings.append(
                            f"Entity '{entity_id}' references texture: {tex_ref} (verify path exists)"
                        )
            
            # Check animation references
            if "animations" in desc:
                for anim_key, anim_ref in desc["animations"].items():
                    if anim_ref not in self.rp_animations and anim_ref not in self.rp_anim_controllers:
                        self.errors.append(
                            f"Entity '{entity_id}' references missing animation/controller: {anim_ref}"
                        )
            
            # Check animation controller script references
            if "scripts" in desc and "animate" in desc["scripts"]:
                for anim_entry in desc["scripts"]["animate"]:
                    if isinstance(anim_entry, str):
                        anim_name = anim_entry
                    elif isinstance(anim_entry, dict):
                        anim_name = list(anim_entry.keys())[0]
                    else:
                        continue
                    
                    # Check if this animation name is defined in the entity's animations
                    if "animations" in desc and anim_name not in desc["animations"]:
                        self.errors.append(
                            f"Entity '{entity_id}' script references undefined animation key: {anim_name}"
                        )
    
    def validate_bp_entity_references(self):
        """Validate that BP entities have corresponding client entities."""
        for entity_id in self.bp_entities:
            if entity_id not in self.rp_client_entities:
                self.errors.append(
                    f"BP entity '{entity_id}' has no matching client entity in resource pack"
                )
    
    def check_required_files(self):
        """Check for required addon files."""
        # Check BP manifest
        bp_manifest = self.bp_path / "manifest.json"
        if not bp_manifest.exists():
            self.errors.append("Missing behavior pack manifest.json")
        
        # Check RP manifest
        rp_manifest = self.rp_path / "manifest.json"
        if not rp_manifest.exists():
            self.errors.append("Missing resource pack manifest.json")
        
        # Check for language files
        bp_lang = self.bp_path / "texts" / "en_US.lang"
        rp_lang = self.rp_path / "texts" / "en_US.lang"
        
        if not bp_lang.exists():
            self.warnings.append("Missing BP texts/en_US.lang")
        if not rp_lang.exists():
            self.warnings.append("Missing RP texts/en_US.lang")
    
    def print_results(self):
        """Print validation results."""
        print("\n" + "=" * 60)
        print("VALIDATION RESULTS")
        print("=" * 60)
        
        if self.errors:
            print(f"\n❌ ERRORS ({len(self.errors)}):")
            for error in self.errors:
                print(f"   • {error}")
        
        if self.warnings:
            print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
            for warning in self.warnings:
                print(f"   • {warning}")
        
        if not self.errors and not self.warnings:
            print("\n✅ All validations passed!")
        elif not self.errors:
            print(f"\n✅ No errors found ({len(self.warnings)} warnings)")
        else:
            print(f"\n❌ Validation failed with {len(self.errors)} errors")
        
        print("\n" + "=" * 60)
        
        # Print collected resources summary
        print("\nRESOURCE SUMMARY:")
        print(f"  Geometries:    {len(self.rp_geometries)}")
        print(f"  Animations:    {len(self.rp_animations)}")
        print(f"  Anim Controllers: {len(self.rp_anim_controllers)}")
        print(f"  Client Entities:  {len(self.rp_client_entities)}")
        print(f"  BP Entities:      {len(self.bp_entities)}")


def main():
    # Default paths
    addon_base = Path(__file__).parent
    bp_path = addon_base / "behavior-packs" / "monarch_garden"
    rp_path = addon_base / "resource-packs" / "monarch_garden"
    
    # Allow command line overrides
    if len(sys.argv) >= 3:
        bp_path = Path(sys.argv[1])
        rp_path = Path(sys.argv[2])
    
    validator = AddonValidator(str(bp_path), str(rp_path))
    success = validator.validate_all()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
