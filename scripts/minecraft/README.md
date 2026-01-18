# Minecraft Automation Scripts

This directory contains automation tools and control programs for Minecraft Bedrock Edition.

## Contents

### 🎮 MCP Server (`mcp-server/`)
**Minecraft Control Program for World Management**

A complete Python-based control system for programmatic world management in Minecraft Bedrock Edition.

**Features:**
- REST API for block operations, area manipulation, and command execution
- WebSocket bridge for real-time communication
- Behavior pack integration with Scripting API
- Python client library with examples
- Pack manager for behavior pack deployment

**Quick Start:**
```bash
cd mcp-server
pip install -r requirements.txt
python main.py
```

**Documentation:**
- [README.md](mcp-server/README.md) - Full documentation
- [QUICKSTART.md](mcp-server/QUICKSTART.md) - 5-minute quick start
- [IMPLEMENTATION_SUMMARY.md](mcp-server/IMPLEMENTATION_SUMMARY.md) - Technical details

**API Endpoints:**
- `POST /api/v1/place_block` - Place blocks
- `POST /api/v1/fill_area` - Fill areas
- `POST /api/v1/execute_command` - Run commands
- Interactive docs: http://localhost:8000/docs

---

### 🔐 Authentication (`auth.py`)
Microsoft/Xbox Live authentication module for Minecraft Realm API access.

**Features:**
- Microsoft OAuth flow
- Xbox Live authentication
- Minecraft services token generation

**Usage:**
```python
from auth import MinecraftAuth

auth = MinecraftAuth(username, password)
tokens = auth.authenticate()
```

---

### 🌍 Realm API (`realm_api.py`)
Minecraft Bedrock Realms API client for uploading worlds and deploying packs.

**Features:**
- Upload world files (.mcworld)
- Deploy resource packs (.mcpack)
- Deploy behavior packs (.mcpack)
- Deploy addons (.mcaddon)
- List and manage realms

**Usage:**
```python
from realm_api import RealmAPI

api = RealmAPI(access_token)
realms = api.get_realms()
api.upload_world(realm_id, "world.mcworld")
api.deploy_behavior_pack(realm_id, "pack.mcpack")
```

**CLI:**
```bash
python realm_api.py --realm-name "My Realm" --world-file world.mcworld
```

---

## Dependencies

### MCP Server
```bash
pip install -r mcp-server/requirements.txt
```

### Authentication & Realm API
```bash
pip install -r requirements.txt
```

## Use Cases

### 1. Programmatic World Building
Use the MCP server to build structures, modify terrain, and create worlds programmatically:

```python
from mcp_server.examples import MCPClient

client = MCPClient()
client.fill_area(0, 64, 0, 100, 64, 100, "minecraft:stone")  # Platform
client.fill_area(10, 65, 10, 20, 80, 20, "minecraft:glass", "hollow")  # Tower
```

### 2. Automated Realm Deployment
Deploy worlds and packs to Minecraft Realms via GitHub Actions or scripts:

```bash
# Authenticate
export MINECRAFT_USERNAME="your@email.com"
export MINECRAFT_PASSWORD="your_password"
python auth.py

# Deploy to realm
python realm_api.py \
  --realm-name "My Realm" \
  --world-file custom_world.mcworld \
  --behavior-pack custom_pack.mcpack
```

### 3. Interactive World Control
Control your Minecraft world in real-time via REST API:

```bash
# Start MCP server
cd mcp-server && python main.py

# Send commands
curl -X POST http://localhost:8000/api/v1/execute_command \
  -d '{"command":"say Hello, World!"}'
```

### 4. Behavior Pack Development
Develop and test behavior packs with the MCP Control Pack:

```bash
cd mcp-server
python pack_manager.py copy-template --name "My Pack"
python pack_manager.py install --name "My Pack"
```

## Architecture

```
Minecraft Automation Scripts
├── MCP Server (World Management)
│   ├── REST API (FastAPI)
│   ├── WebSocket Bridge
│   ├── Behavior Pack Template
│   └── Pack Manager
│
├── Authentication (Microsoft/Xbox)
│   └── OAuth Token Generation
│
└── Realm API (World/Pack Deployment)
    └── Realm Management
```

## Security Considerations

### MCP Server
- Binds to 0.0.0.0 by default (use 127.0.0.1 for localhost-only)
- No authentication in v1.0 (add for production)
- CORS allows all origins (restrict for production)
- Review behavior pack code before deployment

### Authentication
- Never commit credentials to repository
- Use environment variables or secrets management
- Current OAuth implementation is a placeholder (see auth.py for production options)
- Consider using refresh tokens for automation

### Realm API
- Requires valid Minecraft account with realm access
- API tokens should be securely stored
- Rate limiting may apply

## Project Structure

```
scripts/minecraft/
├── mcp-server/                    # MCP World Management System
│   ├── mcp_server.py             # Core server logic
│   ├── api.py                    # REST API endpoints
│   ├── websocket_bridge.py       # WebSocket communication
│   ├── pack_manager.py           # Behavior pack manager
│   ├── examples.py               # Usage examples
│   ├── main.py                   # Main entry point
│   ├── behavior-pack-template/   # Behavior pack template
│   │   ├── manifest.json
│   │   └── scripts/
│   │       ├── main.js           # Pack script
│   │       └── helpers.js        # Helper functions
│   └── README.md                 # Full documentation
│
├── auth.py                       # Microsoft/Xbox authentication
├── realm_api.py                  # Minecraft Realm API client
├── requirements.txt              # Python dependencies
└── README.md                     # This file
```

## Examples

### Example 1: Build a Castle
```python
from mcp_server.examples import MCPClient

client = MCPClient()

# Foundation
client.fill_area(0, 64, 0, 50, 64, 50, "minecraft:stone")

# Walls
client.fill_area(0, 65, 0, 50, 85, 50, "minecraft:stone_bricks", "hollow")

# Towers at corners
for x, z in [(0, 0), (0, 50), (50, 0), (50, 50)]:
    client.fill_area(x, 65, z, x+5, 95, z+5, "minecraft:stone_bricks", "hollow")
```

### Example 2: Automated World Updates
```python
import schedule
from mcp_server.examples import MCPClient

client = MCPClient()

def daily_reset():
    # Reset spawn area
    client.fill_area(-10, 64, -10, 10, 84, 10, "minecraft:air")
    client.fill_area(-10, 64, -10, 10, 64, 10, "minecraft:grass")
    client.execute_command("say Daily reset complete!")

schedule.every().day.at("00:00").do(daily_reset)
```

### Example 3: Deploy to Realm
```bash
#!/bin/bash
# deploy_to_realm.sh

# Authenticate
python auth.py

# Create world backup
python -c "
from realm_api import RealmAPI
import json

with open('/tmp/minecraft_tokens.json') as f:
    tokens = json.load(f)

api = RealmAPI(tokens['access_token'])
realm = api.get_realm_by_name('My Realm')
api.upload_world(realm['id'], 'worlds/survival_world.mcworld')
"
```

## Troubleshooting

### MCP Server Won't Start
- Check if port 8000 is already in use: `python main.py --api-port 8080`
- Verify dependencies: `pip install -r mcp-server/requirements.txt`
- Check logs for detailed error messages

### Authentication Fails
- Verify credentials are correct
- Check if 2FA is enabled (use app password if needed)
- Review placeholder implementation notes in auth.py
- Consider implementing proper OAuth flow for production

### Can't Connect to Minecraft
- Ensure behavior pack is installed and enabled
- Enable "Beta APIs" in world experimental features
- Check WebSocket port is not blocked by firewall
- Verify MCP server is running

### Realm API Errors
- Ensure account has realm access and proper permissions
- Check that realm name matches exactly (case-sensitive)
- Verify token hasn't expired (re-authenticate if needed)

## Contributing

Contributions are welcome! Areas for improvement:

### MCP Server
- Complete WebSocket integration with Minecraft
- Add entity and player management
- Implement authentication system
- Create web UI for control panel

### Authentication
- Implement proper OAuth device code flow
- Add refresh token support
- Support for service principals

### Realm API
- Add more realm management features
- Implement world backup/download
- Support for realm configuration

## Resources

- [Minecraft Bedrock Scripting API](https://learn.microsoft.com/minecraft/creator/scriptapi/)
- [Minecraft Commands Reference](https://minecraft.wiki/w/Commands)
- [Minecraft Realms Documentation](https://help.minecraft.net/hc/en-us/sections/12617701472653-Minecraft-Realms)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Model Context Protocol](https://github.com/modelcontextprotocol)

## License

This project is part of the AiAssist repository. See the main repository LICENSE file.

---

**Built for Minecraft automation, world management, and programmatic control** 🎮✨
