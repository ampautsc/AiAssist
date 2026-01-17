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
