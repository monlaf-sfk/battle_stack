import uuid
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from sqlalchemy import Column, String, Text, Integer, DateTime, Boolean, JSON, ForeignKey, Table, Float
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from shared.app.database import Base


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class ProblemStatus(str, Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    BETA = "beta"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ProblemType(str, Enum):
    ALGORITHM = "algorithm"
    DATABASE = "database"
    SHELL = "shell"
    CONCURRENCY = "concurrency"


# Association table для связи многие-ко-многим между задачами и тегами
problem_tags = Table(
    'problem_tags',
    Base.metadata,
    Column('problem_id', UUID(as_uuid=True), ForeignKey('problems.id'), primary_key=True),
    Column('tag_id', UUID(as_uuid=True), ForeignKey('tags.id'), primary_key=True)
)

# Association table для связи многие-ко-многим между задачами и компаниями
problem_companies = Table(
    'problem_companies',
    Base.metadata,
    Column('problem_id', UUID(as_uuid=True), ForeignKey('problems.id'), primary_key=True),
    Column('company_id', UUID(as_uuid=True), ForeignKey('companies.id'), primary_key=True)
)


class Tag(Base):
    __tablename__ = "tags"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    # Связь с задачами
    problems = relationship("Problem", secondary=problem_tags, back_populates="tags")


class Company(Base):
    __tablename__ = "companies"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    # Связь с задачами
    problems = relationship("Problem", secondary=problem_companies, back_populates="companies")


class Problem(Base):
    __tablename__ = "problems"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    # Основная информация
    title: Mapped[str] = mapped_column(String(200), index=True)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text)
    
    # Метаданные
    difficulty: Mapped[DifficultyLevel] = mapped_column(String(20), index=True)
    status: Mapped[ProblemStatus] = mapped_column(String(20), default=ProblemStatus.DRAFT, index=True)
    problem_type: Mapped[ProblemType] = mapped_column(String(20), default=ProblemType.ALGORITHM)
    
    # Ограничения
    time_limit_ms: Mapped[int] = mapped_column(Integer, default=2000)
    memory_limit_mb: Mapped[int] = mapped_column(Integer, default=128)
    
    # Подсказки и решения
    hints: Mapped[List[str] | None] = mapped_column(ARRAY(String), nullable=True)
    editorial: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Статистика
    acceptance_rate: Mapped[float | None] = mapped_column(nullable=True)
    total_submissions: Mapped[int] = mapped_column(Integer, default=0)
    total_accepted: Mapped[int] = mapped_column("accepted_submissions", Integer, default=0)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    dislikes: Mapped[int] = mapped_column(Integer, default=0)
    
    # Премиум доступ
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Временные метки
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    # Автор
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Связи
    tags = relationship("Tag", secondary=problem_tags, back_populates="problems")
    companies = relationship("Company", secondary=problem_companies, back_populates="problems")
    code_templates = relationship("CodeTemplate", back_populates="problem", cascade="all, delete-orphan")
    test_cases = relationship("TestCase", back_populates="problem", cascade="all, delete-orphan")
    # Temporary disable solutions relationship due to column mismatch
    # solutions = relationship("Solution", back_populates="problem", cascade="all, delete-orphan")


class CodeTemplate(Base):
    __tablename__ = "code_templates"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    problem_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('problems.id'))
    language: Mapped[str] = mapped_column(String(20), index=True)  # python, java, cpp, javascript, etc.
    
    # Map schema field 'template_code' to database column 'code'
    template_code: Mapped[str] = mapped_column("code", Text)  # Maps to 'code' column in DB
    
    #  ➜  restore legacy columns so existing queries / migrations keep working
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    # Связь с задачей
    problem = relationship("Problem", back_populates="code_templates")


class TestCase(Base):
    __tablename__ = "test_cases"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    problem_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('problems.id'))
    
    # Данные тест-кейса
    input_data: Mapped[str] = mapped_column(Text)  # JSON строка с входными данными
    expected_output: Mapped[str] = mapped_column(Text)  # Ожидаемый вывод
    explanation: Mapped[str | None] = mapped_column(Text)  # Объяснение тест-кейса
    
    # Метаданные
    is_example: Mapped[bool] = mapped_column(Boolean, default=True)  # Показывать ли пользователю
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)  # Скрытый тест-кейс
    # order_index: Mapped[int] = mapped_column(Integer, default=0)  # TODO: Add to migration
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    # Связь с задачей
    problem = relationship("Problem", back_populates="test_cases")


# Temporary disable Solution model due to column mismatch issues
# class Solution(Base):
#     __tablename__ = "solutions"
#     
#     id: Mapped[uuid.UUID] = mapped_column(
#         UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
#     )
#     problem_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('problems.id'))
#     
#     # Информация о решении
#     language: Mapped[str] = mapped_column(String(20))
#     solution_code: Mapped[str] = mapped_column(Text)
#     explanation: Mapped[str | None] = mapped_column(Text)
#     
#     # Метаданные
#     is_official: Mapped[bool] = mapped_column(Boolean, default=False)
#     approach_name: Mapped[str | None] = mapped_column(String(100))  # "Brute Force", "Dynamic Programming", etc.
#     
#     # Complexity
#     time_complexity: Mapped[str | None] = mapped_column(String(50))  # O(n), O(log n), etc.
#     space_complexity: Mapped[str | None] = mapped_column(String(50))
#     
#     # Временные метки
#     created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
#     created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))
#     
#     # Связь с задачей
#     # Temporary disable back reference due to column mismatch
#     # problem = relationship("Problem", back_populates="solutions")


class UserSubmission(Base):
    __tablename__ = "user_submissions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))
    problem_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('problems.id'))
    
    # Код решения
    language: Mapped[str] = mapped_column(String(20))
    solution_code: Mapped[str] = mapped_column(Text)
    
    # Результат
    status: Mapped[str] = mapped_column(String(20))  # "Accepted", "Wrong Answer", "Time Limit Exceeded", etc.
    runtime_ms: Mapped[int | None] = mapped_column(Integer)
    memory_mb: Mapped[float | None] = mapped_column(Float)
    
    # Результаты тестов
    test_results: Mapped[Dict | None] = mapped_column(JSON)  # Детальные результаты тестов
    
    # Временные метки
    submitted_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    judged_at: Mapped[datetime | None] = mapped_column(DateTime) 