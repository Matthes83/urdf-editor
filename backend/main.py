"""FastAPI application entry point for URDF Editor backend."""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uuid

from api.routes import urdf_router, links_router, joints_router
from api.websocket import session_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    print("URDF Editor Backend starting...")
    yield
    print("URDF Editor Backend shutting down...")


app = FastAPI(
    title="URDF Editor API",
    description="Backend API for the web-based URDF robot model editor",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(urdf_router, prefix="/api")
app.include_router(links_router, prefix="/api")
app.include_router(joints_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "URDF Editor API",
        "version": "1.0.0",
        "docs": "/docs",
        "openapi": "/openapi.json"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.websocket("/ws")
async def websocket_endpoint_auto(websocket: WebSocket):
    """WebSocket endpoint with auto-generated session ID."""
    session_id = str(uuid.uuid4())
    await session_manager.connect(session_id, websocket)

    # Send session ID to client
    await websocket.send_json({
        "type": "session_init",
        "payload": {"session_id": session_id}
    })

    try:
        while True:
            data = await websocket.receive_json()
            await session_manager.handle_message(session_id, data)
    except WebSocketDisconnect:
        session_manager.disconnect(session_id)


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint with specified session ID."""
    await session_manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            await session_manager.handle_message(session_id, data)
    except WebSocketDisconnect:
        session_manager.disconnect(session_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
