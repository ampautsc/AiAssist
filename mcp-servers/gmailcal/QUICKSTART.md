# Gmail & Calendar MCP Server - Quick Start Guide

This guide will help you get the Gmail & Calendar MCP Server up and running in under 15 minutes.

## Prerequisites Check

Before starting, ensure you have:
- ✅ Rust installed (check with `rustc --version`)
- ✅ A Google account
- ✅ 15 minutes to complete setup

## Step 1: Google Cloud Setup (5 minutes)

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "NEW PROJECT"
3. Name it: `AiAssist-Gmail-MCP`
4. Click "CREATE"

### 1.2 Enable Required APIs

In the Google Cloud Console:
1. Navigate to **APIs & Services** → **Library**
2. Search and enable these three APIs:
   - **Gmail API**
   - **Google Calendar API**
   - **Google People API**

### 1.3 Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure the consent screen first (see below)
4. Select **Desktop app** as the application type
5. Name it: `AiAssist Desktop Client`
6. Click **CREATE**
7. A dialog appears with your **Client ID** and **Client Secret**
8. Click **OK** (we'll copy these values in Step 2)

### 1.4 Configure OAuth Consent Screen (if needed)

If you need to configure the consent screen:
1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have a Workspace account)
3. Fill required fields:
   - App name: `AiAssist Gmail MCP`
   - User support email: Your email
   - Developer contact: Your email
4. Click **SAVE AND CONTINUE**
5. Add scopes (click **ADD OR REMOVE SCOPES**):
   - `https://mail.google.com/`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/contacts.readonly`
6. Click **UPDATE** → **SAVE AND CONTINUE**
7. Add yourself as a test user
8. Click **SAVE AND CONTINUE** → **BACK TO DASHBOARD**

## Step 2: Configure the MCP Server (3 minutes)

### 2.1 Navigate to the Server Directory

```bash
cd /home/runner/work/AiAssist/AiAssist/mcp-servers/gmailcal
```

### 2.2 Create .env File

```bash
cp .env.example .env
```

### 2.3 Add Your OAuth2 Credentials

1. Go back to Google Cloud Console → **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID
3. Click the download icon (⬇️) or copy the values

Edit `.env` file:
```bash
nano .env  # or use your preferred editor
```

Add your credentials:
```bash
GMAIL_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-actual-client-secret
GMAIL_REFRESH_TOKEN=placeholder-will-be-generated
```

Save and exit (Ctrl+X, then Y, then Enter in nano).

## Step 3: Get Refresh Token (3 minutes)

### 3.1 Run the OAuth Flow

The server includes a built-in authentication flow:

```bash
# Ensure your .env has CLIENT_ID and CLIENT_SECRET set
cargo run --release -- auth
```

### 3.2 Complete Authorization

The command will:
1. Open your default browser
2. Ask you to sign in to Google
3. Request permissions for Gmail, Calendar, and Contacts
4. Show a success page with your refresh token

### 3.3 Token Saved Automatically

The refresh token is automatically saved to your `.env` file. You don't need to copy it manually!

## Step 4: Build the Server (2 minutes)

```bash
cargo build --release
```

This compiles the server in optimized mode. The first build takes about 1-2 minutes.

## Step 5: Test the Server (2 minutes)

### 5.1 Quick Connection Test

```bash
./target/release/mcp-gmailcal test
```

This command:
- Verifies your credentials
- Tests Gmail API connection
- Tests Calendar API connection
- Tests Contacts API connection

You should see:
```
✓ Gmail API: Connected
✓ Calendar API: Connected
✓ Contacts API: Connected
All tests passed!
```

### 5.2 Start the Server

```bash
./target/release/mcp-gmailcal
```

The server should start and wait for MCP protocol messages via stdin/stdout.

Press Ctrl+C to stop the server.

## Step 6: Test with MCP Inspector (Optional)

To interactively test the server:

```bash
npx @modelcontextprotocol/inspector cargo run --release
```

This opens a web UI where you can:
- See all available tools
- Test each tool with parameters
- View responses

## Quick Verification Checklist

✅ **Google Cloud Project** created
✅ **APIs enabled**: Gmail, Calendar, People
✅ **OAuth credentials** created
✅ **.env file** configured with credentials
✅ **Refresh token** obtained via auth flow
✅ **Server built** successfully
✅ **Connection test** passes
✅ **Server starts** without errors

## Next Steps

### Configure with Claude Desktop

Edit your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration:

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

Restart Claude Desktop, and you should see the Gmail/Calendar tools available!

### Try These Commands in Claude

Once connected:
- "Check my recent emails"
- "What's on my calendar this week?"
- "Search my contacts for John"
- "Analyze my unread emails for action items"
- "Create a calendar event for tomorrow at 2pm"

## Troubleshooting

### "Invalid credentials" error

**Solution**: 
1. Double-check CLIENT_ID and CLIENT_SECRET in `.env`
2. Ensure you completed the OAuth flow: `cargo run -- auth`
3. Verify the refresh token was saved to `.env`

### "API not enabled" error

**Solution**:
1. Go to Google Cloud Console
2. Navigate to **APIs & Services** → **Library**
3. Enable the missing API (Gmail, Calendar, or People)

### "Access denied" error

**Solution**:
1. Check OAuth consent screen configuration
2. Ensure all required scopes are added
3. Add yourself as a test user
4. Re-run the OAuth flow: `cargo run -- auth`

### Browser doesn't open during auth

**Solution**:
1. The auth flow will print a URL
2. Manually copy and paste the URL into your browser
3. Complete the authorization
4. The token will still be saved

### Build fails with OpenSSL error

**Solution**:
```bash
# Ubuntu/Debian
sudo apt-get install pkg-config libssl-dev

# macOS (with Homebrew)
brew install openssl
export OPENSSL_DIR=$(brew --prefix openssl)

# Then rebuild
cargo clean
cargo build --release
```

## Common Questions

**Q: Do I need to re-authenticate often?**
A: No. The refresh token lasts indefinitely as long as you use it at least once every 6 months (for external users).

**Q: Can I use this with multiple Google accounts?**
A: Yes, but you'll need separate configurations with different credentials for each account.

**Q: Is my data secure?**
A: Yes. All communication uses OAuth2, tokens are stored locally in your `.env` file, and the server only has the permissions you grant.

**Q: What if I want read-only access?**
A: Modify the OAuth consent screen to only include read-only scopes like `https://www.googleapis.com/auth/calendar.readonly`.

**Q: Can I revoke access?**
A: Yes. Go to [Google Account Permissions](https://myaccount.google.com/permissions) and revoke access to the "AiAssist Gmail MCP" app.

## Success!

You now have a fully functional Gmail & Calendar MCP server! 🎉

For more advanced usage, see:
- [INTEGRATION.md](./INTEGRATION.md) - Complete documentation
- [../docs/mcp-integration-template.md](../../docs/mcp-integration-template.md) - Integration patterns

## Getting Help

- **Integration issues**: Check [INTEGRATION.md](./INTEGRATION.md)
- **Original project**: [github.com/2389-research/gmailcal-mcp-rs](https://github.com/2389-research/gmailcal-mcp-rs)
- **MCP protocol**: [modelcontextprotocol.io](https://modelcontextprotocol.io/)
