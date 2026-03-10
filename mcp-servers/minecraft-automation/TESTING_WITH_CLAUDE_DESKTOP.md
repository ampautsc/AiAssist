# Testing Minecraft Automation MCP Server with Claude Desktop

## ✅ Setup Complete

The minecraft-automation MCP server has been configured in Claude Desktop!

**Config location:** `C:\Users\ampau\AppData\Roaming\Claude\claude_desktop_config.json`

## 🚀 How to Test

### 1. Restart Claude Desktop
Close and reopen Claude Desktop to load the new MCP server configuration.

### 2. Verify MCP Server is Connected
In Claude Desktop, you should see the minecraft-automation server listed as an available tool source.

### 3. Start Minecraft
- Launch Minecraft Bedrock Edition
- Navigate to the **main menu** (you should see Play, Settings, etc.)
- Keep Minecraft visible on screen (don't minimize)

### 4. Test with Claude Desktop

Try these commands in Claude Desktop:

#### Simple Test - Click Play Button
```
Use the minecraft-automation MCP server to click the Play button in Minecraft
```

#### Full Workflow Test
```
Using minecraft-automation MCP server:
1. Click Play to go to worlds list
2. Open the first world for editing
3. Navigate back to worlds list
```

#### Advanced Test - Apply Addon
```
Using minecraft-automation MCP server, apply the monarch_garden addon to a world:
1. Navigate to worlds list
2. Edit the first world
3. Activate the monarch_garden_rp resource pack
4. Activate the monarch_garden behavior pack
5. Return to worlds list
```

## 📋 Available Tools

The MCP server provides these tools:
- `click_play` - Main Menu → Worlds List
- `click_settings` - Main Menu → Settings
- `edit_world` - Worlds List → Edit World
- `launch_world` - Worlds List → Load World
- `select_resource_packs` - Edit World → Resource Packs
- `activate_resource_pack` - Activate a resource pack
- `select_behavior_packs` - Edit World → Behavior Packs
- `activate_behavior_pack` - Activate a behavior pack
- `go_back` - Back button navigation
- `scroll_down` - Scroll in menus
- `minecraft_validated_click` - Low-level validated click

## 🔍 Troubleshooting

### If tools don't appear:
1. Make sure Claude Desktop was restarted after config was created
2. Check the config file exists: `C:\Users\ampau\AppData\Roaming\Claude\claude_desktop_config.json`
3. Check Claude Desktop logs for MCP server errors

### If clicks don't work:
1. Ensure Minecraft is running and visible
2. Make sure no other windows are covering Minecraft
3. The MCP server will automatically activate Minecraft before clicking

### If screen detection fails:
- The MCP server uses OCR to validate screens
- Minecraft's custom fonts can sometimes be hard to read
- If validation fails, the server will report what screen it detected vs. expected

## 📝 What Happens During Each Click

Every MCP tool call does this automatically:
1. ✅ Checks if Minecraft is running (starts if needed)
2. ✅ Activates and maximizes Minecraft window
3. ✅ Takes screenshot to validate current screen
4. ✅ Clicks at the specified coordinates
5. ✅ Waits 5 seconds for transition
6. ✅ Takes another screenshot to validate new screen
7. ✅ Returns SUCCESS or ERROR with details

## 🎯 Expected Behavior

**Successful click:**
```
SUCCESS: Clicked (869, 471), transitioned main_menu → worlds_list
```

**Failed validation:**
```
ERROR: Expected screen 'main_menu' but on 'worlds_list'
```

This means Minecraft was already on a different screen than expected.

## 💡 Tips

- Let each operation complete before starting the next one
- If Minecraft is already on the target screen, navigation will fail (this is intentional validation)
- The server is designed to be safe - it won't click if it's not on the expected screen
- All coordinates are based on 1920x1080 resolution

## 🆘 Getting Help

If you encounter issues:
1. Check Minecraft is at expected screen (main menu, worlds list, etc.)
2. Try the low-level `minecraft_validated_click` tool with `expected_screen_before: "unknown"` to bypass validation
3. Check the screenshots saved in workspace root (before_click.png, after_click.png)

Enjoy fully automated Minecraft navigation! 🎮
