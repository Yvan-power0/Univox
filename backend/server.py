from fastapi import FastAPI, HTTPException, Request, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict
import pymongo
import os
import uuid
import socketio
import asyncio
from datetime import datetime, timedelta
import requests
import json
from motor.motor_asyncio import AsyncIOMotorClient

# FastAPI app setup
app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO setup
sio = socketio.AsyncServer(cors_allowed_origins="*", async_mode="asgi")
socket_app = socketio.ASGIApp(sio, app)

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users_collection = db.users
friends_collection = db.friends
messages_collection = db.messages
sessions_collection = db.sessions

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    pass

manager = ConnectionManager()

# Pydantic models
class UserProfile(BaseModel):
    username: str
    email: str
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = ""
    age: Optional[int] = None
    country: Optional[str] = ""
    interests: Optional[str] = ""

class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    reply_to: Optional[str] = None

class FriendRequest(BaseModel):
    friend_id: str

class MessageReaction(BaseModel):
    message_id: str
    emoji: str

# Helper functions
async def get_user_from_session(session_id: str):
    if not session_id:
        return None
    
    session = await sessions_collection.find_one({"session_id": session_id})
    if not session:
        return None
    
    if session.get("expires_at") and session["expires_at"] < datetime.utcnow():
        await sessions_collection.delete_one({"session_id": session_id})
        return None
    
    user = await users_collection.find_one({"user_id": session["user_id"]})
    return user

async def create_session(user_data: dict):
    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    await sessions_collection.insert_one({
        "session_id": session_id,
        "user_id": user_data["user_id"],
        "expires_at": expires_at
    })
    
    return session_id

# Auth endpoints
@app.get("/api/auth/profile")
async def get_profile(x_session_id: str = Header(None)):
    if not x_session_id:
        # Emergent auth flow - get session data
        try:
            headers = {"X-Session-ID": x_session_id}
            response = requests.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", headers=headers)
            
            if response.status_code == 200:
                auth_data = response.json()
                
                # Check if user exists
                existing_user = await users_collection.find_one({"email": auth_data["email"]})
                
                if not existing_user:
                    # Create new user
                    user_data = {
                        "user_id": str(uuid.uuid4()),
                        "email": auth_data["email"],
                        "name": auth_data["name"],
                        "username": auth_data["name"].replace(" ", "_").lower(),
                        "picture": auth_data.get("picture", ""),
                        "bio": "",
                        "age": None,
                        "country": "",
                        "interests": "",
                        "created_at": datetime.utcnow(),
                        "friends_count": 0
                    }
                    await users_collection.insert_one(user_data)
                else:
                    user_data = existing_user
                
                # Create session
                session_id = await create_session(user_data)
                
                return {
                    "user": user_data,
                    "session_token": session_id
                }
        except:
            pass
        
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await get_user_from_session(x_session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    return {"user": user}

# User endpoints
@app.put("/api/user/profile")
async def update_profile(profile: UserProfile, x_session_id: str = Header(None)):
    user = await get_user_from_session(x_session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    update_data = {
        "username": profile.username,
        "name": profile.name,
        "picture": profile.picture,
        "bio": profile.bio,
        "age": profile.age,
        "country": profile.country,
        "interests": profile.interests
    }
    
    await users_collection.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_data}
    )
    
    updated_user = await users_collection.find_one({"user_id": user["user_id"]})
    return {"user": updated_user}

@app.get("/api/users/search")
async def search_users(q: str, x_session_id: str = Header(None)):
    user = await get_user_from_session(x_session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Search users by username or name
    users = await users_collection.find({
        "$and": [
            {"user_id": {"$ne": user["user_id"]}},
            {
                "$or": [
                    {"username": {"$regex": q, "$options": "i"}},
                    {"name": {"$regex": q, "$options": "i"}}
                ]
            }
        ]
    }).limit(10).to_list(10)
    
    return {"users": users}

# Friends endpoints
@app.post("/api/friends/request")
async def send_friend_request(request: FriendRequest, x_session_id: str = Header(None)):
    user = await get_user_from_session(x_session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Check if user already has 5 friends
    friend_count = await friends_collection.count_documents({
        "$or": [
            {"user_id": user["user_id"], "status": "accepted"},
            {"friend_id": user["user_id"], "status": "accepted"}
        ]
    })
    
    if friend_count >= 5:
        raise HTTPException(status_code=400, detail="You can only have 5 friends maximum")
    
    # Check if friend exists
    friend = await users_collection.find_one({"user_id": request.friend_id})
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if friend already has 5 friends
    friend_count = await friends_collection.count_documents({
        "$or": [
            {"user_id": request.friend_id, "status": "accepted"},
            {"friend_id": request.friend_id, "status": "accepted"}
        ]
    })
    
    if friend_count >= 5:
        raise HTTPException(status_code=400, detail="This user already has 5 friends")
    
    # Check if request already exists
    existing = await friends_collection.find_one({
        "$or": [
            {"user_id": user["user_id"], "friend_id": request.friend_id},
            {"user_id": request.friend_id, "friend_id": user["user_id"]}
        ]
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Friend request already exists")
    
    # Create friend request
    friend_request = {
        "request_id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "friend_id": request.friend_id,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    await friends_collection.insert_one(friend_request)
    
    # Notify friend via WebSocket
    await manager.send_personal_message({
        "type": "friend_request",
        "from": user,
        "request_id": friend_request["request_id"]
    }, request.friend_id)
    
    return {"message": "Friend request sent"}

@app.put("/api/friends/request/{request_id}")
async def respond_friend_request(request_id: str, action: str, x_session_id: str = Header(None)):
    user = await get_user_from_session(x_session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    if action not in ["accept", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    friend_request = await friends_collection.find_one({
        "request_id": request_id,
        "friend_id": user["user_id"],
        "status": "pending"
    })
    
    if not friend_request:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if action == "accept":
        await friends_collection.update_one(
            {"request_id": request_id},
            {"$set": {"status": "accepted"}}
        )
        
        # Update friends count
        await users_collection.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"friends_count": 1}}
        )
        await users_collection.update_one(
            {"user_id": friend_request["user_id"]},
            {"$inc": {"friends_count": 1}}
        )
        
        # Notify requester
        await manager.send_personal_message({
            "type": "friend_accepted",
            "from": user
        }, friend_request["user_id"])
        
    else:
        await friends_collection.delete_one({"request_id": request_id})
        
        # Notify requester
        await manager.send_personal_message({
            "type": "friend_rejected",
            "from": user
        }, friend_request["user_id"])
    
    return {"message": f"Friend request {action}ed"}

@app.get("/api/friends")
async def get_friends(x_session_id: str = Header(None)):
    user = await get_user_from_session(x_session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Get accepted friends
    friends = await friends_collection.find({
        "$or": [
            {"user_id": user["user_id"], "status": "accepted"},
            {"friend_id": user["user_id"], "status": "accepted"}
        ]
    }).to_list(5)
    
    friend_ids = []
    for friend in friends:
        if friend["user_id"] == user["user_id"]:
            friend_ids.append(friend["friend_id"])
        else:
            friend_ids.append(friend["user_id"])
    
    # Get friend details
    friend_users = await users_collection.find({
        "user_id": {"$in": friend_ids}
    }).to_list(5)
    
    # Get pending requests
    pending_requests = await friends_collection.find({
        "friend_id": user["user_id"],
        "status": "pending"
    }).to_list(10)
    
    request_users = []
    if pending_requests:
        request_user_ids = [req["user_id"] for req in pending_requests]
        request_users = await users_collection.find({
            "user_id": {"$in": request_user_ids}
        }).to_list(10)
        
        for i, req_user in enumerate(request_users):
            req_user["request_id"] = pending_requests[i]["request_id"]
    
    return {
        "friends": friend_users,
        "pending_requests": request_users
    }

@app.delete("/api/friends/{friend_id}")
async def remove_friend(friend_id: str, x_session_id: str = Header(None)):
    user = await get_user_from_session(x_session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    result = await friends_collection.delete_one({
        "$or": [
            {"user_id": user["user_id"], "friend_id": friend_id, "status": "accepted"},
            {"user_id": friend_id, "friend_id": user["user_id"], "status": "accepted"}
        ]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    # Update friends count
    await users_collection.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"friends_count": -1}}
    )
    await users_collection.update_one(
        {"user_id": friend_id},
        {"$inc": {"friends_count": -1}}
    )
    
    return {"message": "Friend removed"}

# Messages endpoints
@app.get("/api/messages")
async def get_messages(x_session_id: str = Header(None)):
    user = await get_user_from_session(x_session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Get last 10 messages
    messages = await messages_collection.find({}).sort("created_at", -1).limit(10).to_list(10)
    messages.reverse()  # Show oldest first
    
    # Get user details for each message
    user_ids = list(set([msg["user_id"] for msg in messages]))
    message_users = await users_collection.find({
        "user_id": {"$in": user_ids}
    }).to_list(len(user_ids))
    
    user_map = {u["user_id"]: u for u in message_users}
    
    for msg in messages:
        msg["user"] = user_map.get(msg["user_id"], {})
    
    return {"messages": messages}

@app.post("/api/messages")
async def send_message(message: MessageCreate, x_session_id: str = Header(None)):
    user = await get_user_from_session(x_session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Clean old messages (keep only last 10)
    message_count = await messages_collection.count_documents({})
    if message_count >= 10:
        # Get oldest messages to delete
        old_messages = await messages_collection.find({}).sort("created_at", 1).limit(message_count - 9).to_list(message_count - 9)
        old_ids = [msg["_id"] for msg in old_messages]
        await messages_collection.delete_many({"_id": {"$in": old_ids}})
    
    # Create new message
    new_message = {
        "message_id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "content": message.content,
        "message_type": message.message_type,
        "reply_to": message.reply_to,
        "reactions": {},
        "pinned": False,
        "created_at": datetime.utcnow()
    }
    
    await messages_collection.insert_one(new_message)
    
    # Add user info
    new_message["user"] = user
    
    # Broadcast to all connected users
    for user_id in manager.active_connections:
        await manager.send_personal_message({
            "type": "new_message",
            "message": new_message
        }, user_id)
    
    return {"message": new_message}

@app.post("/api/messages/{message_id}/reaction")
async def add_reaction(message_id: str, reaction: MessageReaction, x_session_id: str = Header(None)):
    user = await get_user_from_session(x_session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Add reaction to message
    await messages_collection.update_one(
        {"message_id": message_id},
        {"$set": {f"reactions.{user['user_id']}": reaction.emoji}}
    )
    
    # Broadcast reaction update
    updated_message = await messages_collection.find_one({"message_id": message_id})
    if updated_message:
        for user_id in manager.active_connections:
            await manager.send_personal_message({
                "type": "reaction_update",
                "message_id": message_id,
                "reactions": updated_message["reactions"]
            }, user_id)
    
    return {"message": "Reaction added"}

@app.delete("/api/messages/{message_id}")
async def delete_message(message_id: str, x_session_id: str = Header(None)):
    user = await get_user_from_session(x_session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Check if user owns the message
    message = await messages_collection.find_one({"message_id": message_id, "user_id": user["user_id"]})
    if not message:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")
    
    await messages_collection.delete_one({"message_id": message_id})
    
    # Broadcast deletion
    for user_id in manager.active_connections:
        await manager.send_personal_message({
            "type": "message_deleted",
            "message_id": message_id
        }, user_id)
    
    return {"message": "Message deleted"}

# WebSocket endpoints
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle real-time messages here
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

# Socket.IO events
@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected")

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")

@sio.event
async def join_chat(sid, data):
    await sio.enter_room(sid, 'chat_room')
    await sio.emit('user_joined', {'user': data.get('user')}, room='chat_room')

@sio.event
async def send_message(sid, data):
    await sio.emit('new_message', data, room='chat_room')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8001)