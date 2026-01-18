#!/usr/bin/env python3
"""
REST API for Minecraft Control Program (MCP)
Provides HTTP endpoints for world management operations
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
import uvicorn
import asyncio

from .mcp_server import (
    get_mcp_server,
    BlockPosition,
    BlockData,
    AreaData
)

# Initialize FastAPI app
app = FastAPI(
    title="Minecraft Control Program (MCP) API",
    description="REST API for Minecraft Bedrock Edition world management",
    version="1.0.0"
)

# Add CORS middleware for web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for request/response validation
class Position(BaseModel):
    """3D position model"""
    x: int = Field(..., description="X coordinate")
    y: int = Field(..., ge=-64, le=320, description="Y coordinate (height)")
    z: int = Field(..., description="Z coordinate")


class PlaceBlockRequest(BaseModel):
    """Request model for placing a block"""
    block_type: str = Field(
        ..., 
        description="Block type identifier (e.g., 'minecraft:stone')",
        example="minecraft:stone"
    )
    position: Position = Field(..., description="Position to place the block")
    data_value: int = Field(0, ge=0, le=15, description="Block data value")
    
    @validator('block_type')
    def validate_block_type(cls, v):
        if not v or ':' not in v:
            raise ValueError('Block type must include namespace (e.g., minecraft:stone)')
        return v


class RemoveBlockRequest(BaseModel):
    """Request model for removing a block"""
    position: Position = Field(..., description="Position of block to remove")


class FillAreaRequest(BaseModel):
    """Request model for filling an area"""
    from_pos: Position = Field(..., description="Starting corner of the area")
    to_pos: Position = Field(..., description="Ending corner of the area")
    block_type: str = Field(
        ...,
        description="Block type to fill with",
        example="minecraft:stone"
    )
    fill_mode: str = Field(
        "replace",
        description="Fill mode: replace, destroy, keep, hollow, outline"
    )
    
    @validator('fill_mode')
    def validate_fill_mode(cls, v):
        valid_modes = ['replace', 'destroy', 'keep', 'hollow', 'outline']
        if v not in valid_modes:
            raise ValueError(f'Fill mode must be one of: {", ".join(valid_modes)}')
        return v


class CloneAreaRequest(BaseModel):
    """Request model for cloning an area"""
    from_pos: Position = Field(..., description="Starting corner of source area")
    to_pos: Position = Field(..., description="Ending corner of source area")
    destination: Position = Field(..., description="Destination position")
    clone_mode: str = Field(
        "replace",
        description="Clone mode: replace, masked, filtered"
    )
    
    @validator('clone_mode')
    def validate_clone_mode(cls, v):
        valid_modes = ['replace', 'masked', 'filtered']
        if v not in valid_modes:
            raise ValueError(f'Clone mode must be one of: {", ".join(valid_modes)}')
        return v


class ExecuteCommandRequest(BaseModel):
    """Request model for executing a raw command"""
    command: str = Field(
        ...,
        description="Minecraft command to execute (without leading slash)",
        example="say Hello, World!"
    )


class CommandResponse(BaseModel):
    """Response model for command operations"""
    success: bool
    command_id: str
    message: str
    timestamp: str


class HistoryResponse(BaseModel):
    """Response model for command history"""
    commands: List[Dict[str, Any]]
    total: int


# Helper function to convert Position to BlockPosition
def to_block_position(pos: Position) -> BlockPosition:
    """Convert API Position to internal BlockPosition"""
    return BlockPosition(x=pos.x, y=pos.y, z=pos.z)


# API Endpoints
@app.get("/", tags=["General"])
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Minecraft Control Program (MCP) API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "place_block": "/api/v1/place_block",
            "remove_block": "/api/v1/remove_block",
            "fill_area": "/api/v1/fill_area",
            "clone_area": "/api/v1/clone_area",
            "destroy_area": "/api/v1/destroy_area",
            "execute_command": "/api/v1/execute_command",
            "command_history": "/api/v1/command_history",
            "health": "/health",
            "docs": "/docs"
        }
    }


@app.get("/health", tags=["General"])
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "mcp-server"}


@app.post(
    "/api/v1/place_block",
    response_model=CommandResponse,
    tags=["World Management"]
)
async def place_block(request: PlaceBlockRequest):
    """
    Place a block at specified coordinates
    
    - **block_type**: Block identifier with namespace (e.g., minecraft:stone)
    - **position**: 3D coordinates (x, y, z)
    - **data_value**: Block variant/state value (0-15)
    """
    try:
        mcp = get_mcp_server()
        world_manager = mcp.get_world_manager()
        
        command_id = await world_manager.place_block(
            block_type=request.block_type,
            position=to_block_position(request.position),
            data_value=request.data_value
        )
        
        return CommandResponse(
            success=True,
            command_id=command_id,
            message=f"Block placement command queued: {request.block_type} at {request.position.dict()}",
            timestamp=command_id.split('_')[1]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to place block: {str(e)}"
        )


@app.post(
    "/api/v1/remove_block",
    response_model=CommandResponse,
    tags=["World Management"]
)
async def remove_block(request: RemoveBlockRequest):
    """
    Remove a block at specified coordinates
    
    - **position**: 3D coordinates (x, y, z) of the block to remove
    """
    try:
        mcp = get_mcp_server()
        world_manager = mcp.get_world_manager()
        
        command_id = await world_manager.remove_block(
            position=to_block_position(request.position)
        )
        
        return CommandResponse(
            success=True,
            command_id=command_id,
            message=f"Block removal command queued at {request.position.dict()}",
            timestamp=command_id.split('_')[1]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove block: {str(e)}"
        )


@app.post(
    "/api/v1/fill_area",
    response_model=CommandResponse,
    tags=["World Management"]
)
async def fill_area(request: FillAreaRequest):
    """
    Fill an area with specified block type
    
    - **from_pos**: Starting corner of the area
    - **to_pos**: Ending corner of the area
    - **block_type**: Block type to fill with
    - **fill_mode**: How to fill (replace, destroy, keep, hollow, outline)
    """
    try:
        mcp = get_mcp_server()
        world_manager = mcp.get_world_manager()
        
        command_id = await world_manager.fill_area(
            from_pos=to_block_position(request.from_pos),
            to_pos=to_block_position(request.to_pos),
            block_type=request.block_type,
            fill_mode=request.fill_mode
        )
        
        return CommandResponse(
            success=True,
            command_id=command_id,
            message=f"Area fill command queued: {request.block_type} from {request.from_pos.dict()} to {request.to_pos.dict()}",
            timestamp=command_id.split('_')[1]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fill area: {str(e)}"
        )


@app.post(
    "/api/v1/clone_area",
    response_model=CommandResponse,
    tags=["World Management"]
)
async def clone_area(request: CloneAreaRequest):
    """
    Clone an area to a new location
    
    - **from_pos**: Starting corner of source area
    - **to_pos**: Ending corner of source area
    - **destination**: Destination position
    - **clone_mode**: How to clone (replace, masked, filtered)
    """
    try:
        mcp = get_mcp_server()
        world_manager = mcp.get_world_manager()
        
        command_id = await world_manager.clone_area(
            from_pos=to_block_position(request.from_pos),
            to_pos=to_block_position(request.to_pos),
            destination=to_block_position(request.destination),
            clone_mode=request.clone_mode
        )
        
        return CommandResponse(
            success=True,
            command_id=command_id,
            message=f"Area clone command queued from {request.from_pos.dict()} to {request.destination.dict()}",
            timestamp=command_id.split('_')[1]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clone area: {str(e)}"
        )


@app.post(
    "/api/v1/destroy_area",
    response_model=CommandResponse,
    tags=["World Management"]
)
async def destroy_area(from_pos: Position, to_pos: Position):
    """
    Destroy (clear) an area by filling it with air
    
    - **from_pos**: Starting corner of the area
    - **to_pos**: Ending corner of the area
    """
    try:
        mcp = get_mcp_server()
        world_manager = mcp.get_world_manager()
        
        command_id = await world_manager.destroy_area(
            from_pos=to_block_position(from_pos),
            to_pos=to_block_position(to_pos)
        )
        
        return CommandResponse(
            success=True,
            command_id=command_id,
            message=f"Area destroy command queued from {from_pos.dict()} to {to_pos.dict()}",
            timestamp=command_id.split('_')[1]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to destroy area: {str(e)}"
        )


@app.post(
    "/api/v1/execute_command",
    response_model=CommandResponse,
    tags=["Command Execution"]
)
async def execute_command(request: ExecuteCommandRequest):
    """
    Execute a raw Minecraft command
    
    - **command**: Minecraft command without leading slash
    
    Examples:
    - "say Hello, World!"
    - "tp @p 0 100 0"
    - "give @p diamond 64"
    """
    try:
        mcp = get_mcp_server()
        world_manager = mcp.get_world_manager()
        
        command_id = await world_manager.execute_command(request.command)
        
        return CommandResponse(
            success=True,
            command_id=command_id,
            message=f"Command queued: {request.command}",
            timestamp=command_id.split('_')[1]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute command: {str(e)}"
        )


@app.get(
    "/api/v1/command_history",
    response_model=HistoryResponse,
    tags=["Command Execution"]
)
async def get_command_history(limit: int = 50):
    """
    Get recent command history
    
    - **limit**: Number of recent commands to retrieve (max 100)
    """
    try:
        if limit > 100:
            limit = 100
        
        mcp = get_mcp_server()
        command_queue = mcp.get_command_queue()
        
        history = command_queue.get_history(limit)
        
        return HistoryResponse(
            commands=history,
            total=len(history)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve command history: {str(e)}"
        )


@app.on_event("startup")
async def startup_event():
    """Initialize MCP server on startup"""
    mcp = get_mcp_server()
    await mcp.start()


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown"""
    mcp = get_mcp_server()
    await mcp.stop()


def run_server(host: str = "0.0.0.0", port: int = 8000):
    """
    Run the FastAPI server
    
    Args:
        host: Host to bind to
        port: Port to listen on
    """
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_server()
