# GitHub CLI & Remote Agent Workflows - Research Notes
**Date:** January 18, 2026  
**Purpose:** Learn how to queue tasks for remote agents and build MCP servers

## What is GitHub CLI?

GitHub CLI (`gh`) is an open-source command-line tool that brings GitHub functionality to the terminal.

### Key Capabilities
- Work with issues, PRs, checks, releases
- Script GitHub API actions
- Create custom aliases
- Works with GitHub.com and GitHub Enterprise Server
- Extensions system for custom commands

### Installation
**Windows:** Download MSI installer from https://github.com/cli/cli/releases/download/v2.85.0/gh_2.85.0_windows_amd64.msi

**Status in our environment:** NOT INSTALLED (tested, got CommandNotFoundException)

## Common Commands
```powershell
gh issue list          # List issues
gh pr create          # Create pull request
gh repo create        # Create repository
gh api <endpoint>     # Call GitHub API directly
gh extension install  # Install CLI extensions
```

## How This Relates to Remote Agents

### Theory
Based on Creator's hint "you can build new mcp servers or queue tasks for the cloud agents to build them" using GitHub CLI:

**Possible workflow:**
1. Create GitHub issue describing MCP server to build
2. Use labels/templates to mark it for agent processing
3. Agent picks up issue and builds MCP server
4. Agent commits result back to repository

### Questions to Research Further
- Is there a specific GitHub Action or workflow that monitors for these tasks?
- Are there special issue labels or templates?
- Is there a repository where these tasks should be filed?
- What's the expected format for task descriptions?

## MCP Server Creation (From VS Code Docs)

### What I Learned About MCP Servers

**MCP = Model Context Protocol**
- Open standard for AI models to use external tools/services
- Provides unified interface for tools, resources, and prompts

### How to Add MCP Servers in VS Code
1. **From GitHub MCP Registry** - Extensions view, search `@mcp`
2. **Manual Configuration** - Create `mcp.json` file
3. **Workspace-specific** - Add to workspace `.vscode/mcp.json`

### MCP Server Types

**stdio Servers** (most common for local):
```json
{
  "servers": {
    "serverName": {
      "type": "stdio",
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "API_KEY": "${input:api-key}"
      }
    }
  }
}
```

**HTTP/SSE Servers** (remote):
```json
{
  "servers": {
    "serverName": {
      "type": "http",
      "url": "http://localhost:3000",
      "headers": {
        "Authorization": "Bearer ${input:token}"
      }
    }
  }
}
```

### MCP Server Capabilities
- **Tools** - Functions the agent can invoke
- **Resources** - Direct access to data (files, DB tables, etc.)
- **Prompts** - Preconfigured prompts as slash commands

### Security Notes
- MCP servers can run arbitrary code
- VS Code prompts for trust on first start
- Only use servers from trusted sources
- Review configuration before starting

## Building Custom MCP Servers

### Structure (Based on Existing Servers in Workspace)
```
mcp-server-name/
├── src/
│   ├── index.ts           # Main MCP server implementation
│   └── test.ts            # Test suite
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── README.md              # Documentation
└── USAGE.md              # Usage guide
```

### TypeScript + MCP SDK
Existing servers use TypeScript and MCP SDK to define:
- Tools (functions agent can call)
- Schemas (parameter validation)
- Resources (data access)
- Error handling

## Next Steps to Understand Remote Agent Workflow

1. **Install GitHub CLI**
   - Download and install gh for Windows
   - Authenticate with GitHub account
   - Test basic commands

2. **Search for Agent Workflow**
   - Look for GitHub Actions in this repo
   - Check for issue templates related to agent tasks
   - Search for documentation about the agent system

3. **Examine Existing MCP Servers**
   - Study structure of github-mcp, image-generation, minecraft-bedrock
   - Understand how they're built
   - See if there are build scripts or workflows

4. **Test Existing MCP Servers**
   - See if they actually work
   - Document any issues
   - Understand how to configure them

## Action Items
- [ ] Install GitHub CLI
- [ ] Search workspace for agent workflow documentation
- [ ] Study existing MCP server implementations
- [ ] Test existing MCP servers
- [ ] Document findings about remote agent process

## References
- GitHub CLI Docs: https://docs.github.com/en/github-cli
- VS Code MCP Docs: https://code.visualstudio.com/docs/copilot/customization/mcp-servers
- MCP Protocol: https://modelcontextprotocol.io/
- GitHub MCP Registry: https://github.com/mcp
