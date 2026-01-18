# Copilot Configuration

This document describes GitHub Copilot configuration for the AiAssist repository.

## Agent Instructions

> **Note**: The primary Copilot instructions are now in **`.github/copilot-instructions.md`** following GitHub's official best practices. The file `.github/copilot/agent-instructions.md` is maintained for backward compatibility.

The core agent instructions are located in `.github/copilot-instructions.md` and define how Copilot should work with this repository. These instructions:

- Define the primary directive: **Learn to be better at helping**
- Establish operational protocols
- Set quality standards
- Define the self-improvement loop
- Guide task management and documentation

## Configuration for Desktop Mode

When using GitHub Copilot in VS Code, Visual Studio, or JetBrains IDEs:

### Recommended Settings

```json
{
  "github.copilot.enable": {
    "*": true
  },
  "github.copilot.advanced": {
    "debug.overrideEngine": "gpt-4",
    "inlineSuggestCount": 3
  }
}
```

### Workspace Configuration

The repository structure itself provides context for Copilot:
- Agent instructions in `.github/copilot/`
- Organized documentation in `/docs`
- Skills library in `/skills`
- Task tracking in `/tasks`

## Configuration for Cloud/Agent Mode

When using GitHub Copilot in the browser or cloud environments:

### Agent Behavior
- Automatically loads instructions from `.github/copilot/agent-instructions.md`
- Has access to full repository context
- Can read and update all files
- Follows mode-specific guidance from `/instructions/cloud-mode.md`

### Recommended Practice
- Provide clear task descriptions
- Reference specific files and sections
- Let the agent manage task tracking
- Review commits for progress

## Customization

### For Specific Projects
If using this system for specific projects, you can:

1. **Add project-specific instructions** in `/instructions/`
2. **Create project skills** in `/skills/`
3. **Customize agent instructions** for project needs
4. **Add project templates** in `/templates/`

### For Different Domains
The system can be adapted for:
- Software development
- Technical writing
- DevOps and infrastructure
- Research and analysis
- Data science
- Any domain requiring persistent AI assistance

## Best Practices

### For Users
1. **Provide context**: Reference relevant docs and tasks
2. **Be specific**: Clear requests get better results
3. **Review work**: Check commits and documentation
4. **Give feedback**: Help the system improve
5. **Trust persistence**: Context accumulates over time

### For AI Assistants
1. **Always check tasks first**: Start with `tasks/active-tasks.md`
2. **Load relevant skills**: Apply appropriate patterns
3. **Document as you go**: Update learning journal
4. **Update task status**: Keep progress current
5. **Learn from outcomes**: Extract insights

## Integration with MCP Servers

To extend capabilities, configure MCP servers in `/mcp-servers/`:

### Example: GitHub Server
```json
{
  "name": "github",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

### Example: File System Server
```json
{
  "name": "filesystem",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "${workspaceFolder}"],
  "permissions": {
    "readWrite": ["${workspaceFolder}"]
  }
}
```

## Troubleshooting

### Agent Not Following Instructions
- Ensure `.github/copilot/agent-instructions.md` exists
- Verify file formatting is correct
- Check for clear, actionable instructions
- Provide explicit guidance in conversation

### Context Not Persisting
- Verify task files are being updated
- Check commits for documentation updates
- Ensure files are in repository (not ignored)
- Review task management practices

### Skills Not Being Applied
- Make skills discoverable (clear names, good README)
- Reference skills explicitly when needed
- Update skills based on effectiveness
- Organize skills by clear categories

## Advanced Configuration

### Custom Skills Development
1. Identify recurring patterns
2. Document as skill in `/skills/`
3. Include clear examples
4. Reference from agent instructions
5. Update based on usage

### Learning System Tuning
1. Review learning journal regularly
2. Extract common themes
3. Create skills from patterns
4. Update instructions
5. Refine documentation

### Task Management Optimization
1. Use templates consistently
2. Update status regularly
3. Archive completed work
4. Review and refine process
5. Document improvements

## Continuous Improvement

The system improves through:
- **Regular use**: More context → better results
- **Documentation**: Captured knowledge persists
- **Skill development**: Patterns become reusable
- **Feedback loops**: Learning from outcomes
- **Refinement**: Instructions and skills evolve

## Resources

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Agent Instructions Guide](https://githubnext.com/projects/copilot-workspace)
- [MCP Specification](https://github.com/modelcontextprotocol)
- [System Overview](../docs/overview.md)
- [Quick Start Guide](../docs/quick-start.md)
