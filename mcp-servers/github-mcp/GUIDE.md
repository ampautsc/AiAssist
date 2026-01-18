# GitHub MCP Server - Complete Guide

## Overview

This GitHub MCP Server provides a comprehensive interface to the GitHub API through the Model Context Protocol (MCP). It enables AI assistants to perform virtually any GitHub operation, including repository management, file operations, issue tracking, pull request workflows, and more.

## What's Included

### 📦 MCP Server Implementation
- **Location**: `/mcp-servers/github-mcp/`
- **Language**: TypeScript (compiles to Node.js)
- **Architecture**: Modular design with separate operation categories
- **Size**: ~450 lines of main code + ~100 lines per operation module

### 📚 Documentation Files
1. **`github-api-reference.md`** - Comprehensive GitHub API endpoint reference
2. **`README.md`** - Main documentation with all features and examples
3. **`CONFIGURATION.md`** - Detailed configuration examples for different MCP clients
4. **This file** - Complete implementation guide

## Features

### 40+ GitHub Operations Across 8 Categories

#### 1. Repository Operations (6 tools)
- `create_repository` - Create new repositories
- `search_repositories` - Search GitHub for repositories
- `get_repository` - Get repository details
- `fork_repository` - Fork repositories
- `delete_repository` - Delete repositories
- `list_repositories` - List user repositories

#### 2. File Operations (4 tools)
- `get_file_contents` - Read files and directories
- `create_or_update_file` - Create or modify single files
- `delete_file` - Delete files
- `push_files` - Push multiple files in one commit

#### 3. Branch Operations (4 tools)
- `list_branches` - List repository branches
- `get_branch` - Get branch details
- `create_branch` - Create new branches
- `delete_branch` - Delete branches

#### 4. Commit Operations (2 tools)
- `list_commits` - List commits with filters
- `get_commit` - Get commit details

#### 5. Issue Operations (5 tools)
- `list_issues` - List and filter issues
- `get_issue` - Get issue details
- `create_issue` - Create new issues
- `update_issue` - Update existing issues
- `add_issue_comment` - Comment on issues

#### 6. Pull Request Operations (9 tools)
- `list_pull_requests` - List PRs with filters
- `get_pull_request` - Get PR details
- `create_pull_request` - Create new PRs
- `update_pull_request` - Update existing PRs
- `merge_pull_request` - Merge PRs
- `get_pull_request_files` - List changed files
- `create_pull_request_review` - Create reviews
- `get_pull_request_reviews` - List reviews
- `get_pull_request_comments` - List review comments

#### 7. Search Operations (3 tools)
- `search_code` - Search code across GitHub
- `search_issues` - Search issues and PRs
- `search_users` - Search GitHub users

#### 8. Release Operations (6 tools)
- `list_releases` - List repository releases
- `get_latest_release` - Get latest release
- `get_release_by_tag` - Get specific release
- `create_release` - Create new releases
- `update_release` - Update releases
- `delete_release` - Delete releases

## Architecture

### Project Structure
```
mcp-servers/github-mcp/
├── src/
│   ├── index.ts              # Main MCP server implementation
│   ├── common/
│   │   ├── errors.ts         # Custom error classes
│   │   ├── github-client.ts  # GitHub API client
│   │   └── version.ts        # Version constant
│   └── operations/
│       ├── repository.ts     # Repository operations
│       ├── files.ts          # File operations
│       ├── branches.ts       # Branch operations
│       ├── commits.ts        # Commit operations
│       ├── issues.ts         # Issue operations
│       ├── pulls.ts          # Pull request operations
│       ├── search.ts         # Search operations
│       └── releases.ts       # Release operations
├── dist/                     # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── README.md
├── CONFIGURATION.md
├── test.mjs                  # Test script
└── .gitignore
```

### Design Patterns

#### 1. Modular Operations
Each operation category (repositories, files, etc.) is in its own module with:
- Zod schemas for input validation
- Type-safe operation functions
- Consistent error handling

#### 2. Centralized HTTP Client
The `GitHubClient` class handles:
- Authentication with bearer tokens
- Rate limit detection and reporting
- Standardized error handling
- HTTP method abstractions (GET, POST, PUT, PATCH, DELETE)

#### 3. Custom Error Hierarchy
Specific error types for different scenarios:
- `GitHubAuthenticationError` (401)
- `GitHubPermissionError` (403)
- `GitHubResourceNotFoundError` (404)
- `GitHubConflictError` (409)
- `GitHubValidationError` (422)
- `GitHubRateLimitError` (429)

## Setup Instructions

### 1. Install Dependencies
```bash
cd mcp-servers/github-mcp
npm install
```

### 2. Build the Server
```bash
npm run build
```

### 3. Create GitHub Token
1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo` (full control)
4. Copy the generated token

### 4. Configure Environment
```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_token_here"
```

### 5. Test the Installation
```bash
node test.mjs
```

### 6. Configure Your MCP Client
See `CONFIGURATION.md` for specific client configurations:
- Claude Desktop
- VS Code
- MCP Inspector

## Usage Examples

### Example 1: List Your Repositories
The AI assistant can list all your repositories:
```
"Please list my GitHub repositories, showing the most recently updated ones first."
```

This calls:
```json
{
  "name": "list_repositories",
  "arguments": {
    "type": "owner",
    "sort": "updated",
    "direction": "desc",
    "per_page": 10
  }
}
```

### Example 2: Create a Feature Branch and Make Changes
```
"Create a feature branch called 'add-readme' from main, 
add a README.md file with project description, 
and create a pull request."
```

This performs:
1. `create_branch` - Creates the feature branch
2. `create_or_update_file` - Adds README.md
3. `create_pull_request` - Creates PR

### Example 3: Search for Security Issues
```
"Search for any open security issues in my repositories 
that were created in the last 30 days."
```

Uses:
```json
{
  "name": "search_issues",
  "arguments": {
    "query": "is:issue is:open label:security user:your-username created:>2024-01-01"
  }
}
```

### Example 4: Create and Publish a Release
```
"Create a new release tagged v1.0.0 with release notes 
listing the main features and bug fixes."
```

This calls:
```json
{
  "name": "create_release",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "tag_name": "v1.0.0",
    "name": "Version 1.0.0",
    "body": "## Features\n- Feature 1\n- Feature 2\n\n## Bug Fixes\n- Fix 1",
    "draft": false,
    "prerelease": false
  }
}
```

## Testing with Real GitHub Account

To test the server with your actual GitHub account:

### Option 1: MCP Inspector (Recommended for Testing)
```bash
# Install inspector globally
npm install -g @modelcontextprotocol/inspector

# Set your token
export GITHUB_PERSONAL_ACCESS_TOKEN="your_token"

# Run inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

Then open http://localhost:5173 in your browser to:
- See all available tools
- Call tools with custom parameters
- View responses in real-time

### Option 2: Direct Node Execution
```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="your_token"
node dist/index.js
```

The server will start on stdio and wait for MCP protocol messages.

### Option 3: Integrate with Claude/VS Code
Follow the configuration examples in `CONFIGURATION.md`.

## Common Workflows

### Workflow 1: Fix a Bug
1. Search for the bug issue: `search_issues`
2. Create feature branch: `create_branch`
3. Make code changes: `create_or_update_file` or `push_files`
4. Create pull request: `create_pull_request`
5. Request review: `create_pull_request_review`
6. Merge when approved: `merge_pull_request`

### Workflow 2: Start New Project
1. Create repository: `create_repository`
2. Initialize with files: `push_files`
3. Create initial release: `create_release`
4. Create first issue for planning: `create_issue`

### Workflow 3: Code Review
1. List open PRs: `list_pull_requests`
2. Get PR details: `get_pull_request`
3. View changed files: `get_pull_request_files`
4. Add review comments: `create_pull_request_review`
5. Approve or request changes

### Workflow 4: Release Management
1. List commits since last release: `list_commits`
2. Create release notes from commits
3. Create new release: `create_release`
4. Announce release in issue/PR: `add_issue_comment`

## Advanced Search Queries

The server supports GitHub's full search syntax:

### Code Search Examples
```
# Find API endpoints
"path:src/ extension:js fetch OR axios"

# Find configuration files
"filename:package.json path:/"

# Find potential bugs
"TODO OR FIXME OR HACK language:python"
```

### Issue/PR Search Examples
```
# Open PRs needing review
"is:pr is:open review:required"

# Stale issues
"is:issue is:open updated:<2024-01-01"

# High priority bugs
"is:issue is:open label:bug label:priority-high"
```

## Security Considerations

### Token Security
- ✅ Never commit tokens to version control
- ✅ Use environment variables or secret management
- ✅ Rotate tokens regularly
- ✅ Use minimal required scopes
- ✅ Monitor token usage in GitHub settings

### API Usage
- ✅ Respect rate limits (5,000 requests/hour)
- ✅ Cache responses when appropriate
- ✅ Use conditional requests with ETags
- ✅ Handle 429 errors gracefully

### Error Handling
- ✅ All operations include comprehensive error handling
- ✅ Specific error types for different scenarios
- ✅ Detailed error messages for debugging
- ✅ Rate limit information in error responses

## Troubleshooting

### Build Issues
```bash
# Clean and rebuild
rm -rf dist/ node_modules/
npm install
npm run build
```

### Token Issues
```bash
# Verify token is set
echo $GITHUB_PERSONAL_ACCESS_TOKEN

# Check token scopes at
# https://github.com/settings/tokens
```

### Permission Issues
Most operations require `repo` scope. Some operations need additional scopes:
- Delete repository: `delete_repo`
- Read organization data: `read:org`

### Rate Limiting
If you hit rate limits:
1. Wait for reset time (shown in error)
2. Use a different token
3. Implement caching in your application

## Performance Tips

1. **Batch Operations**: Use `push_files` instead of multiple `create_or_update_file` calls
2. **Pagination**: Use `per_page` parameter to control response size
3. **Filtering**: Use query parameters to filter at API level
4. **Caching**: Cache repository metadata and file contents when possible

## Extending the Server

### Adding New Operations

1. Create schema in appropriate operation file:
```typescript
export const NewOperationSchema = z.object({
  // Define parameters
});
```

2. Implement operation function:
```typescript
export async function newOperation(client: GitHubClient, params: z.infer<typeof NewOperationSchema>) {
  return await client.get(`/endpoint`);
}
```

3. Register in `index.ts`:
```typescript
// In ListToolsRequestSchema handler
{
  name: 'new_operation',
  description: 'Description',
  inputSchema: zodToJsonSchema(NewOperationSchema),
}

// In CallToolRequestSchema handler
if (name === 'new_operation') {
  const result = await operations.newOperation(githubClient, args as any);
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}
```

### Adding New Operation Categories

1. Create new file in `src/operations/`
2. Export schemas and functions
3. Import in `src/index.ts`
4. Register tools and handlers

## Resources

### Documentation
- [GitHub REST API Docs](https://docs.github.com/en/rest)
- [MCP Specification](https://modelcontextprotocol.io)
- [GitHub Search Syntax](https://docs.github.com/en/search-github)

### Local Files
- `github-api-reference.md` - API endpoint reference
- `README.md` - User documentation
- `CONFIGURATION.md` - Configuration examples

## License

MIT

## Support

For issues and questions:
1. Check documentation files in this directory
2. Review GitHub API documentation
3. Test with MCP Inspector
4. Open an issue in the repository

## Version History

- **1.0.0** (2024-01-18): Initial release
  - 40+ GitHub operations
  - Comprehensive error handling
  - Full MCP SDK integration
  - Complete documentation

## Next Steps

After setting up the server, you can:

1. ✅ Test with MCP Inspector to verify all tools work
2. ✅ Configure in Claude Desktop or VS Code
3. ✅ Use natural language to interact with GitHub
4. ✅ Automate repository management tasks
5. ✅ Build custom workflows for your team

Enjoy using your GitHub MCP Server! 🚀
