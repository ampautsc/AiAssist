import { z } from 'zod';
import { GitHubClient } from '../common/github-client.js';

// Schemas
export const GetFileContentsSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  path: z.string().describe('Path to file or directory'),
  ref: z.string().optional().describe('Branch, tag, or commit SHA'),
});

export const CreateOrUpdateFileSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  path: z.string().describe('Path where to create/update the file'),
  content: z.string().describe('File content (will be base64 encoded)'),
  message: z.string().describe('Commit message'),
  branch: z.string().describe('Branch to create/update file in'),
  sha: z.string().optional().describe('SHA of file being replaced (required for updates)'),
});

export const DeleteFileSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  path: z.string().describe('Path to file to delete'),
  message: z.string().describe('Commit message'),
  sha: z.string().describe('SHA of file being deleted'),
  branch: z.string().optional().describe('Branch to delete file from'),
});

export const PushFilesSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  branch: z.string().describe('Branch to push to'),
  message: z.string().describe('Commit message'),
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
  })).describe('Files to push'),
});

// Operations
export async function getFileContents(client: GitHubClient, params: z.infer<typeof GetFileContentsSchema>) {
  const queryParams = new URLSearchParams();
  if (params.ref) queryParams.append('ref', params.ref);
  
  const query = queryParams.toString();
  return await client.get(`/repos/${params.owner}/${params.repo}/contents/${params.path}${query ? '?' + query : ''}`);
}

export async function createOrUpdateFile(client: GitHubClient, params: z.infer<typeof CreateOrUpdateFileSchema>) {
  const content = Buffer.from(params.content).toString('base64');
  const body: any = {
    message: params.message,
    content,
    branch: params.branch,
  };
  
  if (params.sha) {
    body.sha = params.sha;
  }
  
  return await client.put(`/repos/${params.owner}/${params.repo}/contents/${params.path}`, body);
}

export async function deleteFile(client: GitHubClient, params: z.infer<typeof DeleteFileSchema>) {
  const body: any = {
    message: params.message,
    sha: params.sha,
  };
  
  if (params.branch) {
    body.branch = params.branch;
  }
  
  return await client.request(`/repos/${params.owner}/${params.repo}/contents/${params.path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function pushFiles(client: GitHubClient, params: z.infer<typeof PushFilesSchema>) {
  // Get the current commit SHA
  const refData = await client.get<any>(`/repos/${params.owner}/${params.repo}/git/ref/heads/${params.branch}`);
  const currentCommitSha = refData.object.sha;
  
  // Get the tree SHA
  const commitData = await client.get<any>(`/repos/${params.owner}/${params.repo}/git/commits/${currentCommitSha}`);
  const treeSha = commitData.tree.sha;
  
  // Create blobs for each file
  const tree = await Promise.all(
    params.files.map(async (file) => {
      const blob = await client.post<any>(`/repos/${params.owner}/${params.repo}/git/blobs`, {
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      });
      
      return {
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      };
    })
  );
  
  // Create new tree
  const newTree = await client.post<any>(`/repos/${params.owner}/${params.repo}/git/trees`, {
    base_tree: treeSha,
    tree,
  });
  
  // Create commit
  const newCommit = await client.post<any>(`/repos/${params.owner}/${params.repo}/git/commits`, {
    message: params.message,
    tree: newTree.sha,
    parents: [currentCommitSha],
  });
  
  // Update reference
  return await client.patch(`/repos/${params.owner}/${params.repo}/git/refs/heads/${params.branch}`, {
    sha: newCommit.sha,
    force: false,
  });
}
