import {
  GitHubError,
  GitHubValidationError,
  GitHubResourceNotFoundError,
  GitHubAuthenticationError,
  GitHubPermissionError,
  GitHubRateLimitError,
  GitHubConflictError,
} from './errors.js';

const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubOptions {
  token?: string;
  baseUrl?: string;
}

export class GitHubClient {
  private token: string;
  private baseUrl: string;

  constructor(options: GitHubOptions = {}) {
    this.token = options.token || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || '';
    this.baseUrl = options.baseUrl || GITHUB_API_BASE;

    if (!this.token) {
      throw new Error('GitHub token is required. Set GITHUB_PERSONAL_ACCESS_TOKEN environment variable.');
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${this.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'AiAssist-GitHub-MCP-Server/1.0',
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const remaining = response.headers.get('X-RateLimit-Remaining');
    const resetTime = response.headers.get('X-RateLimit-Reset');

    // Handle rate limiting
    if (response.status === 429) {
      const resetAt = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date();
      throw new GitHubRateLimitError(
        `Rate limit exceeded. Resets at ${resetAt.toISOString()}`,
        resetAt
      );
    }

    // Handle authentication errors
    if (response.status === 401) {
      throw new GitHubAuthenticationError('Authentication failed. Check your GitHub token.');
    }

    // Handle permission errors
    if (response.status === 403) {
      const body = await response.json().catch(() => ({}));
      throw new GitHubPermissionError(
        (body as any).message || 'Permission denied. Token may lack required scopes.'
      );
    }

    // Handle not found errors
    if (response.status === 404) {
      throw new GitHubResourceNotFoundError('Resource not found.');
    }

    // Handle conflict errors
    if (response.status === 409) {
      const body = await response.json().catch(() => ({}));
      throw new GitHubConflictError(
        (body as any).message || 'Conflict occurred.',
        body
      );
    }

    // Handle validation errors
    if (response.status === 422) {
      const body = await response.json().catch(() => ({}));
      throw new GitHubValidationError(
        (body as any).message || 'Validation failed.',
        body
      );
    }

    // Handle other errors
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new GitHubError(
        (body as any).message || `Request failed with status ${response.status}`,
        response.status,
        body
      );
    }

    // Handle no content responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
