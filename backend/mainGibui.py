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
    allow_origins=["http://localhost:5174"],
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


# //////add time to the analysis

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
    anonymize: bool = Query(False)
):
    try:
        print(f" Anonymization Status: {anonymize}")

        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(file_path):
            return JSONResponse(content={"error": f"File '{filename}' not found."}, status_code=404)

        nodes = set()
        edges_counter = defaultdict(int)
        previous_sender = None

        #  מילון למיפוי שמות אנונימיים
        anonymized_map = {}

        def anonymize_name(name):
            """ ממיר שם או מספר טלפון למזהה אנונימי ייחודי """
            if name.startswith("\u202a+972") or name.startswith("+972"):
                name = f"Phone_{len(anonymized_map) + 1}"
            if name not in anonymized_map:
                anonymized_map[name] = f"User_{len(anonymized_map) + 1}"
            return anonymized_map[name]

        # עיבוד תאריכים
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

        # קריאת כל הקובץ
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        # סינון לפי תאריכים
        filtered_lines = []
        for line in lines:
            if line.startswith("[") and "]" in line:
                date_part = line.split("] ")[0].strip("[]")
                try:
                    current_datetime = datetime.strptime(date_part, "%d.%m.%Y, %H:%M:%S")
                except ValueError:
                    continue  # דילוג על שורות לא תקינות

                if start_datetime and end_datetime and start_datetime <= current_datetime <= end_datetime:
                    filtered_lines.append(line)

        print(f"🔹 Found {len(filtered_lines)} messages in the date range.")

        # יישום מגבלת limit אחרי הסינון!
        if limit and limit_type == "first":
            selected_lines = filtered_lines[:limit]
        elif limit and limit_type == "last":
            selected_lines = filtered_lines[-limit:]
        else:
            selected_lines = filtered_lines

        print(f"🔹 Processing {len(selected_lines)} messages (Limit Type: {limit_type})")

        count = 0
        for line in selected_lines:
            try:
                if "omitted" in line or "removed" in line:
                    continue

                if line.startswith("[") and "]" in line:
                    _, message_part = line.split("] ", 1)
                    sender = message_part.split(":")[0].strip("~").replace(" ", "").strip()

                    if sender:
                        if anonymize:
                            sender = anonymize_name(sender)  #  המרת השולח לפני ההוספה לרשת

                        nodes.add(sender)  #  שמירה רק אחרי אנונימיזציה

                        if previous_sender and previous_sender != sender:
                            if anonymize:
                                previous_sender = anonymize_name(previous_sender)  #  וידוא שהקודם גם באנונימיזציה

                            edge = (previous_sender, sender)  #  שמירת קשר נכון
                            edges_counter[edge] += 1
                        previous_sender = sender  #  עדכון previous_sender עם השם החדש

                        count += 1  

            except Exception as e:
                print(f" Error processing line: {line.strip()} - {e}")
                continue

        # ✅ המרת שמות ברשימת הצמתים לרשימה סופית
        nodes_list = [{"id": anonymize_name(node) if anonymize else node} for node in nodes]

        # ✅ ווידוא שהקשרים מתאימים לשמות החדשים
        links_list = [
            {
                "source": anonymized_map.get(edge[0], edge[0]) if anonymize else edge[0], 
                "target": anonymized_map.get(edge[1], edge[1]) if anonymize else edge[1],
                "weight": weight
            }
            for edge, weight in edges_counter.items()
        ]

        print(f" Anonymized Nodes: {nodes_list}")
        print(f" Anonymized Links: {links_list}")

        return JSONResponse(content={"nodes": nodes_list, "links": links_list}, status_code=200)

    except Exception as e:
        print(" Error:", e)
        return JSONResponse(content={"error": str(e)}, status_code=500)


# @app.get("/analyze/network/{filename}")
# async def analyze_network(
#     filename: str,
#     start_date: str = Query(None),
#     start_time: str = Query(None),
#     end_date: str = Query(None),
#     end_time: str = Query(None),
#     limit: int = Query(None),
#     limit_type: str = Query("first"),  # ברירת מחדל - הודעות ראשונות
# ):
#     try:
#         print(f"🔹 Received: start_date={start_date}, start_time={start_time}, end_date={end_date}, end_time={end_time}, limit_type={limit_type}")

#         file_path = os.path.join(UPLOAD_FOLDER, filename)
#         if not os.path.exists(file_path):
#             return JSONResponse(content={"error": f"File '{filename}' not found."}, status_code=404)

#         nodes = set()
#         edges_counter = defaultdict(int)
#         previous_sender = None

#         start_datetime = None
#         end_datetime = None

#         if start_date and start_time:
#             start_datetime = datetime.strptime(f"{start_date} {start_time}", "%Y-%m-%d %H:%M:%S")
#         elif start_date:
#             start_datetime = datetime.strptime(f"{start_date} 00:00:00", "%Y-%m-%d %H:%M:%S")

#         if end_date and end_time:
#             end_datetime = datetime.strptime(f"{end_date} {end_time}", "%Y-%m-%d %H:%M:%S")
#         elif end_date:
#             end_datetime = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")

#         print(f"🔹 Converted: start_datetime={start_datetime}, end_datetime={end_datetime}")

#         # קריאת כל הקובץ
#         with open(file_path, "r", encoding="utf-8") as f:
#             lines = f.readlines()

#         # סינון לפי תאריכים תחילה
#         filtered_lines = []
#         for line in lines:
#             if line.startswith("[") and "]" in line:
#                 date_part = line.split("] ")[0].strip("[]")
#                 try:
#                     current_datetime = datetime.strptime(date_part, "%d.%m.%Y, %H:%M:%S")
#                 except ValueError:
#                     continue  # דילוג על שורות לא תקינות

#                 if start_datetime and end_datetime and start_datetime <= current_datetime <= end_datetime:
#                     filtered_lines.append(line)

#         print(f"🔹 Found {len(filtered_lines)} messages in the date range.")

#         # יישום מגבלת limit רק אחרי הסינון!
#         if limit and limit_type == "first":
#             selected_lines = filtered_lines[:limit]  # הודעות ראשונות בטווח
#         elif limit and limit_type == "last":
#             selected_lines = filtered_lines[-limit:]  # הודעות אחרונות בטווח
#         else:
#             selected_lines = filtered_lines  # כל ההודעות בטווח

#         print(f"🔹 Processing {len(selected_lines)} messages (Limit Type: {limit_type})")

#         count = 0
#         for line in selected_lines:
#             try:
#                 if "omitted" in line or "removed" in line:
#                     continue

#                 if line.startswith("[") and "]" in line:
#                     date_part, message_part = line.split("] ", 1)
#                     sender = message_part.split(":")[0].strip("~").replace(" ", "").strip()

#                     if sender:
#                         nodes.add(sender)

#                         if previous_sender and previous_sender != sender:                    
#                             edge = tuple(sorted([previous_sender, sender]))
#                             edges_counter[edge] += 1
#                         previous_sender = sender

#                         count += 1  

#             except Exception as e:
#                 print(f" Error processing line: {line.strip()} - {e}")
#                 continue

#         nodes_list = [{"id": node} for node in nodes]
#         links_list = [
#             {"source": edge[0], "target": edge[1], "weight": weight}
#             for edge, weight in edges_counter.items()
#         ]

#         print(" Final nodes:", nodes_list)
#         print(" Final links with weights:", links_list)

#         return JSONResponse(content={"nodes": nodes_list, "links": links_list}, status_code=200)

#     except Exception as e:
#         print("Error:", e)
#         return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/save-form")
async def save_form(data: dict):
    """
    Save form data into the Research_user collection in MongoDB.
    """
    try:
        # הגדרת הקולקציה מתוך מסד הנתונים
        research_collection = db["Research_user"]
        
        # קבלת תאריך ושעה
        start_date = data.get("start_date")
        start_time = data.get("start_time")
        end_date = data.get("end_date")
        end_time = data.get("end_time")

        # המרת תאריך ושעה לפורמט datetime אם קיימים
        start_datetime = None
        end_datetime = None

        if start_date and start_time:
            start_datetime = datetime.strptime(f"{start_date} {start_time}", "%Y-%m-%d %H:%M")

        if end_date and end_time:
            end_datetime = datetime.strptime(f"{end_date} {end_time}", "%Y-%m-%d %H:%M")

        # מבנה הנתונים שיוכנס למסד
        form_data = {
            "name": data.get("name"),
            "description": data.get("description"),
            "start_datetime": start_datetime,  # שדה חדש לתאריך ושעה
            "end_datetime": end_datetime,      # שדה חדש לתאריך ושעה
            "message_limit": data.get("message_limit"),
            "created_at": datetime.utcnow(),
        }
        
        # שמירת הנתונים למסד
        result = await research_collection.insert_one(form_data)
        
        # החזרת תשובה למשתמש
        return {"message": "Form saved successfully", "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving form: {str(e)}")
