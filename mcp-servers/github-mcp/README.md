# GitHub MCP Server

A comprehensive Model Context Protocol (MCP) server for GitHub API that enables AI assistants to interact with GitHub repositories, issues, pull requests, releases, and more.

## Features

### Complete GitHub Operations
- ✅ **Repository Management**: Create, fork, search, list, and delete repositories
- ✅ **File Operations**: Read, write, update, and delete files with full Git history
- ✅ **Branch Management**: Create, list, and delete branches
- ✅ **Commit Operations**: List and view commits with full details
- ✅ **Issue Tracking**: Create, update, list, and comment on issues
- ✅ **Pull Requests**: Create, update, merge, review, and manage PRs
- ✅ **Search**: Search code, issues, users, and repositories
- ✅ **Releases**: Create, update, list, and manage releases
- ✅ **Batch Operations**: Push multiple files in a single commit
- ✅ **Error Handling**: Comprehensive error handling with specific error types

### Key Capabilities
- 🔐 Secure authentication with Personal Access Tokens
- 🚀 Full REST API coverage for common GitHub operations
- 📦 Built on Model Context Protocol SDK
- 🛡️ Rate limit handling and error recovery
- 🔄 Automatic branch creation when needed
- 📝 Detailed operation descriptions for AI assistants

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- GitHub Personal Access Token

### Install Dependencies

```bash
cd mcp-servers/github-mcp
npm install
```

### Build

```bash
npm run build
```

## Configuration

### 1. Create a GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "MCP Server")
4. Select scopes based on your needs:
   - `repo` - Full control of private repositories (required)
   - `public_repo` - Access public repositories only (alternative to `repo`)
   - `read:org` - Read org and team membership
   - `user` - Read user profile data
   - `delete_repo` - Delete repositories (if needed)
5. Generate and copy the token

### 2. Set Environment Variable

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"
```

Or add to your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
echo 'export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"' >> ~/.bashrc
source ~/.bashrc
```

### 3. Configure MCP Client

#### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": [
        "/absolute/path/to/AiAssist/mcp-servers/github-mcp/dist/index.js"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

#### For VS Code

Add to your VS Code settings (`.vscode/mcp.json` or User Settings JSON):

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

#### Using NPX (once published)

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@aiassist/github-mcp-server"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Available Tools

### Repository Operations

#### `create_repository`
Create a new GitHub repository.

**Parameters:**
- `name` (string, required): Repository name
- `description` (string, optional): Repository description
- `private` (boolean, optional): Make repository private
- `auto_init` (boolean, optional): Initialize with README
- `gitignore_template` (string, optional): Gitignore template
- `license_template` (string, optional): License template

**Example:**
```json
{
  "name": "my-new-repo",
  "description": "A test repository",
  "private": false,
  "auto_init": true,
  "license_template": "mit"
}
```

#### `search_repositories`
Search for repositories on GitHub.

**Parameters:**
- `query` (string, required): Search query (e.g., "language:javascript stars:>1000")
- `sort` (string, optional): stars, forks, help-wanted-issues, updated
- `order` (string, optional): asc, desc
- `per_page` (number, optional): Results per page (max 100)
- `page` (number, optional): Page number

#### `get_repository`
Get details of a specific repository.

**Parameters:**
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name

#### `fork_repository`
Fork a repository.

**Parameters:**
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `organization` (string, optional): Organization to fork to

#### `list_repositories`
List repositories for the authenticated user.

**Parameters:**
- `type` (string, optional): all, owner, public, private, member
- `sort` (string, optional): created, updated, pushed, full_name
- `direction` (string, optional): asc, desc
- `per_page` (number, optional): Results per page
- `page` (number, optional): Page number

### File Operations

#### `get_file_contents`
Get contents of a file or directory.

**Parameters:**
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `path` (string, required): Path to file or directory
- `ref` (string, optional): Branch, tag, or commit SHA

#### `create_or_update_file`
Create or update a single file.

**Parameters:**
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `path` (string, required): File path
- `content` (string, required): File content
- `message` (string, required): Commit message
- `branch` (string, required): Branch name
- `sha` (string, optional): File SHA for updates

#### `push_files`
Push multiple files in a single commit.

**Parameters:**
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `branch` (string, required): Branch name
- `message` (string, required): Commit message
- `files` (array, required): Array of {path, content} objects

### Branch Operations

#### `list_branches`
List branches in a repository.

#### `get_branch`
Get details of a specific branch.

#### `create_branch`
Create a new branch.

**Parameters:**
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `branch` (string, required): New branch name
- `from_branch` (string, optional): Source branch

#### `delete_branch`
Delete a branch.

### Issue Operations

#### `list_issues`
List issues in a repository.

**Parameters:**
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `state` (string, optional): open, closed, all
- `labels` (array, optional): Filter by labels
- `sort` (string, optional): created, updated, comments
- `direction` (string, optional): asc, desc

#### `create_issue`
Create a new issue.

**Parameters:**
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `title` (string, required): Issue title
- `body` (string, optional): Issue description
- `assignees` (array, optional): Usernames to assign
- `labels` (array, optional): Labels to add
- `milestone` (number, optional): Milestone number

#### `update_issue`
Update an existing issue.

#### `add_issue_comment`
Add a comment to an issue.

### Pull Request Operations

#### `list_pull_requests`
List pull requests in a repository.

#### `create_pull_request`
Create a new pull request.

**Parameters:**
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `title` (string, required): PR title
- `head` (string, required): Branch with changes
- `base` (string, required): Branch to merge into
- `body` (string, optional): PR description
- `draft` (boolean, optional): Create as draft

#### `merge_pull_request`
Merge a pull request.

**Parameters:**
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `pull_number` (number, required): PR number
- `merge_method` (string, optional): merge, squash, rebase

#### `create_pull_request_review`
Create a review on a pull request.

### Search Operations

#### `search_code`
Search for code across GitHub.

**Example queries:**
- `"import express" language:typescript path:src/`
- `addClass in:file language:javascript repo:owner/repo`

#### `search_issues`
Search for issues and pull requests.

**Example queries:**
- `is:issue is:open label:bug repo:owner/repo`
- `is:pr is:closed author:username`

#### `search_users`
Search for GitHub users.

**Example queries:**
- `location:London followers:>100`
- `type:user language:python`

### Release Operations

#### `list_releases`
List releases in a repository.

#### `get_latest_release`
Get the latest release.

#### `create_release`
Create a new release.

**Parameters:**
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `tag_name` (string, required): Tag name
- `name` (string, optional): Release name
- `body` (string, optional): Release notes
- `draft` (boolean, optional): Create as draft
- `prerelease` (boolean, optional): Mark as prerelease

## Usage Examples

### Read Your Repositories

```javascript
// List all your repositories
{
  "tool": "list_repositories",
  "arguments": {
    "type": "owner",
    "sort": "updated",
    "direction": "desc",
    "per_page": 10
  }
}
```

### Create and Initialize a Repository

```javascript
// Create a new repository
{
  "tool": "create_repository",
  "arguments": {
    "name": "my-project",
    "description": "My awesome project",
    "private": false,
    "auto_init": true,
    "license_template": "mit"
  }
}
```

### Create a Feature Branch and Push Changes

```javascript
// 1. Create a branch
{
  "tool": "create_branch",
  "arguments": {
    "owner": "username",
    "repo": "my-project",
    "branch": "feature/new-feature",
    "from_branch": "main"
  }
}

// 2. Push files
{
  "tool": "push_files",
  "arguments": {
    "owner": "username",
    "repo": "my-project",
    "branch": "feature/new-feature",
    "message": "Add new feature",
    "files": [
      {
        "path": "src/feature.js",
        "content": "console.log('Hello World');"
      },
      {
        "path": "README.md",
        "content": "# My Project\n\nNew feature added!"
      }
    ]
  }
}

// 3. Create pull request
{
  "tool": "create_pull_request",
  "arguments": {
    "owner": "username",
    "repo": "my-project",
    "title": "Add new feature",
    "body": "This PR adds a new feature",
    "head": "feature/new-feature",
    "base": "main"
  }
}
```

### Search and Analyze Code

```javascript
// Search for specific code patterns
{
  "tool": "search_code",
  "arguments": {
    "query": "fetch api language:javascript repo:owner/repo"
  }
}

// Search for open bugs
{
  "tool": "search_issues",
  "arguments": {
    "query": "is:issue is:open label:bug repo:owner/repo"
  }
}
```

### Create a Release

```javascript
// Create a new release
{
  "tool": "create_release",
  "arguments": {
    "owner": "username",
    "repo": "my-project",
    "tag_name": "v1.0.0",
    "name": "Version 1.0.0",
    "body": "## Changes\n- Feature 1\n- Feature 2\n- Bug fixes",
    "draft": false,
    "prerelease": false
  }
}
```

## Error Handling

The server provides detailed error messages for common scenarios:

- **Authentication Error (401)**: Invalid or expired token
- **Permission Error (403)**: Insufficient permissions
- **Not Found (404)**: Resource doesn't exist
- **Conflict (409)**: Resource already exists or can't be modified
- **Validation Error (422)**: Invalid input data
- **Rate Limit (429)**: API rate limit exceeded (includes reset time)

## Development

### Watch Mode

```bash
npm run dev
```

### Testing Locally

```bash
# Build the server
npm run build

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## Security Best Practices

1. **Never commit tokens**: Keep your GitHub token secure and never commit it to version control
2. **Use environment variables**: Store the token in environment variables
3. **Scope appropriately**: Only grant the minimum necessary scopes to your token
4. **Rotate regularly**: Periodically rotate your tokens
5. **Monitor usage**: Keep track of API usage and rate limits

## Troubleshooting

### "GitHub token is required" Error
Make sure `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable is set.

### Rate Limit Exceeded
Wait for the rate limit to reset (shown in error message) or use a different token.

### Permission Denied
Ensure your token has the necessary scopes for the operation you're attempting.

### 404 Not Found
Verify the repository owner and name are correct, and that your token has access.

## API Reference

For detailed GitHub API documentation, see:
- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub API Reference in this repo](../github-api-reference.md)

## License

MIT

## Contributing

Contributions are welcome! Please ensure all new features include appropriate error handling and follow the existing code structure.

## Support

For issues and questions:
1. Check the [GitHub API documentation](https://docs.github.com/en/rest)
2. Review the [github-api-reference.md](../github-api-reference.md) file
3. Open an issue in this repository

## Version

Current version: 1.0.0

## Author

AiAssist Project
