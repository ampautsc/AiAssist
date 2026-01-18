# Box Turtle Minecraft Bedrock Addon

This addon adds Box Turtles to Minecraft Bedrock Edition, including custom behaviors, spawn rules, and visual elements.

## 📦 Contents

### Behavior Pack (`behavior_packs/`)
- **manifest.json** - Behavior pack metadata and configuration
- **entities/box_turtle.json** - Entity definition with AI behaviors, movement, breeding, and more
- **spawn_rules/box_turtle_spawn.json** - Spawn rules for beaches, swamps, and forests
- **loot_tables/entities/box_turtle.json** - Loot drops (turtle shell pieces and seagrass)

### Resource Pack (`resource_packs/`)
- **manifest.json** - Resource pack metadata and configuration
- **textures/entity/box_turtle_texture.png** - Entity texture (128x64 placeholder)
- **models/entity/box_turtle.geo.json** - 3D geometry model
- **entity/box_turtle.json** - Client entity definition with animations
- **render_controllers/box_turtle.controller.json** - Rendering configuration
- **sounds/sound_definitions.json** - Sound mappings (hurt, death, ambient, step, swim)
- **texts/en_US.lang** - English localization
- **texts/languages.json** - Language definitions

## 🎮 Features

### Box Turtle Characteristics:
- **Health**: 30 HP (15 hearts)
- **Movement**: Slow on land (0.1), faster in water (0.12)
- **Behavior**: Can be bred with seagrass, lays eggs, can be leashed
- **Spawning**: Appears in beaches (common), swamps (uncommon), and forests (rare)
- **Loot**: Drops turtle shell pieces and occasionally seagrass
- **Lifespan**: Can be baby or adult, babies grow after 1200 ticks (60 seconds)
- **Amphibious**: Can breathe both air and water

### AI Behaviors:
- Float in water
- Panic when hurt
- Random breach (jumping)
- Lay eggs
- Breeding
- Tempted by seagrass
- Random strolling
- Look at players
- Random looking around

## 🚀 Installation & Testing

### Local Testing (Windows 10/11)

1. **Locate Minecraft Directories**:
   ```
   Resource Pack: %localappdata%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\resource_packs\
   Behavior Pack: %localappdata%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\behavior_packs\
   ```

2. **Copy Pack Folders**:
   - Copy the `behavior_packs` folder to the Behavior Packs directory
   - Copy the `resource_packs` folder to the Resource Packs directory
   - You can rename them to "BoxTurtleAddon_BP" and "BoxTurtleAddon_RP" if desired

3. **Enable in Minecraft**:
   - Launch Minecraft Bedrock Edition
   - Create a new world or edit an existing one
   - Go to "Behavior Packs" and activate the Box Turtle Behavior Pack
   - Go to "Resource Packs" and activate the Box Turtle Resource Pack
   - Enable "Experimental Features" if prompted
   - Create/Start the world

4. **Test the Addon**:
   ```
   /summon custom:box_turtle
   ```
   - Or find them naturally spawning in beach, swamp, or forest biomes
   - Test breeding with seagrass
   - Test leashing
   - Check loot drops

### Local Testing (Android)

1. **Copy Packs**:
   ```
   Resource Pack: /sdcard/games/com.mojang/resource_packs/
   Behavior Pack: /sdcard/games/com.mojang/behavior_packs/
   ```

2. Follow steps 3-4 from Windows instructions above

### Local Testing (iOS)

1. Use iTunes File Sharing or the Files app to transfer packs to Minecraft's Documents folder
2. Follow steps 3-4 from Windows instructions above

## 🔧 Customization

### Adjusting Spawn Rates
Edit `behavior_packs/spawn_rules/box_turtle_spawn.json`:
- Change `weight` values to make spawns more/less common
- Modify `min_size` and `max_size` for herd sizes
- Add/remove biome filters

### Modifying Behavior
Edit `behavior_packs/entities/box_turtle.json`:
- Adjust health in `minecraft:health`
- Change movement speed in `minecraft:movement`
- Modify AI behavior priorities
- Add new component groups for variants

### Updating Textures
Replace `resource_packs/textures/entity/box_turtle_texture.png` with:
- A custom 128x64 PNG texture
- Use [Blockbench](https://www.blockbench.net/) for UV mapping guidance
- Maintain the same dimensions for compatibility

### Changing the Model
Edit `resource_packs/models/entity/box_turtle.geo.json`:
- Modify bone positions and sizes
- Add new bones for more detail
- Update UV mappings to match your texture

## 📝 Technical Details

### UUIDs
The addon uses the following UUIDs:
- Behavior Pack Header: `a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d`
- Behavior Pack Module: `b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e`
- Resource Pack Header: `c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f`
- Resource Pack Module: `d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a`

### Format Versions
- Manifests: `format_version: 2`
- Entity/Spawn Rules: `format_version: 1.20.0`
- Geometry: `format_version: 1.12.0`
- Client Entity: `format_version: 1.10.0`
- Render Controllers: `format_version: 1.10.0`
- Sounds: `format_version: 1.14.0`

### Compatibility
Requires Minecraft Bedrock Edition 1.20.0 or higher

## ⚠️ Known Limitations

1. **Texture**: The included texture is a placeholder. Replace with a proper texture for production use.
2. **Sounds**: Sound files are referenced but not included. Add OGG audio files in `resource_packs/sounds/mob/turtle/` directory.
3. **Animations**: Animation definitions are referenced but not fully defined. Add detailed animations in a separate animation file.

## 🐛 Troubleshooting

### Box Turtles Don't Spawn
- Ensure both packs are activated in world settings
- Check that experimental features are enabled
- Use `/summon custom:box_turtle` to test manually
- Verify spawn rules match your biome

### Texture Issues
- Confirm texture file is named correctly: `box_turtle_texture.png`
- Check texture dimensions: 128x64 pixels
- Validate PNG format (RGBA supported)

### Behavior Not Working
- Review Minecraft content logs for errors
- Validate JSON syntax in behavior pack files
- Check format_version compatibility with your game version
- Use `/reload` command to reload packs

### Manifest Errors
- Ensure UUIDs are unique and properly formatted
- Verify version arrays are in [major, minor, patch] format
- Check dependencies reference correct UUIDs

## 📚 Additional Resources

- [Microsoft Learn - Minecraft Creator](https://learn.microsoft.com/minecraft/creator/)
- [bedrock.dev](https://bedrock.dev) - Community documentation
- [Minecraft Wiki - Add-ons](https://minecraft.wiki/w/Add-on)
- [Blockbench](https://www.blockbench.net/) - 3D modeling tool

## 🤝 Contributing

To improve this addon:
1. Create better textures using proper UV mapping
2. Add complete animation definitions
3. Include actual sound files (OGG format)
4. Add variants (e.g., different shell patterns)
5. Implement more complex behaviors

## 📄 License

This addon is part of the AiAssist repository. See main repository for license details.

---

**Note**: This is a complete, functional addon structure. Replace placeholder assets (texture, sounds, animations) with production-quality content for distribution.
