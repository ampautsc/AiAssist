# GitHub MCP Server - Configuration Examples

This file contains various configuration examples for using the GitHub MCP Server with different MCP clients.

## Environment Setup

First, create a GitHub Personal Access Token and set it as an environment variable:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_YourTokenHere123456789"
```

## Claude Desktop Configuration

### macOS
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
Location: `%APPDATA%\Claude\claude_desktop_config.json`

### Linux
Location: `~/.config/Claude/claude_desktop_config.json`

### Configuration

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": [
        "/absolute/path/to/AiAssist/mcp-servers/github-mcp/dist/index.js"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_YourTokenHere123456789"
      }
    }
  }
}
```

## VS Code Configuration

### Option 1: Workspace Configuration (`.vscode/mcp.json`)

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "github_token",
      "description": "GitHub Personal Access Token",
      "password": true
    }
  ],
  "servers": {
    "github": {
      "command": "node",
      "args": [
        "${workspaceFolder}/mcp-servers/github-mcp/dist/index.js"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${input:github_token}"
      }
    }
  }
}
```

### Option 2: User Settings (Settings > Extensions > MCP)

Add to your User Settings JSON (`Ctrl+Shift+P` > "Preferences: Open User Settings (JSON)"):

```json
{
  "mcp": {
    "inputs": [
      {
        "type": "promptString",
        "id": "github_token",
        "description": "GitHub Personal Access Token",
        "password": true
      }
    ],
    "servers": {
      "github": {
        "command": "node",
        "args": [
          "/absolute/path/to/AiAssist/mcp-servers/github-mcp/dist/index.js"
        ],
        "env": {
          "GITHUB_PERSONAL_ACCESS_TOKEN": "${input:github_token}"
        }
      }
    }
  }
}
```

## Testing with MCP Inspector

The MCP Inspector is a useful tool for testing MCP servers:

```bash
# Install the inspector
npm install -g @modelcontextprotocol/inspector

# Run the inspector with your server
npx @modelcontextprotocol/inspector node /absolute/path/to/AiAssist/mcp-servers/github-mcp/dist/index.js
```

Then open your browser to the URL shown (typically http://localhost:5173) to interact with the server.

## Example Usage Scenarios

### Scenario 1: Repository Management

```javascript
// List your repositories
{
  "name": "list_repositories",
  "arguments": {
    "type": "owner",
    "sort": "updated",
    "per_page": 10
  }
}

// Search for repositories
{
  "name": "search_repositories",
  "arguments": {
    "query": "language:javascript stars:>100 topic:react"
  }
}

// Fork a repository
{
  "name": "fork_repository",
  "arguments": {
    "owner": "facebook",
    "repo": "react"
  }
}
```

### Scenario 2: File Management

```javascript
// Read a file
{
  "name": "get_file_contents",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "path": "README.md"
  }
}

// Update a file
{
  "name": "create_or_update_file",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "path": "src/app.js",
    "content": "console.log('Hello, World!');",
    "message": "Update app.js",
    "branch": "main",
    "sha": "abc123def456..."
  }
}

// Push multiple files at once
{
  "name": "push_files",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "branch": "feature-branch",
    "message": "Add new features",
    "files": [
      {
        "path": "src/feature1.js",
        "content": "// Feature 1 code"
      },
      {
        "path": "src/feature2.js",
        "content": "// Feature 2 code"
      }
    ]
  }
}
```

### Scenario 3: Pull Request Workflow

```javascript
// 1. Create a branch
{
  "name": "create_branch",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "branch": "fix/bug-123",
    "from_branch": "main"
  }
}

// 2. Make changes (push files)
{
  "name": "push_files",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "branch": "fix/bug-123",
    "message": "Fix bug #123",
    "files": [
      {
        "path": "src/bugfix.js",
        "content": "// Fixed code"
      }
    ]
  }
}

// 3. Create pull request
{
  "name": "create_pull_request",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "title": "Fix: Bug #123",
    "body": "This PR fixes bug #123 by...",
    "head": "fix/bug-123",
    "base": "main"
  }
}

// 4. Review the pull request
{
  "name": "create_pull_request_review",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "pull_number": 1,
    "body": "Looks good to me!",
    "event": "APPROVE"
  }
}

// 5. Merge the pull request
{
  "name": "merge_pull_request",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "pull_number": 1,
    "merge_method": "squash"
  }
}
```

### Scenario 4: Issue Management

```javascript
// Create an issue
{
  "name": "create_issue",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "title": "Bug: Application crashes on startup",
    "body": "## Description\nThe application crashes when...\n\n## Steps to Reproduce\n1. ...\n2. ...",
    "labels": ["bug", "priority-high"],
    "assignees": ["username1"]
  }
}

// List open issues with specific label
{
  "name": "list_issues",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "state": "open",
    "labels": ["bug"],
    "sort": "created",
    "direction": "desc"
  }
}

// Add a comment to an issue
{
  "name": "add_issue_comment",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "issue_number": 42,
    "body": "I'm investigating this issue and will provide an update soon."
  }
}

// Close an issue
{
  "name": "update_issue",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "issue_number": 42,
    "state": "closed"
  }
}
```

### Scenario 5: Release Management

```javascript
// Create a release
{
  "name": "create_release",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "tag_name": "v1.0.0",
    "name": "Version 1.0.0",
    "body": "## What's New\n- Feature 1\n- Feature 2\n\n## Bug Fixes\n- Fix 1\n- Fix 2",
    "draft": false,
    "prerelease": false
  }
}

// List all releases
{
  "name": "list_releases",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo",
    "per_page": 10
  }
}

// Get the latest release
{
  "name": "get_latest_release",
  "arguments": {
    "owner": "your-username",
    "repo": "your-repo"
  }
}
```

### Scenario 6: Code Search and Analysis

```javascript
// Search for specific code patterns
{
  "name": "search_code",
  "arguments": {
    "query": "import React from language:javascript path:src/"
  }
}

// Search for security vulnerabilities
{
  "name": "search_code",
  "arguments": {
    "query": "eval( extension:js NOT path:test/"
  }
}

// Find all TODOs in the codebase
{
  "name": "search_code",
  "arguments": {
    "query": "TODO repo:your-username/your-repo"
  }
}

// Search for open pull requests by a specific author
{
  "name": "search_issues",
  "arguments": {
    "query": "is:pr is:open author:username repo:your-username/your-repo"
  }
}
```

## Advanced Search Queries

### Code Search
- `addClass in:file language:javascript` - Search for "addClass" in JavaScript files
- `repo:owner/repo path:src/ extension:ts` - Search TypeScript files in src directory
- `"import express" language:typescript NOT path:node_modules` - Find express imports excluding node_modules

### Issue/PR Search
- `is:issue is:open label:bug label:high-priority` - Open bugs with high priority
- `is:pr is:merged author:username created:>2024-01-01` - Merged PRs by user since 2024
- `is:issue assignee:username state:open sort:updated-desc` - Open issues assigned to user

### User Search
- `location:London followers:>100 language:javascript` - JS developers in London with 100+ followers
- `type:org repos:>50` - Organizations with more than 50 repositories

## Environment Variables

You can set these environment variables for additional configuration:

```bash
# Required
export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"

# Optional (defaults to https://api.github.com)
export GITHUB_API_BASE_URL="https://api.github.com"
```

## Troubleshooting

### Issue: "GitHub token is required"
**Solution:** Ensure the `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable is set correctly.

### Issue: "Rate limit exceeded"
**Solution:** Wait for the rate limit to reset (time shown in error message) or use a different token.

### Issue: "Permission denied"
**Solution:** Check that your token has the required scopes. For most operations, you need the `repo` scope.

### Issue: Server not starting
**Solution:** 
1. Ensure Node.js 18+ is installed: `node --version`
2. Check that the build succeeded: `ls dist/index.js`
3. Verify the path in your configuration is absolute and correct

### Issue: "Resource not found"
**Solution:** 
1. Verify repository owner and name are correct
2. Ensure your token has access to the repository
3. Check that the branch/file/issue exists

## Security Best Practices

1. **Never hardcode tokens** in configuration files
2. **Use environment variables** or secure secret management
3. **Scope tokens appropriately** - only grant necessary permissions
4. **Rotate tokens regularly** - create new tokens periodically
5. **Use separate tokens** for different purposes/environments
6. **Monitor token usage** through GitHub settings
7. **Revoke compromised tokens** immediately

## Additional Resources

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub Search Syntax](https://docs.github.com/en/search-github/searching-on-github)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [GitHub API Best Practices](https://docs.github.com/en/rest/guides/best-practices-for-integrators)
