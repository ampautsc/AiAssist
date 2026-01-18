# Minecraft Control Program (MCP) Server

A Python-based control system for Minecraft Bedrock Edition world management. The MCP provides programmatic control over a running Minecraft instance through REST APIs and WebSocket communication.

## 🎯 Overview

The Minecraft Control Program (MCP) enables:
- **World Management**: Place, remove, and modify blocks programmatically
- **Area Operations**: Fill, clone, and destroy dynamic areas
- **Command Execution**: Run Minecraft commands via REST API
- **Behavior Pack Integration**: Framework for loading and managing behavior packs
- **Real-time Communication**: WebSocket bridge for live game interaction

## 🏗️ Architecture

```
MCP System Architecture:

┌─────────────────┐         ┌──────────────────┐
│   REST API      │◄────────┤  Python Client   │
│  (FastAPI)      │         │  or Web App      │
└────────┬────────┘         └──────────────────┘
         │
         ▼
┌─────────────────┐         ┌──────────────────┐
│  MCP Server     │◄───────►│ Command Queue    │
│  (Core Logic)   │         │  & History       │
└────────┬────────┘         └──────────────────┘
         │
         ▼
┌─────────────────┐
│ WebSocket       │
│ Bridge          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐         ┌──────────────────┐
│  Minecraft      │◄───────►│  Behavior Pack   │
│  Bedrock        │         │  (Scripting API) │
└─────────────────┘         └──────────────────┘
```

## 📋 Features

### 1. Block Operations
- Place blocks at specific coordinates with block type and data values
- Remove blocks by setting them to air
- Support for all Minecraft block types with namespace identifiers

### 2. Area Manipulation
- **Fill**: Fill areas with specific block types
- **Clone**: Copy areas to new locations
- **Destroy**: Clear areas by filling with air
- Multiple fill modes: replace, destroy, keep, hollow, outline

### 3. Command Execution
- Execute any Minecraft command programmatically
- Commands include: `/fill`, `/setblock`, `/tp`, `/give`, etc.
- Command history tracking with timestamps

### 4. Behavior Pack Framework
- Template behavior pack with Minecraft Scripting API integration
- WebSocket communication between pack and MCP server
- Helper functions for common operations
- Extensible structure for custom behaviors

## 🚀 Installation

### Prerequisites
- Python 3.8 or higher
- Minecraft Bedrock Edition
- pip (Python package manager)

### Steps

1. **Clone the repository** (if not already cloned):
```bash
cd /path/to/AiAssist
```

2. **Install Python dependencies**:
```bash
cd scripts/minecraft/mcp-server
pip install -r requirements.txt
```

3. **Verify installation**:
```bash
python -c "import fastapi, uvicorn, websockets; print('Dependencies installed successfully!')"
```

## 🎮 Usage

### Starting the MCP Server

#### Option 1: Run the REST API Server
```bash
cd scripts/minecraft/mcp-server
python api.py
```

The server will start on `http://localhost:8000`

#### Option 2: Run with custom host/port
```bash
python -c "from api import run_server; run_server(host='0.0.0.0', port=8080)"
```

### Using the REST API

#### Interactive API Documentation
Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

#### Example: Place a Block
```bash
curl -X POST "http://localhost:8000/api/v1/place_block" \
  -H "Content-Type: application/json" \
  -d '{
    "block_type": "minecraft:diamond_block",
    "position": {"x": 100, "y": 64, "z": 100},
    "data_value": 0
  }'
```

#### Example: Fill an Area
```bash
curl -X POST "http://localhost:8000/api/v1/fill_area" \
  -H "Content-Type: application/json" \
  -d '{
    "from_pos": {"x": 0, "y": 64, "z": 0},
    "to_pos": {"x": 10, "y": 64, "z": 10},
    "block_type": "minecraft:stone",
    "fill_mode": "replace"
  }'
```

#### Example: Execute Command
```bash
curl -X POST "http://localhost:8000/api/v1/execute_command" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "say Hello from MCP!"
  }'
```

### Using the Python Client

See `examples.py` for comprehensive usage examples:

```bash
python examples.py
```

Or use the client in your own scripts:

```python
from examples import MCPClient

client = MCPClient("http://localhost:8000")

# Place a block
client.place_block("minecraft:gold_block", 100, 64, 100)

# Fill an area
client.fill_area(0, 64, 0, 5, 68, 5, "minecraft:stone")

# Execute command
client.execute_command("time set day")
```

## 📦 Behavior Pack Integration

### Installing the MCP Control Pack

1. **Locate the behavior pack template**:
```
scripts/minecraft/mcp-server/behavior-pack-template/
```

2. **Copy to Minecraft's behavior pack folder**:

**Windows**:
```bash
xcopy behavior-pack-template "%LocalAppData%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\behavior_packs\MCP_Control_Pack\" /E /I
```

**iOS/Android**: Use file manager to copy to Minecraft's behavior pack directory

3. **Enable in Minecraft**:
   - Create a new world or edit existing world
   - Go to "Behavior Packs"
   - Select "MCP Control Pack"
   - Activate the pack

### Behavior Pack Features

The MCP Control Pack includes:

- **WebSocket Communication**: Connects to MCP server for real-time commands
- **Command Execution**: Executes commands received from MCP
- **Helper Functions**: Pre-built functions for common operations
- **Event Handlers**: Responds to world events
- **Chat Commands**: Manual testing via in-game chat

#### In-Game Chat Commands

While in Minecraft with the pack enabled:

```
!mcp status          - Show MCP connection status
!mcp say Hello       - Queue a command manually
```

## 🔧 Configuration

### Server Configuration

Edit `api.py` to configure:

```python
# Host and port
run_server(host="0.0.0.0", port=8000)

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Restrict origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### WebSocket Bridge Configuration

Edit `websocket_bridge.py` to configure:

```python
# WebSocket server settings
bridge = MinecraftWebSocketBridge(
    host="0.0.0.0",
    port=8765
)
```

### Behavior Pack Configuration

Edit `behavior-pack-template/scripts/main.js`:

```javascript
// Connection settings
const MCP_WEBSOCKET_URL = 'ws://localhost:8765';
const MCP_REST_API_URL = 'http://localhost:8000';
const RECONNECT_DELAY = 5000; // milliseconds
```

## 📚 API Reference

### Endpoints

#### `GET /`
Root endpoint with API information

#### `GET /health`
Health check endpoint

#### `POST /api/v1/place_block`
Place a block at specified coordinates

**Request Body**:
```json
{
  "block_type": "minecraft:stone",
  "position": {"x": 0, "y": 64, "z": 0},
  "data_value": 0
}
```

#### `POST /api/v1/remove_block`
Remove a block at specified coordinates

**Request Body**:
```json
{
  "position": {"x": 0, "y": 64, "z": 0}
}
```

#### `POST /api/v1/fill_area`
Fill an area with blocks

**Request Body**:
```json
{
  "from_pos": {"x": 0, "y": 64, "z": 0},
  "to_pos": {"x": 10, "y": 64, "z": 10},
  "block_type": "minecraft:stone",
  "fill_mode": "replace"
}
```

Fill modes: `replace`, `destroy`, `keep`, `hollow`, `outline`

#### `POST /api/v1/clone_area`
Clone an area to new location

**Request Body**:
```json
{
  "from_pos": {"x": 0, "y": 64, "z": 0},
  "to_pos": {"x": 10, "y": 64, "z": 10},
  "destination": {"x": 20, "y": 64, "z": 20},
  "clone_mode": "replace"
}
```

Clone modes: `replace`, `masked`, `filtered`

#### `POST /api/v1/execute_command`
Execute raw Minecraft command

**Request Body**:
```json
{
  "command": "say Hello, World!"
}
```

#### `GET /api/v1/command_history?limit=50`
Get recent command history

**Query Parameters**:
- `limit`: Number of commands to retrieve (max 100)

## 🧪 Testing

### Manual Testing

1. Start the MCP server:
```bash
python api.py
```

2. In another terminal, run the examples:
```bash
python examples.py
```

3. Check the Minecraft world for changes

### API Testing with curl

```bash
# Health check
curl http://localhost:8000/health

# Place a block
curl -X POST http://localhost:8000/api/v1/place_block \
  -H "Content-Type: application/json" \
  -d '{"block_type":"minecraft:diamond_block","position":{"x":0,"y":100,"z":0},"data_value":0}'

# Get command history
curl http://localhost:8000/api/v1/command_history?limit=10
```

## 🔒 Security Considerations

⚠️ **Important Security Notes**:

1. **Network Exposure**: By default, the server binds to `0.0.0.0`, making it accessible from any network interface. For production:
   - Use `127.0.0.1` for localhost-only access
   - Implement authentication/authorization
   - Use HTTPS/WSS for encrypted communication

2. **Command Validation**: The server accepts any Minecraft command. Consider:
   - Whitelisting allowed commands
   - Rate limiting
   - User permissions system

3. **CORS Configuration**: Restrict allowed origins in production

4. **Behavior Pack**: The pack has access to world manipulation. Review and audit the code before deployment.

## 🚧 Limitations

1. **WebSocket Integration**: Full WebSocket integration requires:
   - Minecraft Bedrock Edition with scripting enabled
   - Beta features enabled in world settings
   - Behavior pack properly installed and activated

2. **Command Execution**: Some commands may require:
   - Specific game modes or cheats enabled
   - Operator permissions
   - Beta features activated

3. **Performance**: Large area operations may:
   - Take time to complete
   - Impact game performance
   - Have size limits based on Minecraft version

## 🛠️ Development

### Project Structure

```
mcp-server/
├── __init__.py              # Package initialization
├── mcp_server.py            # Core MCP server logic
├── api.py                   # REST API with FastAPI
├── websocket_bridge.py      # WebSocket communication bridge
├── examples.py              # Usage examples
├── requirements.txt         # Python dependencies
├── README.md                # This file
└── behavior-pack-template/  # Minecraft behavior pack
    ├── manifest.json        # Pack manifest
    └── scripts/
        ├── main.js          # Main pack script
        └── helpers.js       # Helper functions
```

### Extending the MCP

#### Adding New Endpoints

Edit `api.py`:

```python
@app.post("/api/v1/my_custom_endpoint")
async def my_custom_endpoint(request: MyRequest):
    mcp = get_mcp_server()
    world_manager = mcp.get_world_manager()
    
    # Your custom logic here
    command_id = await world_manager.execute_command("...")
    
    return {"command_id": command_id}
```

#### Adding New World Operations

Edit `mcp_server.py`:

```python
class MinecraftWorldManager:
    async def my_custom_operation(self, ...):
        command = "..."
        metadata = {...}
        return await self.command_queue.add_command(command, metadata)
```

#### Extending the Behavior Pack

Edit `behavior-pack-template/scripts/helpers.js`:

```javascript
export function myCustomFunction(params) {
    // Your custom Minecraft logic
}
```

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

1. **Authentication System**: Add user authentication and authorization
2. **WebSocket Client**: Complete WebSocket client implementation
3. **Entity Management**: Add entity creation and manipulation
4. **Player Management**: Add player tracking and interaction
5. **World Queries**: Add endpoints to query world state
6. **Persistent Storage**: Save and load command sequences
7. **Batch Operations**: Support for batch command execution
8. **Event System**: Webhook/callback system for world events

## 📄 License

This project is part of the AiAssist repository. See the main repository LICENSE file.

## 📞 Support

For issues, questions, or contributions:
1. Check existing documentation
2. Review examples in `examples.py`
3. Test with interactive API docs at `/docs`
4. Create an issue in the repository

## 🎯 Roadmap

### Current Features (v1.0)
- ✅ REST API for world management
- ✅ Block placement and removal
- ✅ Area fill, clone, and destroy operations
- ✅ Command execution
- ✅ Command history tracking
- ✅ Behavior pack template
- ✅ WebSocket bridge framework

### Planned Features
- 🔄 Full WebSocket integration with Minecraft
- 🔄 Entity management (spawn, remove, modify)
- 🔄 Player management (teleport, inventory, effects)
- 🔄 World queries (get block, find entities, etc.)
- 🔄 Authentication and authorization
- 🔄 Persistent command sequences
- 🔄 Real-time world event notifications
- 🔄 Web-based control panel UI

## 📖 Additional Resources

- [Minecraft Bedrock Scripting API](https://learn.microsoft.com/minecraft/creator/scriptapi/)
- [Minecraft Commands Reference](https://minecraft.wiki/w/Commands)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [WebSocket Protocol](https://websockets.readthedocs.io/)

---

**Built with ❤️ for Minecraft automation and programmatic world control**
