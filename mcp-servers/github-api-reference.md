# GitHub API Reference for MCP Server

This document provides comprehensive information about the GitHub REST API endpoints used in our MCP server implementation.

## Authentication

GitHub API requires authentication for most operations. Use a Personal Access Token (PAT):

```bash
# Set environment variable
export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"
```

### Creating a Personal Access Token

1. Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes based on your needs:
   - `repo` - Full control of private repositories
   - `public_repo` - Access public repositories only
   - `read:org` - Read org and team membership
   - `user` - Read user profile data
   - `gist` - Create gists
   - `delete_repo` - Delete repositories

## Rate Limiting

- **Authenticated requests**: 5,000 requests per hour
- **Unauthenticated requests**: 60 requests per hour
- Check rate limit status: `GET /rate_limit`

## API Endpoints

### Repository Operations

#### Create Repository
```
POST /user/repos
POST /orgs/{org}/repos
```
**Body:**
```json
{
  "name": "repository-name",
  "description": "Repository description",
  "private": false,
  "auto_init": true,
  "gitignore_template": "Node",
  "license_template": "mit"
}
```

#### Get Repository
```
GET /repos/{owner}/{repo}
```

#### List User Repositories
```
GET /user/repos
GET /users/{username}/repos
```

#### Fork Repository
```
POST /repos/{owner}/{repo}/forks
```

#### Delete Repository
```
DELETE /repos/{owner}/{repo}
```

#### Search Repositories
```
GET /search/repositories?q={query}
```

**Query parameters:**
- `q`: Search keywords
- `sort`: stars, forks, help-wanted-issues, updated
- `order`: asc, desc
- `per_page`: Results per page (max 100)
- `page`: Page number

**Example queries:**
- `language:javascript stars:>1000`
- `user:username topic:react`
- `org:organization fork:only`

### File Operations

#### Get File Contents
```
GET /repos/{owner}/{repo}/contents/{path}
```

**Query parameters:**
- `ref`: Branch, tag, or commit SHA (defaults to default branch)

#### Create or Update File
```
PUT /repos/{owner}/{repo}/contents/{path}
```

**Body:**
```json
{
  "message": "Commit message",
  "content": "base64_encoded_content",
  "sha": "blob_sha_for_update",
  "branch": "branch-name"
}
```

#### Delete File
```
DELETE /repos/{owner}/{repo}/contents/{path}
```

### Branch Operations

#### List Branches
```
GET /repos/{owner}/{repo}/branches
```

#### Get Branch
```
GET /repos/{owner}/{repo}/branches/{branch}
```

#### Create Branch (via Git References)
```
POST /repos/{owner}/{repo}/git/refs
```

**Body:**
```json
{
  "ref": "refs/heads/branch-name",
  "sha": "commit_sha"
}
```

#### Delete Branch
```
DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}
```

### Commit Operations

#### List Commits
```
GET /repos/{owner}/{repo}/commits
```

**Query parameters:**
- `sha`: Branch, tag, or SHA to start from
- `path`: Only commits containing this file path
- `author`: GitHub username or email address
- `since`: ISO 8601 timestamp
- `until`: ISO 8601 timestamp
- `per_page`: Results per page (max 100)
- `page`: Page number

#### Get Commit
```
GET /repos/{owner}/{repo}/commits/{ref}
```

#### Create Commit
```
POST /repos/{owner}/{repo}/git/commits
```

**Body:**
```json
{
  "message": "Commit message",
  "tree": "tree_sha",
  "parents": ["parent_sha"]
}
```

### Issue Operations

#### List Issues
```
GET /repos/{owner}/{repo}/issues
```

**Query parameters:**
- `state`: open, closed, all
- `labels`: Label names (comma-separated)
- `sort`: created, updated, comments
- `direction`: asc, desc
- `since`: ISO 8601 timestamp

#### Get Issue
```
GET /repos/{owner}/{repo}/issues/{issue_number}
```

#### Create Issue
```
POST /repos/{owner}/{repo}/issues
```

**Body:**
```json
{
  "title": "Issue title",
  "body": "Issue description",
  "assignees": ["username1", "username2"],
  "labels": ["bug", "enhancement"],
  "milestone": 1
}
```

#### Update Issue
```
PATCH /repos/{owner}/{repo}/issues/{issue_number}
```

#### Add Issue Comment
```
POST /repos/{owner}/{repo}/issues/{issue_number}/comments
```

**Body:**
```json
{
  "body": "Comment text"
}
```

#### Lock Issue
```
PUT /repos/{owner}/{repo}/issues/{issue_number}/lock
```

### Pull Request Operations

#### List Pull Requests
```
GET /repos/{owner}/{repo}/pulls
```

**Query parameters:**
- `state`: open, closed, all
- `head`: Filter by head user and branch (format: `user:ref-name`)
- `base`: Filter by base branch
- `sort`: created, updated, popularity, long-running
- `direction`: asc, desc

#### Get Pull Request
```
GET /repos/{owner}/{repo}/pulls/{pull_number}
```

#### Create Pull Request
```
POST /repos/{owner}/{repo}/pulls
```

**Body:**
```json
{
  "title": "PR title",
  "body": "PR description",
  "head": "branch-with-changes",
  "base": "main",
  "draft": false,
  "maintainer_can_modify": true
}
```

#### Update Pull Request
```
PATCH /repos/{owner}/{repo}/pulls/{pull_number}
```

#### Merge Pull Request
```
PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge
```

**Body:**
```json
{
  "commit_title": "Merge title",
  "commit_message": "Merge message",
  "merge_method": "merge|squash|rebase"
}
```

#### List Pull Request Files
```
GET /repos/{owner}/{repo}/pulls/{pull_number}/files
```

#### Create Pull Request Review
```
POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews
```

**Body:**
```json
{
  "body": "Review comment",
  "event": "APPROVE|REQUEST_CHANGES|COMMENT",
  "comments": [
    {
      "path": "file.js",
      "position": 5,
      "body": "Line comment"
    }
  ]
}
```

#### Get Pull Request Reviews
```
GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews
```

#### Get Pull Request Comments
```
GET /repos/{owner}/{repo}/pulls/{pull_number}/comments
```

### Search Operations

#### Search Code
```
GET /search/code?q={query}
```

**Query syntax:**
- `in:file,path`: Search in file contents or path
- `language:javascript`: Filter by language
- `repo:owner/name`: Search specific repo
- `org:name`: Search organization
- `path:src/`: Search in specific path
- `extension:js`: Filter by extension
- `size:>1000`: Filter by file size
- `filename:package.json`: Search by filename

**Example queries:**
- `addClass in:file language:javascript repo:owner/repo`
- `import express language:typescript path:src/`

#### Search Issues and Pull Requests
```
GET /search/issues?q={query}
```

**Query syntax:**
- `is:issue` or `is:pr`: Filter by type
- `is:open` or `is:closed`: Filter by state
- `author:username`: Filter by author
- `assignee:username`: Filter by assignee
- `label:bug`: Filter by label
- `repo:owner/name`: Search specific repo
- `created:>2024-01-01`: Filter by creation date
- `comments:>10`: Filter by comment count

**Example queries:**
- `is:issue is:open label:bug repo:owner/repo`
- `is:pr is:closed author:username merged:2024-01-01..2024-12-31`

#### Search Users
```
GET /search/users?q={query}
```

**Query syntax:**
- `type:user` or `type:org`: Filter by type
- `followers:>1000`: Filter by followers
- `repos:>10`: Filter by repository count
- `location:London`: Filter by location
- `language:javascript`: Filter by language

### Release Operations

#### List Releases
```
GET /repos/{owner}/{repo}/releases
```

#### Get Latest Release
```
GET /repos/{owner}/{repo}/releases/latest
```

#### Get Release by Tag
```
GET /repos/{owner}/{repo}/releases/tags/{tag}
```

#### Create Release
```
POST /repos/{owner}/{repo}/releases
```

**Body:**
```json
{
  "tag_name": "v1.0.0",
  "target_commitish": "main",
  "name": "Release v1.0.0",
  "body": "Release notes",
  "draft": false,
  "prerelease": false
}
```

#### Update Release
```
PATCH /repos/{owner}/{repo}/releases/{release_id}
```

#### Delete Release
```
DELETE /repos/{owner}/{repo}/releases/{release_id}
```

#### Upload Release Asset
```
POST /repos/{owner}/{repo}/releases/{release_id}/assets?name={filename}
```

### Git Data Operations

#### Get Tree
```
GET /repos/{owner}/{repo}/git/trees/{tree_sha}
```

**Query parameters:**
- `recursive`: Get tree recursively (1 for recursive)

#### Create Tree
```
POST /repos/{owner}/{repo}/git/trees
```

**Body:**
```json
{
  "tree": [
    {
      "path": "file.txt",
      "mode": "100644",
      "type": "blob",
      "content": "file contents"
    }
  ],
  "base_tree": "base_tree_sha"
}
```

#### Get Blob
```
GET /repos/{owner}/{repo}/git/blobs/{file_sha}
```

#### Create Blob
```
POST /repos/{owner}/{repo}/git/blobs
```

**Body:**
```json
{
  "content": "base64_encoded_content",
  "encoding": "base64"
}
```

### Collaboration Operations

#### List Collaborators
```
GET /repos/{owner}/{repo}/collaborators
```

#### Add Collaborator
```
PUT /repos/{owner}/{repo}/collaborators/{username}
```

#### Remove Collaborator
```
DELETE /repos/{owner}/{repo}/collaborators/{username}
```

### Webhook Operations

#### List Webhooks
```
GET /repos/{owner}/{repo}/hooks
```

#### Create Webhook
```
POST /repos/{owner}/{repo}/hooks
```

**Body:**
```json
{
  "name": "web",
  "config": {
    "url": "https://example.com/webhook",
    "content_type": "json",
    "secret": "webhook_secret"
  },
  "events": ["push", "pull_request"],
  "active": true
}
```

## Error Handling

### Common HTTP Status Codes

- `200 OK`: Success
- `201 Created`: Resource created successfully
- `204 No Content`: Success with no response body
- `304 Not Modified`: Resource hasn't changed
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Conflict (e.g., branch already exists)
- `422 Unprocessable Entity`: Validation failed
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: GitHub server error
- `503 Service Unavailable`: GitHub is temporarily unavailable

### Error Response Format

```json
{
  "message": "Error message",
  "errors": [
    {
      "resource": "Issue",
      "field": "title",
      "code": "missing_field"
    }
  ],
  "documentation_url": "https://docs.github.com/rest/..."
}
```

## Best Practices

### 1. Use Conditional Requests
Cache responses and use `If-None-Match` header with ETags to reduce rate limit usage.

### 2. Handle Rate Limiting
```javascript
const response = await fetch(url, options);
const remaining = response.headers.get('X-RateLimit-Remaining');
const resetTime = response.headers.get('X-RateLimit-Reset');
```

### 3. Use Pagination
For large result sets, use pagination:
```
GET /repos/{owner}/{repo}/issues?per_page=100&page=2
```

Check `Link` header for next/prev/first/last page URLs.

### 4. Authenticate All Requests
Always use authentication for higher rate limits and access to private resources.

### 5. Set User-Agent Header
GitHub requires a User-Agent header:
```
User-Agent: MyApp/1.0.0
```

### 6. Use HTTPS
Always use HTTPS for all API requests.

### 7. Handle Errors Gracefully
Check status codes and parse error messages for debugging.

## Resources

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub API Best Practices](https://docs.github.com/en/rest/guides/best-practices-for-integrators)
- [GitHub Search Syntax](https://docs.github.com/en/search-github/searching-on-github)
- [Octokit.js](https://github.com/octokit/octokit.js) - Official GitHub SDK
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP Specification
