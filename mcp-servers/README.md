# MCP Server Configurations

Model Context Protocol (MCP) servers extend the AI assistant's capabilities by providing access to external tools, data sources, and services.

## What are MCP Servers?

MCP servers are integrations that allow the AI assistant to:
- Access external data sources (databases, APIs, files)
- Use specialized tools (code analyzers, formatters, testing tools)
- Interact with services (GitHub, Jira, Slack, etc.)
- Execute operations in controlled environments

## Available MCP Servers

### GitHub MCP Server ✨
**Location**: `github-mcp/`

A comprehensive MCP server for interacting with GitHub's REST API. Enables complete control over repositories, issues, pull requests, releases, and more.

**Features**:
- 🏗️ **Repository Management**: Create, fork, search, list, and delete repositories
- 📁 **File Operations**: Read, write, update, and delete files with Git history
- 🌿 **Branch Management**: Create, list, and delete branches  
- 💬 **Issue Tracking**: Create, update, list, and comment on issues
- 🔀 **Pull Requests**: Full PR workflow - create, review, merge, comment
- 🔍 **Search**: Search code, issues, PRs, users, and repositories
- 📦 **Releases**: Create, update, list, and manage releases
- ⚡ **Batch Operations**: Push multiple files in a single commit

**Setup**:
```bash
cd github-mcp
npm install
npm run build
export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"
```

**Documentation**:
- [`github-mcp/README.md`](github-mcp/README.md) - Complete feature documentation
- [`github-mcp/GUIDE.md`](github-mcp/GUIDE.md) - Implementation and usage guide
- [`github-mcp/CONFIGURATION.md`](github-mcp/CONFIGURATION.md) - Configuration examples
- [`github-api-reference.md`](github-api-reference.md) - GitHub API endpoint reference

**Quick Test**:
```bash
cd github-mcp
node test.mjs
```

---

### Image Generation Server

**Location**: `./image-generation/`

**Purpose**: Generate high-quality images from text prompts using OpenAI's DALL-E 3 API and validate image quality using GPT-4 Vision.

**Features**:
- 🎨 Generate images from text descriptions
- 🔍 Validate if images match prompts
- 📝 Get detailed image descriptions
- ⚙️ Configurable size, quality, and style

**Quick Start**:
```bash
cd image-generation
npm install
npm run build
export OPENAI_API_KEY=your-key-here
npm start
```

**Documentation**: See [image-generation/README.md](./image-generation/README.md) and [image-generation/USAGE.md](./image-generation/USAGE.md)

**API Research**: See [image-generation-api-research.md](./image-generation-api-research.md) for details on API selection and capabilities.

---

### Minecraft Bedrock Addon Server

Located in: `/mcp-servers/minecraft-bedrock-addon/`

**Purpose**: Assists with creating Minecraft Bedrock Edition addons, including Resource Packs and Behavior Packs.

**Capabilities**:
- Create complete addon directory structures
- Generate entities, items, blocks, and recipes
- Manage texture references and localizations
- Generate UUIDs for manifests
- Validate addon structure

**Setup**:
```bash
cd mcp-servers/minecraft-bedrock-addon
npm install
npm run build
```

**Configuration**:
```json
{
  "mcpServers": {
    "minecraft-bedrock": {
      "command": "node",
      "args": ["path/to/mcp-servers/minecraft-bedrock-addon/dist/index.js"]
    }
  }
}
```

**Reference Documentation**: See `/docs/minecraft-bedrock-addon-reference.md` for detailed addon format specifications.

**Usage Patterns**: See `/docs/mcp-usage.md` for common usage patterns and best practices.

## Configuration Structure

Each MCP server configuration should include:

```json
{
  "name": "server-name",
  "description": "What this server does",
  "command": "command-to-start-server",
  "args": ["arg1", "arg2"],
  "env": {
    "ENV_VAR": "value"
  },
  "capabilities": [
    "capability1",
    "capability2"
  ]
}
```

## Example Configurations

### File System Server
Provides safe file system access with permissions control.

### GitHub Server
Enables GitHub operations: PRs, issues, code search, etc.

### Code Analysis Server
Provides static analysis, linting, and code quality checks.

### Documentation Server
Helps with documentation generation and management.

## Using MCP Servers

1. **Install the server**: Follow server-specific installation instructions
2. **Configure**: Add configuration to this directory
3. **Test**: Verify the server works correctly
4. **Document**: Record usage patterns in `/docs/mcp-usage.md`

## Security Considerations

- Never store secrets in configuration files
- Use environment variables for sensitive data
- Review server permissions carefully
- Keep servers updated
- Monitor server usage

## Adding New MCP Servers

1. Research available MCP servers
2. Evaluate security and utility
3. Create configuration file
4. Test thoroughly
5. Document usage patterns
6. Add to this README

## Recommended MCP Servers

### Essential
- **filesystem**: Safe file operations
- **github**: GitHub integration
- **git**: Git operations

### Development
- **code-analyzer**: Static analysis
- **test-runner**: Test execution
- **debugger**: Debugging capabilities

### Productivity
- **web-search**: Information lookup
- **documentation**: Doc generation
- **project-manager**: Task tracking integration

## Resources

- [MCP Specification](https://github.com/modelcontextprotocol)
- [MCP Server Directory](https://github.com/modelcontextprotocol/servers)
- [Creating MCP Servers](https://modelcontextprotocol.io/docs)

## Troubleshooting

### Server Won't Start
- Check command and arguments
- Verify environment variables
- Review error logs
- Ensure dependencies installed

### Permission Errors
- Review server permissions configuration
- Check file system access
- Verify API credentials

### Performance Issues
- Monitor server resource usage
- Check for rate limiting
- Optimize queries/requests
- Consider caching
