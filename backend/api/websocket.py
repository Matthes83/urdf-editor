"""WebSocket handler for real-time editor updates."""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict
import json

from services.urdf_service import URDFService
from models.urdf_models import URDFRobot


class EditorSessionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_states: Dict[str, dict] = {}
        self.urdf_service = URDFService()

    async def connect(self, session_id: str, websocket: WebSocket):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[session_id] = websocket

        # Send current state if exists
        if session_id in self.session_states:
            await websocket.send_json({
                "type": "state_sync",
                "payload": self.session_states[session_id]
            })
        else:
            # Send empty initial state
            await websocket.send_json({
                "type": "state_sync",
                "payload": {
                    "name": "new_robot",
                    "links": [],
                    "joints": []
                }
            })

    def disconnect(self, session_id: str):
        """Handle WebSocket disconnection."""
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_message(self, session_id: str, message: dict):
        """Send a message to a specific session."""
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(message)

    async def broadcast(self, message: dict, exclude_session: str = None):
        """Broadcast a message to all connected sessions."""
        for session_id, websocket in self.active_connections.items():
            if session_id != exclude_session:
                await websocket.send_json(message)

    async def handle_message(self, session_id: str, data: dict):
        """Handle incoming WebSocket message."""
        msg_type = data.get("type")
        payload = data.get("payload")

        if msg_type == "state_update":
            # Store state
            self.session_states[session_id] = payload

            # Send acknowledgment
            await self.send_message(session_id, {
                "type": "state_ack",
                "payload": {"success": True}
            })

        elif msg_type == "validate":
            # Validate current state
            try:
                robot = URDFRobot(**payload)
                result = self.urdf_service.validate_urdf(robot)

                await self.send_message(session_id, {
                    "type": "validation_result",
                    "payload": {
                        "valid": result.valid,
                        "errors": result.errors,
                        "warnings": result.warnings
                    }
                })
            except Exception as e:
                await self.send_message(session_id, {
                    "type": "validation_result",
                    "payload": {
                        "valid": False,
                        "errors": [str(e)],
                        "warnings": []
                    }
                })

        elif msg_type == "export":
            # Export to URDF
            try:
                robot = URDFRobot(**payload)
                result = self.urdf_service.validate_urdf(robot)

                if not result.valid:
                    await self.send_message(session_id, {
                        "type": "export_result",
                        "payload": {
                            "success": False,
                            "errors": result.errors
                        }
                    })
                else:
                    xml = self.urdf_service.generate_urdf(robot)
                    await self.send_message(session_id, {
                        "type": "export_result",
                        "payload": {
                            "success": True,
                            "urdf": xml,
                            "warnings": result.warnings
                        }
                    })
            except Exception as e:
                await self.send_message(session_id, {
                    "type": "export_result",
                    "payload": {
                        "success": False,
                        "errors": [str(e)]
                    }
                })

        elif msg_type == "ping":
            await self.send_message(session_id, {
                "type": "pong",
                "payload": {}
            })


# Global session manager instance
session_manager = EditorSessionManager()
