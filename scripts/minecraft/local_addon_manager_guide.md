# Local Addon Manager - Usage Guide

## Overview

Tool for managing Minecraft Bedrock addons on local installations. Handles packaging, importing, version management, and world creation.

## Commands

### Package Addon

Create .mcpack or .mcaddon files from pack directories:

```bash
python local_addon_manager.py package \
  --behavior-pack path/to/behavior_pack \
  --resource-pack path/to/resource_pack \
  --output my_addon.mcaddon
```

- Behavior pack only → creates .mcpack
- Resource pack only → creates .mcpack
- Both packs → creates .mcaddon

### Import Addon

Trigger Windows file association to import into Minecraft:

```bash
python local_addon_manager.py import path/to/addon.mcaddon
```

**Important:** Addon can only be imported ONCE per version number. To re-import, you must increment the version first.

### Increment Version

Auto-update version number in pack manifest:

```bash
python local_addon_manager.py increment-version path/to/pack_directory
```

Increments patch version (e.g., [1, 0, 0] → [1, 0, 1])

### Create World

Programmatically create a Minecraft world with packs pre-applied:

```bash
python local_addon_manager.py create-world "World Name" \
  --behavior-pack path/to/behavior_pack \
  --resource-pack path/to/resource_pack
```

World will appear in Minecraft after restart/refresh.

### List Installed Packs

Show all behavior and resource packs currently in Minecraft:

```bash
python local_addon_manager.py list
```

Displays names, UUIDs, and versions.

## Complete Testing Workflow

```bash
# 1. Package addon
python local_addon_manager.py package \
  --behavior-pack minecraft-addons/behavior-packs/monarch_garden \
  --resource-pack minecraft-addons/resource-packs/monarch_garden \
  --output monarch_garden.mcaddon

# 2. Create test world with addon
python local_addon_manager.py create-world "Addon Test World" \
  --behavior-pack minecraft-addons/behavior-packs/monarch_garden \
  --resource-pack minecraft-addons/resource-packs/monarch_garden

# 3. Launch Minecraft and select the test world

# 4. Run in-game tests

# 5. If changes needed:
#    - Edit pack files
#    - Increment version
#    - Re-package and re-import

python local_addon_manager.py increment-version minecraft-addons/behavior-packs/monarch_garden
python local_addon_manager.py increment-version minecraft-addons/resource-packs/monarch_garden
```

## Version Management

Minecraft caches imported addons by UUID + version. To update an addon:

1. Make changes to pack files
2. Increment version in both packs
3. Re-package
4. Re-import (double-click .mcaddon)
5. Minecraft sees it as new version

## Integration with MCP Server

This tool can be integrated with the MCP REST API server to enable:
- Remote addon testing
- Automated world creation
- CI/CD testing pipelines

## Location

`scripts/minecraft/local_addon_manager.py`
