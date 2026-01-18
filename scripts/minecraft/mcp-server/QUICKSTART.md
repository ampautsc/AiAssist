# Minecraft Control Program (MCP) - Quick Start Guide

Get up and running with the Minecraft Control Program in 5 minutes!

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd scripts/minecraft/mcp-server
pip install -r requirements.txt
```

### 2. Start the MCP Server

```bash
python main.py
```

You should see:
```
============================================================
          Minecraft Control Program (MCP) Server
               Version 1.0.0
============================================================

REST API: http://0.0.0.0:8000
API Docs: http://0.0.0.0:8000/docs
WebSocket: ws://0.0.0.0:8765
============================================================
```

### 3. Test the API

Open your browser to: **http://localhost:8000/docs**

Or test with curl:

```bash
curl http://localhost:8000/health
```

### 4. Try Examples

In another terminal:

```bash
cd scripts/minecraft/mcp-server
python examples.py
```

## 📦 Install the Behavior Pack (Optional)

To connect Minecraft to the MCP:

### Windows:

1. Copy the behavior pack:
```bash
xcopy behavior-pack-template "%LocalAppData%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\behavior_packs\MCP_Control_Pack\" /E /I
```

2. Open Minecraft Bedrock Edition
3. Create a new world or edit existing
4. Go to "Behavior Packs"
5. Enable "MCP Control Pack"
6. Enable "Beta APIs" in experimental features

### Using Pack Manager:

```bash
python pack_manager.py copy-template --name "My MCP Pack"
python pack_manager.py install --name "My MCP Pack"
```

## 🎮 Basic Usage

### Python Client

```python
from examples import MCPClient

client = MCPClient("http://localhost:8000")

# Place a diamond block
client.place_block("minecraft:diamond_block", 100, 64, 100)

# Build a platform
client.fill_area(0, 64, 0, 10, 64, 10, "minecraft:stone")

# Say hello in chat
client.execute_command("say Hello from MCP!")
```

### curl Commands

```bash
# Place a block
curl -X POST http://localhost:8000/api/v1/place_block \
  -H "Content-Type: application/json" \
  -d '{"block_type":"minecraft:gold_block","position":{"x":0,"y":100,"z":0}}'

# Execute command
curl -X POST http://localhost:8000/api/v1/execute_command \
  -H "Content-Type: application/json" \
  -d '{"command":"time set day"}'
```

## 📚 Next Steps

1. **Explore the API**: Visit http://localhost:8000/docs
2. **Read the full README**: See [README.md](README.md)
3. **Run examples**: Check out `examples.py` for more usage patterns
4. **Customize behavior pack**: Modify `behavior-pack-template/scripts/main.js`

## ❓ Troubleshooting

### Port already in use
```bash
python main.py --api-port 8080
```

### Can't connect to server
- Make sure the server is running
- Check firewall settings
- Try `127.0.0.1` instead of `localhost`

### Behavior pack not working
- Enable "Beta APIs" in world experimental features
- Check pack is enabled in world settings
- View game logs for errors

## 🔗 Resources

- Full documentation: [README.md](README.md)
- API reference: http://localhost:8000/docs
- Examples: [examples.py](examples.py)
- Pack manager: [pack_manager.py](pack_manager.py)

---

**Ready to automate Minecraft? Start building!** 🎮✨
