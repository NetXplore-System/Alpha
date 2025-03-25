import pytest
from models import User
import bcrypt
from sqlalchemy.orm import Session
import uuid

def test_get_all_users(client, test_user):
    response = client.get("/users")
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    assert len(users) >= 1

    # Check if test user is in the list
    user_emails = [user["email"] for user in users]
    assert test_user["email"] in user_emails

def test_update_user(client, test_user, db: Session):
    # Generate a unique user_id and email
    unique_user_id = str(uuid.uuid4())
    unique_email = f"testuser_{unique_user_id}@example.com"  # Unique email

    # Explicitly create the test user with a unique user_id and email
    hashed_password = bcrypt.hashpw(test_user['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    new_user = User(user_id=unique_user_id, email=unique_email, password=hashed_password, name="Test User")
    db.add(new_user)
    db.commit()

    login_response = client.post(
        "/login",
        json={"email": unique_email, "password": test_user["password"]} # Use unique email
    )

    if login_response.status_code != 200:
        print("Login failed! Response:", login_response.json())
        assert False, "Login failed"

    token = login_response.json()["access_token"]

    # Update user
    update_response = client.put(
        f"/users/{unique_user_id}",  # Use the unique user_id
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Updated Name"}
    )

    assert update_response.status_code == 200
    updated_user = update_response.json()
    assert updated_user["name"] == "Updated Name"
    assert updated_user["email"] == unique_email  # Assert with unique email

def test_delete_user(client, test_user, db: Session):
    # Generate a unique user_id and email
    unique_user_id = str(uuid.uuid4())
    unique_email = f"testuser_{unique_user_id}@example.com"  # Unique email

    # Explicitly create the test user with a unique user_id and email
    hashed_password = bcrypt.hashpw(test_user['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    new_user = User(user_id=unique_user_id, email=unique_email, password=hashed_password, name="Test User")
    db.add(new_user)
    db.commit()

    # First login to get token
    login_response = client.post(
        "/login",
        json={"email": unique_email, "password": test_user["password"]} # Use unique email
    )

    if login_response.status_code != 200:
        print("Login failed! Response:", login_response.json())
        assert False, "Login failed"

    token = login_response.json()["access_token"]

    # Delete user
    delete_response = client.delete(
        f"/users/{unique_user_id}",  # Use the unique user_id
        headers={"Authorization": f"Bearer {token}"}
    )

    assert delete_response.status_code == 200
    assert "message" in delete_response.json()
    assert "deleted successfully" in delete_response.json()["message"]