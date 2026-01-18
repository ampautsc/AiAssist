# Cloud Copilot Mode Instructions

## Context
These instructions apply when GitHub Copilot is running in Cloud/Agent mode (GitHub Copilot in the browser, cloud-based environments, etc.).

## Cloud Mode Characteristics

### Advantages
- **Scalable resources**: Not limited by local machine
- **Consistent environment**: Same setup every time
- **Accessibility**: Available from any device
- **Collaboration-ready**: Easy to share and collaborate
- **Managed infrastructure**: No local setup needed

### Considerations
- **Network dependency**: Requires internet connection
- **Abstracted access**: Operations go through APIs/servers
- **Stateless by default**: May need explicit persistence
- **Resource limits**: Subject to platform quotas/limits
- **Security boundaries**: Different from local file access

## Operational Guidelines

### File Operations
- **Use appropriate APIs**: Go through GitHub API or MCP servers
- **Batch operations**: Minimize API calls
- **Handle rate limits**: Implement backoff and retry
- **Cache intelligently**: Reduce redundant requests

### Tool Usage
- **Remote execution**: Commands run in cloud environment
- **Managed tools**: Use provided tools and services
- **API-first**: Prefer APIs over direct CLI when available
- **Monitor usage**: Be aware of quota limits

### Workflow Patterns

#### Code Editing Workflow
1. Fetch files via GitHub API or MCP server
2. Understand context and requirements
3. Prepare changes carefully
4. Create PR with changes
5. Trigger CI/CD for validation
6. Review and merge

#### Investigation Workflow
1. Use GitHub code search
2. Fetch specific files as needed
3. Query git history via API
4. Use remote debugging when available
5. Document findings in issues or PRs

#### Learning Workflow
1. Explore via code search and API
2. Read documentation and examples
3. Experiment in separate branches
4. Document learnings via commits/PRs
5. Share through repository

### MCP Server Integration

Cloud mode typically uses MCP servers that:
- Connect to cloud services (GitHub, databases)
- Provide remote tool access
- Handle authentication securely
- Scale with demand

**Common Cloud MCP Servers**:
- GitHub integration (PRs, issues, code search)
- Cloud storage services
- Remote code execution
- API gateways

### Performance Tips
- Batch API requests together
- Use GraphQL for complex queries
- Implement intelligent caching
- Parallelize independent operations
- Use webhooks instead of polling

### Security Best Practices
- **Never expose secrets**: Use secret management services
- **Token hygiene**: Rotate tokens regularly
- **Principle of least privilege**: Request minimal permissions
- **Audit access**: Monitor API usage
- **Secure communication**: Always use HTTPS

### Task Management in Cloud Mode

**Task Tracking**:
- Update `/tasks/active-tasks.md` via commits
- Changes persist in repository
- Available from any session
- Use PRs for task updates

**Context Preservation**:
- Document in repository files
- Use issues for long-term tracking
- Link related items (commits, PRs, issues)
- Tag and categorize appropriately

**Persistence Strategy**:
```
Active work → Commit to branch → Push to remote → Context preserved
```

### Collaboration

**Working with Others**:
- Use PRs for all changes
- Clear descriptions and context
- Link to related issues
- Request reviews appropriately
- Respond to feedback promptly

**Sharing Knowledge**:
- Documentation in repository
- Wiki for extended content
- Issues for discussions
- PRs for proposals
- Releases for milestones

## API Usage Patterns

### GitHub API Best Practices
```
1. Use GraphQL for complex queries (fewer requests)
2. Implement pagination for large results
3. Cache responses appropriately
4. Handle rate limits gracefully
5. Use conditional requests (ETags)
```

### Rate Limit Management
```
1. Check rate limit before operations
2. Implement exponential backoff
3. Prioritize critical operations
4. Cache when possible
5. Use authenticated requests (higher limits)
```

## Troubleshooting

### Issue: Rate Limit Exceeded
**Solution**: 
- Wait for reset (check X-RateLimit-Reset header)
- Use authenticated requests
- Implement caching
- Batch operations

### Issue: Authentication Failed
**Solution**:
- Verify token is valid
- Check token permissions
- Rotate if compromised
- Use appropriate auth method

### Issue: Network Timeout
**Solution**:
- Implement retry logic
- Increase timeout values
- Check network status
- Use exponential backoff

### Issue: Changes Not Persisting
**Solution**:
- Ensure commits are pushed
- Verify branch is correct
- Check for errors in push
- Confirm permissions

## Quick Reference

### GitHub API Operations
```javascript
// Fetch file content
GET /repos/{owner}/{repo}/contents/{path}

// Create/update file
PUT /repos/{owner}/{repo}/contents/{path}

// List commits
GET /repos/{owner}/{repo}/commits

// Search code
GET /search/code?q={query}

// Create PR
POST /repos/{owner}/{repo}/pulls
```

### Common Patterns
- Fetch → Process → Update → Verify
- Search → Analyze → Document → Share
- Learn → Experiment → Record → Apply

### Resource Management
- Monitor API rate limits
- Cache frequently-accessed data
- Batch operations together
- Use webhooks for notifications

## Cloud vs Desktop Comparison

| Aspect | Desktop | Cloud |
|--------|---------|-------|
| File Access | Direct | API-based |
| Tools | Local install | Managed/Remote |
| Speed | Fast for local | Network dependent |
| Scale | Machine limited | Cloud scalable |
| Offline | Partially | Requires internet |
| Setup | Per machine | Consistent |

## Related
- [Desktop Copilot Mode Instructions](./desktop-mode.md)
- [MCP Server Usage](../docs/mcp-usage.md)
- [Task Tracking Protocol](../docs/learning-journal.md)
- [GitHub API Documentation](https://docs.github.com/en/rest)
