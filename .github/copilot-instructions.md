# AiAssist - GitHub Copilot Instructions

## Repository Overview

AiAssist is a personal AI assistant system designed for continuous learning and improvement, built specifically for GitHub Copilot in both Desktop and Cloud/Agent modes. It provides comprehensive infrastructure for persistent task management, continuous learning, and knowledge accumulation.

**Primary Directive**: Learn to be better at helping - continuously improve understanding, capabilities, and effectiveness.

## Project Structure

This is a documentation and configuration repository (not a software project). It contains:

- **`.github/copilot/`**: Legacy agent instructions (for reference only - `.github/copilot-instructions.md` is now the primary location)
- **`docs/`**: System documentation, learning journal, and decision records
- **`instructions/`**: Mode-specific guidance (desktop-mode.md, cloud-mode.md)
- **`skills/`**: Reusable capability library organized by category
- **`tasks/`**: Persistent task management (active-tasks.md, archive/)
- **`mcp-servers/`**: Model Context Protocol server configurations
  - `image-generation/`: TypeScript/Node.js MCP server for DALL-E 3 image generation
  - `minecraft-bedrock-addon/`: TypeScript/Node.js MCP server for Minecraft addon development
- **`scripts/`**: Python scripts for Minecraft realm automation
- **`minecraft-addons/`**: Minecraft Bedrock Edition addons (Resource and Behavior Packs)
- **`templates/`**: Document templates

## Key Files

- **`.github/copilot-instructions.md`**: This file - primary Copilot instructions
- **`.github/copilot/agent-instructions.md`**: Legacy location (for backward compatibility)
- **`README.md`**: Repository introduction and quick start
- **`docs/overview.md`**: Detailed system architecture
- **`docs/learning-journal.md`**: Ongoing learnings and insights
- **`tasks/active-tasks.md`**: Current work and priorities

## Languages and Technologies

- **Markdown**: Primary format for all documentation
- **TypeScript**: MCP server implementations
- **Node.js**: Runtime for MCP servers
- **Python**: Scripts for Minecraft realm automation
- **JSON**: Configuration files, Minecraft addon manifests

## Build and Setup Instructions

### For MCP Servers

Both MCP servers (image-generation and minecraft-bedrock-addon) follow the same build pattern:

```bash
cd mcp-servers/<server-name>
npm install          # Install dependencies
npm run build        # Compile TypeScript to JavaScript
npm start            # Run the server
```

**Important**: Each MCP server requires environment variables (e.g., `OPENAI_API_KEY`). Check the individual README.md files in each server directory for specific requirements.

### For Python Scripts

The Minecraft automation scripts require Python 3:

```bash
cd scripts/minecraft
pip install -r requirements.txt   # Install dependencies
# Note: Check individual script files for usage and required arguments
python realm_api.py --help        # Example: check script usage
```

### No Repository-Level Build

This repository does **not** have repository-level build, test, or lint commands. It's a documentation and configuration repository - each component (MCP servers, scripts) has its own build process.

## Working with This Repository

### When Modifying Documentation

- Use clear, concise Markdown
- Follow existing formatting conventions
- Update related files if cross-references change
- Maintain consistency in structure and tone

### When Working with MCP Servers

- Always run `npm install` after pulling changes
- Build with `npm run build` before testing
- Check TypeScript compilation errors carefully
- Update README.md if adding new capabilities

### When Managing Tasks

- Update `tasks/active-tasks.md` when starting or completing work
- Archive completed tasks to `tasks/archive/`
- Use the task management templates in `templates/`
- Keep task status current for context persistence

### When Adding Skills

- Create skills in appropriate category subdirectories
- Include clear examples and usage patterns
- Update `skills/README.md` with new skills
- Follow existing skill documentation format

## Agent Behavior Guidelines

### Primary Workflow

1. **Start**: Check `tasks/active-tasks.md` for current context
2. **Learn**: Review relevant docs and `docs/learning-journal.md`
3. **Execute**: Apply skills from `/skills` library
4. **Document**: Update learning journal and task status
5. **Persist**: Ensure changes are committed with clear messages

### Documentation Protocol

- Document new learnings in `docs/learning-journal.md`
- Record architectural decisions in `docs/decisions/` (if directory exists)
- Create reusable skills in `/skills` when patterns emerge
- Update README and overview docs when system evolves

### Task Management Protocol

- Always check `tasks/active-tasks.md` at conversation start
- Update task status regularly during work
- Create detailed task files for complex multi-session work
- Archive completed tasks to maintain clean active list

## Important Conventions

- **Markdown formatting**: Use consistent heading levels and structure
- **File organization**: Keep files in appropriate directories
- **Naming**: Use kebab-case for file names (e.g., `learning-journal.md`)
- **Git commits**: Write clear, descriptive commit messages
- **Documentation**: Prefer detailed, well-structured documentation over brevity

## Integration Points

### MCP Servers

MCP servers are configured to work with Claude Desktop, Cline, and other MCP-compatible tools. Configuration examples are in each server's README.md.

### GitHub Copilot

This repository is optimized for:
- **Desktop Mode**: VS Code, Visual Studio, JetBrains IDEs
- **Cloud/Agent Mode**: GitHub Copilot in browser, cloud environments

Mode-specific instructions are in `instructions/desktop-mode.md` and `instructions/cloud-mode.md`.

## Dependencies and Requirements

### TypeScript/Node.js Projects
- Node.js 16+ required
- TypeScript 5.x
- Dependencies managed via npm

### Python Projects
- Python 3.8+
- Dependencies listed in `requirements.txt` files

### No External CI/CD

This repository does not have GitHub Actions workflows or automated CI/CD. Changes are validated manually.

## Common Tasks

### Adding New Documentation
1. Create markdown file in appropriate directory (`docs/`, `skills/`, etc.)
2. Follow existing format and structure
3. Update relevant index/README files
4. Link from related documents

### Creating a New Skill
1. Identify category in `/skills` directory
2. Create skill file with clear description and examples
3. Update `skills/README.md` with new skill entry
4. Reference from agent instructions if core capability

### Updating Task Status
1. Open `tasks/active-tasks.md`
2. Update status checkboxes and notes
3. Move completed tasks to `tasks/archive/` if appropriate
4. Commit changes with descriptive message

### Working with MCP Servers
1. Navigate to `mcp-servers/<server-name>/`
2. Review README.md for specific requirements
3. Run `npm install` and `npm run build`
4. Set required environment variables
5. Test with `npm start`

## Troubleshooting

### MCP Server Build Failures
- Ensure Node.js 16+ is installed
- Clear `node_modules/` and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run build`
- Verify environment variables are set

### Documentation Inconsistencies
- Cross-reference related documents
- Check for broken links
- Validate markdown formatting
- Ensure examples are up-to-date

## Additional Resources

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Model Context Protocol](https://github.com/modelcontextprotocol)
- [Repository README](README.md)
- [System Overview](docs/overview.md)
- [Quick Start Guide](docs/quick-start.md)

## Trust These Instructions

These instructions are comprehensive and up-to-date. Trust them to guide your work. Only perform additional searches if:
- Information here is incomplete
- Instructions are found to be incorrect
- Working with new features not yet documented

When in doubt, refer to the documentation in `docs/` and the skills in `skills/` for additional context and patterns.
