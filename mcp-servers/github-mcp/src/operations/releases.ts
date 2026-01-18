import { z } from 'zod';
import { GitHubClient } from '../common/github-client.js';

// Schemas
export const ListReleasesSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

export const GetLatestReleaseSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
});

export const GetReleaseByTagSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  tag: z.string().describe('Release tag name'),
});

export const CreateReleaseSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  tag_name: z.string().describe('Tag name'),
  target_commitish: z.string().optional().describe('Commit SHA or branch (defaults to default branch)'),
  name: z.string().optional().describe('Release name'),
  body: z.string().optional().describe('Release notes'),
  draft: z.boolean().optional().describe('Create as draft release'),
  prerelease: z.boolean().optional().describe('Mark as prerelease'),
});

export const UpdateReleaseSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  release_id: z.number().describe('Release ID'),
  tag_name: z.string().optional().describe('Tag name'),
  target_commitish: z.string().optional().describe('Commit SHA or branch'),
  name: z.string().optional().describe('Release name'),
  body: z.string().optional().describe('Release notes'),
  draft: z.boolean().optional().describe('Draft status'),
  prerelease: z.boolean().optional().describe('Prerelease status'),
});

export const DeleteReleaseSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  release_id: z.number().describe('Release ID'),
});

// Operations
export async function listReleases(client: GitHubClient, params: z.infer<typeof ListReleasesSchema>) {
  const queryParams = new URLSearchParams();
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  
  const query = queryParams.toString();
  return await client.get(`/repos/${params.owner}/${params.repo}/releases${query ? '?' + query : ''}`);
}

export async function getLatestRelease(client: GitHubClient, params: z.infer<typeof GetLatestReleaseSchema>) {
  return await client.get(`/repos/${params.owner}/${params.repo}/releases/latest`);
}

export async function getReleaseByTag(client: GitHubClient, params: z.infer<typeof GetReleaseByTagSchema>) {
  return await client.get(`/repos/${params.owner}/${params.repo}/releases/tags/${params.tag}`);
}

export async function createRelease(client: GitHubClient, params: z.infer<typeof CreateReleaseSchema>) {
  const body: any = {
    tag_name: params.tag_name,
  };
  
  if (params.target_commitish) body.target_commitish = params.target_commitish;
  if (params.name) body.name = params.name;
  if (params.body) body.body = params.body;
  if (params.draft !== undefined) body.draft = params.draft;
  if (params.prerelease !== undefined) body.prerelease = params.prerelease;
  
  return await client.post(`/repos/${params.owner}/${params.repo}/releases`, body);
}

export async function updateRelease(client: GitHubClient, params: z.infer<typeof UpdateReleaseSchema>) {
  const body: any = {};
  
  if (params.tag_name) body.tag_name = params.tag_name;
  if (params.target_commitish) body.target_commitish = params.target_commitish;
  if (params.name) body.name = params.name;
  if (params.body) body.body = params.body;
  if (params.draft !== undefined) body.draft = params.draft;
  if (params.prerelease !== undefined) body.prerelease = params.prerelease;
  
  return await client.patch(`/repos/${params.owner}/${params.repo}/releases/${params.release_id}`, body);
}

export async function deleteRelease(client: GitHubClient, params: z.infer<typeof DeleteReleaseSchema>) {
  return await client.delete(`/repos/${params.owner}/${params.repo}/releases/${params.release_id}`);
}
