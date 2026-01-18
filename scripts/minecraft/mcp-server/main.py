#!/usr/bin/env python3
"""
Main entry point for Minecraft Control Program (MCP) Server
Starts both REST API and WebSocket bridge
"""

import asyncio
import argparse
import sys
import logging
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from mcp_server import get_mcp_server
from websocket_bridge import BridgeManager
from api import app
import uvicorn

logger = logging.getLogger(__name__)


class MCPService:
    """
    Main MCP Service that coordinates all components
    """
    
    def __init__(
        self,
        api_host: str = "0.0.0.0",
        api_port: int = 8000,
        ws_host: str = "0.0.0.0",
        ws_port: int = 8765
    ):
        self.api_host = api_host
        self.api_port = api_port
        self.ws_host = ws_host
        self.ws_port = ws_port
        self.mcp_server = None
        self.bridge_manager = None
        
    async def start(self):
        """Start all MCP services"""
        logger.info("Starting Minecraft Control Program (MCP) Server...")
        
        # Initialize MCP server
        self.mcp_server = get_mcp_server()
        await self.mcp_server.start()
        
        # Initialize WebSocket bridge
        self.bridge_manager = BridgeManager(
            self.mcp_server.get_command_queue(),
            host=self.ws_host,
            port=self.ws_port
        )
        await self.bridge_manager.start()
        
        logger.info("=" * 60)
        logger.info("MCP Server Started Successfully!")
        logger.info("=" * 60)
        logger.info(f"REST API: http://{self.api_host}:{self.api_port}")
        logger.info(f"API Docs: http://{self.api_host}:{self.api_port}/docs")
        logger.info(f"WebSocket: ws://{self.ws_host}:{self.ws_port}")
        logger.info("=" * 60)
        
    async def stop(self):
        """Stop all MCP services"""
        logger.info("Stopping MCP Server...")
        
        if self.bridge_manager:
            await self.bridge_manager.stop()
        
        if self.mcp_server:
            await self.mcp_server.stop()
        
        logger.info("MCP Server stopped")


def run_service(
    api_host: str = "0.0.0.0",
    api_port: int = 8000,
    ws_host: str = "0.0.0.0",
    ws_port: int = 8765
):
    """
    Run the complete MCP service
    
    Args:
        api_host: Host for REST API
        api_port: Port for REST API
        ws_host: Host for WebSocket bridge
        ws_port: Port for WebSocket bridge
    """
    service = MCPService(api_host, api_port, ws_host, ws_port)
    
    # Configure uvicorn to use our startup/shutdown
    config = uvicorn.Config(
        app,
        host=api_host,
        port=api_port,
        log_level="info"
    )
    
    server = uvicorn.Server(config)
    
    # Run the server
    server.run()


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Minecraft Control Program (MCP) Server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Start with default settings
  python main.py
  
  # Start on specific port
  python main.py --api-port 8080
  
  # Start on localhost only
  python main.py --api-host 127.0.0.1 --ws-host 127.0.0.1
  
  # Custom configuration
  python main.py --api-host 0.0.0.0 --api-port 8000 --ws-port 8765
        """
    )
    
    parser.add_argument(
        '--api-host',
        default='0.0.0.0',
        help='Host for REST API (default: 0.0.0.0)'
    )
    
    parser.add_argument(
        '--api-port',
        type=int,
        default=8000,
        help='Port for REST API (default: 8000)'
    )
    
    parser.add_argument(
        '--ws-host',
        default='0.0.0.0',
        help='Host for WebSocket bridge (default: 0.0.0.0)'
    )
    
    parser.add_argument(
        '--ws-port',
        type=int,
        default=8765,
        help='Port for WebSocket bridge (default: 8765)'
    )
    
    parser.add_argument(
        '--log-level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        default='INFO',
        help='Logging level (default: INFO)'
    )
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Print banner
    print("\n" + "=" * 60)
    print(" " * 10 + "Minecraft Control Program (MCP) Server")
    print(" " * 15 + "Version 1.0.0")
    print("=" * 60 + "\n")
    
    # Run the service
    try:
        run_service(
            api_host=args.api_host,
            api_port=args.api_port,
            ws_host=args.ws_host,
            ws_port=args.ws_port
        )
    except KeyboardInterrupt:
        print("\n\nShutting down...")
    except Exception as e:
        logger.error(f"Error running service: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
