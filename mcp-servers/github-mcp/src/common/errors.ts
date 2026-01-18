/**
 * Custom error classes for GitHub API interactions
 */

export class GitHubError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

export class GitHubValidationError extends GitHubError {
  constructor(message: string, response?: unknown) {
    super(message, 422, response);
    this.name = 'GitHubValidationError';
  }
}

export class GitHubResourceNotFoundError extends GitHubError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'GitHubResourceNotFoundError';
  }
}

export class GitHubAuthenticationError extends GitHubError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'GitHubAuthenticationError';
  }
}

export class GitHubPermissionError extends GitHubError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'GitHubPermissionError';
  }
}

export class GitHubRateLimitError extends GitHubError {
  constructor(
    message: string,
    public resetAt: Date
  ) {
    super(message, 429);
    this.name = 'GitHubRateLimitError';
  }
}

export class GitHubConflictError extends GitHubError {
  constructor(message: string, response?: unknown) {
    super(message, 409, response);
    this.name = 'GitHubConflictError';
  }
}

export function isGitHubError(error: unknown): error is GitHubError {
  return error instanceof GitHubError;
}
