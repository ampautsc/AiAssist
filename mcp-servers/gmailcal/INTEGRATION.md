# Gmail & Calendar MCP Server - AiAssist Integration

This directory contains the Gmail & Calendar MCP Server integrated from the [2389-research/gmailcal-mcp-rs](https://github.com/2389-research/gmailcal-mcp-rs) repository.

## Overview

The Gmail & Calendar MCP Server provides a Model Context Protocol interface for interacting with Gmail, Google Calendar, and Google Contacts APIs. This integration demonstrates a repeatable pattern for incorporating external MCP servers into the AiAssist ecosystem.

## Features

### Gmail API Integration
- 📬 List emails from inbox
- 🔍 Search emails using Gmail queries
- 📑 Get email details
- 📊 Analyze emails (tasks, meetings, contacts)
- 📋 Batch email analysis
- 🏷️ List email labels
- 📡 Check API connection status

### Google Calendar Integration
- 📅 List available calendars
- 🗓️ Retrieve calendar events
- 🎯 Get event details
- 📝 Create new events

### Google Contacts Integration
- 👤 List contacts
- 🔎 Search contacts by name/email
- 📇 Get detailed contact information

## Setup Instructions

### Prerequisites

1. **Rust Toolchain** (version 1.70+)
   - Already installed in this environment
   - Verify: `rustc --version`

2. **Google Cloud Project with OAuth2 Credentials**
   - Required for API access
   - See [OAuth2 Setup Guide](#oauth2-setup-guide) below

### Installation

1. **Navigate to the server directory:**
   ```bash
   cd /home/runner/work/AiAssist/AiAssist/mcp-servers/gmailcal
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your OAuth2 credentials
   ```

3. **Build the server:**
   ```bash
   cargo build --release
   ```

4. **Verify the build:**
   ```bash
   ./target/release/mcp-gmailcal --version
   ```

## OAuth2 Setup Guide

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### Step 2: Enable Required APIs

Enable the following APIs in your Google Cloud Project:
- Gmail API
- Google Calendar API
- Google People API (for Contacts)

Navigate to: **APIs & Services > Library** and search for each API.

### Step 3: Create OAuth2 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Desktop app** as application type
4. Name it (e.g., "AiAssist Gmail MCP")
5. Download the credentials JSON file

### Step 4: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Select **External** user type (unless you have a Workspace)
3. Fill in required fields:
   - App name
   - User support email
   - Developer contact information
4. Add the following scopes:
   - `https://mail.google.com/` (Gmail full access)
   - `https://www.googleapis.com/auth/calendar` (Calendar read/write)
   - `https://www.googleapis.com/auth/calendar.readonly` (Calendar read-only)
   - `https://www.googleapis.com/auth/contacts.readonly` (Contacts read-only)

### Step 5: Obtain Refresh Token

**Option A: Using the built-in auth flow (Recommended)**

```bash
cd /home/runner/work/AiAssist/AiAssist/mcp-servers/gmailcal

# Set your credentials first
export GMAIL_CLIENT_ID="your-client-id"
export GMAIL_CLIENT_SECRET="your-client-secret"

# Run the auth flow
cargo run --release -- auth

# This will:
# 1. Open a browser for OAuth2 authorization
# 2. Request all required scopes
# 3. Save the tokens to your .env file
```

**Option B: Using Google OAuth 2.0 Playground**

1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) and check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. Select the required scopes (Gmail, Calendar, Contacts)
5. Click "Authorize APIs" and follow the prompts
6. Exchange authorization code for tokens
7. Copy the **Refresh Token** from the response

### Step 6: Update .env File

Edit `/home/runner/work/AiAssist/AiAssist/mcp-servers/gmailcal/.env`:

```bash
# Gmail API OAuth2 credentials
GMAIL_CLIENT_ID=your-actual-client-id
GMAIL_CLIENT_SECRET=your-actual-client-secret
GMAIL_REFRESH_TOKEN=your-actual-refresh-token

# Optional OAuth2 settings
# GMAIL_REDIRECT_URI=http://localhost:8080
# GMAIL_ACCESS_TOKEN=your-access-token  # Auto-refreshed if refresh token is set
```

## Running the Server

### Start the MCP Server

```bash
cd /home/runner/work/AiAssist/AiAssist/mcp-servers/gmailcal
cargo run --release
```

### Test Mode (Verify Credentials)

```bash
cd /home/runner/work/AiAssist/AiAssist/mcp-servers/gmailcal
cargo run --release -- test
```

This will:
- Load credentials from .env
- Test Gmail API connection
- Test Calendar API connection
- Test Contacts API connection
- Report success or errors

### Memory-Only Mode (No File Logging)

For read-only environments (e.g., Claude AI):

```bash
cargo run --release -- --memory-only
```

## Testing

### Run All Tests

```bash
cd /home/runner/work/AiAssist/AiAssist/mcp-servers/gmailcal
cargo test --release
```

### Run Specific Test Suites

```bash
# Library tests only
cargo test --lib

# Integration tests
cargo test --test integration_tests

# Token cache tests
cargo test --test token_cache_tests
```

**Note:** Some tests require valid OAuth2 credentials. Tests that don't have credentials will be skipped or ignored.

### MCP Protocol Testing

Use the MCP Inspector tool:

```bash
cd /home/runner/work/AiAssist/AiAssist/mcp-servers/gmailcal
npx @modelcontextprotocol/inspector cargo run --release
```

This opens an interactive UI for testing MCP tools.

## Configuration

### Environment Variables

The server reads configuration from `.env` file or environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `GMAIL_CLIENT_ID` | Yes | OAuth2 Client ID from Google Cloud Console |
| `GMAIL_CLIENT_SECRET` | Yes | OAuth2 Client Secret |
| `GMAIL_REFRESH_TOKEN` | Yes | OAuth2 Refresh Token |
| `GMAIL_ACCESS_TOKEN` | No | OAuth2 Access Token (auto-refreshed) |
| `GMAIL_REDIRECT_URI` | No | OAuth2 redirect URI (default: `http://localhost:8080`) |
| `TOKEN_CACHE_ENABLED` | No | Enable token caching (default: `true`) |
| `TOKEN_CACHE_ENCRYPTION_KEY` | No | 32-byte hex key for encrypting cached tokens |

### MCP Client Configuration

To use this server with MCP-compatible clients (e.g., Claude Desktop, Cline):

**For Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "gmailcal": {
      "command": "/home/runner/work/AiAssist/AiAssist/mcp-servers/gmailcal/target/release/mcp-gmailcal",
      "args": ["--memory-only"],
      "env": {
        "GMAIL_CLIENT_ID": "your-client-id",
        "GMAIL_CLIENT_SECRET": "your-client-secret",
        "GMAIL_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

**For Cline** (in VS Code settings):

```json
{
  "mcp.servers": {
    "gmailcal": {
      "command": "/home/runner/work/AiAssist/AiAssist/mcp-servers/gmailcal/target/release/mcp-gmailcal",
      "args": ["--memory-only"],
      "env": {
        "GMAIL_CLIENT_ID": "your-client-id",
        "GMAIL_CLIENT_SECRET": "your-client-secret",
        "GMAIL_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

## Available MCP Tools

Once connected, the following tools are available through the MCP protocol:

### Email Tools
- `check_connection` - Verify Gmail API connection
- `list_emails` - List recent emails (with filters)
- `search_emails` - Search using Gmail query syntax
- `get_email` - Get details of a specific email
- `analyze_email` - Extract tasks, meetings, contacts from an email
- `batch_analyze_emails` - Analyze multiple emails at once
- `list_labels` - List all Gmail labels

### Calendar Tools
- `list_calendars` - List all available calendars
- `list_events` - List events from a calendar (with date filters)
- `get_event` - Get details of a specific event
- `create_event` - Create a new calendar event

### Contact Tools
- `list_contacts` - List contacts from Google Contacts
- `search_contacts` - Search contacts by name/email/organization
- `get_contact` - Get detailed information about a contact

## Usage Examples

### Example 1: List Recent Emails

Through an MCP client:
```
/tool list_emails max_results=10
```

### Example 2: Search for Specific Emails

```
/tool search_emails query="from:example.com after:2024/01/01" max_results=5
```

### Example 3: Analyze Email for Tasks

```
/tool analyze_email message_id="18c1eab45a2d0123" analysis_type="tasks"
```

### Example 4: Create a Calendar Event

```
/tool create_event summary="Team Meeting" description="Weekly sync" start_time="2024-04-10T14:00:00Z" end_time="2024-04-10T15:00:00Z" attendees=["person@example.com"]
```

### Example 5: Search Contacts

```
/tool search_contacts query="John" max_results=5
```

## Troubleshooting

### Build Issues

**Problem:** Compilation errors during `cargo build`

**Solution:**
- Ensure Rust toolchain is up to date: `rustup update`
- Clear build artifacts: `cargo clean`
- Rebuild: `cargo build --release`

### Authentication Issues

**Problem:** "Invalid credentials" or "Unauthorized" errors

**Solution:**
1. Verify OAuth2 credentials in `.env` file
2. Ensure all required APIs are enabled in Google Cloud Console
3. Check that OAuth consent screen has the required scopes
4. Re-run the auth flow: `cargo run -- auth`

**Problem:** "Refresh token expired"

**Solution:**
- Refresh tokens can expire if not used for 6 months (for external user type)
- Re-run the OAuth flow to get a new refresh token
- Consider publishing your app to avoid expiration

### Runtime Issues

**Problem:** "Permission denied" when accessing files

**Solution:**
- Use `--memory-only` flag for read-only environments
- Ensure proper file permissions on the project directory

**Problem:** Tests failing with environment variable errors

**Solution:**
- Tests expect specific test values, not real credentials
- This is expected behavior when using placeholder credentials
- Integration tests require valid credentials to pass fully

## API Rate Limits

Be aware of Google API rate limits:

- **Gmail API**: 250 quota units per second per user
- **Calendar API**: 1,000 requests per 100 seconds per user
- **People API (Contacts)**: 600 requests per minute per user

The server implements automatic rate limiting and retries with exponential backoff.

## Security Considerations

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use environment variables** in production environments
3. **Enable token caching with encryption** for additional security
4. **Rotate credentials regularly** as a security best practice
5. **Use least-privilege scopes** - only request what you need
6. **Monitor API usage** through Google Cloud Console

## Project Structure

```
gmailcal/
├── src/
│   ├── lib.rs              # Main library exports
│   ├── main.rs             # CLI entry point
│   ├── auth.rs             # OAuth2 authentication flow
│   ├── calendar_api.rs     # Google Calendar API client
│   ├── cli.rs              # Command-line interface
│   ├── config.rs           # Configuration handling
│   ├── errors.rs           # Error types
│   ├── gmail_api.rs        # Gmail API client
│   ├── logging.rs          # Logging setup
│   ├── oauth.rs            # OAuth token management
│   ├── people_api.rs       # Google People API (Contacts)
│   ├── prompts.rs          # Email analysis prompts
│   ├── server.rs           # MCP server implementation
│   ├── token_cache.rs      # Token caching with encryption
│   └── utils.rs            # Utility functions
├── tests/                  # Integration tests
├── benches/                # Performance benchmarks
├── Cargo.toml              # Rust dependencies
├── .env.example            # Environment variable template
├── .gitignore              # Git ignore rules
├── README.md               # Original project README
└── INTEGRATION.md          # This file - AiAssist integration guide
```

## Integration Pattern Summary

This integration demonstrates a repeatable pattern for incorporating external MCP servers:

1. **Clone** the external repository into `mcp-servers/`
2. **Remove** the embedded `.git` directory to treat as regular files
3. **Build** using the project's native toolchain (Rust in this case)
4. **Test** to ensure functionality
5. **Document** setup, configuration, and usage
6. **Configure** for MCP clients
7. **Verify** integration with MCP Inspector

This pattern can be adapted for other MCP servers regardless of implementation language (TypeScript, Python, Go, etc.).

## Resources

- [Original Repository](https://github.com/2389-research/gmailcal-mcp-rs)
- [Google Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [Google People API Documentation](https://developers.google.com/people)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Rust Documentation](https://doc.rust-lang.org/)

## Support

For issues specific to this integration:
- Check this INTEGRATION.md document
- Review the main AiAssist repository documentation
- Create an issue in the AiAssist repository

For issues with the gmailcal-mcp-rs server itself:
- Check the original repository's README.md
- Review issues at https://github.com/2389-research/gmailcal-mcp-rs/issues
- Refer to the original project documentation

## License

This integration inherits the license from both:
- The AiAssist repository (parent project)
- The gmailcal-mcp-rs project (MIT License)

See the respective LICENSE files for details.
