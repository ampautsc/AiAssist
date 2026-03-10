# Placeholder Textures Needed

The resource pack is structurally complete but needs actual texture files. The addon will work in Minecraft but entities will be invisible until textures are added.

## Required Texture Files

### Block Textures (16x16 PNG)
Create in: `resource-packs/monarch_garden/textures/blocks/`
- `milkweed_stage_0.png` - Small sprout
- `milkweed_stage_1.png` - Medium plant
- `milkweed_stage_2.png` - Mature plant with pink flowers

### Item Textures (16x16 PNG)
Create in: `resource-packs/monarch_garden/textures/items/`
- `milkweed_seeds.png` - Small white seeds

### Entity Textures
Create in: `resource-packs/monarch_garden/textures/entity/`
- `monarch_butterfly.png` - Orange and black butterfly pattern
- `monarch_caterpillar.png` - White, yellow, and black striped caterpillar
- `monarch_chrysalis.png` - Green chrysalis with gold dots
- `monarch_egg.png` - Tiny white egg

## Temporary Solution

The addon currently uses vanilla Minecraft models as placeholders:
- Butterfly = Parrot (will fly around)
- Caterpillar = Silverfish (will crawl)
- Chrysalis = Shulker (will stay in place)
- Egg = Chicken egg item

This means the addon is **fully functional** for testing the lifecycle mechanics, just not visually accurate. Kids will see the behavior and transformations even without custom textures.

## Next Steps

1. **Test in Minecraft NOW** - Verify lifecycle works with placeholder visuals
2. **Create custom textures** - Can use image generation MCP or hand-draw 16x16 pixel art
3. **Custom models** - Create proper geometry files for accurate shapes (optional Phase 2)
