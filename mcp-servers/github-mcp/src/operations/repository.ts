import { z } from 'zod';
import { GitHubClient } from '../common/github-client.js';

// Schemas
export const CreateRepositorySchema = z.object({
  name: z.string().describe('Repository name'),
  description: z.string().optional().describe('Repository description'),
  private: z.boolean().optional().describe('Whether repository should be private'),
  auto_init: z.boolean().optional().describe('Initialize with README'),
  gitignore_template: z.string().optional().describe('Gitignore template to use'),
  license_template: z.string().optional().describe('License template to use'),
});

export const SearchRepositoriesSchema = z.object({
  query: z.string().describe('Search query (e.g., "language:javascript stars:>1000")'),
  sort: z.enum(['stars', 'forks', 'help-wanted-issues', 'updated']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
  page: z.number().min(1).optional().describe('Page number'),
});

export const GetRepositorySchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
});

export const ForkRepositorySchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  organization: z.string().optional().describe('Organization to fork to'),
});

export const DeleteRepositorySchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
});

export const ListRepositoriesSchema = z.object({
  type: z.enum(['all', 'owner', 'public', 'private', 'member']).optional(),
  sort: z.enum(['created', 'updated', 'pushed', 'full_name']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

// Operations
export async function createRepository(client: GitHubClient, params: z.infer<typeof CreateRepositorySchema>) {
  return await client.post('/user/repos', params);
}

export async function searchRepositories(client: GitHubClient, params: z.infer<typeof SearchRepositoriesSchema>) {
  const queryParams = new URLSearchParams();
  queryParams.append('q', params.query);
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.order) queryParams.append('order', params.order);
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params.page) queryParams.append('page', params.page.toString());

  return await client.get(`/search/repositories?${queryParams.toString()}`);
}

export async function getRepository(client: GitHubClient, params: z.infer<typeof GetRepositorySchema>) {
  return await client.get(`/repos/${params.owner}/${params.repo}`);
}

export async function forkRepository(client: GitHubClient, params: z.infer<typeof ForkRepositorySchema>) {
  const body = params.organization ? { organization: params.organization } : {};
  return await client.post(`/repos/${params.owner}/${params.repo}/forks`, body);
}

export async function deleteRepository(client: GitHubClient, params: z.infer<typeof DeleteRepositorySchema>) {
  return await client.delete(`/repos/${params.owner}/${params.repo}`);
}

export async function listRepositories(client: GitHubClient, params: z.infer<typeof ListRepositoriesSchema>) {
  const queryParams = new URLSearchParams();
  if (params.type) queryParams.append('type', params.type);
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.direction) queryParams.append('direction', params.direction);
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params.page) queryParams.append('page', params.page.toString());

  const query = queryParams.toString();
  return await client.get(`/user/repos${query ? '?' + query : ''}`);
}
