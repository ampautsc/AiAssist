# MCP Server Usage Patterns

This document records effective patterns for using MCP servers.

## Purpose
- Document what works well
- Share best practices
- Avoid common pitfalls
- Optimize server usage

## Pattern Format

```markdown
### [Server Name] - [Use Case]
**When to use**: [Situation]
**How to use**: [Steps]
**Example**: [Code/command example]
**Tips**: [Helpful hints]
```

---

## GitHub Server Patterns

### Creating and Managing Pull Requests
**When to use**: Need to create, update, or review PRs

**How to use**:
1. Use server to fetch PR details
2. Review changes programmatically
3. Add comments or suggestions
4. Update PR status

**Tips**:
- Fetch PR diff to understand changes
- Use search to find related PRs
- Check CI status before reviewing
- Link to relevant issues

### Code Search
**When to use**: Looking for patterns or examples in codebases

**How to use**:
1. Use code search with specific queries
2. Filter by language, repo, or path
3. Review results for patterns
4. Document findings

**Tips**:
- Use precise search queries
- Leverage language filters
- Search across multiple repos when needed
- Save useful queries for reuse

---

## File System Server Patterns

### Safe File Operations
**When to use**: Reading or writing files with permissions control

**How to use**:
1. Request file access with specific scope
2. Perform operations within granted permissions
3. Handle errors gracefully
4. Clean up temporary files

**Tips**:
- Request minimal necessary permissions
- Always check file existence first
- Use atomic operations when possible
- Handle large files efficiently

---

## Code Analysis Server Patterns

### Pre-commit Quality Checks
**When to use**: Before committing code changes

**How to use**:
1. Run static analysis on changed files
2. Review warnings and errors
3. Fix issues before committing
4. Document any exceptions

**Tips**:
- Focus on files you changed
- Address high-severity issues first
- Use automated fixes when available
- Track recurring patterns

---

## Best Practices

### General Guidelines
1. **Minimize calls**: Batch operations when possible
2. **Cache results**: Avoid redundant requests
3. **Handle errors**: Always have fallback behavior
4. **Monitor usage**: Track server performance
5. **Update configs**: Keep server definitions current

### Security
- Never log sensitive data from server responses
- Validate all input before sending to servers
- Use least-privilege access
- Rotate credentials regularly

### Performance
- Use pagination for large datasets
- Implement timeouts appropriately
- Cache frequently-accessed data
- Parallelize independent requests

### Debugging
- Log server requests and responses
- Monitor server health
- Track error patterns
- Document solutions to common issues

---

## Common Pitfalls

### Pitfall: Excessive API Calls
**Problem**: Making too many requests, hitting rate limits

**Solution**: 
- Batch operations together
- Cache results appropriately
- Use webhooks instead of polling when possible

### Pitfall: Insufficient Error Handling
**Problem**: Server failures cause task failures

**Solution**:
- Implement retry logic with backoff
- Have fallback mechanisms
- Gracefully degrade functionality

### Pitfall: Poor Permission Management
**Problem**: Either too broad or too narrow permissions

**Solution**:
- Follow principle of least privilege
- Document required permissions
- Review and audit regularly

---

## Server-Specific Tips

### GitHub Server
- Use GraphQL for complex queries
- Leverage search instead of listing
- Use webhooks for real-time updates
- Cache repository metadata

### File System Server
- Use streaming for large files
- Implement proper cleanup
- Handle concurrent access
- Check disk space before writes

### Code Analysis Server
- Run incrementally on changed code
- Configure rules appropriately
- Suppress false positives properly
- Integrate with CI/CD

---

## Template for New Patterns

### [Server Name] - [Use Case]
**When to use**: 

**How to use**:
1. 
2. 
3. 

**Example**:
```
[example code]
```

**Tips**:
- 
- 

---

## Minecraft Bedrock Addon Server Patterns

### Creating a New Addon
**When to use**: Starting a new Minecraft Bedrock addon project

**How to use**:
1. Use `create_addon_structure` to create the base structure
2. Use `generate_uuid` to create unique identifiers for manifests
3. Add custom entities, items, blocks, and recipes as needed
4. Add texture references and localizations for visual content

**Example workflow**:
```
1. generate_uuid with count: 2
2. create_addon_structure with name, description, and output path
3. create_entity/item/block for custom content
4. add_texture_reference for each visual element
5. create_localization for display names
```

**Tips**:
- Always use unique namespaces (not "minecraft:") for custom content
- Create addon structure first before adding content
- Keep identifiers lowercase with underscores
- Test in creative mode before distributing

### Adding Custom Entities
**When to use**: Creating custom mobs or NPCs

**How to use**:
1. Use `create_entity` with identifier, display name, and stats
2. Add texture reference in resource pack
3. Add localization entry
4. Optionally create custom geometry and animations

**Tips**:
- Start with default values and iterate
- Use consistent naming across behavior and resource packs
- Test spawn rules before finalizing

### Creating Crafting Recipes
**When to use**: Adding custom crafting recipes

**How to use**:
1. Decide between shaped or shapeless recipe
2. Use `create_recipe` with appropriate ingredient format
3. Shaped recipes use pattern and key
4. Shapeless recipes use ingredient array

**Tips**:
- Shaped recipes are for position-specific crafting
- Shapeless recipes are for any arrangement
- Test recipes in crafting table before distributing

### Managing Textures
**When to use**: Adding visual elements to addon

**How to use**:
1. Place texture files in appropriate directory (blocks/items/entity)
2. Use `add_texture_reference` to register texture
3. Reference texture in item/block/entity definitions
4. Use power-of-2 dimensions for textures

**Tips**:
- Use PNG format for textures
- Keep texture names matching identifiers
- Organize textures by type in subdirectories

### Localization Best Practices
**When to use**: Supporting multiple languages or adding display names

**How to use**:
1. Use `create_localization` with translation key-value pairs
2. Follow Minecraft's naming conventions for keys
3. Create separate language files for each locale
4. Test in-game to verify text display

**Example keys**:
- `entity.namespace:name.name=Display Name`
- `item.namespace:name.name=Item Name`
- `tile.namespace:name.name=Block Name`

**Tips**:
- Always provide en_US as base language
- Use descriptive display names
- Keep translations concise for UI space

---

## Reference Documentation

For detailed technical information about specific MCP servers, reference documentation is available in `/docs/`:

- **Minecraft Bedrock Addons**: `/docs/minecraft-bedrock-addon-reference.md`
  - Load when: Creating or debugging Minecraft addons
  - Contains: Complete file format specifications, component lists, manifest structures

When working with specialized domains, load the relevant reference documentation into context as needed. This keeps the active context focused while making detailed information available on demand.

---

