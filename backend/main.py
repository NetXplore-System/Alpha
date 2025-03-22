from fastapi import FastAPI, HTTPException, File, UploadFile, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
from collections import defaultdict
from pydantic import BaseModel, EmailStr, Field
from uuid import uuid4
from database import db
from dotenv import load_dotenv
from jose import jwt, JWTError
import bcrypt
import os
import networkx as nx
import numpy
import scipy
import json

# Load environment variables
load_dotenv()

# Configuration Constants
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
UPLOAD_FOLDER = "./uploads/"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize FastAPI
app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 Configuration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

# Models for request/response data
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: str = Field(None)
    email: EmailStr = Field(None)
    password: str = Field(None)

class OAuthUser(BaseModel):
    name: str
    email: str
    avatar: str


# Utility Functions
def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """
    Creates a JWT access token.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Decodes JWT token to extract current user data.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# Routes
@app.get("/protected")
async def protected_route(current_user: dict = Depends(get_current_user)):
    """
    Test protected route that requires authentication.
    """
    return {"message": f"Hello, user {current_user['user_id']}"}

@app.post("/api/auth/google")
async def google_auth(user: OAuthUser):
    """
    Authenticates user using Google OAuth.
    """
    users_collection = db["users"]
    existing_user = await users_collection.find_one({"email": user.email})

    if existing_user:
        token = create_access_token(data={"user_id": existing_user["user_id"]})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": existing_user["user_id"],
                "name": existing_user["name"],
                "email": existing_user["email"],
                "avatar": existing_user.get("avatar", "https://cdn-icons-png.flaticon.com/512/64/64572.png")
            },
        }

    user_id = str(uuid4())
    new_user = {"user_id": user_id, "name": user.name, "email": user.email, "avatar": user.avatar}
    await users_collection.insert_one(new_user)

    token = create_access_token(data={"user_id": user_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "name": user.name, "email": user.email, "avatar": user.avatar},
    }

@app.post("/register")
async def register_user(user: UserCreate):
    """
    Registers a new user.
    """
    users_collection = db["users"]
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_password = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user_id = str(uuid4())
    new_user = {"user_id": user_id, "name": user.name, "email": user.email, "password": hashed_password}
    await users_collection.insert_one(new_user)
    return {"id": user_id, "name": user.name, "email": user.email}

@app.post("/login")
async def login_user(user: UserLogin):
    """
    Logs in a user and returns a JWT token.
    """
    users_collection = db["users"]
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user or not bcrypt.checkpw(user.password.encode("utf-8"), db_user["password"].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"user_id": db_user["user_id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": db_user["user_id"],
            "name": db_user["name"],
            "email": db_user["email"],
            "avatar": db_user.get("avatar", "https://cdn-icons-png.flaticon.com/512/64/64572.png")
        },
    }

@app.get("/users")
async def get_all_users():
    """
    Fetches a list of all users.
    """
    users_collection = db["users"]
    users = await users_collection.find().to_list(100)
    return [{"id": user["user_id"], "name": user["name"], "email": user["email"]} for user in users]

@app.put("/users/{user_id}")
async def update_user(user_id: str, user_update: UserUpdate):
    """
    Updates a user's details.
    """
    users_collection = db["users"]
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}

    if "password" in update_data:
        update_data["password"] = bcrypt.hashpw(update_data["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    result = await users_collection.update_one({"user_id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = await users_collection.find_one({"user_id": user_id})
    return {
        "id": updated_user["user_id"],
        "name": updated_user["name"],
        "email": updated_user["email"],
        "avatar": updated_user.get("avatar", "https://cdn-icons-png.flaticon.com/512/64/64572.png")
    }

@app.post("/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), token: str = Depends(oauth2_scheme)):
    """
    Uploads a new avatar for the authenticated user.
    """
    current_user = get_current_user(token)
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    avatar_folder = os.path.join(UPLOAD_FOLDER, "avatars")
    os.makedirs(avatar_folder, exist_ok=True)
    avatar_filename = f"{current_user['user_id']}_{file.filename}"
    avatar_path = os.path.join(avatar_folder, avatar_filename)

    with open(avatar_path, "wb") as avatar_file:
        avatar_file.write(await file.read())

    avatar_url = f"/static/avatars/{avatar_filename}"
    users_collection = db["users"]
    await users_collection.update_one({"user_id": current_user["user_id"]}, {"$set": {"avatar": avatar_url}})
    return {"avatarUrl": avatar_url}

@app.delete("/users/{user_id}")
async def delete_user(user_id: str):
  
    users_collection = db["users"]

    result = await users_collection.delete_one({"user_id": user_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted successfully"}



# network analysis 
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        return JSONResponse(content={"message": "File uploaded successfully!", "filename": file.filename}, status_code=200)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.delete("/delete/{filename}")
async def delete_file(filename: str):
    try:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return JSONResponse(content={"message": f"File '{filename}' deleted successfully!"}, status_code=200)
        else:
            return JSONResponse(content={"error": f"File '{filename}' not found."}, status_code=404)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


def anonymize_name(name, anonymized_map):
    """ ממיר שם או מספר טלפון למזהה אנונימי ייחודי """
    if name.startswith("\u202a+972") or name.startswith("+972"):
        name = f"Phone_{len(anonymized_map) + 1}"
    if name not in anonymized_map:
        anonymized_map[name] = f"User_{len(anonymized_map) + 1}"
    return anonymized_map[name]



def parse_datetime(date: str, time: str):
    """Parses date & time from the request query and ensures HH:MM:SS format."""
    if not date:
        return None
    if time and len(time) == 5:  # If time is in HH:MM format, add ":00"
        time += ":00"
    try:
        return datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M:%S")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid time format: {time} - {e}")



@app.get("/analyze/network/{filename}")
async def analyze_network(
    filename: str,
    start_date: str = Query(None),
    start_time: str = Query(None),
    end_date: str = Query(None),
    end_time: str = Query(None),
    limit: int = Query(None),  
    limit_type: str = Query("first"),  
    min_length: int = Query(None),  
    max_length: int = Query(None),
    keywords: str = Query(None),
    min_messages: int = Query(None), 
    max_messages: int = Query(None), 
    active_users: int = Query(None), 
    selected_users: str = Query(None), 
    username: str = Query(None),
    anonymize: bool = Query(False)
):
    try:
        print(f"Analyzing file: {filename}, Anonymization: {anonymize}, Limit Type: {limit_type}")
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(file_path):
            return JSONResponse(content={"error": f"File '{filename}' not found."}, status_code=404)

        nodes = set()
        user_message_count = defaultdict(int)
        edges_counter = defaultdict(int)
        previous_sender = None
        anonymized_map = {}  

        keyword_list = [kw.strip().lower() for kw in keywords.split(",")] if keywords else []
        selected_user_list = [user.strip().lower() for user in selected_users.split(",")] if selected_users else []

        start_datetime = None
        end_datetime = None

        if start_date and start_time:
            start_datetime = datetime.strptime(f"{start_date} {start_time}", "%Y-%m-%d %H:%M:%S")
        elif start_date:
            start_datetime = datetime.strptime(f"{start_date} 00:00:00", "%Y-%m-%d %H:%M:%S")

        if end_date and end_time:
            end_datetime = datetime.strptime(f"{end_date} {end_time}", "%Y-%m-%d %H:%M:%S")
        elif end_date:
            end_datetime = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")

        print(f"🔹 Converted: start_datetime={start_datetime}, end_datetime={end_datetime}")

        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        filtered_lines = []
        for line in lines:
            if line.startswith("[") and "]" in line:
                date_part = line.split("] ")[0].strip("[]")
                try:
                    current_datetime = datetime.strptime(date_part, "%d.%m.%Y, %H:%M:%S")
                except ValueError:
                    continue  

                if ((start_datetime and current_datetime >= start_datetime) or not start_datetime) and \
                   ((end_datetime and current_datetime <= end_datetime) or not end_datetime):
                    filtered_lines.append(line)

        print(f"🔹 Found {len(filtered_lines)} messages in the date range.")

        if limit and limit_type == "first":
            selected_lines = filtered_lines[:limit]
        elif limit and limit_type == "last":
            selected_lines = filtered_lines[-limit:]
        else:
            selected_lines = filtered_lines

        print(f"🔹 Processing {len(selected_lines)} messages (Limit Type: {limit_type})")

        for line in selected_lines:
            try:
                if "הושמטה" in line or "הושמט" in line:
                    continue
                
                if line.startswith("[") and "]" in line and ": " in line:
                    _, message_part = line.split("] ", 1)
                    parts = message_part.split(":", 1)
                    sender = parts[0].strip("~").replace("\u202a", "").strip()
                    message_content = parts[1].strip() if len(parts) > 1 else ""
                    
                    message_length = len(message_content)
                    if (min_length and message_length < min_length) or (max_length and message_length > max_length):
                        continue
                    
                    if username and sender.lower() != username.lower():
                        continue
                    
                    if keywords and not any(kw in message_content.lower() for kw in keyword_list):
                        continue
                    
                    user_message_count[sender] += 1
                    
                    if sender:
                        if anonymize:
                            sender = anonymize_name(sender, anonymized_map)
                        
                        nodes.add(sender)
                        if previous_sender and previous_sender != sender:
                            edge = tuple(sorted([previous_sender, sender]))
                            edges_counter[edge] += 1
                        previous_sender = sender
            except Exception as e:
                print(f"Error processing line: {line.strip()} - {e}")
                continue

        filtered_users = {
            user: count for user, count in user_message_count.items()
            if (not min_messages or count >= min_messages) and (not max_messages or count <= max_messages)
        }
        
        if active_users:
            sorted_users = sorted(filtered_users.items(), key=lambda x: x[1], reverse=True)[:active_users]
            filtered_users = dict(sorted_users)
        
        if selected_users:
            filtered_users = {user: count for user, count in filtered_users.items() 
                             if user.lower() in selected_user_list}
        
        filtered_nodes = set(filtered_users.keys())
        if anonymize:
            filtered_nodes = {anonymize_name(node, anonymized_map) for node in filtered_nodes}
       
        G = nx.Graph()
        G.add_nodes_from(filtered_nodes)
        for (source, target), weight in edges_counter.items():
            if source in filtered_nodes and target in filtered_nodes:
                G.add_edge(source, target, weight=weight)
       
        degree_centrality = nx.degree_centrality(G)
        betweenness_centrality = nx.betweenness_centrality(G, weight="weight", normalized=True)
        if not nx.is_connected(G):
            print("Warning: The graph is not fully connected. Betweenness centrality might be inaccurate.")

        if nx.is_connected(G):
            closeness_centrality = nx.closeness_centrality(G)
            eigenvector_centrality = nx.eigenvector_centrality(G, max_iter=1000)
            pagerank_centrality = nx.pagerank(G, alpha=0.85)
        else:
            largest_cc = max(nx.connected_components(G), key=len)
            G_subgraph = G.subgraph(largest_cc).copy()
            closeness_centrality = nx.closeness_centrality(G_subgraph)
            eigenvector_centrality = nx.eigenvector_centrality(G_subgraph, max_iter=1000)
            pagerank_centrality = nx.pagerank(G_subgraph, alpha=0.85)

        nodes_list = [
            {
                "id": node,
                "messages": user_message_count.get(node, 0),
                "degree": round(degree_centrality.get(node, 0), 4),
                "betweenness": round(betweenness_centrality.get(node, 0), 4),
                "closeness": round(closeness_centrality.get(node, 0), 4),
                "eigenvector": round(eigenvector_centrality.get(node, 0), 4), 
                "pagerank": round(pagerank_centrality.get(node, 0), 4),
            }
            for node in filtered_nodes
        ]
            
        links_list = []
        for edge, weight in edges_counter.items():
            source, target = edge
            
            if anonymize:
                source = anonymized_map.get(source, source)
                target = anonymized_map.get(target, target)
            
            if source in filtered_nodes and target in filtered_nodes:
                links_list.append({
                    "source": source,
                    "target": target,
                    "weight": weight
                })

        print(f"Final nodes: {nodes_list}")
        print(f"Final links with weights: {links_list}")

        return JSONResponse(content={"nodes": nodes_list, "links": links_list}, status_code=200)
    except Exception as e:
        print("Error:", e)
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.get("/analyze/comparison/{filename}")
async def analyze_comparison(
    filename: str,
    start_date: str = Query(None),
    start_time: str = Query(None),
    end_date: str = Query(None),
    end_time: str = Query(None),
    limit: int = Query(None),  
    limit_type: str = Query("first"),  
    min_length: int = Query(None),  
    max_length: int = Query(None),
    keywords: str = Query(None),
    min_messages: int = Query(None), 
    max_messages: int = Query(None), 
    active_users: int = Query(None), 
    selected_users: str = Query(None), 
    username: str = Query(None),
    anonymize: bool = Query(False)
):
    result = await analyze_network(
        filename, start_date, start_time, end_date, end_time, limit, limit_type, 
        min_length, max_length, keywords, min_messages, max_messages, 
        active_users, selected_users, username, anonymize
    )
    
    if hasattr(result, 'body'):
        content = json.loads(result.body)
    else:
        content = result
    
    return JSONResponse(content={**content, "filename": filename}, status_code=200)

def apply_comparison_filters(network_data, node_filter, min_weight):
    """Filter network by node filter and minimum weight."""
    if not network_data or "nodes" not in network_data or "links" not in network_data:
        return network_data
    
    # Filter nodes by text
    filtered_nodes = []
    if node_filter:
        filtered_nodes = [
            node for node in network_data["nodes"] 
            if node_filter.lower() in node["id"].lower()
        ]
    else:
        filtered_nodes = network_data["nodes"]
    
    # Create a set of node IDs for efficient lookup
    node_ids = {node["id"] for node in filtered_nodes}
    
    # Filter links by minimum weight and node existence
    filtered_links = [
        link for link in network_data["links"]
        if (link["weight"] >= min_weight and
            (get_node_id(link["source"]) in node_ids) and
            (get_node_id(link["target"]) in node_ids))
    ]
    
    return {"nodes": filtered_nodes, "links": filtered_links}

def get_node_id(node_ref):
    """Get node ID whether it's a string or an object."""
    if isinstance(node_ref, dict) and "id" in node_ref:
        return node_ref["id"]
    return node_ref

def find_common_nodes(original_data, comparison_data):
    """Find common nodes between two networks."""
    original_ids = {node["id"] for node in original_data["nodes"]}
    comparison_ids = {node["id"] for node in comparison_data["nodes"]}
    return original_ids.intersection(comparison_ids)

def mark_common_nodes(network_data, common_node_ids):
    """Mark common nodes in a network."""
    for node in network_data["nodes"]:
        node["isCommon"] = node["id"] in common_node_ids
    return network_data

def get_network_metrics(original_data, comparison_data, metrics_list):
    """Calculate network metrics for comparison."""
    if not metrics_list:
        return {}
        
    metrics_names = [m.strip() for m in metrics_list.split(",")]
    results = {}
    
    # Calculate basic metrics
    results["node_count"] = {
        "original": len(original_data["nodes"]),
        "comparison": len(comparison_data["nodes"]),
        "difference": len(comparison_data["nodes"]) - len(original_data["nodes"]),
        "percent_change": (
            ((len(comparison_data["nodes"]) - len(original_data["nodes"])) / len(original_data["nodes"])) * 100
            if len(original_data["nodes"]) > 0 else 0
        )
    }
    
    results["link_count"] = {
        "original": len(original_data["links"]),
        "comparison": len(comparison_data["links"]),
        "difference": len(comparison_data["links"]) - len(original_data["links"]),
        "percent_change": (
            ((len(comparison_data["links"]) - len(original_data["links"])) / len(original_data["links"])) * 100
            if len(original_data["links"]) > 0 else 0
        )
    }
    
    # Add more metrics based on the requested list
    # Here you can calculate advanced metrics like density, diameter, etc.
    
    return results

@app.get("/analyze/compare-networks")
async def analyze_network_comparison(
    original_filename: str = Query(...),
    comparison_filename: str = Query(...),
    start_date: str = Query(None),
    start_time: str = Query(None),
    end_date: str = Query(None),
    end_time: str = Query(None),
    limit: int = Query(None),  
    limit_type: str = Query("first"),  
    min_length: int = Query(None),  
    max_length: int = Query(None),
    keywords: str = Query(None),
    min_messages: int = Query(None), 
    max_messages: int = Query(None), 
    active_users: int = Query(None), 
    selected_users: str = Query(None), 
    username: str = Query(None),
    anonymize: bool = Query(False),
    # New parameters for comparison filtering
    min_weight: int = Query(1),
    node_filter: str = Query(""),
    highlight_common: bool = Query(False),
    metrics: str = Query(None)  # Comma-separated list of metrics
):
    try:
        print(f"Analyzing comparison between {original_filename} and {comparison_filename}")
        
        # Get original network data
        original_result = await analyze_network(
            original_filename, start_date, start_time, end_date, end_time,
            limit, limit_type, min_length, max_length, keywords,
            min_messages, max_messages, active_users, selected_users, 
            username, anonymize
        )
        
        # Get comparison network data
        comparison_result = await analyze_network(
            comparison_filename, start_date, start_time, end_date, end_time,
            limit, limit_type, min_length, max_length, keywords,
            min_messages, max_messages, active_users, selected_users, 
            username, anonymize
        )
        
        # Convert results to JSON if they aren't already
        if hasattr(original_result, 'body'):
            original_data = json.loads(original_result.body)
        else:
            original_data = original_result
            
        if hasattr(comparison_result, 'body'):
            comparison_data = json.loads(comparison_result.body)
        else:
            comparison_data = comparison_result
        
        # Apply additional filters to both networks
        filtered_original = apply_comparison_filters(original_data, node_filter, min_weight)
        filtered_comparison = apply_comparison_filters(comparison_data, node_filter, min_weight)
        
        # Mark common nodes if requested
        if highlight_common:
            common_nodes = find_common_nodes(filtered_original, filtered_comparison)
            mark_common_nodes(filtered_original, common_nodes)
            mark_common_nodes(filtered_comparison, common_nodes)
        
        # Return both filtered networks
        return JSONResponse(content={
            "original": filtered_original,
            "comparison": filtered_comparison,
            "metrics": get_network_metrics(filtered_original, filtered_comparison, metrics)
        }, status_code=200)
        
    except Exception as e:
        print(f"Error in network comparison: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=500)

# save reaserch to mongo db
@app.post("/save-form")
async def save_form(data: dict):
    
    """
    Save form data into the Research_user collection in MongoDB.
    """
    try:
        # הגדרת הקולקציה מתוך מסד הנתונים
        research_collection = db["Research_user"]
        
        # מבנה הנתונים שיוכנס למסד
        form_data = {
            "name": data.get("name"),
            "description": data.get("description"),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
            "message_limit": data.get("message_limit"),
            "created_at": datetime.utcnow(),
        }
        
        # שמירת הנתונים למסד
        result = await research_collection.insert_one(form_data)
        
        # החזרת תשובה למשתמש
        return {"message": "Form saved successfully", "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving form: {str(e)}")
    
