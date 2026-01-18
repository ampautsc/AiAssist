import { z } from 'zod';
import { GitHubClient } from '../common/github-client.js';

// Schemas
export const ListPullRequestsSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  state: z.enum(['open', 'closed', 'all']).optional(),
  head: z.string().optional().describe('Filter by head user and branch (format: user:ref)'),
  base: z.string().optional().describe('Filter by base branch'),
  sort: z.enum(['created', 'updated', 'popularity', 'long-running']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

export const GetPullRequestSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
});

export const CreatePullRequestSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  title: z.string().describe('PR title'),
  body: z.string().optional().describe('PR description'),
  head: z.string().describe('Branch containing changes'),
  base: z.string().describe('Branch to merge into'),
  draft: z.boolean().optional().describe('Create as draft PR'),
  maintainer_can_modify: z.boolean().optional().describe('Allow maintainer edits'),
});

export const UpdatePullRequestSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  title: z.string().optional().describe('New title'),
  body: z.string().optional().describe('New description'),
  state: z.enum(['open', 'closed']).optional(),
  base: z.string().optional().describe('New base branch'),
});

export const MergePullRequestSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  commit_title: z.string().optional().describe('Title for merge commit'),
  commit_message: z.string().optional().describe('Extra detail for merge commit'),
  merge_method: z.enum(['merge', 'squash', 'rebase']).optional(),
});

export const GetPullRequestFilesSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

export const CreatePullRequestReviewSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  body: z.string().optional().describe('Review comment text'),
  event: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']).describe('Review action'),
  comments: z.array(z.object({
    path: z.string().describe('File path'),
    position: z.number().optional().describe('Line position in diff'),
    body: z.string().describe('Comment text'),
    line: z.number().optional().describe('Line number in file'),
    side: z.enum(['LEFT', 'RIGHT']).optional().describe('Side of diff'),
  })).optional().describe('Line-specific comments'),
});

export const GetPullRequestReviewsSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
});

export const GetPullRequestCommentsSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
});

// Operations
export async function listPullRequests(client: GitHubClient, params: z.infer<typeof ListPullRequestsSchema>) {
  const queryParams = new URLSearchParams();
  if (params.state) queryParams.append('state', params.state);
  if (params.head) queryParams.append('head', params.head);
  if (params.base) queryParams.append('base', params.base);
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.direction) queryParams.append('direction', params.direction);
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  
  const query = queryParams.toString();
  return await client.get(`/repos/${params.owner}/${params.repo}/pulls${query ? '?' + query : ''}`);
}

export async function getPullRequest(client: GitHubClient, params: z.infer<typeof GetPullRequestSchema>) {
  return await client.get(`/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}`);
}

export async function createPullRequest(client: GitHubClient, params: z.infer<typeof CreatePullRequestSchema>) {
  const body: any = {
    title: params.title,
    head: params.head,
    base: params.base,
  };
  
  if (params.body) body.body = params.body;
  if (params.draft !== undefined) body.draft = params.draft;
  if (params.maintainer_can_modify !== undefined) body.maintainer_can_modify = params.maintainer_can_modify;
  
  return await client.post(`/repos/${params.owner}/${params.repo}/pulls`, body);
}

export async function updatePullRequest(client: GitHubClient, params: z.infer<typeof UpdatePullRequestSchema>) {
  const body: any = {};
  
  if (params.title) body.title = params.title;
  if (params.body) body.body = params.body;
  if (params.state) body.state = params.state;
  if (params.base) body.base = params.base;
  
  return await client.patch(`/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}`, body);
}

export async function mergePullRequest(client: GitHubClient, params: z.infer<typeof MergePullRequestSchema>) {
  const body: any = {};
  
  if (params.commit_title) body.commit_title = params.commit_title;
  if (params.commit_message) body.commit_message = params.commit_message;
  if (params.merge_method) body.merge_method = params.merge_method;
  
  return await client.put(`/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}/merge`, body);
}

export async function getPullRequestFiles(client: GitHubClient, params: z.infer<typeof GetPullRequestFilesSchema>) {
  const queryParams = new URLSearchParams();
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  
  const query = queryParams.toString();
  return await client.get(`/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}/files${query ? '?' + query : ''}`);
}

export async function createPullRequestReview(client: GitHubClient, params: z.infer<typeof CreatePullRequestReviewSchema>) {
  const body: any = {
    event: params.event,
  };
  
  if (params.body) body.body = params.body;
  if (params.comments) body.comments = params.comments;
  
  return await client.post(`/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}/reviews`, body);
}

export async function getPullRequestReviews(client: GitHubClient, params: z.infer<typeof GetPullRequestReviewsSchema>) {
  return await client.get(`/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}/reviews`);
}

export async function getPullRequestComments(client: GitHubClient, params: z.infer<typeof GetPullRequestCommentsSchema>) {
  return await client.get(`/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}/comments`);
}
