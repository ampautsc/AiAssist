# MCP Server Integration Template

This document provides a repeatable pattern for integrating external MCP servers into the AiAssist repository. Follow this template when adding new MCP servers from external sources.

## Overview

Model Context Protocol (MCP) servers extend AI assistant capabilities by providing access to external tools, data sources, and services. This template ensures consistent, well-documented, and maintainable integrations.

## Integration Checklist

Use this checklist for every new MCP server integration:

- [ ] **Research Phase**
  - [ ] Identify the MCP server repository
  - [ ] Review features and capabilities
  - [ ] Check license compatibility
  - [ ] Verify maintenance status
  - [ ] Review dependencies and requirements

- [ ] **Setup Phase**
  - [ ] Clone repository into `mcp-servers/<server-name>/`
  - [ ] Remove embedded `.git` directory
  - [ ] Create environment configuration files
  - [ ] Install dependencies

- [ ] **Build & Test Phase**
  - [ ] Build the server
  - [ ] Run unit tests
  - [ ] Run integration tests
  - [ ] Verify MCP protocol communication

- [ ] **Documentation Phase**
  - [ ] Create `INTEGRATION.md` in server directory
  - [ ] Document setup instructions
  - [ ] Document configuration options
  - [ ] Add usage examples
  - [ ] Document troubleshooting steps

- [ ] **Repository Integration Phase**
  - [ ] Update main `mcp-servers/README.md`
  - [ ] Add to `.gitignore` if needed
  - [ ] Create configuration examples
  - [ ] Document security considerations

- [ ] **Validation Phase**
  - [ ] Test with MCP Inspector
  - [ ] Verify all documented examples work
  - [ ] Check for security vulnerabilities
  - [ ] Review documentation completeness

## Step-by-Step Guide

### 1. Research the MCP Server

Before integration, gather information:

**Questions to Answer:**
- What problem does this server solve?
- What APIs/services does it integrate with?
- What are the authentication requirements?
- What is the implementation language?
- Are there any known issues or limitations?
- Is the project actively maintained?

**Documentation to Review:**
- Main README
- API documentation
- Configuration examples
- Issue tracker
- License file

### 2. Clone and Prepare

**Clone the repository:**
```bash
cd /path/to/AiAssist/mcp-servers
git clone <repository-url> <server-name>
cd <server-name>
```

**Remove embedded git history:**
```bash
rm -rf .git
```

**Create configuration templates:**
```bash
# If .env.example exists, copy it
cp .env.example .env

# Otherwise, create one from documentation
# Add placeholder values
```

### 3. Build the Server

The build process varies by language:

#### For TypeScript/Node.js Servers
```bash
npm install
npm run build
npm start  # Test startup
```

#### For Rust Servers
```bash
cargo build --release
./target/release/<binary-name> --help
```

#### For Python Servers
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m <module-name>
```

#### For Go Servers
```bash
go mod download
go build -o <binary-name>
./<binary-name> --help
```

### 4. Test the Server

**Run unit tests:**
```bash
# TypeScript
npm test

# Rust
cargo test --release

# Python
pytest

# Go
go test ./...
```

**Test MCP protocol communication:**
```bash
npx @modelcontextprotocol/inspector <command-to-start-server>
```

### 5. Create Integration Documentation

Create `INTEGRATION.md` in the server directory with these sections:

#### Required Sections

1. **Overview**
   - Brief description
   - Key features
   - Use cases

2. **Prerequisites**
   - System requirements
   - Required tools/languages
   - External accounts/credentials

3. **Setup Instructions**
   - Step-by-step installation
   - Configuration guide
   - Credential setup

4. **Running the Server**
   - Start commands
   - Common flags/options
   - Testing commands

5. **Configuration**
   - Environment variables table
   - MCP client configuration examples
   - Optional settings

6. **Available Tools**
   - List all MCP tools
   - Parameters for each tool
   - Usage examples

7. **Troubleshooting**
   - Common issues
   - Solutions
   - Debug tips

8. **Security Considerations**
   - Credential handling
   - API rate limits
   - Best practices

9. **Project Structure**
   - Directory layout
   - Key files description

10. **Resources**
    - Original repository link
    - API documentation
    - Related resources

### 6. Update Main Documentation

**Update `mcp-servers/README.md`:**

Add a section for the new server:

```markdown
### <Server Name>

**Location**: `<server-directory>/`

**Purpose**: <Brief description>

**Features**:
- Feature 1
- Feature 2
- Feature 3

**Quick Start**:
```bash
cd mcp-servers/<server-directory>
<build commands>
<run commands>
```

**Documentation**: See [<server-directory>/INTEGRATION.md](./<server-directory>/INTEGRATION.md)
```

### 7. Create Configuration Examples

**For Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "<path-to-executable>",
      "args": ["<arg1>", "<arg2>"],
      "env": {
        "API_KEY": "your-api-key",
        "OTHER_VAR": "value"
      }
    }
  }
}
```

**For Cline** (VS Code settings):

```json
{
  "mcp.servers": {
    "<server-name>": {
      "command": "<path-to-executable>",
      "args": ["<arg1>", "<arg2>"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

### 8. Security Review

Review and document:

- [ ] **Credentials Storage**: Never commit secrets
- [ ] **API Keys**: Use environment variables
- [ ] **Rate Limits**: Document API limits
- [ ] **Permissions**: Document required scopes
- [ ] **Network Access**: Document external connections
- [ ] **Data Handling**: Note any data storage/caching
- [ ] **Encryption**: Document encryption requirements
- [ ] **Dependencies**: Check for known vulnerabilities

### 9. Update .gitignore

Add entries to `.gitignore` if needed:

```gitignore
# MCP Server: <server-name>
mcp-servers/<server-name>/.env
mcp-servers/<server-name>/node_modules/
mcp-servers/<server-name>/target/
mcp-servers/<server-name>/venv/
mcp-servers/<server-name>/dist/
mcp-servers/<server-name>/build/
mcp-servers/<server-name>/*.log
```

### 10. Validate Integration

Final validation steps:

1. **Build from scratch**
   - Delete build artifacts
   - Rebuild completely
   - Verify no errors

2. **Test MCP protocol**
   - Use MCP Inspector
   - Test each tool
   - Verify responses

3. **Review documentation**
   - Follow your own setup guide
   - Test all examples
   - Fix any issues

4. **Security check**
   - Scan for exposed secrets
   - Verify .gitignore works
   - Check file permissions

## Language-Specific Considerations

### TypeScript/Node.js

**Build artifacts to ignore:**
- `node_modules/`
- `dist/` or `build/`
- `*.js` (if TypeScript)
- `*.d.ts`

**Testing:**
- Jest, Mocha, or Vitest
- Check `package.json` scripts

**Common issues:**
- Missing `@types/*` packages
- Node version mismatch
- TypeScript configuration

### Rust

**Build artifacts to ignore:**
- `target/`
- `Cargo.lock` (sometimes)

**Testing:**
- `cargo test`
- `cargo test --release`

**Common issues:**
- Missing system dependencies (OpenSSL, etc.)
- Rust version too old
- Platform-specific compilation

### Python

**Build artifacts to ignore:**
- `venv/` or `env/`
- `__pycache__/`
- `*.pyc`
- `.pytest_cache/`

**Testing:**
- pytest
- unittest
- Check `requirements-dev.txt`

**Common issues:**
- Python version mismatch
- Missing system packages
- Virtual environment not activated

### Go

**Build artifacts to ignore:**
- Compiled binaries
- `go.sum` (sometimes)

**Testing:**
- `go test ./...`
- `go test -v`

**Common issues:**
- Go module proxy issues
- CGO dependencies
- Cross-compilation needs

## Template Files

### INTEGRATION.md Template

```markdown
# <Server Name> - AiAssist Integration

## Overview
[Brief description]

## Features
- Feature 1
- Feature 2

## Prerequisites
- Tool 1
- Tool 2

## Setup Instructions

### Step 1: [Title]
[Instructions]

### Step 2: [Title]
[Instructions]

## Running the Server
[Commands and instructions]

## Configuration
[Environment variables and settings]

## Available MCP Tools
[Tool list with descriptions]

## Usage Examples
[Code examples]

## Troubleshooting
[Common issues and solutions]

## Security Considerations
[Security notes]

## Project Structure
[Directory tree]

## Resources
- [Original Repository](url)
- [Documentation](url)
```

## Best Practices

### Do's ✅

- **Document everything** - Future you will thank you
- **Test thoroughly** - Don't skip testing steps
- **Follow naming conventions** - Use kebab-case for directories
- **Keep it minimal** - Only commit necessary files
- **Secure credentials** - Never commit secrets
- **Update main docs** - Keep README.md current
- **Version information** - Note versions of dependencies
- **Provide examples** - Show actual usage

### Don'ts ❌

- **Don't commit .env files** - Use .env.example instead
- **Don't skip .gitignore** - Prevent committing build artifacts
- **Don't assume knowledge** - Document everything
- **Don't break existing integrations** - Test other servers still work
- **Don't ignore licenses** - Check compatibility
- **Don't hardcode paths** - Use relative paths
- **Don't skip security review** - Always check for vulnerabilities
- **Don't forget cleanup** - Remove test/temporary files

## Example: Gmail Calendar Integration

See `mcp-servers/gmailcal/INTEGRATION.md` for a complete example of this pattern in action. It demonstrates:

- Rust-based MCP server integration
- OAuth2 credential setup
- Multiple API integrations (Gmail, Calendar, Contacts)
- Comprehensive documentation
- Testing procedures
- Security considerations
- Troubleshooting guide

## Customization Points

When adapting this template:

1. **Adjust for language/framework** - Build and test commands vary
2. **API-specific setup** - OAuth, API keys, etc.
3. **Client configurations** - Adapt for specific MCP clients
4. **Testing approach** - May require live API access
5. **Security requirements** - Encryption, token management, etc.
6. **Documentation style** - Match existing patterns

## Validation Checklist

Before considering integration complete:

- [ ] Server builds without errors
- [ ] All tests pass (or failures are documented)
- [ ] MCP protocol works correctly
- [ ] Documentation is complete and accurate
- [ ] Examples work as written
- [ ] Security review completed
- [ ] .gitignore prevents unwanted commits
- [ ] Main README.md updated
- [ ] No secrets committed
- [ ] Integration tested end-to-end

## Maintenance

After integration:

- **Monitor updates** - Check original repository for updates
- **Security patches** - Apply critical updates promptly
- **Dependency updates** - Keep dependencies current
- **Documentation updates** - Keep docs in sync with changes
- **User feedback** - Incorporate improvements based on usage
- **Test regularly** - Verify integration still works

## Troubleshooting Integration Issues

### Build Failures

1. Check system dependencies
2. Verify language/runtime version
3. Clear build cache and retry
4. Review error messages carefully
5. Search original repository issues

### MCP Protocol Issues

1. Test with MCP Inspector
2. Check server stdout/stderr logs
3. Verify JSON-RPC format
4. Review MCP specification
5. Test with minimal configuration

### Documentation Issues

1. Test instructions on clean environment
2. Have someone else follow the guide
3. Fix any ambiguities
4. Add more examples
5. Clarify prerequisites

## Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP Server Examples](https://github.com/modelcontextprotocol/servers)
- [AiAssist MCP Servers](../mcp-servers/README.md)
- [Example Integration: Gmail Calendar](../mcp-servers/gmailcal/INTEGRATION.md)

## Contributing

When contributing new MCP server integrations:

1. Follow this template
2. Ensure all checklist items are complete
3. Test thoroughly
4. Document comprehensively
5. Submit a pull request with:
   - Clear description
   - Testing evidence
   - Updated documentation

---

**Last Updated**: 2026-01-18
**Template Version**: 1.0
**Maintainer**: AiAssist Team
