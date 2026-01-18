import { z } from 'zod';
import { GitHubClient } from '../common/github-client.js';

// Schemas
export const ListBranchesSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  protected: z.boolean().optional().describe('Filter by protected status'),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

export const GetBranchSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  branch: z.string().describe('Branch name'),
});

export const CreateBranchSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  branch: z.string().describe('New branch name'),
  from_branch: z.string().optional().describe('Source branch (defaults to default branch)'),
});

export const DeleteBranchSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  branch: z.string().describe('Branch name to delete'),
});

// Operations
export async function listBranches(client: GitHubClient, params: z.infer<typeof ListBranchesSchema>) {
  const queryParams = new URLSearchParams();
  if (params.protected !== undefined) queryParams.append('protected', params.protected.toString());
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  
  const query = queryParams.toString();
  return await client.get(`/repos/${params.owner}/${params.repo}/branches${query ? '?' + query : ''}`);
}

export async function getBranch(client: GitHubClient, params: z.infer<typeof GetBranchSchema>) {
  return await client.get(`/repos/${params.owner}/${params.repo}/branches/${params.branch}`);
}

export async function createBranch(client: GitHubClient, params: z.infer<typeof CreateBranchSchema>) {
  // Get the SHA of the source branch
  let sha: string;
  if (params.from_branch) {
    const branchData = await client.get<any>(`/repos/${params.owner}/${params.repo}/git/ref/heads/${params.from_branch}`);
    sha = branchData.object.sha;
  } else {
    // Get default branch
    const repoData = await client.get<any>(`/repos/${params.owner}/${params.repo}`);
    const defaultBranch = repoData.default_branch;
    const branchData = await client.get<any>(`/repos/${params.owner}/${params.repo}/git/ref/heads/${defaultBranch}`);
    sha = branchData.object.sha;
  }
  
  // Create the new branch
  return await client.post(`/repos/${params.owner}/${params.repo}/git/refs`, {
    ref: `refs/heads/${params.branch}`,
    sha,
  });
}

export async function deleteBranch(client: GitHubClient, params: z.infer<typeof DeleteBranchSchema>) {
  return await client.delete(`/repos/${params.owner}/${params.repo}/git/refs/heads/${params.branch}`);
}
