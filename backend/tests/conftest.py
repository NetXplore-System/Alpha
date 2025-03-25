# /home/sdg/Alpha/backend/tests/conftest.py
import pytest
import os
import sys
import bcrypt
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import psycopg2

# Add the parent directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Now import the modules using ABSOLUTE paths
from database import Base, get_db
from main import app
from models import User
# Test database setup
SQLALCHEMY_TEST_DATABASE_URL = "postgresql://postgres:sisma@localhost/test_netxplore"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def create_test_database():
    """Creates the test database if it doesn't exist."""
    print("--- create_test_database fixture is running ---") # Adding this line
    try:
        print("Attempting to connect to 'postgres' database.")
        conn = psycopg2.connect(
            dbname="postgres", user="postgres", password="sisma", host="localhost"
        )
        conn.autocommit = True
        cur = conn.cursor()

        print("Connected to 'postgres' database.")
        cur.execute("SELECT 1 FROM pg_database WHERE datname = 'test_netxplore'")
        exists = cur.fetchone()

        if not exists:
            print("Database 'test_netxplore' does not exist. Creating...")
            cur.execute("CREATE DATABASE test_netxplore")
            print("Test database 'test_netxplore' created.")
        else:
            print("Test database 'test_netxplore' already exists.")

        cur.close()
        conn.close()

        global engine
        engine = create_engine("postgresql://postgres:sisma@localhost/test_netxplore")
        print("Engine created for 'test_netxplore'.")
        print("create_test_database fixture finished.")

    except psycopg2.OperationalError as e:
        print(f"Error creating test database: {e}")
        raise

@pytest.fixture(scope="function")
def db():
    # Create the database tables
    Base.metadata.create_all(bind=engine)

    # Create a new session for each test
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    # Override the get_db dependency
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    # Reset dependency
    app.dependency_overrides = {}


@pytest.fixture
def test_user(db):
    """Create a test user in the database"""
    user_id = uuid.uuid4()
    hashed_pwd = bcrypt.hashpw("sisma".encode(), bcrypt.gensalt()).decode()

    user = User(
        user_id=user_id,
        name="Test User",
        email="testuser@example.com",
        password=hashed_pwd
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"id": str(user_id), "email": "testuser@example.com", "password": "password123"}