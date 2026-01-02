from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # Maps connection_id -> List[WebSocket]
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, connection_id: str):
        await websocket.accept()
        if connection_id not in self.active_connections:
            self.active_connections[connection_id] = []
        self.active_connections[connection_id].append(websocket)

    def disconnect(self, websocket: WebSocket, connection_id: str):
        if connection_id in self.active_connections:
            if websocket in self.active_connections[connection_id]:
                self.active_connections[connection_id].remove(websocket)
            if not self.active_connections[connection_id]:
                del self.active_connections[connection_id]

    async def broadcast(self, message: dict, connection_id: str, sender: WebSocket):
        if connection_id in self.active_connections:
            for connection in self.active_connections[connection_id]:
                if connection != sender:
                    await connection.send_json(message)


manager = ConnectionManager()


@router.websocket("/ws/meeting/{connection_id}")
async def websocket_endpoint(websocket: WebSocket, connection_id: str):
    await manager.connect(websocket, connection_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Relay the message to other participants in the room
            await manager.broadcast(data, connection_id, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, connection_id)
    except Exception as e:
        print(f"Error in websocket: {e}")
        manager.disconnect(websocket, connection_id)
