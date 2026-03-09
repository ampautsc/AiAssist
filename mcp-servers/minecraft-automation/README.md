# Minecraft Automation MCP Server

## Purpose
Validated Minecraft UI automation - ensures every click is validated before and after.

## Tool

### `minecraft_validated_click`
Click in Minecraft with full validation workflow.

**Parameters:**
- `x` (number): X coordinate to click
- `y` (number): Y coordinate to click
- `expected_screen_before` (string): Expected screen before click (main_menu, worlds_list, world_edit, in_game)
- `expected_screen_after` (string): Expected screen after click

**Workflow:**
1. Checks if Minecraft is running (starts it if not)
2. Activates and maximizes Minecraft window
3. Takes screenshot and validates current screen matches `expected_screen_before`
4. Clicks once at (x, y) using click_working.ps1 (Windows.Forms + mouse_event)
5. Waits 5 seconds
6. Takes screenshot and validates screen matches `expected_screen_after`
7. Returns SUCCESS or ERROR with details

**Example Usage:**
```typescript
await use_mcp_tool('minecraft-automation', 'minecraft_validated_click', {
  x: 869,
  y: 471,
  expected_screen_before: 'main_menu',
  expected_screen_after: 'worlds_list'
});
```

## Configuration
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

## Why This Exists
Creator got frustrated telling me the same workflow 20+ times. This enforces:
- Never assume Minecraft is active - always activate it
- Never click without validating screen first
- Never skip validation after click
- One click at a time, validated every step
