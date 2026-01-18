import { z } from 'zod';
import { GitHubClient } from '../common/github-client.js';

// Schemas
export const ListIssuesSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  state: z.enum(['open', 'closed', 'all']).optional(),
  labels: z.array(z.string()).optional().describe('Label names'),
  sort: z.enum(['created', 'updated', 'comments']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
  since: z.string().optional().describe('ISO 8601 timestamp'),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

export const GetIssueSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issue_number: z.number().describe('Issue number'),
});

export const CreateIssueSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  title: z.string().describe('Issue title'),
  body: z.string().optional().describe('Issue description'),
  assignees: z.array(z.string()).optional().describe('Usernames to assign'),
  labels: z.array(z.string()).optional().describe('Labels to add'),
  milestone: z.number().optional().describe('Milestone number'),
});

export const UpdateIssueSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issue_number: z.number().describe('Issue number'),
  title: z.string().optional().describe('New title'),
  body: z.string().optional().describe('New description'),
  state: z.enum(['open', 'closed']).optional(),
  labels: z.array(z.string()).optional().describe('New labels'),
  assignees: z.array(z.string()).optional().describe('New assignees'),
  milestone: z.number().optional().describe('New milestone number'),
});

export const AddIssueCommentSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issue_number: z.number().describe('Issue number'),
  body: z.string().describe('Comment text'),
});

// Operations
export async function listIssues(client: GitHubClient, params: z.infer<typeof ListIssuesSchema>) {
  const queryParams = new URLSearchParams();
  if (params.state) queryParams.append('state', params.state);
  if (params.labels) queryParams.append('labels', params.labels.join(','));
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.direction) queryParams.append('direction', params.direction);
  if (params.since) queryParams.append('since', params.since);
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  
  const query = queryParams.toString();
  return await client.get(`/repos/${params.owner}/${params.repo}/issues${query ? '?' + query : ''}`);
}

export async function getIssue(client: GitHubClient, params: z.infer<typeof GetIssueSchema>) {
  return await client.get(`/repos/${params.owner}/${params.repo}/issues/${params.issue_number}`);
}

export async function createIssue(client: GitHubClient, params: z.infer<typeof CreateIssueSchema>) {
  const body: any = {
    title: params.title,
  };
  
  if (params.body) body.body = params.body;
  if (params.assignees) body.assignees = params.assignees;
  if (params.labels) body.labels = params.labels;
  if (params.milestone) body.milestone = params.milestone;
  
  return await client.post(`/repos/${params.owner}/${params.repo}/issues`, body);
}

export async function updateIssue(client: GitHubClient, params: z.infer<typeof UpdateIssueSchema>) {
  const body: any = {};
  
  if (params.title) body.title = params.title;
  if (params.body) body.body = params.body;
  if (params.state) body.state = params.state;
  if (params.labels) body.labels = params.labels;
  if (params.assignees) body.assignees = params.assignees;
  if (params.milestone !== undefined) body.milestone = params.milestone;
  
  return await client.patch(`/repos/${params.owner}/${params.repo}/issues/${params.issue_number}`, body);
}

export async function addIssueComment(client: GitHubClient, params: z.infer<typeof AddIssueCommentSchema>) {
  return await client.post(`/repos/${params.owner}/${params.repo}/issues/${params.issue_number}/comments`, {
    body: params.body,
  });
}
