from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Boolean, Text, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=True)  # Nullable for OAuth users
    avatar = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": str(self.user_id),
            "name": self.name,
            "email": self.email,
            "avatar": self.avatar or "https://cdn-icons-png.flaticon.com/512/64/64572.png"
        }


class Research(Base):
    __tablename__ = "research"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(String, nullable=True)  # Store as string to match original format
    end_date = Column(String, nullable=True)  # Store as string to match original format
    message_limit = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "message_limit": self.message_limit,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "user_id": str(self.user_id) if self.user_id else None
        }


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    research_id = Column(UUID(as_uuid=True), ForeignKey("research.id"), nullable=True)

    def to_dict(self):
        return {
            "id": str(self.id),
            "filename": self.filename,
            "original_filename": self.original_filename,
            "file_path": self.file_path,
            "file_type": self.file_type,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "user_id": str(self.user_id) if self.user_id else None,
            "research_id": str(self.research_id) if self.research_id else None
        }


class NetworkAnalysis(Base):
    __tablename__ = "network_analysis"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    research_id = Column(UUID(as_uuid=True), ForeignKey("research.id"), nullable=True)
    file_id = Column(UUID(as_uuid=True), ForeignKey("uploaded_files.id"), nullable=True)
    nodes = Column(JSONB, nullable=False)  # Store nodes as JSON
    links = Column(JSONB, nullable=False)  # Store links as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    parameters = Column(JSONB, nullable=True)  # Store analysis parameters as JSON

    def to_dict(self):
        return {
            "id": str(self.id),
            "research_id": str(self.research_id) if self.research_id else None,
            "file_id": str(self.file_id) if self.file_id else None,
            "nodes": self.nodes,
            "links": self.links,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "parameters": self.parameters
        }


class Community(Base):
    __tablename__ = "communities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("network_analysis.id"), nullable=False)
    community_index = Column(Integer, nullable=False)
    size = Column(Integer, nullable=False)
    nodes = Column(JSONB, nullable=False)  # Store node IDs as JSON array
    avg_betweenness = Column(Float, nullable=True)
    avg_pagerank = Column(Float, nullable=True)

    def to_dict(self):
        return {
            "id": str(self.id),
            "analysis_id": str(self.analysis_id),
            "community_index": self.community_index,
            "size": self.size,
            "nodes": self.nodes,
            "avg_betweenness": self.avg_betweenness,
            "avg_pagerank": self.avg_pagerank
        }