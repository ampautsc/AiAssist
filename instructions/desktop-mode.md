# Desktop Copilot Mode Instructions

## Context
These instructions apply when GitHub Copilot is running in Desktop mode (VS Code, Visual Studio, JetBrains IDEs, etc.).

## Desktop Mode Characteristics

### Advantages
- **Direct file system access**: Can read/write local files directly
- **Local tools**: Access to locally installed tools and CLIs
- **Immediate feedback**: Faster iteration on local changes
- **Offline capable**: Some operations work without internet
- **IDE integration**: Deep integration with editor features

### Considerations
- **Local resources**: Limited by machine capabilities
- **Security**: Direct access to file system requires care
- **Configuration**: Each machine may need setup
- **Sync**: May need to sync across devices

## Operational Guidelines

### File Operations
- **Read files freely**: Direct access to repository files
- **Edit carefully**: Changes are immediate and local
- **Test locally**: Run builds and tests on local machine
- **Commit deliberately**: Use git properly for version control

### Tool Usage
- **Use local tools**: npm, pip, cargo, etc. are available
- **Install as needed**: Can install dependencies locally
- **Run commands**: Full shell access available
- **Debug locally**: Use local debuggers and profilers

### Workflow Patterns

#### Code Editing Workflow
1. Read relevant files from local filesystem
2. Understand context and requirements
3. Make targeted changes
4. Test changes locally
5. Review diff before committing
6. Commit with clear message

#### Investigation Workflow
1. Use grep/search on local files
2. Run git commands for history
3. Execute tests locally
4. Use debuggers for complex issues
5. Document findings

#### Learning Workflow
1. Explore codebase locally
2. Run examples and tests
3. Experiment with changes safely (git branches)
4. Document learnings in repo
5. Share via commits

### MCP Server Integration

Desktop mode can use MCP servers that:
- Run locally (file system, git)
- Connect to external services (GitHub API)
- Provide development tools (linters, formatters)

**Common Desktop MCP Servers**:
- `@modelcontextprotocol/server-filesystem`
- `@modelcontextprotocol/server-git`
- `@modelcontextprotocol/server-github`

### Performance Tips
- Use local caching effectively
- Leverage IDE indexing
- Parallelize independent operations
- Keep repository size manageable

### Security Best Practices
- Never commit secrets
- Use environment variables for sensitive data
- Review changes before committing
- Use .gitignore appropriately
- Scan for secrets before push

### Task Management in Desktop Mode

**Task Tracking**:
- Update `/tasks/active-tasks.md` locally
- Changes persist immediately
- Can work offline
- Commit task updates regularly

**Context Preservation**:
- Use local files for notes
- Git history provides timeline
- Branch names can encode context
- Task files remain across sessions

### Collaboration

**Working with Others**:
- Pull latest changes regularly
- Use feature branches
- Clear commit messages
- Review PRs carefully
- Document decisions

**Sharing Knowledge**:
- Update documentation in repo
- Commit learning journal entries
- Create/update skills
- Share via PRs

## Troubleshooting

### Issue: Changes Not Persisting
**Solution**: Ensure files are saved and committed

### Issue: Tool Not Found
**Solution**: Install required tool locally or use appropriate MCP server

### Issue: Permission Errors
**Solution**: Check file permissions and user access

### Issue: Merge Conflicts
**Solution**: Use git merge tools, understand both changes

## Quick Reference

### Essential Commands
```bash
# Check status
git status

# View changes
git diff

# Add and commit
git add <files>
git commit -m "message"

# Push changes
git push

# Pull updates
git pull
```

### Common Patterns
- Edit → Test → Commit → Push
- Investigate → Document → Share
- Learn → Practice → Record

## Related
- [Cloud Copilot Mode Instructions](./cloud-mode.md)
- [Task Tracking Protocol](../docs/learning-journal.md)
- [MCP Server Configuration](../mcp-servers/README.md)
