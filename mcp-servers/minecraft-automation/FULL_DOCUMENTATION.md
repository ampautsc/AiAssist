# Minecraft Automation MCP Server - Full Documentation

Comprehensive Model Context Protocol (MCP) server for validated Minecraft Bedrock UI automation.

## 🎯 Features

**Every operation automatically:**
1. ✅ Ensures Minecraft is running (starts if needed)
2. ✅ Ensures Minecraft is focused and maximized
3. ✅ Takes screenshot to validate expected screen
4. ✅ Performs the click/action
5. ✅ Waits for screen transition
6. ✅ Takes screenshot to validate successful transition

## 🛠️ Available Tools

### Navigation Tools

#### `click_play`
From Main Menu → Worlds List
```typescript
await use_mcp_tool('minecraft-automation', 'click_play', {});
```

#### `click_settings`
From Main Menu → Settings
```typescript
await use_mcp_tool('minecraft-automation', 'click_settings', {});
```

#### `edit_world`
From Worlds List → Edit World screen
```typescript
await use_mcp_tool('minecraft-automation', 'edit_world', { world_index: 0 });
```

#### `launch_world`
From Worlds List → Load world into game
```typescript
await use_mcp_tool('minecraft-automation', 'launch_world', { world_index: 0 });
```

### Pack Management Tools

#### `select_resource_packs`
From Edit World → Resource Packs screen
```typescript
await use_mcp_tool('minecraft-automation', 'select_resource_packs', {});
```

#### `activate_resource_pack`
Activate a resource pack (handles "Update world?" confirmation)
```typescript
await use_mcp_tool('minecraft-automation', 'activate_resource_pack', {
  pack_name: 'monarch_garden_rp',
  confirm_update: true
});
```

#### `select_behavior_packs`
From Edit World → Behavior Packs screen
```typescript
await use_mcp_tool('minecraft-automation', 'select_behavior_packs', {});
```

#### `activate_behavior_pack`
Activate a behavior pack
```typescript
await use_mcp_tool('minecraft-automation', 'activate_behavior_pack', {
  pack_name: 'monarch_garden'
});
```

### Utility Tools

#### `scroll_down`
Scroll down in current screen
```typescript
await use_mcp_tool('minecraft-automation', 'scroll_down', { amount: 3 });
```

#### `go_back`
Click back arrow (top-left) to return to previous screen
```typescript
await use_mcp_tool('minecraft-automation', 'go_back', {});
```

#### `minecraft_validated_click`
Low-level validated click (for custom coordinates)
```typescript
await use_mcp_tool('minecraft-automation', 'minecraft_validated_click', {
  x: 869,
  y: 471,
  expected_screen_before: 'main_menu',
  expected_screen_after: 'worlds_list'
});
```

## 🧪 Testing

Comprehensive test suite uses existing screenshots from recorded navigation sessions.

```bash
cd mcp-servers/minecraft-automation
npm run build
npm test
```

Tests validate:
- Screen detection accuracy
- Click coordinate precision
- Full navigation workflows
- Error handling

## 📐 Coordinates

All coordinates are hardcoded from captured navigation sessions:

```typescript
const COORDS = {
  PLAY_BUTTON: { x: 869, y: 471 },
  WORLD_EDIT_BUTTON: { x: 395, y: 527 },
  WORLD_TILE_LOAD: { x: 198, y: 543 },
  RESOURCE_PACKS: { x: 320, y: 787 },
  BEHAVIOR_PACKS: { x: 1352, y: 109 },
  ACTIVATE_PACK: { x: 1656, y: 380 },
  CONFIRM_UPDATE: { x: 818, y: 635 },
  BACK_BUTTON: { x: 19, y: 16 },
};
```

## 🔧 Configuration

Add to VS Code settings.json:
```json
{
  "mcpServers": {
    "minecraft-automation": {
      "command": "node",
      "args": ["C:\\Users\\ampau\\source\\AiAssist\\AiAssist\\mcp-servers\\minecraft-automation\\build\\index.js"]
    }
  }
}
```

The server uses:
- **Python venv**: `C:/Users/ampau/source/AiAssist/AiAssist/.venv/Scripts/python.exe`
- **Tesseract OCR**: `C:\Program Files\Tesseract-OCR\tesseract.exe`
- **Click script**: `click_working.ps1` (uses Windows.Forms + mouse_event - verified working method)

## 📖 Screen Detection

OCR-based screen detection identifies:
- `main_menu` - Main Menu (has Play, Marketplace, Achievements)
- `worlds_list` - Worlds List (has "Worlds", "Realms", world tiles)
- `world_edit` - Edit World (has "Edit World", "Game Mode")
- `resource_packs` / `behavior_packs` - Pack management screens
- `confirm_dialog` - "Update world?" confirmation
- `in_game` - In-game (has coordinates, content log, blocks)

## 🚀 Usage Example

Complete workflow to apply addon to world:

```typescript
// From main menu
await use_mcp_tool('minecraft-automation', 'click_play', {});

// Select world to edit
await use_mcp_tool('minecraft-automation', 'edit_world', {});

// Add resource pack
await use_mcp_tool('minecraft-automation', 'select_resource_packs', {});
await use_mcp_tool('minecraft-automation', 'activate_resource_pack', {
  pack_name: 'monarch_garden_rp',
  confirm_update: true
});

// Add behavior pack
await use_mcp_tool('minecraft-automation', 'select_behavior_packs', {});
await use_mcp_tool('minecraft-automation', 'activate_behavior_pack', {
  pack_name: 'monarch_garden'
});

// Return and launch world
await use_mcp_tool('minecraft-automation', 'go_back', {});
await use_mcp_tool('minecraft-automation', 'launch_world', {});
```

## ⚠️ Known Limitations

- **Deactivate packs**: Not yet implemented (requires finding active pack in list)
- **Content log**: Not yet implemented (requires ESC menu navigation)
- **Multi-world support**: Currently uses fixed coordinates for first world
- **Pack name matching**: Currently uses fixed activate button position

## 🔮 Future Enhancements

1. Dynamic pack detection using OCR
2. Multi-world coordinate calculation
3. Content log extraction
4. Settings menu navigation
5. Keyboard shortcut support

## 🚨 Why This Server Exists

Creator repeated Minecraft automation workflow requirements 20+ times across conversations. This server prevents common mistakes:

- ❌ **Never** click without activating Minecraft first
- ❌ **Never** click without validating current screen
- ❌ **Never** skip validation after click
- ✅ **Always** one validated click at a time
- ✅ **Always** wait for screen transitions
- ✅ **Always** confirm success

This is codified in Sis's Lesson #7: "VALIDATED MINECRAFT CLICKS - MANDATORY WORKFLOW"
