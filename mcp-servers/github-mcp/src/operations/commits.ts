import { z } from 'zod';
import { GitHubClient } from '../common/github-client.js';

// Schemas
export const ListCommitsSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  sha: z.string().optional().describe('Branch, tag, or SHA to start from'),
  path: z.string().optional().describe('Only commits containing this file path'),
  author: z.string().optional().describe('GitHub username or email address'),
  since: z.string().optional().describe('ISO 8601 timestamp'),
  until: z.string().optional().describe('ISO 8601 timestamp'),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

export const GetCommitSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  ref: z.string().describe('Commit SHA, branch, or tag'),
});

// Operations
export async function listCommits(client: GitHubClient, params: z.infer<typeof ListCommitsSchema>) {
  const queryParams = new URLSearchParams();
  if (params.sha) queryParams.append('sha', params.sha);
  if (params.path) queryParams.append('path', params.path);
  if (params.author) queryParams.append('author', params.author);
  if (params.since) queryParams.append('since', params.since);
  if (params.until) queryParams.append('until', params.until);
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  
  const query = queryParams.toString();
  return await client.get(`/repos/${params.owner}/${params.repo}/commits${query ? '?' + query : ''}`);
}

export async function getCommit(client: GitHubClient, params: z.infer<typeof GetCommitSchema>) {
  return await client.get(`/repos/${params.owner}/${params.repo}/commits/${params.ref}`);
}
