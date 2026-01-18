import { z } from 'zod';
import { GitHubClient } from '../common/github-client.js';

// Schemas
export const SearchCodeSchema = z.object({
  query: z.string().describe('Search query (e.g., "addClass in:file language:javascript")'),
  sort: z.enum(['indexed']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

export const SearchIssuesSchema = z.object({
  query: z.string().describe('Search query (e.g., "is:issue is:open label:bug")'),
  sort: z.enum(['comments', 'reactions', 'reactions-+1', 'reactions--1', 'reactions-smile', 'reactions-thinking_face', 'reactions-heart', 'reactions-tada', 'interactions', 'created', 'updated']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

export const SearchUsersSchema = z.object({
  query: z.string().describe('Search query (e.g., "location:London followers:>100")'),
  sort: z.enum(['followers', 'repositories', 'joined']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

// Operations
export async function searchCode(client: GitHubClient, params: z.infer<typeof SearchCodeSchema>) {
  const queryParams = new URLSearchParams();
  queryParams.append('q', params.query);
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.order) queryParams.append('order', params.order);
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  
  return await client.get(`/search/code?${queryParams.toString()}`);
}

export async function searchIssues(client: GitHubClient, params: z.infer<typeof SearchIssuesSchema>) {
  const queryParams = new URLSearchParams();
  queryParams.append('q', params.query);
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.order) queryParams.append('order', params.order);
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  
  return await client.get(`/search/issues?${queryParams.toString()}`);
}

export async function searchUsers(client: GitHubClient, params: z.infer<typeof SearchUsersSchema>) {
  const queryParams = new URLSearchParams();
  queryParams.append('q', params.query);
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.order) queryParams.append('order', params.order);
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  
  return await client.get(`/search/users?${queryParams.toString()}`);
}
