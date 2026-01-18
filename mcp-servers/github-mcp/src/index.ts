#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { GitHubClient } from './common/github-client.js';
import {
  GitHubError,
  GitHubValidationError,
  GitHubResourceNotFoundError,
  GitHubAuthenticationError,
  GitHubPermissionError,
  GitHubRateLimitError,
  GitHubConflictError,
} from './common/errors.js';
import { VERSION } from './common/version.js';

// Import operations
import * as repository from './operations/repository.js';
import * as files from './operations/files.js';
import * as branches from './operations/branches.js';
import * as commits from './operations/commits.js';
import * as issues from './operations/issues.js';
import * as pulls from './operations/pulls.js';
import * as search from './operations/search.js';
import * as releases from './operations/releases.js';

// Create GitHub client
const githubClient = new GitHubClient();

// Create MCP server
const server = new Server(
  {
    name: 'github-mcp-server',
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to format GitHub errors
function formatGitHubError(error: GitHubError): string {
  let message = `GitHub API Error: ${error.message}`;

  if (error instanceof GitHubValidationError) {
    message = `Validation Error: ${error.message}`;
    if (error.response) {
      message += `\nDetails: ${JSON.stringify(error.response)}`;
    }
  } else if (error instanceof GitHubResourceNotFoundError) {
    message = `Not Found: ${error.message}`;
  } else if (error instanceof GitHubAuthenticationError) {
    message = `Authentication Failed: ${error.message}`;
  } else if (error instanceof GitHubPermissionError) {
    message = `Permission Denied: ${error.message}`;
  } else if (error instanceof GitHubRateLimitError) {
    message = `Rate Limit Exceeded: ${error.message}\nResets at: ${error.resetAt.toISOString()}`;
  } else if (error instanceof GitHubConflictError) {
    message = `Conflict: ${error.message}`;
  }

  return message;
}

// Register list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Repository operations
      {
        name: 'create_repository',
        description: 'Create a new GitHub repository in your account',
        inputSchema: zodToJsonSchema(repository.CreateRepositorySchema),
      },
      {
        name: 'search_repositories',
        description: 'Search for GitHub repositories',
        inputSchema: zodToJsonSchema(repository.SearchRepositoriesSchema),
      },
      {
        name: 'get_repository',
        description: 'Get details of a specific repository',
        inputSchema: zodToJsonSchema(repository.GetRepositorySchema),
      },
      {
        name: 'fork_repository',
        description: 'Fork a repository to your account or organization',
        inputSchema: zodToJsonSchema(repository.ForkRepositorySchema),
      },
      {
        name: 'delete_repository',
        description: 'Delete a repository (use with caution!)',
        inputSchema: zodToJsonSchema(repository.DeleteRepositorySchema),
      },
      {
        name: 'list_repositories',
        description: 'List repositories for the authenticated user',
        inputSchema: zodToJsonSchema(repository.ListRepositoriesSchema),
      },
      
      // File operations
      {
        name: 'get_file_contents',
        description: 'Get contents of a file or directory from a repository',
        inputSchema: zodToJsonSchema(files.GetFileContentsSchema),
      },
      {
        name: 'create_or_update_file',
        description: 'Create or update a single file in a repository',
        inputSchema: zodToJsonSchema(files.CreateOrUpdateFileSchema),
      },
      {
        name: 'delete_file',
        description: 'Delete a file from a repository',
        inputSchema: zodToJsonSchema(files.DeleteFileSchema),
      },
      {
        name: 'push_files',
        description: 'Push multiple files to a repository in a single commit',
        inputSchema: zodToJsonSchema(files.PushFilesSchema),
      },
      
      // Branch operations
      {
        name: 'list_branches',
        description: 'List branches in a repository',
        inputSchema: zodToJsonSchema(branches.ListBranchesSchema),
      },
      {
        name: 'get_branch',
        description: 'Get details of a specific branch',
        inputSchema: zodToJsonSchema(branches.GetBranchSchema),
      },
      {
        name: 'create_branch',
        description: 'Create a new branch',
        inputSchema: zodToJsonSchema(branches.CreateBranchSchema),
      },
      {
        name: 'delete_branch',
        description: 'Delete a branch',
        inputSchema: zodToJsonSchema(branches.DeleteBranchSchema),
      },
      
      // Commit operations
      {
        name: 'list_commits',
        description: 'List commits in a repository',
        inputSchema: zodToJsonSchema(commits.ListCommitsSchema),
      },
      {
        name: 'get_commit',
        description: 'Get details of a specific commit',
        inputSchema: zodToJsonSchema(commits.GetCommitSchema),
      },
      
      // Issue operations
      {
        name: 'list_issues',
        description: 'List issues in a repository',
        inputSchema: zodToJsonSchema(issues.ListIssuesSchema),
      },
      {
        name: 'get_issue',
        description: 'Get details of a specific issue',
        inputSchema: zodToJsonSchema(issues.GetIssueSchema),
      },
      {
        name: 'create_issue',
        description: 'Create a new issue',
        inputSchema: zodToJsonSchema(issues.CreateIssueSchema),
      },
      {
        name: 'update_issue',
        description: 'Update an existing issue',
        inputSchema: zodToJsonSchema(issues.UpdateIssueSchema),
      },
      {
        name: 'add_issue_comment',
        description: 'Add a comment to an issue',
        inputSchema: zodToJsonSchema(issues.AddIssueCommentSchema),
      },
      
      // Pull request operations
      {
        name: 'list_pull_requests',
        description: 'List pull requests in a repository',
        inputSchema: zodToJsonSchema(pulls.ListPullRequestsSchema),
      },
      {
        name: 'get_pull_request',
        description: 'Get details of a specific pull request',
        inputSchema: zodToJsonSchema(pulls.GetPullRequestSchema),
      },
      {
        name: 'create_pull_request',
        description: 'Create a new pull request',
        inputSchema: zodToJsonSchema(pulls.CreatePullRequestSchema),
      },
      {
        name: 'update_pull_request',
        description: 'Update an existing pull request',
        inputSchema: zodToJsonSchema(pulls.UpdatePullRequestSchema),
      },
      {
        name: 'merge_pull_request',
        description: 'Merge a pull request',
        inputSchema: zodToJsonSchema(pulls.MergePullRequestSchema),
      },
      {
        name: 'get_pull_request_files',
        description: 'Get list of files changed in a pull request',
        inputSchema: zodToJsonSchema(pulls.GetPullRequestFilesSchema),
      },
      {
        name: 'create_pull_request_review',
        description: 'Create a review on a pull request',
        inputSchema: zodToJsonSchema(pulls.CreatePullRequestReviewSchema),
      },
      {
        name: 'get_pull_request_reviews',
        description: 'Get reviews on a pull request',
        inputSchema: zodToJsonSchema(pulls.GetPullRequestReviewsSchema),
      },
      {
        name: 'get_pull_request_comments',
        description: 'Get review comments on a pull request',
        inputSchema: zodToJsonSchema(pulls.GetPullRequestCommentsSchema),
      },
      
      // Search operations
      {
        name: 'search_code',
        description: 'Search for code across GitHub repositories',
        inputSchema: zodToJsonSchema(search.SearchCodeSchema),
      },
      {
        name: 'search_issues',
        description: 'Search for issues and pull requests',
        inputSchema: zodToJsonSchema(search.SearchIssuesSchema),
      },
      {
        name: 'search_users',
        description: 'Search for GitHub users',
        inputSchema: zodToJsonSchema(search.SearchUsersSchema),
      },
      
      // Release operations
      {
        name: 'list_releases',
        description: 'List releases in a repository',
        inputSchema: zodToJsonSchema(releases.ListReleasesSchema),
      },
      {
        name: 'get_latest_release',
        description: 'Get the latest release in a repository',
        inputSchema: zodToJsonSchema(releases.GetLatestReleaseSchema),
      },
      {
        name: 'get_release_by_tag',
        description: 'Get a specific release by tag name',
        inputSchema: zodToJsonSchema(releases.GetReleaseByTagSchema),
      },
      {
        name: 'create_release',
        description: 'Create a new release',
        inputSchema: zodToJsonSchema(releases.CreateReleaseSchema),
      },
      {
        name: 'update_release',
        description: 'Update an existing release',
        inputSchema: zodToJsonSchema(releases.UpdateReleaseSchema),
      },
      {
        name: 'delete_release',
        description: 'Delete a release',
        inputSchema: zodToJsonSchema(releases.DeleteReleaseSchema),
      },
    ],
  };
});

// Register call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    // Repository operations
    if (name === 'create_repository') {
      const result = await repository.createRepository(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'search_repositories') {
      const result = await repository.searchRepositories(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'get_repository') {
      const result = await repository.getRepository(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'fork_repository') {
      const result = await repository.forkRepository(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'delete_repository') {
      const result = await repository.deleteRepository(githubClient, args as any);
      return { content: [{ type: 'text', text: 'Repository deleted successfully' }] };
    }
    if (name === 'list_repositories') {
      const result = await repository.listRepositories(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    // File operations
    if (name === 'get_file_contents') {
      const result = await files.getFileContents(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'create_or_update_file') {
      const result = await files.createOrUpdateFile(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'delete_file') {
      const result = await files.deleteFile(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'push_files') {
      const result = await files.pushFiles(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    // Branch operations
    if (name === 'list_branches') {
      const result = await branches.listBranches(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'get_branch') {
      const result = await branches.getBranch(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'create_branch') {
      const result = await branches.createBranch(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'delete_branch') {
      const result = await branches.deleteBranch(githubClient, args as any);
      return { content: [{ type: 'text', text: 'Branch deleted successfully' }] };
    }

    // Commit operations
    if (name === 'list_commits') {
      const result = await commits.listCommits(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'get_commit') {
      const result = await commits.getCommit(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    // Issue operations
    if (name === 'list_issues') {
      const result = await issues.listIssues(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'get_issue') {
      const result = await issues.getIssue(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'create_issue') {
      const result = await issues.createIssue(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'update_issue') {
      const result = await issues.updateIssue(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'add_issue_comment') {
      const result = await issues.addIssueComment(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    // Pull request operations
    if (name === 'list_pull_requests') {
      const result = await pulls.listPullRequests(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'get_pull_request') {
      const result = await pulls.getPullRequest(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'create_pull_request') {
      const result = await pulls.createPullRequest(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'update_pull_request') {
      const result = await pulls.updatePullRequest(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'merge_pull_request') {
      const result = await pulls.mergePullRequest(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'get_pull_request_files') {
      const result = await pulls.getPullRequestFiles(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'create_pull_request_review') {
      const result = await pulls.createPullRequestReview(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'get_pull_request_reviews') {
      const result = await pulls.getPullRequestReviews(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'get_pull_request_comments') {
      const result = await pulls.getPullRequestComments(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    // Search operations
    if (name === 'search_code') {
      const result = await search.searchCode(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'search_issues') {
      const result = await search.searchIssues(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'search_users') {
      const result = await search.searchUsers(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    // Release operations
    if (name === 'list_releases') {
      const result = await releases.listReleases(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'get_latest_release') {
      const result = await releases.getLatestRelease(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'get_release_by_tag') {
      const result = await releases.getReleaseByTag(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'create_release') {
      const result = await releases.createRelease(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'update_release') {
      const result = await releases.updateRelease(githubClient, args as any);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'delete_release') {
      const result = await releases.deleteRelease(githubClient, args as any);
      return { content: [{ type: 'text', text: 'Release deleted successfully' }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: unknown) {
    if (error instanceof GitHubError) {
      return {
        content: [{ type: 'text', text: formatGitHubError(error) }],
        isError: true,
      };
    }
    
    return {
      content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GitHub MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
